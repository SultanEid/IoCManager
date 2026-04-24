using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Feedback;
using Microsoft.EntityFrameworkCore;
using System.Data;

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

    public async Task<int> CountRecentAsync(DateTimeOffset sinceUtc, CancellationToken cancellationToken)
    {
        if (!await FeedbackTableExistsAsync(cancellationToken))
        {
            return 0;
        }

        return await _dbContext.Feedback.CountAsync(x => x.CreatedAtUtc >= sinceUtc, cancellationToken);
    }

    private async Task<bool> FeedbackTableExistsAsync(CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational())
        {
            return true;
        }

        var connection = _dbContext.Database.GetDbConnection();
        var shouldCloseConnection = connection.State != ConnectionState.Open;

        if (shouldCloseConnection)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT CASE WHEN OBJECT_ID(N'[dbo].[feedback_records]', N'U') IS NULL THEN 0 ELSE 1 END;";
            var scalar = await command.ExecuteScalarAsync(cancellationToken);
            return scalar is not null && Convert.ToInt32(scalar) == 1;
        }
        finally
        {
            if (shouldCloseConnection)
            {
                await connection.CloseAsync();
            }
        }
    }
}
