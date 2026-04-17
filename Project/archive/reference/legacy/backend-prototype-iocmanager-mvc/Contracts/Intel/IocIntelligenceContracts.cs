namespace IoCManager.Mvc.Contracts.Intel;

public sealed class ScoreIocRequest
{
    public string IocValue { get; set; } = string.Empty;
    public string IocType { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = "manual";
    public DateTime EventTime { get; set; } = DateTime.UtcNow;
    public Dictionary<string, string> HostContext { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, string> RuleContext { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class ScoreBatchRequest
{
    public List<ScoreIocRequest> Items { get; set; } = [];
}

public sealed class FeedbackRequest
{
    public string IocValue { get; set; } = string.Empty;
    public string IocType { get; set; } = string.Empty;
    public string Verdict { get; set; } = string.Empty;
    public string? CaseId { get; set; }
    public string SourceSystem { get; set; } = "analyst";
    public DateTime EventTime { get; set; } = DateTime.UtcNow;
    public Dictionary<string, string>? Metadata { get; set; }
}

public sealed class ScoreResponse
{
    public double RiskScore { get; set; }
    public string RiskTier { get; set; } = "unknown";
    public double Confidence { get; set; }
    public double[] UncertaintySet { get; set; } = [];
    public List<EvidenceItemResponse> TopEvidence { get; set; } = [];
    public string RecommendedAction { get; set; } = "monitor";
    public int TtlHours { get; set; } = 24;
    public string ModelVersion { get; set; } = "unknown";
}

public sealed class EvidenceItemResponse
{
    public string Feature { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public double Contribution { get; set; }
}

public sealed class BatchScoreResponse
{
    public List<ScoreResponse> Items { get; set; } = [];
}

public sealed class ModelCardResponse
{
    public string ModelVersion { get; set; } = "unknown";
    public string TrainedAtUtc { get; set; } = string.Empty;
    public string[] Views { get; set; } = [];
    public string[] Metrics { get; set; } = [];
    public string[] SupportedIocTypes { get; set; } = [];
    public string OptimizationTarget { get; set; } = "recall-first";
}

public sealed class IocScoringResult
{
    public ScoreResponse? Score { get; set; }
    public string? Error { get; set; }
}
