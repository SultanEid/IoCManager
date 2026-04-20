using Backend.Domain.Common;

namespace Backend.Domain.Evidence;

public sealed class EvidenceItem : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public string EvidenceType { get; private set; } = string.Empty;
    public string SourceSystem { get; private set; } = string.Empty;
    public string ContentHash { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = string.Empty;
    public decimal Confidence { get; private set; }
    public DateTimeOffset CollectedAtUtc { get; private set; }

    private EvidenceItem()
    {
    }

    public static EvidenceItem Create(
        Guid caseId,
        string evidenceType,
        string sourceSystem,
        string contentHash,
        string payloadJson,
        decimal confidence,
        DateTimeOffset collectedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentNullException.ThrowIfNull(payloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(evidenceType);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceSystem);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (confidence is < 0 or > 1)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        var evidence = new EvidenceItem
        {
            CaseId = caseId,
            EvidenceType = evidenceType.Trim(),
            SourceSystem = sourceSystem.Trim(),
            ContentHash = contentHash.Trim(),
            PayloadJson = payloadJson,
            Confidence = confidence,
            CollectedAtUtc = collectedAtUtc,
        };

        evidence.StampCreation(actorUserId, nowUtc);
        return evidence;
    }
}
