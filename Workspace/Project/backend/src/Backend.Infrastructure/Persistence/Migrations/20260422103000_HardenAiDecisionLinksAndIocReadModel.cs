using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260422103000_HardenAiDecisionLinksAndIocReadModel")]
    public partial class HardenAiDecisionLinksAndIocReadModel : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DetectionRecordId",
                table: "ai_decision_requests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE ar
                SET [DetectionRecordId] = sr.[Id]
                FROM [dbo].[ai_decision_requests] ar
                INNER JOIN [dbo].[scan_results] sr
                    ON TRY_CONVERT(uniqueidentifier, ar.[DetectionId]) = sr.[Id]
                WHERE ar.[DetectionRecordId] IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_DetectionId_SubmittedAtUtc",
                table: "ai_decision_requests",
                columns: new[] { "DetectionId", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_DetectionRecordId_SubmittedAtUtc",
                table: "ai_decision_requests",
                columns: new[] { "DetectionRecordId", "SubmittedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_ai_decision_requests_scan_results_DetectionRecordId",
                table: "ai_decision_requests",
                column: "DetectionRecordId",
                principalTable: "scan_results",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql(
                """
                CREATE VIEW [dbo].[vw_ai_latest_ioc_decisions]
                AS
                WITH ranked AS
                (
                    SELECT
                        sr.[IocId],
                        ar.[DetectionRecordId] AS [DetectionId],
                        ar.[Id] AS [DecisionRequestId],
                        ar.[SubmittedAtUtc],
                        ROW_NUMBER() OVER (
                            PARTITION BY sr.[IocId]
                            ORDER BY ar.[SubmittedAtUtc] DESC, ar.[Id] DESC
                        ) AS [rn]
                    FROM [dbo].[ai_decision_requests] ar
                    INNER JOIN [dbo].[scan_results] sr
                        ON sr.[Id] = ar.[DetectionRecordId]
                    WHERE sr.[IocId] IS NOT NULL
                )
                SELECT
                    [IocId],
                    [DetectionId],
                    [DecisionRequestId],
                    [SubmittedAtUtc]
                FROM ranked
                WHERE [rn] = 1;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[dbo].[vw_ai_latest_ioc_decisions]', N'V') IS NOT NULL
                    DROP VIEW [dbo].[vw_ai_latest_ioc_decisions];
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_ai_decision_requests_scan_results_DetectionRecordId",
                table: "ai_decision_requests");

            migrationBuilder.DropIndex(
                name: "IX_ai_decision_requests_DetectionId_SubmittedAtUtc",
                table: "ai_decision_requests");

            migrationBuilder.DropIndex(
                name: "IX_ai_decision_requests_DetectionRecordId_SubmittedAtUtc",
                table: "ai_decision_requests");

            migrationBuilder.DropColumn(
                name: "DetectionRecordId",
                table: "ai_decision_requests");
        }
    }
}

