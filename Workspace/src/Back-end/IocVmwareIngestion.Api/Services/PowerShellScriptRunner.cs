using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using IocVmwareIngestion.Api.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Services;

public sealed partial class PowerShellScriptRunner(
    IOptions<PowerShellSettings> settings,
    IEnumerable<IScriptExecutionHost> executionHosts,
    IWebHostEnvironment environment) : IPowerShellScriptRunner
{
    private readonly PowerShellSettings _settings = settings.Value;
    private readonly IWebHostEnvironment _environment = environment;
    private readonly IScriptExecutionHost _executionHost = executionHosts.First(host => host.CanExecuteRemotely == settings.Value.RemoteExecution.Enabled);

    public async Task<ScriptExecutionResult> ExecuteAsync(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments, CancellationToken cancellationToken)
    {
        return _settings.RemoteExecution.Enabled
            ? await ExecuteRemoteAsync(scriptPath, arguments, cancellationToken)
            : await ExecuteLocalAsync(scriptPath, arguments, cancellationToken);
    }

    private async Task<ScriptExecutionResult> ExecuteLocalAsync(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments, CancellationToken cancellationToken)
    {
        var commandArguments = BuildLocalArguments(scriptPath, arguments);
        var rawResult = await _executionHost.ExecuteAsync(_settings.Executable, commandArguments, cancellationToken);
        var localResultPath = BuildLocalResultPath(scriptPath, arguments, rawResult.StartedUtc);

        Directory.CreateDirectory(Path.GetDirectoryName(localResultPath)!);
        await File.WriteAllTextAsync(localResultPath, rawResult.StandardOutput, new UTF8Encoding(false), cancellationToken);

        return rawResult with { LocalResultFilePath = localResultPath };
    }

    private async Task<ScriptExecutionResult> ExecuteRemoteAsync(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments, CancellationToken cancellationToken)
    {
        var remoteArguments = BuildRemoteArguments(scriptPath, arguments);
        var rawResult = await _executionHost.ExecuteAsync(_settings.RemoteExecution.PowerShellExecutable, remoteArguments, cancellationToken);
        var remoteResultPath = ExtractRemoteResultPath(rawResult.StandardOutput);

        if (rawResult.ExitCode != 0 || string.IsNullOrWhiteSpace(remoteResultPath))
        {
            return rawResult with { StandardOutput = string.Empty };
        }

        var localResultPath = BuildLocalResultPath(scriptPath, arguments, rawResult.StartedUtc);
        Directory.CreateDirectory(Path.GetDirectoryName(localResultPath)!);

        await DownloadRemoteResultAsync(remoteResultPath, localResultPath, cancellationToken);
        var localOutput = await File.ReadAllTextAsync(localResultPath, cancellationToken);

        try
        {
            await DeleteRemoteResultAsync(remoteResultPath, cancellationToken);
        }
        catch
        {
        }

        return rawResult with
        {
            StandardOutput = localOutput,
            StandardError = string.Empty,
            LocalResultFilePath = localResultPath
        };
    }

    private async Task DownloadRemoteResultAsync(string remoteResultPath, string localResultPath, CancellationToken cancellationToken)
    {
        var remote = _settings.RemoteExecution;
        var startInfo = new ProcessStartInfo
        {
            FileName = remote.ScpExecutable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (!string.IsNullOrWhiteSpace(remote.KeyPath))
        {
            startInfo.ArgumentList.Add("-i");
            startInfo.ArgumentList.Add(remote.KeyPath);
            startInfo.ArgumentList.Add("-o");
            startInfo.ArgumentList.Add("IdentitiesOnly=yes");
        }

        startInfo.ArgumentList.Add("-o");
        startInfo.ArgumentList.Add("BatchMode=yes");

        if (_settings.AcceptNewHostKey)
        {
            startInfo.ArgumentList.Add("-o");
            startInfo.ArgumentList.Add("StrictHostKeyChecking=accept-new");
        }

        startInfo.ArgumentList.Add($"{remote.User}@{remote.Host}:{ConvertWindowsPathToScp(remoteResultPath)}");
        startInfo.ArgumentList.Add(localResultPath);

        var result = await ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException($"Unable to download scanner result from ioc_mgr. {result.StandardError}");
        }
    }

    private async Task DeleteRemoteResultAsync(string remoteResultPath, CancellationToken cancellationToken)
    {
        var remote = _settings.RemoteExecution;
        var startInfo = new ProcessStartInfo
        {
            FileName = remote.SshExecutable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (!string.IsNullOrWhiteSpace(remote.KeyPath))
        {
            startInfo.ArgumentList.Add("-i");
            startInfo.ArgumentList.Add(remote.KeyPath);
            startInfo.ArgumentList.Add("-o");
            startInfo.ArgumentList.Add("IdentitiesOnly=yes");
        }

        startInfo.ArgumentList.Add("-o");
        startInfo.ArgumentList.Add("BatchMode=yes");

        if (_settings.AcceptNewHostKey)
        {
            startInfo.ArgumentList.Add("-o");
            startInfo.ArgumentList.Add("StrictHostKeyChecking=accept-new");
        }

        startInfo.ArgumentList.Add($"{remote.User}@{remote.Host}");
        startInfo.ArgumentList.Add("powershell.exe");
        startInfo.ArgumentList.Add("-NoLogo");
        startInfo.ArgumentList.Add("-NoProfile");
        startInfo.ArgumentList.Add("-NonInteractive");
        startInfo.ArgumentList.Add("-ExecutionPolicy");
        startInfo.ArgumentList.Add("Bypass");
        startInfo.ArgumentList.Add("-Command");
        startInfo.ArgumentList.Add($"Remove-Item -LiteralPath {QuoteForPowerShell(remoteResultPath)} -Force -ErrorAction SilentlyContinue");

        await ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
    }

    private string BuildLocalResultPath(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments, DateTime startedUtc)
    {
        var workspaceRoot = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "..", ".."));
        var scannerName = ExtractScannerName(scriptPath);
        var targetIdentifier = SanitizeFileName(ExtractTargetIdentifier(arguments));
        var resultDirectory = Path.Combine(workspaceRoot, $"{scannerName}_Results");
        var fileName = $"{startedUtc:yyyyMMdd_HHmmss_fff}_{targetIdentifier}.json";
        return Path.Combine(resultDirectory, fileName);
    }

    private static IReadOnlyCollection<string> BuildLocalArguments(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments)
    {
        var commandArguments = new List<string>
        {
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            scriptPath
        };

        AppendScriptArguments(commandArguments, arguments);
        return commandArguments;
    }

    private static IReadOnlyCollection<string> BuildRemoteArguments(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments)
    {
        var remoteScript = BuildRemoteScript(scriptPath, arguments);
        var encodedCommand = Convert.ToBase64String(Encoding.Unicode.GetBytes(remoteScript));

        return
        [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            encodedCommand
        ];
    }

    private static void AppendScriptArguments(List<string> commandArguments, IReadOnlyCollection<PowerShellArgument> arguments)
    {
        foreach (var argument in arguments)
        {
            commandArguments.Add($"-{argument.Name}");

            if (!argument.IsSwitch)
            {
                commandArguments.Add(argument.Value ?? string.Empty);
            }
        }
    }

    private static string BuildRemoteScript(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments)
    {
        var builder = new StringBuilder();
        builder.Append("$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; ");
        builder.Append("$resultDirectory = Join-Path $env:TEMP 'ioc-manager-results'; ");
        builder.Append("New-Item -ItemType Directory -Force -Path $resultDirectory | Out-Null; ");
        builder.Append("$resultFile = Join-Path $resultDirectory ('scan_' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '_' + [Guid]::NewGuid().ToString('N') + '.json'); ");
        builder.Append("$commandArgs = @(");
        builder.Append(QuoteForPowerShell("-NoLogo"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell("-NoProfile"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell("-NonInteractive"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell("-ExecutionPolicy"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell("Bypass"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell("-File"));
        builder.Append(", ");
        builder.Append(QuoteForPowerShell(scriptPath));

        foreach (var argument in arguments)
        {
            builder.Append(", ");
            builder.Append(QuoteForPowerShell($"-{argument.Name}"));

            if (!argument.IsSwitch)
            {
                builder.Append(", ");
                builder.Append(QuoteForPowerShell(argument.Value ?? string.Empty));
            }
        }

        builder.Append("); ");
        builder.Append("& powershell.exe @commandArgs 1> $resultFile 2>&1; ");
        builder.Append("$exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }; ");
        builder.Append("[Console]::Out.Write($resultFile); ");
        builder.Append("exit $exitCode");
        return builder.ToString();
    }

    private static string ExtractRemoteResultPath(string standardOutput)
    {
        if (string.IsNullOrWhiteSpace(standardOutput))
        {
            return string.Empty;
        }

        var sanitized = ControlCharacterRegex().Replace(standardOutput, string.Empty);
        var tempMatch = RemoteTempResultPathRegex().Match(sanitized);
        if (tempMatch.Success)
        {
            return tempMatch.Value;
        }

        var fallbackMatches = RemoteWindowsPathRegex().Matches(sanitized);
        return fallbackMatches.Count > 0
            ? fallbackMatches[^1].Value
            : string.Empty;
    }

    private static string ExtractScannerName(string scriptPath)
    {
        var fileName = Path.GetFileNameWithoutExtension(scriptPath);
        if (fileName.StartsWith("Invoke-", StringComparison.OrdinalIgnoreCase))
        {
            fileName = fileName["Invoke-".Length..];
        }

        if (fileName.EndsWith("Scan", StringComparison.OrdinalIgnoreCase))
        {
            fileName = fileName[..^"Scan".Length];
        }

        return fileName.ToUpperInvariant();
    }

    private static string ExtractTargetIdentifier(IReadOnlyCollection<PowerShellArgument> arguments)
    {
        var target = arguments.FirstOrDefault(argument => string.Equals(argument.Name, "Target", StringComparison.OrdinalIgnoreCase))?.Value
            ?? arguments.FirstOrDefault(argument => string.Equals(argument.Name, "IP", StringComparison.OrdinalIgnoreCase))?.Value
            ?? "unknown-target";

        return target.Replace(':', '_').Replace('\\', '_').Replace('/', '_');
    }

    private static string ConvertWindowsPathToScp(string path)
    {
        var normalized = path.Replace('\\', '/');
        return normalized.Length >= 2 && normalized[1] == ':'
            ? $"/{char.ToUpperInvariant(normalized[0])}:{normalized[2..]}"
            : normalized;
    }

    private static string SanitizeFileName(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(value.Length);

        foreach (var ch in value)
        {
            builder.Append(invalidChars.Contains(ch) ? '_' : ch);
        }

        return builder.ToString();
    }

    private static string QuoteForPowerShell(string value) =>
        $"'{value.Replace("'", "''")}'";

    [GeneratedRegex(@"[^\x20-\x7E]+", RegexOptions.Compiled)]
    private static partial Regex ControlCharacterRegex();

    [GeneratedRegex(@"[A-Za-z]:\\Users\\[^\\\r\n]+\\AppData\\Local\\Temp\\ioc-manager-results\\[^\\\r\n]+\.json", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex RemoteTempResultPathRegex();

    [GeneratedRegex(@"[A-Za-z]:\\[^\r\n]+?\.json", RegexOptions.Compiled)]
    private static partial Regex RemoteWindowsPathRegex();
}
