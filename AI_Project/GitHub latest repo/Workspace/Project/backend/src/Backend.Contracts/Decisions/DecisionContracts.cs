namespace Backend.Contracts.Decisions;

public sealed record CreateDecisionRequest(
    Guid CaseId,
    string RecommendedAction,
    string ApprovalTierRequired,
    string PolicyVersion,
    string ModelVersion,
    string Reasoning,
    string ActorUserId);

public sealed record FinalizeDecisionRequest(string Outcome, string ActorUserId);

public sealed record DecisionResponse(
    Guid Id,
    Guid CaseId,
    string State,
    string RecommendedAction,
    string ApprovalTierRequired,
    string PolicyVersion,
    string ModelVersion,
    string Reasoning,
    string? ApprovedByUserId,
    DateTimeOffset? ApprovedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
