using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cti.V1.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.QueryServices;

public sealed class CtiDecisionReplayQueryService : ICtiDecisionReplayQueryService
{
    private static readonly TimeSpan DecisionCaptureSkew = TimeSpan.FromMinutes(2);
    private readonly CtiDbContext _dbContext;

    public CtiDecisionReplayQueryService(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CtiDecisionReplayBundle?> GetCaseDecisionBundleAsync(
        Guid caseId,
        Guid decisionBundleId,
        DateTimeOffset? asOfUtc,
        CancellationToken cancellationToken)
    {
        var bundleQuery = _dbContext.CtiDecisionBundles
            .AsNoTracking()
            .Where(x => x.Id == decisionBundleId && x.CaseId == caseId);

        if (asOfUtc.HasValue)
        {
            bundleQuery = bundleQuery.Where(x => x.DecidedAtUtc <= asOfUtc.Value);
        }

        var bundle = await bundleQuery.SingleOrDefaultAsync(cancellationToken);
        if (bundle is null)
        {
            return null;
        }

        var decisionCutoffUtc = bundle.DecidedAtUtc;
        var replayCutoffUtc = asOfUtc ?? decisionCutoffUtc;

        return await BuildReplayBundleAsync(caseId, bundle, decisionCutoffUtc, replayCutoffUtc, cancellationToken);
    }

    public async Task<IReadOnlyList<CtiDecisionReplayBundle>> ListCaseDecisionBundlesAsOfAsync(
        Guid caseId,
        DateTimeOffset asOfUtc,
        CancellationToken cancellationToken)
    {
        var bundles = await _dbContext.CtiDecisionBundles
            .AsNoTracking()
            .Where(x => x.CaseId == caseId && x.DecidedAtUtc <= asOfUtc)
            .OrderBy(x => x.DecidedAtUtc)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        var replayBundles = new List<CtiDecisionReplayBundle>(bundles.Count);
        foreach (var bundle in bundles)
        {
            var decisionCutoffUtc = bundle.DecidedAtUtc;
            var replay = await BuildReplayBundleAsync(caseId, bundle, decisionCutoffUtc, asOfUtc, cancellationToken);
            if (replay is not null)
            {
                replayBundles.Add(replay);
            }
        }

        return replayBundles;
    }

    private async Task<CtiDecisionReplayBundle?> BuildReplayBundleAsync(
        Guid caseId,
        CtiDecisionBundle bundle,
        DateTimeOffset decisionCutoffUtc,
        DateTimeOffset replayCutoffUtc,
        CancellationToken cancellationToken)
    {
        var decisionCaptureCutoffUtc = decisionCutoffUtc.Add(DecisionCaptureSkew);

        var caseRecord = await _dbContext.CtiCases
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == caseId && x.OpenedAtUtc <= decisionCutoffUtc, cancellationToken);
        if (caseRecord is null)
        {
            return null;
        }

        var snapshot = await _dbContext.CtiFeatureSnapshots
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == bundle.FeatureSnapshotId
                    && x.CapturedAtUtc <= decisionCutoffUtc
                    && x.FeatureWindowEndUtc <= decisionCutoffUtc
                    && x.SnapshotHash == bundle.SnapshotHash,
                cancellationToken);

        if (snapshot is null)
        {
            return null;
        }

        var evidenceRows = await (
            from reference in _dbContext.CtiDecisionEvidenceReferences.AsNoTracking()
            join evidence in _dbContext.CtiEvidenceAssertions.AsNoTracking() on reference.EvidenceAssertionId equals evidence.Id
            join sourceProfile in _dbContext.CtiSourceReliabilityProfiles.AsNoTracking() on evidence.SourceReliabilityProfileId equals sourceProfile.Id
            where reference.DecisionId == bundle.DecisionId
                && reference.ReferencedAtUtc <= decisionCutoffUtc
                && evidence.ObservedAtUtc <= decisionCutoffUtc
            orderby reference.ReferencedAtUtc, evidence.ObservedAtUtc
            select new
            {
                evidence.SourceReliabilityProfileId,
                sourceProfile.SourceSystem,
                ReplayItem = new CtiReplayEvidenceReference(
                    evidence.Id,
                    evidence.SourceReliabilityProfileId,
                    evidence.EvidenceReference,
                    evidence.AssertionType,
                    evidence.Statement,
                    evidence.Confidence,
                    evidence.IsConflicting,
                    evidence.SourceReference,
                    evidence.ObservedAtUtc,
                    reference.ReferencedAtUtc),
            }).ToListAsync(cancellationToken);

        var evidenceReferences = evidenceRows.Select(x => x.ReplayItem).ToList();
        var sourceSystems = evidenceRows
            .Select(x => x.SourceSystem)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var lineageReferences = await (
            from reference in _dbContext.CtiDecisionLineageReferences.AsNoTracking()
            join lineage in _dbContext.CtiTransformationLineageRecords.AsNoTracking() on reference.LineageRecordId equals lineage.Id
            where reference.DecisionId == bundle.DecisionId
                && reference.ReferencedAtUtc <= decisionCutoffUtc
                && lineage.RecordedAtUtc <= decisionCutoffUtc
            orderby lineage.RecordedAtUtc
            select new CtiReplayLineageReference(
                lineage.Id,
                lineage.SourceCaseId,
                lineage.TargetCaseId,
                lineage.Relationship,
                lineage.Rationale,
                lineage.RecordedAtUtc,
                reference.ReferencedAtUtc)).ToListAsync(cancellationToken);

        var graphArtifacts = await _dbContext.CtiGraphArtifactReferences
            .AsNoTracking()
            .Where(x =>
                x.CaseId == caseId
                && x.GeneratedAtUtc <= decisionCutoffUtc
                && (x.DecisionId == bundle.DecisionId || x.FeatureSnapshotId == snapshot.Id))
            .OrderBy(x => x.GeneratedAtUtc)
            .Select(x => new CtiReplayGraphArtifactReference(
                x.Id,
                x.ArtifactType,
                x.StorageUri,
                x.ArtifactHash,
                x.ProducedBy,
                x.GeneratedAtUtc))
            .ToListAsync(cancellationToken);

        var featureVectors = await _dbContext.CtiFeatureVectors
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id)
            .OrderBy(x => x.FeatureName)
            .Select(x => new CtiReplayFeatureVector(x.FeatureName, x.NumericValue, x.Unit, x.Source))
            .ToListAsync(cancellationToken);

        var graphDerivedFeatures = await _dbContext.CtiGraphDerivedFeatures
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id)
            .OrderBy(x => x.MetricName)
            .Select(x => new CtiReplayGraphDerivedFeature(x.MetricName, x.MetricValue, x.MetricUnit, x.GraphArtifactReferenceId))
            .ToListAsync(cancellationToken);

        var assetCriticalityValues = await _dbContext.CtiAssetCriticalitySnapshotValues
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id)
            .OrderBy(x => x.AssetKey)
            .Select(x => new CtiReplayAssetCriticalityValue(
                x.AssetKey,
                x.Criticality.ToString(),
                x.CriticalityScore))
            .ToListAsync(cancellationToken);

        var sourceTrustValues = await _dbContext.CtiSourceTrustSnapshotValues
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id)
            .OrderBy(x => x.SourceSystem)
            .Select(x => new CtiReplaySourceTrustValue(
                x.SourceSystem,
                x.TrustScore,
                x.HistoricalPrecision,
                x.HistoricalRecall))
            .ToListAsync(cancellationToken);

        var policyVersionRefs = await _dbContext.CtiPolicyVersionReferences
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id && x.PublishedAtUtc <= decisionCutoffUtc)
            .OrderBy(x => x.PublishedAtUtc)
            .Select(x => new CtiReplayPolicyVersionRef(x.PolicyVersion, x.PolicyHash, x.PublishedAtUtc))
            .ToListAsync(cancellationToken);

        var modelVersionRefs = await _dbContext.CtiModelVersionReferences
            .AsNoTracking()
            .Where(x => x.FeatureSnapshotId == snapshot.Id && x.TrainedAtUtc <= decisionCutoffUtc)
            .OrderBy(x => x.TrainedAtUtc)
            .Select(x => new CtiReplayModelVersionRef(x.ModelName, x.ModelVersion, x.ModelHash, x.TrainedAtUtc))
            .ToListAsync(cancellationToken);

        var approvals = await _dbContext.CtiApprovals
            .AsNoTracking()
            .Where(x => x.CaseId == caseId && x.DecisionId == bundle.DecisionId && x.ApprovedAtUtc <= replayCutoffUtc)
            .OrderBy(x => x.ApprovedAtUtc)
            .Select(x => new CtiReplayApproval(
                x.Id,
                x.RequiredTier.ToString(),
                x.ApprovedTier.ToString(),
                x.ApprovedByUserId,
                x.Notes,
                x.ApprovedAtUtc))
            .ToListAsync(cancellationToken);

        var ruleProposals = await _dbContext.CtiRuleProposals
            .AsNoTracking()
            .Where(x =>
                x.CaseId == caseId
                && x.ProposedAtUtc <= replayCutoffUtc
                && (!x.DecisionId.HasValue || x.DecisionId == bundle.DecisionId))
            .OrderBy(x => x.ProposedAtUtc)
            .Select(x => new CtiReplayRuleProposal(
                x.Id,
                x.DecisionId,
                x.ProposalName,
                x.RuleFamily,
                x.ProposedVersion,
                x.ProposedByUserId,
                x.Rationale,
                x.ProposedAtUtc))
            .ToListAsync(cancellationToken);

        var deploymentRecommendations = await _dbContext.CtiDeploymentRecommendations
            .AsNoTracking()
            .Where(x => x.CaseId == caseId && x.DecisionId == bundle.DecisionId && x.RecommendedAtUtc <= replayCutoffUtc)
            .OrderBy(x => x.RecommendedAtUtc)
            .Select(x => new CtiReplayDeploymentRecommendation(
                x.Id,
                x.RuleProposalId,
                x.TargetEnvironment,
                x.RecommendedRolloutMode.ToString(),
                x.RiskScore,
                x.RequiresHumanApproval,
                x.RequestedByUserId,
                x.Rationale,
                x.RecommendedAtUtc))
            .ToListAsync(cancellationToken);

        var feedback = await _dbContext.CtiFeedback
            .AsNoTracking()
            .Where(x =>
                x.CaseId == caseId
                && x.SubmittedAtUtc <= replayCutoffUtc
                && (!x.DecisionId.HasValue || x.DecisionId == bundle.DecisionId))
            .OrderBy(x => x.SubmittedAtUtc)
            .Select(x => new CtiReplayFeedback(
                x.Id,
                x.DecisionId,
                x.Verdict.ToString(),
                x.Notes,
                x.SubmittedByUserId,
                x.SubmittedAtUtc))
            .ToListAsync(cancellationToken);

        var sourceReliabilityCandidates = await _dbContext.CtiSourceReliabilityProfiles
            .AsNoTracking()
            .Where(x =>
                sourceSystems.Contains(x.SourceSystem)
                && x.EffectiveFromUtc <= decisionCutoffUtc
                && (!x.EffectiveToUtc.HasValue || x.EffectiveToUtc.Value >= decisionCutoffUtc))
            .OrderByDescending(x => x.EffectiveFromUtc)
            .ToListAsync(cancellationToken);

        var sourceReliabilityProfiles = sourceReliabilityCandidates
            .GroupBy(x => x.SourceSystem, StringComparer.OrdinalIgnoreCase)
            .Select(g => g
                .OrderByDescending(x => x.EffectiveFromUtc)
                .ThenByDescending(x => x.CreatedAtUtc)
                .First())
            .OrderBy(x => x.SourceSystem)
            .Select(x => new CtiReplaySourceReliabilityProfile(
                x.Id,
                x.SourceSystem,
                x.HistoricalPrecision,
                x.HistoricalRecall,
                x.TrustScore,
                x.EffectiveFromUtc,
                x.EffectiveToUtc))
            .ToList();

        var decisionTraces = await _dbContext.CtiModelDecisionTraces
            .AsNoTracking()
            .Where(x =>
                x.DecisionId == bundle.DecisionId
                && x.FeatureSnapshotId == snapshot.Id
                && x.TracedAtUtc <= decisionCaptureCutoffUtc)
            .OrderBy(x => x.TracedAtUtc)
            .Select(x => new CtiReplayDecisionTrace(
                x.Id,
                x.ModelName,
                x.ModelVersion,
                x.MaliciousnessScore,
                x.ActionabilityScore,
                x.DeployabilityScore,
                x.UncertaintyScore,
                x.ReasoningSummary,
                x.RawOutputHash,
                x.TracedAtUtc))
            .ToListAsync(cancellationToken);

        var auditTrail = await _dbContext.CtiAuditRecords
            .AsNoTracking()
            .Where(x =>
                x.CaseId == caseId
                && x.OccurredAtUtc <= decisionCaptureCutoffUtc
                && (!x.DecisionId.HasValue || x.DecisionId == bundle.DecisionId))
            .OrderBy(x => x.OccurredAtUtc)
            .ThenBy(x => x.Id)
            .Select(x => new CtiReplayAuditRecord(
                x.Id,
                x.CaseId,
                x.DecisionId,
                x.ActorUserId,
                x.ActionType,
                x.EntityType,
                x.EntityKey,
                x.PayloadHash,
                x.CorrelationId,
                x.OccurredAtUtc))
            .ToListAsync(cancellationToken);

        return new CtiDecisionReplayBundle(
            new CtiReplayCase(
                caseRecord.Id,
                caseRecord.Title,
                caseRecord.Summary,
                caseRecord.OwnerUserId,
                caseRecord.State.ToString(),
                caseRecord.ParentCaseId,
                caseRecord.MergedIntoCaseId,
                caseRecord.MergeReason,
                caseRecord.OpenedAtUtc,
                caseRecord.ClosedAtUtc),
            new CtiReplayDecisionBundle(
                bundle.Id,
                bundle.DecisionId,
                bundle.SupersedesDecisionBundleId,
                bundle.DecisionState.ToString(),
                bundle.ApprovalTierRequired.ToString(),
                bundle.NextBestEvidenceType.ToString(),
                bundle.NextBestEvidenceRequest,
                bundle.NextBestEvidenceRationale,
                bundle.RecommendationCode,
                bundle.RecommendationSummary,
                bundle.SnapshotHash,
                bundle.ModelVersion,
                bundle.PolicyVersion,
                bundle.TransformationLineageHash,
                bundle.DecidedAtUtc),
            new CtiReplayFeatureSnapshot(
                snapshot.Id,
                snapshot.SnapshotHash,
                snapshot.CapturedAtUtc,
                snapshot.FeatureWindowStartUtc,
                snapshot.FeatureWindowEndUtc,
                snapshot.CapturedByPipeline),
            evidenceReferences,
            lineageReferences,
            graphArtifacts,
            featureVectors,
            graphDerivedFeatures,
            assetCriticalityValues,
            sourceTrustValues,
            policyVersionRefs,
            modelVersionRefs,
            approvals,
            ruleProposals,
            deploymentRecommendations,
            feedback,
            sourceReliabilityProfiles,
            decisionTraces,
            auditTrail);
    }
}
