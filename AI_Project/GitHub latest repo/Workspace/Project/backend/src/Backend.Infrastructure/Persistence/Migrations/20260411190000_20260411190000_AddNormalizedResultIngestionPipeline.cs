using System;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260411190000_20260411190000_AddNormalizedResultIngestionPipeline")]
    /// <inheritdoc />
    public partial class _20260411190000_AddNormalizedResultIngestionPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FirstObservedAtUtc",
                table: "scan_results",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Unspecified), TimeSpan.Zero));

            migrationBuilder.AddColumn<string>(
                name: "Fingerprint",
                table: "scan_results",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: string.Empty);

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
                defaultValue: new DateTimeOffset(new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Unspecified), TimeSpan.Zero));

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
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "RawSampleJson",
                table: "scan_results",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: string.Empty);

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
                defaultValue: "yara");

            migrationBuilder.AddColumn<Guid>(
                name: "TargetExecutionId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "JobAttemptId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

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
                    RequestPayloadHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
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
                    RawSnippetHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RawPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
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
                    RawPayloadHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RawSampleJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrelationMetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScanJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    JobAttemptId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetExecutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
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

            migrationBuilder.Sql(
                """
UPDATE [scan_results]
SET [FirstObservedAtUtc] = [ObservedAtUtc],
    [LastObservedAtUtc] = [ObservedAtUtc],
    [Fingerprint] = LOWER(CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varchar(36), [Id])), 2))
WHERE [Fingerprint] = N'';
""");

            migrationBuilder.Sql(
                """
UPDATE sr
SET [ScannerFamily] = COALESCE(LOWER(ra.[RuleFamily]), N'yara')
FROM [scan_results] sr
LEFT JOIN [rule_revisions_v2] rr ON rr.[Id] = sr.[RuleRevisionId]
LEFT JOIN [rule_artifacts] ra ON ra.[Id] = rr.[RuleArtifactId];
""");

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
                name: "FK_scan_results_scan_job_target_executions_TargetExecutionId",
                table: "scan_results");

            migrationBuilder.DropForeignKey(
                name: "FK_scan_results_scan_jobs_ScanJobId",
                table: "scan_results");

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

            migrationBuilder.DropColumn(
                name: "FirstObservedAtUtc",
                table: "scan_results");

            migrationBuilder.DropColumn(
                name: "Fingerprint",
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

            migrationBuilder.AlterColumn<Guid>(
                name: "JobAttemptId",
                table: "scan_results",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: Guid.Empty,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
