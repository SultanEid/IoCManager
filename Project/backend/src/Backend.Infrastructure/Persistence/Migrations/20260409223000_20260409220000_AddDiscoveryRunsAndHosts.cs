using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CtiDbContext))]
[Migration("20260409223000_20260409220000_AddDiscoveryRunsAndHosts")]
public partial class _20260409220000_AddDiscoveryRunsAndHosts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "discovery_runs",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                SubnetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                RequestedCidr = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                RangeStartIp = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                RangeEndIp = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                QueuedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                TotalHosts = table.Column<int>(type: "int", nullable: false),
                ReachableHosts = table.Column<int>(type: "int", nullable: false),
                UnreachableHosts = table.Column<int>(type: "int", nullable: false),
                Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_discovery_runs", x => x.Id);
                table.ForeignKey(
                    name: "FK_discovery_runs_subnets_SubnetId",
                    column: x => x.SubnetId,
                    principalTable: "subnets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "discovered_hosts",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                SubnetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                Hostname = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Reachability = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                FirstDiscoveredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                LastCheckedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                LastSeenAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                LastDiscoveryRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                PromotedTargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                PromotedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_discovered_hosts", x => x.Id);
                table.ForeignKey(
                    name: "FK_discovered_hosts_discovery_runs_LastDiscoveryRunId",
                    column: x => x.LastDiscoveryRunId,
                    principalTable: "discovery_runs",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_discovered_hosts_subnets_SubnetId",
                    column: x => x.SubnetId,
                    principalTable: "subnets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_discovered_hosts_target_servers_PromotedTargetServerId",
                    column: x => x.PromotedTargetServerId,
                    principalTable: "target_servers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_discovered_hosts_LastDiscoveryRunId",
            table: "discovered_hosts",
            column: "LastDiscoveryRunId");

        migrationBuilder.CreateIndex(
            name: "IX_discovered_hosts_PromotedTargetServerId",
            table: "discovered_hosts",
            column: "PromotedTargetServerId");

        migrationBuilder.CreateIndex(
            name: "IX_discovered_hosts_SubnetId_IpAddress",
            table: "discovered_hosts",
            columns: new[] { "SubnetId", "IpAddress" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_discovered_hosts_SubnetId_LastCheckedAtUtc",
            table: "discovered_hosts",
            columns: new[] { "SubnetId", "LastCheckedAtUtc" });

        migrationBuilder.CreateIndex(
            name: "IX_discovery_runs_Status_QueuedAtUtc",
            table: "discovery_runs",
            columns: new[] { "Status", "QueuedAtUtc" });

        migrationBuilder.CreateIndex(
            name: "IX_discovery_runs_SubnetId",
            table: "discovery_runs",
            column: "SubnetId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "discovered_hosts");

        migrationBuilder.DropTable(
            name: "discovery_runs");
    }
}
