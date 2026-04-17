using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Deployments;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class DeploymentsRepository : IDeploymentsRepository
{
    private readonly CtiDbContext _dbContext;

    public DeploymentsRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(DeploymentRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.Deployments.AddAsync(item, cancellationToken).AsTask();
    }

    public Task<DeploymentRecord?> GetByIdAsync(Guid deploymentId, CancellationToken cancellationToken)
    {
        return _dbContext.Deployments.FirstOrDefaultAsync(x => x.Id == deploymentId, cancellationToken);
    }

    public async Task<IReadOnlyList<DeploymentRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.Deployments
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }
}
