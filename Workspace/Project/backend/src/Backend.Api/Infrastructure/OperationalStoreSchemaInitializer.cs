using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public interface IOperationalStoreSchemaInitializer
{
    Task EnsureSchemaAsync(CancellationToken cancellationToken);
}

public sealed class OperationalStoreSchemaInitializer : IOperationalStoreSchemaInitializer
{
    private readonly CtiDbContext _dbContext;

    public OperationalStoreSchemaInitializer(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational())
        {
            return;
        }

        var commands = new[]
        {
            """
            IF OBJECT_ID('dbo.job_run_records', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.job_run_records
                (
                    Id uniqueidentifier NOT NULL CONSTRAINT PK_job_run_records PRIMARY KEY,
                    JobType nvarchar(64) NOT NULL,
                    Status nvarchar(32) NOT NULL,
                    StartedAtUtc datetimeoffset NOT NULL,
                    CompletedAtUtc datetimeoffset NULL,
                    TriggeredBy nvarchar(128) NOT NULL,
                    Details nvarchar(2000) NOT NULL,
                    CreatedAtUtc datetimeoffset NOT NULL,
                    UpdatedAtUtc datetimeoffset NOT NULL,
                    CreatedByUserId nvarchar(128) NOT NULL,
                    UpdatedByUserId nvarchar(128) NOT NULL,
                    RowVersion rowversion NOT NULL
                );
            END;
            """,
            "IF COL_LENGTH('dbo.job_run_records', 'Details') IS NULL ALTER TABLE dbo.job_run_records ADD Details nvarchar(2000) NOT NULL CONSTRAINT DF_job_run_records_Details DEFAULT('');",
            "IF COL_LENGTH('dbo.job_run_records', 'RowVersion') IS NULL ALTER TABLE dbo.job_run_records ADD RowVersion rowversion NOT NULL;",
            """
            IF OBJECT_ID('dbo.ai_decision_requests', 'U') IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID('dbo.ai_decision_requests')
                        AND name = 'IocValue'
                        AND max_length <> -1
                )
            BEGIN
                ALTER TABLE dbo.ai_decision_requests ALTER COLUMN IocValue nvarchar(max) NOT NULL;
            END;
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_job_run_records_JobType_StartedAtUtc' AND object_id = OBJECT_ID('dbo.job_run_records'))
                CREATE INDEX IX_job_run_records_JobType_StartedAtUtc ON dbo.job_run_records (JobType, StartedAtUtc);
            """,
        };

        foreach (var command in commands)
        {
            await _dbContext.Database.ExecuteSqlRawAsync(command, cancellationToken);
        }
    }
}
