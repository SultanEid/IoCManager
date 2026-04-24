using Backend.Application.Abstractions.Persistence;
using Backend.Application.Common;
using Backend.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class JobRunsRepository : IJobRunsRepository
{
    private readonly CtiDbContext _dbContext;
    private bool? _jobRunsTableExists;

    public JobRunsRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(JobRunRecord item, CancellationToken cancellationToken)
    {
        if (!await EnsureJobRunsTableExistsAsync(cancellationToken))
        {
            throw new OptionalDependencyUnavailableException(
                "job_run_records",
                "missing_table",
                "Job run persistence table is missing. Run schema initialization before recording job runs.");
        }

        await _dbContext.JobRuns.AddAsync(item, cancellationToken);
    }

    public async Task<IReadOnlyList<JobRunRecord>> ListRecentAsync(int count, CancellationToken cancellationToken)
    {
        if (!await EnsureJobRunsTableExistsAsync(cancellationToken))
        {
            return Array.Empty<JobRunRecord>();
        }

        try
        {
            return await _dbContext.JobRuns
                .AsNoTracking()
                .OrderByDescending(x => x.StartedAtUtc)
                .Take(count)
                .ToArrayAsync(cancellationToken);
        }
        catch (Exception ex) when (IsMissingJobRunsTable(ex))
        {
            _jobRunsTableExists = false;
            return Array.Empty<JobRunRecord>();
        }
    }

    private async Task<bool> EnsureJobRunsTableExistsAsync(CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational())
        {
            return true;
        }

        if (_jobRunsTableExists.HasValue)
        {
            return _jobRunsTableExists.Value;
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
            command.CommandText = "SELECT CASE WHEN OBJECT_ID(N'[dbo].[job_run_records]', N'U') IS NULL THEN 0 ELSE 1 END;";
            var scalar = await command.ExecuteScalarAsync(cancellationToken);
            var exists = scalar is not null && Convert.ToInt32(scalar) == 1;
            _jobRunsTableExists = exists;
            return exists;
        }
        finally
        {
            if (shouldCloseConnection)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static bool IsMissingJobRunsTable(Exception exception)
    {
        return exception.Message.Contains("Invalid object name 'job_run_records'", StringComparison.OrdinalIgnoreCase);
    }
}
