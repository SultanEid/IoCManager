using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260410190000_AddRuleRevisionValidationSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanPersistValidation",
                table: "rule_revisions_v2",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeploymentReady",
                table: "rule_revisions_v2",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ValidatedAtUtc",
                table: "rule_revisions_v2",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ValidationResultJson",
                table: "rule_revisions_v2",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.AddColumn<string>(
                name: "ValidationResultJson",
                table: "rule_import_attempts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.CreateIndex(
                name: "IX_rule_revisions_v2_IsDeploymentReady",
                table: "rule_revisions_v2",
                column: "IsDeploymentReady");

            migrationBuilder.Sql(
                """
                UPDATE [dbo].[rule_revisions_v2]
                SET
                    [ValidationResultJson] =
                    N'{"canPersist":false,"isDeploymentReady":false,"evaluatedAtUtc":"1970-01-01T00:00:00+00:00","stages":[{"stage":"syntax","passed":false,"capabilityDepth":"not_available","limitation":"Historical revision predates structured validation. Re-validate this revision to obtain actionable stage diagnostics.","diagnostics":[{"code":"validation.legacy.unavailable","severity":"note","message":"Historical revision predates structured validation. Re-validate this revision to obtain actionable stage diagnostics.","line":null,"column":null}]},{"stage":"metadata","passed":false,"capabilityDepth":"not_available","limitation":"Historical revision predates structured validation. Re-validate this revision to obtain actionable stage diagnostics.","diagnostics":[]},{"stage":"deployment_readiness","passed":false,"capabilityDepth":"not_available","limitation":"Historical revision predates structured validation. Re-validate this revision to obtain actionable stage diagnostics.","diagnostics":[]}]}',
                    [CanPersistValidation] = 0,
                    [IsDeploymentReady] = 0,
                    [ValidatedAtUtc] = NULL
                WHERE [ValidationResultJson] = N'{}' OR [ValidationResultJson] IS NULL;

                UPDATE [dbo].[rule_import_attempts]
                SET
                    [ValidationResultJson] =
                    N'{"canPersist":false,"isDeploymentReady":false,"evaluatedAtUtc":"1970-01-01T00:00:00+00:00","stages":[{"stage":"syntax","passed":false,"capabilityDepth":"not_available","limitation":"Historical import attempt predates structured validation. Re-run import for stage diagnostics.","diagnostics":[{"code":"validation.legacy.unavailable","severity":"note","message":"Historical import attempt predates structured validation. Re-run import for stage diagnostics.","line":null,"column":null}]},{"stage":"metadata","passed":false,"capabilityDepth":"not_available","limitation":"Historical import attempt predates structured validation. Re-run import for stage diagnostics.","diagnostics":[]},{"stage":"deployment_readiness","passed":false,"capabilityDepth":"not_available","limitation":"Historical import attempt predates structured validation. Re-run import for stage diagnostics.","diagnostics":[]}]}'
                WHERE [ValidationResultJson] = N'{}' OR [ValidationResultJson] IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_rule_revisions_v2_IsDeploymentReady",
                table: "rule_revisions_v2");

            migrationBuilder.DropColumn(
                name: "CanPersistValidation",
                table: "rule_revisions_v2");

            migrationBuilder.DropColumn(
                name: "IsDeploymentReady",
                table: "rule_revisions_v2");

            migrationBuilder.DropColumn(
                name: "ValidatedAtUtc",
                table: "rule_revisions_v2");

            migrationBuilder.DropColumn(
                name: "ValidationResultJson",
                table: "rule_revisions_v2");

            migrationBuilder.DropColumn(
                name: "ValidationResultJson",
                table: "rule_import_attempts");
        }
    }
}

