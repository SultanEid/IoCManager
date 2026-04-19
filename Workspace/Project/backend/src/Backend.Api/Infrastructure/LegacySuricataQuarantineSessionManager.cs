using System.Collections.Concurrent;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class LegacySuricataQuarantineSessionManager
{
    private sealed class ActiveSession
    {
        public required CancellationTokenSource CancellationSource { get; init; }
        public required Task CompletionTask { get; init; }
        public bool StopRequested { get; set; }
    }

    private readonly ConcurrentDictionary<int, ActiveSession> _activeSessions = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<ScanExecutionOptions> _scanExecutionOptions;
    private readonly ILogger<LegacySuricataQuarantineSessionManager> _logger;

    public LegacySuricataQuarantineSessionManager(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<ScanExecutionOptions> scanExecutionOptions,
        ILogger<LegacySuricataQuarantineSessionManager> logger)
    {
        _scopeFactory = scopeFactory;
        _scanExecutionOptions = scanExecutionOptions;
        _logger = logger;
    }

    internal Task StartAsync(LegacyPipelineSuricataQuarantineSessionDefinition definition, CancellationToken cancellationToken)
    {
        if (_activeSessions.ContainsKey(definition.JobId))
        {
            throw new InvalidOperationException($"Suricata quarantine job '{definition.JobId}' is already running.");
        }

        var sessionCts = new CancellationTokenSource(TimeSpan.FromMinutes(definition.DurationMinutes));
        ActiveSession? activeSession = null;
        var completionTask = Task.Run(async () =>
        {
            try
            {
                var captures = await RunAllTargetsAsync(definition, sessionCts.Token);
                await using var scope = _scopeFactory.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<LegacyScanPipelineService>();
                await service.FinalizeSuricataQuarantineJobAsync(definition.JobId, captures, activeSession?.StopRequested == true, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Suricata quarantine session for job {JobId} failed.", definition.JobId);
                await MarkJobFailedAsync(definition.JobId, ex.Message);
            }
            finally
            {
                _activeSessions.TryRemove(definition.JobId, out _);
                sessionCts.Dispose();
            }
        }, CancellationToken.None);

        activeSession = new ActiveSession
        {
            CancellationSource = sessionCts,
            CompletionTask = completionTask,
        };

        if (!_activeSessions.TryAdd(definition.JobId, activeSession))
        {
            sessionCts.Cancel();
            sessionCts.Dispose();
            throw new InvalidOperationException($"Suricata quarantine job '{definition.JobId}' is already running.");
        }

        return Task.CompletedTask;
    }

    public async Task StopAsync(int jobId, CancellationToken cancellationToken)
    {
        if (!_activeSessions.TryGetValue(jobId, out var session))
        {
            throw new InvalidOperationException("No active Suricata Quarantine session was found for this job.");
        }

        session.StopRequested = true;
        session.CancellationSource.Cancel();
        await session.CompletionTask.WaitAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<LegacyPipelineSuricataQuarantineTargetCapture>> RunAllTargetsAsync(
        LegacyPipelineSuricataQuarantineSessionDefinition definition,
        CancellationToken cancellationToken)
    {
        if (definition.Targets.Count > 1)
        {
            var combinedCapture = await RunTargetsAsync(definition, definition.Targets, skipRuleSync: false, cancellationToken);
            return definition.Targets
                .Select(target => new LegacyPipelineSuricataQuarantineTargetCapture(
                    target.TargetId,
                    combinedCapture.StartedAtUtc,
                    combinedCapture.FinishedAtUtc,
                    combinedCapture.StandardOutput,
                    combinedCapture.FailureSummary))
                .ToArray();
        }

        var tasks = definition.Targets
            .Select((target, index) => RunTargetsAsync(definition, [target], skipRuleSync: index > 0, cancellationToken))
            .ToArray();
        return await Task.WhenAll(tasks);
    }

    private async Task<LegacyPipelineSuricataQuarantineTargetCapture> RunTargetsAsync(
        LegacyPipelineSuricataQuarantineSessionDefinition definition,
        IReadOnlyList<LegacyPipelineTargetEntity> targets,
        bool skipRuleSync,
        CancellationToken cancellationToken)
    {
        var options = _scanExecutionOptions.CurrentValue;
        var startedAtUtc = DateTimeOffset.UtcNow;
        var captureFilePath = Path.Combine(
            Path.GetTempPath(),
            "ioc-manager-suricata-quarantine",
            definition.JobId.ToString(),
            $"{string.Join("_", targets.Select(item => item.TargetId))}_{Guid.NewGuid():N}.jsonl");
        var primaryTarget = targets[0];
        using var process = new System.Diagnostics.Process
        {
            StartInfo = BuildStartInfo(definition, targets, skipRuleSync, captureFilePath, options),
        };

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(captureFilePath)!);
            if (!process.Start())
            {
                throw new InvalidOperationException($"Failed to start Suricata Quarantine watcher for target set '{string.Join(",", targets.Select(item => item.TargetId))}'.");
            }

            using var registration = cancellationToken.Register(() =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        process.Kill(true);
                    }
                }
                catch
                {
                }
            });

            var standardOutputTask = process.StandardOutput.ReadToEndAsync();
            var standardErrorTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync(CancellationToken.None);
            var standardOutput = await standardOutputTask;
            var standardError = await standardErrorTask;
            if (File.Exists(captureFilePath))
            {
                var capturedOutput = await File.ReadAllTextAsync(captureFilePath, CancellationToken.None);
                if (!string.IsNullOrWhiteSpace(capturedOutput))
                {
                    standardOutput = capturedOutput;
                }
            }

            var failureSummary = !cancellationToken.IsCancellationRequested && process.ExitCode != 0
                ? string.IsNullOrWhiteSpace(standardError)
                    ? $"Suricata Quarantine exited with code {process.ExitCode}."
                    : standardError.Trim()
                : null;

            return new LegacyPipelineSuricataQuarantineTargetCapture(
                primaryTarget.TargetId,
                startedAtUtc,
                DateTimeOffset.UtcNow,
                standardOutput ?? string.Empty,
                failureSummary);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return new LegacyPipelineSuricataQuarantineTargetCapture(
                primaryTarget.TargetId,
                startedAtUtc,
                DateTimeOffset.UtcNow,
                string.Empty,
                ex.Message);
        }
        finally
        {
            try
            {
                if (File.Exists(captureFilePath))
                {
                    File.Delete(captureFilePath);
                }
            }
            catch
            {
            }
        }
    }

    private static System.Diagnostics.ProcessStartInfo BuildStartInfo(
        LegacyPipelineSuricataQuarantineSessionDefinition definition,
        IReadOnlyList<LegacyPipelineTargetEntity> targets,
        bool skipRuleSync,
        string captureFilePath,
        ScanExecutionOptions options)
    {
        var startInfo = new System.Diagnostics.ProcessStartInfo
        {
            FileName = string.IsNullOrWhiteSpace(options.PowerShellExecutable) ? "powershell.exe" : options.PowerShellExecutable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        startInfo.ArgumentList.Add("-NoLogo");
        startInfo.ArgumentList.Add("-NoProfile");
        startInfo.ArgumentList.Add("-NonInteractive");
        startInfo.ArgumentList.Add("-ExecutionPolicy");
        startInfo.ArgumentList.Add("Bypass");
        startInfo.ArgumentList.Add("-File");
        startInfo.ArgumentList.Add(definition.ScriptPath);
        startInfo.ArgumentList.Add("-Mode");
        startInfo.ArgumentList.Add("Quarantine");
        if (targets.Count == 1)
        {
            startInfo.ArgumentList.Add("-IP");
            startInfo.ArgumentList.Add(targets[0].IPAddress);
        }
        else
        {
            startInfo.ArgumentList.Add("-QuarantineIPs");
            startInfo.ArgumentList.Add(string.Join(",", targets.Select(target => target.IPAddress)));
        }

        startInfo.ArgumentList.Add("-MasterRulePath");
        startInfo.ArgumentList.Add(definition.RulePath);
        if (skipRuleSync)
        {
            startInfo.ArgumentList.Add("-SkipRuleSync");
        }

        startInfo.ArgumentList.Add("-QuarantineCapturePath");
        startInfo.ArgumentList.Add(captureFilePath);
        return startInfo;
    }

    private async Task MarkJobFailedAsync(int jobId, string summary)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LegacyScanPipelineDbContext>();
        var job = await dbContext.ScanJobs.FirstOrDefaultAsync(item => item.JobId == jobId, CancellationToken.None);
        if (job is null)
        {
            return;
        }

        job.Status = "Failed";
        job.FinishedAt = DateTimeOffset.UtcNow.UtcDateTime;
        job.Summary = string.IsNullOrWhiteSpace(summary)
            ? "Suricata quarantine session failed."
            : summary.Length > 255 ? summary[..255] : summary;
        await dbContext.SaveChangesAsync(CancellationToken.None);
    }
}
