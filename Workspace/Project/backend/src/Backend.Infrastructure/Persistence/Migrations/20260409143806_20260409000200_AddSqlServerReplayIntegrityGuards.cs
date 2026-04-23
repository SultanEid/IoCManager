using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class _20260409000200_AddSqlServerReplayIntegrityGuards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_feature_snapshots_prevent_mutation", "cti_feature_snapshots");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_feature_vectors_prevent_mutation", "cti_feature_vectors");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_graph_derived_features_prevent_mutation", "cti_graph_derived_features");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_asset_criticality_snapshot_values_prevent_mutation", "cti_asset_criticality_snapshot_values");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_source_trust_snapshot_values_prevent_mutation", "cti_source_trust_snapshot_values");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_policy_version_references_prevent_mutation", "cti_policy_version_references");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_model_version_references_prevent_mutation", "cti_model_version_references");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_model_decision_traces_prevent_mutation", "cti_model_decision_traces");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_decision_evidence_references_prevent_mutation", "cti_decision_evidence_references");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_decision_lineage_references_prevent_mutation", "cti_decision_lineage_references");
            CreateAppendOnlyMutationTrigger(migrationBuilder, "trg_cti_audit_records_prevent_mutation", "cti_audit_records");

            migrationBuilder.Sql(
                """
CREATE OR ALTER TRIGGER [dbo].[trg_cti_decisions_validate_temporal_integrity]
ON [dbo].[cti_decisions]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN [dbo].[cti_feature_snapshots] AS s ON s.[Id] = i.[FeatureSnapshotId]
        WHERE s.[Id] IS NULL
            OR s.[CaseId] <> i.[CaseId]
            OR s.[SnapshotHash] <> i.[SnapshotHash]
            OR s.[FeatureWindowEndUtc] > i.[DecidedAtUtc]
            OR s.[CapturedAtUtc] > i.[DecidedAtUtc]
    )
    BEGIN
        THROW 51010, 'Decision failed snapshot point-in-time integrity checks.', 1;
    END
END;
""");

            migrationBuilder.Sql(
                """
CREATE OR ALTER TRIGGER [dbo].[trg_cti_decision_bundles_validate_temporal_integrity]
ON [dbo].[cti_decision_bundles]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN [dbo].[cti_decisions] AS d ON d.[Id] = i.[DecisionId]
        LEFT JOIN [dbo].[cti_feature_snapshots] AS s ON s.[Id] = d.[FeatureSnapshotId]
        WHERE d.[Id] IS NULL
            OR s.[Id] IS NULL
            OR d.[CaseId] <> i.[CaseId]
            OR d.[FeatureSnapshotId] <> i.[FeatureSnapshotId]
            OR d.[SnapshotHash] <> i.[SnapshotHash]
            OR d.[ModelVersion] <> i.[ModelVersion]
            OR d.[PolicyVersion] <> i.[PolicyVersion]
            OR d.[TransformationLineageHash] <> i.[TransformationLineageHash]
            OR d.[DecidedAtUtc] <> i.[DecidedAtUtc]
            OR s.[FeatureWindowEndUtc] > i.[DecidedAtUtc]
            OR s.[CapturedAtUtc] > i.[DecidedAtUtc]
    )
    BEGIN
        THROW 51011, 'Decision bundle failed temporal integrity checks.', 1;
    END
END;
""");

            migrationBuilder.Sql(
                """
CREATE OR ALTER TRIGGER [dbo].[trg_cti_decision_evidence_references_validate_timing]
ON [dbo].[cti_decision_evidence_references]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN [dbo].[cti_decisions] AS d ON d.[Id] = i.[DecisionId]
        LEFT JOIN [dbo].[cti_evidence_assertions] AS e ON e.[Id] = i.[EvidenceAssertionId]
        WHERE d.[Id] IS NULL
            OR e.[Id] IS NULL
            OR e.[CaseId] <> d.[CaseId]
            OR e.[ObservedAtUtc] > i.[ReferencedAtUtc]
            OR i.[ReferencedAtUtc] > d.[DecidedAtUtc]
    )
    BEGIN
        THROW 51012, 'Decision evidence reference violates timing integrity.', 1;
    END
END;
""");

            migrationBuilder.Sql(
                """
CREATE OR ALTER TRIGGER [dbo].[trg_cti_policy_version_references_validate_timing]
ON [dbo].[cti_policy_version_references]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN [dbo].[cti_feature_snapshots] AS s ON s.[Id] = i.[FeatureSnapshotId]
        WHERE s.[Id] IS NULL
            OR i.[PublishedAtUtc] > s.[CapturedAtUtc]
    )
    BEGIN
        THROW 51013, 'Policy version reference violates snapshot cutoff integrity.', 1;
    END
END;
""");

            migrationBuilder.Sql(
                """
CREATE OR ALTER TRIGGER [dbo].[trg_cti_model_version_references_validate_timing]
ON [dbo].[cti_model_version_references]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN [dbo].[cti_feature_snapshots] AS s ON s.[Id] = i.[FeatureSnapshotId]
        WHERE s.[Id] IS NULL
            OR i.[TrainedAtUtc] > s.[CapturedAtUtc]
    )
    BEGIN
        THROW 51014, 'Model version reference violates snapshot cutoff integrity.', 1;
    END
END;
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            DropTrigger(migrationBuilder, "trg_cti_model_version_references_validate_timing");
            DropTrigger(migrationBuilder, "trg_cti_policy_version_references_validate_timing");
            DropTrigger(migrationBuilder, "trg_cti_decision_evidence_references_validate_timing");
            DropTrigger(migrationBuilder, "trg_cti_decision_bundles_validate_temporal_integrity");
            DropTrigger(migrationBuilder, "trg_cti_decisions_validate_temporal_integrity");

            DropTrigger(migrationBuilder, "trg_cti_audit_records_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_decision_lineage_references_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_decision_evidence_references_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_model_decision_traces_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_model_version_references_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_policy_version_references_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_source_trust_snapshot_values_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_asset_criticality_snapshot_values_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_graph_derived_features_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_feature_vectors_prevent_mutation");
            DropTrigger(migrationBuilder, "trg_cti_feature_snapshots_prevent_mutation");
        }

        private static void CreateAppendOnlyMutationTrigger(MigrationBuilder migrationBuilder, string triggerName, string tableName)
        {
            migrationBuilder.Sql(
                $"""
CREATE OR ALTER TRIGGER [dbo].[{triggerName}]
ON [dbo].[{tableName}]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51000, 'Append-only table does not allow update or delete operations.', 1;
END;
""");
        }

        private static void DropTrigger(MigrationBuilder migrationBuilder, string triggerName)
        {
            migrationBuilder.Sql(
                $"""
IF OBJECT_ID(N'[dbo].[{triggerName}]', N'TR') IS NOT NULL
BEGIN
    DROP TRIGGER [dbo].[{triggerName}];
END;
""");
        }
    }
}
