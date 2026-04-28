using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260428010000_AddAlertIocProgress")]
    public partial class AddAlertIocProgress : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "alert_iocs",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Open");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StatusUpdatedAtUtc",
                table: "alert_iocs",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusUpdatedByUserId",
                table: "alert_iocs",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "system");

            migrationBuilder.Sql(
                "UPDATE [alert_iocs] SET [StatusUpdatedAtUtc] = [LinkedAtUtc] WHERE [StatusUpdatedAtUtc] IS NULL");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "StatusUpdatedAtUtc",
                table: "alert_iocs",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)),
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset",
                oldNullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "alert_iocs");

            migrationBuilder.DropColumn(
                name: "StatusUpdatedAtUtc",
                table: "alert_iocs");

            migrationBuilder.DropColumn(
                name: "StatusUpdatedByUserId",
                table: "alert_iocs");
        }
    }
}
