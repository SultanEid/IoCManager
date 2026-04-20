namespace Backend.Api.Infrastructure;

public sealed class ScanExecutionOptions
{
    public const string SectionName = "Infrastructure:Scanning";

    public int SchedulerIntervalSeconds { get; init; } = 15;
    public int HttpTimeoutSeconds { get; init; } = 30;
    public string AgentEndpointPath { get; init; } = "/api/v1/scans/execute";
    public int MaxRawOutputChars { get; init; } = 16000;
    public int MaxResultFiles { get; init; } = 32;
    public int MaxFindings { get; init; } = 256;
    public string WorkerActorUserId { get; init; } = "system-scan-worker";
    public bool PreferScripts { get; init; } = true;
    public bool AllowConnectorFallback { get; init; } = true;
    public string PowerShellExecutable { get; init; } = "powershell.exe";
    public bool AcceptNewHostKey { get; init; } = true;
    public int DefaultSigmaMinutesBack { get; init; } = 60;
    public string? SigmaCustomRulesDirectory { get; init; } = "C:/Tools/Sigma/custom_rules";
    public Dictionary<string, string> Scripts { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
