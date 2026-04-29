namespace Backend.Domain.IocManager;

public enum TargetServerStatus
{
    Discovered = 1,
    Active = 2,
    Unreachable = 3,
    Retired = 4,
}

public enum ConnectivityStatus
{
    Unknown = 1,
    Online = 2,
    Degraded = 3,
    Offline = 4,
}

public enum ConnectionProtocol
{
    Ssh = 1,
    WinRm = 2,
    Agent = 3,
}

public enum ConnectionAuthMode
{
    Password = 1,
    Key = 2,
    Token = 3,
}

public enum DiscoveryRunStatus
{
    Queued = 1,
    Running = 2,
    Success = 3,
    Partial = 4,
    Unreachable = 5,
    Failed = 6,
}

public enum DiscoveredHostReachability
{
    Reachable = 1,
    Unreachable = 2,
}

public enum ScannerHealthStatus
{
    Healthy = 1,
    Degraded = 2,
    Offline = 3,
}

public enum ScannerCapability
{
    Yara = 1,
    Sigma = 2,
    Snort = 3,
    Suricata = 4,
}

public enum ScanPlanStatus
{
    Draft = 1,
    Active = 2,
    Paused = 3,
    Retired = 4,
}

public enum ScanRuleSelectionMode
{
    RuleSet = 1,
    RuleScope = 2,
}

public enum ScanCadenceType
{
    Manual = 1,
    Interval = 2,
    Daily = 3,
    Weekly = 4,
}

public enum ScanJobStatus
{
    Queued = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5,
    PartiallyCompleted = 6,
}

public enum ScanJobTargetExecutionStatus
{
    Queued = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5,
    PartiallyCompleted = 6,
}

public enum JobAttemptStatus
{
    Running = 1,
    Succeeded = 2,
    Failed = 3,
}

public enum ScanResultDisposition
{
    Informational = 1,
    Detection = 2,
    FalsePositive = 3,
    Suppressed = 4,
}

public enum AlertSeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

public enum AlertStatus
{
    Open = 1,
    Investigating = 2,
    Resolved = 3,
    Closed = 4,
}

public enum AlertIocStatus
{
    Open = 1,
    InReview = 2,
    Contained = 3,
    FalsePositive = 4,
    AcceptedRisk = 5,
}

public enum RuleRevisionStatus
{
    Draft = 1,
    Validated = 2,
    Published = 3,
    Deprecated = 4,
}

public enum RuleDistributionStatus
{
    Pending = 1,
    Applied = 2,
    Failed = 3,
}

public enum RuleDistributionJobStatus
{
    Queued = 1,
    Running = 2,
    Retrying = 3,
    Succeeded = 4,
    Partial = 5,
    Failed = 6,
    Canceled = 7,
}

public enum RuleDistributionAttemptStatus
{
    Running = 1,
    Succeeded = 2,
    Partial = 3,
    Failed = 4,
}

public enum RuleDistributionTargetStatus
{
    Pending = 1,
    Success = 2,
    Failure = 3,
    Unreachable = 4,
    ValidationFailed = 5,
    PartiallyApplied = 6,
}

public enum RuleScopeType
{
    Global = 1,
    Environment = 2,
    Subnet = 3,
    Server = 4,
    Scanner = 5,
}

public enum FeedSourceType
{
    FileUpload = 1,
    ApiPull = 2,
    Manual = 3,
}

public enum IocType
{
    Ip = 1,
    Domain = 2,
    Url = 3,
    Hash = 4,
    Process = 5,
    Artifact = 6,
}

public enum ReportType
{
    Operational = 1,
    Executive = 2,
    Compliance = 3,
    ExecutiveSummary = 4,
    DetailedIocReport = 5,
    TargetExposureSummary = 6,
    ScanActivitySummary = 7,
}

public enum RetentionDataType
{
    ScanResult = 1,
    Alert = 2,
    Report = 3,
    AuditLog = 4,
    IocFile = 5,
}
