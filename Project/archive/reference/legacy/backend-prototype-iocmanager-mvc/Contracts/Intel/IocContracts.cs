namespace IoCManager.Mvc.Contracts.Intel;

public sealed class IocUpsertRequest
{
    public string Type { get; set; } = "domain";
    public string Value { get; set; } = string.Empty;
    public DateTime? ExpiresAtUtc { get; set; }
    public string Source { get; set; } = "manual";
    public string SourceSystem { get; set; } = "manual";
    public DateTime? EventTime { get; set; }
    public Dictionary<string, string>? HostContext { get; set; }
    public Dictionary<string, string>? RuleContext { get; set; }
    public Dictionary<string, string>? Evidence { get; set; }
}

public sealed class IocStatusUpdateRequest
{
    public string Status { get; set; } = "new";
}

public sealed class IocListResponse
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public int SourceCount { get; set; }
    public DateTime FirstSeenUtc { get; set; }
    public DateTime LastSeenUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public IReadOnlyDictionary<string, int> ConfidenceFactors { get; set; } = new Dictionary<string, int>();
    public double RiskScore { get; set; }
    public string RiskTier { get; set; } = "unknown";
    public double ModelConfidence { get; set; }
    public string RecommendedAction { get; set; } = "monitor";
    public string ModelVersion { get; set; } = "unscored";
    public DateTime? LastScoredUtc { get; set; }
}
