namespace Backend.Application.Abstractions.Persistence;

public interface ICtiDecisionReplayQueryService
{
    Task<CtiDecisionReplayBundle?> GetCaseDecisionBundleAsync(
        Guid caseId,
        Guid decisionBundleId,
        DateTimeOffset? asOfUtc,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CtiDecisionReplayBundle>> ListCaseDecisionBundlesAsOfAsync(
        Guid caseId,
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken);
}

public sealed record CtiDecisionReplayBundle(
    CtiReplayCase Case,
    CtiReplayDecisionBundle DecisionBundle,
    CtiReplayFeatureSnapshot Snapshot,
    IReadOnlyList<CtiReplayEvidenceReference> EvidenceReferences,
    IReadOnlyList<CtiReplayLineageReference> TransformationLineage,
    IReadOnlyList<CtiReplayGraphArtifactReference> GraphArtifacts,
    IReadOnlyList<CtiReplayFeatureVector> FeatureVectors,
    IReadOnlyList<CtiReplayGraphDerivedFeature> GraphDerivedFeatures,
    IReadOnlyList<CtiReplayAssetCriticalityValue> AssetCriticalityValues,
    IReadOnlyList<CtiReplaySourceTrustValue> SourceTrustValues,
    IReadOnlyList<CtiReplayPolicyVersionRef> PolicyVersionRefs,
    IReadOnlyList<CtiReplayModelVersionRef> ModelVersionRefs,
    IReadOnlyList<CtiReplayApproval> Approvals,
    IReadOnlyList<CtiReplayRuleProposal> RuleProposals,
    IReadOnlyList<CtiReplayDeploymentRecommendation> DeploymentRecommendations,
    IReadOnlyList<CtiReplayFeedback> Feedback,
    IReadOnlyList<CtiReplaySourceReliabilityProfile> SourceReliabilityProfiles,
    IReadOnlyList<CtiReplayDecisionTrace> DecisionTraces,
    IReadOnlyList<CtiReplayAuditRecord> AuditTrail);

public sealed record CtiReplayCase(
    Guid Id,
    string Title,
    string Summary,
    string OwnerUserId,
    string State,
    Guid? ParentCaseId,
    Guid? MergedIntoCaseId,
    string? MergeReason,
    DateTimeOffset OpenedAtUtc,
    DateTimeOffset? ClosedAtUtc);

public sealed record CtiReplayDecisionBundle(
    Guid Id,
    Guid DecisionId,
    Guid? SupersedesDecisionBundleId,
    string DecisionState,
    string ApprovalTierRequired,
    string NextBestEvidenceType,
    string NextBestEvidenceRequest,
    string NextBestEvidenceRationale,
    string RecommendationCode,
    string RecommendationSummary,
    string SnapshotHash,
    string ModelVersion,
    string PolicyVersion,
    string TransformationLineageHash,
    DateTimeOffset DecidedAtUtc);

public sealed record CtiReplayFeatureSnapshot(
    Guid Id,
    string SnapshotHash,
    DateTimeOffset CapturedAtUtc,
    DateTimeOffset FeatureWindowStartUtc,
    DateTimeOffset FeatureWindowEndUtc,
    string CapturedByPipeline);

public sealed record CtiReplayEvidenceReference(
    Guid EvidenceAssertionId,
    Guid SourceReliabilityProfileId,
    string EvidenceReference,
    string AssertionType,
    string Statement,
    decimal Confidence,
    bool IsConflicting,
    string SourceReference,
    DateTimeOffset ObservedAtUtc,
    DateTimeOffset ReferencedAtUtc);

public sealed record CtiReplayLineageReference(
    Guid LineageRecordId,
    Guid SourceCaseId,
    Guid TargetCaseId,
    string Relationship,
    string Rationale,
    DateTimeOffset RecordedAtUtc,
    DateTimeOffset ReferencedAtUtc);

public sealed record CtiReplayGraphArtifactReference(
    Guid Id,
    string ArtifactType,
    string StorageUri,
    string ArtifactHash,
    string ProducedBy,
    DateTimeOffset GeneratedAtUtc);

public sealed record CtiReplayFeatureVector(string FeatureName, decimal NumericValue, string? Unit, string Source);

public sealed record CtiReplayGraphDerivedFeature(string MetricName, decimal MetricValue, string? MetricUnit, Guid? GraphArtifactReferenceId);

public sealed record CtiReplayAssetCriticalityValue(string AssetKey, string Criticality, decimal CriticalityScore);

public sealed record CtiReplaySourceTrustValue(string SourceSystem, decimal TrustScore, decimal HistoricalPrecision, decimal HistoricalRecall);

public sealed record CtiReplayPolicyVersionRef(string PolicyVersion, string PolicyHash, DateTimeOffset PublishedAtUtc);

public sealed record CtiReplayModelVersionRef(string ModelName, string ModelVersion, string ModelHash, DateTimeOffset TrainedAtUtc);

public sealed record CtiReplayApproval(
    Guid Id,
    string RequiredTier,
    string ApprovedTier,
    string ApprovedByUserId,
    string? Notes,
    DateTimeOffset ApprovedAtUtc);

public sealed record CtiReplayRuleProposal(
    Guid Id,
    Guid? DecisionId,
    string ProposalName,
    string RuleFamily,
    string ProposedVersion,
    string ProposedByUserId,
    string Rationale,
    DateTimeOffset ProposedAtUtc);

public sealed record CtiReplayDeploymentRecommendation(
    Guid Id,
    Guid? RuleProposalId,
    string TargetEnvironment,
    string RecommendedRolloutMode,
    decimal RiskScore,
    bool RequiresHumanApproval,
    string RequestedByUserId,
    string Rationale,
    DateTimeOffset RecommendedAtUtc);

public sealed record CtiReplayFeedback(
    Guid Id,
    Guid? DecisionId,
    string Verdict,
    string Notes,
    string SubmittedByUserId,
    DateTimeOffset SubmittedAtUtc);

public sealed record CtiReplaySourceReliabilityProfile(
    Guid Id,
    string SourceSystem,
    decimal HistoricalPrecision,
    decimal HistoricalRecall,
    decimal TrustScore,
    DateTimeOffset EffectiveFromUtc,
    DateTimeOffset? EffectiveToUtc);

public sealed record CtiReplayDecisionTrace(
    Guid Id,
    string ModelName,
    string ModelVersion,
    decimal MaliciousnessScore,
    decimal ActionabilityScore,
    decimal DeployabilityScore,
    decimal UncertaintyScore,
    string ReasoningSummary,
    string RawOutputHash,
    DateTimeOffset TracedAtUtc);

public sealed record CtiReplayAuditRecord(
    Guid Id,
    Guid? CaseId,
    Guid? DecisionId,
    string ActorUserId,
    string ActionType,
    string EntityType,
    string EntityKey,
    string PayloadHash,
    string? CorrelationId,
    DateTimeOffset OccurredAtUtc);
