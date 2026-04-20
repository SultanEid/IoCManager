using Backend.Domain.Common;

namespace Backend.Domain.Cases;

public sealed class CaseRecord : AuditableEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public CasePriority Priority { get; private set; } = CasePriority.Medium;
    public CaseStatus Status { get; private set; } = CaseStatus.Open;
    public ApprovalTier ApprovalTierRequired { get; private set; } = ApprovalTier.Analyst;
    public string OwnerUserId { get; private set; } = string.Empty;

    private CaseRecord()
    {
    }

    public static CaseRecord Open(
        string title,
        string summary,
        CasePriority priority,
        string ownerUserId,
        ApprovalTier approvalTierRequired,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new CaseRecord
        {
            Title = title.Trim(),
            Summary = summary.Trim(),
            Priority = priority,
            OwnerUserId = ownerUserId.Trim(),
            ApprovalTierRequired = approvalTierRequired,
            Status = CaseStatus.Open,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }

    public void UpdateSummary(string summary, string actorUserId, DateTimeOffset nowUtc)
    {
        Summary = summary.Trim();
        Touch(actorUserId, nowUtc);
    }

    public void ReassignOwner(string ownerUserId, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerUserId);
        OwnerUserId = ownerUserId.Trim();
        Touch(actorUserId, nowUtc);
    }

    public void TransitionTo(CaseStatus nextStatus, string actorUserId, DateTimeOffset nowUtc)
    {
        if (nextStatus == Status)
        {
            return;
        }

        var isAllowed = Status switch
        {
            CaseStatus.Open => nextStatus is CaseStatus.InReview or CaseStatus.Closed,
            CaseStatus.InReview => nextStatus is CaseStatus.AwaitingApproval or CaseStatus.Rejected or CaseStatus.Closed,
            CaseStatus.AwaitingApproval => nextStatus is CaseStatus.Approved or CaseStatus.Rejected,
            CaseStatus.Approved => nextStatus is CaseStatus.Closed or CaseStatus.Rejected,
            CaseStatus.Rejected => nextStatus is CaseStatus.InReview or CaseStatus.Closed,
            CaseStatus.Closed => false,
            _ => false,
        };

        if (!isAllowed)
        {
            throw new InvalidOperationException($"Case status transition from {Status} to {nextStatus} is not allowed.");
        }

        Status = nextStatus;
        Touch(actorUserId, nowUtc);
    }
}
