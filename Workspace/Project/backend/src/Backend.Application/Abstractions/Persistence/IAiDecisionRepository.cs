using Backend.Domain.AiDecision;

namespace Backend.Application.Abstractions.Persistence;

public interface IAiDecisionRepository
{
    Task AddRequestAsync(AiDecisionRequest request, CancellationToken cancellationToken);
    Task<AiDecisionRequest?> GetRequestAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken);
    Task<AiDecisionRequest?> GetLatestRequestByDetectionAsync(string detectionId, CancellationToken cancellationToken);
    Task<AiLatestDecisionReference?> GetLatestDecisionReferenceByIocAsync(Guid iocId, CancellationToken cancellationToken);
    Task<AiLatestDecisionReference?> GetLatestDecisionReferenceByLegacyIocAsync(Guid iocId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiDecisionRequest>> ListDueRequestsAsync(DateTimeOffset asOfUtc, int take, CancellationToken cancellationToken);

    Task AddJobAsync(AiDecisionJob job, CancellationToken cancellationToken);
    Task<AiDecisionJob?> GetLatestJobAsync(Guid decisionId, CancellationToken cancellationToken);

    Task<AiDecisionResult?> GetResultAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertResultAsync(AiDecisionResult result, CancellationToken cancellationToken);

    Task<AiDecisionExplanation?> GetExplanationAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertExplanationAsync(AiDecisionExplanation explanation, CancellationToken cancellationToken);

    Task<AiActionPlanRecommendation?> GetActionPlanAsync(Guid decisionId, bool asTracking, CancellationToken cancellationToken);
    Task UpsertActionPlanAsync(AiActionPlanRecommendation actionPlan, CancellationToken cancellationToken);

    Task AddOverrideAsync(AiDecisionOverride item, CancellationToken cancellationToken);

    Task ReplaceSimilarDetectionsAsync(Guid decisionId, IReadOnlyList<AiDecisionSimilarDetection> items, CancellationToken cancellationToken);
    Task<AiPagedSlice<AiDecisionSimilarDetection>> ListSimilarDetectionsAsync(Guid decisionId, int skip, int take, CancellationToken cancellationToken);

    Task ReplaceEvidenceSourcesAsync(Guid decisionId, IReadOnlyList<AiDecisionEvidenceSource> items, CancellationToken cancellationToken);
    Task<AiPagedSlice<AiDecisionEvidenceSource>> ListEvidenceSourcesAsync(Guid decisionId, int skip, int take, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public sealed record AiPagedSlice<T>(
    IReadOnlyList<T> Items,
    bool HasMore);

public sealed record AiLatestDecisionReference(
    Guid IocId,
    Guid? DetectionId,
    Guid DecisionRequestId);

