using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using IocVmwareIngestion.Api.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Services;

public sealed class TargetDiscoveryService(
    ITargetInventoryRepository repository,
    IWebHostEnvironment environment,
    IOptions<PowerShellSettings> powerShellOptions,
    IOptions<VmwareTargetSettings> targetOptions,
    IPowerShellScriptRunner scriptRunner) : ITargetDiscoveryService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly ITargetInventoryRepository _repository = repository;
    private readonly IWebHostEnvironment _environment = environment;
    private readonly PowerShellSettings _powerShell = powerShellOptions.Value;
    private readonly VmwareTargetSettings _targets = targetOptions.Value;
    private readonly IPowerShellScriptRunner _scriptRunner = scriptRunner;

    public async Task<IReadOnlyCollection<DiscoveredTargetRecord>> DiscoverAsync(
        string? network,
        string? startIp,
        string? endIp,
        int timeoutMs,
        bool persist,
        CancellationToken cancellationToken)
    {
        var rows = await RunSweepAsync(network, startIp, endIp, timeoutMs, cancellationToken);
        var configuredAddresses = _targets.Targets.Values
            .Select(target => target.Address)
            .Where(address => !string.IsNullOrWhiteSpace(address))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var filteredRows = rows
            .Where(row => !string.Equals(row.IPAddress, _powerShell.RemoteExecution.Host, StringComparison.OrdinalIgnoreCase))
            .Where(row => string.Equals(row.Status, "Online", StringComparison.OrdinalIgnoreCase) || configuredAddresses.Contains(row.IPAddress))
            .ToArray();
        var networks = await _repository.GetNetworksAsync(cancellationToken);
        var enrichedTargets = new List<DiscoveredTargetRecord>(filteredRows.Length);
        var lastSweepUtc = DateTime.UtcNow;

        foreach (var row in filteredRows)
        {
            var hostName = await ResolveHostNameAsync(row, cancellationToken);
            var matchedNetwork = MatchNetwork(row.IPAddress, networks);
            var targetOsType = InferOsType(row.IPAddress);

            enrichedTargets.Add(new DiscoveredTargetRecord(
                row.IPAddress,
                NormalizeStatus(row.Status),
                hostName,
                targetOsType,
                matchedNetwork?.NetworkId,
                matchedNetwork?.Name,
                LastSweep: lastSweepUtc));
        }

        return persist
            ? await _repository.UpsertTargetsAsync(enrichedTargets, cancellationToken)
            : enrichedTargets;
    }

    private async Task<IReadOnlyCollection<SweepResultRow>> RunSweepAsync(
        string? network,
        string? startIp,
        string? endIp,
        int timeoutMs,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(network) &&
            (string.IsNullOrWhiteSpace(startIp) || string.IsNullOrWhiteSpace(endIp)))
        {
            throw new InvalidOperationException("Provide either a CIDR network or both start and end IP addresses.");
        }

        var scriptPath = GetSweepScriptPath();
        if (!_powerShell.RemoteExecution.Enabled && !File.Exists(scriptPath))
        {
            throw new FileNotFoundException("SweepNetworkv2.ps1 was not found.", scriptPath);
        }

        var arguments = new List<PowerShellArgument>();

        if (!string.IsNullOrWhiteSpace(network))
        {
            arguments.Add(new PowerShellArgument("Network", network));
        }
        else
        {
            arguments.Add(new PowerShellArgument("StartIP", startIp!));
            arguments.Add(new PowerShellArgument("EndIP", endIp!));
        }

        arguments.Add(new PowerShellArgument("TimeoutMs", timeoutMs.ToString()));
        arguments.Add(new PowerShellArgument("Json", IsSwitch: true));

        var result = await _scriptRunner.ExecuteAsync(scriptPath, arguments, cancellationToken);
        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException($"SweepNetworkv2.ps1 failed. {result.StandardError}".Trim());
        }

        var rows = JsonSerializer.Deserialize<List<SweepResultRow>>(result.StandardOutput, JsonOptions);
        if (rows is null)
        {
            throw new InvalidOperationException("SweepNetworkv2.ps1 returned empty or invalid JSON.");
        }

        return rows;
    }

    private string GetSweepScriptPath()
    {
        if (_powerShell.Scripts.TryGetValue("discovery", out var configuredPath) &&
            !string.IsNullOrWhiteSpace(configuredPath))
        {
            return configuredPath;
        }

        return _powerShell.RemoteExecution.Enabled
            ? @"C:\Tools\SweepNetworkv2.ps1"
            : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "..", "..", "scripts", "SweepNetworkv2.ps1"));
    }

    private static string NormalizeStatus(string? status) =>
        string.Equals(status, "Online", StringComparison.OrdinalIgnoreCase) ? "Online" : "Offline";

    private async Task<string?> ResolveHostNameAsync(SweepResultRow row, CancellationToken cancellationToken)
    {
        if (!string.Equals(row.Status, "Online", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            var lookupTask = Dns.GetHostEntryAsync(row.IPAddress);
            var completedTask = await Task.WhenAny(lookupTask, Task.Delay(TimeSpan.FromSeconds(2), cancellationToken));
            if (completedTask != lookupTask)
            {
                return null;
            }

            var entry = await lookupTask;
            if (string.IsNullOrWhiteSpace(entry.HostName) ||
                string.Equals(entry.HostName, row.IPAddress, StringComparison.OrdinalIgnoreCase))
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

    private string? InferOsType(string ipAddress)
    {
        var configuredTarget = _targets.Targets.Values.FirstOrDefault(target =>
            string.Equals(target.Address, ipAddress, StringComparison.OrdinalIgnoreCase));

        return string.IsNullOrWhiteSpace(configuredTarget?.RemoteOs)
            ? null
            : configuredTarget.RemoteOs.ToLowerInvariant();
    }

    private static NetworkRecord? MatchNetwork(string ipAddress, IReadOnlyCollection<NetworkRecord> networks)
    {
        if (!IPAddress.TryParse(ipAddress, out var ip) || ip.AddressFamily != AddressFamily.InterNetwork)
        {
            return null;
        }

        NetworkRecord? bestMatch = null;
        var bestPrefix = -1;

        foreach (var network in networks)
        {
            if (!TryParseCidr(network.SubNet, out var networkAddress, out var prefixLength))
            {
                continue;
            }

            if (IsIpInSubnet(ip, networkAddress, prefixLength) && prefixLength > bestPrefix)
            {
                bestMatch = network;
                bestPrefix = prefixLength;
            }
        }

        return bestMatch;
    }

    private static bool TryParseCidr(string? cidr, out IPAddress networkAddress, out int prefixLength)
    {
        networkAddress = IPAddress.None;
        prefixLength = 0;

        if (string.IsNullOrWhiteSpace(cidr))
        {
            return false;
        }

        var parts = cidr.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 ||
            !IPAddress.TryParse(parts[0], out var parsedAddress) ||
            parsedAddress.AddressFamily != AddressFamily.InterNetwork ||
            !int.TryParse(parts[1], out prefixLength) ||
            prefixLength is < 0 or > 32)
        {
            return false;
        }

        networkAddress = parsedAddress;
        return true;
    }

    private static bool IsIpInSubnet(IPAddress ip, IPAddress networkAddress, int prefixLength)
    {
        var ipBytes = ip.GetAddressBytes();
        var networkBytes = networkAddress.GetAddressBytes();
        var maskBytes = BuildMaskBytes(prefixLength);

        for (var i = 0; i < ipBytes.Length; i++)
        {
            if ((ipBytes[i] & maskBytes[i]) != (networkBytes[i] & maskBytes[i]))
            {
                return false;
            }
        }

        return true;
    }

    private static byte[] BuildMaskBytes(int prefixLength)
    {
        var mask = new byte[4];
        var remainingBits = prefixLength;

        for (var i = 0; i < mask.Length; i++)
        {
            if (remainingBits >= 8)
            {
                mask[i] = 0xFF;
                remainingBits -= 8;
            }
            else if (remainingBits > 0)
            {
                mask[i] = (byte)(0xFF << (8 - remainingBits));
                remainingBits = 0;
            }
        }

        return mask;
    }

    private sealed record SweepResultRow(string IPAddress, string Status);
}
