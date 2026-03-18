using Microsoft.EntityFrameworkCore;

namespace IocVmwareIngestion.Api.Data;

public sealed class IocDbContext(DbContextOptions<IocDbContext> options) : DbContext(options)
{
    public DbSet<IocEntity> Iocs => Set<IocEntity>();
    public DbSet<ScanResultEntity> ScanResults => Set<ScanResultEntity>();
    public DbSet<YaraDetailEntity> YaraDetails => Set<YaraDetailEntity>();
    public DbSet<SigmaDetailEntity> SigmaDetails => Set<SigmaDetailEntity>();
    public DbSet<NetworkDetailEntity> NetworkDetails => Set<NetworkDetailEntity>();
    public DbSet<TargetEntity> Targets => Set<TargetEntity>();
    public DbSet<NetworkEntity> Networks => Set<NetworkEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IocEntity>(entity =>
        {
            entity.ToTable("IOC", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.TimestampUtc).HasColumnType("datetime2").IsRequired();
            entity.Property(x => x.ScannerType).HasMaxLength(50).IsUnicode(false).IsRequired();
            entity.Property(x => x.TargetServer).HasMaxLength(100).IsUnicode(false).IsRequired();
            entity.Property(x => x.TargetOsType).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.RuleName).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.FileId).HasColumnName("FileID");
            entity.Property(x => x.ResultId).HasColumnName("ResultID");
            entity.Property(x => x.RawPayload).HasColumnName("RawPayload");
            entity.HasOne(x => x.ScanResult)
                .WithMany(x => x.Iocs)
                .HasForeignKey(x => x.ResultId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ScanResultEntity>(entity =>
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
        });

        modelBuilder.Entity<YaraDetailEntity>(entity =>
        {
            entity.ToTable("Yara_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.FilePath).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.FileHash).HasMaxLength(128).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.YaraDetail)
                .HasForeignKey<YaraDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SigmaDetailEntity>(entity =>
        {
            entity.ToTable("Sigma_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.LogSource).HasMaxLength(255).IsUnicode(false);
            entity.Property(x => x.Severity).HasMaxLength(20).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.SigmaDetail)
                .HasForeignKey<SigmaDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NetworkDetailEntity>(entity =>
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
                .HasForeignKey<NetworkDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TargetEntity>(entity =>
        {
            entity.ToTable("Target", "dbo");
            entity.HasKey(x => x.TargetId);
            entity.Property(x => x.TargetId).HasColumnName("TargetID").ValueGeneratedOnAdd();
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

        modelBuilder.Entity<NetworkEntity>(entity =>
        {
            entity.ToTable("NETWORK", "dbo");
            entity.HasKey(x => x.NetworkId);
            entity.Property(x => x.NetworkId).HasColumnName("NetworkID").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasMaxLength(50).IsRequired();
            entity.Property(x => x.SubNet).HasMaxLength(50).IsRequired();
        });
    }
}

public sealed class IocEntity
{
    public Guid Id { get; set; }
    public DateTime TimestampUtc { get; set; }
    public string ScannerType { get; set; } = string.Empty;
    public string TargetServer { get; set; } = string.Empty;
    public string TargetOsType { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string RawPayload { get; set; } = string.Empty;
    public int? FileId { get; set; }
    public int? ResultId { get; set; }
    public ScanResultEntity? ScanResult { get; set; }
    public YaraDetailEntity? YaraDetail { get; set; }
    public SigmaDetailEntity? SigmaDetail { get; set; }
    public NetworkDetailEntity? NetworkDetail { get; set; }
}

public sealed class ScanResultEntity
{
    public int ResultId { get; set; }
    public int? NoOfFindings { get; set; }
    public int? JobId { get; set; }
    public int? TargetId { get; set; }
    public string? ScannerType { get; set; }
    public string? Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public List<IocEntity> Iocs { get; set; } = [];
}

public sealed class YaraDetailEntity
{
    public Guid Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? FileHash { get; set; }
    public IocEntity Ioc { get; set; } = null!;
}

public sealed class SigmaDetailEntity
{
    public Guid Id { get; set; }
    public string? LogSource { get; set; }
    public string? Severity { get; set; }
    public string? CommandLine { get; set; }
    public IocEntity Ioc { get; set; } = null!;
}

public sealed class NetworkDetailEntity
{
    public Guid Id { get; set; }
    public string? SourceIP { get; set; }
    public string? DestIP { get; set; }
    public string? Protocol { get; set; }
    public string? Severity { get; set; }
    public long? FlowId { get; set; }
    public IocEntity Ioc { get; set; } = null!;
}

public sealed class TargetEntity
{
    public int TargetId { get; set; }
    public string? HostName { get; set; }
    public string IPAddress { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? TargetOsType { get; set; }
    public int? NetworkId { get; set; }
    public DateTime? LastSweep { get; set; }
    public NetworkEntity? Network { get; set; }
}

public sealed class NetworkEntity
{
    public int NetworkId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SubNet { get; set; } = string.Empty;
    public List<TargetEntity> Targets { get; set; } = [];
}
