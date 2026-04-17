using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260411123000_AddRuleDistributionExecutionAndTargetGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "rule_distribution_jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleRevisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperatorUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false, defaultValue: 5),
                    QueuedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_distribution_jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_distribution_jobs_rule_revisions_v2_RuleRevisionId",
                        column: x => x.RuleRevisionId,
                        principalTable: "rule_revisions_v2",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "target_groups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_target_groups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rule_distribution_attempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleDistributionJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    BackoffSeconds = table.Column<int>(type: "int", nullable: true),
                    TriggeredByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_distribution_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_distribution_attempts_rule_distribution_jobs_RuleDistributionJobId",
                        column: x => x.RuleDistributionJobId,
                        principalTable: "rule_distribution_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rule_distribution_targets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleDistributionJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetHostname = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TargetIpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsRetryable = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    AttemptCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    LastError = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LastAttemptAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SucceededAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_distribution_targets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_distribution_targets_rule_distribution_jobs_RuleDistributionJobId",
                        column: x => x.RuleDistributionJobId,
                        principalTable: "rule_distribution_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rule_distribution_targets_target_servers_TargetServerId",
                        column: x => x.TargetServerId,
                        principalTable: "target_servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "rule_distribution_job_target_groups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleDistributionJobId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AddedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_distribution_job_target_groups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_distribution_job_target_groups_rule_distribution_jobs_RuleDistributionJobId",
                        column: x => x.RuleDistributionJobId,
                        principalTable: "rule_distribution_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rule_distribution_job_target_groups_target_groups_TargetGroupId",
                        column: x => x.TargetGroupId,
                        principalTable: "target_groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "target_group_members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetServerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AddedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_target_group_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_target_group_members_target_groups_TargetGroupId",
                        column: x => x.TargetGroupId,
                        principalTable: "target_groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_target_group_members_target_servers_TargetServerId",
                        column: x => x.TargetServerId,
                        principalTable: "target_servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rule_distribution_target_attempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleDistributionAttemptId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleDistributionTargetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Transport = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RemoteCorrelationId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Diagnostic = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    IsRetryable = table.Column<bool>(type: "bit", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_distribution_target_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_distribution_target_attempts_rule_distribution_attempts_RuleDistributionAttemptId",
                        column: x => x.RuleDistributionAttemptId,
                        principalTable: "rule_distribution_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rule_distribution_target_attempts_rule_distribution_targets_RuleDistributionTargetId",
                        column: x => x.RuleDistributionTargetId,
                        principalTable: "rule_distribution_targets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_attempts_RuleDistributionJobId_AttemptNumber",
                table: "rule_distribution_attempts",
                columns: new[] { "RuleDistributionJobId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_attempts_StartedAtUtc",
                table: "rule_distribution_attempts",
                column: "StartedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_job_target_groups_RuleDistributionJobId_TargetGroupId",
                table: "rule_distribution_job_target_groups",
                columns: new[] { "RuleDistributionJobId", "TargetGroupId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_job_target_groups_TargetGroupId",
                table: "rule_distribution_job_target_groups",
                column: "TargetGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_jobs_QueuedAtUtc",
                table: "rule_distribution_jobs",
                column: "QueuedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_jobs_RuleRevisionId",
                table: "rule_distribution_jobs",
                column: "RuleRevisionId");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_jobs_Status_NextAttemptAtUtc",
                table: "rule_distribution_jobs",
                columns: new[] { "Status", "NextAttemptAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_target_attempts_RuleDistributionAttemptId_RuleDistributionTargetId",
                table: "rule_distribution_target_attempts",
                columns: new[] { "RuleDistributionAttemptId", "RuleDistributionTargetId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_target_attempts_RuleDistributionTargetId",
                table: "rule_distribution_target_attempts",
                column: "RuleDistributionTargetId");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_target_attempts_Status",
                table: "rule_distribution_target_attempts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_targets_RuleDistributionJobId_TargetServerId",
                table: "rule_distribution_targets",
                columns: new[] { "RuleDistributionJobId", "TargetServerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_targets_Status",
                table: "rule_distribution_targets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_rule_distribution_targets_TargetServerId",
                table: "rule_distribution_targets",
                column: "TargetServerId");

            migrationBuilder.CreateIndex(
                name: "IX_target_group_members_TargetGroupId_TargetServerId",
                table: "target_group_members",
                columns: new[] { "TargetGroupId", "TargetServerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_target_group_members_TargetServerId",
                table: "target_group_members",
                column: "TargetServerId");

            migrationBuilder.CreateIndex(
                name: "IX_target_groups_Name",
                table: "target_groups",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rule_distribution_job_target_groups");

            migrationBuilder.DropTable(
                name: "rule_distribution_target_attempts");

            migrationBuilder.DropTable(
                name: "target_group_members");

            migrationBuilder.DropTable(
                name: "rule_distribution_attempts");

            migrationBuilder.DropTable(
                name: "rule_distribution_targets");

            migrationBuilder.DropTable(
                name: "target_groups");

            migrationBuilder.DropTable(
                name: "rule_distribution_jobs");
        }
    }
}
