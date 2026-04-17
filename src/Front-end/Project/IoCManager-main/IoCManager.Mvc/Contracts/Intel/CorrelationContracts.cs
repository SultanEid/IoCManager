namespace IoCManager.Mvc.Contracts.Intel;

public sealed class CorrelationClusterResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = string.Empty;
    public int AverageConfidence { get; set; }
    public int ObservableCount { get; set; }
    public int SeedObservableId { get; set; }
    public int? CaseId { get; set; }
    public DateTime ComputedUtc { get; set; }
}

public sealed class CorrelationStoryResponse
{
    public int ObservableId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public int EvidenceCount { get; set; }
    public int RuleHits { get; set; }
    public DateTime ComputedUtc { get; set; }
}

public sealed class CorrelationRunResponse
{
    public DateTime StartedUtc { get; set; }
    public DateTime FinishedUtc { get; set; }
    public int DurationMs { get; set; }
    public int RulesFiredCount { get; set; }
    public int ClustersProduced { get; set; }
    public DateTime ComputedAt { get; set; }
}
