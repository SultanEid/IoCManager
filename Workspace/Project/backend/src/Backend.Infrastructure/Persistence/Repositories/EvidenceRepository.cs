using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Evidence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class EvidenceRepository : IEvidenceRepository
{
    private readonly CtiDbContext _dbContext;

    public EvidenceRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(EvidenceItem item, CancellationToken cancellationToken)
    {
        return _dbContext.Evidence.AddAsync(item, cancellationToken).AsTask();
    }

    public async Task<IReadOnlyList<EvidenceItem>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.Evidence
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CollectedAtUtc)
            .ToArrayAsync(cancellationToken);
    }
}
