using Backend.Domain.Cases;
using Backend.Domain.Common;
using FluentAssertions;

namespace Backend.Tests.Domain;

public sealed class CaseRecordTests
{
    [Fact]
    public void TransitionTo_AllowsExpectedFlow()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CaseRecord.Open(
            title: "Suspicious beaconing",
            summary: "Outbound C2 pattern detected.",
            priority: CasePriority.High,
            ownerUserId: "analyst-1",
            approvalTierRequired: ApprovalTier.Lead,
            actorUserId: "analyst-1",
            nowUtc: nowUtc);

        item.TransitionTo(CaseStatus.InReview, "analyst-1", nowUtc.AddMinutes(1));
        item.TransitionTo(CaseStatus.AwaitingApproval, "lead-1", nowUtc.AddMinutes(2));
        item.TransitionTo(CaseStatus.Approved, "lead-1", nowUtc.AddMinutes(3));

        item.Status.Should().Be(CaseStatus.Approved);
    }

    [Fact]
    public void TransitionTo_ThrowsForInvalidFlow()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var item = CaseRecord.Open(
            title: "Malicious hash triage",
            summary: "Hash observed in endpoint telemetry.",
            priority: CasePriority.Medium,
            ownerUserId: "analyst-2",
            approvalTierRequired: ApprovalTier.Analyst,
            actorUserId: "analyst-2",
            nowUtc: nowUtc);

        var act = () => item.TransitionTo(CaseStatus.Approved, "lead-1", nowUtc.AddMinutes(1));

        act.Should().Throw<InvalidOperationException>();
    }
}
