using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class JobRunsRepository : IJobRunsRepository
{
    private readonly CtiDbContext _dbContext;

    public JobRunsRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(JobRunRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.JobRuns.AddAsync(item, cancellationToken).AsTask();
    }

    public async Task<IReadOnlyList<JobRunRecord>> ListRecentAsync(int count, CancellationToken cancellationToken)
    {
        return await _dbContext.JobRuns
            .AsNoTracking()
            .OrderByDescending(x => x.StartedAtUtc)
            .Take(count)
            .ToArrayAsync(cancellationToken);
    }
}
