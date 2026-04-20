using Backend.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.QueryServices;

public sealed class CoveragePainAnalysisQueryService : ICoveragePainAnalysisQueryService
{
    private readonly CtiDbContext _dbContext;

    public CoveragePainAnalysisQueryService(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CoveragePainDataSnapshot> GetSnapshotAsync(CancellationToken cancellationToken)
    {
        var cases = await _dbContext.Cases
            .AsNoTracking()
            .Select(x => new CoveragePainCaseSnapshot(x.Id, x.Status, x.CreatedAtUtc, x.UpdatedAtUtc))
            .ToArrayAsync(cancellationToken);

        var rules = await _dbContext.Rules
            .AsNoTracking()
            .Select(x => new CoveragePainRuleSnapshot(
                x.Id,
                x.CaseId,
                x.Status,
                x.RuleBody,
                x.LinkedAttackTechniques,
                x.PredictedCoverage,
                x.LastUsefulHitAtUtc,
                x.LastDeploymentAtUtc,
                x.LastValidatedAtUtc,
                x.UpdatedAtUtc))
            .ToArrayAsync(cancellationToken);

        var evidence = await _dbContext.Evidence
            .AsNoTracking()
            .Select(x => new CoveragePainEvidenceSnapshot(
                x.Id,
                x.CaseId,
                x.EvidenceType,
                x.SourceSystem,
                x.PayloadJson,
                x.Confidence,
                x.CollectedAtUtc))
            .ToArrayAsync(cancellationToken);

        var evidenceAssertions = await _dbContext.CtiEvidenceAssertions
            .AsNoTracking()
            .Select(x => new CoveragePainEvidenceAssertionSnapshot(
                x.Id,
                x.CaseId,
                x.AssertionType,
                x.Statement,
                x.Confidence,
                x.ObservedAtUtc))
            .ToArrayAsync(cancellationToken);

        var featureSnapshots = await _dbContext.CtiFeatureSnapshots
            .AsNoTracking()
            .Select(x => new CoveragePainFeatureSnapshot(x.Id, x.CaseId, x.CapturedAtUtc))
            .ToArrayAsync(cancellationToken);

        var featureVectors = await _dbContext.CtiFeatureVectors
            .AsNoTracking()
            .Select(x => new CoveragePainFeatureVectorSnapshot(
                x.Id,
                x.FeatureSnapshotId,
                x.FeatureName,
                x.NumericValue,
                x.Source))
            .ToArrayAsync(cancellationToken);

        var graphDerived = await _dbContext.CtiGraphDerivedFeatures
            .AsNoTracking()
            .Select(x => new CoveragePainGraphDerivedFeatureSnapshot(
                x.Id,
                x.FeatureSnapshotId,
                x.MetricName,
                x.MetricValue))
            .ToArrayAsync(cancellationToken);

        var sourceTrust = await _dbContext.CtiSourceTrustSnapshotValues
            .AsNoTracking()
            .Select(x => new CoveragePainSourceTrustSnapshot(
                x.Id,
                x.FeatureSnapshotId,
                x.SourceSystem,
                x.TrustScore,
                x.HistoricalPrecision,
                x.HistoricalRecall))
            .ToArrayAsync(cancellationToken);

        return new CoveragePainDataSnapshot(
            cases,
            rules,
            evidence,
            evidenceAssertions,
            featureSnapshots,
            featureVectors,
            graphDerived,
            sourceTrust);
    }
}
