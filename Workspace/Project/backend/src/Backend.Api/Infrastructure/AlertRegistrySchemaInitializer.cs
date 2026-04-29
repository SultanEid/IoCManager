using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public interface IAlertRegistrySchemaInitializer
{
    Task EnsureSchemaAsync(CancellationToken cancellationToken);
}

public sealed class AlertRegistrySchemaInitializer : IAlertRegistrySchemaInitializer
{
    private readonly CtiDbContext _dbContext;

    public AlertRegistrySchemaInitializer(CtiDbContext dbContext)
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
            IF OBJECT_ID('dbo.alerts_v2', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.alerts_v2
                (
                    Id uniqueidentifier NOT NULL CONSTRAINT PK_alerts_v2 PRIMARY KEY,
                    Title nvarchar(200) NOT NULL,
                    Summary nvarchar(4000) NOT NULL,
                    Severity nvarchar(64) NOT NULL,
                    Status nvarchar(64) NOT NULL,
                    OwnerUserId nvarchar(128) NOT NULL,
                    ApprovalTierRequired nvarchar(64) NOT NULL,
                    ScannerFamily nvarchar(64) NOT NULL CONSTRAINT DF_alerts_v2_ScannerFamily DEFAULT(''),
                    TargetId int NULL,
                    TargetDisplay nvarchar(200) NOT NULL CONSTRAINT DF_alerts_v2_TargetDisplay DEFAULT(''),
                    RuleName nvarchar(255) NOT NULL CONSTRAINT DF_alerts_v2_RuleName DEFAULT(''),
                    FirstDetectedAtUtc datetimeoffset NOT NULL,
                    LastDetectedAtUtc datetimeoffset NOT NULL,
                    CreatedAtUtc datetimeoffset NOT NULL,
                    UpdatedAtUtc datetimeoffset NOT NULL,
                    CreatedByUserId nvarchar(128) NOT NULL,
                    UpdatedByUserId nvarchar(128) NOT NULL
                );
            END;
            """,
            "IF COL_LENGTH('dbo.alerts_v2', 'ScannerFamily') IS NULL ALTER TABLE dbo.alerts_v2 ADD ScannerFamily nvarchar(64) NOT NULL CONSTRAINT DF_alerts_v2_ScannerFamily_Alter DEFAULT('');",
            "IF COL_LENGTH('dbo.alerts_v2', 'TargetId') IS NULL ALTER TABLE dbo.alerts_v2 ADD TargetId int NULL;",
            "IF COL_LENGTH('dbo.alerts_v2', 'TargetDisplay') IS NULL ALTER TABLE dbo.alerts_v2 ADD TargetDisplay nvarchar(200) NOT NULL CONSTRAINT DF_alerts_v2_TargetDisplay_Alter DEFAULT('');",
            "IF COL_LENGTH('dbo.alerts_v2', 'RuleName') IS NULL ALTER TABLE dbo.alerts_v2 ADD RuleName nvarchar(255) NOT NULL CONSTRAINT DF_alerts_v2_RuleName_Alter DEFAULT('');",
            """
            IF OBJECT_ID('dbo.alert_iocs', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.alert_iocs
                (
                    Id uniqueidentifier NOT NULL CONSTRAINT PK_alert_iocs PRIMARY KEY,
                    AlertId uniqueidentifier NOT NULL,
                    IocId uniqueidentifier NOT NULL,
                    LinkedAtUtc datetimeoffset NOT NULL,
                    Status nvarchar(64) NOT NULL CONSTRAINT DF_alert_iocs_Status DEFAULT('Open'),
                    StatusUpdatedAtUtc datetimeoffset NOT NULL CONSTRAINT DF_alert_iocs_StatusUpdatedAtUtc DEFAULT(SYSUTCDATETIME()),
                    StatusUpdatedByUserId nvarchar(128) NOT NULL CONSTRAINT DF_alert_iocs_StatusUpdatedByUserId DEFAULT('system')
                );
            END;
            """,
            "IF COL_LENGTH('dbo.alert_iocs', 'Status') IS NULL ALTER TABLE dbo.alert_iocs ADD Status nvarchar(64) NOT NULL CONSTRAINT DF_alert_iocs_Status_Alter DEFAULT('Open');",
            "IF COL_LENGTH('dbo.alert_iocs', 'StatusUpdatedAtUtc') IS NULL ALTER TABLE dbo.alert_iocs ADD StatusUpdatedAtUtc datetimeoffset NULL;",
            "IF COL_LENGTH('dbo.alert_iocs', 'StatusUpdatedByUserId') IS NULL ALTER TABLE dbo.alert_iocs ADD StatusUpdatedByUserId nvarchar(128) NOT NULL CONSTRAINT DF_alert_iocs_StatusUpdatedByUserId_Alter DEFAULT('system');",
            "UPDATE dbo.alert_iocs SET StatusUpdatedAtUtc = LinkedAtUtc WHERE StatusUpdatedAtUtc IS NULL;",
            """
            IF EXISTS (
                SELECT 1
                FROM sys.columns
                WHERE object_id = OBJECT_ID('dbo.alert_iocs')
                    AND name = 'StatusUpdatedAtUtc'
                    AND is_nullable = 1
            )
            BEGIN
                ALTER TABLE dbo.alert_iocs ALTER COLUMN StatusUpdatedAtUtc datetimeoffset NOT NULL;
            END;
            """,
            """
            IF OBJECT_ID('dbo.FK_alert_iocs_alerts_v2_AlertId', 'F') IS NULL
            BEGIN
                ALTER TABLE dbo.alert_iocs
                    ADD CONSTRAINT FK_alert_iocs_alerts_v2_AlertId
                    FOREIGN KEY (AlertId) REFERENCES dbo.alerts_v2 (Id) ON DELETE CASCADE;
            END;
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alerts_v2_Status_Severity' AND object_id = OBJECT_ID('dbo.alerts_v2'))
                CREATE INDEX IX_alerts_v2_Status_Severity ON dbo.alerts_v2 (Status, Severity);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alerts_v2_TargetId_ScannerFamily_RuleName_Status' AND object_id = OBJECT_ID('dbo.alerts_v2'))
                CREATE INDEX IX_alerts_v2_TargetId_ScannerFamily_RuleName_Status ON dbo.alerts_v2 (TargetId, ScannerFamily, RuleName, Status);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alerts_v2_ScannerFamily_LastDetectedAtUtc' AND object_id = OBJECT_ID('dbo.alerts_v2'))
                CREATE INDEX IX_alerts_v2_ScannerFamily_LastDetectedAtUtc ON dbo.alerts_v2 (ScannerFamily, LastDetectedAtUtc);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alert_iocs_AlertId_IocId' AND object_id = OBJECT_ID('dbo.alert_iocs'))
                CREATE UNIQUE INDEX IX_alert_iocs_AlertId_IocId ON dbo.alert_iocs (AlertId, IocId);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alert_iocs_IocId' AND object_id = OBJECT_ID('dbo.alert_iocs'))
                CREATE INDEX IX_alert_iocs_IocId ON dbo.alert_iocs (IocId);
            """,
        };

        foreach (var command in commands)
        {
            await _dbContext.Database.ExecuteSqlRawAsync(command, cancellationToken);
        }
    }
}
