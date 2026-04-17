using Backend.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class JobRunRecordConfiguration : IEntityTypeConfiguration<JobRunRecord>
{
    public void Configure(EntityTypeBuilder<JobRunRecord> builder)
    {
        builder.ToTable("job_run_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.JobType).HasConversion<string>().HasMaxLength(64).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.TriggeredBy).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Details).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasIndex(x => new { x.JobType, x.StartedAtUtc });
    }
}
