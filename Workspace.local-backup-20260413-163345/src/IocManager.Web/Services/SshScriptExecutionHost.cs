using System.Diagnostics;
using IocVmwareIngestion.Api.Options;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Services;

public sealed class SshScriptExecutionHost(IOptions<PowerShellSettings> settings) : IScriptExecutionHost
{
    private readonly PowerShellSettings _settings = settings.Value;

    public bool CanExecuteRemotely => _settings.RemoteExecution.Enabled;

    public Task<ScriptExecutionResult> ExecuteAsync(string executablePath, IReadOnlyCollection<string> arguments, CancellationToken cancellationToken)
    {
        var remote = _settings.RemoteExecution;
        if (string.IsNullOrWhiteSpace(remote.Host) || string.IsNullOrWhiteSpace(remote.User))
        {
            throw new InvalidOperationException("PowerShell:RemoteExecution requires Host and User when Enabled is true.");
        }

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

        startInfo.ArgumentList.Add("-tt");
        startInfo.ArgumentList.Add("-o");
        startInfo.ArgumentList.Add("BatchMode=yes");

        if (_settings.AcceptNewHostKey)
        {
            startInfo.ArgumentList.Add("-o");
            startInfo.ArgumentList.Add("StrictHostKeyChecking=accept-new");
        }

        startInfo.ArgumentList.Add($"{remote.User}@{remote.Host}");
        startInfo.ArgumentList.Add(executablePath);

        foreach (var argument in arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }

        return ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
    }
}
