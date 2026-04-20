using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class DecisionBundle : AuditableEntity
{
    private DecisionBundle()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid? SupersedesDecisionBundleId { get; private set; }
    public CaseDecision Decision { get; private set; } = null!;
    public PointInTimeFeatureSnapshot FeatureSnapshot { get; private set; } = null!;
    public string FeatureSnapshotReference { get; private set; } = string.Empty;
    public string FeatureSnapshotHash { get; private set; } = string.Empty;

    public static DecisionBundle Record(
        Guid caseId,
        Guid? supersedesDecisionBundleId,
        CaseDecision decision,
        PointInTimeFeatureSnapshot featureSnapshot,
        string featureSnapshotReference,
        string featureSnapshotHash,
        string actorUserId,
        DateTimeOffset recordedAtUtc)
    {
        ArgumentNullException.ThrowIfNull(decision);
        ArgumentNullException.ThrowIfNull(featureSnapshot);
        ArgumentException.ThrowIfNullOrWhiteSpace(featureSnapshotReference);
        ArgumentException.ThrowIfNullOrWhiteSpace(featureSnapshotHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (decision.CaseId != caseId || featureSnapshotHash.Trim() != featureSnapshot.FeatureSetHash)
        {
            throw new InvalidOperationException("Decision bundle references must align with the case and snapshot hash.");
        }

        var bundle = new DecisionBundle
        {
            CaseId = caseId,
            SupersedesDecisionBundleId = supersedesDecisionBundleId,
            Decision = decision,
            FeatureSnapshot = featureSnapshot,
            FeatureSnapshotReference = featureSnapshotReference.Trim(),
            FeatureSnapshotHash = featureSnapshotHash.Trim(),
        };

        bundle.StampCreation(actorUserId, recordedAtUtc);
        return bundle;
    }
}
