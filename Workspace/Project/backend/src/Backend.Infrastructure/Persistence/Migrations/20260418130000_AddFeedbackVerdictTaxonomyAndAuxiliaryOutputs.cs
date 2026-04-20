using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260418130000_AddFeedbackVerdictTaxonomyAndAuxiliaryOutputs")]
    public partial class AddFeedbackVerdictTaxonomyAndAuxiliaryOutputs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Confidence",
                table: "feedback_records",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5000m);

            migrationBuilder.AddColumn<decimal>(
                name: "FalsePositiveRisk",
                table: "feedback_records",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5000m);

            migrationBuilder.AddColumn<string>(
                name: "ReviewPriority",
                table: "feedback_records",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<bool>(
                name: "ShouldAllowlist",
                table: "feedback_records",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldEscalate",
                table: "feedback_records",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldPromoteToIndicator",
                table: "feedback_records",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldSuppress",
                table: "feedback_records",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Confidence",
                table: "cti_feedback",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5000m);

            migrationBuilder.AddColumn<decimal>(
                name: "FalsePositiveRisk",
                table: "cti_feedback",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5000m);

            migrationBuilder.AddColumn<string>(
                name: "ReviewPriority",
                table: "cti_feedback",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<bool>(
                name: "ShouldAllowlist",
                table: "cti_feedback",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldEscalate",
                table: "cti_feedback",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldPromoteToIndicator",
                table: "cti_feedback",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShouldSuppress",
                table: "cti_feedback",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[feedback_records]
                SET [Verdict] =
                    CASE LOWER([Verdict])
                        WHEN 'confirmedthreat' THEN 'malicious'
                        WHEN 'confirmed_malicious' THEN 'malicious'
                        WHEN 'true_positive' THEN 'malicious'
                        WHEN 'escalated' THEN 'malicious'
                        WHEN 'benign' THEN 'benign'
                        WHEN 'needsmoreevidence' THEN 'insufficient_evidence'
                        WHEN 'insufficientevidence' THEN 'insufficient_evidence'
                        WHEN 'likelymalicious' THEN 'likely_malicious'
                        WHEN 'likelybenign' THEN 'likely_benign'
                        WHEN 'falsepositive' THEN 'false_positive'
                        WHEN 'staleorrevoked' THEN 'stale_or_revoked'
                        ELSE LOWER([Verdict])
                    END;

                UPDATE [dbo].[cti_feedback]
                SET [Verdict] =
                    CASE LOWER([Verdict])
                        WHEN 'confirmedthreat' THEN 'malicious'
                        WHEN 'confirmed_malicious' THEN 'malicious'
                        WHEN 'true_positive' THEN 'malicious'
                        WHEN 'escalated' THEN 'malicious'
                        WHEN 'benign' THEN 'benign'
                        WHEN 'needsmoreevidence' THEN 'insufficient_evidence'
                        WHEN 'insufficientevidence' THEN 'insufficient_evidence'
                        WHEN 'likelymalicious' THEN 'likely_malicious'
                        WHEN 'likelybenign' THEN 'likely_benign'
                        WHEN 'falsepositive' THEN 'false_positive'
                        WHEN 'staleorrevoked' THEN 'stale_or_revoked'
                        ELSE LOWER([Verdict])
                    END;
                """);

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[feedback_records]
                SET
                    [Confidence] = 0.5000,
                    [FalsePositiveRisk] = 0.5000,
                    [ReviewPriority] = N'Medium',
                    [ShouldPromoteToIndicator] = CASE WHEN [Verdict] IN (N'suspicious', N'likely_malicious', N'malicious') THEN 1 ELSE 0 END,
                    [ShouldSuppress] = CASE WHEN [Verdict] IN (N'false_positive', N'stale_or_revoked') THEN 1 ELSE 0 END,
                    [ShouldAllowlist] = CASE WHEN [Verdict] IN (N'benign', N'likely_benign', N'false_positive') THEN 1 ELSE 0 END,
                    [ShouldEscalate] = CASE WHEN [Verdict] IN (N'suspicious', N'likely_malicious', N'malicious', N'insufficient_evidence') THEN 1 ELSE 0 END;

                UPDATE [dbo].[cti_feedback]
                SET
                    [Confidence] = 0.5000,
                    [FalsePositiveRisk] = 0.5000,
                    [ReviewPriority] = N'Medium',
                    [ShouldPromoteToIndicator] = CASE WHEN [Verdict] IN (N'suspicious', N'likely_malicious', N'malicious') THEN 1 ELSE 0 END,
                    [ShouldSuppress] = CASE WHEN [Verdict] IN (N'false_positive', N'stale_or_revoked') THEN 1 ELSE 0 END,
                    [ShouldAllowlist] = CASE WHEN [Verdict] IN (N'benign', N'likely_benign', N'false_positive') THEN 1 ELSE 0 END,
                    [ShouldEscalate] = CASE WHEN [Verdict] IN (N'suspicious', N'likely_malicious', N'malicious', N'insufficient_evidence') THEN 1 ELSE 0 END;
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_feedback_records_confidence",
                table: "feedback_records",
                sql: "[Confidence] >= 0 AND [Confidence] <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_feedback_records_false_positive_risk",
                table: "feedback_records",
                sql: "[FalsePositiveRisk] >= 0 AND [FalsePositiveRisk] <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_cti_feedback_confidence",
                table: "cti_feedback",
                sql: "[Confidence] >= 0 AND [Confidence] <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_cti_feedback_false_positive_risk",
                table: "cti_feedback",
                sql: "[FalsePositiveRisk] >= 0 AND [FalsePositiveRisk] <= 1");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_feedback_records_confidence",
                table: "feedback_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_feedback_records_false_positive_risk",
                table: "feedback_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_cti_feedback_confidence",
                table: "cti_feedback");

            migrationBuilder.DropCheckConstraint(
                name: "ck_cti_feedback_false_positive_risk",
                table: "cti_feedback");

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[feedback_records]
                SET [Verdict] =
                    CASE
                        WHEN [Verdict] = N'benign' THEN N'Benign'
                        WHEN [Verdict] IN (N'malicious', N'likely_malicious', N'suspicious') THEN N'ConfirmedThreat'
                        ELSE N'NeedsMoreEvidence'
                    END;

                UPDATE [dbo].[cti_feedback]
                SET [Verdict] =
                    CASE
                        WHEN [Verdict] = N'benign' THEN N'Benign'
                        WHEN [Verdict] IN (N'malicious', N'likely_malicious', N'suspicious') THEN N'ConfirmedThreat'
                        ELSE N'NeedsMoreEvidence'
                    END;
                """);

            migrationBuilder.DropColumn(
                name: "Confidence",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "FalsePositiveRisk",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "ReviewPriority",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "ShouldAllowlist",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "ShouldEscalate",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "ShouldPromoteToIndicator",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "ShouldSuppress",
                table: "feedback_records");

            migrationBuilder.DropColumn(
                name: "Confidence",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "FalsePositiveRisk",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "ReviewPriority",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "ShouldAllowlist",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "ShouldEscalate",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "ShouldPromoteToIndicator",
                table: "cti_feedback");

            migrationBuilder.DropColumn(
                name: "ShouldSuppress",
                table: "cti_feedback");
        }
    }
}
