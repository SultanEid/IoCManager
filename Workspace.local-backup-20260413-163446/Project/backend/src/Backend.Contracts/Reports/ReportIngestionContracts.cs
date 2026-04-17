namespace Backend.Contracts.Reports;

public sealed record IngestReportRequest(
    Guid CaseId,
    string ActorUserId,
    string SourceName,
    string SourceType,
    string? DocumentId,
    string? DocumentUrl,
    string? DocumentText,
    string? BulletinJson,
    Guid? DecisionBundleId,
    bool EnableLlmFallback);

public sealed record ReportIngestionCitationResponse(
    string SourceId,
    string SourceType,
    string Snippet,
    string? SourceUri,
    int? StartOffset,
    int? EndOffset,
    decimal Confidence);

public sealed record ReportIngestionClaimResponse(
    Guid Id,
    Guid IngestionRunId,
    Guid? EvidenceAssertionId,
    string ClaimId,
    string ClaimType,
    string Statement,
    string Snippet,
    int? SourceStartOffset,
    int? SourceEndOffset,
    int? PageIndex,
    string ExtractionMethod,
    decimal Confidence,
    bool IsAccepted,
    bool IsPromptInjectionSuspected,
    string AbstainReasonCodesJson,
    string CitationsJson,
    IReadOnlyList<string> AbstainReasonCodes,
    IReadOnlyList<ReportIngestionCitationResponse> Citations,
    DateTimeOffset CreatedAtUtc);

public sealed record ReportIngestionResponse(
    Guid IngestionId,
    Guid CaseId,
    Guid? DecisionBundleId,
    string ReportId,
    string SourceName,
    string SourceType,
    bool HumanReviewRequired,
    bool WeakEvidenceDetected,
    int AcceptedClaims,
    int AbstainedClaims,
    DateTimeOffset ProcessedAtUtc,
    DateTimeOffset CreatedAtUtc);

public sealed record ReportIngestionDetailResponse(
    Guid IngestionId,
    Guid CaseId,
    Guid? DecisionBundleId,
    string ReportId,
    string SourceName,
    string SourceType,
    string DocumentId,
    string? DocumentUrl,
    bool HumanReviewRequired,
    bool WeakEvidenceDetected,
    string InputPayloadJson,
    string OutputPayloadJson,
    DateTimeOffset ProcessedAtUtc,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<ReportIngestionClaimResponse> Claims);
