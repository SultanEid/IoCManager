IF OBJECT_ID(N'dbo.Network_Details', N'U') IS NULL
   AND OBJECT_ID(N'dbo.Snort_Details', N'U') IS NOT NULL
BEGIN
    EXEC sp_rename 'dbo.Snort_Details', 'Network_Details';
END
