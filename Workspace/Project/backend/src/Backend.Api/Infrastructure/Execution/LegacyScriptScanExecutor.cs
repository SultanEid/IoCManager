using System.Security.Cryptography;
using System.Text.Json;
using Backend.Domain.IocManager;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure.Execution;

public sealed record LegacyScriptDispatchAttempt(bool Handled, ScanExecutionDispatchResult? Result)
{
    public static LegacyScriptDispatchAttempt NotHandled { get; } = new(false, null);

    public static LegacyScriptDispatchAttempt HandledResult(ScanExecutionDispatchResult result)
        => new(true, result);
}

public interface ILegacyScriptScanExecutor
{
    Task<LegacyScriptDispatchAttempt> TryExecuteAsync(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        ScannerCapability capability,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        CancellationToken cancellationToken);
}

public sealed class LegacyScriptScanExecutor : ILegacyScriptScanExecutor
{
    private readonly IOptionsMonitor<ScanExecutionOptions> _optionsMonitor;
    private readonly TargetServerConnectionSecretProtector _secretProtector;
    private readonly ILogger<LegacyScriptScanExecutor> _logger;

    public LegacyScriptScanExecutor(
        IOptionsMonitor<ScanExecutionOptions> optionsMonitor,
        TargetServerConnectionSecretProtector secretProtector,
        ILogger<LegacyScriptScanExecutor> logger)
    {
        _optionsMonitor = optionsMonitor;
        _secretProtector = secretProtector;
        _logger = logger;
    }

    public async Task<LegacyScriptDispatchAttempt> TryExecuteAsync(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        ScannerCapability capability,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.PreferScripts)
        {
            return LegacyScriptDispatchAttempt.NotHandled;
        }

        if (!TryResolveScriptPath(capability, options, out var scriptPath))
        {
            return options.AllowConnectorFallback
                ? LegacyScriptDispatchAttempt.NotHandled
                : LegacyScriptDispatchAttempt.HandledResult(Fail($"No script is configured for {capability}."));
        }

        var normalizedScriptPath = ResolvePath(scriptPath);
        if (!File.Exists(normalizedScriptPath))
        {
            return options.AllowConnectorFallback
                ? LegacyScriptDispatchAttempt.NotHandled
                : LegacyScriptDispatchAttempt.HandledResult(Fail($"Configured script path was not found: {normalizedScriptPath}"));
        }

        var tempFiles = new List<string>();
        try
        {
            IReadOnlyList<string>? arguments = capability switch
            {
                ScannerCapability.Yara => await BuildYaraArgumentsAsync(targetServer, connectionSecret, effectiveRules, options, tempFiles, cancellationToken),
                ScannerCapability.Sigma => await BuildSigmaArgumentsAsync(targetServer, connectionSecret, effectiveRules, options, tempFiles, cancellationToken),
                ScannerCapability.Snort => await BuildNetworkArgumentsAsync(targetServer, effectiveRules, options, tempFiles, "snort", cancellationToken),
                ScannerCapability.Suricata => await BuildNetworkArgumentsAsync(targetServer, effectiveRules, options, tempFiles, "suricata", cancellationToken),
                _ => null,
            };

            if (arguments is null)
            {
                return options.AllowConnectorFallback
                    ? LegacyScriptDispatchAttempt.NotHandled
                    : LegacyScriptDispatchAttempt.HandledResult(Fail($"Script execution is not configured for {capability}."));
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
            startInfo.ArgumentList.Add(normalizedScriptPath);
            foreach (var argument in arguments)
            {
                startInfo.ArgumentList.Add(argument);
            }

            var execution = await ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
            var rawOutput = string.IsNullOrWhiteSpace(execution.StandardOutput) ? null : execution.StandardOutput;
            if (execution.ExitCode != 0)
            {
                return LegacyScriptDispatchAttempt.HandledResult(
                    Fail(
                        $"Script execution failed for {capability}: {execution.StandardError}",
                        rawOutput));
            }

            var resultFiles = BuildResultFiles(tempFiles);
            var summary = string.IsNullOrWhiteSpace(rawOutput)
                ? $"Script execution completed for {capability} with no findings."
                : $"Script execution completed for {capability}.";

            _logger.LogInformation(
                "Executed legacy script path for scan job {ScanJobId} target execution {TargetExecutionId} using capability {Capability}.",
                scanJob.Id,
                targetExecution.Id,
                capability);

            return LegacyScriptDispatchAttempt.HandledResult(
                new ScanExecutionDispatchResult(
                    ScanJobTargetExecutionStatus.Completed,
                    summary,
                    null,
                    null,
                    rawOutput,
                    resultFiles,
                    []));
        }
        finally
        {
            foreach (var tempFile in tempFiles)
            {
                try
                {
                    if (File.Exists(tempFile))
                    {
                        File.Delete(tempFile);
                    }
                }
                catch
                {
                }
            }
        }
    }

    private async Task<IReadOnlyList<string>?> BuildYaraArgumentsAsync(
        TargetServer targetServer,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        ScanExecutionOptions options,
        ICollection<string> tempFiles,
        CancellationToken cancellationToken)
    {
        if (effectiveRules.Count == 0)
        {
            return null;
        }

        var sshSecret = ReadSshSecret(connectionSecret);
        var user = !string.IsNullOrWhiteSpace(targetServer.ConnectionUsername) ? targetServer.ConnectionUsername : sshSecret.User;
        var keyPath = sshSecret.KeyPath;
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(keyPath))
        {
            return null;
        }

        var rulePath = await WriteRuleBundleAsync(effectiveRules, ".yar", cancellationToken);
        tempFiles.Add(rulePath);
        var scanPath = string.Equals(NormalizeRemoteOs(targetServer.OperatingSystem), "windows", StringComparison.OrdinalIgnoreCase) ? "C:\\" : "/";

        var arguments = new List<string>
        {
            "-Target", ResolveTargetHost(targetServer),
            "-User", user,
            "-ScanPath", scanPath,
            "-RulePath", rulePath,
            "-KeyPath", keyPath,
            "-RemoteOS", NormalizeRemoteOs(targetServer.OperatingSystem),
        };

        if (options.AcceptNewHostKey)
        {
            arguments.Add("-AcceptNewHostKey");
        }

        return arguments;
    }

    private async Task<IReadOnlyList<string>?> BuildSigmaArgumentsAsync(
        TargetServer targetServer,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        ScanExecutionOptions options,
        ICollection<string> tempFiles,
        CancellationToken cancellationToken)
    {
        if (effectiveRules.Count == 0)
        {
            return null;
        }

        var sshSecret = ReadSshSecret(connectionSecret);
        var user = !string.IsNullOrWhiteSpace(targetServer.ConnectionUsername) ? targetServer.ConnectionUsername : sshSecret.User;
        var keyPath = sshSecret.KeyPath;
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(keyPath))
        {
            return null;
        }

        var customRulesDirectory = string.IsNullOrWhiteSpace(options.SigmaCustomRulesDirectory)
            ? Path.Combine(Path.GetTempPath(), "ioc-manager-sigma-rules")
            : ResolvePath(options.SigmaCustomRulesDirectory);
        Directory.CreateDirectory(customRulesDirectory);
        var ruleFileName = $"scan_{Guid.NewGuid():N}.yml";
        var rulePath = Path.Combine(customRulesDirectory, ruleFileName);
        await File.WriteAllTextAsync(rulePath, BuildCombinedRuleContent(effectiveRules), cancellationToken);
        tempFiles.Add(rulePath);

        var arguments = new List<string>
        {
            "-Target", ResolveTargetHost(targetServer),
            "-User", user,
            "-KeyPath", keyPath,
            "-RemoteOS", NormalizeRemoteOs(targetServer.OperatingSystem),
            "-MinutesBack", options.DefaultSigmaMinutesBack.ToString(),
            "-CustomRule", ruleFileName,
        };

        if (options.AcceptNewHostKey)
        {
            arguments.Add("-AcceptNewHostKey");
        }

        return arguments;
    }

    private async Task<IReadOnlyList<string>?> BuildNetworkArgumentsAsync(
        TargetServer targetServer,
        IReadOnlyList<RuleRevision> effectiveRules,
        ScanExecutionOptions options,
        ICollection<string> tempFiles,
        string family,
        CancellationToken cancellationToken)
    {
        if (effectiveRules.Count == 0)
        {
            return null;
        }

        var extension = ".rules";
        var rulePath = await WriteRuleBundleAsync(effectiveRules, extension, cancellationToken);
        tempFiles.Add(rulePath);

        return
        [
            "-Mode", "Hunt",
            "-IP", targetServer.IpAddress,
            "-MinutesBack", options.DefaultSigmaMinutesBack.ToString(),
            "-MasterRulePath", rulePath,
        ];
    }

    private static string ResolveTargetHost(TargetServer targetServer)
    {
        return string.IsNullOrWhiteSpace(targetServer.ConnectionHost)
            ? targetServer.IpAddress
            : targetServer.ConnectionHost;
    }

    private static string NormalizeRemoteOs(string operatingSystem)
    {
        return operatingSystem.Contains("win", StringComparison.OrdinalIgnoreCase) ? "windows" : "linux";
    }

    private static bool TryResolveScriptPath(ScannerCapability capability, ScanExecutionOptions options, out string scriptPath)
    {
        var key = capability.ToString().ToLowerInvariant();
        if (options.Scripts.TryGetValue(key, out var configured))
        {
            scriptPath = configured;
            return true;
        }

        scriptPath = capability switch
        {
            ScannerCapability.Yara => "scripts/Invoke-YaraScan.ps1",
            ScannerCapability.Sigma => "scripts/Invoke-SigmaScan.ps1",
            ScannerCapability.Snort => "scripts/Invoke-SnortScan.ps1",
            ScannerCapability.Suricata => "scripts/Invoke-SuricataScan.ps1",
            _ => string.Empty,
        };

        return !string.IsNullOrWhiteSpace(scriptPath);
    }

    private static string ResolvePath(string path)
    {
        return Path.IsPathRooted(path)
            ? path
            : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", path));
    }

    private static IReadOnlyList<ScanExecutionResultFile> BuildResultFiles(IEnumerable<string> paths)
    {
        var files = new List<ScanExecutionResultFile>();
        foreach (var path in paths.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!File.Exists(path))
            {
                continue;
            }

            var info = new FileInfo(path);
            files.Add(new ScanExecutionResultFile(
                info.Name,
                info.FullName,
                info.Length,
                ComputeSha256(path)));
        }

        return files;
    }

    private static string ComputeSha256(string path)
    {
        using var stream = File.OpenRead(path);
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static ScanExecutionDispatchResult Fail(string message, string? rawOutput = null)
    {
        return new ScanExecutionDispatchResult(
            ScanJobTargetExecutionStatus.Failed,
            message,
            message,
            null,
            rawOutput,
            [],
            []);
    }

    private static string BuildCombinedRuleContent(IReadOnlyList<RuleRevision> effectiveRules)
    {
        return string.Join(
            Environment.NewLine + Environment.NewLine,
            effectiveRules.Select(static rule => string.IsNullOrWhiteSpace(rule.OriginalContent) ? rule.RuleBody : rule.OriginalContent));
    }

    private static async Task<string> WriteRuleBundleAsync(IReadOnlyList<RuleRevision> effectiveRules, string extension, CancellationToken cancellationToken)
    {
        var directory = Path.Combine(Path.GetTempPath(), "ioc-manager-script-rules");
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"scan_{Guid.NewGuid():N}{extension}");
        await File.WriteAllTextAsync(path, BuildCombinedRuleContent(effectiveRules), cancellationToken);
        return path;
    }

    private SshSecret ReadSshSecret(TargetServerConnectionSecret? connectionSecret)
    {
        if (connectionSecret is null)
        {
            return SshSecret.Empty;
        }

        try
        {
            var payload = _secretProtector.Unprotect(connectionSecret.EncryptedPayload);
            using var json = JsonDocument.Parse(payload);
            var root = json.RootElement;
            var ssh = TryGetObject(root, "ssh");
            return new SshSecret(
                ReadString(ssh, "user", "username") ?? ReadString(root, "sshUser", "user", "username"),
                ReadString(ssh, "keyPath", "privateKeyPath") ?? ReadString(root, "sshKeyPath", "keyPath", "privateKeyPath"));
        }
        catch
        {
            return SshSecret.Empty;
        }
    }

    private static JsonElement? TryGetObject(JsonElement root, string key)
    {
        foreach (var property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Object)
            {
                return property.Value;
            }
        }

        return null;
    }

    private static string? ReadString(JsonElement? container, params string[] keys)
    {
        if (!container.HasValue || container.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var key in keys)
        {
            foreach (var property in container.Value.EnumerateObject())
            {
                if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    return property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() : property.Value.GetRawText();
                }
            }
        }

        return null;
    }

    private sealed record SshSecret(string? User, string? KeyPath)
    {
        public static SshSecret Empty { get; } = new(null, null);
    }
}
