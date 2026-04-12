using Backend.Domain.Feedback;

namespace Backend.Application.Abstractions.Persistence;

public interface IFeedbackRepository
{
    Task AddAsync(FeedbackRecord item, CancellationToken cancellationToken);
    Task<IReadOnlyList<FeedbackRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
    Task<int> CountRecentAsync(DateTimeOffset sinceUtc, CancellationToken cancellationToken);
}
