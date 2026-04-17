using Backend.Domain.Common;

namespace Backend.Domain.RuleLifecycle;

public sealed class DeploymentRecommendation : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid RuleProposalId { get; private set; }
    public string TargetEnvironment { get; private set; } = string.Empty;
    public RolloutStage RecommendedStage { get; private set; } = RolloutStage.Shadow;
    public decimal RiskScore { get; private set; }
    public decimal PredictedNoise { get; private set; }
    public decimal BaselineNoise { get; private set; }
    public decimal PredictedNoiseDelta { get; private set; }
    public decimal AnalystAcceptanceRate { get; private set; }
    public bool RequiresHumanApproval { get; private set; } = true;
    public bool AutoPublishEnabled { get; private set; }
    public string RequestedByUserId { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;
    public DateTimeOffset RecommendedAtUtc { get; private set; }

    private DeploymentRecommendation()
    {
    }

    public static DeploymentRecommendation Create(
        Guid caseId,
        Guid ruleProposalId,
        string targetEnvironment,
        RolloutStage recommendedStage,
        decimal riskScore,
        decimal predictedNoise,
        decimal baselineNoise,
        decimal analystAcceptanceRate,
        bool requiresHumanApproval,
        string requestedByUserId,
        string rationale,
        DateTimeOffset recommendedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetEnvironment);
        ArgumentException.ThrowIfNullOrWhiteSpace(requestedByUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (ruleProposalId == Guid.Empty)
        {
            throw new ArgumentException("Rule proposal id is required.", nameof(ruleProposalId));
        }

        var item = new DeploymentRecommendation
        {
            CaseId = caseId,
            RuleProposalId = ruleProposalId,
            TargetEnvironment = targetEnvironment.Trim(),
            RecommendedStage = recommendedStage,
            RiskScore = ValidateUnitInterval(riskScore, nameof(riskScore)),
            PredictedNoise = ValidateUnitInterval(predictedNoise, nameof(predictedNoise)),
            BaselineNoise = ValidateUnitInterval(baselineNoise, nameof(baselineNoise)),
            PredictedNoiseDelta = predictedNoise - baselineNoise,
            AnalystAcceptanceRate = ValidateUnitInterval(analystAcceptanceRate, nameof(analystAcceptanceRate)),
            RequiresHumanApproval = requiresHumanApproval,
            AutoPublishEnabled = false,
            RequestedByUserId = requestedByUserId.Trim(),
            Rationale = rationale.Trim(),
            RecommendedAtUtc = recommendedAtUtc,
        };

        item.StampCreation(item.RequestedByUserId, recommendedAtUtc);
        return item;
    }

    public void RefreshSimulation(
        decimal riskScore,
        decimal predictedNoise,
        decimal baselineNoise,
        decimal analystAcceptanceRate,
        bool requiresHumanApproval,
        string requestedByUserId,
        string rationale,
        DateTimeOffset recommendedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(requestedByUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);

        RiskScore = ValidateUnitInterval(riskScore, nameof(riskScore));
        PredictedNoise = ValidateUnitInterval(predictedNoise, nameof(predictedNoise));
        BaselineNoise = ValidateUnitInterval(baselineNoise, nameof(baselineNoise));
        PredictedNoiseDelta = PredictedNoise - BaselineNoise;
        AnalystAcceptanceRate = ValidateUnitInterval(analystAcceptanceRate, nameof(analystAcceptanceRate));
        RequiresHumanApproval = requiresHumanApproval;
        AutoPublishEnabled = false;
        RequestedByUserId = requestedByUserId.Trim();
        Rationale = rationale.Trim();
        RecommendedAtUtc = recommendedAtUtc;
        Touch(RequestedByUserId, recommendedAtUtc);
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
