using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260430112752_AddAlertOwnerEmailUpdates")]
    public partial class AddAlertOwnerEmailUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnerDisplayName",
                table: "alerts_v2",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OwnerEmail",
                table: "alerts_v2",
                type: "nvarchar(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "alert_email_updates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: false),
                    ToEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    CcEmailsJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    DeliveryStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    FailureDetail = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SentAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_email_updates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_alert_email_updates_alerts_v2_AlertId",
                        column: x => x.AlertId,
                        principalTable: "alerts_v2",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alerts_v2_OwnerUserId",
                table: "alerts_v2",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_alert_email_updates_AlertId_CreatedAtUtc",
                table: "alert_email_updates",
                columns: new[] { "AlertId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_alert_email_updates_DeliveryStatus",
                table: "alert_email_updates",
                column: "DeliveryStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alert_email_updates");

            migrationBuilder.DropIndex(
                name: "IX_alerts_v2_OwnerUserId",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "OwnerDisplayName",
                table: "alerts_v2");

            migrationBuilder.DropColumn(
                name: "OwnerEmail",
                table: "alerts_v2");
        }
    }
}
