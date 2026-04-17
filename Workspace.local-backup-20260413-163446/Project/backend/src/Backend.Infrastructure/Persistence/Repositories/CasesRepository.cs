using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cases;
using Backend.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class CasesRepository : ICasesRepository
{
    private readonly CtiDbContext _dbContext;

    public CasesRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(CaseRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.Cases.AddAsync(item, cancellationToken).AsTask();
    }

    public Task<CaseRecord?> GetByIdAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return _dbContext.Cases.FirstOrDefaultAsync(x => x.Id == caseId, cancellationToken);
    }

    public async Task<IReadOnlyList<CaseRecord>> ListAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Cases
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task<int> CountByStatusesAsync(IReadOnlyCollection<CaseStatus> statuses, CancellationToken cancellationToken)
    {
        return _dbContext.Cases.CountAsync(x => statuses.Contains(x.Status), cancellationToken);
    }
}
