namespace Backend.Api.Infrastructure;

public sealed class DiscoveryExecutionOptions
{
    public const string SectionName = "Infrastructure:Discovery";

    public int TimeoutMilliseconds { get; init; } = 750;
    public int MaxParallelism { get; init; } = 32;
    public int MaxHostsPerRun { get; init; } = 256;
    public int DnsLookupTimeoutMilliseconds { get; init; } = 2000;
    public int[] TcpProbePorts { get; init; } = [22, 135, 139, 445, 3389, 5985, 5986];
    public bool AllowNonPrivateRanges { get; init; }
    public bool UseScriptSweepWhenAvailable { get; init; }
    public string? SweepScriptPath { get; init; } = "scripts/SweepNetworkv2.ps1";
    public string PowerShellExecutable { get; init; } = "powershell.exe";
    public bool ScheduledLegacyNetworkSweepEnabled { get; init; } = true;
    public int ScheduledLegacyNetworkSweepIntervalMinutes { get; init; } = 2;
    public string ScheduledLegacyNetworkSweepActorUserId { get; init; } = "system-zira-discovery";
}
