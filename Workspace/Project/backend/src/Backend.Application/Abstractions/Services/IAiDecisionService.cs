using Backend.Contracts.V2;

namespace Backend.Application.Abstractions.Services;

public interface IAiDecisionService
{
    Task<SubmitDecisionAcceptedDto> SubmitAsync(SubmitDecisionRequestDto request, CancellationToken cancellationToken);
    Task<IocLatestDecisionDto?> GetLatestResultByIocAsync(Guid iocId, CancellationToken cancellationToken);
    Task<DecisionResultDto?> GetLatestResultByDetectionAsync(Guid detectionId, CancellationToken cancellationToken);
    Task<DecisionResultDto?> GetResultAsync(Guid decisionId, CancellationToken cancellationToken);
    Task<ExplanationDetailDto?> GetExplanationAsync(Guid decisionId, CancellationToken cancellationToken);
    Task<RecommendedActionPlanDto?> GetActionPlanAsync(Guid decisionId, CancellationToken cancellationToken);
    Task<OverrideOrClosureResponseDto> SubmitOverrideOrClosureAsync(Guid decisionId, OverrideOrClosureRequestDto request, CancellationToken cancellationToken);
    Task<SimilarDetectionsResponseDto?> GetSimilarDetectionsAsync(Guid decisionId, int limit, string? cursor, CancellationToken cancellationToken);
    Task<EvidenceSourcesResponseDto?> GetEvidenceSourcesAsync(Guid decisionId, int limit, string? cursor, CancellationToken cancellationToken);
}

