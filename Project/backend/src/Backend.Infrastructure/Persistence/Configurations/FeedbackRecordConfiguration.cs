using Backend.Domain.Feedback;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class FeedbackRecordConfiguration : IEntityTypeConfiguration<FeedbackRecord>
{
    public void Configure(EntityTypeBuilder<FeedbackRecord> builder)
    {
        builder.ToTable("feedback_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Verdict).HasConversion<string>().HasMaxLength(32).IsRequired();
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
