namespace Backend.Contracts.CtiPolicy;

public sealed record EvaluateCtiPolicyRequest(
    Guid CaseId,
    decimal MaliciousnessScore,
    decimal ActionabilityScore,
    decimal DeployabilityScore,
    decimal DecayScore,
    decimal UncertaintyScore,
    decimal BlastRadiusScore,
    string AssetCriticality,
    string EvidenceFreshness,
    decimal SourceTrust,
    string EvidenceConflict,
    string CurrentRolloutStage,
    string ActorUserId);

public sealed record CtiPolicyEvaluationResponse(
    string DecisionState,
    string RecommendedAction,
    string ApprovalTierRequired,
    string RolloutMode,
    string RollbackRequirement,
    string RollbackTriggerCondition,
    string RollbackPlaybookReference,
    int RollbackRecoveryWindowMinutes,
    string NextBestEvidenceType,
    string NextBestEvidenceRequest,
    string NextBestEvidenceRationale,
    DateTimeOffset ExpiryUtc,
    IReadOnlyList<string> GuardrailNotes,
    string PolicyVersion,
    string RecommendationSummary);
