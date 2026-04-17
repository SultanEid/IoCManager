using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net;

namespace Backend.Api.Infrastructure;

public sealed class DiscoveryRunWorker : BackgroundService
{
    private const string WorkerActorUserId = "system-discovery-worker";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDiscoveryRunQueue _queue;
    private readonly IOptionsMonitor<DiscoveryExecutionOptions> _optionsMonitor;
    private readonly ILogger<DiscoveryRunWorker> _logger;

    public DiscoveryRunWorker(
        IServiceScopeFactory scopeFactory,
        IDiscoveryRunQueue queue,
        IOptionsMonitor<DiscoveryExecutionOptions> optionsMonitor,
        ILogger<DiscoveryRunWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _queue = queue;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverQueuedRunsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            Guid runId;
            try
            {
                runId = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await ProcessRunAsync(runId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while processing discovery run {RunId}.", runId);
            }
        }
    }

    private async Task RecoverQueuedRunsAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;

        var runningRuns = await dbContext.DiscoveryRuns
            .Where(x => x.Status == DiscoveryRunStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var runningRun in runningRuns)
        {
            runningRun.Complete(
                terminalStatus: DiscoveryRunStatus.Failed,
                totalHosts: runningRun.TotalHosts,
                reachableHosts: runningRun.ReachableHosts,
                unreachableHosts: runningRun.UnreachableHosts,
                summary: "Discovery worker stopped before run completion.",
                actorUserId: WorkerActorUserId,
                completedAtUtc: nowUtc);
        }

        if (runningRuns.Length > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var queuedRunIds = await dbContext.DiscoveryRuns
            .Where(x => x.Status == DiscoveryRunStatus.Queued)
            .OrderBy(x => x.QueuedAtUtc)
            .Select(x => x.Id)
            .ToArrayAsync(cancellationToken);

        foreach (var queuedRunId in queuedRunIds)
        {
            await _queue.EnqueueAsync(queuedRunId, cancellationToken);
        }
    }

    private async Task ProcessRunAsync(Guid runId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var rangeParser = scope.ServiceProvider.GetRequiredService<DiscoveryTargetRangeParser>();
        var observationProvider = scope.ServiceProvider.GetRequiredService<IDiscoveryObservationProvider>();

        var run = await dbContext.DiscoveryRuns
            .FirstOrDefaultAsync(x => x.Id == runId, cancellationToken);
        if (run is null || run.Status != DiscoveryRunStatus.Queued)
        {
            return;
        }

        run.Start(WorkerActorUserId, DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var targetRange = rangeParser.Parse(run.RequestedCidr, run.RangeStartIp, run.RangeEndIp);
            var probeResults = await observationProvider.ObserveAsync(targetRange, cancellationToken);

            await UpsertDiscoveredHostsAsync(dbContext, run, probeResults, cancellationToken);

            var reachableHosts = probeResults.Count(x => x.Reachability == DiscoveredHostReachability.Reachable);
            var unreachableHosts = probeResults.Count - reachableHosts;
            var totalHosts = probeResults.Count;
            var terminalStatus = ClassifyTerminalStatus(totalHosts, reachableHosts);
            var summary = $"Discovery complete: {reachableHosts} reachable, {unreachableHosts} unreachable, {totalHosts} total.";
            run.Complete(
                terminalStatus,
                totalHosts,
                reachableHosts,
                unreachableHosts,
                summary,
                WorkerActorUserId,
                DateTimeOffset.UtcNow);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            run.Complete(
                DiscoveryRunStatus.Failed,
                run.TotalHosts,
                run.ReachableHosts,
                run.UnreachableHosts,
                "Discovery canceled before completion.",
                WorkerActorUserId,
                DateTimeOffset.UtcNow);
            await dbContext.SaveChangesAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discovery run {RunId} failed.", runId);
            run.Complete(
                DiscoveryRunStatus.Failed,
                run.TotalHosts,
                run.ReachableHosts,
                run.UnreachableHosts,
                $"Discovery execution failed: {ex.Message}",
                WorkerActorUserId,
                DateTimeOffset.UtcNow);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static DiscoveryRunStatus ClassifyTerminalStatus(int totalHosts, int reachableHosts)
    {
        if (totalHosts > 0 && reachableHosts == totalHosts)
        {
            return DiscoveryRunStatus.Success;
        }

        if (reachableHosts == 0)
        {
            return DiscoveryRunStatus.Unreachable;
        }

        return DiscoveryRunStatus.Partial;
    }

    private static async Task UpsertDiscoveredHostsAsync(
        CtiDbContext dbContext,
        DiscoveryRun run,
        IReadOnlyList<DiscoveryObservation> observations,
        CancellationToken cancellationToken)
    {
        var ipAddresses = observations
            .Select(x => x.IpAddress)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var existingHosts = await dbContext.DiscoveredHosts
            .Where(x => x.SubnetId == run.SubnetId && ipAddresses.Contains(x.IpAddress))
            .ToArrayAsync(cancellationToken);

        var existingByIp = existingHosts.ToDictionary(x => x.IpAddress, StringComparer.OrdinalIgnoreCase);
        foreach (var observation in observations)
        {
            if (existingByIp.TryGetValue(observation.IpAddress, out var existing))
            {
                existing.Observe(
                    run.Id,
                    observation.Hostname,
                    observation.Reachability,
                    observation.CheckedAtUtc,
                    WorkerActorUserId);
                continue;
            }

            var entity = DiscoveredHost.CreateObservation(
                subnetId: run.SubnetId,
                discoveryRunId: run.Id,
                ipAddress: observation.IpAddress,
                hostname: observation.Hostname,
                reachability: observation.Reachability,
                checkedAtUtc: observation.CheckedAtUtc,
                actorUserId: WorkerActorUserId);
            dbContext.DiscoveredHosts.Add(entity);
            existingByIp[observation.IpAddress] = entity;
        }
    }

}
