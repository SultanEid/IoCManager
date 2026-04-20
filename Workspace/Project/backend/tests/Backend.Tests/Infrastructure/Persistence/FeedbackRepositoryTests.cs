using Backend.Domain.Cases;
using Backend.Domain.Common;
using Backend.Domain.Feedback;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure.Persistence;

public sealed class FeedbackRepositoryTests
{
    [Fact]
    public async Task AddAndListByCaseAsync_PersistsAuxiliaryOutputs()
    {
        await using var dbContext = CreateContext();
        var repository = new FeedbackRepository(dbContext);
        var nowUtc = new DateTimeOffset(2026, 03, 14, 08, 00, 00, TimeSpan.Zero);
        var caseRecord = CaseRecord.Open(
            "Feedback case",
            "Repository roundtrip",
            CasePriority.High,
            "analyst-1",
            ApprovalTier.Lead,
            "analyst-1",
            nowUtc.AddMinutes(-10));
        dbContext.Cases.Add(caseRecord);

        var feedback = FeedbackRecord.Submit(
            caseRecord.Id,
            null,
            FeedbackVerdict.Suspicious,
            FeedbackAuxiliaryOutputs.CreateDefaults(FeedbackVerdict.Suspicious),
            "Escalate for human confirmation.",
            "lead-1",
            nowUtc);

        await repository.AddAsync(feedback, CancellationToken.None);
        await dbContext.SaveChangesAsync(CancellationToken.None);

        var items = await repository.ListByCaseAsync(caseRecord.Id, CancellationToken.None);

        items.Should().ContainSingle();
        var persisted = items[0];
        persisted.Verdict.Should().Be(FeedbackVerdict.Suspicious);
        persisted.Confidence.Should().Be(0.5m);
        persisted.FalsePositiveRisk.Should().Be(0.5m);
        persisted.ReviewPriority.Should().Be(CasePriority.Medium);
        persisted.ShouldPromoteToIndicator.Should().BeTrue();
        persisted.ShouldSuppress.Should().BeFalse();
        persisted.ShouldAllowlist.Should().BeFalse();
        persisted.ShouldEscalate.Should().BeTrue();
    }

    private static CtiDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new CtiDbContext(options);
    }
}
