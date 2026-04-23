using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(CtiDbContext))]
    [Migration("20260419113000_AddAiDecisionTables")]
    public partial class AddAiDecisionTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_decision_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DetectionId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    IocType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IocValue = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    ObservedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DetectionPackageJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    FailureCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    FailureMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AttemptCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    DatasetVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_requests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ai_action_plan_recommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    RecommendedActionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrerequisitesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CautionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NeverAutoExecutes = table.Column<bool>(type: "bit", nullable: false),
                    PolicyConstrained = table.Column<bool>(type: "bit", nullable: false),
                    EvidenceBased = table.Column<bool>(type: "bit", nullable: false),
                    GeneratedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RawPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_action_plan_recommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_action_plan_recommendations_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_evidence_sources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    EvidenceId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Polarity = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Anchor = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Rank = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_evidence_sources", x => x.Id);
                    table.CheckConstraint(
                        name: "ck_ai_decision_evidence_sources_confidence",
                        sql: "[Confidence] IS NULL OR ([Confidence] >= 0 AND [Confidence] <= 1)");
                    table.ForeignKey(
                        name: "FK_ai_decision_evidence_sources_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_explanations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    DecisionState = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RecommendedAction = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RationaleJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CitationsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NextBestEvidenceJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    DatasetVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    GeneratedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RawPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_explanations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_decision_explanations_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    QueuedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ErrorCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_decision_jobs_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_overrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    OverrideVerdict = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ClosureDisposition = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    IsFinal = table.Column<bool>(type: "bit", nullable: false),
                    PreviousStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    NewStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_overrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_decision_overrides_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_results",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Verdict = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    FalsePositiveRisk = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    ReviewPriority = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ShouldPromoteToIndicator = table.Column<bool>(type: "bit", nullable: false),
                    ShouldSuppress = table.Column<bool>(type: "bit", nullable: false),
                    ShouldAllowlist = table.Column<bool>(type: "bit", nullable: false),
                    ShouldEscalate = table.Column<bool>(type: "bit", nullable: false),
                    ReasonsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProvenanceJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NextBestEvidenceJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AbstainReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    DatasetVersion = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ScoredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RawPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_results", x => x.Id);
                    table.CheckConstraint(
                        name: "ck_ai_decision_results_confidence",
                        sql: "[Confidence] >= 0 AND [Confidence] <= 1");
                    table.CheckConstraint(
                        name: "ck_ai_decision_results_false_positive_risk",
                        sql: "[FalsePositiveRisk] >= 0 AND [FalsePositiveRisk] <= 1");
                    table.ForeignKey(
                        name: "FK_ai_decision_results_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_decision_similar_detections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DecisionRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DetectionId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RuleFamily = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RuleId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RelationType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ObservedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    SimilarityScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    SimilarityReasonsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PriorVerdictsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PriorAcceptedActionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PriorOutcomesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Rank = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_decision_similar_detections", x => x.Id);
                    table.CheckConstraint(
                        name: "ck_ai_decision_similar_detections_confidence",
                        sql: "[Confidence] >= 0 AND [Confidence] <= 1");
                    table.CheckConstraint(
                        name: "ck_ai_decision_similar_detections_similarity",
                        sql: "[SimilarityScore] >= 0 AND [SimilarityScore] <= 1");
                    table.ForeignKey(
                        name: "FK_ai_decision_similar_detections_ai_decision_requests_DecisionRequestId",
                        column: x => x.DecisionRequestId,
                        principalTable: "ai_decision_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_action_plan_recommendations_DecisionRequestId",
                table: "ai_action_plan_recommendations",
                column: "DecisionRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_action_plan_recommendations_GeneratedAtUtc",
                table: "ai_action_plan_recommendations",
                column: "GeneratedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_evidence_sources_DecisionRequestId_Rank",
                table: "ai_decision_evidence_sources",
                columns: new[] { "DecisionRequestId", "Rank" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_explanations_DecisionRequestId",
                table: "ai_decision_explanations",
                column: "DecisionRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_explanations_GeneratedAtUtc",
                table: "ai_decision_explanations",
                column: "GeneratedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_jobs_DecisionRequestId_AttemptNumber",
                table: "ai_decision_jobs",
                columns: new[] { "DecisionRequestId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_jobs_NextAttemptAtUtc",
                table: "ai_decision_jobs",
                column: "NextAttemptAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_jobs_Status_QueuedAtUtc",
                table: "ai_decision_jobs",
                columns: new[] { "Status", "QueuedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_overrides_DecisionRequestId_SubmittedAtUtc",
                table: "ai_decision_overrides",
                columns: new[] { "DecisionRequestId", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_CaseId",
                table: "ai_decision_requests",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_CompletedAtUtc",
                table: "ai_decision_requests",
                column: "CompletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_NextAttemptAtUtc",
                table: "ai_decision_requests",
                column: "NextAttemptAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_requests_Status_SubmittedAtUtc",
                table: "ai_decision_requests",
                columns: new[] { "Status", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_results_DecisionRequestId",
                table: "ai_decision_results",
                column: "DecisionRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_results_ScoredAtUtc",
                table: "ai_decision_results",
                column: "ScoredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_similar_detections_DecisionRequestId_ObservedAtUtc",
                table: "ai_decision_similar_detections",
                columns: new[] { "DecisionRequestId", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_decision_similar_detections_DecisionRequestId_Rank",
                table: "ai_decision_similar_detections",
                columns: new[] { "DecisionRequestId", "Rank" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_action_plan_recommendations");

            migrationBuilder.DropTable(
                name: "ai_decision_evidence_sources");

            migrationBuilder.DropTable(
                name: "ai_decision_explanations");

            migrationBuilder.DropTable(
                name: "ai_decision_jobs");

            migrationBuilder.DropTable(
                name: "ai_decision_overrides");

            migrationBuilder.DropTable(
                name: "ai_decision_results");

            migrationBuilder.DropTable(
                name: "ai_decision_similar_detections");

            migrationBuilder.DropTable(
                name: "ai_decision_requests");
        }
    }
}

