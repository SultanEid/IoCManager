using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class PointInTimeFeatureSnapshot : AuditableEntity
{
    private PointInTimeFeatureSnapshot()
    {
    }

    public DateTimeOffset CapturedAtUtc { get; private set; }
    public string FeatureSetHash { get; private set; } = string.Empty;
    public string FeaturesPayloadJson { get; private set; } = string.Empty;
    public string DataWindowReference { get; private set; } = string.Empty;

    public static PointInTimeFeatureSnapshot Capture(
        DateTimeOffset capturedAtUtc,
        string featureSetHash,
        string featuresPayloadJson,
        string dataWindowReference,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(featureSetHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(featuresPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(dataWindowReference);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var snapshot = new PointInTimeFeatureSnapshot
        {
            CapturedAtUtc = capturedAtUtc,
            FeatureSetHash = featureSetHash.Trim(),
            FeaturesPayloadJson = featuresPayloadJson.Trim(),
            DataWindowReference = dataWindowReference.Trim(),
        };

        snapshot.StampCreation(actorUserId, nowUtc);
        return snapshot;
    }
}
