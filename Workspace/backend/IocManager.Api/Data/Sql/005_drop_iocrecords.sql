SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.IocRecords', N'U') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_IocRecords_ScanRuns'
    )
    BEGIN
        ALTER TABLE dbo.IocRecords
        DROP CONSTRAINT FK_IocRecords_ScanRuns;
    END;

    DROP TABLE dbo.IocRecords;
END;
