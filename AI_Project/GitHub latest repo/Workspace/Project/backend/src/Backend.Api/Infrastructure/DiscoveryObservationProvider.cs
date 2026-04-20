using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using Backend.Api.Infrastructure.Execution;
using Backend.Domain.IocManager;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed record DiscoveryObservation(
    string IpAddress,
    string? Hostname,
    DiscoveredHostReachability Reachability,
    DateTimeOffset CheckedAtUtc);

public interface IDiscoveryObservationProvider
{
    Task<IReadOnlyList<DiscoveryObservation>> ObserveAsync(DiscoveryTargetRange targetRange, CancellationToken cancellationToken);
}

public sealed class DiscoveryObservationProvider : IDiscoveryObservationProvider
{
    private readonly IIcmpProbe _probe;
    private readonly IOptionsMonitor<DiscoveryExecutionOptions> _optionsMonitor;
    private readonly ILogger<DiscoveryObservationProvider> _logger;

    public DiscoveryObservationProvider(
        IIcmpProbe probe,
        IOptionsMonitor<DiscoveryExecutionOptions> optionsMonitor,
        ILogger<DiscoveryObservationProvider> logger)
    {
        _probe = probe;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DiscoveryObservation>> ObserveAsync(DiscoveryTargetRange targetRange, CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (options.UseScriptSweepWhenAvailable && !string.IsNullOrWhiteSpace(options.SweepScriptPath))
        {
            var scriptObservations = await TryObserveViaScriptAsync(targetRange, options, cancellationToken);
            if (scriptObservations is not null)
            {
                return scriptObservations;
            }
        }

        return await ObserveViaIcmpAsync(targetRange.Targets, options, cancellationToken);
    }

    private async Task<IReadOnlyList<DiscoveryObservation>?> TryObserveViaScriptAsync(
        DiscoveryTargetRange targetRange,
        DiscoveryExecutionOptions options,
        CancellationToken cancellationToken)
    {
        var scriptPath = ResolvePath(options.SweepScriptPath!);
        if (!File.Exists(scriptPath))
        {
            _logger.LogWarning("Configured discovery sweep script was not found at {ScriptPath}. Falling back to ICMP probing.", scriptPath);
            return null;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = string.IsNullOrWhiteSpace(options.PowerShellExecutable) ? "powershell.exe" : options.PowerShellExecutable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        startInfo.ArgumentList.Add("-NoLogo");
        startInfo.ArgumentList.Add("-NoProfile");
        startInfo.ArgumentList.Add("-NonInteractive");
        startInfo.ArgumentList.Add("-ExecutionPolicy");
        startInfo.ArgumentList.Add("Bypass");
        startInfo.ArgumentList.Add("-File");
        startInfo.ArgumentList.Add(scriptPath);

        if (!string.IsNullOrWhiteSpace(targetRange.RangeStartIp) && !string.IsNullOrWhiteSpace(targetRange.RangeEndIp))
        {
            startInfo.ArgumentList.Add("-StartIP");
            startInfo.ArgumentList.Add(targetRange.RangeStartIp);
            startInfo.ArgumentList.Add("-EndIP");
            startInfo.ArgumentList.Add(targetRange.RangeEndIp);
        }
        else
        {
            startInfo.ArgumentList.Add("-Network");
            startInfo.ArgumentList.Add(targetRange.RequestedCidr);
        }

        startInfo.ArgumentList.Add("-TimeoutMs");
        startInfo.ArgumentList.Add(options.TimeoutMilliseconds.ToString());
        startInfo.ArgumentList.Add("-Json");

        var result = await ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
        if (result.ExitCode != 0)
        {
            _logger.LogWarning(
                "Discovery sweep script failed with exit code {ExitCode}. Falling back to ICMP probing. Error: {Error}",
                result.ExitCode,
                result.StandardError);
            return null;
        }

        try
        {
            var rows = JsonSerializer.Deserialize<List<SweepResultRow>>(
                result.StandardOutput,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (rows is null)
            {
                return Array.Empty<DiscoveryObservation>();
            }

            var observations = new List<DiscoveryObservation>(rows.Count);
            foreach (var row in rows)
            {
                var reachable = string.Equals(row.Status, "Online", StringComparison.OrdinalIgnoreCase);
                var hostname = reachable
                    ? await ResolveHostNameAsync(row.IPAddress, options.DnsLookupTimeoutMilliseconds, cancellationToken)
                    : null;
                observations.Add(new DiscoveryObservation(
                    row.IPAddress,
                    hostname,
                    reachable ? DiscoveredHostReachability.Reachable : DiscoveredHostReachability.Unreachable,
                    DateTimeOffset.UtcNow));
            }

            return observations;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Discovery sweep script returned invalid JSON. Falling back to ICMP probing.");
            return null;
        }
    }

    private async Task<IReadOnlyList<DiscoveryObservation>> ObserveViaIcmpAsync(
        IReadOnlyList<IPAddress> targets,
        DiscoveryExecutionOptions options,
        CancellationToken cancellationToken)
    {
        var observations = new DiscoveryObservation[targets.Count];
        var parallelOptions = new ParallelOptions
        {
            MaxDegreeOfParallelism = Math.Max(1, options.MaxParallelism),
            CancellationToken = cancellationToken,
        };

        await Parallel.ForEachAsync(
            Enumerable.Range(0, targets.Count),
            parallelOptions,
            async (index, innerCancellationToken) =>
            {
                var ipAddress = targets[index];
                var result = await _probe.ProbeAsync(ipAddress, TimeSpan.FromMilliseconds(options.TimeoutMilliseconds), innerCancellationToken);
                var hostname = result.Reachable
                    ? await ResolveHostNameAsync(ipAddress.ToString(), options.DnsLookupTimeoutMilliseconds, innerCancellationToken) ?? result.Hostname
                    : null;
                observations[index] = new DiscoveryObservation(
                    ipAddress.ToString(),
                    hostname == ipAddress.ToString() ? null : hostname,
                    result.Reachable ? DiscoveredHostReachability.Reachable : DiscoveredHostReachability.Unreachable,
                    DateTimeOffset.UtcNow);
            });

        return observations;
    }

    private static async Task<string?> ResolveHostNameAsync(string ipAddress, int timeoutMilliseconds, CancellationToken cancellationToken)
    {
        try
        {
            var lookupTask = Dns.GetHostEntryAsync(ipAddress);
            var completedTask = await Task.WhenAny(lookupTask, Task.Delay(timeoutMilliseconds, cancellationToken));
            if (completedTask != lookupTask)
            {
                return null;
            }

            var entry = await lookupTask;
            if (string.IsNullOrWhiteSpace(entry.HostName) || string.Equals(entry.HostName, ipAddress, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return entry.HostName.TrimEnd('.');
        }
        catch (SocketException)
        {
            return null;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static string ResolvePath(string path)
    {
        return Path.IsPathRooted(path)
            ? path
            : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", path));
    }

    private sealed record SweepResultRow(string IPAddress, string Status);
}
