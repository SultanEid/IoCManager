using Backend.Domain.IocManager;
using Backend.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("permissions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Key).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.Key).IsUnique();
    }
}

public sealed class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("role_permissions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GrantedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ApplicationRole>()
            .WithMany()
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Permission>()
            .WithMany()
            .HasForeignKey(x => x.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RoleId, x.PermissionId }).IsUnique();
    }
}

public sealed class NetworkConfiguration : IEntityTypeConfiguration<Network>
{
    public void Configure(EntityTypeBuilder<Network> builder)
    {
        builder.ToTable("networks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.CidrBlock).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();
    }
}

public sealed class SubnetConfiguration : IEntityTypeConfiguration<Subnet>
{
    public void Configure(EntityTypeBuilder<Subnet> builder)
    {
        builder.ToTable("subnets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.CidrBlock).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Gateway).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<Network>()
            .WithMany()
            .HasForeignKey(x => x.NetworkId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.NetworkId, x.CidrBlock }).IsUnique();
    }
}

public sealed class TargetServerConfiguration : IEntityTypeConfiguration<TargetServer>
{
    public void Configure(EntityTypeBuilder<TargetServer> builder)
    {
        builder.ToTable("target_servers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Hostname).HasMaxLength(200).IsRequired();
        builder.Property(x => x.IpAddress).HasMaxLength(64).IsRequired();
        builder.Property(x => x.OperatingSystem).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Environment).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.ConnectivityStatus).HasConversion<string>().HasMaxLength(64).HasDefaultValue(ConnectivityStatus.Unknown).IsRequired();
        builder.Property(x => x.ConnectionProtocol).HasConversion<string>().HasMaxLength(64);
        builder.Property(x => x.ConnectionHost).HasMaxLength(255).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.ConnectionPort);
        builder.Property(x => x.ConnectionAuthMode).HasConversion<string>().HasMaxLength(64);
        builder.Property(x => x.ConnectionUsername).HasMaxLength(200).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<Subnet>()
            .WithMany()
            .HasForeignKey(x => x.SubnetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.IpAddress).IsUnique();
        builder.HasIndex(x => new { x.SubnetId, x.ConnectivityStatus });
        builder.HasIndex(x => x.LastContactUtc);
    }
}

public sealed class TargetGroupConfiguration : IEntityTypeConfiguration<TargetGroup>
{
    public void Configure(EntityTypeBuilder<TargetGroup> builder)
    {
        builder.ToTable("target_groups");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.IsEnabled).HasDefaultValue(true).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();
    }
}

public sealed class TargetGroupMemberConfiguration : IEntityTypeConfiguration<TargetGroupMember>
{
    public void Configure(EntityTypeBuilder<TargetGroupMember> builder)
    {
        builder.ToTable("target_group_members");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AddedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<TargetGroup>()
            .WithMany()
            .HasForeignKey(x => x.TargetGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.TargetGroupId, x.TargetServerId }).IsUnique();
        builder.HasIndex(x => x.TargetServerId);
    }
}

public sealed class DiscoveryRunConfiguration : IEntityTypeConfiguration<DiscoveryRun>
{
    public void Configure(EntityTypeBuilder<DiscoveryRun> builder)
    {
        builder.ToTable("discovery_runs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RequestedCidr).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RangeStartIp).HasMaxLength(64);
        builder.Property(x => x.RangeEndIp).HasMaxLength(64);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<Subnet>()
            .WithMany()
            .HasForeignKey(x => x.SubnetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.Status, x.QueuedAtUtc });
    }
}

public sealed class DiscoveredHostConfiguration : IEntityTypeConfiguration<DiscoveredHost>
{
    public void Configure(EntityTypeBuilder<DiscoveredHost> builder)
    {
        builder.ToTable("discovered_hosts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.IpAddress).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Hostname).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Reachability).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<Subnet>()
            .WithMany()
            .HasForeignKey(x => x.SubnetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<DiscoveryRun>()
            .WithMany()
            .HasForeignKey(x => x.LastDiscoveryRunId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.PromotedTargetServerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.SubnetId, x.IpAddress }).IsUnique();
        builder.HasIndex(x => new { x.SubnetId, x.LastCheckedAtUtc });
    }
}

public sealed class ScannerConfiguration : IEntityTypeConfiguration<Scanner>
{
    public void Configure(EntityTypeBuilder<Scanner> builder)
    {
        builder.ToTable("scanners");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.EngineType).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Version).HasMaxLength(50).IsRequired();
        builder.Property(x => x.HealthStatus).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();
    }
}

public sealed class TargetServerConnectionSecretConfiguration : IEntityTypeConfiguration<TargetServerConnectionSecret>
{
    public void Configure(EntityTypeBuilder<TargetServerConnectionSecret> builder)
    {
        builder.ToTable("target_server_connection_secrets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.EncryptedPayload).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.TargetServerId).IsUnique();
    }
}

public sealed class TargetServerScannerAssignmentConfiguration : IEntityTypeConfiguration<TargetServerScannerAssignment>
{
    public void Configure(EntityTypeBuilder<TargetServerScannerAssignment> builder)
    {
        builder.ToTable("target_server_scanner_assignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ConnectivityStatus).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.IsEnabled).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Scanner>()
            .WithMany()
            .HasForeignKey(x => x.ScannerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.TargetServerId, x.ScannerId }).IsUnique();
        builder.HasIndex(x => new { x.ScannerId, x.ConnectivityStatus });
        builder.HasIndex(x => x.LastContactUtc);
    }
}

public sealed class ScannerCapabilityBindingConfiguration : IEntityTypeConfiguration<ScannerCapabilityBinding>
{
    public void Configure(EntityTypeBuilder<ScannerCapabilityBinding> builder)
    {
        builder.ToTable("scanner_capability_bindings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Capability).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.AddedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<Scanner>()
            .WithMany()
            .HasForeignKey(x => x.ScannerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ScannerId, x.Capability }).IsUnique();
        builder.HasIndex(x => x.Capability);
    }
}

public sealed class FeedSourceConfiguration : IEntityTypeConfiguration<FeedSource>
{
    public void Configure(EntityTypeBuilder<FeedSource> builder)
    {
        builder.ToTable("feed_sources");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.SourceType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Endpoint).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.Name).IsUnique();
    }
}

public sealed class IocFileConfiguration : IEntityTypeConfiguration<IocFile>
{
    public void Configure(EntityTypeBuilder<IocFile> builder)
    {
        builder.ToTable("ioc_files");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        builder.Property(x => x.StorageUri).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.ContentHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<FeedSource>()
            .WithMany()
            .HasForeignKey(x => x.FeedSourceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.ContentHash);
    }
}

public sealed class IocConfiguration : IEntityTypeConfiguration<Ioc>
{
    public void Configure(EntityTypeBuilder<Ioc> builder)
    {
        builder.ToTable("iocs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Severity).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<FeedSource>()
            .WithMany()
            .HasForeignKey(x => x.FeedSourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<IocFile>()
            .WithMany()
            .HasForeignKey(x => x.IocFileId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.Type, x.Value }).IsUnique();
    }
}

public sealed class RuleArtifactConfiguration : IEntityTypeConfiguration<RuleArtifact>
{
    public void Configure(EntityTypeBuilder<RuleArtifact> builder)
    {
        builder.ToTable("rule_artifacts", table =>
        {
                table.HasCheckConstraint("ck_rule_artifacts_rule_family", "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(256).HasDefaultValue("manual").IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Tags)
            .HasConversion(StringArrayJsonConversion.Converter)
            .Metadata.SetValueComparer(StringArrayJsonConversion.Comparer);
        builder.Property(x => x.Tags).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.Severity).HasMaxLength(64).HasDefaultValue("medium").IsRequired();
        builder.Property(x => x.LifecycleStatus).HasMaxLength(64).HasDefaultValue("draft").IsRequired();
        builder.Property(x => x.ScopeType).HasConversion<string>().HasMaxLength(64).HasDefaultValue(RuleScopeType.Global).IsRequired();
        builder.Property(x => x.ScopeValue).HasMaxLength(256);
        builder.Property(x => x.CurrentRevisionNumber).HasDefaultValue(0).IsRequired();
        builder.Property(x => x.CurrentVersionLabel).HasMaxLength(64).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.IsDeleted).HasDefaultValue(false).IsRequired();
        builder.Property(x => x.DeletedByUserId).HasMaxLength(128);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => new { x.RuleFamily, x.Name }).IsUnique();
        builder.HasIndex(x => x.IsDeleted);
        builder.HasIndex(x => x.UpdatedAtUtc);
        builder.HasIndex(x => new { x.RuleFamily, x.LifecycleStatus, x.Severity, x.ScopeType });
        builder.HasIndex(x => x.Source);
    }
}

public sealed class RuleRevisionConfiguration : IEntityTypeConfiguration<RuleRevision>
{
    public void Configure(EntityTypeBuilder<RuleRevision> builder)
    {
        builder.ToTable("rule_revisions_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RevisionNumber).IsRequired();
        builder.Property(x => x.RuleBody).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.VersionLabel).HasMaxLength(64).HasDefaultValue("v1").IsRequired();
        builder.Property(x => x.OriginalContent).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.MetadataJson).HasColumnType("nvarchar(max)").HasDefaultValue("{}").IsRequired();
        builder.Property(x => x.ChangeType).HasMaxLength(64).HasDefaultValue("created").IsRequired();
        builder.Property(x => x.ChangeReason).HasMaxLength(2000);
        builder.Property(x => x.LifecycleStatus).HasMaxLength(64).HasDefaultValue("draft").IsRequired();
        builder.Property(x => x.ValidationResultJson).HasColumnType("nvarchar(max)").HasDefaultValue("{}").IsRequired();
        builder.Property(x => x.CanPersistValidation).HasDefaultValue(false).IsRequired();
        builder.Property(x => x.IsDeploymentReady).HasDefaultValue(false).IsRequired();
        builder.Property(x => x.ValidatedAtUtc);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleArtifact>()
            .WithMany()
            .HasForeignKey(x => x.RuleArtifactId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleArtifactId, x.RevisionNumber }).IsUnique();
        builder.HasIndex(x => x.CreatedAtUtc);
        builder.HasIndex(x => x.RuleImportAttemptId);
        builder.HasIndex(x => x.IsDeploymentReady);
    }
}

public sealed class RuleImportAttemptConfiguration : IEntityTypeConfiguration<RuleImportAttempt>
{
    public void Configure(EntityTypeBuilder<RuleImportAttempt> builder)
    {
        builder.ToTable("rule_import_attempts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        builder.Property(x => x.FileHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.DeclaredRuleFamily).HasMaxLength(64).IsRequired();
        builder.Property(x => x.SourceMetadataJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.ParsedMetadataJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.DiagnosticsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.ValidationResultJson).HasColumnType("nvarchar(max)").HasDefaultValue("{}").IsRequired();
        builder.Property(x => x.FailureReason).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasIndex(x => x.CreatedAtUtc);
        builder.HasIndex(x => x.FileHash);
        builder.HasIndex(x => x.RuleArtifactId);
        builder.HasIndex(x => x.WasSuccessful);
    }
}

public sealed class RuleDistributionConfiguration : IEntityTypeConfiguration<RuleDistribution>
{
    public void Configure(EntityTypeBuilder<RuleDistribution> builder)
    {
        builder.ToTable("rule_distributions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleRevision>()
            .WithMany()
            .HasForeignKey(x => x.RuleRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleRevisionId, x.TargetServerId }).IsUnique();
    }
}

public sealed class RuleDistributionJobConfiguration : IEntityTypeConfiguration<RuleDistributionJob>
{
    public void Configure(EntityTypeBuilder<RuleDistributionJob> builder)
    {
        builder.ToTable("rule_distribution_jobs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.OperatorUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.MaxAttempts).HasDefaultValue(5).IsRequired();
        builder.Property(x => x.AttemptCount).HasDefaultValue(0).IsRequired();

        builder.HasOne<RuleRevision>()
            .WithMany()
            .HasForeignKey(x => x.RuleRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.Status, x.NextAttemptAtUtc });
        builder.HasIndex(x => x.QueuedAtUtc);
        builder.HasIndex(x => x.RuleRevisionId);
    }
}

public sealed class RuleDistributionAttemptConfiguration : IEntityTypeConfiguration<RuleDistributionAttempt>
{
    public void Configure(EntityTypeBuilder<RuleDistributionAttempt> builder)
    {
        builder.ToTable("rule_distribution_attempts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.TriggeredByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleDistributionJob>()
            .WithMany()
            .HasForeignKey(x => x.RuleDistributionJobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleDistributionJobId, x.AttemptNumber }).IsUnique();
        builder.HasIndex(x => x.StartedAtUtc);
    }
}

public sealed class RuleDistributionTargetConfiguration : IEntityTypeConfiguration<RuleDistributionTarget>
{
    public void Configure(EntityTypeBuilder<RuleDistributionTarget> builder)
    {
        builder.ToTable("rule_distribution_targets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetHostname).HasMaxLength(200).IsRequired();
        builder.Property(x => x.TargetIpAddress).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.IsRetryable).HasDefaultValue(true).IsRequired();
        builder.Property(x => x.AttemptCount).HasDefaultValue(0).IsRequired();
        builder.Property(x => x.LastError).HasMaxLength(4000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleDistributionJob>()
            .WithMany()
            .HasForeignKey(x => x.RuleDistributionJobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.RuleDistributionJobId, x.TargetServerId }).IsUnique();
        builder.HasIndex(x => x.Status);
    }
}

public sealed class RuleDistributionTargetAttemptConfiguration : IEntityTypeConfiguration<RuleDistributionTargetAttempt>
{
    public void Configure(EntityTypeBuilder<RuleDistributionTargetAttempt> builder)
    {
        builder.ToTable("rule_distribution_target_attempts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Transport).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RemoteCorrelationId).HasMaxLength(256);
        builder.Property(x => x.Diagnostic).HasMaxLength(4000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleDistributionAttempt>()
            .WithMany()
            .HasForeignKey(x => x.RuleDistributionAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RuleDistributionTarget>()
            .WithMany()
            .HasForeignKey(x => x.RuleDistributionTargetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleDistributionAttemptId, x.RuleDistributionTargetId }).IsUnique();
        builder.HasIndex(x => x.Status);
    }
}

public sealed class RuleDistributionJobTargetGroupConfiguration : IEntityTypeConfiguration<RuleDistributionJobTargetGroup>
{
    public void Configure(EntityTypeBuilder<RuleDistributionJobTargetGroup> builder)
    {
        builder.ToTable("rule_distribution_job_target_groups");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AddedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RuleDistributionJob>()
            .WithMany()
            .HasForeignKey(x => x.RuleDistributionJobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetGroup>()
            .WithMany()
            .HasForeignKey(x => x.TargetGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleDistributionJobId, x.TargetGroupId }).IsUnique();
        builder.HasIndex(x => x.TargetGroupId);
    }
}

public sealed class ScanPlanConfiguration : IEntityTypeConfiguration<ScanPlan>
{
    public void Configure(EntityTypeBuilder<ScanPlan> builder)
    {
        builder.ToTable("scan_plans");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.ScannerCapability).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.RuleSelectionMode).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.RuleScopeType).HasConversion<string>().HasMaxLength(64);
        builder.Property(x => x.RuleScopeValue).HasMaxLength(256);
        builder.Property(x => x.CadenceType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.IntervalMinutes);
        builder.Property(x => x.RunAtHourUtc);
        builder.Property(x => x.RunAtMinuteUtc);
        builder.Property(x => x.WeeklyDayOfWeek);
        builder.Property(x => x.OperatorNotes).HasMaxLength(4000).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.NextRunAtUtc);
        builder.Property(x => x.LastQueuedAtUtc);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasIndex(x => new { x.Status, x.NextRunAtUtc });
        builder.HasIndex(x => new { x.ScannerCapability, x.CadenceType });
    }
}

public sealed class ScanPlanTargetServerConfiguration : IEntityTypeConfiguration<ScanPlanTargetServer>
{
    public void Configure(EntityTypeBuilder<ScanPlanTargetServer> builder)
    {
        builder.ToTable("scan_plan_target_servers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AddedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanPlan>()
            .WithMany()
            .HasForeignKey(x => x.ScanPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ScanPlanId, x.TargetServerId }).IsUnique();
    }
}

public sealed class ScanPlanRuleRevisionConfiguration : IEntityTypeConfiguration<ScanPlanRuleRevision>
{
    public void Configure(EntityTypeBuilder<ScanPlanRuleRevision> builder)
    {
        builder.ToTable("scan_plan_rule_revisions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AddedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanPlan>()
            .WithMany()
            .HasForeignKey(x => x.ScanPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RuleRevision>()
            .WithMany()
            .HasForeignKey(x => x.RuleRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ScanPlanId, x.RuleRevisionId }).IsUnique();
    }
}

public sealed class ScanJobConfiguration : IEntityTypeConfiguration<ScanJob>
{
    public void Configure(EntityTypeBuilder<ScanJob> builder)
    {
        builder.ToTable("scan_jobs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TriggerSource).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Status)
            .HasConversion(
                status => status.ToString(),
                raw => ParseScanJobStatus(raw))
            .HasMaxLength(64)
            .IsRequired();
        builder.Property(x => x.TriggeredByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CancellationRequested).HasDefaultValue(false).IsRequired();
        builder.Property(x => x.CancellationReason).HasMaxLength(4000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanPlan>()
            .WithMany()
            .HasForeignKey(x => x.ScanPlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.Status, x.QueuedAtUtc });
        builder.HasIndex(x => x.ScanPlanId);
    }

    private static ScanJobStatus ParseScanJobStatus(string raw)
    {
        if (raw.Equals("Canceled", StringComparison.OrdinalIgnoreCase))
        {
            return ScanJobStatus.Cancelled;
        }

        if (Enum.TryParse<ScanJobStatus>(raw, ignoreCase: true, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException($"Unknown scan job status '{raw}'.");
    }
}

public sealed class ScanJobTargetExecutionConfiguration : IEntityTypeConfiguration<ScanJobTargetExecution>
{
    public void Configure(EntityTypeBuilder<ScanJobTargetExecution> builder)
    {
        builder.ToTable("scan_job_target_executions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetHostname).HasMaxLength(200).IsRequired();
        builder.Property(x => x.TargetIpAddress).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ScannerName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.ErrorMessage).HasMaxLength(4000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanJob>()
            .WithMany()
            .HasForeignKey(x => x.ScanJobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Scanner>()
            .WithMany()
            .HasForeignKey(x => x.ScannerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.ScanJobId, x.TargetServerId }).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => new { x.TargetServerId, x.CompletedAtUtc });
    }
}

public sealed class JobAttemptConfiguration : IEntityTypeConfiguration<JobAttempt>
{
    public void Configure(EntityTypeBuilder<JobAttempt> builder)
    {
        builder.ToTable("job_attempts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Details).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanJob>()
            .WithMany()
            .HasForeignKey(x => x.ScanJobId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ScanJobId, x.AttemptNumber }).IsUnique();
    }
}

public sealed class ScanResultConfigurationV2 : IEntityTypeConfiguration<ScanResult>
{
    public void Configure(EntityTypeBuilder<ScanResult> builder)
    {
        builder.ToTable("scan_results");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ScannerFamily).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Disposition).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.Fingerprint).HasMaxLength(128).IsRequired();
        builder.Property(x => x.OccurrenceCount).HasDefaultValue(1).IsRequired();
        builder.Property(x => x.RawPayloadHash).HasMaxLength(128).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.RawSampleJson).HasColumnType("nvarchar(max)").HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.IsExecutionArtifact).HasDefaultValue(false).IsRequired();
        builder.Property(x => x.EvidenceJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<JobAttempt>()
            .WithMany()
            .HasForeignKey(x => x.JobAttemptId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<ScanJob>()
            .WithMany()
            .HasForeignKey(x => x.ScanJobId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<ScanJobTargetExecution>()
            .WithMany()
            .HasForeignKey(x => x.TargetExecutionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<TargetServer>()
            .WithMany()
            .HasForeignKey(x => x.TargetServerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<RuleRevision>()
            .WithMany()
            .HasForeignKey(x => x.RuleRevisionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Ioc>()
            .WithMany()
            .HasForeignKey(x => x.IocId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.TargetServerId, x.ObservedAtUtc });
        builder.HasIndex(x => new { x.IocId, x.ObservedAtUtc });
        builder.HasIndex(x => new { x.RuleRevisionId, x.ObservedAtUtc });
        builder.HasIndex(x => new { x.ScannerFamily, x.ObservedAtUtc });
        builder.HasIndex(x => x.Fingerprint).IsUnique();
    }
}

public sealed class ScanResultIngestionRunConfiguration : IEntityTypeConfiguration<ScanResultIngestionRun>
{
    public void Configure(EntityTypeBuilder<ScanResultIngestionRun> builder)
    {
        builder.ToTable("scan_result_ingestion_runs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Source).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RequestPayloadHash).HasMaxLength(128).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => new { x.Source, x.CreatedAtUtc });
    }
}

public sealed class ScanResultProvenanceConfiguration : IEntityTypeConfiguration<ScanResultProvenance>
{
    public void Configure(EntityTypeBuilder<ScanResultProvenance> builder)
    {
        builder.ToTable("scan_result_provenances");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RawPayloadHash).HasMaxLength(128).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.RawSampleJson).HasColumnType("nvarchar(max)").HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.CorrelationMetadataJson).HasColumnType("nvarchar(max)").HasDefaultValue("{}").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanResult>()
            .WithMany()
            .HasForeignKey(x => x.ScanResultId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ScanResultIngestionRun>()
            .WithMany()
            .HasForeignKey(x => x.IngestionRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ScanJob>()
            .WithMany()
            .HasForeignKey(x => x.ScanJobId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<JobAttempt>()
            .WithMany()
            .HasForeignKey(x => x.JobAttemptId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<ScanJobTargetExecution>()
            .WithMany()
            .HasForeignKey(x => x.TargetExecutionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.ScanResultId, x.ObservedAtUtc });
        builder.HasIndex(x => new { x.IngestionRunId, x.RowIndex });
        builder.HasIndex(x => x.ScanJobId);
    }
}

public sealed class ScanResultIngestionDiagnosticConfiguration : IEntityTypeConfiguration<ScanResultIngestionDiagnostic>
{
    public void Configure(EntityTypeBuilder<ScanResultIngestionDiagnostic> builder)
    {
        builder.ToTable("scan_result_ingestion_diagnostics");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Code).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Field).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.RawSnippetHash).HasMaxLength(128).HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.RawPayloadJson).HasColumnType("nvarchar(max)").HasDefaultValue(string.Empty).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<ScanResultIngestionRun>()
            .WithMany()
            .HasForeignKey(x => x.IngestionRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.IngestionRunId, x.RowIndex });
    }
}

public sealed class AlertConfiguration : IEntityTypeConfiguration<Alert>
{
    public void Configure(EntityTypeBuilder<Alert> builder)
    {
        builder.ToTable("alerts_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.Severity).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.OwnerUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ApprovalTierRequired).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => new { x.Status, x.Severity });
    }
}

public sealed class AlertScanResultConfiguration : IEntityTypeConfiguration<AlertScanResult>
{
    public void Configure(EntityTypeBuilder<AlertScanResult> builder)
    {
        builder.ToTable("alert_scan_results");
        builder.HasKey(x => x.Id);

        builder.HasOne<Alert>()
            .WithMany()
            .HasForeignKey(x => x.AlertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ScanResult>()
            .WithMany()
            .HasForeignKey(x => x.ScanResultId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.AlertId, x.ScanResultId }).IsUnique();
    }
}

public sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("reports_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ReportType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.SummaryJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.GeneratedAtUtc);
    }
}

public sealed class ReportAlertConfiguration : IEntityTypeConfiguration<ReportAlert>
{
    public void Configure(EntityTypeBuilder<ReportAlert> builder)
    {
        builder.ToTable("report_alerts");
        builder.HasKey(x => x.Id);

        builder.HasOne<Report>()
            .WithMany()
            .HasForeignKey(x => x.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Alert>()
            .WithMany()
            .HasForeignKey(x => x.AlertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ReportId, x.AlertId }).IsUnique();
    }
}

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ActorUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ActionType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.PayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.OccurredAtUtc });
    }
}

public sealed class RetentionPolicyConfigurationV2 : IEntityTypeConfiguration<RetentionPolicy>
{
    public void Configure(EntityTypeBuilder<RetentionPolicy> builder)
    {
        builder.ToTable("retention_policies_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.DataType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.HasIndex(x => x.DataType).IsUnique();
    }
}

public sealed class ArchiveRecordConfigurationV2 : IEntityTypeConfiguration<ArchiveRecord>
{
    public void Configure(EntityTypeBuilder<ArchiveRecord> builder)
    {
        builder.ToTable("archive_records_v2");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.EntityType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ArchiveUri).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<RetentionPolicy>()
            .WithMany()
            .HasForeignKey(x => x.RetentionPolicyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.ArchivedAtUtc });
    }
}
