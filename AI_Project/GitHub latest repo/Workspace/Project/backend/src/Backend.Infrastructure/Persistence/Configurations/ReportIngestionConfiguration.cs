using Backend.Domain.Reports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

public sealed class ReportIngestionRunConfiguration : IEntityTypeConfiguration<ReportIngestionRun>
{
    public void Configure(EntityTypeBuilder<ReportIngestionRun> builder)
    {
        builder.ToTable("report_ingestion_runs", table =>
        {
            table.HasCheckConstraint("ck_report_ingestion_runs_input_payload_json", "ISJSON([InputPayloadJson]) = 1");
            table.HasCheckConstraint("ck_report_ingestion_runs_output_payload_json", "ISJSON([OutputPayloadJson]) = 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReportId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.SourceName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.SourceType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.DocumentId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.DocumentUrl).HasMaxLength(2000);
        builder.Property(x => x.InputPayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.OutputPayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<Backend.Domain.Cases.CaseRecord>()
            .WithMany()
            .HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Backend.Domain.Cti.V1.Persistence.CtiDecisionBundle>()
            .WithMany()
            .HasForeignKey(x => x.DecisionBundleId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.CaseId, x.ProcessedAtUtc });
        builder.HasIndex(x => x.DecisionBundleId);
        builder.HasIndex(x => x.ReportId);
    }
}

public sealed class ReportIngestionClaimConfiguration : IEntityTypeConfiguration<ReportIngestionClaim>
{
    public void Configure(EntityTypeBuilder<ReportIngestionClaim> builder)
    {
        builder.ToTable("report_ingestion_claims", table =>
        {
            table.HasCheckConstraint("ck_report_ingestion_claims_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
            table.HasCheckConstraint("ck_report_ingestion_claims_offsets", "[SourceStartOffset] IS NULL OR [SourceEndOffset] IS NULL OR [SourceEndOffset] >= [SourceStartOffset]");
            table.HasCheckConstraint("ck_report_ingestion_claims_abstain_reason_codes_json", "ISJSON([AbstainReasonCodesJson]) = 1");
            table.HasCheckConstraint("ck_report_ingestion_claims_citations_json", "ISJSON([CitationsJson]) = 1");
        });
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ClaimId).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ClaimType).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Statement).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.Snippet).HasMaxLength(400).IsRequired();
        builder.Property(x => x.ExtractionMethod).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Confidence).HasPrecision(5, 4).IsRequired();
        builder.Property(x => x.AbstainReasonCodesJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CitationsJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedByUserId).HasMaxLength(128).IsRequired();
        builder.Property<byte[]>("RowVersion").IsRowVersion().IsConcurrencyToken();

        builder.HasOne<ReportIngestionRun>()
            .WithMany(x => x.Claims)
            .HasForeignKey(x => x.IngestionRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Backend.Domain.Cti.V1.Persistence.CtiEvidenceAssertion>()
            .WithMany()
            .HasForeignKey(x => x.EvidenceAssertionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.IngestionRunId);
        builder.HasIndex(x => new { x.IngestionRunId, x.ClaimId }).IsUnique();
        builder.HasIndex(x => x.EvidenceAssertionId);
    }
}
