using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure.Persistence;

public sealed class CtiRecommendationPersistenceRepositoryTests
{
    [Fact]
    public async Task AppendRecommendationPackageAsync_PersistsPackageAndWritesAuditTrail()
    {
        await using var dbContext = CreateContext();
        var repository = new CtiRecommendationPersistenceRepository(dbContext);
        var package = BuildPackage(DateTimeOffset.UtcNow);

        await repository.AppendRecommendationPackageAsync(package, CancellationToken.None);

        dbContext.CtiCases.Should().HaveCount(1);
        dbContext.CtiSourceReliabilityProfiles.Should().HaveCount(1);
        dbContext.CtiFeatureSnapshots.Should().HaveCount(1);
        dbContext.CtiDecisions.Should().HaveCount(1);
        dbContext.CtiDecisionBundles.Should().HaveCount(1);
        dbContext.CtiEvidenceAssertions.Should().HaveCount(1);
        dbContext.CtiDecisionEvidenceReferences.Should().HaveCount(1);
        dbContext.CtiTransformationLineageRecords.Should().HaveCount(1);
        dbContext.CtiDecisionLineageReferences.Should().HaveCount(1);
        dbContext.CtiApprovals.Should().HaveCount(1);
        dbContext.CtiRuleProposals.Should().HaveCount(1);
        dbContext.CtiDeploymentRecommendations.Should().HaveCount(1);
        dbContext.CtiFeedback.Should().HaveCount(1);
        dbContext.CtiGraphArtifactReferences.Should().HaveCount(1);
        dbContext.CtiFeatureVectors.Should().HaveCount(1);
        dbContext.CtiGraphDerivedFeatures.Should().HaveCount(1);
        dbContext.CtiAssetCriticalitySnapshotValues.Should().HaveCount(1);
        dbContext.CtiSourceTrustSnapshotValues.Should().HaveCount(1);
        dbContext.CtiPolicyVersionReferences.Should().HaveCount(1);
        dbContext.CtiModelVersionReferences.Should().HaveCount(1);
        dbContext.CtiModelDecisionTraces.Should().HaveCount(1);
        dbContext.CtiAuditRecords.Should().HaveCount(21);
        dbContext.CtiAuditRecords.Should().OnlyContain(x => x.CorrelationId == package.CorrelationId);
    }

    [Fact]
    public async Task AppendRecommendationPackageAsync_Throws_WhenPackageIdsDoNotAlign()
    {
        await using var dbContext = CreateContext();
        var repository = new CtiRecommendationPersistenceRepository(dbContext);
        var package = BuildPackage(DateTimeOffset.UtcNow);
        var mismatchedCase = CtiCase.Create(
            "Mismatch",
            "Mismatched case id",
            "analyst-mismatch",
            CaseState.Open,
            "analyst-mismatch",
            DateTimeOffset.UtcNow.AddHours(-1));
        package = package with { Case = mismatchedCase };

        var action = async () => await repository.AppendRecommendationPackageAsync(package, CancellationToken.None);
        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*package case*");
    }

    private static CtiRecommendationPersistencePackage BuildPackage(DateTimeOffset nowUtc)
    {
        var ctiCase = CtiCase.Create(
            "Append Case",
            "Atomic append package",
            "analyst-append",
            CaseState.AwaitingApproval,
            "analyst-append",
            nowUtc.AddHours(-4));

        var reliability = CtiSourceReliabilityProfile.Create(
            "edr",
            0.91m,
            0.84m,
            0.88m,
            nowUtc.AddDays(-2),
            null,
            "system",
            nowUtc.AddDays(-2));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-append",
            nowUtc.AddHours(-2),
            nowUtc.AddHours(-8),
            nowUtc.AddHours(-2),
            "feature-pipeline",
            "system",
            nowUtc.AddHours(-2));

        var decision = CtiDecision.Create(
            ctiCase.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            "contain",
            "Contain and observe",
            snapshot.SnapshotHash,
            "model-append",
            "policy-append",
            "lineage-append",
            "policy-engine",
            nowUtc.AddHours(-1));

        var bundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            NextBestEvidenceType.SourceCorroboration,
            "contain",
            "Contain and observe",
            "Corroborate with independent source.",
            "Corroboration required before promote.",
            snapshot.SnapshotHash,
            "model-append",
            "policy-append",
            "lineage-append",
            "policy-engine",
            nowUtc.AddHours(-1));

        var evidence = CtiEvidenceAssertion.Create(
            ctiCase.Id,
            reliability.Id,
            "ev-append-1",
            "network",
            "Suspicious DNS beaconing",
            0.92m,
            false,
            "edr:event-append",
            nowUtc.AddHours(-3),
            "analyst-append",
            nowUtc.AddHours(-3));

        var evidenceReference = CtiDecisionEvidenceReference.Create(decision.Id, evidence.Id, nowUtc.AddHours(-1));
        var lineage = CtiTransformationLineageRecord.Create(
            ctiCase.Id,
            ctiCase.Id,
            Guid.NewGuid(),
            "split",
            "Split noisy branch",
            "analyst-append",
            nowUtc.AddHours(-2));
        var lineageReference = CtiDecisionLineageReference.Create(decision.Id, lineage.Id, nowUtc.AddHours(-1));

        var approval = CtiApproval.Create(
            ctiCase.Id,
            decision.Id,
            ApprovalTier.Lead,
            ApprovalTier.Admin,
            "admin-append",
            "Approved for controlled rollout.",
            nowUtc.AddMinutes(-50));

        var ruleProposal = CtiRuleProposal.Create(
            ctiCase.Id,
            decision.Id,
            "Append Rule Proposal",
            "sigma",
            "rule body append",
            "v1",
            "analyst-append",
            "Containment aligned with policy.",
            nowUtc.AddMinutes(-45));

        var deployment = CtiDeploymentRecommendation.Create(
            ctiCase.Id,
            decision.Id,
            ruleProposal.Id,
            "prod",
            RolloutMode.Canary,
            0.36m,
            true,
            "analyst-append",
            "Canary rollout only.",
            nowUtc.AddMinutes(-40));

        var feedback = CtiFeedback.Create(
            ctiCase.Id,
            decision.Id,
            Backend.Domain.Common.FeedbackVerdict.Malicious,
            Backend.Domain.Common.FeedbackAuxiliaryOutputs.CreateDefaults(Backend.Domain.Common.FeedbackVerdict.Malicious),
            "Post-action evidence confirms threat.",
            "lead-append",
            nowUtc.AddMinutes(-35));

        var graphArtifact = CtiGraphArtifactReference.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            "subgraph",
            "s3://cti/append-graph",
            "artifact-append",
            "graph-job",
            nowUtc.AddHours(-1),
            "system",
            nowUtc.AddHours(-1));

        var featureVector = CtiFeatureVector.Create(snapshot.Id, "pagerank", 0.71m, null, "graph");
        var graphFeature = CtiGraphDerivedFeature.Create(snapshot.Id, graphArtifact.Id, "betweenness", 0.32m, null);
        var criticality = CtiAssetCriticalitySnapshotValue.Create(snapshot.Id, "asset-append", AssetCriticality.High, 0.81m);
        var trust = CtiSourceTrustSnapshotValue.Create(snapshot.Id, "edr", 0.88m, 0.91m, 0.84m);
        var policyRef = CtiPolicyVersionReference.Create(snapshot.Id, "policy-append", "policy-hash-append", nowUtc.AddHours(-2));
        var modelRef = CtiModelVersionReference.Create(snapshot.Id, "gcn", "model-append", "model-hash-append", nowUtc.AddDays(-7));
        var trace = CtiModelDecisionTrace.Create(
            decision.Id,
            snapshot.Id,
            "gcn",
            "model-append",
            0.74m,
            0.62m,
            0.67m,
            0.24m,
            "Deterministic append trace",
            "trace-hash-append",
            nowUtc.AddMinutes(-59),
            "policy-engine",
            nowUtc.AddMinutes(-59));

        return new CtiRecommendationPersistencePackage(
            ctiCase,
            snapshot,
            decision,
            bundle,
            "corr-append",
            SourceReliabilityProfiles: [reliability],
            EvidenceAssertions: [evidence],
            DecisionEvidenceReferences: [evidenceReference],
            TransformationLineageRecords: [lineage],
            DecisionLineageReferences: [lineageReference],
            Approvals: [approval],
            RuleProposals: [ruleProposal],
            DeploymentRecommendations: [deployment],
            FeedbackItems: [feedback],
            GraphArtifactReferences: [graphArtifact],
            FeatureVectors: [featureVector],
            GraphDerivedFeatures: [graphFeature],
            AssetCriticalitySnapshotValues: [criticality],
            SourceTrustSnapshotValues: [trust],
            PolicyVersionReferences: [policyRef],
            ModelVersionReferences: [modelRef],
            ModelDecisionTraces: [trace]);
    }

    private static CtiDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new CtiDbContext(options);
    }
}
