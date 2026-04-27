using System.Globalization;
using System.Text.Json;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private sealed record ScriptExecutionResult(int ExitCode, string StandardOutput, string StandardError);
    private sealed record ResolvedSubnetSshCredentials(string User, string? KeyPath, string? Password);

    private async Task<LegacyPipelineTargetExecutionOutput> ExecuteTargetAsync(
        LegacyPipelineExecutionScope scope,
        LegacyPipelineTargetEntity target,
        IReadOnlyDictionary<int, LegacyPipelineNetworkEntity> networkLookup,
        CancellationToken cancellationToken)
    {
        var startedAtUtc = DateTimeOffset.UtcNow;
        try
        {
            var rawOutput = await RunScannerScriptAsync(scope, target, networkLookup, cancellationToken);
            var iocs = ParseLegacyScannerOutput(scope.ScannerFamily, rawOutput, target);
            return new LegacyPipelineTargetExecutionOutput(
                iocs.Count == 0 ? "NoFindings" : "Succeeded",
                iocs.Count == 0 ? "No findings were produced by the scanner." : $"Stored {iocs.Count} findings.",
                startedAtUtc,
                DateTimeOffset.UtcNow,
                iocs);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Legacy scan pipeline target execution failed for target {TargetId}.", target.TargetId);
            return new LegacyPipelineTargetExecutionOutput("Failed", ex.Message, startedAtUtc, DateTimeOffset.UtcNow, []);
        }
    }

    private async Task<string> RunScannerScriptAsync(
        LegacyPipelineExecutionScope scope,
        LegacyPipelineTargetEntity target,
        IReadOnlyDictionary<int, LegacyPipelineNetworkEntity> networkLookup,
        CancellationToken cancellationToken)
    {
        var options = _scanExecutionOptions.CurrentValue;
        var scriptPath = ResolveScannerScript(scope.ScannerFamily, options);
        var effectiveRulePath = string.Equals(scope.RuleInputMode, "hostPath", StringComparison.OrdinalIgnoreCase) ? scope.RulePath : scope.StagedRulePath;
        var normalizedFamily = LegacyScanPipelineHelpers.NormalizeScannerFamily(scope.ScannerFamily);
        var rulePathExists = !string.IsNullOrWhiteSpace(effectiveRulePath)
            && (File.Exists(effectiveRulePath) || (normalizedFamily == "sigma" && Directory.Exists(effectiveRulePath)));
        if (!rulePathExists)
        {
            throw new FileNotFoundException("No effective rule file was available for execution.");
        }

        var startInfo = new System.Diagnostics.ProcessStartInfo
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

        switch (normalizedFamily)
        {
            case "yara":
            {
                var network = RequireNetworkForTarget(target, networkLookup);
                var sshCredentials = ResolveSshCredentials(network);
                var effectiveTargetOs = LegacyScanPipelineHelpers.ResolveExecutionTargetOs(target, scope.Options);
                var effectiveScanPath = LegacyScanPipelineHelpers.ResolveYaraScanPath(scope.Options, effectiveTargetOs);
                startInfo.ArgumentList.Add("-Target");
                startInfo.ArgumentList.Add(target.IPAddress);
                startInfo.ArgumentList.Add("-User");
                startInfo.ArgumentList.Add(sshCredentials.User);
                startInfo.ArgumentList.Add("-ScanPath");
                startInfo.ArgumentList.Add(effectiveScanPath);
                startInfo.ArgumentList.Add("-RulePath");
                startInfo.ArgumentList.Add(effectiveRulePath!);
                if (!string.IsNullOrWhiteSpace(sshCredentials.KeyPath))
                {
                    startInfo.ArgumentList.Add("-KeyPath");
                    startInfo.ArgumentList.Add(sshCredentials.KeyPath);
                }
                else if (!string.IsNullOrWhiteSpace(sshCredentials.Password))
                {
                    startInfo.ArgumentList.Add("-UseEnvironmentPassword");
                    startInfo.Environment["IOC_MANAGER_SSH_PASSWORD"] = sshCredentials.Password;
                }
                startInfo.ArgumentList.Add("-RemoteOS");
                startInfo.ArgumentList.Add(effectiveTargetOs);
                if (LegacyScanPipelineHelpers.ReadBoolOption(scope.Options, "recursive")) startInfo.ArgumentList.Add("-Recursive");
                if (LegacyScanPipelineHelpers.ReadBoolOption(scope.Options, "showStrings")) startInfo.ArgumentList.Add("-ShowStrings");
                if (options.AcceptNewHostKey) startInfo.ArgumentList.Add("-AcceptNewHostKey");
                break;
            }
            case "sigma":
            {
                var network = RequireNetworkForTarget(target, networkLookup);
                var sshCredentials = ResolveSshCredentials(network);
                var sigmaRulesDirectory = LegacyScanPipelineHelpers.EnsureDirectory(options.SigmaCustomRulesDirectory ?? Path.Combine(Path.GetTempPath(), "ioc-manager-sigma-rules"));
                var sigmaRuleArgument = ".";
                string? copiedRulePath = null;
                if (Directory.Exists(effectiveRulePath))
                {
                    var relativePath = Path.GetRelativePath(sigmaRulesDirectory, effectiveRulePath);
                    sigmaRuleArgument = string.Equals(relativePath, ".", StringComparison.Ordinal)
                        ? "."
                        : relativePath.Replace('\\', '/');
                }
                else
                {
                    var copiedRuleName = $"legacy_pipeline_{Guid.NewGuid():N}{Path.GetExtension(effectiveRulePath)}";
                    copiedRulePath = Path.Combine(sigmaRulesDirectory, copiedRuleName);
                    File.Copy(effectiveRulePath!, copiedRulePath, true);
                    sigmaRuleArgument = copiedRuleName;
                }

                try
                {
                    startInfo.ArgumentList.Add("-Target");
                    startInfo.ArgumentList.Add(target.IPAddress);
                    startInfo.ArgumentList.Add("-User");
                    startInfo.ArgumentList.Add(sshCredentials.User);
                    if (!string.IsNullOrWhiteSpace(sshCredentials.KeyPath))
                    {
                        startInfo.ArgumentList.Add("-KeyPath");
                        startInfo.ArgumentList.Add(sshCredentials.KeyPath);
                    }
                    else if (!string.IsNullOrWhiteSpace(sshCredentials.Password))
                    {
                        startInfo.ArgumentList.Add("-UseEnvironmentPassword");
                        startInfo.Environment["IOC_MANAGER_SSH_PASSWORD"] = sshCredentials.Password;
                    }
                    startInfo.ArgumentList.Add("-RemoteOS");
                    startInfo.ArgumentList.Add(LegacyScanPipelineHelpers.ResolveExecutionTargetOs(target, scope.Options));
                    startInfo.ArgumentList.Add("-MinutesBack");
                    startInfo.ArgumentList.Add(LegacyScanPipelineHelpers.GetOption(scope.Options, "minutesBack") ?? options.DefaultSigmaMinutesBack.ToString(CultureInfo.InvariantCulture));
                    startInfo.ArgumentList.Add("-CustomRule");
                    startInfo.ArgumentList.Add(sigmaRuleArgument);
                    if (options.AcceptNewHostKey) startInfo.ArgumentList.Add("-AcceptNewHostKey");
                    var execution = await ExecuteProcessAsync(startInfo, TimeSpan.FromMinutes(3), cancellationToken);
                    if (execution.ExitCode != 0) throw new InvalidOperationException(string.IsNullOrWhiteSpace(execution.StandardError) ? "Sigma execution failed." : execution.StandardError);
                    return execution.StandardOutput ?? string.Empty;
                }
                finally
                {
                    if (!string.IsNullOrWhiteSpace(copiedRulePath))
                    {
                        LegacyScanPipelineHelpers.TryDeleteFile(copiedRulePath);
                    }
                }
            }
            case "snort":
            {
                var snortMode = LegacyScanPipelineHelpers.NormalizeSnortMode(LegacyScanPipelineHelpers.GetOption(scope.Options, LegacyScanPipelineHelpers.SnortModeOptionKey));
                startInfo.ArgumentList.Add("-Mode");
                startInfo.ArgumentList.Add(snortMode switch
                {
                    "pcap" => "Pcap",
                    "quarantine" => "Quarantine",
                    _ => "Hunt",
                });
                startInfo.ArgumentList.Add("-IP");
                startInfo.ArgumentList.Add(target.IPAddress);
                startInfo.ArgumentList.Add("-MasterRulePath");
                startInfo.ArgumentList.Add(effectiveRulePath!);

                if (string.Equals(snortMode, "hunt", StringComparison.OrdinalIgnoreCase))
                {
                    startInfo.ArgumentList.Add("-MinutesBack");
                    startInfo.ArgumentList.Add(LegacyScanPipelineHelpers.GetOption(scope.Options, "minutesBack") ?? options.DefaultSigmaMinutesBack.ToString(CultureInfo.InvariantCulture));
                }
                else if (string.Equals(snortMode, "pcap", StringComparison.OrdinalIgnoreCase))
                {
                    var pcapPath = LegacyScanPipelineHelpers.GetOption(scope.Options, LegacyScanPipelineHelpers.StagedPcapPathOptionKey)
                        ?? LegacyScanPipelineHelpers.GetOption(scope.Options, "pcapPath");
                    if (string.IsNullOrWhiteSpace(pcapPath) || !File.Exists(pcapPath))
                    {
                        throw new FileNotFoundException("No effective PCAP file was available for Snort PCAP execution.");
                    }

                    startInfo.ArgumentList.Add("-FilePath");
                    startInfo.ArgumentList.Add(pcapPath);
                }
                else
                {
                    throw new InvalidOperationException("Snort Quarantine jobs must be started through the session coordinator.");
                }

                break;
            }
            case "suricata":
            {
                var suricataMode = LegacyScanPipelineHelpers.NormalizeSuricataMode(LegacyScanPipelineHelpers.GetOption(scope.Options, LegacyScanPipelineHelpers.SuricataModeOptionKey));
                startInfo.ArgumentList.Add("-Mode");
                startInfo.ArgumentList.Add(suricataMode switch
                {
                    "pcap" => "Pcap",
                    "quarantine" => "Quarantine",
                    _ => "Hunt",
                });
                startInfo.ArgumentList.Add("-IP");
                startInfo.ArgumentList.Add(target.IPAddress);
                startInfo.ArgumentList.Add("-MasterRulePath");
                startInfo.ArgumentList.Add(effectiveRulePath!);

                if (string.Equals(suricataMode, "hunt", StringComparison.OrdinalIgnoreCase))
                {
                    startInfo.ArgumentList.Add("-MinutesBack");
                    startInfo.ArgumentList.Add(LegacyScanPipelineHelpers.GetOption(scope.Options, "minutesBack") ?? options.DefaultSigmaMinutesBack.ToString(CultureInfo.InvariantCulture));
                }
                else if (string.Equals(suricataMode, "pcap", StringComparison.OrdinalIgnoreCase))
                {
                    var pcapPath = LegacyScanPipelineHelpers.GetOption(scope.Options, LegacyScanPipelineHelpers.StagedPcapPathOptionKey)
                        ?? LegacyScanPipelineHelpers.GetOption(scope.Options, "pcapPath");
                    if (string.IsNullOrWhiteSpace(pcapPath) || !File.Exists(pcapPath))
                    {
                        throw new FileNotFoundException("No effective PCAP file was available for Suricata PCAP execution.");
                    }

                    startInfo.ArgumentList.Add("-FilePath");
                    startInfo.ArgumentList.Add(pcapPath);
                }
                else
                {
                    throw new InvalidOperationException("Suricata Quarantine jobs must be started through the session coordinator.");
                }

                break;
            }
        }

        var result = await ExecuteProcessAsync(startInfo, TimeSpan.FromMinutes(3), cancellationToken);
        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(result.StandardError) ? $"{normalizedFamily} execution failed." : result.StandardError);
        }

        return result.StandardOutput ?? string.Empty;
    }

    private static LegacyPipelineNetworkEntity RequireNetworkForTarget(
        LegacyPipelineTargetEntity target,
        IReadOnlyDictionary<int, LegacyPipelineNetworkEntity> networkLookup)
    {
        if (!target.NetworkId.HasValue)
        {
            throw new InvalidOperationException("Target is not linked to a subnet with SSH defaults.");
        }

        return networkLookup.TryGetValue(target.NetworkId.Value, out var network)
            ? network
            : throw new InvalidOperationException("Target subnet could not be resolved.");
    }

    private ResolvedSubnetSshCredentials ResolveSshCredentials(LegacyPipelineNetworkEntity network)
    {
        var sshUser = LegacyScanPipelineHelpers.CleanOrNull(network.SshUser);
        var sshKeyPath = LegacyScanPipelineHelpers.CleanOrNull(network.SshKeyPath);
        if (string.IsNullOrWhiteSpace(sshUser))
        {
            throw new InvalidOperationException($"Subnet '{network.Name}' is missing SSH defaults.");
        }

        if (!string.IsNullOrWhiteSpace(sshKeyPath))
        {
            return new ResolvedSubnetSshCredentials(sshUser, sshKeyPath, null);
        }

        var protectedPassword = LegacyScanPipelineHelpers.CleanOrNull(network.SshPasswordProtected);
        if (!string.IsNullOrWhiteSpace(protectedPassword))
        {
            return new ResolvedSubnetSshCredentials(sshUser, null, _sshPasswordProtector.Unprotect(protectedPassword));
        }

        throw new InvalidOperationException($"Subnet '{network.Name}' is missing SSH credentials.");
    }

    private static string ResolveScannerScript(string scannerFamily, ScanExecutionOptions options)
    {
        var normalized = LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily);
        if (options.Scripts.TryGetValue(normalized, out var configured) && !string.IsNullOrWhiteSpace(configured))
        {
            return LegacyScanPipelineHelpers.ResolvePath(configured);
        }

        return normalized switch
        {
            "yara" => LegacyScanPipelineHelpers.ResolvePath("Workspace/scripts/Invoke-YaraScan.ps1"),
            "sigma" => LegacyScanPipelineHelpers.ResolvePath("Workspace/scripts/Invoke-SigmaScan.ps1"),
            "snort" => LegacyScanPipelineHelpers.ResolvePath("Workspace/scripts/Invoke-SnortScan.ps1"),
            "suricata" => LegacyScanPipelineHelpers.ResolvePath("Workspace/scripts/Invoke-SuricataScan.ps1"),
            _ => throw new ArgumentException($"Unsupported scanner family '{scannerFamily}'."),
        };
    }

    private IReadOnlyList<LegacyPipelinePersistedIoc> ParseLegacyScannerOutput(string scannerFamily, string rawOutput, LegacyPipelineTargetEntity target)
    {
        if (string.IsNullOrWhiteSpace(rawOutput)) return [];
        var envelopes = LegacyScannerEnvelopeParser.ParseEnvelopes(rawOutput);
        if (envelopes.Count == 0) return [];

        var family = LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily);
        var items = new List<LegacyPipelinePersistedIoc>();
        foreach (var envelope in envelopes)
        {
            var timestamp = LegacyScanPipelineHelpers.ParseEnvelopeTimestamp(envelope.Metadata.TimestampUtc);
            switch (family)
            {
                case "yara":
                    items.AddRange(ParseYaraFindings(envelope, target, timestamp));
                    break;
                case "sigma":
                    items.AddRange(ParseSigmaFindings(envelope, target, timestamp));
                    break;
                default:
                    items.AddRange(ParseNetworkFindings(family, envelope, target, timestamp));
                    break;
            }
        }

        return items;
    }

    private static IEnumerable<LegacyPipelinePersistedIoc> ParseYaraFindings(LegacyScannerEnvelope envelope, LegacyPipelineTargetEntity target, DateTimeOffset timestampUtc)
    {
        if (!LegacyScanPipelineHelpers.TryGetProperty(envelope.RawScannerPayload, "matches", out var matches) || matches.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var match in matches.EnumerateArray())
        {
            yield return new LegacyPipelinePersistedIoc(
                Guid.NewGuid(),
                timestampUtc,
                "YARA",
                target.IPAddress,
                LegacyScanPipelineHelpers.CleanOrNull(target.TargetOsType),
                LegacyScanPipelineHelpers.ReadJsonString(match, "rule") ?? LegacyScanPipelineHelpers.ReadJsonString(match, "Rule") ?? "unknown",
                match.GetRawText(),
                new LegacyPipelinePersistedYaraDetail(
                    LegacyScanPipelineHelpers.ReadJsonString(match, "file") ?? LegacyScanPipelineHelpers.ReadJsonString(match, "path") ?? "unknown",
                    LegacyScanPipelineHelpers.ReadJsonString(match, "file_hash")
                        ?? LegacyScanPipelineHelpers.ReadJsonString(match, "fileHash")
                        ?? LegacyScanPipelineHelpers.ReadJsonString(match, "sha256")
                        ?? LegacyScanPipelineHelpers.ReadJsonString(match, "sha1")
                        ?? LegacyScanPipelineHelpers.ReadJsonString(match, "md5")
                        ?? LegacyScanPipelineHelpers.ReadJsonString(match, "hash")),
                null,
                null);
        }
    }

    private static IEnumerable<LegacyPipelinePersistedIoc> ParseSigmaFindings(LegacyScannerEnvelope envelope, LegacyPipelineTargetEntity target, DateTimeOffset timestampUtc)
    {
        if (!LegacyScanPipelineHelpers.TryGetProperty(envelope.RawScannerPayload, "detections", out var detections))
        {
            yield break;
        }

        if (detections.ValueKind == JsonValueKind.Array)
        {
            foreach (var detection in detections.EnumerateArray())
            {
                yield return BuildSigmaIoc(detection, target, timestampUtc);
            }

            yield break;
        }

        yield return BuildSigmaIoc(detections, target, timestampUtc);
    }

    private static LegacyPipelinePersistedIoc BuildSigmaIoc(JsonElement detection, LegacyPipelineTargetEntity target, DateTimeOffset timestampUtc)
    {
        return new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            timestampUtc,
            "SIGMA",
            target.IPAddress,
            LegacyScanPipelineHelpers.CleanOrNull(target.TargetOsType),
            LegacyScanPipelineHelpers.ReadJsonString(detection, "title")
                ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "rule")
                ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "rule_name")
                ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "name")
                ?? "unknown",
            detection.GetRawText(),
            null,
            new LegacyPipelinePersistedSigmaDetail(
                LegacyScanPipelineHelpers.ReadJsonString(detection, "logsource") ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "LogSource"),
                LegacyScanPipelineHelpers.ReadJsonString(detection, "severity") ?? LegacyScanPipelineHelpers.ReadJsonPath(detection, "document", "data", "Level"),
                LegacyScanPipelineHelpers.ReadJsonPath(detection, "document", "data", "Event", "EventData", "CommandLine")
                    ?? LegacyScanPipelineHelpers.ReadJsonPath(detection, "document", "data", "CommandLine")
                    ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "CommandLine")
                    ?? LegacyScanPipelineHelpers.ReadJsonString(detection, "message")),
            null);
    }

    private static IEnumerable<LegacyPipelinePersistedIoc> ParseNetworkFindings(string family, LegacyScannerEnvelope envelope, LegacyPipelineTargetEntity target, DateTimeOffset timestampUtc)
    {
        var payload = envelope.RawScannerPayload;
        var flowIdString = LegacyScanPipelineHelpers.ReadJsonString(payload, "FlowId") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "flow_id");
        long? flowId = long.TryParse(flowIdString, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedFlowId) ? parsedFlowId : null;
        yield return new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            timestampUtc,
            family.ToUpperInvariant(),
            target.IPAddress,
            LegacyScanPipelineHelpers.CleanOrNull(target.TargetOsType),
            LegacyScanPipelineHelpers.ReadJsonString(payload, "RuleTitle")
                ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "Signature")
                ?? LegacyScanPipelineHelpers.ReadJsonPath(payload, "alert", "signature")
                ?? "unknown",
            payload.GetRawText(),
            null,
            null,
            new LegacyPipelinePersistedNetworkDetail(
                LegacyScanPipelineHelpers.ReadJsonString(payload, "Source_IP") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "src_ip") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "src"),
                LegacyScanPipelineHelpers.ReadJsonString(payload, "Dest_IP") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "Destination_IP") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "dest_ip") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "dest"),
                LegacyScanPipelineHelpers.ReadJsonString(payload, "Protocol") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "proto"),
                LegacyScanPipelineHelpers.ReadJsonString(payload, "Severity") ?? LegacyScanPipelineHelpers.ReadJsonString(payload, "severity") ?? LegacyScanPipelineHelpers.ReadJsonPath(payload, "alert", "severity"),
                flowId));
    }

    private static async Task<ScriptExecutionResult> ExecuteProcessAsync(
        System.Diagnostics.ProcessStartInfo startInfo,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        using var process = new System.Diagnostics.Process { StartInfo = startInfo };
        if (!process.Start())
        {
            throw new InvalidOperationException($"Failed to start process '{startInfo.FileName}'.");
        }

        var standardOutputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var standardErrorTask = process.StandardError.ReadToEndAsync(cancellationToken);
        var waitForExitTask = process.WaitForExitAsync(cancellationToken);
        var completedTask = await Task.WhenAny(waitForExitTask, Task.Delay(timeout, cancellationToken));
        if (completedTask != waitForExitTask)
        {
            try
            {
                process.Kill(true);
            }
            catch
            {
            }

            throw new TimeoutException($"Process '{startInfo.FileName}' exceeded the execution timeout of {timeout.TotalMinutes:N0} minute(s).");
        }

        var standardOutput = await standardOutputTask;
        var standardError = await standardErrorTask;
        return new ScriptExecutionResult(process.ExitCode, standardOutput, standardError);
    }
}
