namespace IocVmwareIngestion.Api.Services;

public interface IPowerShellScriptRunner
{
    Task<ScriptExecutionResult> ExecuteAsync(string scriptPath, IReadOnlyCollection<PowerShellArgument> arguments, CancellationToken cancellationToken);
}

public sealed record PowerShellArgument(string Name, string? Value = null, bool IsSwitch = false);

public sealed record ScriptExecutionResult(
    string CommandLine,
    string StandardOutput,
    string StandardError,
    int ExitCode,
    DateTime StartedUtc,
    DateTime CompletedUtc,
    string? LocalResultFilePath = null);
