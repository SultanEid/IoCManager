namespace IocVmwareIngestion.Api.Services;

public interface IScriptExecutionHost
{
    bool CanExecuteRemotely { get; }
    Task<ScriptExecutionResult> ExecuteAsync(string executablePath, IReadOnlyCollection<string> arguments, CancellationToken cancellationToken);
}
