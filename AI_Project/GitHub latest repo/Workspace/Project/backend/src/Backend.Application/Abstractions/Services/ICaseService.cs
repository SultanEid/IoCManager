using Backend.Contracts.Cases;

namespace Backend.Application.Abstractions.Services;

public interface ICaseService
{
    Task<CaseResponse> CreateAsync(CreateCaseRequest request, CancellationToken cancellationToken);
    Task<CaseResponse?> GetAsync(Guid caseId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CaseResponse>> ListAsync(CancellationToken cancellationToken);
    Task<CaseResponse?> UpdateStatusAsync(Guid caseId, UpdateCaseStatusRequest request, CancellationToken cancellationToken);
}
