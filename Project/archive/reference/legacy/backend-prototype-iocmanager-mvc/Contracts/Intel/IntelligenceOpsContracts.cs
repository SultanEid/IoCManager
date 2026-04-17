namespace IoCManager.Mvc.Contracts.Intel;

public sealed class EvidenceCitationResponse
{
    public string SourceId { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string? SourceUri { get; set; }
    public int? StartOffset { get; set; }
    public int? EndOffset { get; set; }
    public double Confidence { get; set; }
}

public sealed class ReportIngestionRequest
{
    public string SourceName { get; set; } = "manual";
    public string DocumentId { get; set; } = string.Empty;
    public string? DocumentUrl { get; set; }
    public string DocumentText { get; set; } = string.Empty;
    public DateTime IngestionTime { get; set; } = DateTime.UtcNow;
}

public sealed class ExtractedIocResponse
{
    public string IocType { get; set; } = string.Empty;
    public string IocValue { get; set; } = string.Empty;
    public string Label { get; set; } = "candidate";
    public double Confidence { get; set; }
    public string[] AttackTechniques { get; set; } = [];
    public string[] CveRefs { get; set; } = [];
    public List<EvidenceCitationResponse> Citations { get; set; } = [];
}

public sealed class ReportIngestionResponse
{
    public string ReportId { get; set; } = string.Empty;
    public bool HumanReviewRequired { get; set; } = true;
    public List<ExtractedIocResponse> ExtractedIocs { get; set; } = [];
    public string[] CampaignHints { get; set; } = [];
    public string[] MalwareFamilyHints { get; set; } = [];
    public DateTime ProcessedAt { get; set; }
}

public sealed class RuleProposalRequest
{
    public int? ObservableId { get; set; }
    public string IocType { get; set; } = string.Empty;
    public string IocValue { get; set; } = string.Empty;
    public string RiskTier { get; set; } = "medium";
    public string? PreferredFamily { get; set; }
    public Dictionary<string, string>? Context { get; set; }
}

public sealed class RuleProposalResponse
{
    public string ProposalId { get; set; } = string.Empty;
    public bool HumanReviewRequired { get; set; } = true;
    public string RuleFamily { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string RuleBody { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
    public double Confidence { get; set; }
    public string[] AttackTechniques { get; set; } = [];
    public List<EvidenceCitationResponse> Citations { get; set; } = [];
}

public sealed class DeploymentTargetRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public string AssetClass { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public double Criticality { get; set; }
    public double NoiseTolerance { get; set; }
}

public sealed class DeploymentRecommendationRequest
{
    public string RuleFamily { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string RiskTier { get; set; } = "medium";
    public List<DeploymentTargetRequest> Targets { get; set; } = [];
}

public sealed class DeploymentRecommendationItemResponse
{
    public string RecommendationId { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public bool Deploy { get; set; }
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool HumanApprovalRequired { get; set; } = true;
}

public sealed class DeploymentRecommendationResponse
{
    public string PolicyVersion { get; set; } = string.Empty;
    public List<DeploymentRecommendationItemResponse> Recommendations { get; set; } = [];
}

public sealed class CopilotQueryRequest
{
    public string Question { get; set; } = string.Empty;
    public int? ObservableId { get; set; }
    public string[]? ReportIds { get; set; }
    public Dictionary<string, string>? AdditionalContext { get; set; }
}

public sealed class CopilotQueryResponse
{
    public string Answer { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public bool HumanReviewRequired { get; set; } = true;
    public string[] MissingEvidence { get; set; } = [];
    public List<EvidenceCitationResponse> Citations { get; set; } = [];
}

public sealed class GraphLinkCandidateRequest
{
    public int SeedObservableId { get; set; }
    public int TopK { get; set; } = 10;
    public string SeedType { get; set; } = string.Empty;
    public string SeedValue { get; set; } = string.Empty;
    public List<GraphCandidateObservableInput> CandidateNodes { get; set; } = [];
}

public sealed class GraphCandidateObservableInput
{
    public int ObservableId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public int SourceCount { get; set; }
    public DateTime LastSeenUtc { get; set; }
    public int ExistingLinks { get; set; }
}

public sealed class GraphLinkCandidateResponse
{
    public int SeedObservableId { get; set; }
    public int CandidateObservableId { get; set; }
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<EvidenceCitationResponse> Citations { get; set; } = [];
}
