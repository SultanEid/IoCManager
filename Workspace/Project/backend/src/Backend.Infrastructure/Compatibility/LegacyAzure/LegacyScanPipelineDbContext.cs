using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Compatibility.LegacyAzure;

public sealed class LegacyScanPipelineDbContext(DbContextOptions<LegacyScanPipelineDbContext> options) : DbContext(options)
{
    public DbSet<LegacyPipelineNetworkEntity> Networks => Set<LegacyPipelineNetworkEntity>();
    public DbSet<LegacyPipelineTargetEntity> Targets => Set<LegacyPipelineTargetEntity>();
    public DbSet<LegacyPipelineScanPlanEntity> ScanPlans => Set<LegacyPipelineScanPlanEntity>();
    public DbSet<LegacyPipelineScanJobEntity> ScanJobs => Set<LegacyPipelineScanJobEntity>();
    public DbSet<LegacyPipelineScanResultEntity> ScanResults => Set<LegacyPipelineScanResultEntity>();
    public DbSet<LegacyPipelineIocEntity> Iocs => Set<LegacyPipelineIocEntity>();
    public DbSet<LegacyPipelineYaraDetailEntity> YaraDetails => Set<LegacyPipelineYaraDetailEntity>();
    public DbSet<LegacyPipelineSigmaDetailEntity> SigmaDetails => Set<LegacyPipelineSigmaDetailEntity>();
    public DbSet<LegacyPipelineNetworkDetailEntity> NetworkDetails => Set<LegacyPipelineNetworkDetailEntity>();
    public DbSet<LegacyPipelineReportEntity> Reports => Set<LegacyPipelineReportEntity>();
    public DbSet<LegacyPipelineUserEntity> Users => Set<LegacyPipelineUserEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LegacyPipelineNetworkEntity>(entity =>
        {
            entity.ToTable("NETWORK", "dbo");
            entity.HasKey(x => x.NetworkId);
            entity.Property(x => x.NetworkId).HasColumnName("NetworkID").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasMaxLength(50).IsRequired();
            entity.Property(x => x.SubNet).HasMaxLength(50).IsRequired();
            entity.Property(x => x.SshUser).HasMaxLength(100);
            entity.Property(x => x.SshKeyPath).HasMaxLength(512);
            entity.Property(x => x.SshPasswordProtected).HasMaxLength(4000);
            entity.Property(x => x.Notes).HasMaxLength(1024);
        });

        modelBuilder.Entity<LegacyPipelineTargetEntity>(entity =>
        {
            entity.ToTable("Target", "dbo");
            entity.HasKey(x => x.TargetId);
            entity.Property(x => x.TargetId).HasColumnName("TargetID").ValueGeneratedOnAdd();
            entity.Property(x => x.DisplayName).HasMaxLength(150);
            entity.Property(x => x.HostName).HasMaxLength(100);
            entity.Property(x => x.IPAddress).HasMaxLength(45).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.TargetOsType).HasMaxLength(20);
            entity.Property(x => x.NetworkId).HasColumnName("NetworkID");
            entity.Property(x => x.LastSweep).HasColumnType("datetime2");
            entity.HasIndex(x => x.IPAddress).IsUnique();
            entity.HasOne(x => x.Network)
                .WithMany(x => x.Targets)
                .HasForeignKey(x => x.NetworkId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LegacyPipelineScanPlanEntity>(entity =>
        {
            entity.ToTable("ScanPlan", "dbo");
            entity.HasKey(x => x.PlanId);
            entity.Property(x => x.PlanId).HasColumnName("PlanID").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.ScannerConfigJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.CreatedAt).HasColumnType("datetime2");
            entity.Property(x => x.CreatedByUserId).HasColumnName("CreatedByUserID");
            entity.Property(x => x.TargetScopeJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.ScheduleType).HasMaxLength(20);
            entity.Property(x => x.ScheduleJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.NextRunAt).HasColumnType("datetime2");
            entity.Property(x => x.LastRunAt).HasColumnType("datetime2");
            entity.Property(x => x.UpdatedAt).HasColumnType("datetime2");
        });

        modelBuilder.Entity<LegacyPipelineScanJobEntity>(entity =>
        {
            entity.ToTable("ScanJob", "dbo");
            entity.HasKey(x => x.JobId);
            entity.Property(x => x.JobId).HasColumnName("JobID").ValueGeneratedOnAdd();
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.StartedAt).HasColumnType("datetime2");
            entity.Property(x => x.FinishedAt).HasColumnType("datetime2");
            entity.Property(x => x.TriggeredByUserId).HasColumnName("TriggeredByUserID");
            entity.Property(x => x.PlanId).HasColumnName("PlanID");
            entity.Property(x => x.ExecutionScopeJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.QueuedAt).HasColumnType("datetime2");
            entity.Property(x => x.TriggerType).HasMaxLength(20);
            entity.Property(x => x.BatchId);
            entity.Property(x => x.Summary).HasMaxLength(255);
            entity.HasMany(x => x.Results)
                .WithOne()
                .HasForeignKey(x => x.JobId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LegacyPipelineScanResultEntity>(entity =>
        {
            entity.ToTable("ScanResult", "dbo");
            entity.HasKey(x => x.ResultId);
            entity.Property(x => x.ResultId).HasColumnName("ResultID").ValueGeneratedOnAdd();
            entity.Property(x => x.NoOfFindings);
            entity.Property(x => x.JobId).HasColumnName("JobID");
            entity.Property(x => x.TargetId).HasColumnName("TargetID");
            entity.Property(x => x.ScannerType).HasMaxLength(50);
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.StartedAt).HasColumnType("datetime2");
            entity.Property(x => x.FinishedAt).HasColumnType("datetime2");
            entity.HasOne<LegacyPipelineScanJobEntity>()
                .WithMany(x => x.Results)
                .HasForeignKey(x => x.JobId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LegacyPipelineIocEntity>(entity =>
        {
            entity.ToTable("IOC", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.TimestampUtc).HasColumnType("datetime2").IsRequired();
            entity.Property(x => x.ScannerType).HasMaxLength(50).IsUnicode(false).IsRequired();
            entity.Property(x => x.TargetServer).HasMaxLength(100).IsUnicode(false).IsRequired();
            entity.Property(x => x.TargetOsType).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.RuleName).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.RawPayload).HasColumnName("RawPayload");
            entity.Property(x => x.FileId).HasColumnName("FileID");
            entity.Property(x => x.ResultId).HasColumnName("ResultID");
            entity.HasOne(x => x.ScanResult)
                .WithMany(x => x.Iocs)
                .HasForeignKey(x => x.ResultId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LegacyPipelineYaraDetailEntity>(entity =>
        {
            entity.ToTable("Yara_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.FilePath).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.FileHash).HasMaxLength(128).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.YaraDetail)
                .HasForeignKey<LegacyPipelineYaraDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacyPipelineSigmaDetailEntity>(entity =>
        {
            entity.ToTable("Sigma_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.LogSource).HasMaxLength(255).IsUnicode(false);
            entity.Property(x => x.Severity).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.CommandLine).HasColumnName("CommandLine").HasColumnType("nvarchar(max)");
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.SigmaDetail)
                .HasForeignKey<LegacyPipelineSigmaDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacyPipelineNetworkDetailEntity>(entity =>
        {
            entity.ToTable("Snort_Suricata_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.SourceIP).HasMaxLength(45).IsUnicode(false);
            entity.Property(x => x.DestIP).HasMaxLength(45).IsUnicode(false);
            entity.Property(x => x.Protocol).HasMaxLength(10).IsUnicode(false);
            entity.Property(x => x.Severity).HasMaxLength(20).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.NetworkDetail)
                .HasForeignKey<LegacyPipelineNetworkDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacyPipelineReportEntity>(entity =>
        {
            entity.ToTable("Report", "dbo");
            entity.HasKey(x => x.ReportId);
            entity.Property(x => x.ReportId).HasColumnName("ReportID").ValueGeneratedOnAdd();
            entity.Property(x => x.Title).HasMaxLength(100);
            entity.Property(x => x.CreatedAt).HasColumnType("datetime2");
            entity.Property(x => x.ResultId).HasColumnName("ResultID");
            entity.Property(x => x.ReportType).HasMaxLength(50);
            entity.Property(x => x.GeneratedByUserId).HasColumnName("GeneratedByUserID");
            entity.Property(x => x.ParametersJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.IocId).HasColumnName("IocId");
            entity.Property(x => x.JobId).HasColumnName("JobID");
            entity.Property(x => x.TargetId).HasColumnName("TargetID");
            entity.Property(x => x.NetworkId).HasColumnName("NetworkID");
            entity.Property(x => x.FileExtension).HasMaxLength(10);
            entity.Property(x => x.FilePath).HasMaxLength(512);
            entity.Property(x => x.ContentJson).HasColumnType("nvarchar(max)");
        });

        modelBuilder.Entity<LegacyPipelineUserEntity>(entity =>
        {
            entity.ToTable("User", "dbo");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.UserId).HasColumnName("UserID").ValueGeneratedOnAdd();
            entity.Property(x => x.UserName).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(20);
            entity.Property(x => x.Email).HasMaxLength(100);
            entity.Property(x => x.PasswordHash).HasColumnType("nvarchar(max)");
        });
    }
}

public sealed class LegacyPipelineNetworkEntity
{
    public int NetworkId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SubNet { get; set; } = string.Empty;
    public string? SshUser { get; set; }
    public string? SshKeyPath { get; set; }
    public string? SshPasswordProtected { get; set; }
    public string? Notes { get; set; }
    public List<LegacyPipelineTargetEntity> Targets { get; set; } = [];
}

public sealed class LegacyPipelineTargetEntity
{
    public int TargetId { get; set; }
    public string? DisplayName { get; set; }
    public string? HostName { get; set; }
    public string IPAddress { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? TargetOsType { get; set; }
    public int? NetworkId { get; set; }
    public DateTime? LastSweep { get; set; }
    public LegacyPipelineNetworkEntity? Network { get; set; }
}

public sealed class LegacyPipelineScanPlanEntity
{
    public int PlanId { get; set; }
    public string? Name { get; set; }
    public string? ScannerConfigJson { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? TargetScopeJson { get; set; }
    public string? Status { get; set; }
    public string? ScheduleType { get; set; }
    public string? ScheduleJson { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class LegacyPipelineScanJobEntity
{
    public int JobId { get; set; }
    public string? Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int? TriggeredByUserId { get; set; }
    public int? PlanId { get; set; }
    public string? ExecutionScopeJson { get; set; }
    public DateTime? QueuedAt { get; set; }
    public string? TriggerType { get; set; }
    public Guid? BatchId { get; set; }
    public string? Summary { get; set; }
    public List<LegacyPipelineScanResultEntity> Results { get; set; } = [];
}

public sealed class LegacyPipelineScanResultEntity
{
    public int ResultId { get; set; }
    public int? NoOfFindings { get; set; }
    public int? JobId { get; set; }
    public int? TargetId { get; set; }
    public string? ScannerType { get; set; }
    public string? Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public List<LegacyPipelineIocEntity> Iocs { get; set; } = [];
}

public sealed class LegacyPipelineIocEntity
{
    public Guid Id { get; set; }
    public DateTime TimestampUtc { get; set; }
    public string ScannerType { get; set; } = string.Empty;
    public string TargetServer { get; set; } = string.Empty;
    public string? TargetOsType { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string? RawPayload { get; set; }
    public int? FileId { get; set; }
    public int? ResultId { get; set; }
    public LegacyPipelineScanResultEntity? ScanResult { get; set; }
    public LegacyPipelineYaraDetailEntity? YaraDetail { get; set; }
    public LegacyPipelineSigmaDetailEntity? SigmaDetail { get; set; }
    public LegacyPipelineNetworkDetailEntity? NetworkDetail { get; set; }
}

public sealed class LegacyPipelineYaraDetailEntity
{
    public Guid Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? FileHash { get; set; }
    public LegacyPipelineIocEntity Ioc { get; set; } = null!;
}

public sealed class LegacyPipelineSigmaDetailEntity
{
    public Guid Id { get; set; }
    public string? LogSource { get; set; }
    public string? Severity { get; set; }
    public string? CommandLine { get; set; }
    public LegacyPipelineIocEntity Ioc { get; set; } = null!;
}

public sealed class LegacyPipelineNetworkDetailEntity
{
    public Guid Id { get; set; }
    public string? SourceIP { get; set; }
    public string? DestIP { get; set; }
    public string? Protocol { get; set; }
    public string? Severity { get; set; }
    public long? FlowId { get; set; }
    public LegacyPipelineIocEntity Ioc { get; set; } = null!;
}

public sealed class LegacyPipelineReportEntity
{
    public int ReportId { get; set; }
    public string? Title { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? ResultId { get; set; }
    public string? ReportType { get; set; }
    public int? GeneratedByUserId { get; set; }
    public string? ParametersJson { get; set; }
    public Guid? IocId { get; set; }
    public int? JobId { get; set; }
    public int? TargetId { get; set; }
    public int? NetworkId { get; set; }
    public string? FileExtension { get; set; }
    public string? FilePath { get; set; }
    public string? ContentJson { get; set; }
}

public sealed class LegacyPipelineUserEntity
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
}
