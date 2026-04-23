using Backend.Application.Abstractions.Persistence;
using Backend.Domain.AiDecision;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class AiDecisionRepository : IAiDecisionRepository
{
    private readonly CtiDbContext _dbContext;

    public AiDecisionRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddRequestAsync(AiDecisionRequest request, CancellationToken cancellationToken)
    {
        return _dbContext.AiDecisionRequests.AddAsync(request, cancellationToken).AsTask();
    }

    public async Task<AiDecisionRequest?> GetRequestAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiDecisionRequests.AsQueryable()
            : _dbContext.AiDecisionRequests.AsNoTracking();

        return await query.FirstOrDefaultAsync(x => x.Id == decisionId, cancellationToken);
    }

    public async Task<AiDecisionRequest?> GetLatestRequestByDetectionAsync(string detectionId, CancellationToken cancellationToken)
    {
        var normalizedDetectionId = detectionId.Trim();
        var parsedDetectionId = Guid.TryParse(normalizedDetectionId, out var detectionRecordId) ? detectionRecordId : (Guid?)null;

        return await _dbContext.AiDecisionRequests
            .AsNoTracking()
            .Where(x => x.DetectionId == normalizedDetectionId
                || (parsedDetectionId.HasValue && x.DetectionRecordId == parsedDetectionId.Value))
            .OrderByDescending(x => x.SubmittedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AiLatestDecisionReference?> GetLatestDecisionReferenceByIocAsync(Guid iocId, CancellationToken cancellationToken)
    {
        var connection = _dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT TOP (1)
                    [IocId],
                    [DetectionId],
                    [DecisionRequestId]
                FROM [dbo].[vw_ai_latest_ioc_decisions]
                WHERE [IocId] = @iocId
                """;

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@iocId";
            parameter.DbType = DbType.Guid;
            parameter.Value = iocId;
            command.Parameters.Add(parameter);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new AiLatestDecisionReference(
                IocId: reader.GetGuid(0),
                DetectionId: reader.GetGuid(1),
                DecisionRequestId: reader.GetGuid(2));
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    public async Task<AiLatestDecisionReference?> GetLatestDecisionReferenceByLegacyIocAsync(Guid iocId, CancellationToken cancellationToken)
    {
        var connection = _dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT TOP (1)
                    req.[Id],
                    req.[DetectionRecordId]
                FROM [dbo].[ai_decision_requests] req
                WHERE JSON_VALUE(req.[DetectionPackageJson], '$.legacyIocId') = @iocId
                ORDER BY req.[SubmittedAtUtc] DESC
                """;

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@iocId";
            parameter.DbType = DbType.String;
            parameter.Value = iocId.ToString("D");
            command.Parameters.Add(parameter);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new AiLatestDecisionReference(
                IocId: iocId,
                DetectionId: reader.IsDBNull(1) ? null : reader.GetGuid(1),
                DecisionRequestId: reader.GetGuid(0));
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    public async Task<IReadOnlyList<AiDecisionRequest>> ListDueRequestsAsync(DateTimeOffset asOfUtc, int take, CancellationToken cancellationToken)
    {
        var boundedTake = Math.Clamp(take, 1, 500);
        return await _dbContext.AiDecisionRequests
            .Where(x => x.Status == AiDecisionStatus.Queued
                && x.NextAttemptAtUtc.HasValue
                && x.NextAttemptAtUtc.Value <= asOfUtc)
            .OrderBy(x => x.NextAttemptAtUtc)
            .ThenBy(x => x.SubmittedAtUtc)
            .Take(boundedTake)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddJobAsync(AiDecisionJob job, CancellationToken cancellationToken)
    {
        return _dbContext.AiDecisionJobs.AddAsync(job, cancellationToken).AsTask();
    }

    public async Task<AiDecisionJob?> GetLatestJobAsync(Guid decisionId, CancellationToken cancellationToken)
    {
        return await _dbContext.AiDecisionJobs
            .AsNoTracking()
            .Where(x => x.DecisionRequestId == decisionId)
            .OrderByDescending(x => x.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AiDecisionResult?> GetResultAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiDecisionResults.AsQueryable()
            : _dbContext.AiDecisionResults.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.DecisionRequestId == decisionId, cancellationToken);
    }

    public async Task UpsertResultAsync(AiDecisionResult result, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiDecisionResults
            .FirstOrDefaultAsync(x => x.DecisionRequestId == result.DecisionRequestId, cancellationToken);

        if (existing is null)
        {
            await _dbContext.AiDecisionResults.AddAsync(result, cancellationToken);
            return;
        }

        existing.Update(
            verdict: result.Verdict,
            action: result.Action,
            confidence: result.Confidence,
            falsePositiveRisk: result.FalsePositiveRisk,
            reviewPriority: result.ReviewPriority,
            shouldPromoteToIndicator: result.ShouldPromoteToIndicator,
            shouldSuppress: result.ShouldSuppress,
            shouldAllowlist: result.ShouldAllowlist,
            shouldEscalate: result.ShouldEscalate,
            reasonsJson: result.ReasonsJson,
            provenanceJson: result.ProvenanceJson,
            nextBestEvidenceJson: result.NextBestEvidenceJson,
            abstainReason: result.AbstainReason,
            modelVersion: result.ModelVersion,
            datasetVersion: result.DatasetVersion,
            scoredAtUtc: result.ScoredAtUtc,
            rawPayloadJson: result.RawPayloadJson,
            actorUserId: result.UpdatedByUserId,
            nowUtc: DateTimeOffset.UtcNow);
    }

    public async Task<AiDecisionExplanation?> GetExplanationAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiDecisionExplanations.AsQueryable()
            : _dbContext.AiDecisionExplanations.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.DecisionRequestId == decisionId, cancellationToken);
    }

    public async Task UpsertExplanationAsync(AiDecisionExplanation explanation, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiDecisionExplanations
            .FirstOrDefaultAsync(x => x.DecisionRequestId == explanation.DecisionRequestId, cancellationToken);

        if (existing is null)
        {
            await _dbContext.AiDecisionExplanations.AddAsync(explanation, cancellationToken);
            return;
        }

        existing.Update(
            summary: explanation.Summary,
            decisionState: explanation.DecisionState,
            recommendedAction: explanation.RecommendedAction,
            rationaleJson: explanation.RationaleJson,
            citationsJson: explanation.CitationsJson,
            nextBestEvidenceJson: explanation.NextBestEvidenceJson,
            policyVersion: explanation.PolicyVersion,
            modelVersion: explanation.ModelVersion,
            datasetVersion: explanation.DatasetVersion,
            generatedAtUtc: explanation.GeneratedAtUtc,
            rawPayloadJson: explanation.RawPayloadJson,
            actorUserId: explanation.UpdatedByUserId,
            nowUtc: DateTimeOffset.UtcNow);
    }

    public async Task<AiActionPlanRecommendation?> GetActionPlanAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiActionPlanRecommendations.AsQueryable()
            : _dbContext.AiActionPlanRecommendations.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.DecisionRequestId == decisionId, cancellationToken);
    }

    public async Task UpsertActionPlanAsync(AiActionPlanRecommendation actionPlan, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiActionPlanRecommendations
            .FirstOrDefaultAsync(x => x.DecisionRequestId == actionPlan.DecisionRequestId, cancellationToken);

        if (existing is null)
        {
            await _dbContext.AiActionPlanRecommendations.AddAsync(actionPlan, cancellationToken);
            return;
        }

        existing.Update(
            summary: actionPlan.Summary,
            recommendedActionsJson: actionPlan.RecommendedActionsJson,
            prerequisitesJson: actionPlan.PrerequisitesJson,
            cautionsJson: actionPlan.CautionsJson,
            neverAutoExecutes: actionPlan.NeverAutoExecutes,
            policyConstrained: actionPlan.PolicyConstrained,
            evidenceBased: actionPlan.EvidenceBased,
            generatedAtUtc: actionPlan.GeneratedAtUtc,
            rawPayloadJson: actionPlan.RawPayloadJson,
            actorUserId: actionPlan.UpdatedByUserId,
            nowUtc: DateTimeOffset.UtcNow);
    }

    public Task AddOverrideAsync(AiDecisionOverride item, CancellationToken cancellationToken)
    {
        return _dbContext.AiDecisionOverrides.AddAsync(item, cancellationToken).AsTask();
    }

    public async Task ReplaceSimilarDetectionsAsync(
        Guid decisionId,
        IReadOnlyList<AiDecisionSimilarDetection> items,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiDecisionSimilarDetections
            .Where(x => x.DecisionRequestId == decisionId)
            .ToArrayAsync(cancellationToken);

        if (existing.Length > 0)
        {
            _dbContext.AiDecisionSimilarDetections.RemoveRange(existing);
        }

        if (items.Count > 0)
        {
            await _dbContext.AiDecisionSimilarDetections.AddRangeAsync(items, cancellationToken);
        }
    }

    public async Task<AiPagedSlice<AiDecisionSimilarDetection>> ListSimilarDetectionsAsync(
        Guid decisionId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var boundedSkip = Math.Max(0, skip);
        var boundedTake = Math.Clamp(take, 1, 100);

        var rows = await _dbContext.AiDecisionSimilarDetections
            .AsNoTracking()
            .Where(x => x.DecisionRequestId == decisionId)
            .OrderBy(x => x.Rank)
            .ThenByDescending(x => x.ObservedAtUtc)
            .Skip(boundedSkip)
            .Take(boundedTake + 1)
            .ToArrayAsync(cancellationToken);

        var hasMore = rows.Length > boundedTake;
        var items = hasMore ? rows.Take(boundedTake).ToArray() : rows;
        return new AiPagedSlice<AiDecisionSimilarDetection>(items, hasMore);
    }

    public async Task ReplaceEvidenceSourcesAsync(
        Guid decisionId,
        IReadOnlyList<AiDecisionEvidenceSource> items,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiDecisionEvidenceSources
            .Where(x => x.DecisionRequestId == decisionId)
            .ToArrayAsync(cancellationToken);

        if (existing.Length > 0)
        {
            _dbContext.AiDecisionEvidenceSources.RemoveRange(existing);
        }

        if (items.Count > 0)
        {
            await _dbContext.AiDecisionEvidenceSources.AddRangeAsync(items, cancellationToken);
        }
    }

    public async Task<AiPagedSlice<AiDecisionEvidenceSource>> ListEvidenceSourcesAsync(
        Guid decisionId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var boundedSkip = Math.Max(0, skip);
        var boundedTake = Math.Clamp(take, 1, 100);

        var rows = await _dbContext.AiDecisionEvidenceSources
            .AsNoTracking()
            .Where(x => x.DecisionRequestId == decisionId)
            .OrderBy(x => x.Rank)
            .ThenBy(x => x.Channel)
            .Skip(boundedSkip)
            .Take(boundedTake + 1)
            .ToArrayAsync(cancellationToken);

        var hasMore = rows.Length > boundedTake;
        var items = hasMore ? rows.Take(boundedTake).ToArray() : rows;
        return new AiPagedSlice<AiDecisionEvidenceSource>(items, hasMore);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}

