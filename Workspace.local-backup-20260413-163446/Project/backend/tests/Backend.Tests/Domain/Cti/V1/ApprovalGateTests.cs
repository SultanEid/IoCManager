using Backend.Domain.Cti.V1;
using FluentAssertions;

namespace Backend.Tests.Domain.Cti.V1;

public sealed class ApprovalGateTests
{
    [Fact]
    public void Approve_Throws_WhenApproverTierIsLowerThanRequiredTier()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 01, 00, 00, TimeSpan.Zero);
        var gate = ApprovalGate.Create(Guid.NewGuid(), ApprovalTier.Admin, "policy-engine", nowUtc);

        var act = () => gate.Approve(ApprovalTier.Lead, "lead-1", nowUtc.AddMinutes(1));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*below the required tier*");
    }

    [Fact]
    public void Approve_SetsApprovalMetadata_WhenTierMeetsRequirement()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 13, 01, 00, 00, TimeSpan.Zero);
        var gate = ApprovalGate.Create(Guid.NewGuid(), ApprovalTier.Lead, "policy-engine", nowUtc);

        gate.Approve(ApprovalTier.Admin, "admin-1", nowUtc.AddMinutes(2));

        gate.IsApproved.Should().BeTrue();
        gate.ApprovedTier.Should().Be(ApprovalTier.Admin);
        gate.ApprovedByUserId.Should().Be("admin-1");
        gate.ApprovedAtUtc.Should().Be(nowUtc.AddMinutes(2));
    }
}
