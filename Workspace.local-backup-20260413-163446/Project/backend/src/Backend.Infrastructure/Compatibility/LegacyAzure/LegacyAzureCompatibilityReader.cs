using System.Security.Cryptography;
using System.Text;
using Backend.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Compatibility.LegacyAzure;

public interface ILegacyAzureCompatibilityReader
{
    bool IsEnabled { get; }

    Task<IReadOnlyList<LegacyNetworkProjection>> ListNetworksAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<LegacyTargetServerProjection>> ListTargetServersAsync(Guid? subnetId, CancellationToken cancellationToken);

    Task<LegacyIocListProjection> ListIocsAsync(LegacyIocQuery query, CancellationToken cancellationToken);
}

public sealed record LegacyNetworkProjection(
    Guid Id,
    string Name,
    string CidrBlock,
    string Description,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record LegacyTargetServerProjection(
    Guid Id,
    Guid SubnetId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record LegacyIocProjection(
    Guid Id,
    Guid FeedSourceId,
    Guid? IocFileId,
    string Type,
    string Value,
    string Severity,
    decimal Confidence,
    DateTimeOffset FirstSeenAtUtc,
    DateTimeOffset LastSeenAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string FeedSourceName,
    string FeedSourceType,
    string? FileName);

public sealed record LegacyIocListProjection(
    IReadOnlyList<LegacyIocProjection> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record LegacyIocQuery(
    string? Q,
    string? Severity,
    string? Type,
    string? Source,
    Guid? FeedSourceId,
    DateTimeOffset? FromUtc,
    DateTimeOffset? ToUtc,
    int Page,
    int PageSize);

public sealed class LegacyAzureCompatibilityReader : ILegacyAzureCompatibilityReader
{
    private const string LegacyDescription = "Legacy Azure compatibility";
    private const string LegacyEnvironment = "Legacy";
    private static readonly DateTimeOffset DefaultTimestampUtc = DateTimeOffset.UnixEpoch;

    private readonly LegacyAzureCompatibilityOptions _options;
    private readonly string? _connectionString;

    public LegacyAzureCompatibilityReader(IConfiguration configuration, IOptions<LegacyAzureCompatibilityOptions> options)
    {
        _options = options.Value;
        if (_options.Enabled)
        {
            _connectionString = DatabaseConnectionStringResolver.Resolve(configuration, _options.ConnectionStringName);
        }
    }

    public bool IsEnabled => _options.Enabled && !string.IsNullOrWhiteSpace(_connectionString);

    public async Task<IReadOnlyList<LegacyNetworkProjection>> ListNetworksAsync(CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return [];
        }

        await using var dbContext = CreateDbContext();
        var networks = await dbContext.Networks
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);

        return networks
            .Select(network => new LegacyNetworkProjection(
                Id: CreateLegacyNetworkId(network.NetworkId),
                Name: string.IsNullOrWhiteSpace(network.Name) ? $"Legacy Network {network.NetworkId}" : network.Name.Trim(),
                CidrBlock: string.IsNullOrWhiteSpace(network.SubNet) ? "0.0.0.0/0" : network.SubNet.Trim(),
                Description: LegacyDescription,
                CreatedAtUtc: DefaultTimestampUtc,
                UpdatedAtUtc: DefaultTimestampUtc))
            .ToArray();
    }

    public async Task<IReadOnlyList<LegacyTargetServerProjection>> ListTargetServersAsync(Guid? subnetId, CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return [];
        }

        await using var dbContext = CreateDbContext();
        var targets = await dbContext.Targets
            .AsNoTracking()
            .Include(x => x.Network)
            .OrderBy(x => x.HostName)
            .ThenBy(x => x.IPAddress)
            .ToArrayAsync(cancellationToken);

        var items = targets
            .Select(target =>
            {
                var mappedSubnetId = CreateLegacySubnetId(target.NetworkId);
                return new LegacyTargetServerProjection(
                    Id: CreateDeterministicGuid($"legacy-target:{target.TargetId}"),
                    SubnetId: mappedSubnetId,
                    Hostname: string.IsNullOrWhiteSpace(target.HostName) ? target.IPAddress : target.HostName.Trim(),
                    IpAddress: target.IPAddress.Trim(),
                    OperatingSystem: string.IsNullOrWhiteSpace(target.TargetOsType) ? "Unknown" : target.TargetOsType.Trim(),
                    Environment: LegacyEnvironment,
                    Status: MapLegacyTargetStatus(target.Status),
                    CreatedAtUtc: ToDateTimeOffsetOrDefault(target.LastSweep),
                    UpdatedAtUtc: ToDateTimeOffsetOrDefault(target.LastSweep));
            });

        if (subnetId.HasValue)
        {
            items = items.Where(x => x.SubnetId == subnetId.Value);
        }

        return items.ToArray();
    }

    public async Task<LegacyIocListProjection> ListIocsAsync(LegacyIocQuery query, CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return new LegacyIocListProjection([], 0, query.Page, query.PageSize);
        }

        await using var dbContext = CreateDbContext();
        var legacyIocs = await dbContext.Iocs
            .AsNoTracking()
            .Include(x => x.ScanResult)
            .Include(x => x.YaraDetail)
            .Include(x => x.SigmaDetail)
            .Include(x => x.NetworkDetail)
            .ToArrayAsync(cancellationToken);

        IEnumerable<LegacyIocProjection> items = legacyIocs.Select(MapLegacyIoc);

        if (query.FeedSourceId.HasValue)
        {
            items = items.Where(x => x.FeedSourceId == query.FeedSourceId.Value);
        }

        if (query.FromUtc.HasValue)
        {
            items = items.Where(x => x.LastSeenAtUtc >= query.FromUtc.Value);
        }

        if (query.ToUtc.HasValue)
        {
            items = items.Where(x => x.LastSeenAtUtc <= query.ToUtc.Value);
        }

        var normalizedSeverity = NormalizeNullable(query.Severity);
        if (normalizedSeverity is not null)
        {
            items = items.Where(x => string.Equals(x.Severity, normalizedSeverity, StringComparison.OrdinalIgnoreCase));
        }

        var normalizedType = NormalizeNullable(query.Type);
        if (normalizedType is not null)
        {
            items = items.Where(x => string.Equals(x.Type, normalizedType, StringComparison.OrdinalIgnoreCase));
        }

        var normalizedSource = NormalizeNullable(query.Source);
        if (normalizedSource is not null)
        {
            items = items.Where(x =>
                ContainsIgnoreCase(x.FeedSourceName, normalizedSource)
                || ContainsIgnoreCase(x.FeedSourceType, normalizedSource));
        }

        var normalizedQuery = NormalizeNullable(query.Q);
        if (normalizedQuery is not null)
        {
            items = items.Where(x =>
                ContainsIgnoreCase(x.Value, normalizedQuery)
                || ContainsIgnoreCase(x.Type, normalizedQuery)
                || ContainsIgnoreCase(x.FeedSourceName, normalizedQuery)
                || ContainsIgnoreCase(x.FileName, normalizedQuery));
        }

        var ordered = items
            .OrderByDescending(x => x.LastSeenAtUtc)
            .ThenBy(x => x.Value, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var totalCount = ordered.Length;
        var paged = ordered
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToArray();

        return new LegacyIocListProjection(paged, totalCount, query.Page, query.PageSize);
    }

    private static bool ContainsIgnoreCase(string? value, string term)
        => !string.IsNullOrWhiteSpace(value)
            && value.Contains(term, StringComparison.OrdinalIgnoreCase);

    private static string? NormalizeNullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTimeOffset ToDateTimeOffsetOrDefault(DateTime? value)
        => value.HasValue
            ? new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc))
            : DefaultTimestampUtc;

    private static string MapLegacyTargetStatus(string? rawStatus)
    {
        var normalized = NormalizeNullable(rawStatus)?.ToLowerInvariant();
        return normalized switch
        {
            "active" or "online" or "reachable" or "up" => "Active",
            "retired" or "inactive" => "Retired",
            "unreachable" or "offline" or "down" => "Unreachable",
            _ => "Discovered",
        };
    }

    private static string NormalizeScannerType(string? scannerType)
        => NormalizeNullable(scannerType)?.ToLowerInvariant() switch
        {
            "yara" => "yara",
            "sigma" => "sigma",
            "snort" => "snort",
            "suricata" => "suricata",
            _ => "legacy",
        };

    private static LegacyIocProjection MapLegacyIoc(LegacyIocEntity entity)
    {
        var scannerType = NormalizeScannerType(entity.ScannerType);
        var feedSourceId = CreateLegacyFeedSourceId(scannerType);
        var timestampUtc = ToDateTimeOffsetOrDefault(entity.TimestampUtc);
        var mapped = MapLegacyIndicator(entity, scannerType);

        return new LegacyIocProjection(
            Id: entity.Id,
            FeedSourceId: feedSourceId,
            IocFileId: null,
            Type: mapped.Type,
            Value: mapped.Value,
            Severity: mapped.Severity,
            Confidence: mapped.Confidence,
            FirstSeenAtUtc: timestampUtc,
            LastSeenAtUtc: timestampUtc,
            CreatedAtUtc: timestampUtc,
            UpdatedAtUtc: timestampUtc,
            FeedSourceName: ToLegacyFeedSourceName(scannerType),
            FeedSourceType: ToLegacyFeedSourceType(scannerType),
            FileName: entity.ResultId.HasValue ? $"legacy-result-{entity.ResultId.Value}" : null);
    }

    private static (string Type, string Value, string Severity, decimal Confidence) MapLegacyIndicator(LegacyIocEntity entity, string scannerType)
    {
        if (scannerType == "yara")
        {
            var value = NormalizeNullable(entity.YaraDetail?.FilePath)
                ?? NormalizeNullable(entity.YaraDetail?.FileHash)
                ?? NormalizeNullable(entity.RuleName)
                ?? NormalizeNullable(entity.RawPayload)
                ?? "legacy-yara-match";
            return ("Artifact", value, "Medium", 0.70m);
        }

        if (scannerType == "sigma")
        {
            var value = NormalizeNullable(entity.SigmaDetail?.CommandLine)
                ?? NormalizeNullable(entity.SigmaDetail?.LogSource)
                ?? NormalizeNullable(entity.RuleName)
                ?? NormalizeNullable(entity.RawPayload)
                ?? "legacy-sigma-event";
            var type = NormalizeNullable(entity.SigmaDetail?.CommandLine) is not null ? "Process" : "Artifact";
            return (type, value, NormalizeLegacySeverity(entity.SigmaDetail?.Severity), 0.60m);
        }

        if (scannerType is "snort" or "suricata")
        {
            var sourceIp = NormalizeNullable(entity.NetworkDetail?.SourceIP);
            var destinationIp = NormalizeNullable(entity.NetworkDetail?.DestIP);
            var value = sourceIp is not null && destinationIp is not null
                ? $"{sourceIp} -> {destinationIp}"
                : sourceIp
                    ?? destinationIp
                    ?? NormalizeNullable(entity.RuleName)
                    ?? "legacy-network-alert";
            return ("Ip", value, NormalizeLegacySeverity(entity.NetworkDetail?.Severity), 0.65m);
        }

        var fallbackValue = NormalizeNullable(entity.RuleName)
            ?? NormalizeNullable(entity.RawPayload)
            ?? "legacy-indicator";
        return ("Artifact", fallbackValue, "Medium", 0.50m);
    }

    private static string NormalizeLegacySeverity(string? rawSeverity)
        => NormalizeNullable(rawSeverity)?.ToLowerInvariant() switch
        {
            "low" or "informational" or "info" => "Low",
            "medium" or "moderate" => "Medium",
            "high" => "High",
            "critical" or "severe" => "Critical",
            _ => "Medium",
        };

    private static string ToLegacyFeedSourceName(string scannerType)
        => scannerType switch
        {
            "yara" => "Legacy Azure YARA",
            "sigma" => "Legacy Azure Sigma",
            "snort" => "Legacy Azure Snort",
            "suricata" => "Legacy Azure Suricata",
            _ => "Legacy Azure",
        };

    private static string ToLegacyFeedSourceType(string scannerType)
        => scannerType switch
        {
            "yara" => "Yara",
            "sigma" => "Sigma",
            "snort" => "Snort",
            "suricata" => "Suricata",
            _ => "Legacy",
        };

    private static Guid CreateLegacyNetworkId(int networkId)
        => CreateDeterministicGuid($"legacy-network:{networkId}");

    private static Guid CreateLegacySubnetId(int? networkId)
        => CreateDeterministicGuid($"legacy-subnet:{networkId.GetValueOrDefault(0)}");

    private static Guid CreateLegacyFeedSourceId(string scannerType)
        => CreateDeterministicGuid($"legacy-feed-source:{scannerType}");

    private static Guid CreateDeterministicGuid(string value)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(value));
        return new Guid(bytes);
    }

    private LegacyAzureCompatibilityDbContext CreateDbContext()
    {
        var optionsBuilder = new DbContextOptionsBuilder<LegacyAzureCompatibilityDbContext>();
        optionsBuilder.UseSqlServer(
            _connectionString!,
            sqlServer => sqlServer.EnableRetryOnFailure());
        return new LegacyAzureCompatibilityDbContext(optionsBuilder.Options);
    }
}

internal sealed class LegacyAzureCompatibilityDbContext(DbContextOptions<LegacyAzureCompatibilityDbContext> options) : DbContext(options)
{
    public DbSet<LegacyIocEntity> Iocs => Set<LegacyIocEntity>();

    public DbSet<LegacyScanResultEntity> ScanResults => Set<LegacyScanResultEntity>();

    public DbSet<LegacyYaraDetailEntity> YaraDetails => Set<LegacyYaraDetailEntity>();

    public DbSet<LegacySigmaDetailEntity> SigmaDetails => Set<LegacySigmaDetailEntity>();

    public DbSet<LegacyNetworkDetailEntity> NetworkDetails => Set<LegacyNetworkDetailEntity>();

    public DbSet<LegacyTargetEntity> Targets => Set<LegacyTargetEntity>();

    public DbSet<LegacyNetworkEntity> Networks => Set<LegacyNetworkEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LegacyIocEntity>(entity =>
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

        modelBuilder.Entity<LegacyScanResultEntity>(entity =>
        {
            entity.ToTable("ScanResult", "dbo");
            entity.HasKey(x => x.ResultId);
            entity.Property(x => x.ResultId).HasColumnName("ResultID").ValueGeneratedOnAdd();
            entity.Property(x => x.JobId).HasColumnName("JobID");
            entity.Property(x => x.TargetId).HasColumnName("TargetID");
            entity.Property(x => x.ScannerType).HasMaxLength(50);
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.StartedAt).HasColumnType("datetime2");
            entity.Property(x => x.FinishedAt).HasColumnType("datetime2");
        });

        modelBuilder.Entity<LegacyYaraDetailEntity>(entity =>
        {
            entity.ToTable("Yara_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.FilePath).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.FileHash).HasMaxLength(128).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.YaraDetail)
                .HasForeignKey<LegacyYaraDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacySigmaDetailEntity>(entity =>
        {
            entity.ToTable("Sigma_Details", "dbo");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.LogSource).HasMaxLength(255).IsUnicode(false);
            entity.Property(x => x.Severity).HasMaxLength(20).IsUnicode(false);
            entity.HasOne(x => x.Ioc)
                .WithOne(x => x.SigmaDetail)
                .HasForeignKey<LegacySigmaDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacyNetworkDetailEntity>(entity =>
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
                .HasForeignKey<LegacyNetworkDetailEntity>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LegacyTargetEntity>(entity =>
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
            entity.HasOne(x => x.Network)
                .WithMany(x => x.Targets)
                .HasForeignKey(x => x.NetworkId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LegacyNetworkEntity>(entity =>
        {
            entity.ToTable("NETWORK", "dbo");
            entity.HasKey(x => x.NetworkId);
            entity.Property(x => x.NetworkId).HasColumnName("NetworkID").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasMaxLength(50).IsRequired();
            entity.Property(x => x.SubNet).HasMaxLength(50).IsRequired();
        });
    }
}

internal sealed class LegacyIocEntity
{
    public Guid Id { get; set; }

    public DateTime? TimestampUtc { get; set; }

    public string ScannerType { get; set; } = string.Empty;

    public string TargetServer { get; set; } = string.Empty;

    public string TargetOsType { get; set; } = string.Empty;

    public string RuleName { get; set; } = string.Empty;

    public string RawPayload { get; set; } = string.Empty;

    public int? FileId { get; set; }

    public int? ResultId { get; set; }

    public LegacyScanResultEntity? ScanResult { get; set; }

    public LegacyYaraDetailEntity? YaraDetail { get; set; }

    public LegacySigmaDetailEntity? SigmaDetail { get; set; }

    public LegacyNetworkDetailEntity? NetworkDetail { get; set; }
}

internal sealed class LegacyScanResultEntity
{
    public int ResultId { get; set; }

    public int? JobId { get; set; }

    public int? TargetId { get; set; }

    public string? ScannerType { get; set; }

    public string? Status { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    public List<LegacyIocEntity> Iocs { get; set; } = [];
}

internal sealed class LegacyYaraDetailEntity
{
    public Guid Id { get; set; }

    public string FilePath { get; set; } = string.Empty;

    public string? FileHash { get; set; }

    public LegacyIocEntity Ioc { get; set; } = null!;
}

internal sealed class LegacySigmaDetailEntity
{
    public Guid Id { get; set; }

    public string? LogSource { get; set; }

    public string? Severity { get; set; }

    public string? CommandLine { get; set; }

    public LegacyIocEntity Ioc { get; set; } = null!;
}

internal sealed class LegacyNetworkDetailEntity
{
    public Guid Id { get; set; }

    public string? SourceIP { get; set; }

    public string? DestIP { get; set; }

    public string? Protocol { get; set; }

    public string? Severity { get; set; }

    public long? FlowId { get; set; }

    public LegacyIocEntity Ioc { get; set; } = null!;
}

internal sealed class LegacyTargetEntity
{
    public int TargetId { get; set; }

    public string? HostName { get; set; }

    public string IPAddress { get; set; } = string.Empty;

    public string? Status { get; set; }

    public string? TargetOsType { get; set; }

    public int? NetworkId { get; set; }

    public DateTime? LastSweep { get; set; }

    public LegacyNetworkEntity? Network { get; set; }
}

internal sealed class LegacyNetworkEntity
{
    public int NetworkId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string SubNet { get; set; } = string.Empty;

    public List<LegacyTargetEntity> Targets { get; set; } = [];
}
