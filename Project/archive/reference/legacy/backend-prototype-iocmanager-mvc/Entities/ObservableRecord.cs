namespace IoCManager.Mvc.Entities;

public sealed class ObservableRecord
{
    public int Id { get; set; }
    public string Type { get; set; } = "domain";
    public string ValueRaw { get; set; } = string.Empty;
    public string ValueCanonical { get; set; } = string.Empty;
    public string Status { get; set; } = "new";
    public DateTime FirstSeenUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public int Confidence { get; set; } = 40;
    public int SourceCount { get; set; }
    public int BaseConfidence { get; set; } = 40;
    public int SourceBonus { get; set; }
    public int SightingBonus { get; set; }
    public int CorrelationBonus { get; set; }
    public double ModelRiskScore { get; set; }
    public string RiskTier { get; set; } = "unknown";
    public double ModelConfidence { get; set; }
    public string UncertaintySet { get; set; } = "[]";
    public string RecommendedAction { get; set; } = "monitor";
    public int TtlHours { get; set; } = 24;
    public string ModelVersion { get; set; } = "unscored";
    public DateTime? LastScoredUtc { get; set; }
}
