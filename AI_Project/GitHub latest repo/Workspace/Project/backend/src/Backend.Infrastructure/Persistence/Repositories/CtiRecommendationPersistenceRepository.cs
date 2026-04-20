using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cti.V1.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class CtiRecommendationPersistenceRepository : ICtiRecommendationPersistenceRepository
{
    private static readonly JsonSerializerOptions AuditJsonOptions = new(JsonSerializerDefaults.Web);
    private const string AppendActionType = "append";
    private const string SystemActor = "system";

    private readonly CtiDbContext _dbContext;

    public CtiRecommendationPersistenceRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AppendRecommendationPackageAsync(
        CtiRecommendationPersistencePackage package,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(package);
        if (string.IsNullOrWhiteSpace(package.CorrelationId))
        {
            throw new ArgumentException("Correlation id is required.", nameof(package.CorrelationId));
        }

        ValidatePackage(package);

        if (_dbContext.Database.IsRelational())
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            await PersistPackageAsync(package, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        await PersistPackageAsync(package, cancellationToken);
    }

    private async Task PersistPackageAsync(
        CtiRecommendationPersistencePackage package,
        CancellationToken cancellationToken)
    {
        await _dbContext.CtiCases.AddAsync(package.Case, cancellationToken);
        await AddRangeAsync(_dbContext.CtiSourceReliabilityProfiles, package.SourceReliabilityProfiles, cancellationToken);
        await _dbContext.CtiFeatureSnapshots.AddAsync(package.FeatureSnapshot, cancellationToken);
        await AddRangeAsync(_dbContext.CtiEvidenceAssertions, package.EvidenceAssertions, cancellationToken);
        await _dbContext.CtiDecisions.AddAsync(package.Decision, cancellationToken);
        await _dbContext.CtiDecisionBundles.AddAsync(package.DecisionBundle, cancellationToken);
        await AddRangeAsync(_dbContext.CtiApprovals, package.Approvals, cancellationToken);
        await AddRangeAsync(_dbContext.CtiRuleProposals, package.RuleProposals, cancellationToken);
        await AddRangeAsync(_dbContext.CtiDeploymentRecommendations, package.DeploymentRecommendations, cancellationToken);
        await AddRangeAsync(_dbContext.CtiFeedback, package.FeedbackItems, cancellationToken);
        await AddRangeAsync(_dbContext.CtiTransformationLineageRecords, package.TransformationLineageRecords, cancellationToken);
        await AddRangeAsync(_dbContext.CtiDecisionEvidenceReferences, package.DecisionEvidenceReferences, cancellationToken);
        await AddRangeAsync(_dbContext.CtiDecisionLineageReferences, package.DecisionLineageReferences, cancellationToken);
        await AddRangeAsync(_dbContext.CtiGraphArtifactReferences, package.GraphArtifactReferences, cancellationToken);
        await AddRangeAsync(_dbContext.CtiFeatureVectors, package.FeatureVectors, cancellationToken);
        await AddRangeAsync(_dbContext.CtiGraphDerivedFeatures, package.GraphDerivedFeatures, cancellationToken);
        await AddRangeAsync(_dbContext.CtiAssetCriticalitySnapshotValues, package.AssetCriticalitySnapshotValues, cancellationToken);
        await AddRangeAsync(_dbContext.CtiSourceTrustSnapshotValues, package.SourceTrustSnapshotValues, cancellationToken);
        await AddRangeAsync(_dbContext.CtiPolicyVersionReferences, package.PolicyVersionReferences, cancellationToken);
        await AddRangeAsync(_dbContext.CtiModelVersionReferences, package.ModelVersionReferences, cancellationToken);
        await AddRangeAsync(_dbContext.CtiModelDecisionTraces, package.ModelDecisionTraces, cancellationToken);

        var auditRecords = BuildAuditRecords(package).ToArray();
        await _dbContext.CtiAuditRecords.AddRangeAsync(auditRecords, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IEnumerable<CtiAuditRecord> BuildAuditRecords(CtiRecommendationPersistencePackage package)
    {
        foreach (var entity in EnumerateEntities(package))
        {
            var metadata = ResolveAuditMetadata(entity, package);
            var payloadHash = ComputePayloadHash(entity);
            var entityKey = ExtractEntityId(entity).ToString("N");

            yield return CtiAuditRecord.Create(
                metadata.CaseId,
                metadata.DecisionId,
                metadata.ActorUserId,
                AppendActionType,
                entity.GetType().Name,
                entityKey,
                payloadHash,
                package.CorrelationId,
                metadata.OccurredAtUtc);
        }
    }

    private static IEnumerable<object> EnumerateEntities(CtiRecommendationPersistencePackage package)
    {
        yield return package.Case;
        foreach (var item in package.SourceReliabilityProfiles ?? [])
        {
            yield return item;
        }

        yield return package.FeatureSnapshot;
        foreach (var item in package.EvidenceAssertions ?? [])
        {
            yield return item;
        }

        yield return package.Decision;
        yield return package.DecisionBundle;

        foreach (var item in package.Approvals ?? [])
        {
            yield return item;
        }

        foreach (var item in package.RuleProposals ?? [])
        {
            yield return item;
        }

        foreach (var item in package.DeploymentRecommendations ?? [])
        {
            yield return item;
        }

        foreach (var item in package.FeedbackItems ?? [])
        {
            yield return item;
        }

        foreach (var item in package.TransformationLineageRecords ?? [])
        {
            yield return item;
        }

        foreach (var item in package.DecisionEvidenceReferences ?? [])
        {
            yield return item;
        }

        foreach (var item in package.DecisionLineageReferences ?? [])
        {
            yield return item;
        }

        foreach (var item in package.GraphArtifactReferences ?? [])
        {
            yield return item;
        }

        foreach (var item in package.FeatureVectors ?? [])
        {
            yield return item;
        }

        foreach (var item in package.GraphDerivedFeatures ?? [])
        {
            yield return item;
        }

        foreach (var item in package.AssetCriticalitySnapshotValues ?? [])
        {
            yield return item;
        }

        foreach (var item in package.SourceTrustSnapshotValues ?? [])
        {
            yield return item;
        }

        foreach (var item in package.PolicyVersionReferences ?? [])
        {
            yield return item;
        }

        foreach (var item in package.ModelVersionReferences ?? [])
        {
            yield return item;
        }

        foreach (var item in package.ModelDecisionTraces ?? [])
        {
            yield return item;
        }
    }

    private static (Guid? CaseId, Guid? DecisionId, string ActorUserId, DateTimeOffset OccurredAtUtc) ResolveAuditMetadata(
        object entity,
        CtiRecommendationPersistencePackage package)
    {
        return entity switch
        {
            CtiCase item => (item.Id, null, item.CreatedByUserId, item.CreatedAtUtc),
            CtiSourceReliabilityProfile item => (null, null, item.CreatedByUserId, item.CreatedAtUtc),
            CtiEvidenceAssertion item => (item.CaseId, null, item.CreatedByUserId, item.CreatedAtUtc),
            CtiDecision item => (item.CaseId, item.Id, item.CreatedByUserId, item.DecidedAtUtc),
            CtiDecisionBundle item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.DecidedAtUtc),
            CtiApproval item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.ApprovedAtUtc),
            CtiRuleProposal item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.ProposedAtUtc),
            CtiDeploymentRecommendation item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.RecommendedAtUtc),
            CtiFeedback item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.SubmittedAtUtc),
            CtiTransformationLineageRecord item => (item.CaseId, null, item.RecordedByUserId, item.RecordedAtUtc),
            CtiDecisionEvidenceReference item => (package.Case.Id, item.DecisionId, SystemActor, item.ReferencedAtUtc),
            CtiDecisionLineageReference item => (package.Case.Id, item.DecisionId, SystemActor, item.ReferencedAtUtc),
            CtiGraphArtifactReference item => (item.CaseId, item.DecisionId, item.CreatedByUserId, item.GeneratedAtUtc),
            CtiFeatureSnapshot item => (item.CaseId, null, item.CreatedByUserId, item.CapturedAtUtc),
            CtiFeatureVector _ => (package.Case.Id, package.Decision.Id, SystemActor, package.FeatureSnapshot.CapturedAtUtc),
            CtiGraphDerivedFeature _ => (package.Case.Id, package.Decision.Id, SystemActor, package.FeatureSnapshot.CapturedAtUtc),
            CtiAssetCriticalitySnapshotValue _ => (package.Case.Id, package.Decision.Id, SystemActor, package.FeatureSnapshot.CapturedAtUtc),
            CtiSourceTrustSnapshotValue _ => (package.Case.Id, package.Decision.Id, SystemActor, package.FeatureSnapshot.CapturedAtUtc),
            CtiPolicyVersionReference item => (package.Case.Id, package.Decision.Id, SystemActor, item.PublishedAtUtc),
            CtiModelVersionReference item => (package.Case.Id, package.Decision.Id, SystemActor, item.TrainedAtUtc),
            CtiModelDecisionTrace item => (package.Case.Id, item.DecisionId, item.CreatedByUserId, item.TracedAtUtc),
            _ => throw new InvalidOperationException($"Unsupported CTI entity type '{entity.GetType().Name}' for audit metadata."),
        };
    }

    private static string ComputePayloadHash(object entity)
    {
        var payload = JsonSerializer.Serialize(entity, AuditJsonOptions);
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hashBytes);
    }

    private static Guid ExtractEntityId(object entity)
    {
        var idProperty = entity.GetType().GetProperty("Id");
        if (idProperty?.GetValue(entity) is Guid id && id != Guid.Empty)
        {
            return id;
        }

        throw new InvalidOperationException($"Entity '{entity.GetType().Name}' does not expose a valid Id.");
    }

    private static async Task AddRangeAsync<TEntity>(
        DbSet<TEntity> dbSet,
        IEnumerable<TEntity>? items,
        CancellationToken cancellationToken)
        where TEntity : class
    {
        if (items is null)
        {
            return;
        }

        var materialized = items as TEntity[] ?? items.ToArray();
        if (materialized.Length == 0)
        {
            return;
        }

        await dbSet.AddRangeAsync(materialized, cancellationToken);
    }

    private static void ValidatePackage(CtiRecommendationPersistencePackage package)
    {
        if (package.FeatureSnapshot.CaseId != package.Case.Id)
        {
            throw new InvalidOperationException("Feature snapshot must reference the package case.");
        }

        if (package.Decision.CaseId != package.Case.Id)
        {
            throw new InvalidOperationException("Decision must reference the package case.");
        }

        if (package.Decision.FeatureSnapshotId != package.FeatureSnapshot.Id)
        {
            throw new InvalidOperationException("Decision must reference the package snapshot.");
        }

        if (package.DecisionBundle.CaseId != package.Case.Id
            || package.DecisionBundle.DecisionId != package.Decision.Id
            || package.DecisionBundle.FeatureSnapshotId != package.FeatureSnapshot.Id)
        {
            throw new InvalidOperationException("Decision bundle must reference the package case, decision, and snapshot.");
        }

        ValidateCaseBoundItems(package.EvidenceAssertions, package.Case.Id, "evidence assertion");
        ValidateCaseBoundItems(package.Approvals, package.Case.Id, "approval");
        ValidateCaseBoundItems(package.RuleProposals, package.Case.Id, "rule proposal");
        ValidateCaseBoundItems(package.DeploymentRecommendations, package.Case.Id, "deployment recommendation");
        ValidateCaseBoundItems(package.FeedbackItems, package.Case.Id, "feedback");
        ValidateCaseBoundItems(package.TransformationLineageRecords, package.Case.Id, "lineage record");
        ValidateCaseBoundItems(package.GraphArtifactReferences, package.Case.Id, "graph artifact reference");

        ValidateDecisionBoundItems(package.DecisionEvidenceReferences, package.Decision.Id, "decision evidence reference");
        ValidateDecisionBoundItems(package.DecisionLineageReferences, package.Decision.Id, "decision lineage reference");
        ValidateDecisionBoundItems(package.ModelDecisionTraces, package.Decision.Id, "model decision trace");

        ValidateSnapshotBoundItems(package.FeatureVectors, package.FeatureSnapshot.Id, "feature vector");
        ValidateSnapshotBoundItems(package.GraphDerivedFeatures, package.FeatureSnapshot.Id, "graph derived feature");
        ValidateSnapshotBoundItems(package.AssetCriticalitySnapshotValues, package.FeatureSnapshot.Id, "asset criticality snapshot");
        ValidateSnapshotBoundItems(package.SourceTrustSnapshotValues, package.FeatureSnapshot.Id, "source trust snapshot");
        ValidateSnapshotBoundItems(package.PolicyVersionReferences, package.FeatureSnapshot.Id, "policy version reference");
        ValidateSnapshotBoundItems(package.ModelVersionReferences, package.FeatureSnapshot.Id, "model version reference");
        ValidateSnapshotBoundItems(package.ModelDecisionTraces, package.FeatureSnapshot.Id, "model decision trace");
    }

    private static void ValidateCaseBoundItems<T>(IEnumerable<T>? items, Guid expectedCaseId, string label)
    {
        if (items is null)
        {
            return;
        }

        foreach (var item in items)
        {
            var property = item!.GetType().GetProperty("CaseId");
            if (property?.GetValue(item) is not Guid caseId || caseId != expectedCaseId)
            {
                throw new InvalidOperationException($"Every {label} must reference the package case.");
            }
        }
    }

    private static void ValidateDecisionBoundItems<T>(IEnumerable<T>? items, Guid expectedDecisionId, string label)
    {
        if (items is null)
        {
            return;
        }

        foreach (var item in items)
        {
            var property = item!.GetType().GetProperty("DecisionId");
            if (property?.GetValue(item) is not Guid decisionId || decisionId != expectedDecisionId)
            {
                throw new InvalidOperationException($"Every {label} must reference the package decision.");
            }
        }
    }

    private static void ValidateSnapshotBoundItems<T>(IEnumerable<T>? items, Guid expectedSnapshotId, string label)
    {
        if (items is null)
        {
            return;
        }

        foreach (var item in items)
        {
            var property = item!.GetType().GetProperty("FeatureSnapshotId");
            if (property?.GetValue(item) is not Guid snapshotId || snapshotId != expectedSnapshotId)
            {
                throw new InvalidOperationException($"Every {label} must reference the package snapshot.");
            }
        }
    }
}
