using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Common;
using Backend.Domain.Decisions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class DecisionsRepository : IDecisionsRepository
{
    private readonly CtiDbContext _dbContext;

    public DecisionsRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(DecisionRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.Decisions.AddAsync(item, cancellationToken).AsTask();
    }

    public Task<DecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken)
    {
        return _dbContext.Decisions.FirstOrDefaultAsync(x => x.Id == decisionId, cancellationToken);
    }

    public async Task<IReadOnlyList<DecisionRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.Decisions
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task<int> CountByStatesAsync(IReadOnlyCollection<DecisionState> states, CancellationToken cancellationToken)
    {
        return _dbContext.Decisions.CountAsync(x => states.Contains(x.State), cancellationToken);
    }
}
