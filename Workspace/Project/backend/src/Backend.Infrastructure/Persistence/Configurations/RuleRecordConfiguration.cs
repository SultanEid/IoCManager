using Backend.Domain.Rules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class RuleRecordConfiguration : IEntityTypeConfiguration<RuleRecord>
{
    public void Configure(EntityTypeBuilder<RuleRecord> builder)
    {
        builder.ToTable("rule_records", table =>
        {
            table.HasCheckConstraint("ck_rule_records_linked_attack_techniques_json", "ISJSON([LinkedAttackTechniques]) = 1");
                table.HasCheckConstraint("ck_rule_records_rule_family", "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(32).IsRequired();
        builder.Property(x => x.RuleBody).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.Version).HasMaxLength(50).IsRequired();
        builder.Property(x => x.SourceOfOrigin).HasMaxLength(200).IsRequired();
        builder.Property(x => x.AuthorUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ReviewerUserId).HasMaxLength(128);
        var linkedAttackTechniques = builder.Property(x => x.LinkedAttackTechniques)
            .HasColumnType("nvarchar(max)")
            .HasConversion(StringArrayJsonConversion.Converter)
            .IsRequired();
        linkedAttackTechniques.Metadata.SetValueComparer(StringArrayJsonConversion.Comparer);
        builder.Property(x => x.LinkedCampaign).HasMaxLength(200);
        builder.Property(x => x.LinkedMalwareFamily).HasMaxLength(200);
        builder.Property(x => x.PredictedCoverage).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.PredictedFalsePositiveRisk).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.BlastRadius).HasMaxLength(128).IsRequired();
        builder.Property(x => x.LastValidationSummary).HasMaxLength(2000);
        builder.Property(x => x.BodyFingerprint).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<Backend.Domain.Cases.CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CaseId, x.Status });
        builder.HasIndex(x => new { x.CaseId, x.RuleFamily, x.Version });
        builder.HasIndex(x => new { x.CaseId, x.RuleFamily, x.BodyFingerprint });
    }
}

public sealed class RuleRevisionRecordConfiguration : IEntityTypeConfiguration<RuleRevisionRecord>
{
    public void Configure(EntityTypeBuilder<RuleRevisionRecord> builder)
    {
        builder.ToTable("rule_revision_records", table =>
        {
            table.HasCheckConstraint("ck_rule_revision_records_linked_attack_techniques_json", "ISJSON([LinkedAttackTechniques]) = 1");
                table.HasCheckConstraint("ck_rule_revision_records_rule_family", "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RevisionNumber).IsRequired();
        builder.Property(x => x.ChangeType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ChangeReason).HasMaxLength(2000);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.RuleFamily).HasMaxLength(32).IsRequired();
        builder.Property(x => x.RuleBody).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.Version).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.SourceOfOrigin).HasMaxLength(200).IsRequired();
        builder.Property(x => x.AuthorUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ReviewerUserId).HasMaxLength(128);
        var revisionLinkedAttackTechniques = builder.Property(x => x.LinkedAttackTechniques)
            .HasColumnType("nvarchar(max)")
            .HasConversion(StringArrayJsonConversion.Converter)
            .IsRequired();
        revisionLinkedAttackTechniques.Metadata.SetValueComparer(StringArrayJsonConversion.Comparer);
        builder.Property(x => x.LinkedCampaign).HasMaxLength(200);
        builder.Property(x => x.LinkedMalwareFamily).HasMaxLength(200);
        builder.Property(x => x.PredictedCoverage).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.PredictedFalsePositiveRisk).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.BlastRadius).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<RuleRecord>()
            .WithMany()
            .HasForeignKey(x => x.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RuleId, x.RevisionNumber }).IsUnique();
        builder.HasIndex(x => new { x.CaseId, x.CreatedAtUtc });
    }
}
