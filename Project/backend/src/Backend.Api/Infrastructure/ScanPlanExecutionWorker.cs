using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Backend.Api.Infrastructure;

public sealed class ScanPlanExecutionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IScanJobQueue _scanJobQueue;
    private readonly IOptionsMonitor<ScanExecutionOptions> _optionsMonitor;
    private readonly ILogger<ScanPlanExecutionWorker> _logger;

    public ScanPlanExecutionWorker(
        IServiceScopeFactory scopeFactory,
        IScanJobQueue scanJobQueue,
        IOptionsMonitor<ScanExecutionOptions> optionsMonitor,
        ILogger<ScanPlanExecutionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _scanJobQueue = scanJobQueue;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverInFlightJobsAsync(stoppingToken);
        var schedulerTask = SchedulePlansLoopAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            Guid scanJobId;
            try
            {
                scanJobId = await _scanJobQueue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await ProcessScanJobAsync(scanJobId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while processing scan job {ScanJobId}.", scanJobId);
            }
        }

        await schedulerTask;
    }

    private string WorkerActorUserId
    {
        get
        {
            var configured = _optionsMonitor.CurrentValue.WorkerActorUserId;
            return string.IsNullOrWhiteSpace(configured)
                ? "system-scan-worker"
                : configured.Trim();
        }
    }

    private async Task RecoverInFlightJobsAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var actorUserId = WorkerActorUserId;
        var nowUtc = DateTimeOffset.UtcNow;

        var runningTargets = await dbContext.ScanJobTargetExecutions
            .Where(x => x.Status == ScanJobTargetExecutionStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var runningTarget in runningTargets)
        {
            runningTarget.Complete(
                ScanJobTargetExecutionStatus.Failed,
                summary: "Execution interrupted during worker recovery.",
                errorMessage: "Worker restart interrupted execution.",
                actorUserId: actorUserId,
                completedAtUtc: nowUtc);
        }

        var runningJobs = await dbContext.ScanJobs
            .Where(x => x.Status == ScanJobStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var runningJob in runningJobs)
        {
            var terminal = runningJob.CancellationRequested
                ? ScanJobStatus.Cancelled
                : ScanJobStatus.Failed;
            var summary = runningJob.CancellationRequested
                ? "Job cancelled during worker recovery."
                : "Worker restart interrupted running scan job.";
            runningJob.Complete(terminal, summary, actorUserId, nowUtc);
        }

        if (runningTargets.Length > 0 || runningJobs.Length > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var queuedScanJobIds = await dbContext.ScanJobs
            .AsNoTracking()
            .Where(x => x.Status == ScanJobStatus.Queued)
            .OrderBy(x => x.QueuedAtUtc)
            .Select(x => x.Id)
            .ToArrayAsync(cancellationToken);

        foreach (var queuedScanJobId in queuedScanJobIds)
        {
            await _scanJobQueue.EnqueueAsync(queuedScanJobId, cancellationToken);
        }
    }

    private async Task SchedulePlansLoopAsync(CancellationToken cancellationToken)
    {
        await EnqueueDuePlansAsync(cancellationToken);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(1, _optionsMonitor.CurrentValue.SchedulerIntervalSeconds)));
        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            try
            {
                await EnqueueDuePlansAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed while enqueueing due scan plans.");
            }
        }
    }

    private async Task EnqueueDuePlansAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;
        var actorUserId = WorkerActorUserId;

        var duePlans = await dbContext.ScanPlans
            .Where(x => x.Status == ScanPlanStatus.Active
                && x.NextRunAtUtc.HasValue
                && x.NextRunAtUtc.Value <= nowUtc)
            .OrderBy(x => x.NextRunAtUtc)
            .ToArrayAsync(cancellationToken);

        if (duePlans.Length == 0)
        {
            return;
        }

        var queuedScanJobIds = new List<Guid>(duePlans.Length);

        foreach (var duePlan in duePlans)
        {
            var targetServerIds = await dbContext.ScanPlanTargetServers
                .Where(x => x.ScanPlanId == duePlan.Id)
                .Select(x => x.TargetServerId)
                .Distinct()
                .ToArrayAsync(cancellationToken);

            if (targetServerIds.Length == 0)
            {
                var failedJob = ScanJob.Queue(duePlan.Id, "Scheduled", actorUserId, nowUtc);
                failedJob.Start(actorUserId, nowUtc);
                failedJob.Complete(ScanJobStatus.Failed, "No target servers are linked to this scan plan.", actorUserId, nowUtc);
                dbContext.ScanJobs.Add(failedJob);
                duePlan.MarkQueued(actorUserId, nowUtc);
                continue;
            }

            var queuedJob = ScanJob.Queue(duePlan.Id, "Scheduled", actorUserId, nowUtc);
            dbContext.ScanJobs.Add(queuedJob);

            var targets = await dbContext.TargetServers
                .AsNoTracking()
                .Where(x => targetServerIds.Contains(x.Id))
                .ToArrayAsync(cancellationToken);

            foreach (var target in targets)
            {
                dbContext.ScanJobTargetExecutions.Add(
                    ScanJobTargetExecution.QueueSnapshot(
                        queuedJob.Id,
                        target.Id,
                        target.Hostname,
                        target.IpAddress,
                        actorUserId,
                        nowUtc));
            }

            duePlan.MarkQueued(actorUserId, nowUtc);
            queuedScanJobIds.Add(queuedJob.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var queuedScanJobId in queuedScanJobIds)
        {
            await _scanJobQueue.EnqueueAsync(queuedScanJobId, cancellationToken);
        }
    }

    private async Task ProcessScanJobAsync(Guid scanJobId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IScanExecutionDispatcher>();
        var resultIngestionService = scope.ServiceProvider.GetRequiredService<IResultIngestionService>();
        var legacyScannerResultExtractor = scope.ServiceProvider.GetRequiredService<ILegacyScannerResultExtractor>();
        var actorUserId = WorkerActorUserId;

        var scanJob = await dbContext.ScanJobs
            .FirstOrDefaultAsync(x => x.Id == scanJobId, cancellationToken);
        if (scanJob is null || scanJob.Status != ScanJobStatus.Queued)
        {
            return;
        }

        var queuedTargets = await dbContext.ScanJobTargetExecutions
            .Where(x => x.ScanJobId == scanJobId)
            .OrderBy(x => x.TargetHostname)
            .ThenBy(x => x.TargetIpAddress)
            .ToArrayAsync(cancellationToken);

        if (scanJob.CancellationRequested)
        {
            var nowUtc = DateTimeOffset.UtcNow;
            CancelQueuedTargets(queuedTargets, actorUserId, nowUtc, scanJob.CancellationReason);
            scanJob.Complete(ScanJobStatus.Cancelled, "Job cancellation requested before execution.", actorUserId, nowUtc);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var startedAtUtc = DateTimeOffset.UtcNow;
        scanJob.Start(actorUserId, startedAtUtc);
        await dbContext.SaveChangesAsync(cancellationToken);

        var attemptNumber = await dbContext.JobAttempts
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJob.Id)
            .CountAsync(cancellationToken) + 1;
        var jobAttempt = JobAttempt.Start(scanJob.Id, attemptNumber, actorUserId, DateTimeOffset.UtcNow);
        dbContext.JobAttempts.Add(jobAttempt);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (!scanJob.ScanPlanId.HasValue)
        {
            var failedAtUtc = DateTimeOffset.UtcNow;
            scanJob.Complete(ScanJobStatus.Failed, "Scan job is not linked to a scan plan.", actorUserId, failedAtUtc);
            CompleteAttemptIfRunning(jobAttempt, JobAttemptStatus.Failed, "Scan job is not linked to a scan plan.", actorUserId, failedAtUtc);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var scanPlan = await dbContext.ScanPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanJob.ScanPlanId.Value, cancellationToken);
        if (scanPlan is null)
        {
            var failedAtUtc = DateTimeOffset.UtcNow;
            scanJob.Complete(ScanJobStatus.Failed, "Referenced scan plan was not found.", actorUserId, failedAtUtc);
            CompleteAttemptIfRunning(jobAttempt, JobAttemptStatus.Failed, "Referenced scan plan was not found.", actorUserId, failedAtUtc);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        if (queuedTargets.Length == 0)
        {
            var scanPlanTargetServerIds = await dbContext.ScanPlanTargetServers
                .AsNoTracking()
                .Where(x => x.ScanPlanId == scanPlan.Id)
                .Select(x => x.TargetServerId)
                .ToArrayAsync(cancellationToken);
            var scanPlanTargets = await dbContext.TargetServers
                .AsNoTracking()
                .Where(x => scanPlanTargetServerIds.Contains(x.Id))
                .ToArrayAsync(cancellationToken);

            foreach (var scanPlanTarget in scanPlanTargets)
            {
                dbContext.ScanJobTargetExecutions.Add(
                    ScanJobTargetExecution.QueueSnapshot(
                        scanJob.Id,
                        scanPlanTarget.Id,
                        scanPlanTarget.Hostname,
                        scanPlanTarget.IpAddress,
                        actorUserId,
                        DateTimeOffset.UtcNow));
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            queuedTargets = await dbContext.ScanJobTargetExecutions
                .Where(x => x.ScanJobId == scanJobId)
                .OrderBy(x => x.TargetHostname)
                .ThenBy(x => x.TargetIpAddress)
                .ToArrayAsync(cancellationToken);
        }

        if (queuedTargets.Length == 0)
        {
            var failedAtUtc = DateTimeOffset.UtcNow;
            scanJob.Complete(ScanJobStatus.Failed, "No target executions were resolved for this scan job.", actorUserId, failedAtUtc);
            CompleteAttemptIfRunning(jobAttempt, JobAttemptStatus.Failed, "No target executions were resolved for this scan job.", actorUserId, failedAtUtc);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var effectiveRules = await ResolveEffectiveRulesAsync(dbContext, scanPlan, cancellationToken);
        var targetIds = queuedTargets.Select(x => x.TargetServerId).Distinct().ToArray();
        var targetServers = await dbContext.TargetServers
            .AsNoTracking()
            .Where(x => targetIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        var secretsByTargetServerId = await dbContext.TargetServerConnectionSecrets
            .AsNoTracking()
            .Where(x => targetIds.Contains(x.TargetServerId))
            .ToDictionaryAsync(x => x.TargetServerId, cancellationToken);
        var scannerCandidates = await ResolveScannerCandidatesAsync(dbContext, scanPlan.ScannerCapability, targetIds, cancellationToken);

        foreach (var targetExecution in queuedTargets)
        {
            if (scanJob.CancellationRequested)
            {
                CancelQueuedTargets([targetExecution], actorUserId, DateTimeOffset.UtcNow, scanJob.CancellationReason);
                continue;
            }

            if (IsTerminal(targetExecution.Status))
            {
                continue;
            }

            ScanExecutionDispatchResult dispatchResult;
            if (!targetServers.TryGetValue(targetExecution.TargetServerId, out var targetServer))
            {
                dispatchResult = new ScanExecutionDispatchResult(
                    ScanJobTargetExecutionStatus.Failed,
                    Summary: "Target server record not found.",
                    ErrorMessage: "Target server record not found.",
                    CorrelationId: null,
                    RawOutput: null,
                    ResultFiles: [],
                    Findings: []);
            }
            else if (effectiveRules.Count == 0)
            {
                dispatchResult = new ScanExecutionDispatchResult(
                    ScanJobTargetExecutionStatus.Failed,
                    Summary: "No effective rules were resolved for this plan.",
                    ErrorMessage: "No effective rules were resolved for this plan.",
                    CorrelationId: null,
                    RawOutput: null,
                    ResultFiles: [],
                    Findings: []);
            }
            else if (!scannerCandidates.TryGetValue(targetExecution.TargetServerId, out var candidate))
            {
                dispatchResult = new ScanExecutionDispatchResult(
                    ScanJobTargetExecutionStatus.Failed,
                    Summary: "No eligible scanner assignment matched this plan.",
                    ErrorMessage: $"No enabled scanner assignment advertises capability {scanPlan.ScannerCapability}.",
                    CorrelationId: null,
                    RawOutput: null,
                    ResultFiles: [],
                    Findings: []);
            }
            else
            {
                targetExecution.Start(candidate.Scanner.Id, candidate.Scanner.Name, actorUserId, DateTimeOffset.UtcNow);
                secretsByTargetServerId.TryGetValue(targetExecution.TargetServerId, out var connectionSecret);
                dispatchResult = await dispatcher.DispatchAsync(
                    scanJob,
                    targetExecution,
                    targetServer,
                    candidate.Scanner,
                    candidate.Assignment,
                    scanPlan.ScannerCapability,
                    connectionSecret,
                    effectiveRules,
                    cancellationToken);
            }

            var targetCompletedAtUtc = DateTimeOffset.UtcNow;
            var targetErrorMessage = dispatchResult.Status == ScanJobTargetExecutionStatus.Completed
                ? null
                : dispatchResult.ErrorMessage ?? dispatchResult.Summary;
            targetExecution.Complete(
                dispatchResult.Status,
                dispatchResult.Summary,
                targetErrorMessage,
                actorUserId,
                targetCompletedAtUtc);
            await PersistTargetEvidenceAsync(
                scanJob,
                jobAttempt,
                targetExecution,
                dispatchResult,
                scanPlan.ScannerCapability,
                resultIngestionService,
                legacyScannerResultExtractor,
                actorUserId,
                targetCompletedAtUtc,
                cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var statusRows = await dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJobId)
            .Select(x => x.Status)
            .ToArrayAsync(cancellationToken);

        var terminalStatus = ResolveTerminalScanJobStatus(statusRows);
        var summary = BuildTerminalSummary(statusRows);
        var jobCompletedAtUtc = DateTimeOffset.UtcNow;
        scanJob.Complete(terminalStatus, summary, actorUserId, jobCompletedAtUtc);
        var attemptStatus = terminalStatus == ScanJobStatus.Completed
            ? JobAttemptStatus.Succeeded
            : JobAttemptStatus.Failed;
        CompleteAttemptIfRunning(
            jobAttempt,
            attemptStatus,
            BuildAttemptSummary(attemptNumber, summary, statusRows),
            actorUserId,
            jobCompletedAtUtc);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static bool IsTerminal(ScanJobTargetExecutionStatus status)
    {
        return status is ScanJobTargetExecutionStatus.Completed
            or ScanJobTargetExecutionStatus.Failed
            or ScanJobTargetExecutionStatus.Cancelled
            or ScanJobTargetExecutionStatus.PartiallyCompleted;
    }

    private static void CancelQueuedTargets(
        IEnumerable<ScanJobTargetExecution> targets,
        string actorUserId,
        DateTimeOffset completedAtUtc,
        string? reason)
    {
        foreach (var target in targets)
        {
            if (target.Status is not (ScanJobTargetExecutionStatus.Queued or ScanJobTargetExecutionStatus.Running))
            {
                continue;
            }

            target.Complete(
                ScanJobTargetExecutionStatus.Cancelled,
                summary: "Cancelled before execution completed.",
                errorMessage: reason,
                actorUserId: actorUserId,
                completedAtUtc: completedAtUtc);
        }
    }

    private static ScanJobStatus ResolveTerminalScanJobStatus(IReadOnlyCollection<ScanJobTargetExecutionStatus> statuses)
    {
        var total = statuses.Count;
        if (total == 0)
        {
            return ScanJobStatus.Failed;
        }

        var completed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Completed);
        var failed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Failed);
        var cancelled = statuses.Count(x => x == ScanJobTargetExecutionStatus.Cancelled);
        var partial = statuses.Count(x => x == ScanJobTargetExecutionStatus.PartiallyCompleted);

        if (cancelled == total)
        {
            return ScanJobStatus.Cancelled;
        }

        if (failed == 0 && partial == 0 && cancelled == 0)
        {
            return ScanJobStatus.Completed;
        }

        if (failed > 0 && completed == 0 && partial == 0 && cancelled == 0)
        {
            return ScanJobStatus.Failed;
        }

        return ScanJobStatus.PartiallyCompleted;
    }

    private static string BuildTerminalSummary(IReadOnlyCollection<ScanJobTargetExecutionStatus> statuses)
    {
        var total = statuses.Count;
        var completed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Completed);
        var failed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Failed);
        var cancelled = statuses.Count(x => x == ScanJobTargetExecutionStatus.Cancelled);
        var partial = statuses.Count(x => x == ScanJobTargetExecutionStatus.PartiallyCompleted);

        return $"Targets total={total}; completed={completed}; failed={failed}; cancelled={cancelled}; partiallyCompleted={partial}.";
    }

    private static void CompleteAttemptIfRunning(
        JobAttempt attempt,
        JobAttemptStatus status,
        string details,
        string actorUserId,
        DateTimeOffset completedAtUtc)
    {
        if (attempt.Status != JobAttemptStatus.Running)
        {
            return;
        }

        attempt.Complete(status, details, actorUserId, completedAtUtc);
    }

    private static string BuildAttemptSummary(
        int attemptNumber,
        string terminalSummary,
        IReadOnlyCollection<ScanJobTargetExecutionStatus> statuses)
    {
        var completed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Completed);
        var failed = statuses.Count(x => x == ScanJobTargetExecutionStatus.Failed);
        var cancelled = statuses.Count(x => x == ScanJobTargetExecutionStatus.Cancelled);
        var partial = statuses.Count(x => x == ScanJobTargetExecutionStatus.PartiallyCompleted);
        return $"Attempt {attemptNumber} completed. {terminalSummary} outcome: completed={completed}, failed={failed}, cancelled={cancelled}, partial={partial}.";
    }

    private async Task PersistTargetEvidenceAsync(
        ScanJob scanJob,
        JobAttempt jobAttempt,
        ScanJobTargetExecution targetExecution,
        ScanExecutionDispatchResult dispatchResult,
        ScannerCapability scannerCapability,
        IResultIngestionService resultIngestionService,
        ILegacyScannerResultExtractor legacyScannerResultExtractor,
        string actorUserId,
        DateTimeOffset observedAtUtc,
        CancellationToken cancellationToken)
    {
        var rawOutput = string.IsNullOrWhiteSpace(dispatchResult.RawOutput)
            ? null
            : dispatchResult.RawOutput;
        var resultFileMetadata = dispatchResult.ResultFiles
            .Select(file => new
            {
                file.Name,
                file.Path,
                file.SizeBytes,
                file.Sha256,
            })
            .ToArray();

        var executionEnvelope = new
        {
            scanJobId = scanJob.Id,
            targetExecutionId = targetExecution.Id,
            targetServerId = targetExecution.TargetServerId,
            targetStatus = targetExecution.Status.ToString(),
            summary = targetExecution.Summary,
            error = targetExecution.ErrorMessage,
            connectorCorrelationId = dispatchResult.CorrelationId,
            rawOutput,
            resultFiles = resultFileMetadata,
        };

        var hasExecutionArtifacts = !string.IsNullOrWhiteSpace(rawOutput)
            || resultFileMetadata.Length > 0
            || !string.IsNullOrWhiteSpace(dispatchResult.CorrelationId)
            || !string.IsNullOrWhiteSpace(dispatchResult.ErrorMessage);

        var scannerFamily = ResolveRuleFamily(scannerCapability);
        var ingestionRows = new List<ResultIngestionInputRow>();

        if (hasExecutionArtifacts)
        {
            var artifactPayload = JsonSerializer.SerializeToElement(new
            {
                kind = "scan_execution_artifact",
                serverId = targetExecution.TargetServerId,
                scanJobId = scanJob.Id,
                jobAttemptId = jobAttempt.Id,
                targetExecutionId = targetExecution.Id,
                observedAtUtc,
                disposition = ScanResultDisposition.Informational.ToString(),
                confidence = 0m,
                correlationId = dispatchResult.CorrelationId,
                evidence = new
                {
                    kind = "scan_execution_artifact",
                    execution = executionEnvelope,
                },
            });

            ingestionRows.Add(new ResultIngestionInputRow(scannerFamily, artifactPayload));
        }

        foreach (var finding in dispatchResult.Findings)
        {
            var findingPayload = JsonSerializer.SerializeToElement(new
            {
                kind = "scan_finding",
                serverId = targetExecution.TargetServerId,
                scanJobId = scanJob.Id,
                jobAttemptId = jobAttempt.Id,
                targetExecutionId = targetExecution.Id,
                ruleRevisionId = finding.RuleRevisionId,
                iocId = finding.IocId,
                observedAtUtc,
                disposition = finding.Disposition.ToString(),
                confidence = ClampConfidence(finding.Confidence),
                correlationId = dispatchResult.CorrelationId,
                evidence = new
                {
                    kind = "scan_finding",
                    execution = executionEnvelope,
                    finding = finding.EvidenceJson,
                },
            });

            ingestionRows.Add(new ResultIngestionInputRow(scannerFamily, findingPayload));
        }

        if (!string.IsNullOrWhiteSpace(rawOutput))
        {
            ingestionRows.AddRange(
                legacyScannerResultExtractor.ExtractRows(
                    scannerFamily,
                    rawOutput,
                    targetExecution.TargetServerId,
                    scanJob.Id,
                    jobAttempt.Id,
                    targetExecution.Id,
                    observedAtUtc));
        }

        if (ingestionRows.Count == 0)
        {
            return;
        }

        var result = await resultIngestionService.IngestAsync(
            new ResultIngestionBatchRequest(
                Source: "internal_scan_worker",
                ActorUserId: actorUserId,
                Rows: ingestionRows),
            cancellationToken);

        if (result.RejectedRows > 0)
        {
            _logger.LogWarning(
                "Result ingestion rejected {RejectedRows} rows for scan job {ScanJobId} target execution {TargetExecutionId}.",
                result.RejectedRows,
                scanJob.Id,
                targetExecution.Id);
        }
    }

    private static decimal ClampConfidence(decimal confidence)
    {
        if (confidence < 0m)
        {
            return 0m;
        }

        if (confidence > 1m)
        {
            return 1m;
        }

        return confidence;
    }

    private static async Task<IReadOnlyList<RuleRevision>> ResolveEffectiveRulesAsync(
        CtiDbContext dbContext,
        ScanPlan scanPlan,
        CancellationToken cancellationToken)
    {
        var ruleFamily = ResolveRuleFamily(scanPlan.ScannerCapability);

        if (scanPlan.RuleSelectionMode == ScanRuleSelectionMode.RuleSet)
        {
            var revisionIds = await dbContext.ScanPlanRuleRevisions
                .AsNoTracking()
                .Where(x => x.ScanPlanId == scanPlan.Id)
                .Select(x => x.RuleRevisionId)
                .ToArrayAsync(cancellationToken);

            if (revisionIds.Length == 0)
            {
                return Array.Empty<RuleRevision>();
            }

            var revisions = await (
                from revision in dbContext.RuleRevisionsV2.AsNoTracking()
                join artifact in dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                where revisionIds.Contains(revision.Id)
                    && revision.IsDeploymentReady
                    && !artifact.IsDeleted
                    && artifact.RuleFamily == ruleFamily
                select revision
            ).ToArrayAsync(cancellationToken);

            return revisions;
        }

        var scopedQuery =
            from revision in dbContext.RuleRevisionsV2.AsNoTracking()
            join artifact in dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
            where revision.IsDeploymentReady
                && !artifact.IsDeleted
                && artifact.RuleFamily == ruleFamily
            select new { Revision = revision, Artifact = artifact };

        if (scanPlan.RuleScopeType.HasValue)
        {
            var scopeType = scanPlan.RuleScopeType.Value;
            scopedQuery = scopedQuery.Where(x => x.Artifact.ScopeType == scopeType);

            if (scopeType != RuleScopeType.Global)
            {
                var scopeValue = string.IsNullOrWhiteSpace(scanPlan.RuleScopeValue)
                    ? string.Empty
                    : scanPlan.RuleScopeValue.Trim();
                scopedQuery = scopedQuery.Where(x => x.Artifact.ScopeValue == scopeValue);
            }
        }

        var scopedRows = await scopedQuery.ToArrayAsync(cancellationToken);
        return scopedRows.Select(x => x.Revision).ToArray();
    }

    private static async Task<Dictionary<Guid, ScannerCandidate>> ResolveScannerCandidatesAsync(
        CtiDbContext dbContext,
        ScannerCapability requiredCapability,
        IReadOnlyCollection<Guid> targetIds,
        CancellationToken cancellationToken)
    {
        if (targetIds.Count == 0)
        {
            return new Dictionary<Guid, ScannerCandidate>();
        }

        var assignmentRows = await (
            from assignment in dbContext.TargetServerScannerAssignments.AsNoTracking()
            join scanner in dbContext.Scanners.AsNoTracking() on assignment.ScannerId equals scanner.Id
            where targetIds.Contains(assignment.TargetServerId)
                && assignment.IsEnabled
                && assignment.ConnectivityStatus != ConnectivityStatus.Offline
                && scanner.HealthStatus != ScannerHealthStatus.Offline
            select new ScannerCandidateRow(assignment.TargetServerId, assignment, scanner)
        ).ToArrayAsync(cancellationToken);

        if (assignmentRows.Length == 0)
        {
            return new Dictionary<Guid, ScannerCandidate>();
        }

        var scannerIds = assignmentRows.Select(x => x.Scanner.Id).Distinct().ToArray();
        var eligibleScannerIds = await dbContext.ScannerCapabilityBindings
            .AsNoTracking()
            .Where(x => scannerIds.Contains(x.ScannerId) && x.Capability == requiredCapability)
            .Select(x => x.ScannerId)
            .Distinct()
            .ToArrayAsync(cancellationToken);
        var eligibleSet = eligibleScannerIds.ToHashSet();

        var result = assignmentRows
            .Where(x => eligibleSet.Contains(x.Scanner.Id))
            .GroupBy(x => x.TargetServerId)
            .ToDictionary(
                x => x.Key,
                x =>
                {
                    var row = x.OrderBy(candidate => RankConnectivity(candidate.Assignment.ConnectivityStatus))
                        .ThenBy(candidate => RankHealth(candidate.Scanner.HealthStatus))
                        .ThenByDescending(candidate => candidate.Assignment.LastContactUtc ?? DateTimeOffset.MinValue)
                        .First();
                    return new ScannerCandidate(row.Assignment, row.Scanner);
                });

        return result;
    }

    private static int RankConnectivity(ConnectivityStatus status)
    {
        return status switch
        {
            ConnectivityStatus.Online => 0,
            ConnectivityStatus.Degraded => 1,
            ConnectivityStatus.Unknown => 2,
            ConnectivityStatus.Offline => 3,
            _ => 4,
        };
    }

    private static int RankHealth(ScannerHealthStatus status)
    {
        return status switch
        {
            ScannerHealthStatus.Healthy => 0,
            ScannerHealthStatus.Degraded => 1,
            ScannerHealthStatus.Offline => 2,
            _ => 3,
        };
    }

    private static string ResolveRuleFamily(ScannerCapability capability)
    {
        return capability switch
        {
            ScannerCapability.Yara => RuleFamilyCatalog.NormalizeOrThrow("yara", nameof(capability)),
            ScannerCapability.Sigma => RuleFamilyCatalog.NormalizeOrThrow("sigma", nameof(capability)),
            ScannerCapability.Snort => RuleFamilyCatalog.NormalizeOrThrow("snort", nameof(capability)),
            ScannerCapability.Suricata => RuleFamilyCatalog.NormalizeOrThrow("suricata", nameof(capability)),
            _ => throw new ArgumentOutOfRangeException(nameof(capability), $"Unsupported scanner capability '{capability}'."),
        };
    }

    private sealed record ScannerCandidateRow(Guid TargetServerId, TargetServerScannerAssignment Assignment, Scanner Scanner);
    private sealed record ScannerCandidate(TargetServerScannerAssignment Assignment, Scanner Scanner);
}
