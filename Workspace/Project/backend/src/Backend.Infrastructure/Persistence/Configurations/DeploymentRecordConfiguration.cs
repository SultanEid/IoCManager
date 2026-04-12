using Backend.Domain.Deployments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class DeploymentRecordConfiguration : IEntityTypeConfiguration<DeploymentRecord>
{
    public void Configure(EntityTypeBuilder<DeploymentRecord> builder)
    {
        builder.ToTable("deployment_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TargetEnvironment).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.RequestedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ApprovedByUserId).HasMaxLength(128);
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<Backend.Domain.Cases.CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Backend.Domain.Rules.RuleRecord>()
            .WithMany()
            .HasForeignKey(x => x.RuleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CaseId, x.Status });
        builder.HasIndex(x => x.RuleId);
    }
}
