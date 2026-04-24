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
    IReadOnlyList<string> ScannerFamilies,
    string Status,
    string ScheduleType,
    Dictionary<string, string?> RulePathsByFamily,
    string? Notes,
    string ActorUserId,
    IReadOnlyList<string> NetworkIds,
    IReadOnlyList<string> TargetIds,
    Dictionary<string, string?>? Schedule,
    Dictionary<string, string?>? Options);

public sealed record LegacyPipelineScanPlanResponse(
    string Id,
    string Name,
    IReadOnlyList<string> ScannerFamilies,
    string Status,
    string ScheduleType,
    Dictionary<string, string?> RulePathsByFamily,
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

public sealed record LegacyPipelineScanPlanRunResponse(
    string BatchId,
    string PlanId,
    IReadOnlyList<LegacyPipelineScanJobResponse> Jobs);

public sealed record LegacyPipelineScanPlanDeletionResponse(
    string PlanId,
    string PlanName,
    int DetachedJobs);

public sealed record LegacyPipelineCustomScanRequest(
    string ActorUserId,
    IReadOnlyList<string> ScannerFamilies,
    string RuleInputMode,
    string? RulePath,
    Dictionary<string, string?>? RulePathsByFamily,
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

public sealed record LegacyPipelineIocFindingResponse(
    string IocId,
    string ScannerFamily,
    string? TargetId,
    string TargetDisplay,
    string? TargetIp,
    string? TargetOsType,
    string? JobId,
    string? ScanPlanId,
    string RuleName,
    string IndicatorValue,
    string IndicatorKind,
    string PainLevel,
    string Severity,
    DateTimeOffset TimestampUtc,
    string? RawPayload,
    string Status);

public sealed record LegacyPipelineIocFindingListResponse(
    IReadOnlyList<LegacyPipelineIocFindingResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    IReadOnlyList<string> AvailableSeverities);

public sealed record LegacyPipelineIocFindingTargetResponse(
    string? Id,
    string Display,
    string? Hostname,
    string? IpAddress,
    string? Status,
    string? TargetOsType);

public sealed record LegacyPipelineIocFindingScanResponse(
    string? JobId,
    string? ScanPlanId,
    string ScannerFamily,
    string? ExecutionMode,
    string? TriggerType,
    string Status,
    DateTimeOffset? QueuedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? FinishedAtUtc);

public sealed record LegacyPipelineIocFindingYaraDetailResponse(
    string? FilePath,
    string? FileHash);

public sealed record LegacyPipelineIocFindingSigmaDetailResponse(
    string? LogSource,
    string? Severity,
    string? CommandLine);

public sealed record LegacyPipelineIocFindingNetworkDetailResponse(
    string? SourceIp,
    string? DestIp,
    string? Protocol,
    string? Severity,
    long? FlowId);

public sealed record LegacyPipelineIocFindingDetailResponse(
    string IocId,
    string ScannerFamily,
    string? TargetId,
    string TargetDisplay,
    string? TargetIp,
    string? TargetOsType,
    string? JobId,
    string? ScanPlanId,
    string RuleName,
    string IndicatorValue,
    string IndicatorKind,
    string PainLevel,
    string Severity,
    DateTimeOffset TimestampUtc,
    string? RawPayload,
    string Status,
    LegacyPipelineIocFindingTargetResponse? Target,
    LegacyPipelineIocFindingScanResponse? RelatedScan,
    LegacyPipelineIocFindingYaraDetailResponse? YaraDetail,
    LegacyPipelineIocFindingSigmaDetailResponse? SigmaDetail,
    LegacyPipelineIocFindingNetworkDetailResponse? NetworkDetail);

public sealed record LegacyPipelinePainLevelResponse(
    string Level,
    string Label,
    int Count,
    double Share,
    IReadOnlyList<LegacyPipelineIocFindingResponse> PreviewIocs);

public sealed record LegacyPipelinePainTrendPointResponse(
    DateTimeOffset BucketStartUtc,
    Dictionary<string, int> CountsByLevel);

public sealed record LegacyPipelinePainAnalysisResponse(
    DateTimeOffset FromUtc,
    DateTimeOffset ToUtc,
    int TotalCount,
    IReadOnlyList<LegacyPipelinePainLevelResponse> Levels,
    IReadOnlyList<LegacyPipelinePainTrendPointResponse> Trend);

public sealed record LegacyPipelineOverviewSummaryResponse(
    int TargetCount,
    int IocCount,
    int ReportCount,
    int AlertCount);

public sealed record LegacyPipelineReportSectionMetricResponse(
    string Label,
    string Value,
    string Detail);

public sealed record LegacyPipelineReportSectionResponse(
    string Title,
    string Summary,
    IReadOnlyList<LegacyPipelineReportSectionMetricResponse> Metrics,
    IReadOnlyList<string> Highlights);

public sealed record LegacyPipelineReportQueryResponse(
    string? JobId,
    string? TargetId,
    string? NetworkId,
    string? ScannerFamily,
    string? FromUtc,
    string? ToUtc,
    string? Severity,
    string? Status);

public sealed record LegacyPipelineGeneratedReportResponse(
    string Title,
    string ReportType,
    string Scope,
    DateTimeOffset GeneratedAtUtc,
    LegacyPipelineReportQueryResponse Query,
    IReadOnlyList<LegacyPipelineReportSectionResponse> Sections,
    LegacyPipelineReportRecordResponse? PersistedReport);

public sealed record LegacyPipelineReportRecordResponse(
    string Id,
    string Title,
    string ReportType,
    string Scope,
    DateTimeOffset CreatedAtUtc,
    string? PdfDownloadPath,
    string? CsvDownloadPath,
    string Status);

public sealed record LegacyPipelineReportDetailResponse(
    string Id,
    string Title,
    string ReportType,
    string Scope,
    DateTimeOffset CreatedAtUtc,
    LegacyPipelineReportQueryResponse Query,
    IReadOnlyList<LegacyPipelineReportSectionResponse> Sections,
    string? PdfDownloadPath,
    string? CsvDownloadPath,
    string Status);

public sealed record LegacyPipelineReportDeletionResponse(
    string Id,
    string Title,
    int DeletedFiles);

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
