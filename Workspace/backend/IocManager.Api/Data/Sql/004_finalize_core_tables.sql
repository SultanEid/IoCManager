SET XACT_ABORT ON;
GO

BEGIN TRAN;
GO

ALTER TABLE dbo.IOC
ALTER COLUMN TimestampUtc datetime2 NOT NULL;
GO

ALTER TABLE dbo.IOC
ALTER COLUMN ScannerType varchar(50) NOT NULL;
GO

ALTER TABLE dbo.IOC
ALTER COLUMN TargetServer varchar(100) NOT NULL;
GO

ALTER TABLE dbo.IOC
ALTER COLUMN RuleName varchar(255) NOT NULL;
GO

ALTER TABLE dbo.Yara_Details
ALTER COLUMN FilePath varchar(255) NOT NULL;
GO

ALTER TABLE dbo.NETWORK
ALTER COLUMN Name nvarchar(50) NOT NULL;
GO

ALTER TABLE dbo.NETWORK
ALTER COLUMN SubNet nvarchar(50) NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Target')
      AND name = N'UX_Target_IPAddress'
)
BEGIN
    CREATE UNIQUE INDEX UX_Target_IPAddress
        ON dbo.Target(IPAddress);
END;
GO

COMMIT;
GO
