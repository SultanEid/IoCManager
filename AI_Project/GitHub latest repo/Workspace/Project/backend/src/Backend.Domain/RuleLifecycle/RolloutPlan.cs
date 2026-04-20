using Backend.Domain.Common;

namespace Backend.Domain.RuleLifecycle;

public sealed class RolloutPlan : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid RuleProposalId { get; private set; }
    public Guid DeploymentRecommendationId { get; private set; }
    public RolloutStage CurrentStage { get; private set; } = RolloutStage.Shadow;
    public int CanaryTrafficPercent { get; private set; }
    public decimal PredictedNoise { get; private set; }
    public decimal? ObservedNoise { get; private set; }
    public decimal? ObservedNoiseDelta { get; private set; }
    public decimal AnalystAcceptanceRate { get; private set; }
    public bool RequiresManualPromotion { get; private set; } = true;
    public DateTimeOffset ShadowStartedAtUtc { get; private set; }
    public DateTimeOffset? CanaryStartedAtUtc { get; private set; }
    public DateTimeOffset? PromotedAtUtc { get; private set; }
    public DateTimeOffset? RolledBackAtUtc { get; private set; }
    public string? LastStageReason { get; private set; }
    public string? LastOverrideReason { get; private set; }

    private RolloutPlan()
    {
    }

    public static RolloutPlan Create(
        Guid caseId,
        Guid ruleProposalId,
        Guid deploymentRecommendationId,
        decimal predictedNoise,
        decimal analystAcceptanceRate,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (ruleProposalId == Guid.Empty)
        {
            throw new ArgumentException("Rule proposal id is required.", nameof(ruleProposalId));
        }

        if (deploymentRecommendationId == Guid.Empty)
        {
            throw new ArgumentException("Deployment recommendation id is required.", nameof(deploymentRecommendationId));
        }

        var actor = actorUserId.Trim();
        var item = new RolloutPlan
        {
            CaseId = caseId,
            RuleProposalId = ruleProposalId,
            DeploymentRecommendationId = deploymentRecommendationId,
            CurrentStage = RolloutStage.Shadow,
            CanaryTrafficPercent = 0,
            PredictedNoise = ValidateUnitInterval(predictedNoise, nameof(predictedNoise)),
            AnalystAcceptanceRate = ValidateUnitInterval(analystAcceptanceRate, nameof(analystAcceptanceRate)),
            RequiresManualPromotion = true,
            ShadowStartedAtUtc = nowUtc,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void AdvanceTo(
        RolloutStage nextStage,
        string actorUserId,
        string reason,
        string? overrideReason,
        bool highRisk,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);

        if (nextStage == CurrentStage)
        {
            throw new InvalidOperationException($"Rollout is already in stage '{CurrentStage}'.");
        }

        var isValidTransition = CurrentStage switch
        {
            RolloutStage.Shadow => nextStage is RolloutStage.Canary or RolloutStage.Rollback,
            RolloutStage.Canary => nextStage is RolloutStage.Promote or RolloutStage.Rollback,
            RolloutStage.Promote => nextStage == RolloutStage.Rollback,
            RolloutStage.Rollback => false,
            _ => false,
        };

        if (!isValidTransition)
        {
            throw new InvalidOperationException($"Rollout transition from {CurrentStage} to {nextStage} is not allowed.");
        }

        if (nextStage == RolloutStage.Promote && ObservedNoise is null)
        {
            throw new InvalidOperationException("Canary observation must be recorded before promotion.");
        }

        if (nextStage == RolloutStage.Promote && highRisk && string.IsNullOrWhiteSpace(overrideReason))
        {
            throw new InvalidOperationException("High-risk promotions require an override reason.");
        }

        if (nextStage == RolloutStage.Rollback && string.IsNullOrWhiteSpace(overrideReason))
        {
            throw new InvalidOperationException("Rollback requires an explicit reason.");
        }

        CurrentStage = nextStage;
        LastStageReason = reason.Trim();
        LastOverrideReason = string.IsNullOrWhiteSpace(overrideReason) ? null : overrideReason.Trim();

        switch (nextStage)
        {
            case RolloutStage.Canary:
                CanaryTrafficPercent = 10;
                CanaryStartedAtUtc = nowUtc;
                break;
            case RolloutStage.Promote:
                CanaryTrafficPercent = 100;
                PromotedAtUtc = nowUtc;
                break;
            case RolloutStage.Rollback:
                CanaryTrafficPercent = 0;
                RolledBackAtUtc = nowUtc;
                break;
        }

        Touch(actorUserId.Trim(), nowUtc);
    }

    public void RefreshSimulationSnapshot(decimal predictedNoise, decimal analystAcceptanceRate, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        PredictedNoise = ValidateUnitInterval(predictedNoise, nameof(predictedNoise));
        AnalystAcceptanceRate = ValidateUnitInterval(analystAcceptanceRate, nameof(analystAcceptanceRate));
        ObservedNoiseDelta = ObservedNoise.HasValue ? ObservedNoise.Value - PredictedNoise : null;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void RecordCanaryObservation(
        decimal observedNoise,
        int analystAcceptedCount,
        int analystReviewedCount,
        string actorUserId,
        DateTimeOffset observedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (CurrentStage != RolloutStage.Canary)
        {
            throw new InvalidOperationException("Canary observations can only be recorded during canary stage.");
        }

        if (analystAcceptedCount < 0 || analystReviewedCount < 0 || analystAcceptedCount > analystReviewedCount)
        {
            throw new ArgumentOutOfRangeException(nameof(analystAcceptedCount), "Analyst counts are invalid.");
        }

        ObservedNoise = ValidateUnitInterval(observedNoise, nameof(observedNoise));
        ObservedNoiseDelta = ObservedNoise.Value - PredictedNoise;
        AnalystAcceptanceRate = analystReviewedCount == 0
            ? 0m
            : decimal.Round((decimal)analystAcceptedCount / analystReviewedCount, 4, MidpointRounding.AwayFromZero);

        Touch(actorUserId.Trim(), observedAtUtc);
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
