using Backend.Domain.Cases;
using Backend.Domain.Common;

namespace Backend.Application.Abstractions.Persistence;

public interface ICasesRepository
{
    Task AddAsync(CaseRecord item, CancellationToken cancellationToken);
    Task<CaseRecord?> GetByIdAsync(Guid caseId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CaseRecord>> ListAsync(CancellationToken cancellationToken);
    Task<int> CountByStatusesAsync(IReadOnlyCollection<CaseStatus> statuses, CancellationToken cancellationToken);
}
