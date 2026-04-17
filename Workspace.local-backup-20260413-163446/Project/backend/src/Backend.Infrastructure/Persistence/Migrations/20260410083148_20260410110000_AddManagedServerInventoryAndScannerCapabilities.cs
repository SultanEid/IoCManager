using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260410110000_AddManagedServerInventoryAndScannerCapabilities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConnectivityStatus",
                table: "target_servers",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Unknown");

            migrationBuilder.AddColumn<string>(
                name: "ConnectionAuthMode",
                table: "target_servers",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConnectionHost",
                table: "target_servers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<int>(
                name: "ConnectionPort",
                table: "target_servers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConnectionProtocol",
                table: "target_servers",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ConnectionSecretUpdatedAtUtc",
                table: "target_servers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConnectionUsername",
                table: "target_servers",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastContactUtc",
                table: "target_servers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastHeartbeatUtc",
                table: "target_servers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "scanner_capability_bindings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScannerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Capability = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AddedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AddedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scanner_capability_bindings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scanner_capability_bindings_scanners_ScannerId",
                        column: x => x.ScannerId,
                        principalTable: "scanners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "target_server_connection_secrets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncryptedPayload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RotatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_target_server_connection_secrets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_target_server_connection_secrets_target_servers_TargetServerId",
                        column: x => x.TargetServerId,
                        principalTable: "target_servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "target_server_scanner_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScannerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConnectivityStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LastHeartbeatUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastContactUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_target_server_scanner_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_target_server_scanner_assignments_scanners_ScannerId",
                        column: x => x.ScannerId,
                        principalTable: "scanners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_target_server_scanner_assignments_target_servers_TargetServerId",
                        column: x => x.TargetServerId,
                        principalTable: "target_servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_scanner_capability_bindings_Capability",
                table: "scanner_capability_bindings",
                column: "Capability");

            migrationBuilder.CreateIndex(
                name: "IX_scanner_capability_bindings_ScannerId_Capability",
                table: "scanner_capability_bindings",
                columns: new[] { "ScannerId", "Capability" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_target_server_connection_secrets_TargetServerId",
                table: "target_server_connection_secrets",
                column: "TargetServerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_target_server_scanner_assignments_LastContactUtc",
                table: "target_server_scanner_assignments",
                column: "LastContactUtc");

            migrationBuilder.CreateIndex(
                name: "IX_target_server_scanner_assignments_ScannerId_ConnectivityStatus",
                table: "target_server_scanner_assignments",
                columns: new[] { "ScannerId", "ConnectivityStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_target_server_scanner_assignments_TargetServerId_ScannerId",
                table: "target_server_scanner_assignments",
                columns: new[] { "TargetServerId", "ScannerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_target_servers_LastContactUtc",
                table: "target_servers",
                column: "LastContactUtc");

            migrationBuilder.CreateIndex(
                name: "IX_target_servers_SubnetId_ConnectivityStatus",
                table: "target_servers",
                columns: new[] { "SubnetId", "ConnectivityStatus" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scanner_capability_bindings");

            migrationBuilder.DropTable(
                name: "target_server_connection_secrets");

            migrationBuilder.DropTable(
                name: "target_server_scanner_assignments");

            migrationBuilder.DropIndex(
                name: "IX_target_servers_LastContactUtc",
                table: "target_servers");

            migrationBuilder.DropIndex(
                name: "IX_target_servers_SubnetId_ConnectivityStatus",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectivityStatus",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionAuthMode",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionHost",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionPort",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionProtocol",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionSecretUpdatedAtUtc",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "ConnectionUsername",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "LastContactUtc",
                table: "target_servers");

            migrationBuilder.DropColumn(
                name: "LastHeartbeatUtc",
                table: "target_servers");
        }
    }
}
