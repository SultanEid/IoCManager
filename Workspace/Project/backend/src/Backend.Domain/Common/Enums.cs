namespace Backend.Domain.Common;

public enum CasePriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

public enum CaseStatus
{
    Open = 1,
    InReview = 2,
    AwaitingApproval = 3,
    Approved = 4,
    Rejected = 5,
    Closed = 6,
}

public enum DecisionState
{
    Proposed = 1,
    Approved = 2,
    Rejected = 3,
    Deferred = 4,
}

public enum ApprovalTier
{
    Analyst = 1,
    Lead = 2,
    Admin = 3,
}

public enum RuleStatus
{
    Draft = 1,
    Parsed = 2,
    Validated = 3,
    NeedsReview = 4,
    Approved = 5,
    Shadow = 6,
    Canary = 7,
    Promoted = 8,
    Disabled = 9,
    Retired = 10,
    Rejected = 11,
}

public enum DeploymentStatus
{
    Proposed = 1,
    Approved = 2,
    Rejected = 3,
    Scheduled = 4,
    Deployed = 5,
    RolledBack = 6,
}

public enum RuleProposalStatus
{
    Proposed = 1,
    Accepted = 2,
    Rejected = 3,
}

public enum RolloutStage
{
    Shadow = 1,
    Canary = 2,
    Promote = 3,
    Rollback = 4,
}

public enum FeedbackVerdict
{
    Benign = 1,
    LikelyBenign = 2,
    Suspicious = 3,
    LikelyMalicious = 4,
    Malicious = 5,
    FalsePositive = 6,
    InsufficientEvidence = 7,
    StaleOrRevoked = 8,
}

public enum JobType
{
    ScanPlanExecution = 1,
    ScheduledScan = 1, // Legacy alias for persisted/older string values.
    ModelRetraining = 2,
}

public enum JobRunStatus
{
    Succeeded = 1,
    Failed = 2,
}
