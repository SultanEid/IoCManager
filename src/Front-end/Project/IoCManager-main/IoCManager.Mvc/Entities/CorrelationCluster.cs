namespace IoCManager.Mvc.Entities;

public sealed class CorrelationCluster
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = "medium";
    public int AverageConfidence { get; set; }
    public int ObservableCount { get; set; }
    public DateTime ComputedUtc { get; set; } = DateTime.UtcNow;
}
