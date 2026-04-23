using Backend.Contracts.V2;

namespace Backend.Application.Abstractions.Services;

public interface IScanPlanService
{
    Task<IReadOnlyList<ScanPlanResponse>> ListAsync(CancellationToken cancellationToken = default);
    Task<ScanPlanResponse> CreateAsync(CreateScanPlanRequest request, CancellationToken cancellationToken = default);
    Task<ScanJobResponse> RunAsync(Guid scanPlanId, RunScanPlanRequest request, CancellationToken cancellationToken = default);
}