namespace Backend.Application.Abstractions.Integrations;

public interface IAiReportMitigationClient
{
    Task<AiReportMitigationResult> GenerateAsync(AiReportMitigationRequest request, CancellationToken cancellationToken);
    Task<AiReportMitigationPlan> TranslatePlanAsync(AiReportMitigationTranslationRequest request, CancellationToken cancellationToken);
}

public sealed record AiReportMitigationRequest(
    string SourceName,
    string SourceType,
    string DocumentId,
    string? DocumentUrl,
    string? DocumentText,
    string? DocumentBytesBase64,
    string? BulletinJson,
    bool EnableLlmFallback,
    DateTimeOffset IngestionTime,
    IReadOnlyDictionary<string, object?> EnvironmentContext,
    IReadOnlyList<IReadOnlyDictionary<string, object?>> AssetContext,
    IReadOnlyList<IReadOnlyDictionary<string, object?>> AlertContext,
    IReadOnlyList<IReadOnlyDictionary<string, object?>> RuleContext,
    IReadOnlyList<IReadOnlyDictionary<string, object?>> PriorOutcomeContext);

public sealed record AiReportMitigationTranslationRequest(
    string TargetLanguage,
    AiReportMitigationPlan MitigationPlan);

public sealed record AiReportMitigationResult(
    string ReportId,
    string SourceType,
    string PlannerModel,
    IReadOnlyList<AiReportMitigationExtractedIoc> ExtractedIocs,
    IReadOnlyList<AiReportMitigationClaim> Claims,
    IReadOnlyList<string> CampaignHints,
    IReadOnlyList<string> MalwareFamilyHints,
    AiReportMitigationPlan MitigationPlan,
    DateTimeOffset GeneratedAt);

public sealed record AiReportMitigationExtractedIoc(
    string IocType,
    string IocValue,
    string Label,
    decimal Confidence,
    IReadOnlyList<string> AttackTechniques,
    IReadOnlyList<string> CveRefs,
    IReadOnlyList<AiReportMitigationCitation> Citations);

public sealed record AiReportMitigationClaim(
    string ClaimId,
    string ClaimType,
    string Statement,
    string Snippet,
    int? SourceStartOffset,
    int? SourceEndOffset,
    int? PageIndex,
    string ExtractionMethod,
    decimal Confidence,
    bool IsPromptInjectionSuspected,
    IReadOnlyList<string> AbstainReasonCodes,
    IReadOnlyList<AiReportMitigationCitation> Citations);

public sealed record AiReportMitigationCitation(
    string SourceId,
    string SourceType,
    string Snippet,
    string? SourceUri,
    int? StartOffset,
    int? EndOffset,
    decimal Confidence);

public sealed record AiReportMitigationPlan(
    string ExecutiveSummary,
    string ThreatSummary,
    string Severity,
    string Confidence,
    IReadOnlyList<string> AffectedAssetHypotheses,
    IReadOnlyList<AiReportMitigationPrimaryAction>? PrimaryActions,
    IReadOnlyList<AiReportMitigationTimelineStep>? Timeline,
    IReadOnlyList<AiReportMitigationAction> ImmediateActions,
    IReadOnlyList<AiReportMitigationAction> DetectionActions,
    IReadOnlyList<AiReportMitigationAction> HardeningActions,
    IReadOnlyList<string> ValidationSteps,
    IReadOnlyList<AiReportMitigationScanRecommendation> ScanRecommendations,
    IReadOnlyList<string> Assumptions,
    IReadOnlyList<string> Gaps,
    bool RequiresHumanReview);

public sealed record AiReportMitigationPrimaryAction(
    int Rank,
    string Title,
    string TargetHint,
    string Urgency,
    string Reasoning);

public sealed record AiReportMitigationTimelineStep(
    string StepId,
    string Title,
    int? LinkedPrimaryActionRank,
    string TargetHint,
    string Lane,
    int StartsIn,
    int Duration,
    string Unit,
    string Rationale);

public sealed record AiReportMitigationAction(
    string Title,
    string Rationale,
    string Priority,
    string OwnerHint,
    string Validation,
    string AutomationReadiness);

public sealed record AiReportMitigationScanRecommendation(
    string ScannerFamily,
    string TargetHint,
    string RuleHint,
    string Rationale,
    string Priority);
