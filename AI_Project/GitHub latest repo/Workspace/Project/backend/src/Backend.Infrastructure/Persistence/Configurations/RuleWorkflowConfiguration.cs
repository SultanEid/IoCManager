using Backend.Domain.Cases;
using Backend.Domain.RuleLifecycle;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class RuleProposalConfiguration : IEntityTypeConfiguration<RuleProposal>
{
    public void Configure(EntityTypeBuilder<RuleProposal> builder)
    {
        builder.ToTable("rule_proposals", table =>
        {
                table.HasCheckConstraint("ck_rule_proposals_rule_family", "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProposalName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(120).IsRequired();
        builder.Property(x => x.RuleBody).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.ProposedVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ProposedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Rationale).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.PolicyRiskScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ReviewedByUserId).HasMaxLength(128);
        builder.Property(x => x.ReviewReason).HasMaxLength(2000);
        builder.Property(x => x.OverrideReason).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.Status });
        builder.HasIndex(x => new { x.CaseId, x.CreatedAtUtc });
    }
}

public sealed class DeploymentRecommendationConfiguration : IEntityTypeConfiguration<DeploymentRecommendation>
{
    public void Configure(EntityTypeBuilder<DeploymentRecommendation> builder)
    {
        builder.ToTable("deployment_recommendations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TargetEnvironment).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RecommendedStage).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.RiskScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.PredictedNoise).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.BaselineNoise).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.PredictedNoiseDelta).HasPrecision(6, 4).IsRequired();
        builder.Property(x => x.AnalystAcceptanceRate).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.RequestedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Rationale).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RuleProposal>()
            .WithMany()
            .HasForeignKey(x => x.RuleProposalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.RecommendedAtUtc });
        builder.HasIndex(x => x.RuleProposalId).IsUnique();
    }
}

public sealed class RolloutPlanConfiguration : IEntityTypeConfiguration<RolloutPlan>
{
    public void Configure(EntityTypeBuilder<RolloutPlan> builder)
    {
        builder.ToTable("rollout_plans");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CurrentStage).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.CanaryTrafficPercent).IsRequired();
        builder.Property(x => x.PredictedNoise).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.ObservedNoise).HasPrecision(5, 4);
        builder.Property(x => x.ObservedNoiseDelta).HasPrecision(6, 4);
        builder.Property(x => x.AnalystAcceptanceRate).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.LastStageReason).HasMaxLength(2000);
        builder.Property(x => x.LastOverrideReason).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RuleProposal>()
            .WithMany()
            .HasForeignKey(x => x.RuleProposalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<DeploymentRecommendation>()
            .WithMany()
            .HasForeignKey(x => x.DeploymentRecommendationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.DeploymentRecommendationId).IsUnique();
        builder.HasIndex(x => new { x.CaseId, x.CurrentStage });
    }
}

public sealed class RollbackPlanConfiguration : IEntityTypeConfiguration<RollbackPlan>
{
    public void Configure(EntityTypeBuilder<RollbackPlan> builder)
    {
        builder.ToTable("rollback_plans");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TriggerCondition).HasMaxLength(500).IsRequired();
        builder.Property(x => x.RecoveryPlaybook).HasMaxLength(500).IsRequired();
        builder.Property(x => x.PredictedNoiseThreshold).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.LastObservedNoise).HasPrecision(5, 4);
        builder.Property(x => x.TriggeredByUserId).HasMaxLength(128);
        builder.Property(x => x.TriggerReason).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RuleProposal>()
            .WithMany()
            .HasForeignKey(x => x.RuleProposalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<RolloutPlan>()
            .WithMany()
            .HasForeignKey(x => x.RolloutPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.RolloutPlanId).IsUnique();
        builder.HasIndex(x => new { x.CaseId, x.IsTriggered });
    }
}
