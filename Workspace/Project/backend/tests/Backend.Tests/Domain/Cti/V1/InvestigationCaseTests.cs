using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Policy;
using FluentAssertions;

namespace Backend.Tests.Domain.Cti.V1;

public sealed class InvestigationCaseTests
{
    [Fact]
    public void TransitionTo_AllowsExpectedCaseLifecycleWithGuardrails()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CreateCase(nowUtc);

        item.TransitionTo(CaseState.Triage, "analyst-1", nowUtc.AddMinutes(1));

        item.AddEvidenceBundle(CreateEvidenceBundle(item.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        item.TransitionTo(CaseState.EvidencePending, "analyst-1", nowUtc.AddMinutes(3));
        item.TransitionTo(CaseState.RecommendationReady, "analyst-1", nowUtc.AddMinutes(4));

        var policyOutcome = EvaluateOutcome(item.Id, nowUtc.AddMinutes(5));
        var decisionBundle = CreateDecisionBundle(item.Id, policyOutcome, null, nowUtc.AddMinutes(5));
        item.RecordDecisionBundle(decisionBundle, "policy-engine", nowUtc.AddMinutes(5));
        item.TransitionTo(CaseState.AwaitingApproval, "lead-1", nowUtc.AddMinutes(6));

        var gate = ApprovalGate.Create(item.Id, ApprovalTier.Lead, "lead-1", nowUtc.AddMinutes(6));
        gate.Approve(ApprovalTier.Lead, "lead-1", nowUtc.AddMinutes(7));
        item.SetApprovalGate(gate, "lead-1", nowUtc.AddMinutes(7));

        item.TransitionTo(CaseState.Canary, "lead-1", nowUtc.AddMinutes(8));
        item.TransitionTo(CaseState.Promoted, "lead-1", nowUtc.AddMinutes(9));
        item.TransitionTo(CaseState.Monitoring, "lead-1", nowUtc.AddMinutes(10));
        item.TransitionTo(CaseState.Closed, "lead-1", nowUtc.AddMinutes(11));

        item.State.Should().Be(CaseState.Closed);
    }

    [Fact]
    public void TransitionTo_Throws_WhenRecommendationReadyWithoutActionableEvidence()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CreateCase(nowUtc);
        item.TransitionTo(CaseState.Triage, "analyst-1", nowUtc.AddMinutes(1));

        var act = () => item.TransitionTo(CaseState.RecommendationReady, "analyst-1", nowUtc.AddMinutes(2));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*actionable evidence*");
    }

    [Fact]
    public void TransitionTo_Throws_WhenAwaitingApprovalWithoutDecision()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CreateCase(nowUtc);
        item.TransitionTo(CaseState.Triage, "analyst-1", nowUtc.AddMinutes(1));
        item.AddEvidenceBundle(CreateEvidenceBundle(item.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        item.TransitionTo(CaseState.RecommendationReady, "analyst-1", nowUtc.AddMinutes(3));

        var act = () => item.TransitionTo(CaseState.AwaitingApproval, "lead-1", nowUtc.AddMinutes(4));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*active decision bundle*");
    }

    [Fact]
    public void TransitionTo_Throws_WhenCanaryWithoutApprovedGateAndPlans()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CreateCase(nowUtc);
        item.TransitionTo(CaseState.Triage, "analyst-1", nowUtc.AddMinutes(1));
        item.AddEvidenceBundle(CreateEvidenceBundle(item.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        item.TransitionTo(CaseState.RecommendationReady, "analyst-1", nowUtc.AddMinutes(3));

        var policyOutcome = EvaluateOutcome(item.Id, nowUtc.AddMinutes(4));
        var decisionBundle = CreateDecisionBundle(item.Id, policyOutcome, null, nowUtc.AddMinutes(4));
        item.RecordDecisionBundle(decisionBundle, "policy-engine", nowUtc.AddMinutes(4));
        item.TransitionTo(CaseState.AwaitingApproval, "lead-1", nowUtc.AddMinutes(5));

        var act = () => item.TransitionTo(CaseState.Canary, "lead-1", nowUtc.AddMinutes(6));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*approved gate*");
    }

    [Fact]
    public void MergeFrom_AndSplitInto_TrackLineageAndCaseLinks()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var target = CreateCase(nowUtc);
        var source = CreateCase(nowUtc.AddMinutes(1));

        target.AddEvidenceBundle(CreateEvidenceBundle(target.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        source.AddEvidenceBundle(CreateEvidenceBundle(source.Id, nowUtc), "analyst-2", nowUtc.AddMinutes(3));

        target.MergeFrom(source, "Duplicate campaign indicators.", "lead-1", nowUtc.AddMinutes(4));

        target.EvidenceBundles.Should().HaveCount(2);
        target.MergedCaseIds.Should().Contain(source.Id);
        source.State.Should().Be(CaseState.Closed);
        source.MergedIntoCaseId.Should().Be(target.Id);
        source.MergeReason.Should().Be("Duplicate campaign indicators.");

        var bundleToMove = target.EvidenceBundles.First().Id;
        var splitChild = target.SplitInto(
            childTitle: "Child case for lateral movement branch",
            childSummary: "Split from parent for dedicated analyst queue.",
            evidenceBundleIds: new[] { bundleToMove },
            childOwnerUserId: "analyst-3",
            rationale: "Different investigation thread.",
            actorUserId: "lead-1",
            nowUtc: nowUtc.AddMinutes(5));

        splitChild.ParentCaseId.Should().Be(target.Id);
        splitChild.EvidenceBundles.Should().HaveCount(1);
        target.EvidenceBundles.Should().HaveCount(1);
        target.ChildCaseIds.Should().Contain(splitChild.Id);
        target.TransformationLineage.Links.Should().Contain(x => x.Relationship == "merge");
        target.TransformationLineage.Links.Should().Contain(x => x.Relationship == "split");
    }

    [Fact]
    public void MergeFrom_Throws_WhenSourceAlreadyMerged()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var targetA = CreateCase(nowUtc);
        var targetB = CreateCase(nowUtc.AddMinutes(1));
        var source = CreateCase(nowUtc.AddMinutes(2));

        source.AddEvidenceBundle(CreateEvidenceBundle(source.Id, nowUtc), "analyst-2", nowUtc.AddMinutes(3));

        targetA.MergeFrom(source, "First merge.", "lead-1", nowUtc.AddMinutes(4));

        var act = () => targetB.MergeFrom(source, "Second merge attempt.", "lead-1", nowUtc.AddMinutes(5));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*already been merged*");
    }

    [Fact]
    public void SplitInto_Throws_WhenCaseIsMerged()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var target = CreateCase(nowUtc);
        var source = CreateCase(nowUtc.AddMinutes(1));

        target.AddEvidenceBundle(CreateEvidenceBundle(target.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        source.AddEvidenceBundle(CreateEvidenceBundle(source.Id, nowUtc), "analyst-2", nowUtc.AddMinutes(3));
        target.MergeFrom(source, "Merge then split.", "lead-1", nowUtc.AddMinutes(4));

        var act = () => source.SplitInto(
            "invalid",
            "cannot split merged case",
            new[] { Guid.NewGuid() },
            "analyst-3",
            "invalid operation",
            "lead-1",
            nowUtc.AddMinutes(5));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Merged cases are immutable*");
    }

    [Fact]
    public void RecordDecisionBundle_EnforcesAppendOnlySupersessionChain()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CreateCase(nowUtc);

        item.TransitionTo(CaseState.Triage, "analyst-1", nowUtc.AddMinutes(1));
        item.AddEvidenceBundle(CreateEvidenceBundle(item.Id, nowUtc), "analyst-1", nowUtc.AddMinutes(2));
        item.TransitionTo(CaseState.RecommendationReady, "analyst-1", nowUtc.AddMinutes(3));

        var firstOutcome = EvaluateOutcome(item.Id, nowUtc.AddMinutes(4));
        var firstBundle = CreateDecisionBundle(item.Id, firstOutcome, null, nowUtc.AddMinutes(4));
        item.RecordDecisionBundle(firstBundle, "policy-engine", nowUtc.AddMinutes(4));

        var secondOutcome = EvaluateOutcome(item.Id, nowUtc.AddMinutes(5));
        var invalidSecondBundle = CreateDecisionBundle(item.Id, secondOutcome, Guid.NewGuid(), nowUtc.AddMinutes(5));

        var act = () => item.RecordDecisionBundle(invalidSecondBundle, "policy-engine", nowUtc.AddMinutes(5));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*append to the active bundle chain*");
    }

    private static InvestigationCase CreateCase(DateTimeOffset nowUtc) =>
        InvestigationCase.Open(
            title: "Potential command-and-control activity",
            summary: "Beaconing pattern detected from finance workstation.",
            ownerUserId: "analyst-1",
            sla: CaseSla.Create(TimeSpan.FromHours(1), TimeSpan.FromHours(6), TimeSpan.FromHours(2)),
            riskBudget: RiskBudget.Create(0.55m, 0.45m, 0.50m),
            actorUserId: "analyst-1",
            nowUtc: nowUtc);

    private static CaseEvidenceBundle CreateEvidenceBundle(Guid caseId, DateTimeOffset nowUtc)
    {
        var source = SourceReliabilityProfile.Create(
            sourceSystem: "EDR",
            historicalPrecision: 0.86m,
            historicalRecall: 0.72m,
            evaluatedAtUtc: nowUtc);

        var assertions = new[]
        {
            EvidenceAssertion.Create(
                assertionType: "network",
                statement: "Repeated C2 callback over uncommon port.",
                confidence: 0.91m,
                isConflicting: false,
                observedAtUtc: nowUtc,
                sourceReference: "edr:session-1"),
        };

        return CaseEvidenceBundle.Create(
            caseId,
            bundleName: "EDR + network pivot",
            collectedAtUtc: nowUtc,
            freshUntilUtc: nowUtc.AddHours(6),
            sourceReliability: source,
            assertions: assertions,
            actorUserId: "analyst-1",
            nowUtc: nowUtc);
    }

    private static PolicyEvaluationOutcome EvaluateOutcome(Guid caseId, DateTimeOffset nowUtc)
    {
        var modelTrace = ModelDecisionTrace.Create(
            modelName: "cti-graph-model",
            modelVersion: "2026.03.01",
            scoreVector: new ScoreVector(0.80m, 0.72m, 0.70m),
            uncertainty: new UncertaintyLevel(0.20m),
            reasoningSummary: "Strong multi-source signal alignment.",
            rawOutputHash: "trace-abc",
            actorUserId: "policy-engine",
            nowUtc: nowUtc);

        var features = PointInTimeFeatureSnapshot.Capture(
            capturedAtUtc: nowUtc,
            featureSetHash: "features-abc",
            featuresPayloadJson: "{\"count\":42}",
            dataWindowReference: "window-15m",
            actorUserId: "policy-engine",
            nowUtc: nowUtc);

        var input = DeterministicPolicyInput.Create(
            modelTrace,
            features,
            new BlastRadius(0.40m),
            AssetCriticality.High,
            EvidenceFreshness.Fresh,
            sourceTrust: 0.82m,
            evidenceConflict: EvidenceConflictLevel.Low);

        var policy = ActionPolicy.CreateDefaultV1("policy-engine", nowUtc);
        var engine = new DeterministicDecisionPolicyEngine();
        return engine.Evaluate(caseId, policy, input, "policy-engine", nowUtc);
    }

    private static DecisionBundle CreateDecisionBundle(
        Guid caseId,
        PolicyEvaluationOutcome policyOutcome,
        Guid? supersedesDecisionBundleId,
        DateTimeOffset nowUtc)
    {
        var decision = CaseDecision.Create(
            caseId,
            policyOutcome.DecisionState,
            policyOutcome.RecommendedAction,
            policyOutcome.ApprovalTierRequired,
            policyOutcome.RolloutPlan,
            policyOutcome.RollbackPlan,
            policyOutcome.DecisionSnapshot,
            policyOutcome.ModelDecisionTrace,
            policyOutcome.PolicyVersion,
            "policy-engine",
            nowUtc);

        return DecisionBundle.Record(
            caseId,
            supersedesDecisionBundleId,
            decision,
            policyOutcome.FeatureSnapshot,
            featureSnapshotReference: policyOutcome.FeatureSnapshot.DataWindowReference,
            featureSnapshotHash: policyOutcome.FeatureSnapshot.FeatureSetHash,
            actorUserId: "policy-engine",
            recordedAtUtc: nowUtc);
    }
}
