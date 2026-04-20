using Backend.Contracts.Evidence;

namespace Backend.Application.Abstractions.Services;

public interface IEvidenceService
{
    Task<EvidenceResponse> AddAsync(AddEvidenceRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<EvidenceResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
