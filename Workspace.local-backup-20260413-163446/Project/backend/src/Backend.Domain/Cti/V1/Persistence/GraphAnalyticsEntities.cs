using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1.Persistence;

public sealed class CtiGraphArtifactReference : AuditableEntity
{
    private CtiGraphArtifactReference()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public Guid? FeatureSnapshotId { get; private set; }
    public string ArtifactType { get; private set; } = string.Empty;
    public string StorageUri { get; private set; } = string.Empty;
    public string ArtifactHash { get; private set; } = string.Empty;
    public string ProducedBy { get; private set; } = string.Empty;
    public DateTimeOffset GeneratedAtUtc { get; private set; }

    public static CtiGraphArtifactReference Create(
        Guid caseId,
        Guid? decisionId,
        Guid? featureSnapshotId,
        string artifactType,
        string storageUri,
        string artifactHash,
        string producedBy,
        DateTimeOffset generatedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(artifactType);
        ArgumentException.ThrowIfNullOrWhiteSpace(storageUri);
        ArgumentException.ThrowIfNullOrWhiteSpace(artifactHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(producedBy);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var item = new CtiGraphArtifactReference
        {
            CaseId = caseId,
            DecisionId = decisionId,
            FeatureSnapshotId = featureSnapshotId,
            ArtifactType = artifactType.Trim(),
            StorageUri = storageUri.Trim(),
            ArtifactHash = artifactHash.Trim(),
            ProducedBy = producedBy.Trim(),
            GeneratedAtUtc = generatedAtUtc,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }
}
