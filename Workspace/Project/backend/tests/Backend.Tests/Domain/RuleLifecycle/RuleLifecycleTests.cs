using Backend.Domain.Common;
using Backend.Domain.RuleLifecycle;
using FluentAssertions;

namespace Backend.Tests.Domain.RuleLifecycle;

public sealed class RuleLifecycleTests
{
    [Fact]
    public void Accept_HighRiskWithoutOverride_Throws()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 00, 00, 00, TimeSpan.Zero);
        var proposal = RuleProposal.Create(
            Guid.NewGuid(),
            "Block suspicious chain",
            "yara",
            "rule body",
            "v1",
            "analyst-1",
            "Strong rationale",
            policyRiskScore: 0.91m,
            proposedAtUtc: nowUtc);

        var action = () => proposal.Accept("lead-1", "Approve with caution", overrideReason: null, highRiskThreshold: 0.75m, reviewedAtUtc: nowUtc.AddMinutes(1));

        action.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RolloutPlan_PromoteRequiresCanaryObservation()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 00, 00, 00, TimeSpan.Zero);
        var plan = RolloutPlan.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            predictedNoise: 0.20m,
            analystAcceptanceRate: 0.50m,
            actorUserId: "analyst-1",
            nowUtc: nowUtc);

        plan.AdvanceTo(RolloutStage.Canary, "lead-1", "Begin canary", overrideReason: null, highRisk: false, nowUtc: nowUtc.AddMinutes(5));

        var action = () => plan.AdvanceTo(RolloutStage.Promote, "lead-1", "Promote", overrideReason: "approved", highRisk: true, nowUtc: nowUtc.AddMinutes(10));

        action.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RollbackPlan_RecordsObservationAndTriggersCondition()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 00, 00, 00, TimeSpan.Zero);
        var plan = RollbackPlan.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Noise above threshold",
            "cti-playbook://rollback/v1",
            predictedNoiseThreshold: 0.30m,
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        plan.RecordObservation(0.34m, "analyst-1", nowUtc.AddMinutes(3));

        plan.TriggerConditionMet.Should().BeTrue();
        plan.LastObservedNoise.Should().Be(0.34m);
    }

    [Fact]
    public void DeploymentRecommendation_DisablesAutoPublishInV1()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 00, 00, 00, TimeSpan.Zero);
        var recommendation = DeploymentRecommendation.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "production",
            RolloutStage.Shadow,
            riskScore: 0.65m,
            predictedNoise: 0.22m,
            baselineNoise: 0.31m,
            analystAcceptanceRate: 0.80m,
            requiresHumanApproval: true,
            requestedByUserId: "analyst-1",
            rationale: "Simulation prefers staged rollout.",
            recommendedAtUtc: nowUtc);

        recommendation.AutoPublishEnabled.Should().BeFalse();
        recommendation.RequiresHumanApproval.Should().BeTrue();
    }
}
