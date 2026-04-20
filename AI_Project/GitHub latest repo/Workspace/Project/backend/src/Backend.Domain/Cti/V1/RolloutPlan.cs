using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class RolloutPlan : AuditableEntity
{
    private RolloutPlan()
    {
    }

    public Guid CaseId { get; private set; }
    public RolloutMode Mode { get; private set; }
    public decimal BlastRadiusLimit { get; private set; }
    public string Strategy { get; private set; } = string.Empty;
    public string SuccessCriteria { get; private set; } = string.Empty;

    public static RolloutPlan Create(
        Guid caseId,
        RolloutMode mode,
        decimal blastRadiusLimit,
        string strategy,
        string successCriteria,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(strategy);
        ArgumentException.ThrowIfNullOrWhiteSpace(successCriteria);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (blastRadiusLimit is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(blastRadiusLimit), "Blast radius limit must be between 0 and 1.");
        }

        var item = new RolloutPlan
        {
            CaseId = caseId,
            Mode = mode,
            BlastRadiusLimit = blastRadiusLimit,
            Strategy = strategy.Trim(),
            SuccessCriteria = successCriteria.Trim(),
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }
}
