namespace IoCManager.Mvc.Entities;

public sealed class CorrelationRunLog
{
    public int Id { get; set; }
    public DateTime StartedUtc { get; set; } = DateTime.UtcNow;
    public DateTime FinishedUtc { get; set; } = DateTime.UtcNow;
    public int DurationMs { get; set; }
    public int RulesFiredCount { get; set; }
    public int ClustersProduced { get; set; }
    public string TriggerSource { get; set; } = "scheduled";
}
