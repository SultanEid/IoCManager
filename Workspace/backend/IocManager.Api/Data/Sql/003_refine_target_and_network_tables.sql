IF COL_LENGTH('dbo.Target', 'Name') IS NOT NULL
   AND COL_LENGTH('dbo.Target', 'HostName') IS NULL
BEGIN
    EXEC sp_rename 'dbo.Target.Name', 'HostName', 'COLUMN';
END;
GO

DECLARE @dropSweepFk nvarchar(max) = N'';

SELECT @dropSweepFk = STRING_AGG(
    N'ALTER TABLE dbo.NETWORK DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';',
    CHAR(10))
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
WHERE fk.parent_object_id = OBJECT_ID(N'dbo.NETWORK')
  AND pc.name = N'SweepID';

IF @dropSweepFk IS NOT NULL AND LEN(@dropSweepFk) > 0
BEGIN
    EXEC sp_executesql @dropSweepFk;
END;
GO

IF COL_LENGTH('dbo.NETWORK', 'SweepID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.NETWORK DROP COLUMN SweepID;
END;
GO
