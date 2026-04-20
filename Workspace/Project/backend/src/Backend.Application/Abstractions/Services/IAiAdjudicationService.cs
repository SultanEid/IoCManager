using Backend.Contracts.V2;

namespace Backend.Application.Abstractions.Services;

public interface IAiAdjudicationService
{
    Task<SubmitAdjudicationAcceptedDto> SubmitAsync(SubmitAdjudicationRequestDto request, CancellationToken cancellationToken);
    Task<AdjudicationResultDto?> GetResultAsync(Guid adjudicationId, CancellationToken cancellationToken);
    Task<ExplanationDetailDto?> GetExplanationAsync(Guid adjudicationId, CancellationToken cancellationToken);
    Task<RecommendedActionPlanDto?> GetActionPlanAsync(Guid adjudicationId, CancellationToken cancellationToken);
    Task<OverrideOrClosureResponseDto> SubmitOverrideOrClosureAsync(Guid adjudicationId, OverrideOrClosureRequestDto request, CancellationToken cancellationToken);
    Task<SimilarDetectionsResponseDto?> GetSimilarDetectionsAsync(Guid adjudicationId, int limit, string? cursor, CancellationToken cancellationToken);
    Task<EvidenceSourcesResponseDto?> GetEvidenceSourcesAsync(Guid adjudicationId, int limit, string? cursor, CancellationToken cancellationToken);
}
