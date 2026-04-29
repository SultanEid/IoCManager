using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public interface ILegacyScanPipelineSchemaInitializer
{
    Task EnsureSchemaAsync(CancellationToken cancellationToken);
}

public sealed class LegacyScanPipelineSchemaInitializer : ILegacyScanPipelineSchemaInitializer
{
    private readonly LegacyScanPipelineDbContext _dbContext;
    private readonly ILogger<LegacyScanPipelineSchemaInitializer> _logger;

    public LegacyScanPipelineSchemaInitializer(
        LegacyScanPipelineDbContext dbContext,
        ILogger<LegacyScanPipelineSchemaInitializer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational())
        {
            return;
        }

        var connectionString = _dbContext.Database.GetConnectionString();
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogInformation("Skipping legacy scan pipeline schema initialization because no legacy database connection string is configured.");
            return;
        }

        var coreLegacyTablesExist = await LegacyTableExistsAsync("dbo.NETWORK", cancellationToken)
            || await LegacyTableExistsAsync("dbo.Target", cancellationToken)
            || await LegacyTableExistsAsync("dbo.ScanPlan", cancellationToken)
            || await LegacyTableExistsAsync("dbo.ScanJob", cancellationToken)
            || await LegacyTableExistsAsync("dbo.Report", cancellationToken);

        if (!coreLegacyTablesExist)
        {
            _logger.LogInformation("Skipping legacy scan pipeline schema initialization because the legacy tables are not present in the configured database.");
            return;
        }

        var commands = new[]
        {
            "IF COL_LENGTH('dbo.NETWORK', 'SshUser') IS NULL ALTER TABLE dbo.NETWORK ADD SshUser nvarchar(100) NULL;",
            "IF COL_LENGTH('dbo.NETWORK', 'SshKeyPath') IS NULL ALTER TABLE dbo.NETWORK ADD SshKeyPath nvarchar(512) NULL;",
            "IF COL_LENGTH('dbo.NETWORK', 'SshPasswordProtected') IS NULL ALTER TABLE dbo.NETWORK ADD SshPasswordProtected nvarchar(4000) NULL;",
            "IF COL_LENGTH('dbo.NETWORK', 'Notes') IS NULL ALTER TABLE dbo.NETWORK ADD Notes nvarchar(1024) NULL;",
            "IF COL_LENGTH('dbo.Target', 'DisplayName') IS NULL ALTER TABLE dbo.Target ADD DisplayName nvarchar(150) NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'Status') IS NULL ALTER TABLE dbo.ScanPlan ADD Status nvarchar(20) NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'ScheduleType') IS NULL ALTER TABLE dbo.ScanPlan ADD ScheduleType nvarchar(20) NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'ScheduleJson') IS NULL ALTER TABLE dbo.ScanPlan ADD ScheduleJson nvarchar(max) NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'NextRunAt') IS NULL ALTER TABLE dbo.ScanPlan ADD NextRunAt datetime2 NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'LastRunAt') IS NULL ALTER TABLE dbo.ScanPlan ADD LastRunAt datetime2 NULL;",
            "IF COL_LENGTH('dbo.ScanPlan', 'UpdatedAt') IS NULL ALTER TABLE dbo.ScanPlan ADD UpdatedAt datetime2 NULL;",
            "IF COL_LENGTH('dbo.ScanJob', 'QueuedAt') IS NULL ALTER TABLE dbo.ScanJob ADD QueuedAt datetime2 NULL;",
            "IF COL_LENGTH('dbo.ScanJob', 'TriggerType') IS NULL ALTER TABLE dbo.ScanJob ADD TriggerType nvarchar(20) NULL;",
            "IF COL_LENGTH('dbo.ScanJob', 'BatchId') IS NULL ALTER TABLE dbo.ScanJob ADD BatchId uniqueidentifier NULL;",
            "IF COL_LENGTH('dbo.ScanJob', 'Summary') IS NULL ALTER TABLE dbo.ScanJob ADD Summary nvarchar(255) NULL;",
            "IF COL_LENGTH('dbo.Report', 'JobID') IS NULL ALTER TABLE dbo.Report ADD JobID int NULL;",
            "IF COL_LENGTH('dbo.Report', 'TargetID') IS NULL ALTER TABLE dbo.Report ADD TargetID int NULL;",
            "IF COL_LENGTH('dbo.Report', 'NetworkID') IS NULL ALTER TABLE dbo.Report ADD NetworkID int NULL;",
            "IF COL_LENGTH('dbo.Report', 'FileExtension') IS NULL ALTER TABLE dbo.Report ADD FileExtension nvarchar(10) NULL;",
            "IF COL_LENGTH('dbo.Report', 'FilePath') IS NULL ALTER TABLE dbo.Report ADD FilePath nvarchar(512) NULL;",
            "IF COL_LENGTH('dbo.Report', 'ContentJson') IS NULL ALTER TABLE dbo.Report ADD ContentJson nvarchar(max) NULL;",
        };

        foreach (var command in commands)
        {
            await _dbContext.Database.ExecuteSqlRawAsync(command, cancellationToken);
        }
    }

    private async Task<bool> LegacyTableExistsAsync(string fullTableName, CancellationToken cancellationToken)
    {
        var connection = _dbContext.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT CASE WHEN OBJECT_ID(@tableName, 'U') IS NULL THEN 0 ELSE 1 END";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "@tableName";
        parameter.Value = fullTableName;
        command.Parameters.Add(parameter);

        var scalar = await command.ExecuteScalarAsync(cancellationToken);
        return scalar is int count && count == 1
            || scalar is long longCount && longCount == 1
            || scalar is decimal decimalCount && decimalCount == 1;
    }
}
