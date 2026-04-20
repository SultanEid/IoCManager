using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260409000100_InitialSqlServerBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovalTierRequired = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    OwnerUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cti_cases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    OwnerUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    State = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ParentCaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MergedIntoCaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MergeReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OpenedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ClosedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_cases", x => x.Id);
                    table.CheckConstraint("ck_cti_cases_closed_after_opened", "[ClosedAtUtc] IS NULL OR [ClosedAtUtc] >= [OpenedAtUtc]");
                    table.ForeignKey(
                        name: "FK_cti_cases_cti_cases_MergedIntoCaseId",
                        column: x => x.MergedIntoCaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_cti_cases_cti_cases_ParentCaseId",
                        column: x => x.ParentCaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_source_reliability_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    HistoricalPrecision = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    HistoricalRecall = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    TrustScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    EffectiveFromUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EffectiveToUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_source_reliability_profiles", x => x.Id);
                    table.CheckConstraint("ck_cti_source_reliability_profiles_effective_range", "[EffectiveToUtc] IS NULL OR [EffectiveToUtc] >= [EffectiveFromUtc]");
                    table.CheckConstraint("ck_cti_source_reliability_profiles_precision", "[HistoricalPrecision] >= 0 AND [HistoricalPrecision] <= 1");
                    table.CheckConstraint("ck_cti_source_reliability_profiles_recall", "[HistoricalRecall] >= 0 AND [HistoricalRecall] <= 1");
                    table.CheckConstraint("ck_cti_source_reliability_profiles_trust", "[TrustScore] >= 0 AND [TrustScore] <= 1");
                });

            migrationBuilder.CreateTable(
                name: "job_run_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JobType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    TriggeredBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_run_records", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "decision_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    State = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RecommendedAction = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ApprovalTierRequired = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Reasoning = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    ApprovedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ApprovedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_decision_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_decision_records_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "evidence_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvidenceType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SourceSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContentHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    CollectedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_evidence_items", x => x.Id);
                    table.CheckConstraint("ck_evidence_items_payload_json", "ISJSON([PayloadJson]) = 1");
                    table.ForeignKey(
                        name: "FK_evidence_items_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rule_proposals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProposalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RuleFamily = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    RuleBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProposedVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ProposedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    PolicyRiskScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ReviewedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ReviewedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReviewReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OverrideReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_proposals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rule_proposals_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rule_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RuleFamily = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RuleBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceOfOrigin = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AuthorUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ReviewerUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    LinkedAttackTechniques = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LinkedCampaign = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LinkedMalwareFamily = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PredictedCoverage = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    PredictedFalsePositiveRisk = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    BlastRadius = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    LastUsefulHitAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastDeploymentAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastParsedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastValidatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastValidationPassed = table.Column<bool>(type: "bit", nullable: true),
                    LastValidationSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    BodyFingerprint = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_records", x => x.Id);
                    table.CheckConstraint("ck_rule_records_linked_attack_techniques_json", "ISJSON([LinkedAttackTechniques]) = 1");
                    table.ForeignKey(
                        name: "FK_rule_records_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_feature_snapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SnapshotHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CapturedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    FeatureWindowStartUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    FeatureWindowEndUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CapturedByPipeline = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_feature_snapshots", x => x.Id);
                    table.CheckConstraint("ck_cti_feature_snapshots_capture_window", "[FeatureWindowEndUtc] <= [CapturedAtUtc]");
                    table.CheckConstraint("ck_cti_feature_snapshots_window_order", "[FeatureWindowStartUtc] <= [FeatureWindowEndUtc]");
                    table.ForeignKey(
                        name: "FK_cti_feature_snapshots_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_transformation_lineage_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceCaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetCaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Relationship = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RecordedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RecordedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_transformation_lineage_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_transformation_lineage_records_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_evidence_assertions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceReliabilityProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvidenceReference = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AssertionType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Statement = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    IsConflicting = table.Column<bool>(type: "bit", nullable: false),
                    SourceReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ObservedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_evidence_assertions", x => x.Id);
                    table.CheckConstraint("ck_cti_evidence_assertions_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
                    table.ForeignKey(
                        name: "FK_cti_evidence_assertions_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_evidence_assertions_cti_source_reliability_profiles_SourceReliabilityProfileId",
                        column: x => x.SourceReliabilityProfileId,
                        principalTable: "cti_source_reliability_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "feedback_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Verdict = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedback_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_feedback_records_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_feedback_records_decision_records_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "decision_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "deployment_recommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetEnvironment = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RecommendedStage = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RiskScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    PredictedNoise = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    BaselineNoise = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    PredictedNoiseDelta = table.Column<decimal>(type: "decimal(6,4)", precision: 6, scale: 4, nullable: false),
                    AnalystAcceptanceRate = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    RequiresHumanApproval = table.Column<bool>(type: "bit", nullable: false),
                    AutoPublishEnabled = table.Column<bool>(type: "bit", nullable: false),
                    RequestedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RecommendedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deployment_recommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_deployment_recommendations_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_deployment_recommendations_rule_proposals_RuleProposalId",
                        column: x => x.RuleProposalId,
                        principalTable: "rule_proposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "deployment_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetEnvironment = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RequestedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ApprovedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ApprovedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeployedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deployment_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_deployment_records_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_deployment_records_rule_records_RuleId",
                        column: x => x.RuleId,
                        principalTable: "rule_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "rule_revision_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    ChangeType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ChangeReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RuleFamily = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RuleBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SourceOfOrigin = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AuthorUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ReviewerUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    LinkedAttackTechniques = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LinkedCampaign = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LinkedMalwareFamily = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PredictedCoverage = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    PredictedFalsePositiveRisk = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    BlastRadius = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    LastUsefulHitAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastDeploymentAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rule_revision_records", x => x.Id);
                    table.CheckConstraint("ck_rule_revision_records_linked_attack_techniques_json", "ISJSON([LinkedAttackTechniques]) = 1");
                    table.ForeignKey(
                        name: "FK_rule_revision_records_rule_records_RuleId",
                        column: x => x.RuleId,
                        principalTable: "rule_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_asset_criticality_snapshot_values",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Criticality = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CriticalityScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_asset_criticality_snapshot_values", x => x.Id);
                    table.CheckConstraint("ck_cti_asset_criticality_snapshot_values_score", "[CriticalityScore] >= 0 AND [CriticalityScore] <= 1");
                    table.ForeignKey(
                        name: "FK_cti_asset_criticality_snapshot_values_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_decisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupersedesDecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionState = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovalTierRequired = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RecommendationCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    RecommendationSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    SnapshotHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    TransformationLineageHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DecidedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_decisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_decisions_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_decisions_cti_decisions_SupersedesDecisionId",
                        column: x => x.SupersedesDecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cti_decisions_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cti_feature_vectors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    NumericValue = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Source = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_feature_vectors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_feature_vectors_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_model_version_references",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModelName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ModelHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    TrainedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_model_version_references", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_model_version_references_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_policy_version_references",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PolicyHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    PublishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_policy_version_references", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_policy_version_references_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_source_trust_snapshot_values",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TrustScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    HistoricalPrecision = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    HistoricalRecall = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_source_trust_snapshot_values", x => x.Id);
                    table.CheckConstraint("ck_cti_source_trust_snapshot_values_precision", "[HistoricalPrecision] >= 0 AND [HistoricalPrecision] <= 1");
                    table.CheckConstraint("ck_cti_source_trust_snapshot_values_recall", "[HistoricalRecall] >= 0 AND [HistoricalRecall] <= 1");
                    table.CheckConstraint("ck_cti_source_trust_snapshot_values_trust_score", "[TrustScore] >= 0 AND [TrustScore] <= 1");
                    table.ForeignKey(
                        name: "FK_cti_source_trust_snapshot_values_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rollout_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeploymentRecommendationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurrentStage = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CanaryTrafficPercent = table.Column<int>(type: "int", nullable: false),
                    PredictedNoise = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    ObservedNoise = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    ObservedNoiseDelta = table.Column<decimal>(type: "decimal(6,4)", precision: 6, scale: 4, nullable: true),
                    AnalystAcceptanceRate = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    RequiresManualPromotion = table.Column<bool>(type: "bit", nullable: false),
                    ShadowStartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CanaryStartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    PromotedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RolledBackAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastStageReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LastOverrideReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rollout_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rollout_plans_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rollout_plans_deployment_recommendations_DeploymentRecommendationId",
                        column: x => x.DeploymentRecommendationId,
                        principalTable: "deployment_recommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_rollout_plans_rule_proposals_RuleProposalId",
                        column: x => x.RuleProposalId,
                        principalTable: "rule_proposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_approvals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequiredTier = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovedTier = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ApprovedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_approvals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_approvals_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_approvals_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_audit_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActorUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityKey = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    PayloadHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CorrelationId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_audit_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_audit_records_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_cti_audit_records_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_decision_bundles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupersedesDecisionBundleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionState = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovalTierRequired = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    NextBestEvidenceType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RecommendationCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    RecommendationSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    NextBestEvidenceRequest = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    NextBestEvidenceRationale = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    SnapshotHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    TransformationLineageHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DecidedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_decision_bundles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_decision_bundles_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_decision_bundles_cti_decision_bundles_SupersedesDecisionBundleId",
                        column: x => x.SupersedesDecisionBundleId,
                        principalTable: "cti_decision_bundles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cti_decision_bundles_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_decision_bundles_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cti_decision_evidence_references",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvidenceAssertionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferencedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_decision_evidence_references", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_decision_evidence_references_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_decision_evidence_references_cti_evidence_assertions_EvidenceAssertionId",
                        column: x => x.EvidenceAssertionId,
                        principalTable: "cti_evidence_assertions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_decision_lineage_references",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineageRecordId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferencedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_decision_lineage_references", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_decision_lineage_references_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_decision_lineage_references_cti_transformation_lineage_records_LineageRecordId",
                        column: x => x.LineageRecordId,
                        principalTable: "cti_transformation_lineage_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cti_feedback",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Verdict = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_feedback", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_feedback_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_feedback_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_graph_artifact_references",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ArtifactType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    StorageUri = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ArtifactHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ProducedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    GeneratedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_graph_artifact_references", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_graph_artifact_references_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_graph_artifact_references_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_cti_graph_artifact_references_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_model_decision_traces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModelName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    MaliciousnessScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    ActionabilityScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    DeployabilityScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    UncertaintyScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    ReasoningSummary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    RawOutputHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    TracedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_model_decision_traces", x => x.Id);
                    table.CheckConstraint("ck_cti_model_decision_traces_actionability", "[ActionabilityScore] >= 0 AND [ActionabilityScore] <= 1");
                    table.CheckConstraint("ck_cti_model_decision_traces_deployability", "[DeployabilityScore] >= 0 AND [DeployabilityScore] <= 1");
                    table.CheckConstraint("ck_cti_model_decision_traces_maliciousness", "[MaliciousnessScore] >= 0 AND [MaliciousnessScore] <= 1");
                    table.CheckConstraint("ck_cti_model_decision_traces_uncertainty", "[UncertaintyScore] >= 0 AND [UncertaintyScore] <= 1");
                    table.ForeignKey(
                        name: "FK_cti_model_decision_traces_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_model_decision_traces_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cti_rule_proposals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProposalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RuleFamily = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    RuleBody = table.Column<string>(type: "nvarchar(max)", maxLength: 20000, nullable: false),
                    ProposedVersion = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ProposedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ProposedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_rule_proposals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_rule_proposals_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_rule_proposals_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "rollback_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RolloutPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TriggerCondition = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RecoveryPlaybook = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PredictedNoiseThreshold = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    LastObservedNoise = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    TriggerConditionMet = table.Column<bool>(type: "bit", nullable: false),
                    IsTriggered = table.Column<bool>(type: "bit", nullable: false),
                    TriggeredByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    TriggeredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    TriggerReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rollback_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rollback_plans_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rollback_plans_rollout_plans_RolloutPlanId",
                        column: x => x.RolloutPlanId,
                        principalTable: "rollout_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rollback_plans_rule_proposals_RuleProposalId",
                        column: x => x.RuleProposalId,
                        principalTable: "rule_proposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "report_ingestion_runs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionBundleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReportId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    SourceName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    DocumentId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DocumentUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    HumanReviewRequired = table.Column<bool>(type: "bit", nullable: false),
                    WeakEvidenceDetected = table.Column<bool>(type: "bit", nullable: false),
                    ProcessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    InputPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OutputPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_ingestion_runs", x => x.Id);
                    table.CheckConstraint("ck_report_ingestion_runs_input_payload_json", "ISJSON([InputPayloadJson]) = 1");
                    table.CheckConstraint("ck_report_ingestion_runs_output_payload_json", "ISJSON([OutputPayloadJson]) = 1");
                    table.ForeignKey(
                        name: "FK_report_ingestion_runs_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_report_ingestion_runs_cti_decision_bundles_DecisionBundleId",
                        column: x => x.DecisionBundleId,
                        principalTable: "cti_decision_bundles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_graph_derived_features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureSnapshotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GraphArtifactReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MetricName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    MetricValue = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: false),
                    MetricUnit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_graph_derived_features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cti_graph_derived_features_cti_feature_snapshots_FeatureSnapshotId",
                        column: x => x.FeatureSnapshotId,
                        principalTable: "cti_feature_snapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_graph_derived_features_cti_graph_artifact_references_GraphArtifactReferenceId",
                        column: x => x.GraphArtifactReferenceId,
                        principalTable: "cti_graph_artifact_references",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "cti_deployment_recommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetEnvironment = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RecommendedRolloutMode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RiskScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    RequiresHumanApproval = table.Column<bool>(type: "bit", nullable: false),
                    RequestedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RecommendedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cti_deployment_recommendations", x => x.Id);
                    table.CheckConstraint("ck_cti_deployment_recommendations_risk", "[RiskScore] >= 0 AND [RiskScore] <= 1");
                    table.ForeignKey(
                        name: "FK_cti_deployment_recommendations_cti_cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "cti_cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_deployment_recommendations_cti_decisions_DecisionId",
                        column: x => x.DecisionId,
                        principalTable: "cti_decisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cti_deployment_recommendations_cti_rule_proposals_RuleProposalId",
                        column: x => x.RuleProposalId,
                        principalTable: "cti_rule_proposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "report_ingestion_claims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngestionRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvidenceAssertionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ClaimId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Statement = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Snippet = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    SourceStartOffset = table.Column<int>(type: "int", nullable: true),
                    SourceEndOffset = table.Column<int>(type: "int", nullable: true),
                    PageIndex = table.Column<int>(type: "int", nullable: true),
                    ExtractionMethod = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    IsAccepted = table.Column<bool>(type: "bit", nullable: false),
                    IsPromptInjectionSuspected = table.Column<bool>(type: "bit", nullable: false),
                    AbstainReasonCodesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CitationsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_ingestion_claims", x => x.Id);
                    table.CheckConstraint("ck_report_ingestion_claims_abstain_reason_codes_json", "ISJSON([AbstainReasonCodesJson]) = 1");
                    table.CheckConstraint("ck_report_ingestion_claims_citations_json", "ISJSON([CitationsJson]) = 1");
                    table.CheckConstraint("ck_report_ingestion_claims_confidence", "[Confidence] >= 0 AND [Confidence] <= 1");
                    table.CheckConstraint("ck_report_ingestion_claims_offsets", "[SourceStartOffset] IS NULL OR [SourceEndOffset] IS NULL OR [SourceEndOffset] >= [SourceStartOffset]");
                    table.ForeignKey(
                        name: "FK_report_ingestion_claims_cti_evidence_assertions_EvidenceAssertionId",
                        column: x => x.EvidenceAssertionId,
                        principalTable: "cti_evidence_assertions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_report_ingestion_claims_report_ingestion_runs_IngestionRunId",
                        column: x => x.IngestionRunId,
                        principalTable: "report_ingestion_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_cases_OwnerUserId",
                table: "cases",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_cases_Priority",
                table: "cases",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_cases_Status",
                table: "cases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_cti_approvals_CaseId_DecisionId_ApprovedAtUtc",
                table: "cti_approvals",
                columns: new[] { "CaseId", "DecisionId", "ApprovedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_approvals_DecisionId",
                table: "cti_approvals",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_asset_criticality_snapshot_values_FeatureSnapshotId_AssetKey",
                table: "cti_asset_criticality_snapshot_values",
                columns: new[] { "FeatureSnapshotId", "AssetKey" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_audit_records_ActionType_OccurredAtUtc",
                table: "cti_audit_records",
                columns: new[] { "ActionType", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_audit_records_CaseId_OccurredAtUtc",
                table: "cti_audit_records",
                columns: new[] { "CaseId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_audit_records_DecisionId",
                table: "cti_audit_records",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_cases_MergedIntoCaseId",
                table: "cti_cases",
                column: "MergedIntoCaseId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_cases_OpenedAtUtc",
                table: "cti_cases",
                column: "OpenedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_cti_cases_OwnerUserId",
                table: "cti_cases",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_cases_ParentCaseId",
                table: "cti_cases",
                column: "ParentCaseId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_cases_State",
                table: "cti_cases",
                column: "State");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_bundles_CaseId_DecidedAtUtc",
                table: "cti_decision_bundles",
                columns: new[] { "CaseId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_bundles_DecisionId",
                table: "cti_decision_bundles",
                column: "DecisionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_bundles_FeatureSnapshotId",
                table: "cti_decision_bundles",
                column: "FeatureSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_bundles_SnapshotHash_ModelVersion_PolicyVersion",
                table: "cti_decision_bundles",
                columns: new[] { "SnapshotHash", "ModelVersion", "PolicyVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_bundles_SupersedesDecisionBundleId",
                table: "cti_decision_bundles",
                column: "SupersedesDecisionBundleId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_evidence_references_DecisionId",
                table: "cti_decision_evidence_references",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_evidence_references_DecisionId_EvidenceAssertionId",
                table: "cti_decision_evidence_references",
                columns: new[] { "DecisionId", "EvidenceAssertionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_evidence_references_EvidenceAssertionId",
                table: "cti_decision_evidence_references",
                column: "EvidenceAssertionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_lineage_references_DecisionId",
                table: "cti_decision_lineage_references",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_lineage_references_DecisionId_LineageRecordId",
                table: "cti_decision_lineage_references",
                columns: new[] { "DecisionId", "LineageRecordId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_decision_lineage_references_LineageRecordId",
                table: "cti_decision_lineage_references",
                column: "LineageRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decisions_CaseId_DecidedAtUtc",
                table: "cti_decisions",
                columns: new[] { "CaseId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_decisions_FeatureSnapshotId",
                table: "cti_decisions",
                column: "FeatureSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_decisions_SnapshotHash_ModelVersion_PolicyVersion",
                table: "cti_decisions",
                columns: new[] { "SnapshotHash", "ModelVersion", "PolicyVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_decisions_SupersedesDecisionId",
                table: "cti_decisions",
                column: "SupersedesDecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_deployment_recommendations_CaseId_RecommendedAtUtc",
                table: "cti_deployment_recommendations",
                columns: new[] { "CaseId", "RecommendedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_deployment_recommendations_DecisionId",
                table: "cti_deployment_recommendations",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_deployment_recommendations_RuleProposalId",
                table: "cti_deployment_recommendations",
                column: "RuleProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_evidence_assertions_CaseId_ObservedAtUtc",
                table: "cti_evidence_assertions",
                columns: new[] { "CaseId", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_evidence_assertions_EvidenceReference",
                table: "cti_evidence_assertions",
                column: "EvidenceReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_evidence_assertions_SourceReliabilityProfileId",
                table: "cti_evidence_assertions",
                column: "SourceReliabilityProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_feature_snapshots_CaseId_CapturedAtUtc",
                table: "cti_feature_snapshots",
                columns: new[] { "CaseId", "CapturedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_feature_snapshots_SnapshotHash",
                table: "cti_feature_snapshots",
                column: "SnapshotHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_feature_vectors_FeatureSnapshotId_FeatureName",
                table: "cti_feature_vectors",
                columns: new[] { "FeatureSnapshotId", "FeatureName" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_feedback_CaseId_SubmittedAtUtc",
                table: "cti_feedback",
                columns: new[] { "CaseId", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_feedback_DecisionId",
                table: "cti_feedback",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_artifact_references_ArtifactHash",
                table: "cti_graph_artifact_references",
                column: "ArtifactHash");

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_artifact_references_CaseId_GeneratedAtUtc",
                table: "cti_graph_artifact_references",
                columns: new[] { "CaseId", "GeneratedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_artifact_references_DecisionId",
                table: "cti_graph_artifact_references",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_artifact_references_FeatureSnapshotId",
                table: "cti_graph_artifact_references",
                column: "FeatureSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_derived_features_FeatureSnapshotId_MetricName",
                table: "cti_graph_derived_features",
                columns: new[] { "FeatureSnapshotId", "MetricName" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_graph_derived_features_GraphArtifactReferenceId",
                table: "cti_graph_derived_features",
                column: "GraphArtifactReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_model_decision_traces_DecisionId_TracedAtUtc",
                table: "cti_model_decision_traces",
                columns: new[] { "DecisionId", "TracedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_model_decision_traces_FeatureSnapshotId",
                table: "cti_model_decision_traces",
                column: "FeatureSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_model_version_references_FeatureSnapshotId_ModelName_ModelVersion",
                table: "cti_model_version_references",
                columns: new[] { "FeatureSnapshotId", "ModelName", "ModelVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_policy_version_references_FeatureSnapshotId_PolicyVersion",
                table: "cti_policy_version_references",
                columns: new[] { "FeatureSnapshotId", "PolicyVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cti_rule_proposals_CaseId_ProposedAtUtc",
                table: "cti_rule_proposals",
                columns: new[] { "CaseId", "ProposedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_rule_proposals_DecisionId",
                table: "cti_rule_proposals",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_cti_rule_proposals_RuleFamily_ProposedVersion",
                table: "cti_rule_proposals",
                columns: new[] { "RuleFamily", "ProposedVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_source_reliability_profiles_SourceSystem_EffectiveFromUtc",
                table: "cti_source_reliability_profiles",
                columns: new[] { "SourceSystem", "EffectiveFromUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_source_trust_snapshot_values_FeatureSnapshotId_SourceSystem",
                table: "cti_source_trust_snapshot_values",
                columns: new[] { "FeatureSnapshotId", "SourceSystem" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_transformation_lineage_records_CaseId_RecordedAtUtc",
                table: "cti_transformation_lineage_records",
                columns: new[] { "CaseId", "RecordedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_cti_transformation_lineage_records_SourceCaseId_TargetCaseId_Relationship",
                table: "cti_transformation_lineage_records",
                columns: new[] { "SourceCaseId", "TargetCaseId", "Relationship" });

            migrationBuilder.CreateIndex(
                name: "IX_decision_records_CaseId_State",
                table: "decision_records",
                columns: new[] { "CaseId", "State" });

            migrationBuilder.CreateIndex(
                name: "IX_deployment_recommendations_CaseId_RecommendedAtUtc",
                table: "deployment_recommendations",
                columns: new[] { "CaseId", "RecommendedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_deployment_recommendations_RuleProposalId",
                table: "deployment_recommendations",
                column: "RuleProposalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_deployment_records_CaseId_Status",
                table: "deployment_records",
                columns: new[] { "CaseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_deployment_records_RuleId",
                table: "deployment_records",
                column: "RuleId");

            migrationBuilder.CreateIndex(
                name: "IX_evidence_items_CaseId_CollectedAtUtc",
                table: "evidence_items",
                columns: new[] { "CaseId", "CollectedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_evidence_items_ContentHash",
                table: "evidence_items",
                column: "ContentHash");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_records_CaseId_CreatedAtUtc",
                table: "feedback_records",
                columns: new[] { "CaseId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_feedback_records_DecisionId",
                table: "feedback_records",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_job_run_records_JobType_StartedAtUtc",
                table: "job_run_records",
                columns: new[] { "JobType", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_claims_EvidenceAssertionId",
                table: "report_ingestion_claims",
                column: "EvidenceAssertionId");

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_claims_IngestionRunId",
                table: "report_ingestion_claims",
                column: "IngestionRunId");

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_claims_IngestionRunId_ClaimId",
                table: "report_ingestion_claims",
                columns: new[] { "IngestionRunId", "ClaimId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_runs_CaseId_ProcessedAtUtc",
                table: "report_ingestion_runs",
                columns: new[] { "CaseId", "ProcessedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_runs_DecisionBundleId",
                table: "report_ingestion_runs",
                column: "DecisionBundleId");

            migrationBuilder.CreateIndex(
                name: "IX_report_ingestion_runs_ReportId",
                table: "report_ingestion_runs",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "roles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_rollback_plans_CaseId_IsTriggered",
                table: "rollback_plans",
                columns: new[] { "CaseId", "IsTriggered" });

            migrationBuilder.CreateIndex(
                name: "IX_rollback_plans_RolloutPlanId",
                table: "rollback_plans",
                column: "RolloutPlanId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rollback_plans_RuleProposalId",
                table: "rollback_plans",
                column: "RuleProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_rollout_plans_CaseId_CurrentStage",
                table: "rollout_plans",
                columns: new[] { "CaseId", "CurrentStage" });

            migrationBuilder.CreateIndex(
                name: "IX_rollout_plans_DeploymentRecommendationId",
                table: "rollout_plans",
                column: "DeploymentRecommendationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rollout_plans_RuleProposalId",
                table: "rollout_plans",
                column: "RuleProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_rule_proposals_CaseId_CreatedAtUtc",
                table: "rule_proposals",
                columns: new[] { "CaseId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_proposals_CaseId_Status",
                table: "rule_proposals",
                columns: new[] { "CaseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_records_CaseId_RuleFamily_BodyFingerprint",
                table: "rule_records",
                columns: new[] { "CaseId", "RuleFamily", "BodyFingerprint" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_records_CaseId_RuleFamily_Version",
                table: "rule_records",
                columns: new[] { "CaseId", "RuleFamily", "Version" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_records_CaseId_Status",
                table: "rule_records",
                columns: new[] { "CaseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_revision_records_CaseId_CreatedAtUtc",
                table: "rule_revision_records",
                columns: new[] { "CaseId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_rule_revision_records_RuleId_RevisionNumber",
                table: "rule_revision_records",
                columns: new[] { "RuleId", "RevisionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "users",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "cti_approvals");

            migrationBuilder.DropTable(
                name: "cti_asset_criticality_snapshot_values");

            migrationBuilder.DropTable(
                name: "cti_audit_records");

            migrationBuilder.DropTable(
                name: "cti_decision_evidence_references");

            migrationBuilder.DropTable(
                name: "cti_decision_lineage_references");

            migrationBuilder.DropTable(
                name: "cti_deployment_recommendations");

            migrationBuilder.DropTable(
                name: "cti_feature_vectors");

            migrationBuilder.DropTable(
                name: "cti_feedback");

            migrationBuilder.DropTable(
                name: "cti_graph_derived_features");

            migrationBuilder.DropTable(
                name: "cti_model_decision_traces");

            migrationBuilder.DropTable(
                name: "cti_model_version_references");

            migrationBuilder.DropTable(
                name: "cti_policy_version_references");

            migrationBuilder.DropTable(
                name: "cti_source_trust_snapshot_values");

            migrationBuilder.DropTable(
                name: "deployment_records");

            migrationBuilder.DropTable(
                name: "evidence_items");

            migrationBuilder.DropTable(
                name: "feedback_records");

            migrationBuilder.DropTable(
                name: "job_run_records");

            migrationBuilder.DropTable(
                name: "report_ingestion_claims");

            migrationBuilder.DropTable(
                name: "rollback_plans");

            migrationBuilder.DropTable(
                name: "rule_revision_records");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "cti_transformation_lineage_records");

            migrationBuilder.DropTable(
                name: "cti_rule_proposals");

            migrationBuilder.DropTable(
                name: "cti_graph_artifact_references");

            migrationBuilder.DropTable(
                name: "decision_records");

            migrationBuilder.DropTable(
                name: "cti_evidence_assertions");

            migrationBuilder.DropTable(
                name: "report_ingestion_runs");

            migrationBuilder.DropTable(
                name: "rollout_plans");

            migrationBuilder.DropTable(
                name: "rule_records");

            migrationBuilder.DropTable(
                name: "cti_source_reliability_profiles");

            migrationBuilder.DropTable(
                name: "cti_decision_bundles");

            migrationBuilder.DropTable(
                name: "deployment_recommendations");

            migrationBuilder.DropTable(
                name: "cti_decisions");

            migrationBuilder.DropTable(
                name: "rule_proposals");

            migrationBuilder.DropTable(
                name: "cti_feature_snapshots");

            migrationBuilder.DropTable(
                name: "cases");

            migrationBuilder.DropTable(
                name: "cti_cases");
        }
    }
}
