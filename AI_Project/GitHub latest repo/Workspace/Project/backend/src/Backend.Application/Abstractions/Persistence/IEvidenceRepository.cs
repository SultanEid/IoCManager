using Backend.Domain.Evidence;

namespace Backend.Application.Abstractions.Persistence;

public interface IEvidenceRepository
{
    Task AddAsync(EvidenceItem item, CancellationToken cancellationToken);
    Task<IReadOnlyList<EvidenceItem>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
