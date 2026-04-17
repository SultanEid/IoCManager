using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class CaseAssignment : AuditableEntity
{
    private CaseAssignment()
    {
    }

    public Guid CaseId { get; private set; }
    public string AssignedToUserId { get; private set; } = string.Empty;
    public string AssignedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AssignedAtUtc { get; private set; }
    public DateTimeOffset? ExpiresAtUtc { get; private set; }
    public bool IsActive { get; private set; }

    public static CaseAssignment Create(
        Guid caseId,
        string assignedToUserId,
        string assignedByUserId,
        DateTimeOffset assignedAtUtc,
        DateTimeOffset? expiresAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(assignedToUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(assignedByUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (expiresAtUtc.HasValue && expiresAtUtc.Value <= assignedAtUtc)
        {
            throw new ArgumentOutOfRangeException(nameof(expiresAtUtc), "Expiration must be after assignment.");
        }

        var assignment = new CaseAssignment
        {
            CaseId = caseId,
            AssignedToUserId = assignedToUserId.Trim(),
            AssignedByUserId = assignedByUserId.Trim(),
            AssignedAtUtc = assignedAtUtc,
            ExpiresAtUtc = expiresAtUtc,
            IsActive = true,
        };

        assignment.StampCreation(actorUserId, nowUtc);
        return assignment;
    }

    public void Deactivate(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        IsActive = false;
        Touch(actorUserId, nowUtc);
    }
}
