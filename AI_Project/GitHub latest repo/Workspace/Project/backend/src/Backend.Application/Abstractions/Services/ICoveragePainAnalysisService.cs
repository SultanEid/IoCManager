using Backend.Contracts.CoveragePain;

namespace Backend.Application.Abstractions.Services;

public interface ICoveragePainAnalysisService
{
    Task<CoveragePainAnalysisResponse> GetAnalysisAsync(
        GetCoveragePainAnalysisRequest request,
        CancellationToken cancellationToken);
}
