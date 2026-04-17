namespace Backend.Domain.Cti.V1;

public enum DecisionState
{
    Recommend = 1,
    Abstain = 2,
    Escalate = 3,
    Defer = 4,
}

public enum PolicyActionType
{
    Monitor = 1,
    Hunt = 2,
    ProposeRule = 3,
    DeployShadow = 4,
    DeployCanary = 5,
    Promote = 6,
    SuppressTemporarily = 7,
    SuppressPermanently = 8,
    BlockCandidate = 9,
    Escalate = 10,
    Abstain = 11,
    RequestMoreEvidence = 12,
    ExpireCase = 13,
}

public enum CaseState
{
    Open = 1,
    Triage = 2,
    EvidencePending = 3,
    RecommendationReady = 4,
    AwaitingApproval = 5,
    Shadow = 6,
    Canary = 7,
    Promoted = 8,
    Monitoring = 9,
    Closed = 10,
}

public enum ApprovalTier
{
    Analyst = 1,
    Lead = 2,
    Admin = 3,
}

public enum NextBestEvidenceType
{
    FreshTelemetry = 1,
    SourceCorroboration = 2,
    ConflictResolution = 3,
    UncertaintyReduction = 4,
    PostActionValidation = 5,
}

public enum AssetCriticality
{
    Low = 1,
    Medium = 2,
    High = 3,
    MissionCritical = 4,
}

public enum EvidenceFreshness
{
    Fresh = 1,
    Aging = 2,
    Stale = 3,
    Expired = 4,
}

public enum EvidenceConflictLevel
{
    None = 1,
    Low = 2,
    Medium = 3,
    High = 4,
}

public enum RolloutMode
{
    None = 1,
    Shadow = 2,
    Canary = 3,
    Promoted = 4,
}

public enum RollbackRequirement
{
    NotRequired = 1,
    Recommended = 2,
    Required = 3,
}
