namespace IoCManager.Mvc.Services;

public sealed class CorrelationRunResult
{
    public DateTime StartedUtc { get; set; }
    public DateTime FinishedUtc { get; set; }
    public int DurationMs { get; set; }
    public int RulesFiredCount { get; set; }
    public int ClustersProduced { get; set; }
}

public interface ICorrelationEngine
{
    Task<CorrelationRunResult> RunAsync(string triggerSource, CancellationToken cancellationToken = default);
}
