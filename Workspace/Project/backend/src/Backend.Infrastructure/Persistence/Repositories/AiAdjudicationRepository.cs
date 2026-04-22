using Backend.Application.Abstractions.Persistence;
using Backend.Domain.AiAdjudication;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class AiAdjudicationRepository : IAiAdjudicationRepository
{
    private readonly CtiDbContext _dbContext;

    public AiAdjudicationRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddRequestAsync(AiAdjudicationRequest request, CancellationToken cancellationToken)
    {
        return _dbContext.AiAdjudicationRequests.AddAsync(request, cancellationToken).AsTask();
    }

    public async Task<AiAdjudicationRequest?> GetRequestAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiAdjudicationRequests.AsQueryable()
            : _dbContext.AiAdjudicationRequests.AsNoTracking();

        return await query.FirstOrDefaultAsync(x => x.Id == adjudicationId, cancellationToken);
    }

    public async Task<AiAdjudicationRequest?> GetLatestRequestByDetectionAsync(string detectionId, CancellationToken cancellationToken)
    {
        var normalizedDetectionId = detectionId.Trim();
        var parsedDetectionId = Guid.TryParse(normalizedDetectionId, out var detectionRecordId) ? detectionRecordId : (Guid?)null;

        return await _dbContext.AiAdjudicationRequests
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
                    [AdjudicationRequestId]
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
                AdjudicationRequestId: reader.GetGuid(2));
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
                FROM [dbo].[ai_adjudication_requests] req
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
                AdjudicationRequestId: reader.GetGuid(0));
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    public async Task<IReadOnlyList<AiAdjudicationRequest>> ListDueRequestsAsync(DateTimeOffset asOfUtc, int take, CancellationToken cancellationToken)
    {
        var boundedTake = Math.Clamp(take, 1, 500);
        return await _dbContext.AiAdjudicationRequests
            .Where(x => x.Status == AiAdjudicationStatus.Queued
                && x.NextAttemptAtUtc.HasValue
                && x.NextAttemptAtUtc.Value <= asOfUtc)
            .OrderBy(x => x.NextAttemptAtUtc)
            .ThenBy(x => x.SubmittedAtUtc)
            .Take(boundedTake)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddJobAsync(AiAdjudicationJob job, CancellationToken cancellationToken)
    {
        return _dbContext.AiAdjudicationJobs.AddAsync(job, cancellationToken).AsTask();
    }

    public async Task<AiAdjudicationJob?> GetLatestJobAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        return await _dbContext.AiAdjudicationJobs
            .AsNoTracking()
            .Where(x => x.AdjudicationRequestId == adjudicationId)
            .OrderByDescending(x => x.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AiAdjudicationResult?> GetResultAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiAdjudicationResults.AsQueryable()
            : _dbContext.AiAdjudicationResults.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.AdjudicationRequestId == adjudicationId, cancellationToken);
    }

    public async Task UpsertResultAsync(AiAdjudicationResult result, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiAdjudicationResults
            .FirstOrDefaultAsync(x => x.AdjudicationRequestId == result.AdjudicationRequestId, cancellationToken);

        if (existing is null)
        {
            await _dbContext.AiAdjudicationResults.AddAsync(result, cancellationToken);
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

    public async Task<AiAdjudicationExplanation?> GetExplanationAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiAdjudicationExplanations.AsQueryable()
            : _dbContext.AiAdjudicationExplanations.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.AdjudicationRequestId == adjudicationId, cancellationToken);
    }

    public async Task UpsertExplanationAsync(AiAdjudicationExplanation explanation, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiAdjudicationExplanations
            .FirstOrDefaultAsync(x => x.AdjudicationRequestId == explanation.AdjudicationRequestId, cancellationToken);

        if (existing is null)
        {
            await _dbContext.AiAdjudicationExplanations.AddAsync(explanation, cancellationToken);
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

    public async Task<AiActionPlanRecommendation?> GetActionPlanAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken)
    {
        var query = asTracking
            ? _dbContext.AiActionPlanRecommendations.AsQueryable()
            : _dbContext.AiActionPlanRecommendations.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.AdjudicationRequestId == adjudicationId, cancellationToken);
    }

    public async Task UpsertActionPlanAsync(AiActionPlanRecommendation actionPlan, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiActionPlanRecommendations
            .FirstOrDefaultAsync(x => x.AdjudicationRequestId == actionPlan.AdjudicationRequestId, cancellationToken);

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

    public Task AddOverrideAsync(AiAdjudicationOverride item, CancellationToken cancellationToken)
    {
        return _dbContext.AiAdjudicationOverrides.AddAsync(item, cancellationToken).AsTask();
    }

    public async Task ReplaceSimilarDetectionsAsync(
        Guid adjudicationId,
        IReadOnlyList<AiAdjudicationSimilarDetection> items,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiAdjudicationSimilarDetections
            .Where(x => x.AdjudicationRequestId == adjudicationId)
            .ToArrayAsync(cancellationToken);

        if (existing.Length > 0)
        {
            _dbContext.AiAdjudicationSimilarDetections.RemoveRange(existing);
        }

        if (items.Count > 0)
        {
            await _dbContext.AiAdjudicationSimilarDetections.AddRangeAsync(items, cancellationToken);
        }
    }

    public async Task<AiPagedSlice<AiAdjudicationSimilarDetection>> ListSimilarDetectionsAsync(
        Guid adjudicationId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var boundedSkip = Math.Max(0, skip);
        var boundedTake = Math.Clamp(take, 1, 100);

        var rows = await _dbContext.AiAdjudicationSimilarDetections
            .AsNoTracking()
            .Where(x => x.AdjudicationRequestId == adjudicationId)
            .OrderBy(x => x.Rank)
            .ThenByDescending(x => x.ObservedAtUtc)
            .Skip(boundedSkip)
            .Take(boundedTake + 1)
            .ToArrayAsync(cancellationToken);

        var hasMore = rows.Length > boundedTake;
        var items = hasMore ? rows.Take(boundedTake).ToArray() : rows;
        return new AiPagedSlice<AiAdjudicationSimilarDetection>(items, hasMore);
    }

    public async Task ReplaceEvidenceSourcesAsync(
        Guid adjudicationId,
        IReadOnlyList<AiAdjudicationEvidenceSource> items,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.AiAdjudicationEvidenceSources
            .Where(x => x.AdjudicationRequestId == adjudicationId)
            .ToArrayAsync(cancellationToken);

        if (existing.Length > 0)
        {
            _dbContext.AiAdjudicationEvidenceSources.RemoveRange(existing);
        }

        if (items.Count > 0)
        {
            await _dbContext.AiAdjudicationEvidenceSources.AddRangeAsync(items, cancellationToken);
        }
    }

    public async Task<AiPagedSlice<AiAdjudicationEvidenceSource>> ListEvidenceSourcesAsync(
        Guid adjudicationId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var boundedSkip = Math.Max(0, skip);
        var boundedTake = Math.Clamp(take, 1, 100);

        var rows = await _dbContext.AiAdjudicationEvidenceSources
            .AsNoTracking()
            .Where(x => x.AdjudicationRequestId == adjudicationId)
            .OrderBy(x => x.Rank)
            .ThenBy(x => x.Channel)
            .Skip(boundedSkip)
            .Take(boundedTake + 1)
            .ToArrayAsync(cancellationToken);

        var hasMore = rows.Length > boundedTake;
        var items = hasMore ? rows.Take(boundedTake).ToArray() : rows;
        return new AiPagedSlice<AiAdjudicationEvidenceSource>(items, hasMore);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
