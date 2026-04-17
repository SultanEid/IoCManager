using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Policy;
using FluentAssertions;

namespace Backend.Tests.Domain.Cti.V1;

public sealed class DeterministicDecisionPolicyEngineTests
{
    [Fact]
    public void Evaluate_ReturnsAbstain_WhenUncertaintyAndBlastRadiusAreHigh()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.88m,
            actionability: 0.72m,
            deployability: 0.70m,
            decay: 0.35m,
            uncertainty: 0.70m,
            blastRadius: 0.82m,
            criticality: AssetCriticality.Medium,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.Low);

        outcome.DecisionState.Should().Be(DecisionState.Abstain);
        outcome.RecommendedAction.ActionType.Should().Be(PolicyActionType.Abstain);
        outcome.RolloutPlan.Mode.Should().Be(RolloutMode.None);
        outcome.GuardrailNotes.Should().Contain(x => x.Contains("high_uncertainty", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Evaluate_ReturnsRequestMoreEvidence_WhenEvidenceConflictIsHigh()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.77m,
            actionability: 0.61m,
            deployability: 0.62m,
            decay: 0.25m,
            uncertainty: 0.22m,
            blastRadius: 0.30m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.82m,
            conflict: EvidenceConflictLevel.High);

        outcome.DecisionState.Should().Be(DecisionState.Defer);
        outcome.RecommendedAction.ActionType.Should().Be(PolicyActionType.RequestMoreEvidence);
        outcome.NextBestEvidence.Type.Should().Be(NextBestEvidenceType.ConflictResolution);
    }

    [Fact]
    public void Evaluate_ElevatesApproval_WhenBlockingCriticalAsset()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.92m,
            actionability: 0.58m,
            deployability: 0.57m,
            decay: 0.20m,
            uncertainty: 0.18m,
            blastRadius: 0.42m,
            criticality: AssetCriticality.High,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.91m,
            conflict: EvidenceConflictLevel.None);

        outcome.DecisionState.Should().Be(DecisionState.Recommend);
        outcome.RecommendedAction.ActionType.Should().Be(PolicyActionType.BlockCandidate);
        outcome.ApprovalTierRequired.Should().Be(ApprovalTier.Lead);
    }

    [Fact]
    public void Evaluate_ElevatesApproval_WhenSuppressingOnCriticalAsset()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.20m,
            actionability: 0.20m,
            deployability: 0.55m,
            decay: 0.18m,
            uncertainty: 0.15m,
            blastRadius: 0.20m,
            criticality: AssetCriticality.High,
            freshness: EvidenceFreshness.Aging,
            sourceTrust: 0.88m,
            conflict: EvidenceConflictLevel.None);

        outcome.DecisionState.Should().Be(DecisionState.Recommend);
        outcome.RecommendedAction.ActionType.Should().Be(PolicyActionType.SuppressTemporarily);
        outcome.ApprovalTierRequired.Should().Be(ApprovalTier.Lead);
    }

    [Fact]
    public void Evaluate_NeverRecommendsSuppressPermanently()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.01m,
            actionability: 0.01m,
            deployability: 0.01m,
            decay: 0.01m,
            uncertainty: 0.01m,
            blastRadius: 0.01m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 1.00m,
            conflict: EvidenceConflictLevel.None);

        outcome.RecommendedAction.ActionType.Should().NotBe(PolicyActionType.SuppressPermanently);
        outcome.GuardrailNotes.Should().Contain(x => x.Contains("suppress_permanently", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Evaluate_AlwaysIncludesNoAutoPublishGuardrail()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.75m,
            actionability: 0.80m,
            deployability: 0.90m,
            decay: 0.20m,
            uncertainty: 0.20m,
            blastRadius: 0.25m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.92m,
            conflict: EvidenceConflictLevel.None);

        outcome.GuardrailNotes.Should().Contain(x => x.Contains("no_auto_publish", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Evaluate_MapsRolloutModesDeterministically()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var deployShadow = Evaluate(
            nowUtc,
            maliciousness: 0.70m,
            actionability: 0.65m,
            deployability: 0.40m,
            decay: 0.20m,
            uncertainty: 0.20m,
            blastRadius: 0.20m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.None);

        var deployCanary = Evaluate(
            nowUtc,
            maliciousness: 0.70m,
            actionability: 0.70m,
            deployability: 0.75m,
            decay: 0.20m,
            uncertainty: 0.20m,
            blastRadius: 0.30m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.None);

        var promote = Evaluate(
            nowUtc,
            maliciousness: 0.70m,
            actionability: 0.70m,
            deployability: 0.75m,
            decay: 0.20m,
            uncertainty: 0.20m,
            blastRadius: 0.30m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Fresh,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.None,
            currentRolloutStage: RolloutMode.Canary);

        deployShadow.RecommendedAction.ActionType.Should().Be(PolicyActionType.DeployShadow);
        deployShadow.RolloutPlan.Mode.Should().Be(RolloutMode.Shadow);
        deployCanary.RecommendedAction.ActionType.Should().Be(PolicyActionType.DeployCanary);
        deployCanary.RolloutPlan.Mode.Should().Be(RolloutMode.Canary);
        promote.RecommendedAction.ActionType.Should().Be(PolicyActionType.Promote);
        promote.RolloutPlan.Mode.Should().Be(RolloutMode.Promoted);
    }

    [Fact]
    public void Evaluate_ComputesExpiryDeterministically_FromFreshnessAndDecay()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 10, 00, 00, TimeSpan.Zero);
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.60m,
            actionability: 0.40m,
            deployability: 0.35m,
            decay: 0.25m,
            uncertainty: 0.20m,
            blastRadius: 0.20m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Aging,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.None);

        outcome.ExpiryUtc.Should().Be(nowUtc.AddHours(9)); // 12h * max(0.1, 1 - 0.25)
    }

    [Fact]
    public void Evaluate_ReturnsImmediateExpiry_WhenCaseShouldExpire()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 11, 00, 00, TimeSpan.Zero);
        var outcome = Evaluate(
            nowUtc,
            maliciousness: 0.50m,
            actionability: 0.40m,
            deployability: 0.35m,
            decay: 0.95m,
            uncertainty: 0.20m,
            blastRadius: 0.20m,
            criticality: AssetCriticality.Low,
            freshness: EvidenceFreshness.Stale,
            sourceTrust: 0.90m,
            conflict: EvidenceConflictLevel.None);

        outcome.RecommendedAction.ActionType.Should().Be(PolicyActionType.ExpireCase);
        outcome.RolloutPlan.Mode.Should().Be(RolloutMode.None);
        outcome.ExpiryUtc.Should().Be(nowUtc);
    }

    private static PolicyEvaluationOutcome Evaluate(
        DateTimeOffset nowUtc,
        decimal maliciousness,
        decimal actionability,
        decimal deployability,
        decimal decay,
        decimal uncertainty,
        decimal blastRadius,
        AssetCriticality criticality,
        EvidenceFreshness freshness,
        decimal sourceTrust,
        EvidenceConflictLevel conflict,
        RolloutMode currentRolloutStage = RolloutMode.None)
    {
        var trace = ModelDecisionTrace.Create(
            modelName: "cti-model",
            modelVersion: "v1.0.0",
            scoreVector: new ScoreVector(maliciousness, actionability, deployability),
            uncertainty: new UncertaintyLevel(uncertainty),
            reasoningSummary: "Model score trace",
            rawOutputHash: "hash-123",
            actorUserId: "policy-engine",
            nowUtc: nowUtc);

        var snapshot = PointInTimeFeatureSnapshot.Capture(
            capturedAtUtc: nowUtc,
            featureSetHash: "features-123",
            featuresPayloadJson: "{\"entity_count\":12}",
            dataWindowReference: "window-5m",
            actorUserId: "policy-engine",
            nowUtc: nowUtc);

        var input = DeterministicPolicyInput.Create(
            modelDecisionTrace: trace,
            featureSnapshot: snapshot,
            maliciousnessScore: maliciousness,
            actionabilityScore: actionability,
            deployabilityScore: deployability,
            decayScore: decay,
            uncertaintyScore: uncertainty,
            blastRadiusScore: blastRadius,
            assetCriticality: criticality,
            evidenceFreshness: freshness,
            sourceTrust: sourceTrust,
            evidenceConflict: conflict,
            currentRolloutStage: currentRolloutStage);

        var policy = ActionPolicy.CreateDefaultV1("policy-engine", nowUtc);
        var engine = new DeterministicDecisionPolicyEngine();
        return engine.Evaluate(Guid.NewGuid(), policy, input, "policy-engine", nowUtc);
    }
}
