using Backend.Domain.Feedback;
using Backend.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class FeedbackRecordConfiguration : IEntityTypeConfiguration<FeedbackRecord>
{
    public void Configure(EntityTypeBuilder<FeedbackRecord> builder)
    {
        builder.ToTable("feedback_records", table =>
        {
            table.HasCheckConstraint("ck_feedback_records_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
            table.HasCheckConstraint("ck_feedback_records_false_positive_risk", "[FalsePositiveRisk] >= 0 AND [FalsePositiveRisk] <= 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Verdict)
            .HasConversion(
                value => FeedbackTaxonomy.ToWireValue(value),
                value => FeedbackTaxonomy.ParseVerdictOrThrow(value, nameof(FeedbackRecord.Verdict)))
            .HasMaxLength(32)
            .IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.FalsePositiveRisk).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.ReviewPriority).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(x => x.ShouldPromoteToIndicator).IsRequired();
        builder.Property(x => x.ShouldSuppress).IsRequired();
        builder.Property(x => x.ShouldAllowlist).IsRequired();
        builder.Property(x => x.ShouldEscalate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.SubmittedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<Backend.Domain.Cases.CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Backend.Domain.Decisions.DecisionRecord>()
            .WithMany()
            .HasForeignKey(x => x.DecisionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.CaseId, x.CreatedAtUtc });
        builder.HasIndex(x => x.DecisionId);
    }
}
