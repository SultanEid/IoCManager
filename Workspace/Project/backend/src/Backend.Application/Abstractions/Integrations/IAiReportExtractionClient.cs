namespace Backend.Application.Abstractions.Integrations;

public interface IAiReportExtractionClient
{
    Task<AiReportExtractionResult> ExtractAsync(AiReportExtractionRequest request, CancellationToken cancellationToken);
}

public sealed record AiReportExtractionRequest(
    string SourceName,
    string SourceType,
    string DocumentId,
    string? DocumentUrl,
    string? DocumentText,
    string? DocumentBytesBase64,
    string? BulletinJson,
    bool EnableLlmFallback,
    DateTimeOffset IngestionTimeUtc);

public sealed record AiReportExtractionResult(
    string ReportId,
    string SourceType,
    bool HumanReviewRequired,
    bool WeakEvidenceDetected,
    DateTimeOffset ProcessedAtUtc,
    string OutputPayloadJson,
    IReadOnlyList<AiReportExtractedClaim> Claims);

public sealed record AiReportExtractedClaim(
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
    string AbstainReasonCodesJson,
    string CitationsJson);
