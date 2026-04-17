using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure.Persistence;

public sealed class CtiImmutablePersistenceGuardTests
{
    [Fact]
    public async Task SaveChangesAsync_Throws_WhenImmutableSnapshotEntityIsModified()
    {
        await using var dbContext = CreateContext();
        var (_, snapshot, _, _) = await SeedDecisionBundleGraphAsync(dbContext);

        dbContext.Entry(snapshot).Property(nameof(CtiFeatureSnapshot.SnapshotHash)).CurrentValue = "snap-mutated";

        var action = async () => await dbContext.SaveChangesAsync();
        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*append-only*");
    }

    [Fact]
    public async Task SaveChangesAsync_Throws_WhenAuditRecordIsDeleted()
    {
        await using var dbContext = CreateContext();
        var (ctiCase, _, decision, _) = await SeedDecisionBundleGraphAsync(dbContext);

        var audit = CtiAuditRecord.Create(
            ctiCase.Id,
            decision.Id,
            "policy-engine",
            "append",
            nameof(CtiDecision),
            decision.Id.ToString("N"),
            "audit-hash",
            "corr-guard",
            DateTimeOffset.UtcNow);

        dbContext.CtiAuditRecords.Add(audit);
        await dbContext.SaveChangesAsync();

        dbContext.CtiAuditRecords.Remove(audit);

        var action = async () => await dbContext.SaveChangesAsync();
        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*append-only*");
    }

    private static async Task<(CtiCase Case, CtiFeatureSnapshot Snapshot, CtiDecision Decision, CtiDecisionBundle DecisionBundle)> SeedDecisionBundleGraphAsync(CtiDbContext dbContext)
    {
        var nowUtc = new DateTimeOffset(2026, 03, 12, 16, 00, 00, TimeSpan.Zero);
        var ctiCase = CtiCase.Create(
            "Guard Case",
            "Immutable guard",
            "analyst-guard",
            CaseState.RecommendationReady,
            "analyst-guard",
            nowUtc.AddHours(-4));

        var snapshot = CtiFeatureSnapshot.Capture(
            ctiCase.Id,
            "snap-guard",
            nowUtc.AddHours(-2),
            nowUtc.AddHours(-5),
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
            "monitor",
            "Monitor",
            snapshot.SnapshotHash,
            "model-guard",
            "policy-guard",
            "lineage-guard",
            "policy-engine",
            nowUtc.AddHours(-1));

        var decisionBundle = CtiDecisionBundle.Create(
            ctiCase.Id,
            decision.Id,
            snapshot.Id,
            null,
            DecisionState.Recommend,
            ApprovalTier.Lead,
            NextBestEvidenceType.UncertaintyReduction,
            "monitor",
            "Monitor",
            "Collect telemetry.",
            "Need more certainty.",
            snapshot.SnapshotHash,
            "model-guard",
            "policy-guard",
            "lineage-guard",
            "policy-engine",
            nowUtc.AddHours(-1));

        dbContext.CtiCases.Add(ctiCase);
        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(decisionBundle);
        await dbContext.SaveChangesAsync();

        return (ctiCase, snapshot, decision, decisionBundle);
    }

    private static CtiDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new CtiDbContext(options);
    }
}
