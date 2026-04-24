using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Common;
using Backend.Domain.Decisions;
using Microsoft.EntityFrameworkCore;
using System.Data;

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

    public async Task<int> CountByStatesAsync(IReadOnlyCollection<DecisionState> states, CancellationToken cancellationToken)
    {
        if (!await DecisionsTableExistsAsync(cancellationToken))
        {
            return 0;
        }

        return await _dbContext.Decisions.CountAsync(x => states.Contains(x.State), cancellationToken);
    }

    private async Task<bool> DecisionsTableExistsAsync(CancellationToken cancellationToken)
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
            command.CommandText = "SELECT CASE WHEN OBJECT_ID(N'[dbo].[decision_records]', N'U') IS NULL THEN 0 ELSE 1 END;";
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
