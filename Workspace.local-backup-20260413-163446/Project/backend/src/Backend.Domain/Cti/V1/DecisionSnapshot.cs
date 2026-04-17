using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class DecisionSnapshot : AuditableEntity
{
    private DecisionSnapshot()
    {
    }

    public Guid CaseId { get; private set; }
    public ScoreVector ScoreVector { get; private set; }
    public UncertaintyLevel Uncertainty { get; private set; }
    public BlastRadius BlastRadius { get; private set; }
    public AssetCriticality AssetCriticality { get; private set; }
    public EvidenceFreshness EvidenceFreshness { get; private set; }
    public decimal SourceTrust { get; private set; }
    public EvidenceConflictLevel EvidenceConflict { get; private set; }
    public string SnapshotVersion { get; private set; } = string.Empty;

    public static DecisionSnapshot Create(
        Guid caseId,
        ScoreVector scoreVector,
        UncertaintyLevel uncertainty,
        BlastRadius blastRadius,
        AssetCriticality assetCriticality,
        EvidenceFreshness evidenceFreshness,
        decimal sourceTrust,
        EvidenceConflictLevel evidenceConflict,
        string snapshotVersion,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(snapshotVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (sourceTrust is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceTrust), "Source trust must be between 0 and 1.");
        }

        var snapshot = new DecisionSnapshot
        {
            CaseId = caseId,
            ScoreVector = scoreVector,
            Uncertainty = uncertainty,
            BlastRadius = blastRadius,
            AssetCriticality = assetCriticality,
            EvidenceFreshness = evidenceFreshness,
            SourceTrust = sourceTrust,
            EvidenceConflict = evidenceConflict,
            SnapshotVersion = snapshotVersion.Trim(),
        };

        snapshot.StampCreation(actorUserId, nowUtc);
        return snapshot;
    }
}
