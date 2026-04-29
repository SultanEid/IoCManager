using System.Text.Json;

namespace Backend.Contracts.V2;

public sealed record SubmitDecisionRequestDto(
    string CaseId,
    string DetectionId,
    string IocType,
    string IocValue,
    DateTimeOffset ObservedAtUtc,
    JsonElement DetectionPackage,
    string SubmittedByUserId);

public sealed record SubmitDecisionAcceptedDto(
    Guid DecisionId,
    string Status,
    DateTimeOffset SubmittedAtUtc,
    DecisionLinksDto Links);

public sealed record GenerateIocDecisionRequestDto(
    string SubmittedByUserId);

public sealed record DecisionLinksDto(
    string Result,
    string Explanation,
    string ActionPlan,
    string SimilarDetections,
    string EvidenceSources,
    string OverrideClosure);

public sealed record DecisionResultDto(
    Guid DecisionId,
    string Status,
    DateTimeOffset SubmittedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    string? FailureCode,
    string? FailureMessage,
    string? ModelVersion,
    string? DatasetVersion,
    DecisionDecisionDto? Decision,
    bool ExplanationAvailable,
    bool ActionPlanAvailable,
    bool SimilarDetectionsAvailable,
    bool EvidenceSourcesAvailable);

public sealed record IocLatestDecisionDto(
    Guid IocId,
    Guid? DetectionId,
    DecisionResultDto Result);

public sealed record AiModelStatisticsDto(
    string ModelId,
    string ModelVersion,
    string Status,
    string DatasetVersion,
    string ScoringProfileVersion,
    string FeatureSchemaVersion,
    DateTimeOffset? CreatedAtUtc,
    DateTimeOffset? PublishedAtUtc,
    DateTimeOffset? TrainingWindowStartUtc,
    DateTimeOffset? TrainingWindowEndUtc,
    DateTimeOffset? EvaluationWindowStartUtc,
    DateTimeOffset? EvaluationWindowEndUtc,
    string? DatasetManifestHash,
    IReadOnlyDictionary<string, decimal> Metrics,
    IReadOnlyDictionary<string, decimal> Thresholds,
    IReadOnlyDictionary<string, int> DatasetCounts,
    IReadOnlyList<string> RuntimeWarnings,
    string ReadinessStatus,
    string? Notes);

public sealed record DecisionDecisionDto(
    string Verdict,
    string Action,
    decimal Confidence,
    decimal FalsePositiveRisk,
    string ReviewPriority,
    bool ShouldPromoteToIndicator,
    bool ShouldSuppress,
    bool ShouldAllowlist,
    bool ShouldEscalate,
    IReadOnlyList<string> Reasons,
    IReadOnlyList<DecisionProvenanceDto> Provenance,
    IReadOnlyList<string> NextBestEvidence,
    string? AbstainReason,
    DateTimeOffset ScoredAtUtc,
    SafetyDiagnosticsDto? SafetyDiagnostics,
    JsonElement Raw);

public sealed record DecisionProvenanceDto(
    string Source,
    string Key,
    string Value,
    string? EvidenceId,
    string? CitationRef);

public sealed record SafetyDiagnosticsDto(
    bool AutoRemediationAllowed,
    bool WeakEvidence,
    bool ContradictoryEvidence,
    decimal ContradictionScore,
    IReadOnlyList<string> MissingCriticalFields,
    bool PartialEvidence,
    string EnrichmentStatus,
    decimal FalsePositiveRisk,
    bool SeverityCapApplied,
    string MaxRecommendationSeverity,
    IReadOnlyList<string> DegradationReasons);

public sealed record ExplanationDetailDto(
    Guid DecisionId,
    string Status,
    string? Summary,
    string? DecisionState,
    string? RecommendedAction,
    IReadOnlyList<string> Rationale,
    IReadOnlyList<ExplanationCitationDto> Citations,
    IReadOnlyList<string> NextBestEvidence,
    string? PolicyVersion,
    string? ModelVersion,
    string? DatasetVersion,
    DateTimeOffset? GeneratedAtUtc,
    JsonElement? Raw,
    PhrasingDiagnosticsDto? PhrasingDiagnostics);

public sealed record ExplanationCitationDto(
    string SourceId,
    string SourceType,
    string Snippet,
    string? SourceUri,
    int? StartOffset,
    int? EndOffset,
    decimal? Confidence);

public sealed record RecommendedActionPlanDto(
    Guid DecisionId,
    string Status,
    string? Summary,
    IReadOnlyList<RecommendedActionDto> RecommendedActions,
    IReadOnlyList<string> Prerequisites,
    IReadOnlyList<string> Cautions,
    bool? NeverAutoExecutes,
    bool? PolicyConstrained,
    bool? EvidenceBased,
    DateTimeOffset? GeneratedAtUtc,
    JsonElement? Raw,
    PhrasingDiagnosticsDto? PhrasingDiagnostics);

public sealed record PhrasingDiagnosticsDto(
    string Origin,
    string? Status,
    bool? Enabled,
    string? Provider,
    string? Model,
    JsonElement? Raw);

public sealed record RecommendedActionDto(
    string Action,
    int Rank,
    decimal Score,
    string Rationale,
    IReadOnlyList<string> Prerequisites,
    IReadOnlyList<string> Cautions,
    string EscalationTarget,
    string RequiredReviewerRole,
    bool RequiresHumanApproval,
    string ExecutionMode);

public sealed record OverrideOrClosureRequestDto(
    string ActionType,
    string Reason,
    string? Notes,
    string? OverrideVerdict,
    string? ClosureDisposition,
    bool? IsFinal,
    string SubmittedByUserId);

public sealed record OverrideOrClosureResponseDto(
    Guid DecisionId,
    Guid OverrideId,
    string ActionType,
    string PreviousStatus,
    string NewStatus,
    string Reason,
    string? Notes,
    string? OverrideVerdict,
    string? ClosureDisposition,
    bool IsFinal,
    string SubmittedByUserId,
    DateTimeOffset SubmittedAtUtc);

public sealed record SimilarDetectionsQueryDto
{
    public int Limit { get; init; } = 20;
    public string? Cursor { get; init; }
}

public sealed record SimilarDetectionsResponseDto(
    Guid DecisionId,
    int Limit,
    string? NextCursor,
    IReadOnlyList<SimilarDetectionDto> Items);

public sealed record SimilarDetectionDto(
    Guid Id,
    string DetectionId,
    string RuleFamily,
    string RuleId,
    string RelationType,
    DateTimeOffset ObservedAtUtc,
    decimal Confidence,
    decimal SimilarityScore,
    IReadOnlyList<string> SimilarityReasons,
    IReadOnlyList<string> PriorVerdicts,
    IReadOnlyList<string> PriorAcceptedActions,
    IReadOnlyList<string> PriorOutcomes,
    int Rank);

public sealed record EvidenceSourcesQueryDto
{
    public int Limit { get; init; } = 20;
    public string? Cursor { get; init; }
}

public sealed record EvidenceSourcesResponseDto(
    Guid DecisionId,
    int Limit,
    string? NextCursor,
    IReadOnlyList<EvidenceSourceDto> Items);

public sealed record EvidenceSourceDto(
    Guid Id,
    string Channel,
    string Source,
    string? EvidenceId,
    string? Reference,
    string Category,
    string Polarity,
    decimal? Confidence,
    string Summary,
    string Anchor,
    int Rank);

public sealed record PendingResponseDto(
    Guid DecisionId,
    string Status,
    string Message);

