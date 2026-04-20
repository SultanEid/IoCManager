namespace Backend.Contracts.Rules;

public sealed record CreateRuleRequest(
    Guid CaseId,
    string Name,
    string RuleFamily,
    string RuleBody,
    string Version,
    string ActorUserId,
    string? SourceOfOrigin = null,
    string? AuthorUserId = null,
    string? ReviewerUserId = null,
    IReadOnlyList<string>? LinkedAttackTechniques = null,
    string? LinkedCampaign = null,
    string? LinkedMalwareFamily = null,
    decimal? PredictedCoverage = null,
    decimal? PredictedFalsePositiveRisk = null,
    string? BlastRadius = null);

public sealed record UpdateRuleRequest(
    string Name,
    string RuleFamily,
    string RuleBody,
    string Version,
    string ActorUserId,
    string? SourceOfOrigin = null,
    string? AuthorUserId = null,
    string? ReviewerUserId = null,
    IReadOnlyList<string>? LinkedAttackTechniques = null,
    string? LinkedCampaign = null,
    string? LinkedMalwareFamily = null,
    decimal? PredictedCoverage = null,
    decimal? PredictedFalsePositiveRisk = null,
    string? BlastRadius = null,
    string? ChangeReason = null);

public sealed record UpdateRuleStatusRequest(string Status, string ActorUserId, string? Reason = null);

public sealed record ReviewRuleRequest(
    string Decision,
    string ReviewerUserId,
    string ActorUserId,
    string? Reason = null);

public sealed record ValidateRuleRequest(string ActorUserId, bool PersistResult = true);

public sealed record RecordRuleHitRequest(DateTimeOffset LastUsefulHitAtUtc, string ActorUserId);

public sealed record RuleOverlapResponse(Guid RuleId, decimal SimilarityScore);

public sealed record RuleRevisionResponse(
    Guid Id,
    Guid RuleId,
    Guid CaseId,
    int RevisionNumber,
    string ChangeType,
    string? ChangeReason,
    string Name,
    string RuleFamily,
    string RuleBody,
    string Version,
    string Status,
    string SourceOfOrigin,
    string AuthorUserId,
    string? ReviewerUserId,
    IReadOnlyList<string> LinkedAttackTechniques,
    string? LinkedCampaign,
    string? LinkedMalwareFamily,
    decimal PredictedCoverage,
    decimal PredictedFalsePositiveRisk,
    string BlastRadius,
    DateTimeOffset? LastUsefulHitAtUtc,
    DateTimeOffset? LastDeploymentAtUtc,
    DateTimeOffset CreatedAtUtc,
    string CreatedByUserId);

public sealed record RuleValidationIssueResponse(string Severity, string Message);

public sealed record RuleValidationResultResponse(
    Guid RuleId,
    bool IsValid,
    IReadOnlyList<RuleValidationIssueResponse> Issues,
    DateTimeOffset EvaluatedAtUtc);

public sealed record RuleResponse(
    Guid Id,
    Guid CaseId,
    string Name,
    string RuleFamily,
    string RuleBody,
    string Version,
    string Status,
    string SourceOfOrigin,
    string AuthorUserId,
    string? ReviewerUserId,
    IReadOnlyList<string> LinkedAttackTechniques,
    string? LinkedCampaign,
    string? LinkedMalwareFamily,
    decimal PredictedCoverage,
    decimal PredictedFalsePositiveRisk,
    string BlastRadius,
    DateTimeOffset? LastUsefulHitAtUtc,
    DateTimeOffset? LastDeploymentAtUtc,
    DateTimeOffset? LastParsedAtUtc,
    DateTimeOffset? LastValidatedAtUtc,
    bool? LastValidationPassed,
    string? LastValidationSummary,
    Guid? DuplicateOfRuleId,
    IReadOnlyList<RuleOverlapResponse> Overlaps,
    int RevisionCount,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
