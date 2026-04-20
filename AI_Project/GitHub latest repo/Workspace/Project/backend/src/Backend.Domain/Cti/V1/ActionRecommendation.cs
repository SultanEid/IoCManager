namespace Backend.Domain.Cti.V1;

public sealed class ActionRecommendation
{
    private ActionRecommendation()
    {
    }

    public PolicyActionType ActionType { get; private set; }
    public string ActionCode { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public NextBestEvidence NextBestEvidence { get; private set; } = null!;

    public static ActionRecommendation Create(
        PolicyActionType actionType,
        string description,
        NextBestEvidence nextBestEvidence)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(description);
        ArgumentNullException.ThrowIfNull(nextBestEvidence);

        return new ActionRecommendation
        {
            ActionType = actionType,
            ActionCode = ToActionCode(actionType),
            Description = description.Trim(),
            NextBestEvidence = nextBestEvidence,
        };
    }

    private static string ToActionCode(PolicyActionType actionType) =>
        actionType switch
        {
            PolicyActionType.Monitor => "monitor",
            PolicyActionType.Hunt => "hunt",
            PolicyActionType.ProposeRule => "propose_rule",
            PolicyActionType.DeployShadow => "deploy_shadow",
            PolicyActionType.DeployCanary => "deploy_canary",
            PolicyActionType.Promote => "promote",
            PolicyActionType.SuppressTemporarily => "suppress_temporarily",
            PolicyActionType.SuppressPermanently => "suppress_permanently",
            PolicyActionType.BlockCandidate => "block_candidate",
            PolicyActionType.Escalate => "escalate",
            PolicyActionType.Abstain => "abstain",
            PolicyActionType.RequestMoreEvidence => "request_more_evidence",
            PolicyActionType.ExpireCase => "expire_case",
            _ => "abstain",
        };
}
