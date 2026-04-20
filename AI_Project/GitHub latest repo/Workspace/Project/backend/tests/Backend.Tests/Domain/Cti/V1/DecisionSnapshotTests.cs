using Backend.Domain.Cti.V1;
using FluentAssertions;

namespace Backend.Tests.Domain.Cti.V1;

public sealed class DecisionSnapshotTests
{
    [Fact]
    public void Create_StoresReplayRelevantFields_ForSnapshotAuditing()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 09, 30, 00, TimeSpan.Zero);
        var caseId = Guid.NewGuid();
        var scoreVector = new ScoreVector(0.81m, 0.63m, 0.58m);
        var uncertainty = new UncertaintyLevel(0.19m);
        var blastRadius = new BlastRadius(0.44m);

        var snapshot = DecisionSnapshot.Create(
            caseId,
            scoreVector,
            uncertainty,
            blastRadius,
            AssetCriticality.High,
            EvidenceFreshness.Aging,
            sourceTrust: 0.77m,
            evidenceConflict: EvidenceConflictLevel.Low,
            snapshotVersion: "v1.2",
            actorUserId: "policy-engine",
            nowUtc: nowUtc);

        snapshot.CaseId.Should().Be(caseId);
        snapshot.ScoreVector.ThreatScore.Should().Be(0.81m);
        snapshot.Uncertainty.Value.Should().Be(0.19m);
        snapshot.BlastRadius.EstimatedImpact.Should().Be(0.44m);
        snapshot.AssetCriticality.Should().Be(AssetCriticality.High);
        snapshot.EvidenceFreshness.Should().Be(EvidenceFreshness.Aging);
        snapshot.SourceTrust.Should().Be(0.77m);
        snapshot.EvidenceConflict.Should().Be(EvidenceConflictLevel.Low);
        snapshot.SnapshotVersion.Should().Be("v1.2");
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(1.01)]
    public void Create_Throws_WhenSourceTrustFallsOutsideUnitInterval(decimal sourceTrust)
    {
        var act = () => DecisionSnapshot.Create(
            Guid.NewGuid(),
            new ScoreVector(0.5m, 0.5m, 0.5m),
            new UncertaintyLevel(0.2m),
            new BlastRadius(0.3m),
            AssetCriticality.Medium,
            EvidenceFreshness.Fresh,
            sourceTrust: sourceTrust,
            evidenceConflict: EvidenceConflictLevel.None,
            snapshotVersion: "v1",
            actorUserId: "policy-engine",
            nowUtc: DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Capture_FeatureSnapshot_TrimAndPersistReplayInputs()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 11, 00, 00, TimeSpan.Zero);
        var capturedAtUtc = nowUtc.AddMinutes(-5);

        var snapshot = PointInTimeFeatureSnapshot.Capture(
            capturedAtUtc: capturedAtUtc,
            featureSetHash: "  feature-hash-123  ",
            featuresPayloadJson: "  {\"entityCount\":12}  ",
            dataWindowReference: "  window-15m  ",
            actorUserId: "feature-job",
            nowUtc: nowUtc);

        snapshot.CapturedAtUtc.Should().Be(capturedAtUtc);
        snapshot.FeatureSetHash.Should().Be("feature-hash-123");
        snapshot.FeaturesPayloadJson.Should().Be("{\"entityCount\":12}");
        snapshot.DataWindowReference.Should().Be("window-15m");
    }
}
