namespace Backend.Contracts.V2;

public sealed record LegacyPipelineNetworkResponse(
    string Id,
    string Name,
    string CidrBlock,
    string? SshUser,
    string? SshKeyPath,
    bool HasSshPassword,
    string? Notes,
    int TotalTargets,
    int OnlineTargets,
    DateTimeOffset? LastSweepAtUtc);

public sealed record CreateLegacyPipelineNetworkRequest(
    string Name,
    string CidrBlock,
    string? SshUser,
    string? SshKeyPath,
    string? SshPassword,
    bool ClearSshPassword,
    string? Notes);

public sealed record UpdateLegacyPipelineNetworkRequest(
    string Name,
    string CidrBlock,
    string? SshUser,
    string? SshKeyPath,
    string? SshPassword,
    bool ClearSshPassword,
    string? Notes);

public sealed record LegacyPipelineNetworkDeletionResponse(
    string NetworkId,
    string NetworkName,
    int DeletedTargets,
    bool Forced,
    int DeletedPlans,
    int DeletedJobs,
    int DetachedResults,
    int DetachedReports);

public sealed record LegacyPipelineNetworkDeletionBlockerResponse(
    string Category,
    int Count,
    string Message);

public sealed record LegacyPipelineNetworkDeletionBlockedResponse(
    string Title,
    string Detail,
    int Status,
    string NetworkId,
    string NetworkName,
    int TargetCount,
    IReadOnlyList<LegacyPipelineNetworkDeletionBlockerResponse> Blockers);

public sealed record LegacyPipelineDiscoveryRequest(
    string ActorUserId,
    string? RangeStartIp,
    string? RangeEndIp);

public sealed record LegacyPipelineDiscoveryResponse(
    string NetworkId,
    string NetworkName,
    string RequestedCidr,
    int TotalHosts,
    int ReachableHosts,
    int OfflineHosts,
    DateTimeOffset DiscoveredAtUtc);

public sealed record LegacyPipelineTargetResponse(
    string Id,
    string NetworkId,
    string NetworkName,
    string? DisplayName,
    string? Hostname,
    string IpAddress,
    string Status,
    string? TargetOsType,
    DateTimeOffset? LastSweepAtUtc);

public sealed record UpdateLegacyPipelineTargetRequest(string? DisplayName);

public sealed record LegacyPipelineRulePresetResponse(
    string ScannerFamily,
    IReadOnlyList<string> Paths);

public sealed record LegacyPipelineScanPlanRequest(
    string Name,
    string ScannerFamily,
    string Status,
    string ScheduleType,
    string? RulePath,
    string? RulePathPreset,
    string? Notes,
    string ActorUserId,
    IReadOnlyList<string> NetworkIds,
    IReadOnlyList<string> TargetIds,
    Dictionary<string, string?>? Schedule,
    Dictionary<string, string?>? Options);

public sealed record LegacyPipelineScanPlanResponse(
    string Id,
    string Name,
    string ScannerFamily,
    string Status,
    string ScheduleType,
    string? RulePath,
    string? Notes,
    IReadOnlyList<string> NetworkIds,
    IReadOnlyList<string> TargetIds,
    IReadOnlyList<string> NetworkNames,
    IReadOnlyList<string> TargetDisplayNames,
    Dictionary<string, string?> Schedule,
    Dictionary<string, string?> Options,
    DateTimeOffset? NextRunAtUtc,
    DateTimeOffset? LastRunAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record LegacyPipelineScanPlanRunRequest(string ActorUserId);

public sealed record LegacyPipelineCustomScanRequest(
    string ActorUserId,
    IReadOnlyList<string> ScannerFamilies,
    string RuleInputMode,
    string? RulePath,
    IReadOnlyList<string> NetworkIds,
    IReadOnlyList<string> TargetIds,
    Dictionary<string, string?>? Options,
    Dictionary<string, string>? TargetOsOverrides);

public sealed record LegacyPipelineCustomScanResponse(
    string BatchId,
    IReadOnlyList<LegacyPipelineScanJobResponse> Jobs);

public sealed record LegacyPipelineScanJobResponse(
    string Id,
    string? ScanPlanId,
    string ScannerFamily,
    string? ExecutionMode,
    string TriggerType,
    string Status,
    string Summary,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? FinishedAtUtc,
    string? BatchId,
    int TotalTargets,
    int CompletedTargets,
    int FailedTargets,
    int NoFindingsTargets);

public sealed record LegacyPipelineScanResultResponse(
    string Id,
    string? JobId,
    string? TargetId,
    string TargetDisplay,
    string ScannerFamily,
    string Status,
    int FindingsCount,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? FinishedAtUtc);

public sealed record LegacyPipelineReportSectionMetricResponse(
    string Label,
    string Value,
    string Detail);

public sealed record LegacyPipelineReportSectionResponse(
    string Title,
    string Summary,
    IReadOnlyList<LegacyPipelineReportSectionMetricResponse> Metrics,
    IReadOnlyList<string> Highlights);

public sealed record LegacyPipelineGeneratedReportResponse(
    string Title,
    string ReportType,
    string Scope,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<LegacyPipelineReportSectionResponse> Sections,
    LegacyPipelineReportRecordResponse? PersistedReport);

public sealed record LegacyPipelineReportRecordResponse(
    string Id,
    string Title,
    string ReportType,
    string Scope,
    DateTimeOffset CreatedAtUtc,
    string? FileExtension,
    string? DownloadPath,
    string Status);

public sealed record LegacyPipelineGenerateReportRequest(
    string ReportType,
    string? Title,
    string? JobId,
    string? TargetId,
    string? NetworkId,
    string? FromUtc,
    string? ToUtc,
    string? ScannerFamily,
    string? Severity,
    string? Status,
    bool Persist,
    string ActorUserId);
