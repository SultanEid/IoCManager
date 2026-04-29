namespace Backend.Contracts.V2;

public sealed record ReportMitigationGenerateRequest(
    string SourceName,
    string SourceType,
    string? DocumentId,
    string? DocumentUrl,
    string? DocumentText,
    string? DocumentBytesBase64,
    string? BulletinJson,
    Guid? ExistingReportId,
    bool IncludeWorkspaceContext,
    string ActorUserId,
    bool Regenerate = false);

public sealed record ReportMitigationGenerateFromAlertRequest(
    bool IncludeWorkspaceContext,
    string ActorUserId,
    bool Regenerate = false);

public sealed record ReportMitigationGenerateFromScanJobRequest(
    bool IncludeWorkspaceContext,
    string ActorUserId,
    bool Regenerate = false);

public sealed record ReportMitigationExtractedIocResponse(
    string IocType,
    string IocValue,
    string Label,
    decimal Confidence,
    IReadOnlyList<string> AttackTechniques,
    IReadOnlyList<string> CveRefs,
    IReadOnlyList<ReportMitigationCitationResponse> Citations);

public sealed record ReportMitigationCitationResponse(
    string SourceId,
    string SourceType,
    string Snippet,
    string? SourceUri,
    int? StartOffset,
    int? EndOffset,
    decimal Confidence);

public sealed record ReportMitigationClaimResponse(
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
    IReadOnlyList<ReportMitigationCitationResponse> Citations);

public sealed record ReportMitigationActionResponse(
    string Title,
    string Rationale,
    string Priority,
    string OwnerHint,
    string Validation,
    string AutomationReadiness);

public sealed record ReportMitigationScanRecommendationResponse(
    string ScannerFamily,
    string TargetHint,
    string RuleHint,
    string Rationale,
    string Priority);

public sealed record ReportMitigationPlanResponse(
    string ExecutiveSummary,
    string ThreatSummary,
    string Severity,
    string Confidence,
    IReadOnlyList<string> AffectedAssetHypotheses,
    IReadOnlyList<ReportMitigationActionResponse> ImmediateActions,
    IReadOnlyList<ReportMitigationActionResponse> DetectionActions,
    IReadOnlyList<ReportMitigationActionResponse> HardeningActions,
    IReadOnlyList<string> ValidationSteps,
    IReadOnlyList<ReportMitigationScanRecommendationResponse> ScanRecommendations,
    IReadOnlyList<string> Assumptions,
    IReadOnlyList<string> Gaps,
    bool RequiresHumanReview);

public sealed record ReportMitigationResponse(
    string ReportId,
    string SourceType,
    string PlannerModel,
    IReadOnlyList<ReportMitigationExtractedIocResponse> ExtractedIocs,
    IReadOnlyList<ReportMitigationClaimResponse> Claims,
    IReadOnlyList<string> CampaignHints,
    IReadOnlyList<string> MalwareFamilyHints,
    ReportMitigationPlanResponse MitigationPlan,
    DateTimeOffset GeneratedAt,
    Guid? SourceReportId,
    ReportResponse? PersistedMitigationReport);

public sealed record ReportMitigationListItemResponse(
    Guid Id,
    string Title,
    Guid? SourceReportId,
    IReadOnlyList<Guid> SourceScanJobIds,
    string Severity,
    string Confidence,
    string ExecutiveSummary,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<Guid> AlertIds);

public sealed record ReportMitigationListResponse(
    IReadOnlyList<ReportMitigationListItemResponse> Items,
    int TotalCount);
