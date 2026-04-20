IF OBJECT_ID(N'dbo.Snort_Suricata_Details', N'U') IS NULL
   AND OBJECT_ID(N'dbo.Network_Details', N'U') IS NOT NULL
BEGIN
    EXEC sp_rename 'dbo.Network_Details', 'Snort_Suricata_Details';
END
