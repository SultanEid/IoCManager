using Backend.Domain.Common;
using Backend.Domain.Decisions;

namespace Backend.Application.Abstractions.Persistence;

public interface IDecisionsRepository
{
    Task AddAsync(DecisionRecord item, CancellationToken cancellationToken);
    Task<DecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DecisionRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
    Task<int> CountByStatesAsync(IReadOnlyCollection<DecisionState> states, CancellationToken cancellationToken);
}
