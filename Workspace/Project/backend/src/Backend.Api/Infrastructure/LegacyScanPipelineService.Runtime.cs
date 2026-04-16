using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private async Task<LegacyPipelineScanJobEntity> QueuePlanJobAsync(
        LegacyPipelineScanPlanEntity plan,
        int actorUserId,
        string triggerType,
        DateTimeOffset queuedAtUtc,
        CancellationToken cancellationToken)
    {
        var planConfig = LegacyScanPipelineSerializer.DeserializePlanConfig(plan.ScannerConfigJson)
            ?? throw new InvalidOperationException("Stored scan plan configuration is invalid.");
        var targetScope = LegacyScanPipelineSerializer.DeserializeTargetScope(plan.TargetScopeJson)
            ?? throw new InvalidOperationException("Stored scan plan target scope is invalid.");
        var resolvedTargets = await ResolveTargetsForScopeAsync(targetScope.NetworkIds, targetScope.TargetIds, cancellationToken);
        ValidateTargetCount(resolvedTargets.Count);

        var executionScope = new LegacyPipelineExecutionScope(
            planConfig.ScannerFamily,
            "hostPath",
            planConfig.RulePath,
            null,
            null,
            targetScope.NetworkIds,
            resolvedTargets.Select(item => item.TargetId).ToList(),
            planConfig.Options);

        var job = new LegacyPipelineScanJobEntity
        {
            Status = "Queued",
            TriggeredByUserId = actorUserId,
            PlanId = plan.PlanId,
            ExecutionScopeJson = JsonSerializer.Serialize(executionScope, LegacyScanPipelineSerializer.JsonOptions),
            QueuedAt = queuedAtUtc.UtcDateTime,
            TriggerType = triggerType,
            Summary = $"Queued plan '{plan.Name}' for {resolvedTargets.Count} targets.",
        };

        _dbContext.ScanJobs.Add(job);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return job;
    }

    private async Task ProcessJobAsync(int jobId, CancellationToken cancellationToken)
    {
        var job = await _dbContext.ScanJobs.FirstOrDefaultAsync(item => item.JobId == jobId, cancellationToken);
        if (job is null || !string.Equals(job.Status, "Queued", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson)
            ?? throw new InvalidOperationException("Stored execution scope is invalid.");
        var targets = await ResolveTargetsForScopeAsync(scope.NetworkIds, scope.TargetIds, cancellationToken);
        ValidateTargetCount(targets.Count);
        var networkIds = targets
            .Where(target => target.NetworkId.HasValue)
            .Select(target => target.NetworkId!.Value)
            .Distinct()
            .ToArray();
        var networkLookup = networkIds.Length == 0
            ? new Dictionary<int, LegacyPipelineNetworkEntity>()
            : await _dbContext.Networks
                .AsNoTracking()
                .Where(item => networkIds.Contains(item.NetworkId))
                .ToDictionaryAsync(item => item.NetworkId, cancellationToken);

        job.Status = "Running";
        job.StartedAt = DateTimeOffset.UtcNow.UtcDateTime;
        job.Summary = $"Running {scope.ScannerFamily.ToUpperInvariant()} scan across {targets.Count} targets.";
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (string.Equals(scope.ScannerFamily, "snort", StringComparison.OrdinalIgnoreCase)
            && string.Equals(LegacyScanPipelineHelpers.ResolveExecutionMode(scope.ScannerFamily, scope.Options), "quarantine", StringComparison.OrdinalIgnoreCase))
        {
            if (!LegacyScanPipelineHelpers.IsPositiveInteger(LegacyScanPipelineHelpers.GetOption(scope.Options, "quarantineDurationMinutes"), out var durationMinutes))
            {
                throw new InvalidOperationException("Snort Quarantine jobs require a positive duration.");
            }

            var scriptPath = ResolveScannerScript(scope.ScannerFamily, _scanExecutionOptions.CurrentValue);
            var effectiveRulePath = string.Equals(scope.RuleInputMode, "hostPath", StringComparison.OrdinalIgnoreCase) ? scope.RulePath : scope.StagedRulePath;
            if (string.IsNullOrWhiteSpace(effectiveRulePath) || !File.Exists(effectiveRulePath))
            {
                throw new FileNotFoundException("No effective Snort rule file was available for quarantine execution.");
            }

            await _snortQuarantineSessionManager.StartAsync(
                new LegacyPipelineSnortQuarantineSessionDefinition(job.JobId, scriptPath, effectiveRulePath, durationMinutes, targets),
                cancellationToken);
            return;
        }

        var configuredParallelLimit = Math.Max(1, _pipelineOptions.CurrentValue.MaxParallelTargetExecutions);
        var parallelLimit = scope.ScannerFamily.Equals("yara", StringComparison.OrdinalIgnoreCase)
                            || scope.ScannerFamily.Equals("sigma", StringComparison.OrdinalIgnoreCase)
                            || scope.ScannerFamily.Equals("snort", StringComparison.OrdinalIgnoreCase)
            ? 1
            : configuredParallelLimit;
        using var gate = new SemaphoreSlim(parallelLimit, parallelLimit);
        var executionTasks = targets.Select(async (target, order) =>
        {
            await gate.WaitAsync(cancellationToken);
            try
            {
                var output = await ExecuteTargetAsync(scope, target, networkLookup, cancellationToken);
                return (Order: order, Target: target, Output: output);
            }
            finally
            {
                gate.Release();
            }
        }).ToArray();

        var executions = await Task.WhenAll(executionTasks);
        var completed = 0;
        var failed = 0;
        var noFindings = 0;
        var totalFindings = 0;
        string? firstFailureSummary = null;

        foreach (var execution in executions.OrderBy(item => item.Order))
        {
            var output = execution.Output;
            await PersistTargetExecutionAsync(job, scope, execution.Target, output, cancellationToken);
            totalFindings += output.Iocs.Count;
            switch (output.Status)
            {
                case "Failed":
                    failed++;
                    firstFailureSummary ??= output.Summary;
                    _logger.LogWarning(
                        "Legacy scan pipeline target {TargetId} failed for job {JobId}: {FailureSummary}",
                        execution.Target.TargetId,
                        job.JobId,
                        output.Summary);
                    break;
                case "NoFindings":
                    completed++;
                    noFindings++;
                    break;
                default:
                    completed++;
                    break;
            }
        }

        LegacyScanPipelineHelpers.CleanupTempDirectory(scope.TempDirectory);

        job.FinishedAt = DateTimeOffset.UtcNow.UtcDateTime;
        job.Status = failed switch
        {
            0 => "Completed",
            _ when completed == 0 => "Failed",
            _ => "PartiallyCompleted",
        };
        job.Summary = $"{completed} completed, {failed} failed, {noFindings} no-findings, {totalFindings} findings.";
        if (!string.IsNullOrWhiteSpace(firstFailureSummary))
        {
            job.Summary = $"{job.Summary} First failure: {firstFailureSummary}";
        }

        if (job.Summary?.Length > 255)
        {
            job.Summary = job.Summary[..255];
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    internal async Task FinalizeSnortQuarantineJobAsync(
        int jobId,
        IReadOnlyList<LegacyPipelineSnortQuarantineTargetCapture> captures,
        bool stoppedByUser,
        CancellationToken cancellationToken)
    {
        var job = await _dbContext.ScanJobs.FirstOrDefaultAsync(item => item.JobId == jobId, cancellationToken)
            ?? throw new InvalidOperationException($"Snort quarantine job '{jobId}' was not found.");
        var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson)
            ?? throw new InvalidOperationException("Stored execution scope is invalid.");
        var targetIds = captures.Select(item => item.TargetId).Distinct().ToArray();
        var targetLookup = await _dbContext.Targets
            .Where(item => targetIds.Contains(item.TargetId))
            .ToDictionaryAsync(item => item.TargetId, cancellationToken);

        var completed = 0;
        var failed = 0;
        var noFindings = 0;
        var totalFindings = 0;
        string? firstFailureSummary = null;

        foreach (var capture in captures)
        {
            if (!targetLookup.TryGetValue(capture.TargetId, out var target))
            {
                continue;
            }

            var output = string.IsNullOrWhiteSpace(capture.FailureSummary)
                ? BuildSnortQuarantineExecutionOutput(scope, target, capture)
                : new LegacyPipelineTargetExecutionOutput("Failed", capture.FailureSummary!, capture.StartedAtUtc, capture.FinishedAtUtc, []);

            await PersistTargetExecutionAsync(job, scope, target, output, cancellationToken);
            totalFindings += output.Iocs.Count;
            switch (output.Status)
            {
                case "Failed":
                    failed++;
                    firstFailureSummary ??= output.Summary;
                    break;
                case "NoFindings":
                    completed++;
                    noFindings++;
                    break;
                default:
                    completed++;
                    break;
            }
        }

        LegacyScanPipelineHelpers.CleanupTempDirectory(scope.TempDirectory);

        job.FinishedAt = DateTimeOffset.UtcNow.UtcDateTime;
        job.Status = stoppedByUser
            ? "Stopped"
            : failed switch
            {
                0 => "Completed",
                _ when completed == 0 => "Failed",
                _ => "PartiallyCompleted",
            };
        job.Summary = $"{completed} completed, {failed} failed, {noFindings} no-findings, {totalFindings} findings.";
        if (!string.IsNullOrWhiteSpace(firstFailureSummary))
        {
            job.Summary = $"{job.Summary} First failure: {firstFailureSummary}";
        }

        if (job.Summary?.Length > 255)
        {
            job.Summary = job.Summary[..255];
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private LegacyPipelineTargetExecutionOutput BuildSnortQuarantineExecutionOutput(
        LegacyPipelineExecutionScope scope,
        LegacyPipelineTargetEntity target,
        LegacyPipelineSnortQuarantineTargetCapture capture)
    {
        var iocs = ParseLegacyScannerOutput(scope.ScannerFamily, capture.StandardOutput, target)
            .Where(ioc => ioc.NetworkDetail is null
                || string.Equals(ioc.NetworkDetail.SourceIp, target.IPAddress, StringComparison.OrdinalIgnoreCase)
                || string.Equals(ioc.NetworkDetail.DestIp, target.IPAddress, StringComparison.OrdinalIgnoreCase))
            .ToArray();
        return new LegacyPipelineTargetExecutionOutput(
            iocs.Length == 0 ? "NoFindings" : "Succeeded",
            iocs.Length == 0 ? "No findings were produced by the scanner." : $"Stored {iocs.Length} findings.",
            capture.StartedAtUtc,
            capture.FinishedAtUtc,
            iocs);
    }

    private async Task PersistTargetExecutionAsync(
        LegacyPipelineScanJobEntity job,
        LegacyPipelineExecutionScope scope,
        LegacyPipelineTargetEntity target,
        LegacyPipelineTargetExecutionOutput output,
        CancellationToken cancellationToken)
    {
        var result = new LegacyPipelineScanResultEntity
        {
            JobId = job.JobId,
            TargetId = target.TargetId,
            ScannerType = scope.ScannerFamily.ToUpperInvariant(),
            Status = output.Status,
            NoOfFindings = output.Iocs.Count,
            StartedAt = output.StartedAtUtc.UtcDateTime,
            FinishedAt = output.FinishedAtUtc.UtcDateTime,
        };

        _dbContext.ScanResults.Add(result);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var ioc in output.Iocs)
        {
            _dbContext.Iocs.Add(new LegacyPipelineIocEntity
            {
                Id = ioc.Id,
                TimestampUtc = ioc.TimestampUtc.UtcDateTime,
                ScannerType = ioc.ScannerType,
                TargetServer = ioc.TargetServer,
                TargetOsType = ioc.TargetOsType,
                RuleName = ioc.RuleName,
                RawPayload = ioc.RawPayload,
                ResultId = result.ResultId,
            });

            if (ioc.YaraDetail is not null)
            {
                _dbContext.YaraDetails.Add(new LegacyPipelineYaraDetailEntity
                {
                    Id = ioc.Id,
                    FilePath = ioc.YaraDetail.FilePath,
                    FileHash = ioc.YaraDetail.FileHash,
                });
            }

            if (ioc.SigmaDetail is not null)
            {
                _dbContext.SigmaDetails.Add(new LegacyPipelineSigmaDetailEntity
                {
                    Id = ioc.Id,
                    LogSource = ioc.SigmaDetail.LogSource,
                    Severity = ioc.SigmaDetail.Severity,
                    CommandLine = ioc.SigmaDetail.CommandLine,
                });
            }

            if (ioc.NetworkDetail is not null)
            {
                _dbContext.NetworkDetails.Add(new LegacyPipelineNetworkDetailEntity
                {
                    Id = ioc.Id,
                    SourceIP = ioc.NetworkDetail.SourceIp,
                    DestIP = ioc.NetworkDetail.DestIp,
                    Protocol = ioc.NetworkDetail.Protocol,
                    Severity = ioc.NetworkDetail.Severity,
                    FlowId = ioc.NetworkDetail.FlowId,
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

}
