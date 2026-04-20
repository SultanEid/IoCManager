using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260411143000_AddRealScanPlanExecution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScheduleExpression",
                table: "scan_plans");

            migrationBuilder.AddColumn<string>(
                name: "CadenceType",
                table: "scan_plans",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.AddColumn<int>(
                name: "IntervalMinutes",
                table: "scan_plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastQueuedAtUtc",
                table: "scan_plans",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NextRunAtUtc",
                table: "scan_plans",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OperatorNotes",
                table: "scan_plans",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<int>(
                name: "RunAtHourUtc",
                table: "scan_plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RunAtMinuteUtc",
                table: "scan_plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RuleScopeType",
                table: "scan_plans",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RuleScopeValue",
                table: "scan_plans",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RuleSelectionMode",
                table: "scan_plans",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "RuleSet");

            migrationBuilder.AddColumn<string>(
                name: "ScannerCapability",
                table: "scan_plans",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Yara");

            migrationBuilder.AddColumn<int>(
                name: "WeeklyDayOfWeek",
                table: "scan_plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CancellationRequested",
                table: "scan_jobs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CancellationRequestedAtUtc",
                table: "scan_jobs",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "scan_jobs",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "scan_job_target_executions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScanJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetHostname = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TargetIpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ScannerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ScannerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_job_target_executions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scan_job_target_executions_scan_jobs_ScanJobId",
                        column: x => x.ScanJobId,
                        principalTable: "scan_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_scan_job_target_executions_scanners_ScannerId",
                        column: x => x.ScannerId,
                        principalTable: "scanners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_scan_job_target_executions_target_servers_TargetServerId",
                        column: x => x.TargetServerId,
                        principalTable: "target_servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                """
UPDATE [scan_jobs]
SET [Status] = N'Cancelled'
WHERE [Status] = N'Canceled';
""");

            migrationBuilder.CreateIndex(
                name: "IX_scan_job_target_executions_ScanJobId_TargetServerId",
                table: "scan_job_target_executions",
                columns: new[] { "ScanJobId", "TargetServerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scan_job_target_executions_ScannerId",
                table: "scan_job_target_executions",
                column: "ScannerId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_job_target_executions_Status",
                table: "scan_job_target_executions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_scan_job_target_executions_TargetServerId_CompletedAtUtc",
                table: "scan_job_target_executions",
                columns: new[] { "TargetServerId", "CompletedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_plans_ScannerCapability_CadenceType",
                table: "scan_plans",
                columns: new[] { "ScannerCapability", "CadenceType" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_plans_Status_NextRunAtUtc",
                table: "scan_plans",
                columns: new[] { "Status", "NextRunAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scan_job_target_executions");

            migrationBuilder.DropIndex(
                name: "IX_scan_plans_ScannerCapability_CadenceType",
                table: "scan_plans");

            migrationBuilder.DropIndex(
                name: "IX_scan_plans_Status_NextRunAtUtc",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "CadenceType",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "IntervalMinutes",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "LastQueuedAtUtc",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "NextRunAtUtc",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "OperatorNotes",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "RunAtHourUtc",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "RunAtMinuteUtc",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "RuleScopeType",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "RuleScopeValue",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "RuleSelectionMode",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "ScannerCapability",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "WeeklyDayOfWeek",
                table: "scan_plans");

            migrationBuilder.DropColumn(
                name: "CancellationRequested",
                table: "scan_jobs");

            migrationBuilder.DropColumn(
                name: "CancellationRequestedAtUtc",
                table: "scan_jobs");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "scan_jobs");

            migrationBuilder.AddColumn<string>(
                name: "ScheduleExpression",
                table: "scan_plans",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "@daily");
        }
    }
}
