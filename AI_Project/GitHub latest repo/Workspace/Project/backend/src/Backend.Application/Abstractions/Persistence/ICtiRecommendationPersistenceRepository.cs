using Backend.Domain.Cti.V1.Persistence;

namespace Backend.Application.Abstractions.Persistence;

public interface ICtiRecommendationPersistenceRepository
{
    Task AppendRecommendationPackageAsync(
        CtiRecommendationPersistencePackage package,
        CancellationToken cancellationToken);
}

public sealed record CtiRecommendationPersistencePackage(
    CtiCase Case,
    CtiFeatureSnapshot FeatureSnapshot,
    CtiDecision Decision,
    CtiDecisionBundle DecisionBundle,
    string CorrelationId,
    IReadOnlyList<CtiSourceReliabilityProfile>? SourceReliabilityProfiles = null,
    IReadOnlyList<CtiEvidenceAssertion>? EvidenceAssertions = null,
    IReadOnlyList<CtiDecisionEvidenceReference>? DecisionEvidenceReferences = null,
    IReadOnlyList<CtiTransformationLineageRecord>? TransformationLineageRecords = null,
    IReadOnlyList<CtiDecisionLineageReference>? DecisionLineageReferences = null,
    IReadOnlyList<CtiApproval>? Approvals = null,
    IReadOnlyList<CtiRuleProposal>? RuleProposals = null,
    IReadOnlyList<CtiDeploymentRecommendation>? DeploymentRecommendations = null,
    IReadOnlyList<CtiFeedback>? FeedbackItems = null,
    IReadOnlyList<CtiGraphArtifactReference>? GraphArtifactReferences = null,
    IReadOnlyList<CtiFeatureVector>? FeatureVectors = null,
    IReadOnlyList<CtiGraphDerivedFeature>? GraphDerivedFeatures = null,
    IReadOnlyList<CtiAssetCriticalitySnapshotValue>? AssetCriticalitySnapshotValues = null,
    IReadOnlyList<CtiSourceTrustSnapshotValue>? SourceTrustSnapshotValues = null,
    IReadOnlyList<CtiPolicyVersionReference>? PolicyVersionReferences = null,
    IReadOnlyList<CtiModelVersionReference>? ModelVersionReferences = null,
    IReadOnlyList<CtiModelDecisionTrace>? ModelDecisionTraces = null);
