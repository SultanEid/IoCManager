using Backend.Contracts.Admin;

namespace Backend.Application.Abstractions.Services;

public interface IJobOrchestrationService
{
    Task<JobRunResponse> RunModelRetrainingAsync(string triggeredByUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<JobRunResponse>> ListRecentAsync(int count, CancellationToken cancellationToken);
}
