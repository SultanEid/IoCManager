namespace Backend.Contracts.V2;

public sealed record ScanAnalystRequestDto(
    string Objective,
    string ActorUserId,
    string Action,
    Guid? SubnetId,
    string? PreferredScannerCapability,
    int? MaxTargetCount);

public sealed record ScanAnalystResponseDto(
    string Action,
    string OperatingMode,
    string Summary,
    IReadOnlyList<string> Observations,
    IReadOnlyList<string> Reasoning,
    IReadOnlyList<string> ValidationWarnings,
    string RecommendedScannerCapability,
    ScanAnalystContextSummaryDto ContextSummary,
    ScanAnalystPlanProposalDto ProposedPlan,
    ScanPlanResponse? CreatedPlan,
    ScanJobResponse? QueuedJob,
    ScanAnalystRunSummaryDto? RunSummary);

public sealed record ScanAnalystChatRequestDto(
    Guid? SessionId,
    string ActorUserId,
    string Message,
    string Action,
    Guid? SubnetId,
    string? PreferredScannerCapability,
    int? MaxTargetCount,
    ScanAnalystPlanProposalDto? EditedPlan,
    IReadOnlyList<string>? SimulatedConditions);

public sealed record ScanAnalystChatResponseDto(
    Guid SessionId,
    string AgentStatusLine,
    string OperatingMode,
    bool DatabaseAvailable,
    IReadOnlyList<string> ActiveMockConditions,
    IReadOnlyList<ScanAnalystAgentMessageDto> Messages,
    ScanAnalystResponseDto LatestAnalysis,
    ScanAnalystRunSummaryDto? LatestRunSummary);

public sealed record ScanAnalystAgentMessageDto(
    string Role,
    string Content,
    DateTimeOffset TimestampUtc);

public sealed record ScanAnalystAgentStatusDto(
    bool AgentEnabled,
    bool AutonomyEnabled,
    bool DatabaseAvailable,
    string OperatingMode,
    string IndicatorLabel,
    string? DegradedReason,
    int ActiveSessionCount,
    IReadOnlyList<string> AvailableMockConditions,
    IReadOnlyList<string> ActiveMockConditions,
    ScanAnalystAgentParametersDto Parameters,
    ScanAnalystAutonomousActivityDto? LastAutonomousActivity);

public sealed record ScanAnalystAgentParametersDto(
    bool Enabled,
    IReadOnlyList<string> AllowedSubnets,
    IReadOnlyList<string> AllowedEnvironments,
    int MaxTargetsPerRun,
    string PreferredScannerFamily,
    bool AutoRun,
    string QuietHours,
    bool WatchForNewHosts,
    bool WatchForFailedRecentJobs,
    bool RequireMatchingRuleFamily);

public sealed record ScanAnalystAutonomousActivityDto(
    string Summary,
    string Trigger,
    string Action,
    string OperatingMode,
    DateTimeOffset OccurredAtUtc);

public sealed record ScanAnalystContextSummaryDto(
    Guid? FocusSubnetId,
    string? FocusSubnetName,
    int DiscoveryRunCount,
    int DiscoveredHostCount,
    int ManagedServerCount,
    int CandidateRuleCount,
    int ExistingPlanCount,
    int RecentJobCount);

public sealed record ScanAnalystPlanProposalDto(
    string Name,
    string Description,
    string ScannerCapability,
    string RuleSelectionMode,
    string? RuleScopeType,
    string? RuleScopeValue,
    string CadenceType,
    int? IntervalMinutes,
    int? RunAtHourUtc,
    int? RunAtMinuteUtc,
    int? WeeklyDayOfWeek,
    string OperatorNotes,
    string Status,
    IReadOnlyList<Guid> TargetServerIds,
    IReadOnlyList<Guid> RuleRevisionIds,
    IReadOnlyList<ScanAnalystTargetProposalDto> Targets,
    IReadOnlyList<ScanAnalystRuleProposalDto> Rules);

public sealed record ScanAnalystTargetProposalDto(
    Guid TargetServerId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string Status,
    string ConnectivityStatus,
    IReadOnlyList<string> ScannerCapabilities,
    string Reason);

public sealed record ScanAnalystRuleProposalDto(
    Guid RuleRevisionId,
    Guid RuleArtifactId,
    string RuleName,
    string RuleFamily,
    int RevisionNumber,
    string VersionLabel,
    string LifecycleStatus,
    string ScopeType,
    string? ScopeValue,
    string Reason);

public sealed record ScanAnalystRunSummaryDto(
    Guid? ScanJobId,
    bool IsSimulated,
    string NarrativeSummary,
    string JobStatus,
    int TotalTargets,
    int CompletedTargets,
    int FailedTargets,
    int DetectionCount,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<ScanAnalystRunTargetExecutionDto> TargetExecutions,
    IReadOnlyList<ScanAnalystRunDetectionDto> Detections);

public sealed record ScanAnalystRunTargetExecutionDto(
    string TargetHostname,
    string TargetIpAddress,
    string Status,
    string Summary,
    string? ErrorMessage);

public sealed record ScanAnalystRunDetectionDto(
    Guid DetectionId,
    string RuleName,
    string ServerHostname,
    string Disposition,
    DateTimeOffset ObservedAtUtc);
