using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class CaseDecision : AuditableEntity
{
    private CaseDecision()
    {
    }

    public Guid CaseId { get; private set; }
    public DecisionState DecisionState { get; private set; }
    public ActionRecommendation ActionRecommendation { get; private set; } = null!;
    public ApprovalTier ApprovalTierRequired { get; private set; }
    public RolloutPlan RolloutPlan { get; private set; } = null!;
    public RollbackPlan RollbackPlan { get; private set; } = null!;
    public DecisionSnapshot DecisionSnapshot { get; private set; } = null!;
    public ModelDecisionTrace ModelDecisionTrace { get; private set; } = null!;
    public string PolicyVersion { get; private set; } = string.Empty;

    public static CaseDecision Create(
        Guid caseId,
        DecisionState decisionState,
        ActionRecommendation actionRecommendation,
        ApprovalTier approvalTierRequired,
        RolloutPlan rolloutPlan,
        RollbackPlan rollbackPlan,
        DecisionSnapshot decisionSnapshot,
        ModelDecisionTrace modelDecisionTrace,
        string policyVersion,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentNullException.ThrowIfNull(actionRecommendation);
        ArgumentNullException.ThrowIfNull(rolloutPlan);
        ArgumentNullException.ThrowIfNull(rollbackPlan);
        ArgumentNullException.ThrowIfNull(decisionSnapshot);
        ArgumentNullException.ThrowIfNull(modelDecisionTrace);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (rolloutPlan.CaseId != caseId || rollbackPlan.CaseId != caseId || decisionSnapshot.CaseId != caseId)
        {
            throw new InvalidOperationException("Decision artifacts must belong to the same case.");
        }

        var decision = new CaseDecision
        {
            CaseId = caseId,
            DecisionState = decisionState,
            ActionRecommendation = actionRecommendation,
            ApprovalTierRequired = approvalTierRequired,
            RolloutPlan = rolloutPlan,
            RollbackPlan = rollbackPlan,
            DecisionSnapshot = decisionSnapshot,
            ModelDecisionTrace = modelDecisionTrace,
            PolicyVersion = policyVersion.Trim(),
        };

        decision.StampCreation(actorUserId, nowUtc);
        return decision;
    }
}
