namespace IoCManager.Mvc.Contracts.Intel;

public sealed class OpenCaseRequest
{
    public string Title { get; set; } = string.Empty;
    public string CaseType { get; set; } = "ioc";
    public string Priority { get; set; } = "medium";
    public string IocType { get; set; } = string.Empty;
    public string IocValue { get; set; } = string.Empty;
    public DateTime? SlaDueAt { get; set; }
    public double StrategicValueScore { get; set; } = 0.5;
    public Dictionary<string, string>? InitialHostContext { get; set; }
    public Dictionary<string, string>? InitialRuleContext { get; set; }
}

public sealed class OpenCaseResponse
{
    public string CaseId { get; set; } = string.Empty;
    public string State { get; set; } = "open";
    public string BundleId { get; set; } = string.Empty;
    public DateTime OpenedAt { get; set; }
}

public sealed class ScoreCaseRequest
{
    public string CaseId { get; set; } = string.Empty;
    public DateTime? AsOfTime { get; set; }
    public string SourceSystem { get; set; } = "manager";
    public string IocType { get; set; } = string.Empty;
    public string IocValue { get; set; } = string.Empty;
    public Dictionary<string, string> HostContext { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, string> RuleContext { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CaseScoreVectorResponse
{
    public double MaliciousnessScore { get; set; }
    public double ActionabilityScore { get; set; }
    public double DeployabilityScore { get; set; }
    public double DecayScore { get; set; }
    public double UncertaintyScore { get; set; }
    public double BlastRadiusScore { get; set; }
    public double[] UncertaintyBand { get; set; } = [];
    public List<EvidenceItemResponse> TopEvidence { get; set; } = [];
    public string ModelVersion { get; set; } = "unknown";
    public string DatasetVersion { get; set; } = "unknown";
    public string FeatureSnapshotHash { get; set; } = string.Empty;
}

public sealed class RecommendActionRequest
{
    public string CaseId { get; set; } = string.Empty;
    public CaseScoreVectorResponse? ScoreVector { get; set; }
    public bool IsCriticalAsset { get; set; }
    public double EvidenceConflict { get; set; }
    public int MissingEvidenceHintsCount { get; set; }
}

public sealed class RecommendActionResponse
{
    public string DecisionState { get; set; } = "defer";
    public string RecommendedAction { get; set; } = "monitor";
    public string ApprovalTierRequired { get; set; } = "analyst";
    public string RolloutMode { get; set; } = "none";
    public string RollbackPlan { get; set; } = "{}";
    public double BlastRadius { get; set; }
    public double[] UncertaintyBand { get; set; } = [];
    public List<EvidenceItemResponse> TopEvidence { get; set; } = [];
    public string[] NextBestEvidence { get; set; } = [];
    public Dictionary<string, string> SnapshotRefs { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string PolicyVersion { get; set; } = "cti-policy-v1";
    public string ModelVersion { get; set; } = "unknown";
    public string ReasonSummary { get; set; } = string.Empty;
}

public sealed class RequestMoreEvidenceRequest
{
    public string CaseId { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public sealed class RequestMoreEvidenceResponse
{
    public string CaseId { get; set; } = string.Empty;
    public string DecisionState { get; set; } = "defer";
    public string[] NextBestEvidence { get; set; } = [];
    public string Reason { get; set; } = string.Empty;
}

public sealed class SimulateRuleRequest
{
    public string CaseId { get; set; } = string.Empty;
    public string RuleType { get; set; } = "sigma";
    public string RuleBody { get; set; } = string.Empty;
}

public sealed class SimulateRuleResponse
{
    public string CaseId { get; set; } = string.Empty;
    public double PredictedCoverage { get; set; }
    public double PredictedFpRisk { get; set; }
    public string RecommendedRolloutMode { get; set; } = "shadow";
    public string Summary { get; set; } = string.Empty;
}

public sealed class CanaryDeploymentRequest
{
    public string CaseId { get; set; } = string.Empty;
    public string RuleProposalId { get; set; } = string.Empty;
    public double ScopePercent { get; set; } = 10;
}

public sealed class CanaryDeploymentResponse
{
    public string CaseId { get; set; } = string.Empty;
    public string RolloutMode { get; set; } = "canary";
    public string Status { get; set; } = "scheduled";
    public DateTime ScheduledAtUtc { get; set; }
}

public sealed class PromoteRuleProposalRequest
{
    public string CaseId { get; set; } = string.Empty;
    public string RuleProposalId { get; set; } = string.Empty;
}

public sealed class PromoteRuleProposalResponse
{
    public string CaseId { get; set; } = string.Empty;
    public string RuleProposalId { get; set; } = string.Empty;
    public string RolloutMode { get; set; } = "promote";
    public string Status { get; set; } = "approved";
}

public sealed class RecordOverrideRequest
{
    public string CaseId { get; set; } = string.Empty;
    public string PreviousDecisionState { get; set; } = "defer";
    public string NewDecisionState { get; set; } = "recommend";
    public string Reason { get; set; } = string.Empty;
    public string VerdictType { get; set; } = "escalated";
    public string LabelStrength { get; set; } = "weak";
    public double OperatorConfidence { get; set; } = 0.5;
    public long ReviewLatencyMs { get; set; }
    public string TeamId { get; set; } = "default";
}

public sealed class RecordOverrideResponse
{
    public string CaseId { get; set; } = string.Empty;
    public string OverrideId { get; set; } = string.Empty;
    public string FeedbackId { get; set; } = string.Empty;
    public DateTime RecordedAtUtc { get; set; }
}
