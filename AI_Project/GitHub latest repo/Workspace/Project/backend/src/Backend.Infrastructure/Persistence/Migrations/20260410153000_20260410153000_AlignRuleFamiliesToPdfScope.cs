using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260410153000_AlignRuleFamiliesToPdfScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1
                    FROM [dbo].[rule_artifacts]
                    WHERE LOWER([RuleFamily]) IN ('suricata', 'loki')
                    GROUP BY [Name]
                    HAVING COUNT(DISTINCT CASE WHEN LOWER([RuleFamily]) = 'suricata' THEN 'loki' ELSE LOWER([RuleFamily]) END) > 1
                )
                BEGIN
                    DECLARE @conflicts NVARCHAR(MAX);
                    SELECT @conflicts = STRING_AGG(CONVERT(NVARCHAR(400), [Name]), N', ')
                    FROM (
                        SELECT [Name]
                        FROM [dbo].[rule_artifacts]
                        WHERE LOWER([RuleFamily]) IN ('suricata', 'loki')
                        GROUP BY [Name]
                        HAVING COUNT(DISTINCT CASE WHEN LOWER([RuleFamily]) = 'suricata' THEN 'loki' ELSE LOWER([RuleFamily]) END) > 1
                    ) AS conflict_names;

                    DECLARE @message NVARCHAR(2048) = N'Rule family migration conflict in rule_artifacts for names: ' + ISNULL(@conflicts, N'<unknown>');
                    THROW 50001, @message, 1;
                END
                """);

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[rule_records]
                SET [RuleFamily] = CASE LOWER([RuleFamily])
                    WHEN 'suricata' THEN 'loki'
                    ELSE LOWER([RuleFamily])
                END
                WHERE LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki', 'suricata');

                UPDATE [dbo].[rule_revision_records]
                SET [RuleFamily] = CASE LOWER([RuleFamily])
                    WHEN 'suricata' THEN 'loki'
                    ELSE LOWER([RuleFamily])
                END
                WHERE LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki', 'suricata');

                UPDATE [dbo].[rule_proposals]
                SET [RuleFamily] = CASE LOWER([RuleFamily])
                    WHEN 'suricata' THEN 'loki'
                    ELSE LOWER([RuleFamily])
                END
                WHERE LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki', 'suricata');

                UPDATE [dbo].[cti_rule_proposals]
                SET [RuleFamily] = CASE LOWER([RuleFamily])
                    WHEN 'suricata' THEN 'loki'
                    ELSE LOWER([RuleFamily])
                END
                WHERE LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki', 'suricata');

                UPDATE [dbo].[rule_artifacts]
                SET [RuleFamily] = CASE LOWER([RuleFamily])
                    WHEN 'suricata' THEN 'loki'
                    ELSE LOWER([RuleFamily])
                END
                WHERE LOWER([RuleFamily]) IN ('yara', 'sigma', 'snort', 'loki', 'suricata');
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

        /// <inheritdoc />
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
        }
    }
}
