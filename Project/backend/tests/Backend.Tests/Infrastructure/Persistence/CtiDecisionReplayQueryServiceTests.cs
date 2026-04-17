using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Persistence.QueryServices;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure.Persistence;

public sealed class CtiDecisionReplayQueryServiceTests
{
    [Fact]
    public async Task GetCaseDecisionBundleAsync_ReturnsReplayBundleWithExpandedSlices()
    {
        await using var dbContext = CreateContext();
        var nowUtc = new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero);

        var ctiCase = CtiCase.Create(
            "Case A",
            "Replay verification",
            "analyst-1",
            CaseState.AwaitingApproval,
            "analyst-1",
            nowUtc.AddHours(-2),
            parentCaseId: Guid.NewGuid());

        var reliability = CtiSourceReliabilityProfile.Create(
            "edr",
            0.90m,
            0.80m,
            0.85m,
            nowUtc.AddDays(-1),
            null,
            "system",
            nowUtc.AddDays(-1));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-001",
            nowUtc.AddMinutes(-40),
            nowUtc.AddHours(-3),
            nowUtc.AddMinutes(-40),
            "feature-pipeline",
            "system",
            nowUtc.AddMinutes(-40));

        var decision = CtiDecision.Create(
            ctiCase.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            "contain",
            "Contain and monitor",
            snapshot.SnapshotHash,
            "model-v1",
            "policy-v7",
            "lineage-hash-1",
            "policy-engine",
            nowUtc.AddMinutes(-30));

        var decisionBundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            NextBestEvidenceType.PostActionValidation,
            "contain",
            "Contain and monitor",
            "Collect post-action validation telemetry and user impact signals.",
            "Recommendation requires validation signals after action.",
            snapshot.SnapshotHash,
            "model-v1",
            "policy-v7",
            "lineage-hash-1",
            "policy-engine",
            nowUtc.AddMinutes(-30));

        var evidence = CtiEvidenceAssertion.Create(
            ctiCase.Id,
            reliability.Id,
            "ev-ref-1",
            "network",
            "Outbound beaconing",
            0.93m,
            false,
            "edr:event-1",
            nowUtc.AddMinutes(-50),
            "analyst-1",
            nowUtc.AddMinutes(-49));

        var evidenceReference = CtiDecisionEvidenceReference.Create(decision.Id, evidence.Id, nowUtc.AddMinutes(-30));
        var lineage = CtiTransformationLineageRecord.Create(
            ctiCase.Id,
            ctiCase.Id,
            Guid.NewGuid(),
            "split",
            "Separated noisy branch",
            "lead-1",
            nowUtc.AddMinutes(-35));
        var lineageReference = CtiDecisionLineageReference.Create(decision.Id, lineage.Id, nowUtc.AddMinutes(-30));

        var approval = CtiApproval.Create(
            ctiCase.Id,
            decision.Id,
            ApprovalTier.Lead,
            ApprovalTier.Admin,
            "admin-1",
            "Escalated approval completed.",
            nowUtc.AddMinutes(-25));

        var ruleProposal = CtiRuleProposal.Create(
            ctiCase.Id,
            decision.Id,
            "Containment Rule",
            "network",
            "rule body",
            "v1",
            "analyst-1",
            "Containment after corroborated telemetry.",
            nowUtc.AddMinutes(-24));

        var deployment = CtiDeploymentRecommendation.Create(
            ctiCase.Id,
            decision.Id,
            ruleProposal.Id,
            "prod",
            RolloutMode.Canary,
            0.42m,
            true,
            "analyst-1",
            "Roll out with canary safeguards.",
            nowUtc.AddMinutes(-23));

        var feedback = CtiFeedback.Create(
            ctiCase.Id,
            decision.Id,
            Backend.Domain.Common.FeedbackVerdict.ConfirmedThreat,
            "Containment worked as expected.",
            "lead-1",
            nowUtc.AddMinutes(-22));

        var graphArtifact = CtiGraphArtifactReference.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            "subgraph",
            "s3://cti/graph-1",
            "artifact-hash-1",
            "graph-job",
            nowUtc.AddMinutes(-32),
            "system",
            nowUtc.AddMinutes(-32));

        var featureVector = CtiFeatureVector.Create(snapshot.Id, "entity_degree", 14.5m, null, "graph");
        var graphFeature = CtiGraphDerivedFeature.Create(snapshot.Id, graphArtifact.Id, "pagerank", 0.87m, null);
        var criticality = CtiAssetCriticalitySnapshotValue.Create(snapshot.Id, "asset-1", AssetCriticality.High, 0.80m);
        var trust = CtiSourceTrustSnapshotValue.Create(snapshot.Id, "edr", 0.85m, 0.90m, 0.80m);
        var policyRef = CtiPolicyVersionReference.Create(snapshot.Id, "policy-v7", "policy-hash-7", nowUtc.AddMinutes(-45));
        var modelRef = CtiModelVersionReference.Create(snapshot.Id, "gcn", "model-v1", "model-hash-1", nowUtc.AddDays(-2));
        var decisionTrace = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-v1",
            0.71m,
            0.66m,
            0.59m,
            0.22m,
            "Deterministic replay trace",
            "raw-trace-hash-1",
            nowUtc.AddMinutes(-29),
            "policy-engine",
            nowUtc.AddMinutes(-29));
        var audit = CtiAuditRecord.Create(
            ctiCase.Id,
            decision.Id,
            "policy-engine",
            "append",
            nameof(CtiDecision),
            decision.Id.ToString("N"),
            "AUDIT-HASH-1",
            "corr-1",
            nowUtc.AddMinutes(-28));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiSourceReliabilityProfiles.Add(reliability);
        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(decisionBundle);
        dbContext.CtiEvidenceAssertions.Add(evidence);
        dbContext.CtiDecisionEvidenceReferences.Add(evidenceReference);
        dbContext.CtiTransformationLineageRecords.Add(lineage);
        dbContext.CtiDecisionLineageReferences.Add(lineageReference);
        dbContext.CtiApprovals.Add(approval);
        dbContext.CtiRuleProposals.Add(ruleProposal);
        dbContext.CtiDeploymentRecommendations.Add(deployment);
        dbContext.CtiFeedback.Add(feedback);
        dbContext.CtiGraphArtifactReferences.Add(graphArtifact);
        dbContext.CtiFeatureVectors.Add(featureVector);
        dbContext.CtiGraphDerivedFeatures.Add(graphFeature);
        dbContext.CtiAssetCriticalitySnapshotValues.Add(criticality);
        dbContext.CtiSourceTrustSnapshotValues.Add(trust);
        dbContext.CtiPolicyVersionReferences.Add(policyRef);
        dbContext.CtiModelVersionReferences.Add(modelRef);
        dbContext.CtiModelDecisionTraces.Add(decisionTrace);
        dbContext.CtiAuditRecords.Add(audit);
        await dbContext.SaveChangesAsync();

        var service = new CtiDecisionReplayQueryService(dbContext);
        var replay = await service.GetCaseDecisionBundleAsync(ctiCase.Id, decisionBundle.Id, nowUtc, CancellationToken.None);

        replay.Should().NotBeNull();
        replay!.DecisionBundle.SnapshotHash.Should().Be("snap-001");
        replay.DecisionBundle.ModelVersion.Should().Be("model-v1");
        replay.DecisionBundle.PolicyVersion.Should().Be("policy-v7");
        replay.DecisionBundle.NextBestEvidenceType.Should().Be(NextBestEvidenceType.PostActionValidation.ToString());
        replay.Case.ParentCaseId.Should().NotBeNull();
        replay.EvidenceReferences.Should().ContainSingle(x => x.EvidenceReference == "ev-ref-1");
        replay.TransformationLineage.Should().ContainSingle(x => x.Relationship == "split");
        replay.GraphArtifacts.Should().ContainSingle(x => x.ArtifactHash == "artifact-hash-1");
        replay.FeatureVectors.Should().ContainSingle(x => x.FeatureName == "entity_degree");
        replay.Approvals.Should().ContainSingle(x => x.ApprovedByUserId == "admin-1");
        replay.RuleProposals.Should().ContainSingle(x => x.ProposalName == "Containment Rule");
        replay.DeploymentRecommendations.Should().ContainSingle(x => x.TargetEnvironment == "prod");
        replay.Feedback.Should().ContainSingle(x => x.SubmittedByUserId == "lead-1");
        replay.SourceReliabilityProfiles.Should().ContainSingle(x => x.SourceSystem == "edr");
        replay.DecisionTraces.Should().ContainSingle(x => x.ModelVersion == "model-v1");
        replay.AuditTrail.Should().ContainSingle(x => x.EntityType == nameof(CtiDecision));
    }

    [Fact]
    public async Task GetCaseDecisionBundleAsync_RespectsDecisionCutoffToPreventFutureLeakage()
    {
        await using var dbContext = CreateContext();
        var nowUtc = new DateTimeOffset(2026, 03, 12, 11, 00, 00, TimeSpan.Zero);

        var ctiCase = CtiCase.Create(
            "Case B",
            "Leakage check",
            "analyst-2",
            CaseState.RecommendationReady,
            "analyst-2",
            nowUtc.AddHours(-3));

        var reliability = CtiSourceReliabilityProfile.Create(
            "siem",
            0.88m,
            0.76m,
            0.82m,
            nowUtc.AddDays(-3),
            null,
            "system",
            nowUtc.AddDays(-3));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-002",
            nowUtc.AddMinutes(-90),
            nowUtc.AddHours(-6),
            nowUtc.AddMinutes(-90),
            "feature-pipeline",
            "system",
            nowUtc.AddMinutes(-90));

        var decisionTime = nowUtc.AddMinutes(-60);
        var decision = CtiDecision.Create(
            ctiCase.Id,
            snapshot.Id,
            null,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            "escalate",
            "Escalate to incident commander",
            snapshot.SnapshotHash,
            "model-v2",
            "policy-v8",
            "lineage-hash-2",
            "policy-engine",
            decisionTime);

        var decisionBundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            NextBestEvidenceType.SourceCorroboration,
            "escalate",
            "Escalate to incident commander",
            "Obtain corroboration from a high-trust independent source.",
            "Source trust profile requires corroboration before high-risk rollout.",
            snapshot.SnapshotHash,
            "model-v2",
            "policy-v8",
            "lineage-hash-2",
            "policy-engine",
            decisionTime);

        var evidence = CtiEvidenceAssertion.Create(
            ctiCase.Id,
            reliability.Id,
            "ev-ref-2",
            "host",
            "Privilege escalation attempt",
            0.91m,
            false,
            "siem:event-9",
            nowUtc.AddMinutes(-80),
            "analyst-2",
            nowUtc.AddMinutes(-79));

        var futureEvidence = CtiEvidenceAssertion.Create(
            ctiCase.Id,
            reliability.Id,
            "ev-ref-3",
            "host",
            "Post-decision observation",
            0.80m,
            false,
            "siem:event-10",
            nowUtc.AddMinutes(-55),
            "analyst-2",
            nowUtc.AddMinutes(-54));

        var beforeDecisionRef = CtiDecisionEvidenceReference.Create(decision.Id, evidence.Id, decisionTime);
        var afterDecisionRef = CtiDecisionEvidenceReference.Create(decision.Id, futureEvidence.Id, decisionTime.AddMinutes(10));
        var beforePolicy = CtiPolicyVersionReference.Create(snapshot.Id, "policy-v8", "policy-hash-8", decisionTime.AddMinutes(-1));
        var afterPolicy = CtiPolicyVersionReference.Create(snapshot.Id, "policy-v9", "policy-hash-9", decisionTime.AddMinutes(5));
        var beforeTrace = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-v2",
            0.62m,
            0.58m,
            0.71m,
            0.26m,
            "Trace before cutoff",
            "trace-before",
            decisionTime.AddMinutes(-2),
            "policy-engine",
            decisionTime.AddMinutes(-2));
        var afterTrace = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-v3",
            0.65m,
            0.61m,
            0.74m,
            0.29m,
            "Trace after cutoff",
            "trace-after",
            decisionTime.AddMinutes(3),
            "policy-engine",
            decisionTime.AddMinutes(3));
        var beforeAudit = CtiAuditRecord.Create(
            ctiCase.Id,
            decision.Id,
            "policy-engine",
            "append",
            nameof(CtiDecision),
            decision.Id.ToString("N"),
            "AUDIT-BEFORE",
            "corr-2",
            decisionTime.AddMinutes(-1));
        var afterAudit = CtiAuditRecord.Create(
            ctiCase.Id,
            decision.Id,
            "policy-engine",
            "append",
            nameof(CtiDecision),
            decision.Id.ToString("N"),
            "AUDIT-AFTER",
            "corr-2",
            decisionTime.AddMinutes(5));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiSourceReliabilityProfiles.Add(reliability);
        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(decisionBundle);
        dbContext.CtiEvidenceAssertions.AddRange(evidence, futureEvidence);
        dbContext.CtiDecisionEvidenceReferences.AddRange(beforeDecisionRef, afterDecisionRef);
        dbContext.CtiPolicyVersionReferences.AddRange(beforePolicy, afterPolicy);
        dbContext.CtiModelDecisionTraces.AddRange(beforeTrace, afterTrace);
        dbContext.CtiAuditRecords.AddRange(beforeAudit, afterAudit);
        await dbContext.SaveChangesAsync();

        var service = new CtiDecisionReplayQueryService(dbContext);
        var replay = await service.GetCaseDecisionBundleAsync(ctiCase.Id, decisionBundle.Id, nowUtc, CancellationToken.None);

        replay.Should().NotBeNull();
        replay!.EvidenceReferences.Should().HaveCount(1);
        replay.EvidenceReferences.Single().ReferencedAtUtc.Should().Be(decisionTime);
        replay.PolicyVersionRefs.Should().ContainSingle(x => x.PolicyVersion == "policy-v8");
        replay.PolicyVersionRefs.Should().NotContain(x => x.PolicyVersion == "policy-v9");
        replay.DecisionTraces.Should().ContainSingle(x => x.RawOutputHash == "trace-before");
        replay.DecisionTraces.Should().NotContain(x => x.RawOutputHash == "trace-after");
        replay.AuditTrail.Should().ContainSingle(x => x.PayloadHash == "AUDIT-BEFORE");
        replay.AuditTrail.Should().NotContain(x => x.PayloadHash == "AUDIT-AFTER");
    }

    [Fact]
    public async Task GetCaseDecisionBundleAsync_ReturnsNull_WhenDecisionSnapshotHashDoesNotMatchSnapshotRecord()
    {
        await using var dbContext = CreateContext();
        var nowUtc = new DateTimeOffset(2026, 03, 12, 12, 00, 00, TimeSpan.Zero);

        var ctiCase = CtiCase.Create(
            "Case C",
            "Snapshot mismatch check",
            "analyst-3",
            CaseState.RecommendationReady,
            "analyst-3",
            nowUtc.AddHours(-4));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-real",
            nowUtc.AddMinutes(-30),
            nowUtc.AddHours(-4),
            nowUtc.AddMinutes(-30),
            "feature-pipeline",
            "system",
            nowUtc.AddMinutes(-30));

        var decision = CtiDecision.Create(
            ctiCase.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            "contain",
            "Contain host",
            "snap-other",
            "model-v3",
            "policy-v9",
            "lineage-hash-9",
            "policy-engine",
            nowUtc.AddMinutes(-20));

        var decisionBundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            NextBestEvidenceType.PostActionValidation,
            "contain",
            "Contain host",
            "Collect post-action validation telemetry and user impact signals.",
            "Containment should be validated with follow-up telemetry.",
            "snap-other",
            "model-v3",
            "policy-v9",
            "lineage-hash-9",
            "policy-engine",
            nowUtc.AddMinutes(-20));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(decisionBundle);
        await dbContext.SaveChangesAsync();

        var service = new CtiDecisionReplayQueryService(dbContext);
        var replay = await service.GetCaseDecisionBundleAsync(ctiCase.Id, decisionBundle.Id, nowUtc, CancellationToken.None);

        replay.Should().BeNull();
    }

    [Fact]
    public async Task GetCaseDecisionBundleAsync_ExcludesFutureGraphArtifactsModelRefsAndDecisionTraces()
    {
        await using var dbContext = CreateContext();
        var nowUtc = new DateTimeOffset(2026, 03, 12, 13, 00, 00, TimeSpan.Zero);
        var decisionTime = nowUtc.AddMinutes(-20);

        var ctiCase = CtiCase.Create(
            "Case D",
            "Future leakage protection",
            "analyst-4",
            CaseState.AwaitingApproval,
            "analyst-4",
            nowUtc.AddHours(-5));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-004",
            nowUtc.AddMinutes(-40),
            nowUtc.AddHours(-5),
            nowUtc.AddMinutes(-40),
            "feature-pipeline",
            "system",
            nowUtc.AddMinutes(-40));

        var decision = CtiDecision.Create(
            ctiCase.Id,
            snapshot.Id,
            null,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            "escalate",
            "Escalate due high risk",
            snapshot.SnapshotHash,
            "model-v4",
            "policy-v10",
            "lineage-hash-10",
            "policy-engine",
            decisionTime);

        var decisionBundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            NextBestEvidenceType.UncertaintyReduction,
            "escalate",
            "Escalate due high risk",
            "Run controlled detonation and behavior replay to reduce uncertainty.",
            "Escalation still benefits from uncertainty reduction evidence.",
            snapshot.SnapshotHash,
            "model-v4",
            "policy-v10",
            "lineage-hash-10",
            "policy-engine",
            decisionTime);

        var graphBefore = CtiGraphArtifactReference.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            "subgraph",
            "s3://cti/graph-before",
            "artifact-before",
            "graph-job",
            decisionTime.AddMinutes(-1),
            "system",
            decisionTime.AddMinutes(-1));

        var graphAfter = CtiGraphArtifactReference.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            "subgraph",
            "s3://cti/graph-after",
            "artifact-after",
            "graph-job",
            decisionTime.AddMinutes(3),
            "system",
            decisionTime.AddMinutes(3));

        var modelBefore = CtiModelVersionReference.Create(snapshot.Id, "gcn", "model-v4", "model-hash-before", decisionTime.AddMinutes(-2));
        var modelAfter = CtiModelVersionReference.Create(snapshot.Id, "gcn", "model-v5", "model-hash-after", decisionTime.AddMinutes(4));
        var traceBefore = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-v4",
            0.68m,
            0.57m,
            0.73m,
            0.21m,
            "Trace before cutoff",
            "trace-before-4",
            decisionTime.AddMinutes(-1),
            "policy-engine",
            decisionTime.AddMinutes(-1));
        var traceAfter = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-v5",
            0.70m,
            0.62m,
            0.76m,
            0.25m,
            "Trace after cutoff",
            "trace-after-4",
            decisionTime.AddMinutes(5),
            "policy-engine",
            decisionTime.AddMinutes(5));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(decisionBundle);
        dbContext.CtiGraphArtifactReferences.AddRange(graphBefore, graphAfter);
        dbContext.CtiModelVersionReferences.AddRange(modelBefore, modelAfter);
        dbContext.CtiModelDecisionTraces.AddRange(traceBefore, traceAfter);
        await dbContext.SaveChangesAsync();

        var service = new CtiDecisionReplayQueryService(dbContext);
        var replay = await service.GetCaseDecisionBundleAsync(ctiCase.Id, decisionBundle.Id, nowUtc, CancellationToken.None);

        replay.Should().NotBeNull();
        replay!.GraphArtifacts.Should().ContainSingle(x => x.ArtifactHash == "artifact-before");
        replay.GraphArtifacts.Should().NotContain(x => x.ArtifactHash == "artifact-after");
        replay.ModelVersionRefs.Should().ContainSingle(x => x.ModelVersion == "model-v4");
        replay.ModelVersionRefs.Should().NotContain(x => x.ModelVersion == "model-v5");
        replay.DecisionTraces.Should().ContainSingle(x => x.RawOutputHash == "trace-before-4");
        replay.DecisionTraces.Should().NotContain(x => x.RawOutputHash == "trace-after-4");
    }

    [Fact]
    public async Task ListCaseDecisionBundlesAsOfAsync_ReturnsChronologicalBacktestWindow()
    {
        await using var dbContext = CreateContext();
        var nowUtc = new DateTimeOffset(2026, 03, 12, 14, 00, 00, TimeSpan.Zero);

        var ctiCase = CtiCase.Create(
            "Case E",
            "Backtesting window",
            "analyst-5",
            CaseState.RecommendationReady,
            "analyst-5",
            nowUtc.AddHours(-6));

        var snapshotA = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-005a",
            nowUtc.AddHours(-3),
            nowUtc.AddHours(-8),
            nowUtc.AddHours(-3),
            "feature-pipeline",
            "system",
            nowUtc.AddHours(-3));

        var decisionA = CtiDecision.Create(
            ctiCase.Id,
            snapshotA.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            "monitor",
            "Monitor only",
            snapshotA.SnapshotHash,
            "model-a",
            "policy-a",
            "lineage-a",
            "policy-engine",
            nowUtc.AddHours(-2));

        var bundleA = CtiDecisionBundle.Create(
            ctiCase.Id,
            decisionA.Id,
            snapshotA.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            NextBestEvidenceType.UncertaintyReduction,
            "monitor",
            "Monitor only",
            "Collect additional telemetry.",
            "Insufficient confidence for stronger action.",
            snapshotA.SnapshotHash,
            "model-a",
            "policy-a",
            "lineage-a",
            "policy-engine",
            nowUtc.AddHours(-2));

        var snapshotB = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-005b",
            nowUtc.AddMinutes(-50),
            nowUtc.AddHours(-5),
            nowUtc.AddMinutes(-50),
            "feature-pipeline",
            "system",
            nowUtc.AddMinutes(-50));

        var decisionB = CtiDecision.Create(
            ctiCase.Id,
            snapshotB.Id,
            decisionA.Id,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            "escalate",
            "Escalate after additional signals",
            snapshotB.SnapshotHash,
            "model-b",
            "policy-b",
            "lineage-b",
            "policy-engine",
            nowUtc.AddMinutes(-40));

        var bundleB = CtiDecisionBundle.Create(
            ctiCase.Id,
            decisionB.Id,
            snapshotB.Id,
            bundleA.Id,
            DecisionState.Escalate,
            ApprovalTier.Admin,
            NextBestEvidenceType.SourceCorroboration,
            "escalate",
            "Escalate after additional signals",
            "Obtain independent corroboration.",
            "Signals crossed escalation threshold.",
            snapshotB.SnapshotHash,
            "model-b",
            "policy-b",
            "lineage-b",
            "policy-engine",
            nowUtc.AddMinutes(-40));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiFeatureSnapshots.AddRange(snapshotA, snapshotB);
        dbContext.CtiDecisions.AddRange(decisionA, decisionB);
        dbContext.CtiDecisionBundles.AddRange(bundleA, bundleB);
        await dbContext.SaveChangesAsync();

        var service = new CtiDecisionReplayQueryService(dbContext);

        var earlyWindow = await service.ListCaseDecisionBundlesAsOfAsync(ctiCase.Id, nowUtc.AddHours(-1), CancellationToken.None);
        earlyWindow.Should().HaveCount(1);
        earlyWindow.Single().DecisionBundle.Id.Should().Be(bundleA.Id);

        var fullWindow = await service.ListCaseDecisionBundlesAsOfAsync(ctiCase.Id, nowUtc, CancellationToken.None);
        fullWindow.Should().HaveCount(2);
        fullWindow.Select(x => x.DecisionBundle.Id).Should().ContainInOrder(bundleA.Id, bundleB.Id);
    }

    private static CtiDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new CtiDbContext(options);
    }
}
