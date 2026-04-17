using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class ApprovalGate : AuditableEntity
{
    private ApprovalGate()
    {
    }

    public Guid CaseId { get; private set; }
    public ApprovalTier RequiredTier { get; private set; }
    public bool IsApproved { get; private set; }
    public ApprovalTier? ApprovedTier { get; private set; }
    public string? ApprovedByUserId { get; private set; }
    public DateTimeOffset? ApprovedAtUtc { get; private set; }
    public string? Notes { get; private set; }

    public static ApprovalGate Create(
        Guid caseId,
        ApprovalTier requiredTier,
        string actorUserId,
        DateTimeOffset nowUtc,
        string? notes = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var gate = new ApprovalGate
        {
            CaseId = caseId,
            RequiredTier = requiredTier,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
        };

        gate.StampCreation(actorUserId, nowUtc);
        return gate;
    }

    public void Approve(ApprovalTier approvedTier, string approvedByUserId, DateTimeOffset approvedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approvedByUserId);
        if (approvedTier < RequiredTier)
        {
            throw new InvalidOperationException("Approval tier is below the required tier.");
        }

        IsApproved = true;
        ApprovedTier = approvedTier;
        ApprovedByUserId = approvedByUserId.Trim();
        ApprovedAtUtc = approvedAtUtc;
        Touch(approvedByUserId, approvedAtUtc);
    }
}
