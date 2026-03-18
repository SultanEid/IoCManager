using System.Diagnostics;
using IocVmwareIngestion.Api.Options;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Services;

public sealed class LocalScriptExecutionHost(IOptions<PowerShellSettings> settings) : IScriptExecutionHost
{
    private readonly PowerShellSettings _settings = settings.Value;

    public bool CanExecuteRemotely => false;

    public Task<ScriptExecutionResult> ExecuteAsync(string executablePath, IReadOnlyCollection<string> arguments, CancellationToken cancellationToken)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = executablePath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        foreach (var argument in arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }

        return ProcessExecutionHelper.RunAsync(startInfo, cancellationToken);
    }
}
