namespace Backend.Contracts.CoveragePain;

public sealed record GetCoveragePainAnalysisRequest(
    string ScopeType,
    string? ScopeValue);

public sealed record CoveragePainAnalysisResponse(
    DateTimeOffset GeneratedAtUtc,
    CoveragePainScopeResponse Scope,
    CoveragePainScoreSemanticsResponse ScoreSemantics,
    IReadOnlyList<CoveragePainTierAnalysisResponse> Tiers,
    CoveragePainGapAnalysisResponse PainGapAnalysis);

public sealed record CoveragePainScopeResponse(
    string ScopeType,
    string? ScopeValue);

public sealed record CoveragePainScoreSemanticsResponse(
    decimal ReadinessRuleWeight,
    decimal ReadinessTelemetryWeight,
    decimal ReadinessAttackCoverageWeight,
    decimal ReadinessFreshnessWeight,
    decimal IncidentSightingsWeight,
    decimal IncidentDetectionsWeight,
    decimal IncidentCasePressureWeight,
    decimal IncidentRecencyWeight,
    int TrendWindowDays,
    int FreshnessFullCreditDays,
    int FreshnessZeroCreditDays);

public sealed record CoveragePainTierAnalysisResponse(
    string Tier,
    decimal ReadinessScore,
    decimal IncidentActivityScore,
    decimal Confidence,
    decimal Freshness,
    int IndicatorCount,
    string Trend,
    string MissingDataStatus,
    IReadOnlyList<string> TopGaps,
    IReadOnlyList<string> RecommendedActions,
    CoveragePainTierSignalBreakdownResponse SignalBreakdown);

public sealed record CoveragePainTierSignalBreakdownResponse(
    int CaseCount,
    int DetectionCount,
    int RuleCount,
    int AttackMappingCount,
    int TelemetrySignalCount,
    int SightingsCount);

public sealed record CoveragePainGapAnalysisResponse(
    IReadOnlyList<string> StrongestTiers,
    IReadOnlyList<string> WeakestTiers,
    decimal LowTierAverageReadiness,
    decimal HighTierAverageReadiness,
    decimal LowVsHighTierImbalance,
    string SuggestedImprovementDirection);
