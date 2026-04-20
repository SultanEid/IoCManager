using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class RuleDistributionWorker : BackgroundService
{
    private const string WorkerActorUserId = "system-distribution-worker";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRuleDistributionJobQueue _queue;
    private readonly IOptionsMonitor<RuleDistributionExecutionOptions> _options;
    private readonly ILogger<RuleDistributionWorker> _logger;

    public RuleDistributionWorker(
        IServiceScopeFactory scopeFactory,
        IRuleDistributionJobQueue queue,
        IOptionsMonitor<RuleDistributionExecutionOptions> options,
        ILogger<RuleDistributionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _queue = queue;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverInFlightJobsAsync(stoppingToken);
        var schedulerTask = ScheduleDueJobsLoopAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            Guid jobId;
            try
            {
                jobId = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await ProcessJobAsync(jobId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while processing distribution job {JobId}.", jobId);
            }
        }

        await schedulerTask;
    }

    private async Task ScheduleDueJobsLoopAsync(CancellationToken cancellationToken)
    {
        await EnqueueDueJobsAsync(cancellationToken);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(1, _options.CurrentValue.SchedulerIntervalSeconds)));
        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            try
            {
                await EnqueueDueJobsAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed while enqueueing due distribution jobs.");
            }
        }
    }

    private async Task RecoverInFlightJobsAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;

        var runningAttempts = await dbContext.RuleDistributionAttempts
            .Where(x => x.Status == RuleDistributionAttemptStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var attempt in runningAttempts)
        {
            attempt.Complete(
                status: RuleDistributionAttemptStatus.Failed,
                summary: "Distribution worker stopped before attempt completion.",
                backoffSeconds: null,
                actorUserId: WorkerActorUserId,
                completedAtUtc: nowUtc);
        }

        var runningJobs = await dbContext.RuleDistributionJobs
            .Where(x => x.Status == RuleDistributionJobStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var job in runningJobs)
        {
            if (job.AttemptCount >= job.MaxAttempts)
            {
                job.Complete(
                    terminalOrRetryStatus: RuleDistributionJobStatus.Failed,
                    summary: "Distribution worker interrupted and max attempts reached.",
                    actorUserId: WorkerActorUserId,
                    completedAtUtc: nowUtc,
                    nextAttemptAtUtc: null);
                continue;
            }

            var backoff = _options.CurrentValue.ResolveBackoffSeconds(Math.Max(1, job.AttemptCount));
            job.Complete(
                terminalOrRetryStatus: RuleDistributionJobStatus.Retrying,
                summary: "Distribution worker interrupted; retry scheduled.",
                actorUserId: WorkerActorUserId,
                completedAtUtc: nowUtc,
                nextAttemptAtUtc: nowUtc.AddSeconds(backoff));
        }

        if (runningAttempts.Length > 0 || runningJobs.Length > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await EnqueueDueJobsAsync(cancellationToken);
    }

    private async Task EnqueueDueJobsAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;

        var dueJobIds = await dbContext.RuleDistributionJobs
            .AsNoTracking()
            .Where(x => (x.Status == RuleDistributionJobStatus.Queued || x.Status == RuleDistributionJobStatus.Retrying)
                && (!x.NextAttemptAtUtc.HasValue || x.NextAttemptAtUtc.Value <= nowUtc))
            .OrderBy(x => x.NextAttemptAtUtc ?? x.QueuedAtUtc)
            .Select(x => x.Id)
            .ToArrayAsync(cancellationToken);

        foreach (var dueJobId in dueJobIds)
        {
            await _queue.EnqueueAsync(dueJobId, cancellationToken);
        }
    }

    private async Task ProcessJobAsync(Guid jobId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IRuleDistributionTransportDispatcher>();

        var nowUtc = DateTimeOffset.UtcNow;
        var job = await dbContext.RuleDistributionJobs
            .FirstOrDefaultAsync(x => x.Id == jobId, cancellationToken);
        if (job is null)
        {
            return;
        }

        if (job.Status is not (RuleDistributionJobStatus.Queued or RuleDistributionJobStatus.Retrying))
        {
            return;
        }

        if (job.NextAttemptAtUtc.HasValue && job.NextAttemptAtUtc.Value > nowUtc)
        {
            return;
        }

        var attemptNumber = job.AttemptCount + 1;
        if (attemptNumber > job.MaxAttempts)
        {
            job.Complete(
                terminalOrRetryStatus: RuleDistributionJobStatus.Failed,
                summary: "Maximum distribution attempts exceeded.",
                actorUserId: WorkerActorUserId,
                completedAtUtc: nowUtc);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var triggeredBy = string.IsNullOrWhiteSpace(job.UpdatedByUserId)
            ? job.OperatorUserId
            : job.UpdatedByUserId;
        job.StartAttempt(attemptNumber, WorkerActorUserId, nowUtc);
        var attempt = RuleDistributionAttempt.Start(job.Id, attemptNumber, triggeredBy, nowUtc);
        dbContext.RuleDistributionAttempts.Add(attempt);
        await dbContext.SaveChangesAsync(cancellationToken);

        var revision = await dbContext.RuleRevisionsV2
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == job.RuleRevisionId, cancellationToken);
        RuleArtifact? artifact = null;
        if (revision is not null)
        {
            artifact = await dbContext.RuleArtifacts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == revision.RuleArtifactId, cancellationToken);
        }

        var targets = await dbContext.RuleDistributionTargets
            .Where(x => x.RuleDistributionJobId == job.Id)
            .OrderBy(x => x.TargetHostname)
            .ThenBy(x => x.TargetIpAddress)
            .ToArrayAsync(cancellationToken);

        var dispatchableTargets = targets.Where(x => x.CanDispatch()).ToArray();
        var serverIds = dispatchableTargets.Select(x => x.TargetServerId).Distinct().ToArray();
        var servers = await dbContext.TargetServers
            .AsNoTracking()
            .Where(x => serverIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        var secrets = await dbContext.TargetServerConnectionSecrets
            .AsNoTracking()
            .Where(x => serverIds.Contains(x.TargetServerId))
            .ToDictionaryAsync(x => x.TargetServerId, cancellationToken);

        foreach (var target in dispatchableTargets)
        {
            var targetStartedAtUtc = DateTimeOffset.UtcNow;
            RuleDistributionDispatchResult result;

            if (revision is null || artifact is null)
            {
                result = new RuleDistributionDispatchResult(
                    Status: RuleDistributionTargetStatus.ValidationFailed,
                    IsRetryable: false,
                    Transport: "validation",
                    Diagnostic: "Rule revision or artifact was not found.",
                    RemoteCorrelationId: null);
            }
            else if (!revision.IsDeploymentReady)
            {
                result = new RuleDistributionDispatchResult(
                    Status: RuleDistributionTargetStatus.ValidationFailed,
                    IsRetryable: false,
                    Transport: "validation",
                    Diagnostic: "Rule revision is not deployment-ready.",
                    RemoteCorrelationId: null);
            }
            else if (!servers.TryGetValue(target.TargetServerId, out var server))
            {
                result = new RuleDistributionDispatchResult(
                    Status: RuleDistributionTargetStatus.Unreachable,
                    IsRetryable: true,
                    Transport: "inventory",
                    Diagnostic: "Target server record was not found.",
                    RemoteCorrelationId: null);
            }
            else
            {
                secrets.TryGetValue(server.Id, out var secret);
                result = await dispatcher.DispatchAsync(
                    server,
                    secret,
                    artifact,
                    revision,
                    job,
                    attempt,
                    target,
                    cancellationToken);
            }

            var targetCompletedAtUtc = DateTimeOffset.UtcNow;
            target.MarkResult(
                status: result.Status,
                isRetryable: result.IsRetryable,
                errorMessage: result.Diagnostic,
                actorUserId: WorkerActorUserId,
                nowUtc: targetCompletedAtUtc);

            dbContext.RuleDistributionTargetAttempts.Add(
                RuleDistributionTargetAttempt.Create(
                    ruleDistributionAttemptId: attempt.Id,
                    ruleDistributionTargetId: target.Id,
                    status: result.Status,
                    transport: result.Transport,
                    remoteCorrelationId: result.RemoteCorrelationId,
                    diagnostic: result.Diagnostic,
                    isRetryable: result.IsRetryable,
                    actorUserId: WorkerActorUserId,
                    startedAtUtc: targetStartedAtUtc,
                    completedAtUtc: targetCompletedAtUtc));

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var counts = ComputeCounts(targets);
        var shouldRetry = counts.RetryableTargets > 0 && attemptNumber < job.MaxAttempts;
        int? backoffSeconds = null;
        DateTimeOffset? nextAttemptAtUtc = null;

        if (shouldRetry)
        {
            backoffSeconds = ResolveBackoffWithOptionalJitter(attemptNumber);
            nextAttemptAtUtc = DateTimeOffset.UtcNow.AddSeconds(backoffSeconds.Value);
            job.Complete(
                terminalOrRetryStatus: RuleDistributionJobStatus.Retrying,
                summary: BuildSummary(attemptNumber, counts, shouldRetry: true, backoffSeconds),
                actorUserId: WorkerActorUserId,
                completedAtUtc: DateTimeOffset.UtcNow,
                nextAttemptAtUtc: nextAttemptAtUtc);
        }
        else
        {
            job.Complete(
                terminalOrRetryStatus: ResolveTerminalJobStatus(counts),
                summary: BuildSummary(attemptNumber, counts, shouldRetry: false, backoffSeconds: null),
                actorUserId: WorkerActorUserId,
                completedAtUtc: DateTimeOffset.UtcNow);
        }

        attempt.Complete(
            status: ResolveAttemptStatus(counts),
            summary: BuildSummary(attemptNumber, counts, shouldRetry, backoffSeconds),
            backoffSeconds: backoffSeconds,
            actorUserId: WorkerActorUserId,
            completedAtUtc: DateTimeOffset.UtcNow);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static RuleDistributionJobStatus ResolveTerminalJobStatus(DistributionStatusCounts counts)
    {
        if (counts.TotalTargets == 0)
        {
            return RuleDistributionJobStatus.Failed;
        }

        if (counts.SuccessTargets == counts.TotalTargets)
        {
            return RuleDistributionJobStatus.Succeeded;
        }

        return counts.SuccessTargets > 0 || counts.ValidationFailedTargets > 0 || counts.PartiallyAppliedTargets > 0
            ? RuleDistributionJobStatus.Partial
            : RuleDistributionJobStatus.Failed;
    }

    private static RuleDistributionAttemptStatus ResolveAttemptStatus(DistributionStatusCounts counts)
    {
        if (counts.TotalTargets == 0)
        {
            return RuleDistributionAttemptStatus.Failed;
        }

        if (counts.SuccessTargets == counts.TotalTargets)
        {
            return RuleDistributionAttemptStatus.Succeeded;
        }

        return counts.SuccessTargets > 0 || counts.ValidationFailedTargets > 0 || counts.PartiallyAppliedTargets > 0
            ? RuleDistributionAttemptStatus.Partial
            : RuleDistributionAttemptStatus.Failed;
    }

    private static string BuildSummary(int attemptNumber, DistributionStatusCounts counts, bool shouldRetry, int? backoffSeconds)
    {
        var retrySuffix = shouldRetry
            ? $"; retry scheduled in {backoffSeconds ?? 0}s"
            : "; no further retries";

        return $"Attempt {attemptNumber}: success={counts.SuccessTargets}, failure={counts.FailureTargets}, unreachable={counts.UnreachableTargets}, validationFailed={counts.ValidationFailedTargets}, partiallyApplied={counts.PartiallyAppliedTargets}{retrySuffix}.";
    }

    private static DistributionStatusCounts ComputeCounts(IReadOnlyCollection<RuleDistributionTarget> targets)
    {
        var successTargets = targets.Count(x => x.Status == RuleDistributionTargetStatus.Success);
        var failureTargets = targets.Count(x => x.Status == RuleDistributionTargetStatus.Failure);
        var unreachableTargets = targets.Count(x => x.Status == RuleDistributionTargetStatus.Unreachable);
        var validationFailedTargets = targets.Count(x => x.Status == RuleDistributionTargetStatus.ValidationFailed);
        var partiallyAppliedTargets = targets.Count(x => x.Status == RuleDistributionTargetStatus.PartiallyApplied);
        var retryableTargets = targets.Count(x => x.IsRetryable && x.Status is RuleDistributionTargetStatus.Failure or RuleDistributionTargetStatus.Unreachable or RuleDistributionTargetStatus.PartiallyApplied);

        return new DistributionStatusCounts(
            TotalTargets: targets.Count,
            SuccessTargets: successTargets,
            FailureTargets: failureTargets,
            UnreachableTargets: unreachableTargets,
            ValidationFailedTargets: validationFailedTargets,
            PartiallyAppliedTargets: partiallyAppliedTargets,
            RetryableTargets: retryableTargets);
    }

    private int ResolveBackoffWithOptionalJitter(int attemptNumber)
    {
        var options = _options.CurrentValue;
        var delay = options.ResolveBackoffSeconds(attemptNumber);
        if (!options.EnableJitter || options.MaxJitterSeconds <= 0)
        {
            return delay;
        }

        var jitter = Random.Shared.Next(0, options.MaxJitterSeconds + 1);
        return delay + jitter;
    }

    private sealed record DistributionStatusCounts(
        int TotalTargets,
        int SuccessTargets,
        int FailureTargets,
        int UnreachableTargets,
        int ValidationFailedTargets,
        int PartiallyAppliedTargets,
        int RetryableTargets);
}
