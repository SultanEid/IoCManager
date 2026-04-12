using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Feedback;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class FeedbackRepository : IFeedbackRepository
{
    private readonly CtiDbContext _dbContext;

    public FeedbackRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(FeedbackRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.Feedback.AddAsync(item, cancellationToken).AsTask();
    }

    public async Task<IReadOnlyList<FeedbackRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.Feedback
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task<int> CountRecentAsync(DateTimeOffset sinceUtc, CancellationToken cancellationToken)
    {
        return _dbContext.Feedback.CountAsync(x => x.CreatedAtUtc >= sinceUtc, cancellationToken);
    }
}
