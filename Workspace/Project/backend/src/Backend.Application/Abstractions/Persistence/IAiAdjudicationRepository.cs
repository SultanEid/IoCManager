using Backend.Domain.AiAdjudication;

namespace Backend.Application.Abstractions.Persistence;

public interface IAiAdjudicationRepository
{
    Task AddRequestAsync(AiAdjudicationRequest request, CancellationToken cancellationToken);
    Task<AiAdjudicationRequest?> GetRequestAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiAdjudicationRequest>> ListDueRequestsAsync(DateTimeOffset asOfUtc, int take, CancellationToken cancellationToken);

    Task AddJobAsync(AiAdjudicationJob job, CancellationToken cancellationToken);
    Task<AiAdjudicationJob?> GetLatestJobAsync(Guid adjudicationId, CancellationToken cancellationToken);

    Task<AiAdjudicationResult?> GetResultAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertResultAsync(AiAdjudicationResult result, CancellationToken cancellationToken);

    Task<AiAdjudicationExplanation?> GetExplanationAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertExplanationAsync(AiAdjudicationExplanation explanation, CancellationToken cancellationToken);

    Task<AiActionPlanRecommendation?> GetActionPlanAsync(Guid adjudicationId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertActionPlanAsync(AiActionPlanRecommendation actionPlan, CancellationToken cancellationToken);

    Task AddOverrideAsync(AiAdjudicationOverride item, CancellationToken cancellationToken);

    Task ReplaceSimilarDetectionsAsync(Guid adjudicationId, IReadOnlyList<AiAdjudicationSimilarDetection> items, CancellationToken cancellationToken);
    Task<AiPagedSlice<AiAdjudicationSimilarDetection>> ListSimilarDetectionsAsync(Guid adjudicationId, int skip, int take, CancellationToken cancellationToken);

    Task ReplaceEvidenceSourcesAsync(Guid adjudicationId, IReadOnlyList<AiAdjudicationEvidenceSource> items, CancellationToken cancellationToken);
    Task<AiPagedSlice<AiAdjudicationEvidenceSource>> ListEvidenceSourcesAsync(Guid adjudicationId, int skip, int take, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public sealed record AiPagedSlice<T>(
    IReadOnlyList<T> Items,
    bool HasMore);
