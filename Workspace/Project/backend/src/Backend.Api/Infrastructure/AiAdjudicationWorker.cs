using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Domain.AiAdjudication;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class AiAdjudicationOrchestrator : IAiAdjudicationOrchestrator
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAiAdjudicationQueue _queue;
    private readonly IOptionsMonitor<AiAdjudicationExecutionOptions> _optionsMonitor;
    private readonly ILogger<AiAdjudicationOrchestrator> _logger;

    public AiAdjudicationOrchestrator(
        IServiceScopeFactory scopeFactory,
        IAiAdjudicationQueue queue,
        IOptionsMonitor<AiAdjudicationExecutionOptions> optionsMonitor,
        ILogger<AiAdjudicationOrchestrator> logger)
    {
        _scopeFactory = scopeFactory;
        _queue = queue;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    public Task EnqueueAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        return _queue.EnqueueAsync(adjudicationId, cancellationToken).AsTask();
    }

    public async Task RecoverAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var actor = WorkerActorUserId;
        var nowUtc = DateTimeOffset.UtcNow;

        var running = await dbContext.AiAdjudicationRequests
            .Where(x => x.Status == AiAdjudicationStatus.Running)
            .ToArrayAsync(cancellationToken);

        foreach (var item in running)
        {
            item.MarkRetryQueued(
                actorUserId: actor,
                nowUtc: nowUtc,
                nextAttemptAtUtc: nowUtc,
                failureCode: "worker_recovery",
                failureMessage: "Worker restart interrupted adjudication processing.");
        }

        if (running.Length > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await EnqueueDueAsync(cancellationToken);
    }

    public async Task EnqueueDueAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repository = scope.ServiceProvider.GetRequiredService<IAiAdjudicationRepository>();
        var due = await repository.ListDueRequestsAsync(DateTimeOffset.UtcNow, take: 200, cancellationToken);

        foreach (var item in due)
        {
            await _queue.EnqueueAsync(item.Id, cancellationToken);
        }
    }

    public async Task ProcessAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repository = scope.ServiceProvider.GetRequiredService<IAiAdjudicationRepository>();
        var client = scope.ServiceProvider.GetRequiredService<IAiAdjudicationClient>();

        var request = await repository.GetRequestAsync(adjudicationId, asTracking: true, cancellationToken);
        if (request is null || request.Status != AiAdjudicationStatus.Queued)
        {
            return;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        if (request.NextAttemptAtUtc.HasValue && request.NextAttemptAtUtc.Value > nowUtc)
        {
            return;
        }

        var actorUserId = WorkerActorUserId;

        request.RegisterAttempt(actorUserId, nowUtc);
        var job = AiAdjudicationJob.Queue(request.Id, request.AttemptCount, nowUtc, actorUserId);
        await repository.AddJobAsync(job, cancellationToken);
        request.StartProcessing(actorUserId, nowUtc);
        await repository.SaveChangesAsync(cancellationToken);

        job.Start(actorUserId, DateTimeOffset.UtcNow);
        await repository.SaveChangesAsync(cancellationToken);

        try
        {
            using var packageDocument = JsonDocument.Parse(request.DetectionPackageJson);
            var detectionPackage = packageDocument.RootElement.Clone();
            var hostContext = ExtractContextMap(detectionPackage, "hostContext", "host_context");
            var ruleContext = ExtractContextMap(detectionPackage, "ruleContext", "rule_context");

            var scoreRequest = new AiScoreCaseRequest(
                CaseId: request.CaseId,
                IocType: request.IocType,
                IocValue: request.IocValue,
                AsOfTime: request.ObservedAtUtc,
                DetectionPackage: detectionPackage,
                HostContext: hostContext,
                RuleContext: ruleContext);

            var score = await client.ScoreCaseAsync(scoreRequest, cancellationToken);
            var decisionId = $"adj-{request.Id:N}-attempt-{request.AttemptCount}";
            var snapshotHash = ComputeSha256Hex(request.DetectionPackageJson);
            var explainRequest = new AiExplainCaseRequest(
                CaseId: request.CaseId,
                DecisionId: decisionId,
                DecisionState: score.Action,
                RecommendationCode: score.Action,
                SnapshotHash: snapshotHash,
                ModelVersion: score.ModelVersion ?? "unknown",
                PolicyVersion: ReadOptionalString(score.RawPayload, "policyVersion", "policy_version") ?? "unknown",
                TransformationLineageHash: snapshotHash,
                DecidedAtUtc: score.ScoredAtUtc,
                Provenance: score.Provenance,
                DetectionPackageJson: request.DetectionPackageJson);

            var explanation = await client.ExplainCaseAsync(explainRequest, cancellationToken);
            var actionPlan = await client.RecommendActionAsync(scoreRequest, cancellationToken);
            var historical = await client.QueryHistoricalAsync(
                new AiHistoricalLearningRequest(
                    CaseId: request.CaseId,
                    IocType: request.IocType,
                    IocValue: request.IocValue,
                    AsOfTime: request.ObservedAtUtc,
                    DetectionPackage: detectionPackage,
                    HostContext: hostContext,
                    RuleContext: ruleContext,
                    TopK: _optionsMonitor.CurrentValue.HistoricalTopK,
                    LookbackDays: _optionsMonitor.CurrentValue.HistoricalLookbackDays),
                cancellationToken);

            var storedResult = AiAdjudicationResult.Create(
                adjudicationRequestId: request.Id,
                verdict: score.Verdict,
                action: score.Action,
                confidence: score.Confidence,
                falsePositiveRisk: score.FalsePositiveRisk,
                reviewPriority: score.ReviewPriority,
                shouldPromoteToIndicator: score.ShouldPromoteToIndicator,
                shouldSuppress: score.ShouldSuppress,
                shouldAllowlist: score.ShouldAllowlist,
                shouldEscalate: score.ShouldEscalate,
                reasonsJson: JsonSerializer.Serialize(score.Reasons, JsonOptions),
                provenanceJson: JsonSerializer.Serialize(score.Provenance, JsonOptions),
                nextBestEvidenceJson: JsonSerializer.Serialize(score.NextBestEvidence, JsonOptions),
                abstainReason: score.AbstainReason,
                modelVersion: score.ModelVersion,
                datasetVersion: score.DatasetVersion,
                scoredAtUtc: score.ScoredAtUtc,
                rawPayloadJson: score.RawPayload.GetRawText(),
                actorUserId: actorUserId,
                nowUtc: DateTimeOffset.UtcNow);
            await repository.UpsertResultAsync(storedResult, cancellationToken);

            var storedExplanation = AiAdjudicationExplanation.Create(
                adjudicationRequestId: request.Id,
                summary: explanation.Summary,
                decisionState: explanation.DecisionState,
                recommendedAction: explanation.RecommendedAction,
                rationaleJson: JsonSerializer.Serialize(explanation.Rationale, JsonOptions),
                citationsJson: JsonSerializer.Serialize(explanation.Citations, JsonOptions),
                nextBestEvidenceJson: JsonSerializer.Serialize(explanation.NextBestEvidence, JsonOptions),
                policyVersion: explanation.PolicyVersion,
                modelVersion: explanation.ModelVersion,
                datasetVersion: explanation.DatasetVersion,
                generatedAtUtc: explanation.GeneratedAtUtc,
                rawPayloadJson: explanation.RawPayload.GetRawText(),
                actorUserId: actorUserId,
                nowUtc: DateTimeOffset.UtcNow);
            await repository.UpsertExplanationAsync(storedExplanation, cancellationToken);

            var storedActionPlan = AiActionPlanRecommendation.Create(
                adjudicationRequestId: request.Id,
                summary: actionPlan.Summary,
                recommendedActionsJson: JsonSerializer.Serialize(actionPlan.RecommendedActions, JsonOptions),
                prerequisitesJson: JsonSerializer.Serialize(actionPlan.Prerequisites, JsonOptions),
                cautionsJson: JsonSerializer.Serialize(actionPlan.Cautions, JsonOptions),
                neverAutoExecutes: actionPlan.NeverAutoExecutes,
                policyConstrained: actionPlan.PolicyConstrained,
                evidenceBased: actionPlan.EvidenceBased,
                generatedAtUtc: actionPlan.GeneratedAtUtc,
                rawPayloadJson: actionPlan.RawPayload.GetRawText(),
                actorUserId: actorUserId,
                nowUtc: DateTimeOffset.UtcNow);
            await repository.UpsertActionPlanAsync(storedActionPlan, cancellationToken);

            var similarRows = historical.SimilarDetections
                .Select((item, index) => AiAdjudicationSimilarDetection.Create(
                    adjudicationRequestId: request.Id,
                    detectionId: item.DetectionId,
                    ruleFamily: item.RuleFamily,
                    ruleId: item.RuleId,
                    relationType: item.RelationType,
                    observedAtUtc: item.ObservedAt,
                    confidence: item.Confidence,
                    similarityScore: item.SimilarityScore,
                    similarityReasonsJson: JsonSerializer.Serialize(item.SimilarityReasons, JsonOptions),
                    priorVerdictsJson: JsonSerializer.Serialize(item.PriorVerdicts, JsonOptions),
                    priorAcceptedActionsJson: JsonSerializer.Serialize(item.PriorAcceptedActions, JsonOptions),
                    priorOutcomesJson: JsonSerializer.Serialize(item.PriorOutcomes, JsonOptions),
                    rank: index + 1,
                    actorUserId: actorUserId,
                    nowUtc: DateTimeOffset.UtcNow))
                .ToArray();
            await repository.ReplaceSimilarDetectionsAsync(request.Id, similarRows, cancellationToken);

            var evidenceRows = score.EvidenceSources
                .Select((item, index) => AiAdjudicationEvidenceSource.Create(
                    adjudicationRequestId: request.Id,
                    channel: item.Channel,
                    source: item.Source,
                    evidenceId: item.EvidenceId,
                    reference: item.Reference,
                    category: item.Category,
                    polarity: item.Polarity,
                    confidence: item.Confidence,
                    summary: item.Summary,
                    anchor: item.Anchor,
                    rank: index + 1,
                    actorUserId: actorUserId,
                    nowUtc: DateTimeOffset.UtcNow))
                .ToArray();
            await repository.ReplaceEvidenceSourcesAsync(request.Id, evidenceRows, cancellationToken);

            request.MarkCompleted(
                actorUserId: actorUserId,
                completedAtUtc: DateTimeOffset.UtcNow,
                modelVersion: score.ModelVersion,
                datasetVersion: score.DatasetVersion);
            job.CompleteSucceeded(actorUserId, DateTimeOffset.UtcNow, "Adjudication completed successfully.");

            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            var failureCode = ex is OptionalDependencyUnavailableException
                ? "sidecar_unavailable"
                : "adjudication_failed";
            var now = DateTimeOffset.UtcNow;
            var maxAttempts = Math.Max(1, _optionsMonitor.CurrentValue.MaxAttempts);
            var canRetry = request.AttemptCount < maxAttempts;

            if (canRetry)
            {
                var backoffSeconds = ResolveBackoffSeconds(request.AttemptCount);
                var nextAttemptAt = now.AddSeconds(backoffSeconds);
                request.MarkRetryQueued(
                    actorUserId: actorUserId,
                    nowUtc: now,
                    nextAttemptAtUtc: nextAttemptAt,
                    failureCode: failureCode,
                    failureMessage: ex.Message);
                job.CompleteFailed(
                    actorUserId: actorUserId,
                    completedAtUtc: now,
                    summary: $"Adjudication attempt failed. Retry scheduled in {backoffSeconds} seconds.",
                    errorCode: failureCode,
                    errorMessage: ex.Message,
                    nextAttemptAtUtc: nextAttemptAt);

                await repository.SaveChangesAsync(cancellationToken);

                _logger.LogWarning(
                    ex,
                    "AI adjudication {AdjudicationId} failed on attempt {AttemptNumber}. Retrying at {NextAttemptAtUtc}.",
                    request.Id,
                    request.AttemptCount,
                    nextAttemptAt);
                return;
            }

            request.MarkFailed(
                actorUserId: actorUserId,
                completedAtUtc: now,
                failureCode: failureCode,
                failureMessage: ex.Message);
            job.CompleteFailed(
                actorUserId: actorUserId,
                completedAtUtc: now,
                summary: "Adjudication failed and retries were exhausted.",
                errorCode: failureCode,
                errorMessage: ex.Message,
                nextAttemptAtUtc: null);
            await repository.SaveChangesAsync(cancellationToken);

            _logger.LogError(
                ex,
                "AI adjudication {AdjudicationId} failed permanently after {AttemptCount} attempts.",
                request.Id,
                request.AttemptCount);
        }
    }

    private string WorkerActorUserId
    {
        get
        {
            var configured = _optionsMonitor.CurrentValue.WorkerActorUserId;
            return string.IsNullOrWhiteSpace(configured)
                ? "system-ai-adjudication-worker"
                : configured.Trim();
        }
    }

    private int ResolveBackoffSeconds(int attemptCount)
    {
        var values = _optionsMonitor.CurrentValue.BackoffSeconds;
        if (values is null || values.Length == 0)
        {
            return 10;
        }

        var index = Math.Clamp(attemptCount - 1, 0, values.Length - 1);
        return Math.Max(1, values[index]);
    }

    private static string? ReadOptionalString(JsonElement root, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty(propertyName, out var value))
            {
                if (value.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var text = value.GetString();
                return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
            }
        }

        return null;
    }

    private static Dictionary<string, object?> ExtractContextMap(JsonElement detectionPackage, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (detectionPackage.ValueKind == JsonValueKind.Object
                && detectionPackage.TryGetProperty(propertyName, out var node)
                && node.ValueKind == JsonValueKind.Object)
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, object?>>(node.GetRawText(), JsonOptions);
                    return parsed ?? new Dictionary<string, object?>();
                }
                catch (JsonException)
                {
                    return new Dictionary<string, object?>();
                }
            }
        }

        return new Dictionary<string, object?>();
    }

    private static string ComputeSha256Hex(string text)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        return Convert.ToHexString(bytes);
    }
}

public sealed class AiAdjudicationWorker : BackgroundService
{
    private readonly IAiAdjudicationQueue _queue;
    private readonly IAiAdjudicationOrchestrator _orchestrator;
    private readonly IOptionsMonitor<AiAdjudicationExecutionOptions> _optionsMonitor;
    private readonly ILogger<AiAdjudicationWorker> _logger;

    public AiAdjudicationWorker(
        IAiAdjudicationQueue queue,
        IAiAdjudicationOrchestrator orchestrator,
        IOptionsMonitor<AiAdjudicationExecutionOptions> optionsMonitor,
        ILogger<AiAdjudicationWorker> logger)
    {
        _queue = queue;
        _orchestrator = orchestrator;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _orchestrator.RecoverAsync(stoppingToken);
        var schedulerTask = RunSchedulerAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            Guid adjudicationId;
            try
            {
                adjudicationId = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await _orchestrator.ProcessAsync(adjudicationId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled failure while processing adjudication job {AdjudicationId}.", adjudicationId);
            }
        }

        await schedulerTask;
    }

    private async Task RunSchedulerAsync(CancellationToken cancellationToken)
    {
        await _orchestrator.EnqueueDueAsync(cancellationToken);

        var intervalSeconds = Math.Max(1, _optionsMonitor.CurrentValue.SchedulerIntervalSeconds);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSeconds));

        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            try
            {
                await _orchestrator.EnqueueDueAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed while enqueueing due AI adjudications.");
            }
        }
    }
}
