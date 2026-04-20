using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    public partial class RenameLokiToSuricata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_records_rule_family",
                table: "rule_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_revision_records_rule_family",
                table: "rule_revision_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_proposals_rule_family",
                table: "rule_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_cti_rule_proposals_rule_family",
                table: "cti_rule_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_artifacts_rule_family",
                table: "rule_artifacts");

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[rule_records]
                SET [RuleFamily] = 'suricata'
                WHERE LOWER([RuleFamily]) = 'loki';

                UPDATE [dbo].[rule_revision_records]
                SET [RuleFamily] = 'suricata'
                WHERE LOWER([RuleFamily]) = 'loki';

                UPDATE [dbo].[rule_proposals]
                SET [RuleFamily] = 'suricata'
                WHERE LOWER([RuleFamily]) = 'loki';

                UPDATE [dbo].[cti_rule_proposals]
                SET [RuleFamily] = 'suricata'
                WHERE LOWER([RuleFamily]) = 'loki';

                UPDATE [dbo].[rule_artifacts]
                SET [RuleFamily] = 'suricata'
                WHERE LOWER([RuleFamily]) = 'loki';
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_records_rule_family",
                table: "rule_records",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_revision_records_rule_family",
                table: "rule_revision_records",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_proposals_rule_family",
                table: "rule_proposals",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_cti_rule_proposals_rule_family",
                table: "cti_rule_proposals",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_artifacts_rule_family",
                table: "rule_artifacts",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'suricata')");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_records_rule_family",
                table: "rule_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_revision_records_rule_family",
                table: "rule_revision_records");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_proposals_rule_family",
                table: "rule_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_cti_rule_proposals_rule_family",
                table: "cti_rule_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_rule_artifacts_rule_family",
                table: "rule_artifacts");

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[rule_records]
                SET [RuleFamily] = 'loki'
                WHERE LOWER([RuleFamily]) = 'suricata';

                UPDATE [dbo].[rule_revision_records]
                SET [RuleFamily] = 'loki'
                WHERE LOWER([RuleFamily]) = 'suricata';

                UPDATE [dbo].[rule_proposals]
                SET [RuleFamily] = 'loki'
                WHERE LOWER([RuleFamily]) = 'suricata';

                UPDATE [dbo].[cti_rule_proposals]
                SET [RuleFamily] = 'loki'
                WHERE LOWER([RuleFamily]) = 'suricata';

                UPDATE [dbo].[rule_artifacts]
                SET [RuleFamily] = 'loki'
                WHERE LOWER([RuleFamily]) = 'suricata';
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_records_rule_family",
                table: "rule_records",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_revision_records_rule_family",
                table: "rule_revision_records",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_proposals_rule_family",
                table: "rule_proposals",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_cti_rule_proposals_rule_family",
                table: "cti_rule_proposals",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_rule_artifacts_rule_family",
                table: "rule_artifacts",
                sql: "LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki')");
        }
    }
}
