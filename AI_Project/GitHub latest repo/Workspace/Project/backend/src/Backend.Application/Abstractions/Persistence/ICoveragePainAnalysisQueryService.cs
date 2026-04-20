using Backend.Domain.Common;

namespace Backend.Application.Abstractions.Persistence;

public interface ICoveragePainAnalysisQueryService
{
    Task<CoveragePainDataSnapshot> GetSnapshotAsync(CancellationToken cancellationToken);
}

public sealed record CoveragePainDataSnapshot(
    IReadOnlyList<CoveragePainCaseSnapshot> Cases,
    IReadOnlyList<CoveragePainRuleSnapshot> Rules,
    IReadOnlyList<CoveragePainEvidenceSnapshot> EvidenceItems,
    IReadOnlyList<CoveragePainEvidenceAssertionSnapshot> EvidenceAssertions,
    IReadOnlyList<CoveragePainFeatureSnapshot> FeatureSnapshots,
    IReadOnlyList<CoveragePainFeatureVectorSnapshot> FeatureVectors,
    IReadOnlyList<CoveragePainGraphDerivedFeatureSnapshot> GraphDerivedFeatures,
    IReadOnlyList<CoveragePainSourceTrustSnapshot> SourceTrustSnapshots);

public sealed record CoveragePainFeatureSnapshot(
    Guid Id,
    Guid CaseId,
    DateTimeOffset CapturedAtUtc);

public sealed record CoveragePainCaseSnapshot(
    Guid Id,
    CaseStatus Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record CoveragePainRuleSnapshot(
    Guid Id,
    Guid CaseId,
    RuleStatus Status,
    string RuleBody,
    string[] LinkedAttackTechniques,
    decimal PredictedCoverage,
    DateTimeOffset? LastUsefulHitAtUtc,
    DateTimeOffset? LastDeploymentAtUtc,
    DateTimeOffset? LastValidatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record CoveragePainEvidenceSnapshot(
    Guid Id,
    Guid CaseId,
    string EvidenceType,
    string SourceSystem,
    string PayloadJson,
    decimal Confidence,
    DateTimeOffset CollectedAtUtc);

public sealed record CoveragePainEvidenceAssertionSnapshot(
    Guid Id,
    Guid CaseId,
    string AssertionType,
    string Statement,
    decimal Confidence,
    DateTimeOffset ObservedAtUtc);

public sealed record CoveragePainFeatureVectorSnapshot(
    Guid Id,
    Guid FeatureSnapshotId,
    string FeatureName,
    decimal NumericValue,
    string Source);

public sealed record CoveragePainGraphDerivedFeatureSnapshot(
    Guid Id,
    Guid FeatureSnapshotId,
    string MetricName,
    decimal MetricValue);

public sealed record CoveragePainSourceTrustSnapshot(
    Guid Id,
    Guid FeatureSnapshotId,
    string SourceSystem,
    decimal TrustScore,
    decimal HistoricalPrecision,
    decimal HistoricalRecall);
