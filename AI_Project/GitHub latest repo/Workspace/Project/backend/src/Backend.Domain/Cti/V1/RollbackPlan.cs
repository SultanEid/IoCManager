using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class RollbackPlan : AuditableEntity
{
    private RollbackPlan()
    {
    }

    public Guid CaseId { get; private set; }
    public RollbackRequirement Requirement { get; private set; }
    public string TriggerCondition { get; private set; } = string.Empty;
    public string PlaybookReference { get; private set; } = string.Empty;
    public TimeSpan RecoveryWindow { get; private set; }

    public static RollbackPlan Create(
        Guid caseId,
        RollbackRequirement requirement,
        string triggerCondition,
        string playbookReference,
        TimeSpan recoveryWindow,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(triggerCondition);
        ArgumentException.ThrowIfNullOrWhiteSpace(playbookReference);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (recoveryWindow <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(recoveryWindow), "Recovery window must be positive.");
        }

        var item = new RollbackPlan
        {
            CaseId = caseId,
            Requirement = requirement,
            TriggerCondition = triggerCondition.Trim(),
            PlaybookReference = playbookReference.Trim(),
            RecoveryWindow = recoveryWindow,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }
}
