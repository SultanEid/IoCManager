using System.Text.Json;

namespace Backend.Application.Abstractions.Integrations;

public interface IAiDecisionClient
{
    Task<AiScoreCaseResult> ScoreCaseAsync(AiScoreCaseRequest request, CancellationToken cancellationToken);
    Task<AiExplainCaseResult> ExplainCaseAsync(AiExplainCaseRequest request, CancellationToken cancellationToken);
    Task<AiRecommendActionResult> RecommendActionAsync(AiScoreCaseRequest request, CancellationToken cancellationToken);
    Task<AiHistoricalLearningResult> QueryHistoricalAsync(AiHistoricalLearningRequest request, CancellationToken cancellationToken);
}

public sealed record AiScoreCaseRequest(
    string CaseId,
    string IocType,
    string IocValue,
    DateTimeOffset AsOfTime,
    JsonElement DetectionPackage,
    IDictionary<string, object?> HostContext,
    IDictionary<string, object?> RuleContext);

public sealed record AiScoreCaseResult(
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
    IReadOnlyList<AiDecisionProvenanceItem> Provenance,
    IReadOnlyList<string> NextBestEvidence,
    string? AbstainReason,
    string? ModelVersion,
    string? DatasetVersion,
    DateTimeOffset ScoredAtUtc,
    IReadOnlyList<AiEvidenceSourceItem> EvidenceSources,
    JsonElement RawPayload);

public sealed record AiDecisionProvenanceItem(
    string Source,
    string Key,
    string Value,
    string? EvidenceId,
    string? CitationRef);

public sealed record AiEvidenceSourceItem(
    string Channel,
    string Source,
    string? EvidenceId,
    string? Reference,
    string Category,
    string Polarity,
    decimal? Confidence,
    string Summary,
    string Anchor);

public sealed record AiExplainCaseRequest(
    string CaseId,
    string DecisionId,
    string DecisionState,
    string RecommendationCode,
    string SnapshotHash,
    string ModelVersion,
    string PolicyVersion,
    string TransformationLineageHash,
    DateTimeOffset DecidedAtUtc,
    IReadOnlyList<AiDecisionProvenanceItem> Provenance,
    string DetectionPackageJson);

public sealed record AiExplainCaseResult(
    string Summary,
    string DecisionState,
    string RecommendedAction,
    IReadOnlyList<string> Rationale,
    IReadOnlyList<AiExplanationCitation> Citations,
    IReadOnlyList<string> NextBestEvidence,
    string? PolicyVersion,
    string? ModelVersion,
    string? DatasetVersion,
    DateTimeOffset GeneratedAtUtc,
    JsonElement RawPayload);

public sealed record AiExplanationCitation(
    string SourceId,
    string SourceType,
    string Snippet,
    string? SourceUri,
    int? StartOffset,
    int? EndOffset,
    decimal? Confidence);

public sealed record AiRecommendActionResult(
    string Summary,
    IReadOnlyList<AiRecommendedActionItem> RecommendedActions,
    IReadOnlyList<string> Prerequisites,
    IReadOnlyList<string> Cautions,
    bool NeverAutoExecutes,
    bool PolicyConstrained,
    bool EvidenceBased,
    DateTimeOffset GeneratedAtUtc,
    JsonElement RawPayload);

public sealed record AiRecommendedActionItem(
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

public sealed record AiHistoricalLearningRequest(
    string CaseId,
    string IocType,
    string IocValue,
    DateTimeOffset AsOfTime,
    JsonElement DetectionPackage,
    IDictionary<string, object?> HostContext,
    IDictionary<string, object?> RuleContext,
    int TopK,
    int LookbackDays);

public sealed record AiHistoricalLearningResult(
    IReadOnlyList<AiSimilarDetectionItem> SimilarDetections,
    JsonElement RawPayload);

public sealed record AiSimilarDetectionItem(
    string DetectionId,
    string RuleFamily,
    string RuleId,
    string RelationType,
    DateTimeOffset ObservedAt,
    decimal Confidence,
    decimal SimilarityScore,
    IReadOnlyList<string> SimilarityReasons,
    IReadOnlyList<string> PriorVerdicts,
    IReadOnlyList<string> PriorAcceptedActions,
    IReadOnlyList<string> PriorOutcomes);

