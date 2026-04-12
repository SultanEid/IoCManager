namespace Backend.Contracts.RuleLifecycle;

public sealed record CreateRuleProposalRequest(
    Guid CaseId,
    string ProposalName,
    string RuleFamily,
    string RuleBody,
    string ProposedVersion,
    string ProposedByUserId,
    string Rationale,
    decimal? PolicyRiskScore);

public sealed record ReviewRuleProposalRequest(
    string Decision,
    string ReviewerUserId,
    string ReviewReason,
    string? OverrideReason);

public sealed record SimulateRuleProposalRequest(
    string TargetEnvironment,
    string ActorUserId,
    string? Notes);

public sealed record AdvanceRolloutStageRequest(
    string Stage,
    string ActorUserId,
    string Reason,
    string? OverrideReason);

public sealed record RecordCanaryObservationRequest(
    decimal ObservedNoise,
    int AnalystAcceptedCount,
    int AnalystReviewedCount,
    string ActorUserId);

public sealed record TriggerRollbackRequest(
    string ActorUserId,
    string Reason,
    decimal? ObservedNoise);

public sealed record RuleProposalResponse(
    Guid Id,
    Guid CaseId,
    string ProposalName,
    string RuleFamily,
    string RuleBody,
    string ProposedVersion,
    string ProposedByUserId,
    string Rationale,
    decimal PolicyRiskScore,
    string Status,
    string? ReviewedByUserId,
    DateTimeOffset? ReviewedAtUtc,
    string? ReviewReason,
    string? OverrideReason,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record DeploymentRecommendationResponse(
    Guid Id,
    Guid CaseId,
    Guid RuleProposalId,
    string TargetEnvironment,
    string RecommendedStage,
    decimal RiskScore,
    decimal PredictedNoise,
    decimal BaselineNoise,
    decimal PredictedNoiseDelta,
    decimal AnalystAcceptanceRate,
    bool RequiresHumanApproval,
    bool AutoPublishEnabled,
    string RequestedByUserId,
    string Rationale,
    DateTimeOffset RecommendedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RolloutPlanResponse(
    Guid Id,
    Guid CaseId,
    Guid RuleProposalId,
    Guid DeploymentRecommendationId,
    string CurrentStage,
    int CanaryTrafficPercent,
    decimal PredictedNoise,
    decimal? ObservedNoise,
    decimal? ObservedNoiseDelta,
    decimal AnalystAcceptanceRate,
    bool RequiresManualPromotion,
    DateTimeOffset ShadowStartedAtUtc,
    DateTimeOffset? CanaryStartedAtUtc,
    DateTimeOffset? PromotedAtUtc,
    DateTimeOffset? RolledBackAtUtc,
    string? LastStageReason,
    string? LastOverrideReason,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RollbackPlanResponse(
    Guid Id,
    Guid CaseId,
    Guid RuleProposalId,
    Guid RolloutPlanId,
    string TriggerCondition,
    string RecoveryPlaybook,
    decimal PredictedNoiseThreshold,
    decimal? LastObservedNoise,
    bool TriggerConditionMet,
    bool IsTriggered,
    string? TriggeredByUserId,
    DateTimeOffset? TriggeredAtUtc,
    string? TriggerReason,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RuleSimulationResultResponse(
    RuleProposalResponse Proposal,
    DeploymentRecommendationResponse Recommendation,
    RolloutPlanResponse RolloutPlan,
    RollbackPlanResponse RollbackPlan);

public sealed record CaseRuleWorkflowResponse(
    Guid CaseId,
    IReadOnlyList<RuleProposalResponse> Proposals,
    IReadOnlyList<DeploymentRecommendationResponse> Recommendations,
    IReadOnlyList<RolloutPlanResponse> RolloutPlans,
    IReadOnlyList<RollbackPlanResponse> RollbackPlans,
    decimal AnalystAcceptanceRate);
