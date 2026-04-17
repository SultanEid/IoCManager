namespace Backend.Api.Infrastructure;

public sealed class RuleDistributionExecutionOptions
{
    public const string SectionName = "Infrastructure:RuleDistribution";

    public int MaxAttempts { get; init; } = 5;
    public int[] BackoffSeconds { get; init; } = [15, 30, 60, 120, 240];
    public int SchedulerIntervalSeconds { get; init; } = 5;
    public int CommandTimeoutSeconds { get; init; } = 45;
    public int HttpTimeoutSeconds { get; init; } = 30;
    public bool EnableJitter { get; init; } = true;
    public int MaxJitterSeconds { get; init; } = 3;
    public string SshRemoteRuleDirectory { get; init; } = "/tmp/ioc-rules";
    public string? SshApplyCommandTemplate { get; init; }
    public string AgentEndpointPath { get; init; } = "/api/v1/rules/distribute";

    public int ResolveBackoffSeconds(int attemptNumber)
    {
        if (attemptNumber <= 0)
        {
            return BackoffSeconds[0];
        }

        var index = Math.Min(attemptNumber - 1, BackoffSeconds.Length - 1);
        return BackoffSeconds[index];
    }
}
