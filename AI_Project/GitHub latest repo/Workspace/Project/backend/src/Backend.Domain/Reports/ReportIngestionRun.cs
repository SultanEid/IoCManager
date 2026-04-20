using Backend.Domain.Common;

namespace Backend.Domain.Reports;

public sealed class ReportIngestionRun : AuditableEntity
{
    private readonly List<ReportIngestionClaim> _claims = new();

    private ReportIngestionRun()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid? DecisionBundleId { get; private set; }
    public string ReportId { get; private set; } = string.Empty;
    public string SourceName { get; private set; } = string.Empty;
    public string SourceType { get; private set; } = string.Empty;
    public string DocumentId { get; private set; } = string.Empty;
    public string? DocumentUrl { get; private set; }
    public bool HumanReviewRequired { get; private set; }
    public bool WeakEvidenceDetected { get; private set; }
    public DateTimeOffset ProcessedAtUtc { get; private set; }
    public string InputPayloadJson { get; private set; } = string.Empty;
    public string OutputPayloadJson { get; private set; } = string.Empty;
    public IReadOnlyCollection<ReportIngestionClaim> Claims => _claims;

    public static ReportIngestionRun Create(
        Guid caseId,
        Guid? decisionBundleId,
        string reportId,
        string sourceName,
        string sourceType,
        string documentId,
        string? documentUrl,
        bool humanReviewRequired,
        bool weakEvidenceDetected,
        DateTimeOffset processedAtUtc,
        string inputPayloadJson,
        string outputPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reportId);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceName);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceType);
        ArgumentException.ThrowIfNullOrWhiteSpace(documentId);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(outputPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var run = new ReportIngestionRun
        {
            CaseId = caseId,
            DecisionBundleId = decisionBundleId,
            ReportId = reportId.Trim(),
            SourceName = sourceName.Trim(),
            SourceType = sourceType.Trim().ToLowerInvariant(),
            DocumentId = documentId.Trim(),
            DocumentUrl = string.IsNullOrWhiteSpace(documentUrl) ? null : documentUrl.Trim(),
            HumanReviewRequired = humanReviewRequired,
            WeakEvidenceDetected = weakEvidenceDetected,
            ProcessedAtUtc = processedAtUtc,
            InputPayloadJson = inputPayloadJson,
            OutputPayloadJson = outputPayloadJson,
        };

        run.StampCreation(actorUserId, nowUtc);
        return run;
    }

    public void AddClaim(ReportIngestionClaim claim)
    {
        ArgumentNullException.ThrowIfNull(claim);
        _claims.Add(claim);
    }
}
