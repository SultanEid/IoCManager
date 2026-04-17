namespace Backend.Domain.Cti.V1.Policy;

public sealed class PolicyEvaluationOutcome
{
    private PolicyEvaluationOutcome()
    {
    }

    public DecisionState DecisionState { get; private set; }
    public ActionRecommendation RecommendedAction { get; private set; } = null!;
    public ApprovalTier ApprovalTierRequired { get; private set; }
    public RolloutPlan RolloutPlan { get; private set; } = null!;
    public RollbackPlan RollbackPlan { get; private set; } = null!;
    public NextBestEvidence NextBestEvidence { get; private set; } = null!;
    public DecisionSnapshot DecisionSnapshot { get; private set; } = null!;
    public ModelDecisionTrace ModelDecisionTrace { get; private set; } = null!;
    public PointInTimeFeatureSnapshot FeatureSnapshot { get; private set; } = null!;
    public string PolicyVersion { get; private set; } = string.Empty;
    public DateTimeOffset ExpiryUtc { get; private set; }
    public IReadOnlyList<string> GuardrailNotes { get; private set; } = Array.Empty<string>();

    public static PolicyEvaluationOutcome Create(
        DecisionState decisionState,
        ActionRecommendation recommendedAction,
        ApprovalTier approvalTierRequired,
        RolloutPlan rolloutPlan,
        RollbackPlan rollbackPlan,
        NextBestEvidence nextBestEvidence,
        DecisionSnapshot decisionSnapshot,
        ModelDecisionTrace modelDecisionTrace,
        PointInTimeFeatureSnapshot featureSnapshot,
        string policyVersion,
        DateTimeOffset expiryUtc,
        IReadOnlyList<string> guardrailNotes)
    {
        ArgumentNullException.ThrowIfNull(recommendedAction);
        ArgumentNullException.ThrowIfNull(rolloutPlan);
        ArgumentNullException.ThrowIfNull(rollbackPlan);
        ArgumentNullException.ThrowIfNull(nextBestEvidence);
        ArgumentNullException.ThrowIfNull(decisionSnapshot);
        ArgumentNullException.ThrowIfNull(modelDecisionTrace);
        ArgumentNullException.ThrowIfNull(featureSnapshot);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentNullException.ThrowIfNull(guardrailNotes);

        return new PolicyEvaluationOutcome
        {
            DecisionState = decisionState,
            RecommendedAction = recommendedAction,
            ApprovalTierRequired = approvalTierRequired,
            RolloutPlan = rolloutPlan,
            RollbackPlan = rollbackPlan,
            NextBestEvidence = nextBestEvidence,
            DecisionSnapshot = decisionSnapshot,
            ModelDecisionTrace = modelDecisionTrace,
            FeatureSnapshot = featureSnapshot,
            PolicyVersion = policyVersion.Trim(),
            ExpiryUtc = expiryUtc,
            GuardrailNotes = guardrailNotes.ToArray(),
        };
    }
}
