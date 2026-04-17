using Backend.Application.Abstractions.Persistence;
using Backend.Application.Common;
using Backend.Application.Services;
using Backend.Domain.Common;
using FluentAssertions;

namespace Backend.Tests.Application;

public sealed class CoveragePainAnalysisServiceTests
{
    [Fact]
    public async Task GetAnalysisAsync_WhenNoData_ProducesMissingTiersWithActions()
    {
        var now = new DateTimeOffset(2026, 3, 14, 8, 0, 0, TimeSpan.Zero);
        var service = BuildService(new CoveragePainDataSnapshot([], [], [], [], [], [], [], []), now);

        var result = await service.GetAnalysisAsync(new("entire-environment", null), CancellationToken.None);

        result.Tiers.Should().HaveCount(6);
        result.Tiers.Should().OnlyContain(x => x.MissingDataStatus == "missing");
        result.Tiers.Should().OnlyContain(x => x.RecommendedActions.Count > 0);
        result.PainGapAnalysis.StrongestTiers.Should().HaveCount(2);
        result.PainGapAnalysis.WeakestTiers.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAnalysisAsync_WithSignals_ComputesDeterministicScoresAndGaps()
    {
        var now = new DateTimeOffset(2026, 3, 14, 8, 0, 0, TimeSpan.Zero);
        var caseId = Guid.NewGuid();
        var snapshotId = Guid.NewGuid();
        var ruleId = Guid.NewGuid();

        var snapshot = new CoveragePainDataSnapshot(
            Cases: [new CoveragePainCaseSnapshot(caseId, CaseStatus.InReview, now.AddDays(-4), now.AddDays(-1))],
            Rules:
            [
                new CoveragePainRuleSnapshot(
                    ruleId,
                    caseId,
                    RuleStatus.Promoted,
                    "alert tcp any any -> any any (msg:\"Suspicious\"; content:\"bad.example.com\"; sid:1;)",
                    ["T1059.001"],
                    0.80m,
                    now.AddHours(-4),
                    now.AddDays(-1),
                    now.AddDays(-2),
                    now.AddHours(-3))
            ],
            EvidenceItems:
            [
                new CoveragePainEvidenceSnapshot(
                    Guid.NewGuid(),
                    caseId,
                    "network-flow",
                    "sensor-a",
                    "{\"ip\":\"10.10.10.5\",\"domain\":\"bad.example.com\",\"hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}",
                    0.90m,
                    now.AddHours(-2))
            ],
            EvidenceAssertions:
            [
                new CoveragePainEvidenceAssertionSnapshot(
                    Guid.NewGuid(),
                    caseId,
                    "attack-technique",
                    "Observed T1059.001 execution from host srv-1",
                    0.80m,
                    now.AddHours(-1))
            ],
            FeatureSnapshots: [new CoveragePainFeatureSnapshot(snapshotId, caseId, now.AddHours(-1))],
            FeatureVectors:
            [
                new CoveragePainFeatureVectorSnapshot(Guid.NewGuid(), snapshotId, "telemetry_dns_domain_coverage", 1m, "pipeline"),
                new CoveragePainFeatureVectorSnapshot(Guid.NewGuid(), snapshotId, "telemetry_process_tool_visibility", 1m, "pipeline")
            ],
            GraphDerivedFeatures: [new CoveragePainGraphDerivedFeatureSnapshot(Guid.NewGuid(), snapshotId, "attack_technique_coverage", 1m)],
            SourceTrustSnapshots: [new CoveragePainSourceTrustSnapshot(Guid.NewGuid(), snapshotId, "sensor-a", 0.9m, 0.8m, 0.85m)]);

        var service = BuildService(snapshot, now);

        var result = await service.GetAnalysisAsync(new("entire-environment", null), CancellationToken.None);

        result.Tiers.Should().HaveCount(6);
        result.Tiers.Should().Contain(x => x.Tier == "domain-names" && x.ReadinessScore > 0m);
        result.Tiers.Should().Contain(x => x.Tier == "ttps" && x.SignalBreakdown.AttackMappingCount > 0);
        result.Tiers.Select(x => x.Trend).Should().OnlyContain(x =>
            x == "up" || x == "down" || x == "stable" || x == "insufficient-data");
        result.PainGapAnalysis.LowVsHighTierImbalance.Should().BeInRange(0m, 1m);
    }

    [Fact]
    public async Task GetAnalysisAsync_SubnetScope_FiltersToMatchingCase()
    {
        var now = new DateTimeOffset(2026, 3, 14, 8, 0, 0, TimeSpan.Zero);
        var caseInScope = Guid.NewGuid();
        var caseOutScope = Guid.NewGuid();

        var snapshot = new CoveragePainDataSnapshot(
            Cases:
            [
                new CoveragePainCaseSnapshot(caseInScope, CaseStatus.Open, now.AddDays(-2), now.AddHours(-4)),
                new CoveragePainCaseSnapshot(caseOutScope, CaseStatus.Open, now.AddDays(-2), now.AddHours(-4))
            ],
            Rules: [],
            EvidenceItems:
            [
                new CoveragePainEvidenceSnapshot(Guid.NewGuid(), caseInScope, "net", "sensor", "{\"srcIp\":\"10.10.10.3\"}", 0.8m, now.AddHours(-1)),
                new CoveragePainEvidenceSnapshot(Guid.NewGuid(), caseOutScope, "net", "sensor", "{\"srcIp\":\"192.168.5.7\"}", 0.8m, now.AddHours(-1))
            ],
            EvidenceAssertions: [],
            FeatureSnapshots: [],
            FeatureVectors: [],
            GraphDerivedFeatures: [],
            SourceTrustSnapshots: []);

        var service = BuildService(snapshot, now);
        var result = await service.GetAnalysisAsync(new("subnet", "10.10.10.0/24"), CancellationToken.None);

        result.Tiers.Select(x => x.SignalBreakdown.CaseCount).Max().Should().Be(1);
    }

    private static CoveragePainAnalysisService BuildService(CoveragePainDataSnapshot snapshot, DateTimeOffset now)
    {
        return new CoveragePainAnalysisService(new StubQueryService(snapshot), new StubClock(now));
    }

    private sealed class StubQueryService : ICoveragePainAnalysisQueryService
    {
        private readonly CoveragePainDataSnapshot _snapshot;

        public StubQueryService(CoveragePainDataSnapshot snapshot)
        {
            _snapshot = snapshot;
        }

        public Task<CoveragePainDataSnapshot> GetSnapshotAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_snapshot);
        }
    }

    private sealed class StubClock : IDateTimeProvider
    {
        public StubClock(DateTimeOffset now)
        {
            UtcNow = now;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
