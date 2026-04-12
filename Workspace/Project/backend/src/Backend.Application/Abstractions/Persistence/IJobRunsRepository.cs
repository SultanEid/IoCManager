using Backend.Domain.Jobs;

namespace Backend.Application.Abstractions.Persistence;

public interface IJobRunsRepository
{
    Task AddAsync(JobRunRecord item, CancellationToken cancellationToken);
    Task<IReadOnlyList<JobRunRecord>> ListRecentAsync(int count, CancellationToken cancellationToken);
}
