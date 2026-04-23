namespace Backend.Application.Abstractions.Integrations;

public interface IAiScanAnalystClient
{
    Task<AiScanAnalystRecommendationResult> RecommendAsync(AiScanAnalystContextRequest request, CancellationToken cancellationToken);
}

public sealed record AiScanAnalystContextRequest(
    string Objective,
    string Action,
    string? PreferredScannerCapability,
    int MaxTargetCount,
    AiScanAnalystFocusSubnetContext? FocusSubnet,
    IReadOnlyList<AiScanAnalystDiscoveryRunContext> DiscoveryRuns,
    IReadOnlyList<AiScanAnalystDiscoveredHostContext> DiscoveredHosts,
    IReadOnlyList<AiScanAnalystManagedServerContext> ManagedServers,
    IReadOnlyList<AiScanAnalystRuleContext> CandidateRules,
    IReadOnlyList<AiScanAnalystPlanContext> ExistingPlans,
    IReadOnlyList<AiScanAnalystJobContext> RecentJobs);

public sealed record AiScanAnalystFocusSubnetContext(
    Guid SubnetId,
    string Name,
    string CidrBlock);

public sealed record AiScanAnalystDiscoveryRunContext(
    Guid DiscoveryRunId,
    Guid SubnetId,
    string RequestedCidr,
    string Status,
    int TotalHosts,
    int ReachableHosts,
    int UnreachableHosts,
    string Summary,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record AiScanAnalystDiscoveredHostContext(
    Guid DiscoveredHostId,
    Guid SubnetId,
    string IpAddress,
    string Hostname,
    string Reachability,
    bool AlreadyPromoted,
    DateTimeOffset LastCheckedAtUtc);

public sealed record AiScanAnalystManagedServerContext(
    Guid TargetServerId,
    Guid SubnetId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string Status,
    string ConnectivityStatus,
    IReadOnlyList<string> ScannerCapabilities,
    DateTimeOffset? LastContactUtc);

public sealed record AiScanAnalystRuleContext(
    Guid RuleRevisionId,
    Guid RuleArtifactId,
    string RuleName,
    string RuleFamily,
    int RevisionNumber,
    string VersionLabel,
    string LifecycleStatus,
    string ScopeType,
    string? ScopeValue,
    string Description);

public sealed record AiScanAnalystPlanContext(
    Guid ScanPlanId,
    string Name,
    string ScannerCapability,
    string Status,
    string RuleSelectionMode,
    int TargetCount,
    int RuleCount,
    string? LastResultStatus,
    DateTimeOffset UpdatedAtUtc);

public sealed record AiScanAnalystJobContext(
    Guid ScanJobId,
    Guid? ScanPlanId,
    string TriggerSource,
    string Status,
    int TotalTargets,
    int CompletedTargets,
    int FailedTargets,
    int DetectionCount,
    string Summary,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record AiScanAnalystRecommendationResult(
    string Summary,
    IReadOnlyList<string> Observations,
    IReadOnlyList<string> Reasoning,
    IReadOnlyList<string> ValidationWarnings,
    string RecommendedScannerCapability,
    AiScanAnalystPlanProposal Proposal);

public sealed record AiScanAnalystPlanProposal(
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
    IReadOnlyList<AiScanAnalystTargetRecommendation> Targets,
    IReadOnlyList<AiScanAnalystRuleRecommendation> Rules);

public sealed record AiScanAnalystTargetRecommendation(
    Guid TargetServerId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string Status,
    string ConnectivityStatus,
    IReadOnlyList<string> ScannerCapabilities,
    string Reason);

public sealed record AiScanAnalystRuleRecommendation(
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
