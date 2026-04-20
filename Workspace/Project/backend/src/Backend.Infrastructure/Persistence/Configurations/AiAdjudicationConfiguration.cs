using Backend.Domain.AiAdjudication;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class AiAdjudicationRequestConfiguration : IEntityTypeConfiguration<AiAdjudicationRequest>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationRequest> builder)
    {
        builder.ToTable("ai_adjudication_requests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CaseId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.DetectionId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.IocType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.IocValue).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.DetectionPackageJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.SubmittedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.FailureCode).HasMaxLength(128);
        builder.Property(x => x.FailureMessage).HasMaxLength(2000);
        builder.Property(x => x.AttemptCount).HasDefaultValue(0).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(128);
        builder.Property(x => x.DatasetVersion).HasMaxLength(128);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasIndex(x => new { x.Status, x.SubmittedAtUtc });
        builder.HasIndex(x => x.CaseId);
        builder.HasIndex(x => x.CompletedAtUtc);
        builder.HasIndex(x => x.NextAttemptAtUtc);
    }
}

public sealed class AiAdjudicationJobConfiguration : IEntityTypeConfiguration<AiAdjudicationJob>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationJob> builder)
    {
        builder.ToTable("ai_adjudication_jobs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.ErrorCode).HasMaxLength(128);
        builder.Property(x => x.ErrorMessage).HasMaxLength(2000);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.AdjudicationRequestId, x.AttemptNumber }).IsUnique();
        builder.HasIndex(x => new { x.Status, x.QueuedAtUtc });
        builder.HasIndex(x => x.NextAttemptAtUtc);
    }
}

public sealed class AiAdjudicationResultConfiguration : IEntityTypeConfiguration<AiAdjudicationResult>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationResult> builder)
    {
        builder.ToTable("ai_adjudication_results", table =>
        {
            table.HasCheckConstraint("ck_ai_adjudication_results_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
            table.HasCheckConstraint("ck_ai_adjudication_results_false_positive_risk", "[FalsePositiveRisk] >= 0 AND [FalsePositiveRisk] <= 1");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Verdict).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Action).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.FalsePositiveRisk).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.ReviewPriority).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ReasonsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.ProvenanceJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.NextBestEvidenceJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.AbstainReason).HasMaxLength(1000);
        builder.Property(x => x.ModelVersion).HasMaxLength(128);
        builder.Property(x => x.DatasetVersion).HasMaxLength(128);
        builder.Property(x => x.RawPayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.AdjudicationRequestId).IsUnique();
        builder.HasIndex(x => x.ScoredAtUtc);
    }
}

public sealed class AiAdjudicationExplanationConfiguration : IEntityTypeConfiguration<AiAdjudicationExplanation>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationExplanation> builder)
    {
        builder.ToTable("ai_adjudication_explanations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.DecisionState).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RecommendedAction).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RationaleJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CitationsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.NextBestEvidenceJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.PolicyVersion).HasMaxLength(128);
        builder.Property(x => x.ModelVersion).HasMaxLength(128);
        builder.Property(x => x.DatasetVersion).HasMaxLength(128);
        builder.Property(x => x.RawPayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.AdjudicationRequestId).IsUnique();
        builder.HasIndex(x => x.GeneratedAtUtc);
    }
}

public sealed class AiActionPlanRecommendationConfiguration : IEntityTypeConfiguration<AiActionPlanRecommendation>
{
    public void Configure(EntityTypeBuilder<AiActionPlanRecommendation> builder)
    {
        builder.ToTable("ai_action_plan_recommendations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Summary).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.RecommendedActionsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.PrerequisitesJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CautionsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.RawPayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.AdjudicationRequestId).IsUnique();
        builder.HasIndex(x => x.GeneratedAtUtc);
    }
}

public sealed class AiAdjudicationOverrideConfiguration : IEntityTypeConfiguration<AiAdjudicationOverride>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationOverride> builder)
    {
        builder.ToTable("ai_adjudication_overrides");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ActionType).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(4000);
        builder.Property(x => x.OverrideVerdict).HasMaxLength(64);
        builder.Property(x => x.ClosureDisposition).HasMaxLength(128);
        builder.Property(x => x.PreviousStatus).HasMaxLength(64).IsRequired();
        builder.Property(x => x.NewStatus).HasMaxLength(64).IsRequired();
        builder.Property(x => x.SubmittedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.AdjudicationRequestId, x.SubmittedAtUtc });
    }
}

public sealed class AiAdjudicationSimilarDetectionConfiguration : IEntityTypeConfiguration<AiAdjudicationSimilarDetection>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationSimilarDetection> builder)
    {
        builder.ToTable("ai_adjudication_similar_detections", table =>
        {
            table.HasCheckConstraint("ck_ai_adjudication_similar_detections_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
            table.HasCheckConstraint("ck_ai_adjudication_similar_detections_similarity", "[SimilarityScore] >= 0 AND [SimilarityScore] <= 1");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.DetectionId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RuleId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.RelationType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.SimilarityScore).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.SimilarityReasonsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.PriorVerdictsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.PriorAcceptedActionsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.PriorOutcomesJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.AdjudicationRequestId, x.Rank });
        builder.HasIndex(x => new { x.AdjudicationRequestId, x.ObservedAtUtc });
    }
}

public sealed class AiAdjudicationEvidenceSourceConfiguration : IEntityTypeConfiguration<AiAdjudicationEvidenceSource>
{
    public void Configure(EntityTypeBuilder<AiAdjudicationEvidenceSource> builder)
    {
        builder.ToTable("ai_adjudication_evidence_sources", table =>
        {
            table.HasCheckConstraint("ck_ai_adjudication_evidence_sources_confidence", "[Confidence] IS NULL OR ([Confidence] >= 0 AND [Confidence] <= 1)");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Channel).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(256).IsRequired();
        builder.Property(x => x.EvidenceId).HasMaxLength(128);
        builder.Property(x => x.Reference).HasMaxLength(512);
        builder.Property(x => x.Category).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Polarity).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4);
        builder.Property(x => x.Summary).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Anchor).HasMaxLength(512).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();

        builder.HasOne<AiAdjudicationRequest>()
            .WithMany()
            .HasForeignKey(x => x.AdjudicationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.AdjudicationRequestId, x.Rank });
    }
}
