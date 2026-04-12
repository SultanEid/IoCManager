using Backend.Domain.Decisions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class DecisionRecordConfiguration : IEntityTypeConfiguration<DecisionRecord>
{
    public void Configure(EntityTypeBuilder<DecisionRecord> builder)
    {
        builder.ToTable("decision_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.State).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.RecommendedAction).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ApprovalTierRequired).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.PolicyVersion).HasMaxLength(100).IsRequired();
        builder.Property(x => x.ModelVersion).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Reasoning).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.ApprovedByUserId).HasMaxLength(128);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<Backend.Domain.Cases.CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.State });
    }
}
