using Backend.Domain.Cti.V1.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class CtiCaseConfiguration : IEntityTypeConfiguration<CtiCase>
{
    public void Configure(EntityTypeBuilder<CtiCase> builder)
    {
        builder.ToTable("cti_cases", table =>
        {
            table.HasCheckConstraint("ck_cti_cases_closed_after_opened", "[ClosedAtUtc] IS NULL OR [ClosedAtUtc] >= [OpenedAtUtc]");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.OwnerUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.State).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.MergeReason).HasMaxLength(2000);

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasIndex(x => x.State);
        builder.HasIndex(x => x.OwnerUserId);
        builder.HasIndex(x => x.OpenedAtUtc);
        builder.HasIndex(x => x.ParentCaseId);
        builder.HasIndex(x => x.MergedIntoCaseId);

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.ParentCaseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.MergedIntoCaseId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class CtiSourceReliabilityProfileConfiguration : IEntityTypeConfiguration<CtiSourceReliabilityProfile>
{
    public void Configure(EntityTypeBuilder<CtiSourceReliabilityProfile> builder)
    {
        builder.ToTable("cti_source_reliability_profiles", table =>
        {
            table.HasCheckConstraint("ck_cti_source_reliability_profiles_precision", "[HistoricalPrecision] >= 0 AND [HistoricalPrecision] <= 1");
            table.HasCheckConstraint("ck_cti_source_reliability_profiles_recall", "[HistoricalRecall] >= 0 AND [HistoricalRecall] <= 1");
            table.HasCheckConstraint("ck_cti_source_reliability_profiles_trust", "[TrustScore] >= 0 AND [TrustScore] <= 1");
            table.HasCheckConstraint("ck_cti_source_reliability_profiles_effective_range", "[EffectiveToUtc] IS NULL OR [EffectiveToUtc] >= [EffectiveFromUtc]");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SourceSystem).HasMaxLength(100).IsRequired();
        builder.Property(x => x.HistoricalPrecision).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.HistoricalRecall).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.TrustScore).HasPrecision(5, 4).IsRequired();

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasIndex(x => new { x.SourceSystem, x.EffectiveFromUtc });
    }
}

public sealed class CtiEvidenceAssertionConfiguration : IEntityTypeConfiguration<CtiEvidenceAssertion>
{
    public void Configure(EntityTypeBuilder<CtiEvidenceAssertion> builder)
    {
        builder.ToTable("cti_evidence_assertions", table =>
        {
            table.HasCheckConstraint("ck_cti_evidence_assertions_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.EvidenceReference).HasMaxLength(128).IsRequired();
        builder.Property(x => x.AssertionType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Statement).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.SourceReference).HasMaxLength(200).IsRequired();

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiSourceReliabilityProfile>()
            .WithMany()
            .HasForeignKey(x => x.SourceReliabilityProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CaseId, x.ObservedAtUtc });
        builder.HasIndex(x => x.SourceReliabilityProfileId);
        builder.HasIndex(x => x.EvidenceReference).IsUnique();
    }
}

public sealed class CtiDecisionConfiguration : IEntityTypeConfiguration<CtiDecision>
{
    public void Configure(EntityTypeBuilder<CtiDecision> builder)
    {
        builder.ToTable("cti_decisions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.DecisionState).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ApprovalTierRequired).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.RecommendationCode).HasMaxLength(120).IsRequired();
        builder.Property(x => x.RecommendationSummary).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.SnapshotHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.PolicyVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.TransformationLineageHash).HasMaxLength(128).IsRequired();

        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.SupersedesDecisionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CaseId, x.DecidedAtUtc });
        builder.HasIndex(x => new { x.SnapshotHash, x.ModelVersion, x.PolicyVersion });
    }
}

public sealed class CtiDecisionBundleConfiguration : IEntityTypeConfiguration<CtiDecisionBundle>
{
    public void Configure(EntityTypeBuilder<CtiDecisionBundle> builder)
    {
        builder.ToTable("cti_decision_bundles");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.DecisionState).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ApprovalTierRequired).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.NextBestEvidenceType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.RecommendationCode).HasMaxLength(120).IsRequired();
        builder.Property(x => x.RecommendationSummary).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.NextBestEvidenceRequest).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.NextBestEvidenceRationale).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.SnapshotHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.PolicyVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.TransformationLineageHash).HasMaxLength(128).IsRequired();

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
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiFeatureSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.FeatureSnapshotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CtiDecisionBundle>()
            .WithMany()
            .HasForeignKey(x => x.SupersedesDecisionBundleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.DecisionId).IsUnique();
        builder.HasIndex(x => x.SupersedesDecisionBundleId);
        builder.HasIndex(x => new { x.CaseId, x.DecidedAtUtc });
        builder.HasIndex(x => new { x.SnapshotHash, x.ModelVersion, x.PolicyVersion });
    }
}

public sealed class CtiApprovalConfiguration : IEntityTypeConfiguration<CtiApproval>
{
    public void Configure(EntityTypeBuilder<CtiApproval> builder)
    {
        builder.ToTable("cti_approvals");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RequiredTier).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ApprovedTier).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ApprovedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(2000);

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
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.DecisionId, x.ApprovedAtUtc });
    }
}

public sealed class CtiRuleProposalConfiguration : IEntityTypeConfiguration<CtiRuleProposal>
{
    public void Configure(EntityTypeBuilder<CtiRuleProposal> builder)
    {
        builder.ToTable("cti_rule_proposals", table =>
        {
                table.HasCheckConstraint("ck_cti_rule_proposals_rule_family", "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProposalName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(120).IsRequired();
        builder.Property(x => x.RuleBody).HasMaxLength(20000).IsRequired();
        builder.Property(x => x.ProposedVersion).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ProposedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Rationale).HasMaxLength(2000).IsRequired();

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

        builder.HasIndex(x => new { x.CaseId, x.ProposedAtUtc });
        builder.HasIndex(x => new { x.RuleFamily, x.ProposedVersion });
    }
}

public sealed class CtiDeploymentRecommendationConfiguration : IEntityTypeConfiguration<CtiDeploymentRecommendation>
{
    public void Configure(EntityTypeBuilder<CtiDeploymentRecommendation> builder)
    {
        builder.ToTable("cti_deployment_recommendations", table =>
        {
            table.HasCheckConstraint("ck_cti_deployment_recommendations_risk", "[RiskScore] >= 0 AND [RiskScore] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TargetEnvironment).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RecommendedRolloutMode).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.RiskScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.RequestedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Rationale).HasMaxLength(2000).IsRequired();

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
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiRuleProposal>()
            .WithMany()
            .HasForeignKey(x => x.RuleProposalId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.CaseId, x.RecommendedAtUtc });
    }
}

public sealed class CtiFeedbackConfiguration : IEntityTypeConfiguration<CtiFeedback>
{
    public void Configure(EntityTypeBuilder<CtiFeedback> builder)
    {
        builder.ToTable("cti_feedback");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Verdict).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.SubmittedByUserId).HasMaxLength(128).IsRequired();

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

        builder.HasIndex(x => new { x.CaseId, x.SubmittedAtUtc });
    }
}

public sealed class CtiAuditRecordConfiguration : IEntityTypeConfiguration<CtiAuditRecord>
{
    public void Configure(EntityTypeBuilder<CtiAuditRecord> builder)
    {
        builder.ToTable("cti_audit_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ActorUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ActionType).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityKey).HasMaxLength(128).IsRequired();
        builder.Property(x => x.PayloadHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CorrelationId).HasMaxLength(128);

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.CaseId, x.OccurredAtUtc });
        builder.HasIndex(x => new { x.ActionType, x.OccurredAtUtc });
    }
}

public sealed class CtiTransformationLineageRecordConfiguration : IEntityTypeConfiguration<CtiTransformationLineageRecord>
{
    public void Configure(EntityTypeBuilder<CtiTransformationLineageRecord> builder)
    {
        builder.ToTable("cti_transformation_lineage_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Relationship).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Rationale).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.RecordedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<CtiCase>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.RecordedAtUtc });
        builder.HasIndex(x => new { x.SourceCaseId, x.TargetCaseId, x.Relationship });
    }
}

public sealed class CtiDecisionEvidenceReferenceConfiguration : IEntityTypeConfiguration<CtiDecisionEvidenceReference>
{
    public void Configure(EntityTypeBuilder<CtiDecisionEvidenceReference> builder)
    {
        builder.ToTable("cti_decision_evidence_references");
        builder.HasKey(x => x.Id);

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiEvidenceAssertion>()
            .WithMany()
            .HasForeignKey(x => x.EvidenceAssertionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.DecisionId);
        builder.HasIndex(x => x.EvidenceAssertionId);
        builder.HasIndex(x => new { x.DecisionId, x.EvidenceAssertionId }).IsUnique();
    }
}

public sealed class CtiDecisionLineageReferenceConfiguration : IEntityTypeConfiguration<CtiDecisionLineageReference>
{
    public void Configure(EntityTypeBuilder<CtiDecisionLineageReference> builder)
    {
        builder.ToTable("cti_decision_lineage_references");
        builder.HasKey(x => x.Id);

        builder.HasOne<CtiDecision>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CtiTransformationLineageRecord>()
            .WithMany()
            .HasForeignKey(x => x.LineageRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.DecisionId);
        builder.HasIndex(x => x.LineageRecordId);
        builder.HasIndex(x => new { x.DecisionId, x.LineageRecordId }).IsUnique();
    }
}
