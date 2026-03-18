using System.Text.Json;
using IocVmwareIngestion.Api.Contracts;
using IocVmwareIngestion.Api.Entities;
using IocVmwareIngestion.Api.Options;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Services;

public sealed class ScanOrchestrator(
    IScanRunRepository repository,
    IPowerShellScriptRunner scriptRunner,
    IocExtractionService extractionService,
    IOptions<PowerShellSettings> powerShellOptions,
    IOptions<VmwareTargetSettings> targetOptions,
    IWebHostEnvironment environment) : IScanOrchestrator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IScanRunRepository _repository = repository;
    private readonly IPowerShellScriptRunner _scriptRunner = scriptRunner;
    private readonly IocExtractionService _extractionService = extractionService;
    private readonly PowerShellSettings _powerShellSettings = powerShellOptions.Value;
    private readonly VmwareTargetSettings _targetSettings = targetOptions.Value;
    private readonly IWebHostEnvironment _environment = environment;

    public async Task<ScanRunResponse> RunAsync(RunScanRequest request, CancellationToken cancellationToken)
    {
        var target = ResolveTarget(request.TargetKey);
        var normalizedScanner = NormalizeScanner(request.Scanner);
        var scriptPath = ResolveScriptPath(normalizedScanner);
        var arguments = BuildArguments(normalizedScanner, target, request);

        var executionResult = await _scriptRunner.ExecuteAsync(scriptPath, arguments, cancellationToken);

        var scanRun = new ScanRun
        {
            ScannerType = normalizedScanner,
            TargetKey = request.TargetKey,
            TargetAddress = target.Address,
            TargetServer = $"{target.User}@{target.Address}",
            TargetOsType = target.RemoteOs,
            StartedUtc = executionResult.StartedUtc,
            CompletedUtc = executionResult.CompletedUtc,
            ExitCode = executionResult.ExitCode,
            CommandLine = executionResult.CommandLine,
            RawStdOut = executionResult.StandardOutput,
            RawStdErr = executionResult.StandardError
        };

        if (executionResult.ExitCode != 0)
        {
            scanRun.Status = "Failed";
            scanRun.ErrorMessage = string.IsNullOrWhiteSpace(executionResult.StandardError)
                ? "PowerShell script returned a non-zero exit code."
                : executionResult.StandardError;

            await _repository.SaveAsync(scanRun, cancellationToken);
            return ScanRunResponse.FromEntity(scanRun);
        }

        IReadOnlyCollection<ScannerEnvelope> envelopes;

        try
        {
            envelopes = ParseEnvelopes(executionResult.StandardOutput);
        }
        catch (Exception exception)
        {
            scanRun.Status = "Failed";
            scanRun.ErrorMessage = $"Unable to parse scanner JSON: {exception.Message}";

            await _repository.SaveAsync(scanRun, cancellationToken);
            return ScanRunResponse.FromEntity(scanRun);
        }

        if (envelopes.Count == 0
            && string.Equals(normalizedScanner, "yara", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(executionResult.StandardOutput))
        {
            scanRun.Status = "Failed";
            scanRun.ErrorMessage = "YARA returned non-empty stdout, but no valid JSON envelope could be parsed.";

            await _repository.SaveAsync(scanRun, cancellationToken);
            return ScanRunResponse.FromEntity(scanRun);
        }

        if (envelopes.Count > 0)
        {
            var first = envelopes.First();
            scanRun.ScannerType = first.Metadata.ScannerType.Trim().ToLowerInvariant();
            scanRun.TargetServer = first.Metadata.TargetServer;
            scanRun.TargetOsType = first.Metadata.OsType;
        }

        var extractedIocs = envelopes.SelectMany(_extractionService.Extract).ToList();

        scanRun.Status = extractedIocs.Count == 0 ? "NoFindings" : "Succeeded";
        scanRun.FindingsCount = extractedIocs.Count;

        foreach (var ioc in extractedIocs)
        {
            ioc.CreatedUtc = DateTime.UtcNow;
            scanRun.IocRecords.Add(ioc);
        }

        await _repository.SaveAsync(scanRun, cancellationToken);
        return ScanRunResponse.FromEntity(scanRun);
    }

    public async Task<IReadOnlyCollection<ScanRunResponse>> RunConfiguredTargetsAsync(RunAllConfiguredScansRequest request, CancellationToken cancellationToken)
    {
        var scanners = (request.Scanners?.Count > 0 ? request.Scanners : _powerShellSettings.DefaultScanners)
            .Select(NormalizeScanner)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var targetKeys = (request.TargetKeys?.Count > 0 ? request.TargetKeys : _targetSettings.Targets.Keys.ToArray()).ToArray();
        var results = new List<ScanRunResponse>();

        foreach (var targetKey in targetKeys)
        {
            foreach (var scanner in scanners)
            {
                var response = await RunAsync(
                    new RunScanRequest(
                        scanner,
                        targetKey,
                        RulePath: request.RulePath,
                        MinutesBack: request.MinutesBack,
                        Since: request.Since),
                    cancellationToken);

                results.Add(response);
            }
        }

        return results;
    }

    private VmwareTarget ResolveTarget(string targetKey)
    {
        if (!_targetSettings.Targets.TryGetValue(targetKey, out var target))
        {
            throw new KeyNotFoundException($"Unknown target '{targetKey}'.");
        }

        return target;
    }

    private string ResolveScriptPath(string scanner)
    {
        if (!_powerShellSettings.Scripts.TryGetValue(scanner, out var configuredPath))
        {
            throw new KeyNotFoundException($"No script path is configured for scanner '{scanner}'.");
        }

        return Path.GetFullPath(Path.Combine(_environment.ContentRootPath, configuredPath));
    }

    private IReadOnlyCollection<PowerShellArgument> BuildArguments(string scanner, VmwareTarget target, RunScanRequest request) =>
        scanner switch
        {
            "yara" => BuildYaraArguments(target, request),
            "sigma" => BuildSigmaArguments(target, request),
            "suricata" => BuildSuricataArguments(target, request),
            "snort" => BuildSnortArguments(target, request),
            _ => throw new NotSupportedException($"Scanner '{scanner}' is not supported.")
        };

    private IReadOnlyCollection<PowerShellArgument> BuildYaraArguments(VmwareTarget target, RunScanRequest request)
    {
        var arguments = new List<PowerShellArgument>
        {
            new("Target", target.Address),
            new("User", target.User),
            new("ScanPath", string.IsNullOrWhiteSpace(request.ScanPath) ? target.DefaultScanPath : request.ScanPath),
            new("RulePath", string.IsNullOrWhiteSpace(request.RulePath) ? _powerShellSettings.DefaultYaraRulePath : request.RulePath),
            new("KeyPath", target.KeyPath),
            new("RemoteOS", target.RemoteOs)
        };

        if (_powerShellSettings.AcceptNewHostKey)
        {
            arguments.Add(new PowerShellArgument("AcceptNewHostKey", IsSwitch: true));
        }

        if (request.Recursive)
        {
            arguments.Add(new PowerShellArgument("Recursive", IsSwitch: true));
        }

        if (request.ShowStrings)
        {
            arguments.Add(new PowerShellArgument("ShowStrings", IsSwitch: true));
        }

        return arguments;
    }

    private IReadOnlyCollection<PowerShellArgument> BuildSigmaArguments(VmwareTarget target, RunScanRequest request)
    {
        var arguments = new List<PowerShellArgument>
        {
            new("Target", target.Address),
            new("User", target.User),
            new("KeyPath", target.KeyPath),
            new("RemoteOS", target.RemoteOs),
            new("MinutesBack", (request.MinutesBack ?? _powerShellSettings.DefaultSigmaMinutesBack).ToString())
        };

        if (!string.IsNullOrWhiteSpace(request.SigmaCustomRule))
        {
            arguments.Add(new("CustomRule", request.SigmaCustomRule));
        }
        else if (!string.IsNullOrWhiteSpace(request.SigmaRule))
        {
            arguments.Add(new("Rule", request.SigmaRule));
        }
        else if (!string.IsNullOrWhiteSpace(_powerShellSettings.DefaultSigmaRule))
        {
            arguments.Add(new("Rule", _powerShellSettings.DefaultSigmaRule));
        }

        if (!string.IsNullOrWhiteSpace(target.DefaultEvtxPath))
        {
            if (string.Equals(target.RemoteOs, "windows", StringComparison.OrdinalIgnoreCase))
            {
                arguments.Add(new("EvtxPath", target.DefaultEvtxPath));
            }
            else
            {
                arguments.Add(new("LinuxLogPath", target.DefaultEvtxPath));
            }
        }

        if (_powerShellSettings.AcceptNewHostKey)
        {
            arguments.Add(new PowerShellArgument("AcceptNewHostKey", IsSwitch: true));
        }

        return arguments;
    }

    private static IReadOnlyCollection<PowerShellArgument> BuildSuricataArguments(VmwareTarget target, RunScanRequest request)
    {
        var mode = string.IsNullOrWhiteSpace(request.NetworkMode) ? "Hunt" : request.NetworkMode;
        var arguments = new List<PowerShellArgument> { new("Mode", mode) };

        if (string.Equals(mode, "Pcap", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(request.FilePath))
        {
            arguments.Add(new("FilePath", request.FilePath));
        }
        else
        {
            arguments.Add(new("IP", target.Address));
        }

        if (string.Equals(mode, "Hunt", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Since.HasValue)
            {
                arguments.Add(new("Since", request.Since.Value.ToUniversalTime().ToString("O")));
            }
            else if (request.MinutesBack.HasValue)
            {
                arguments.Add(new("MinutesBack", request.MinutesBack.Value.ToString()));
            }
        }

        return arguments;
    }

    private static IReadOnlyCollection<PowerShellArgument> BuildSnortArguments(VmwareTarget target, RunScanRequest request)
    {
        var mode = string.IsNullOrWhiteSpace(request.NetworkMode) ? "Hunt" : request.NetworkMode;
        var arguments = new List<PowerShellArgument> { new("Mode", mode) };

        if (string.Equals(mode, "Pcap", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(request.FilePath))
        {
            arguments.Add(new("FilePath", request.FilePath));
        }
        else
        {
            arguments.Add(new("IP", target.Address));
        }

        if (string.Equals(mode, "Hunt", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Since.HasValue)
            {
                arguments.Add(new("Since", request.Since.Value.ToUniversalTime().ToString("O")));
            }
            else if (request.MinutesBack.HasValue)
            {
                arguments.Add(new("MinutesBack", request.MinutesBack.Value.ToString()));
            }
        }

        return arguments;
    }

    private static IReadOnlyCollection<ScannerEnvelope> ParseEnvelopes(string standardOutput) =>
        ScannerOutputParser.ParseEnvelopes(standardOutput, JsonOptions);

    private static string NormalizeScanner(string scanner)
    {
        if (string.IsNullOrWhiteSpace(scanner))
        {
            throw new ArgumentException("Scanner is required.", nameof(scanner));
        }

        return scanner.Trim().ToLowerInvariant();
    }
}

