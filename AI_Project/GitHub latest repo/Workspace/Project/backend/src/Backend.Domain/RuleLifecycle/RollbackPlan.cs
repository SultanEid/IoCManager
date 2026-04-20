using Backend.Domain.Common;

namespace Backend.Domain.RuleLifecycle;

public sealed class RollbackPlan : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid RuleProposalId { get; private set; }
    public Guid RolloutPlanId { get; private set; }
    public string TriggerCondition { get; private set; } = string.Empty;
    public string RecoveryPlaybook { get; private set; } = string.Empty;
    public decimal PredictedNoiseThreshold { get; private set; }
    public decimal? LastObservedNoise { get; private set; }
    public bool TriggerConditionMet { get; private set; }
    public bool IsTriggered { get; private set; }
    public string? TriggeredByUserId { get; private set; }
    public DateTimeOffset? TriggeredAtUtc { get; private set; }
    public string? TriggerReason { get; private set; }

    private RollbackPlan()
    {
    }

    public static RollbackPlan Create(
        Guid caseId,
        Guid ruleProposalId,
        Guid rolloutPlanId,
        string triggerCondition,
        string recoveryPlaybook,
        decimal predictedNoiseThreshold,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(triggerCondition);
        ArgumentException.ThrowIfNullOrWhiteSpace(recoveryPlaybook);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (ruleProposalId == Guid.Empty)
        {
            throw new ArgumentException("Rule proposal id is required.", nameof(ruleProposalId));
        }

        if (rolloutPlanId == Guid.Empty)
        {
            throw new ArgumentException("Rollout plan id is required.", nameof(rolloutPlanId));
        }

        var actor = actorUserId.Trim();
        var plan = new RollbackPlan
        {
            CaseId = caseId,
            RuleProposalId = ruleProposalId,
            RolloutPlanId = rolloutPlanId,
            TriggerCondition = triggerCondition.Trim(),
            RecoveryPlaybook = recoveryPlaybook.Trim(),
            PredictedNoiseThreshold = ValidateUnitInterval(predictedNoiseThreshold, nameof(predictedNoiseThreshold)),
            TriggerConditionMet = false,
            IsTriggered = false,
        };

        plan.StampCreation(actor, nowUtc);
        return plan;
    }

    public void RecordObservation(decimal observedNoise, string actorUserId, DateTimeOffset observedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        LastObservedNoise = ValidateUnitInterval(observedNoise, nameof(observedNoise));
        TriggerConditionMet = LastObservedNoise.Value >= PredictedNoiseThreshold;
        Touch(actorUserId.Trim(), observedAtUtc);
    }

    public void RefreshThreshold(decimal predictedNoiseThreshold, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        PredictedNoiseThreshold = ValidateUnitInterval(predictedNoiseThreshold, nameof(predictedNoiseThreshold));
        TriggerConditionMet = LastObservedNoise.HasValue && LastObservedNoise.Value >= PredictedNoiseThreshold;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void Trigger(string actorUserId, string reason, decimal? observedNoise, DateTimeOffset triggeredAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);

        if (IsTriggered)
        {
            throw new InvalidOperationException("Rollback has already been triggered.");
        }

        if (observedNoise.HasValue)
        {
            LastObservedNoise = ValidateUnitInterval(observedNoise.Value, nameof(observedNoise));
            TriggerConditionMet = LastObservedNoise.Value >= PredictedNoiseThreshold;
        }

        IsTriggered = true;
        TriggeredByUserId = actorUserId.Trim();
        TriggeredAtUtc = triggeredAtUtc;
        TriggerReason = reason.Trim();
        Touch(TriggeredByUserId, triggeredAtUtc);
    }

    private static decimal ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }

        return value;
    }
}
