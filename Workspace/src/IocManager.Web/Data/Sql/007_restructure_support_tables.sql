SET XACT_ABORT ON;

BEGIN TRAN;

IF COL_LENGTH('dbo.Target', 'LastSweep') IS NULL
BEGIN
    ALTER TABLE dbo.Target
    ADD LastSweep datetime2 NULL;
END;

IF OBJECT_ID(N'dbo.SWEEPER', N'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.SWEEPER;
END;

IF COL_LENGTH('dbo.IOC', 'ResultID') IS NULL
BEGIN
    ALTER TABLE dbo.IOC
    ADD ResultID int NULL;
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK__Alert__FileID__18EBB532'
)
BEGIN
    ALTER TABLE dbo.Alert
    DROP CONSTRAINT FK__Alert__FileID__18EBB532;
END;

IF COL_LENGTH('dbo.Alert', 'FileID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Alert
    DROP COLUMN FileID;
END;

IF COL_LENGTH('dbo.Alert', 'IocId') IS NULL
BEGIN
    ALTER TABLE dbo.Alert
    ADD IocId uniqueidentifier NULL;
END;

IF COL_LENGTH('dbo.Alert', 'Subject') IS NULL
BEGIN
    ALTER TABLE dbo.Alert
    ADD Subject nvarchar(255) NULL;
END;

IF COL_LENGTH('dbo.Alert', 'Severity') IS NULL
BEGIN
    ALTER TABLE dbo.Alert
    ADD Severity nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Alert_Ioc'
)
BEGIN
    ALTER TABLE dbo.Alert
    ADD CONSTRAINT FK_Alert_Ioc
        FOREIGN KEY (IocId) REFERENCES dbo.IOC(Id);
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK__IOCFile__ResultI__07C12930'
)
BEGIN
    ALTER TABLE dbo.IOCFile
    DROP CONSTRAINT FK__IOCFile__ResultI__07C12930;
END;

IF COL_LENGTH('dbo.IOCFile', 'ResultID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.IOCFile
    DROP COLUMN ResultID;
END;

IF COL_LENGTH('dbo.Report', 'ReportType') IS NULL
BEGIN
    ALTER TABLE dbo.Report
    ADD ReportType nvarchar(50) NULL;
END;

IF COL_LENGTH('dbo.Report', 'GeneratedByUserID') IS NULL
BEGIN
    ALTER TABLE dbo.Report
    ADD GeneratedByUserID int NULL;
END;

IF COL_LENGTH('dbo.Report', 'ParametersJson') IS NULL
BEGIN
    ALTER TABLE dbo.Report
    ADD ParametersJson nvarchar(max) NULL;
END;

IF COL_LENGTH('dbo.Report', 'IocId') IS NULL
BEGIN
    ALTER TABLE dbo.Report
    ADD IocId uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Report_User'
)
BEGIN
    ALTER TABLE dbo.Report
    ADD CONSTRAINT FK_Report_User
        FOREIGN KEY (GeneratedByUserID) REFERENCES dbo.[User](UserID);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Report_Ioc'
)
BEGIN
    ALTER TABLE dbo.Report
    ADD CONSTRAINT FK_Report_Ioc
        FOREIGN KEY (IocId) REFERENCES dbo.IOC(Id);
END;

IF COL_LENGTH('dbo.ScanPlan', 'ScannerConfigJson') IS NULL
    AND COL_LENGTH('dbo.ScanPlan', 'ToolsUsed') IS NOT NULL
BEGIN
    EXEC sp_rename 'dbo.ScanPlan.ToolsUsed', 'ScannerConfigJson', 'COLUMN';
END;

IF COL_LENGTH('dbo.ScanPlan', 'ScannerConfigJson') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ScanPlan
    ALTER COLUMN ScannerConfigJson nvarchar(max) NULL;
END;

IF COL_LENGTH('dbo.ScanPlan', 'TargetScopeJson') IS NULL
BEGIN
    ALTER TABLE dbo.ScanPlan
    ADD TargetScopeJson nvarchar(max) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK__ScanJob__Scanner__00200768'
)
BEGIN
    ALTER TABLE dbo.ScanJob
    DROP CONSTRAINT FK__ScanJob__Scanner__00200768;
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK__ScanJob__TargetI__7F2BE32F'
)
BEGIN
    ALTER TABLE dbo.ScanJob
    DROP CONSTRAINT FK__ScanJob__TargetI__7F2BE32F;
END;

IF COL_LENGTH('dbo.ScanJob', 'ScannerID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ScanJob
    DROP COLUMN ScannerID;
END;

IF COL_LENGTH('dbo.ScanJob', 'TargetID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ScanJob
    DROP COLUMN TargetID;
END;

IF COL_LENGTH('dbo.ScanJob', 'PlanID') IS NULL
BEGIN
    ALTER TABLE dbo.ScanJob
    ADD PlanID int NULL;
END;

IF COL_LENGTH('dbo.ScanJob', 'ExecutionScopeJson') IS NULL
BEGIN
    ALTER TABLE dbo.ScanJob
    ADD ExecutionScopeJson nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_ScanJob_ScanPlan'
)
BEGIN
    ALTER TABLE dbo.ScanJob
    ADD CONSTRAINT FK_ScanJob_ScanPlan
        FOREIGN KEY (PlanID) REFERENCES dbo.ScanPlan(PlanID);
END;

IF COL_LENGTH('dbo.ScanResult', 'TargetID') IS NULL
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD TargetID int NULL;
END;

IF COL_LENGTH('dbo.ScanResult', 'ScannerType') IS NULL
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD ScannerType nvarchar(50) NULL;
END;

IF COL_LENGTH('dbo.ScanResult', 'Status') IS NULL
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD Status nvarchar(20) NULL;
END;

IF COL_LENGTH('dbo.ScanResult', 'StartedAt') IS NULL
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD StartedAt datetime2 NULL;
END;

IF COL_LENGTH('dbo.ScanResult', 'FinishedAt') IS NULL
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD FinishedAt datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_ScanResult_Target'
)
BEGIN
    ALTER TABLE dbo.ScanResult
    ADD CONSTRAINT FK_ScanResult_Target
        FOREIGN KEY (TargetID) REFERENCES dbo.Target(TargetID);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_IOC_ScanResult'
)
BEGIN
    ALTER TABLE dbo.IOC
    ADD CONSTRAINT FK_IOC_ScanResult
        FOREIGN KEY (ResultID) REFERENCES dbo.ScanResult(ResultID);
END;

IF OBJECT_ID(N'dbo.Scanner', N'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.Scanner;
END;

COMMIT;
