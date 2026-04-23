using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIocDrivenAlerts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_scan_results_job_attempts_JobAttemptId",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_IocId",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_RuleRevisionId",
                table: "scan_results");

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedByUserId",
                table: "scan_results",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<Guid>(
                name: "JobAttemptId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "Fingerprint",
                table: "scan_results",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FirstObservedAtUtc",
                table: "scan_results",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<bool>(
                name: "IsExecutionArtifact",
                table: "scan_results",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastObservedAtUtc",
                table: "scan_results",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<int>(
                name: "OccurrenceCount",
                table: "scan_results",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "RawPayloadHash",
                table: "scan_results",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RawSampleJson",
                table: "scan_results",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ScanJobId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScannerFamily",
                table: "scan_results",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "TargetExecutionId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RuleName",
                table: "alerts_v2",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ScannerFamily",
                table: "alerts_v2",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TargetDisplay",
                table: "alerts_v2",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "TargetId",
                table: "alerts_v2",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "alert_iocs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IocId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LinkedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_iocs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_alert_iocs_alerts_v2_AlertId",
                        column: x => x.AlertId,
                        principalTable: "alerts_v2",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scan_result_ingestion_runs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TotalRows = table.Column<int>(type: "int", nullable: false),
                    AcceptedRows = table.Column<int>(type: "int", nullable: false),
                    DeduplicatedRows = table.Column<int>(type: "int", nullable: false),
                    RejectedRows = table.Column<int>(type: "int", nullable: false),
                    RequestPayloadHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, defaultValue: ""),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_result_ingestion_runs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "scan_result_ingestion_diagnostics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngestionRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RowIndex = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Field = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RawSnippetHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, defaultValue: ""),
                    RawPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: ""),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_result_ingestion_diagnostics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scan_result_ingestion_diagnostics_scan_result_ingestion_runs_IngestionRunId",
                        column: x => x.IngestionRunId,
                        principalTable: "scan_result_ingestion_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scan_result_provenances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScanResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngestionRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RowIndex = table.Column<int>(type: "int", nullable: false),
                    IsDuplicate = table.Column<bool>(type: "bit", nullable: false),
                    ObservedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RawPayloadHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, defaultValue: ""),
                    RawSampleJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: ""),
                    CorrelationMetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "{}"),
                    ScanJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    JobAttemptId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetExecutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_result_provenances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scan_result_provenances_job_attempts_JobAttemptId",
                        column: x => x.JobAttemptId,
                        principalTable: "job_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_scan_result_provenances_scan_job_target_executions_TargetExecutionId",
                        column: x => x.TargetExecutionId,
                        principalTable: "scan_job_target_executions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_scan_result_provenances_scan_jobs_ScanJobId",
                        column: x => x.ScanJobId,
                        principalTable: "scan_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_scan_result_provenances_scan_result_ingestion_runs_IngestionRunId",
                        column: x => x.IngestionRunId,
                        principalTable: "scan_result_ingestion_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_scan_result_provenances_scan_results_ScanResultId",
                        column: x => x.ScanResultId,
                        principalTable: "scan_results",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_Fingerprint",
                table: "scan_results",
                column: "Fingerprint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_IocId_ObservedAtUtc",
                table: "scan_results",
                columns: new[] { "IocId", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_RuleRevisionId_ObservedAtUtc",
                table: "scan_results",
                columns: new[] { "RuleRevisionId", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_ScanJobId",
                table: "scan_results",
                column: "ScanJobId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_ScannerFamily_ObservedAtUtc",
                table: "scan_results",
                columns: new[] { "ScannerFamily", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_TargetExecutionId",
                table: "scan_results",
                column: "TargetExecutionId");

            migrationBuilder.CreateIndex(
                name: "IX_alerts_v2_ScannerFamily_LastDetectedAtUtc",
                table: "alerts_v2",
                columns: new[] { "ScannerFamily", "LastDetectedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_alerts_v2_TargetId_ScannerFamily_RuleName_Status",
                table: "alerts_v2",
                columns: new[] { "TargetId", "ScannerFamily", "RuleName", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_alert_iocs_AlertId_IocId",
                table: "alert_iocs",
                columns: new[] { "AlertId", "IocId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_alert_iocs_IocId",
                table: "alert_iocs",
                column: "IocId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_ingestion_diagnostics_IngestionRunId_RowIndex",
                table: "scan_result_ingestion_diagnostics",
                columns: new[] { "IngestionRunId", "RowIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_ingestion_runs_Source_CreatedAtUtc",
                table: "scan_result_ingestion_runs",
                columns: new[] { "Source", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_provenances_IngestionRunId_RowIndex",
                table: "scan_result_provenances",
                columns: new[] { "IngestionRunId", "RowIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_provenances_JobAttemptId",
                table: "scan_result_provenances",
                column: "JobAttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_provenances_ScanJobId",
                table: "scan_result_provenances",
                column: "ScanJobId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_provenances_ScanResultId_ObservedAtUtc",
                table: "scan_result_provenances",
                columns: new[] { "ScanResultId", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_result_provenances_TargetExecutionId",
                table: "scan_result_provenances",
                column: "TargetExecutionId");

            migrationBuilder.AddForeignKey(
                name: "FK_scan_results_job_attempts_JobAttemptId",
                table: "scan_results",
                column: "JobAttemptId",
                principalTable: "job_attempts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_scan_results_scan_job_target_executions_TargetExecutionId",
                table: "scan_results",
                column: "TargetExecutionId",
                principalTable: "scan_job_target_executions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_scan_results_scan_jobs_ScanJobId",
                table: "scan_results",
                column: "ScanJobId",
                principalTable: "scan_jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_scan_results_job_attempts_JobAttemptId",
                table: "scan_results");

            migrationBuilder.DropForeignKey(
                name: "FK_scan_results_scan_job_target_executions_TargetExecutionId",
                table: "scan_results");

            migrationBuilder.DropForeignKey(
                name: "FK_scan_results_scan_jobs_ScanJobId",
                table: "scan_results");

            migrationBuilder.DropTable(
                name: "alert_iocs");

            migrationBuilder.DropTable(
                name: "scan_result_ingestion_diagnostics");

            migrationBuilder.DropTable(
                name: "scan_result_provenances");

            migrationBuilder.DropTable(
                name: "scan_result_ingestion_runs");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_Fingerprint",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_IocId_ObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_RuleRevisionId_ObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_ScanJobId",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_ScannerFamily_ObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_scan_results_TargetExecutionId",
                table: "scan_results");

            migrationBuilder.DropIndex(
                name: "IX_alerts_v2_ScannerFamily_LastDetectedAtUtc",
                table: "alerts_v2");

            migrationBuilder.DropIndex(
                name: "IX_alerts_v2_TargetId_ScannerFamily_RuleName_Status",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "Fingerprint",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "FirstObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "IsExecutionArtifact",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "LastObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "OccurrenceCount",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "RawPayloadHash",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "RawSampleJson",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "ScanJobId",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "ScannerFamily",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "TargetExecutionId",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "RuleName",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "ScannerFamily",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "TargetDisplay",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "TargetId",
                table: "alerts_v2");

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedByUserId",
                table: "scan_results",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(128)",
                oldMaxLength: 128);

            migrationBuilder.AlterColumn<Guid>(
                name: "JobAttemptId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_IocId",
                table: "scan_results",
                column: "IocId");

            migrationBuilder.CreateIndex(
                name: "IX_scan_results_RuleRevisionId",
                table: "scan_results",
                column: "RuleRevisionId");

            migrationBuilder.AddForeignKey(
                name: "FK_scan_results_job_attempts_JobAttemptId",
                table: "scan_results",
                column: "JobAttemptId",
                principalTable: "job_attempts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
