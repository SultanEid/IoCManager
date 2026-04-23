namespace Backend.Api.Infrastructure;

public sealed class AiDecisionExecutionOptions
{
    public const string SectionName = "Infrastructure:AiDecision";

    public int SchedulerIntervalSeconds { get; set; } = 10;
    public int MaxAttempts { get; set; } = 3;
    public int HistoricalTopK { get; set; } = 10;
    public int HistoricalLookbackDays { get; set; } = 90;
    public int[] BackoffSeconds { get; set; } = [10, 30, 60, 120];
    public string WorkerActorUserId { get; set; } = "system-ai-decision-worker";
}

