namespace IoCManager.Mvc.Entities;

public static class DecisionStates
{
    public const string Recommend = "recommend";
    public const string Abstain = "abstain";
    public const string Escalate = "escalate";
    public const string Defer = "defer";
}

public static class CaseStates
{
    public const string Open = "open";
    public const string Triage = "triage";
    public const string EvidencePending = "evidence_pending";
    public const string RecommendationReady = "recommendation_ready";
    public const string AwaitingApproval = "awaiting_approval";
    public const string Shadow = "shadow";
    public const string Canary = "canary";
    public const string Promoted = "promoted";
    public const string Monitoring = "monitoring";
    public const string Closed = "closed";
}

public static class ApprovalTiers
{
    public const string Analyst = "analyst";
    public const string Lead = "lead";
    public const string Admin = "admin";
}

public static class RolloutModes
{
    public const string None = "none";
    public const string Shadow = "shadow";
    public const string Canary = "canary";
    public const string Promote = "promote";
    public const string Rollback = "rollback";
}

public static class ActionTypes
{
    public const string Monitor = "monitor";
    public const string Hunt = "hunt";
    public const string ProposeRule = "propose_rule";
    public const string DeployShadow = "deploy_shadow";
    public const string DeployCanary = "deploy_canary";
    public const string Promote = "promote";
    public const string SuppressTemporarily = "suppress_temporarily";
    public const string SuppressPermanently = "suppress_permanently";
    public const string BlockCandidate = "block_candidate";
    public const string Escalate = "escalate";
    public const string Abstain = "abstain";
    public const string RequestMoreEvidence = "request_more_evidence";
    public const string ExpireCase = "expire_case";
}
