using Backend.Domain.Common;

namespace Backend.Domain.Reports;

public sealed class ReportIngestionClaim : AuditableEntity
{
    private ReportIngestionClaim()
    {
    }

    public Guid IngestionRunId { get; private set; }
    public Guid? EvidenceAssertionId { get; private set; }
    public string ClaimId { get; private set; } = string.Empty;
    public string ClaimType { get; private set; } = string.Empty;
    public string Statement { get; private set; } = string.Empty;
    public string Snippet { get; private set; } = string.Empty;
    public int? SourceStartOffset { get; private set; }
    public int? SourceEndOffset { get; private set; }
    public int? PageIndex { get; private set; }
    public string ExtractionMethod { get; private set; } = string.Empty;
    public decimal Confidence { get; private set; }
    public bool IsAccepted { get; private set; }
    public bool IsPromptInjectionSuspected { get; private set; }
    public string AbstainReasonCodesJson { get; private set; } = string.Empty;
    public string CitationsJson { get; private set; } = string.Empty;

    public static ReportIngestionClaim Create(
        Guid ingestionRunId,
        Guid? evidenceAssertionId,
        string claimId,
        string claimType,
        string statement,
        string snippet,
        int? sourceStartOffset,
        int? sourceEndOffset,
        int? pageIndex,
        string extractionMethod,
        decimal confidence,
        bool isAccepted,
        bool isPromptInjectionSuspected,
        string abstainReasonCodesJson,
        string citationsJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(claimId);
        ArgumentException.ThrowIfNullOrWhiteSpace(claimType);
        ArgumentException.ThrowIfNullOrWhiteSpace(statement);
        ArgumentException.ThrowIfNullOrWhiteSpace(extractionMethod);
        ArgumentException.ThrowIfNullOrWhiteSpace(abstainReasonCodesJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(citationsJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (ingestionRunId == Guid.Empty)
        {
            throw new ArgumentException("Ingestion run id is required.", nameof(ingestionRunId));
        }

        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        if (sourceStartOffset.HasValue && sourceStartOffset < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceStartOffset), "Start offset cannot be negative.");
        }

        if (sourceEndOffset.HasValue && sourceEndOffset < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceEndOffset), "End offset cannot be negative.");
        }

        if (sourceStartOffset.HasValue && sourceEndOffset.HasValue && sourceEndOffset < sourceStartOffset)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceEndOffset), "End offset must be greater than start offset.");
        }

        var claim = new ReportIngestionClaim
        {
            IngestionRunId = ingestionRunId,
            EvidenceAssertionId = evidenceAssertionId,
            ClaimId = claimId.Trim(),
            ClaimType = claimType.Trim(),
            Statement = statement.Trim(),
            Snippet = snippet.Trim(),
            SourceStartOffset = sourceStartOffset,
            SourceEndOffset = sourceEndOffset,
            PageIndex = pageIndex,
            ExtractionMethod = extractionMethod.Trim(),
            Confidence = confidence,
            IsAccepted = isAccepted,
            IsPromptInjectionSuspected = isPromptInjectionSuspected,
            AbstainReasonCodesJson = abstainReasonCodesJson,
            CitationsJson = citationsJson,
        };

        claim.StampCreation(actorUserId, nowUtc);
        return claim;
    }
}
