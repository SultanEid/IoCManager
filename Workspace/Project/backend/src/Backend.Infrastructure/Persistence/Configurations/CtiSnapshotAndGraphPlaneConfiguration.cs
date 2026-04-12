using Backend.Domain.Cti.V1.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class CtiFeatureSnapshotConfiguration : IEntityTypeConfiguration<CtiFeatureSnapshot>
{
    public void Configure(EntityTypeBuilder<CtiFeatureSnapshot> builder)
    {
        builder.ToTable("cti_feature_snapshots", table =>
        {
            table.HasCheckConstraint("ck_cti_feature_snapshots_window_order", "[FeatureWindowStartUtc] <= [FeatureWindowEndUtc]");
            table.HasCheckConstraint("ck_cti_feature_snapshots_capture_window", "[FeatureWindowEndUtc] <= [CapturedAtUtc]");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SnapshotHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CapturedByPipeline).HasMaxLength(120).IsRequired();

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.SnapshotHash).IsUnique();
        builder.HasIndex(x => new { x.CaseId, x.CapturedAtUtc });
    }
}

public sealed class CtiFeatureVectorConfiguration : IEntityTypeConfiguration<CtiFeatureVector>
{
    public void Configure(EntityTypeBuilder<CtiFeatureVector> builder)
    {
        builder.ToTable("cti_feature_vectors");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FeatureName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.NumericValue).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.Unit).HasMaxLength(40);
        builder.Property(x => x.Source).HasMaxLength(80).IsRequired();

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.FeatureName });
    }
}

public sealed class CtiGraphDerivedFeatureConfiguration : IEntityTypeConfiguration<CtiGraphDerivedFeature>
{
    public void Configure(EntityTypeBuilder<CtiGraphDerivedFeature> builder)
    {
        builder.ToTable("cti_graph_derived_features");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.MetricName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.MetricValue).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.MetricUnit).HasMaxLength(40);

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiGraphArtifactReference>()
            .WithMany()
            .HasForeignKey(x => x.GraphArtifactReferenceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.MetricName });
        builder.HasIndex(x => x.GraphArtifactReferenceId);
    }
}

public sealed class CtiAssetCriticalitySnapshotValueConfiguration : IEntityTypeConfiguration<CtiAssetCriticalitySnapshotValue>
{
    public void Configure(EntityTypeBuilder<CtiAssetCriticalitySnapshotValue> builder)
    {
        builder.ToTable("cti_asset_criticality_snapshot_values", table =>
        {
            table.HasCheckConstraint("ck_cti_asset_criticality_snapshot_values_score", "[CriticalityScore] >= 0 AND [CriticalityScore] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetKey).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Criticality).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.CriticalityScore).HasPrecision(5, 4).IsRequired();

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.AssetKey });
    }
}

public sealed class CtiSourceTrustSnapshotValueConfiguration : IEntityTypeConfiguration<CtiSourceTrustSnapshotValue>
{
    public void Configure(EntityTypeBuilder<CtiSourceTrustSnapshotValue> builder)
    {
        builder.ToTable("cti_source_trust_snapshot_values", table =>
        {
            table.HasCheckConstraint("ck_cti_source_trust_snapshot_values_trust_score", "[TrustScore] >= 0 AND [TrustScore] <= 1");
            table.HasCheckConstraint("ck_cti_source_trust_snapshot_values_precision", "[HistoricalPrecision] >= 0 AND [HistoricalPrecision] <= 1");
            table.HasCheckConstraint("ck_cti_source_trust_snapshot_values_recall", "[HistoricalRecall] >= 0 AND [HistoricalRecall] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SourceSystem).HasMaxLength(100).IsRequired();
        builder.Property(x => x.TrustScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.HistoricalPrecision).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.HistoricalRecall).HasPrecision(5, 4).IsRequired();

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.SourceSystem });
    }
}

public sealed class CtiPolicyVersionReferenceConfiguration : IEntityTypeConfiguration<CtiPolicyVersionReference>
{
    public void Configure(EntityTypeBuilder<CtiPolicyVersionReference> builder)
    {
        builder.ToTable("cti_policy_version_references");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.PolicyVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.PolicyHash).HasMaxLength(128).IsRequired();

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.PolicyVersion }).IsUnique();
    }
}

public sealed class CtiModelVersionReferenceConfiguration : IEntityTypeConfiguration<CtiModelVersionReference>
{
    public void Configure(EntityTypeBuilder<CtiModelVersionReference> builder)
    {
        builder.ToTable("cti_model_version_references");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ModelName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ModelHash).HasMaxLength(128).IsRequired();

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.FeatureSnapshotId, x.ModelName, x.ModelVersion }).IsUnique();
    }
}

public sealed class CtiModelDecisionTraceConfiguration : IEntityTypeConfiguration<CtiModelDecisionTrace>
{
    public void Configure(EntityTypeBuilder<CtiModelDecisionTrace> builder)
    {
        builder.ToTable("cti_model_decision_traces", table =>
        {
            table.HasCheckConstraint("ck_cti_model_decision_traces_maliciousness", "[MaliciousnessScore] >= 0 AND [MaliciousnessScore] <= 1");
            table.HasCheckConstraint("ck_cti_model_decision_traces_actionability", "[ActionabilityScore] >= 0 AND [ActionabilityScore] <= 1");
            table.HasCheckConstraint("ck_cti_model_decision_traces_deployability", "[DeployabilityScore] >= 0 AND [DeployabilityScore] <= 1");
            table.HasCheckConstraint("ck_cti_model_decision_traces_uncertainty", "[UncertaintyScore] >= 0 AND [UncertaintyScore] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ModelName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.MaliciousnessScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.ActionabilityScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.DeployabilityScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.UncertaintyScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.ReasoningSummary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.RawOutputHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.DecisionId, x.TracedAtUtc });
        builder.HasIndex(x => x.FeatureSnapshotId);
    }
}

public sealed class CtiGraphArtifactReferenceConfiguration : IEntityTypeConfiguration<CtiGraphArtifactReference>
{
    public void Configure(EntityTypeBuilder<CtiGraphArtifactReference> builder)
    {
        builder.ToTable("cti_graph_artifact_references");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ArtifactType).HasMaxLength(80).IsRequired();
        builder.Property(x => x.StorageUri).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.ArtifactHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ProducedBy).HasMaxLength(120).IsRequired();

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.CaseId, x.GeneratedAtUtc });
        builder.HasIndex(x => x.ArtifactHash);
    }
}
