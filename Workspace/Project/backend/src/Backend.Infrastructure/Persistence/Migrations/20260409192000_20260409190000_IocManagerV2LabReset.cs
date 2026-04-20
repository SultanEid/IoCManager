using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CtiDbContext))]
[Migration("20260409192000_20260409190000_IocManagerV2LabReset")]
public partial class _20260409190000_IocManagerV2LabReset : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
-- Drop CTI append-only triggers from v1.
IF OBJECT_ID(N'[dbo].[trg_cti_model_version_references_validate_timing]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_model_version_references_validate_timing];
IF OBJECT_ID(N'[dbo].[trg_cti_policy_version_references_validate_timing]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_policy_version_references_validate_timing];
IF OBJECT_ID(N'[dbo].[trg_cti_decision_evidence_references_validate_timing]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_decision_evidence_references_validate_timing];
IF OBJECT_ID(N'[dbo].[trg_cti_decision_bundles_validate_temporal_integrity]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_decision_bundles_validate_temporal_integrity];
IF OBJECT_ID(N'[dbo].[trg_cti_decisions_validate_temporal_integrity]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_decisions_validate_temporal_integrity];
IF OBJECT_ID(N'[dbo].[trg_cti_audit_records_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_audit_records_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_decision_lineage_references_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_decision_lineage_references_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_decision_evidence_references_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_decision_evidence_references_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_model_decision_traces_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_model_decision_traces_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_model_version_references_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_model_version_references_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_policy_version_references_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_policy_version_references_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_source_trust_snapshot_values_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_source_trust_snapshot_values_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_asset_criticality_snapshot_values_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_asset_criticality_snapshot_values_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_graph_derived_features_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_graph_derived_features_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_feature_vectors_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_feature_vectors_prevent_mutation];
IF OBJECT_ID(N'[dbo].[trg_cti_feature_snapshots_prevent_mutation]', N'TR') IS NOT NULL DROP TRIGGER [dbo].[trg_cti_feature_snapshots_prevent_mutation];

-- Drop CTI/case-management tables for lab reset.
IF OBJECT_ID(N'[dbo].[report_ingestion_claims]', N'U') IS NOT NULL DROP TABLE [dbo].[report_ingestion_claims];
IF OBJECT_ID(N'[dbo].[report_ingestion_runs]', N'U') IS NOT NULL DROP TABLE [dbo].[report_ingestion_runs];
IF OBJECT_ID(N'[dbo].[rollback_plans]', N'U') IS NOT NULL DROP TABLE [dbo].[rollback_plans];
IF OBJECT_ID(N'[dbo].[rollout_plans]', N'U') IS NOT NULL DROP TABLE [dbo].[rollout_plans];
IF OBJECT_ID(N'[dbo].[deployment_recommendations]', N'U') IS NOT NULL DROP TABLE [dbo].[deployment_recommendations];
IF OBJECT_ID(N'[dbo].[rule_proposals]', N'U') IS NOT NULL DROP TABLE [dbo].[rule_proposals];
IF OBJECT_ID(N'[dbo].[feedback]', N'U') IS NOT NULL DROP TABLE [dbo].[feedback];
IF OBJECT_ID(N'[dbo].[deployments]', N'U') IS NOT NULL DROP TABLE [dbo].[deployments];
IF OBJECT_ID(N'[dbo].[rule_revisions]', N'U') IS NOT NULL DROP TABLE [dbo].[rule_revisions];
IF OBJECT_ID(N'[dbo].[rules]', N'U') IS NOT NULL DROP TABLE [dbo].[rules];
IF OBJECT_ID(N'[dbo].[decisions]', N'U') IS NOT NULL DROP TABLE [dbo].[decisions];
IF OBJECT_ID(N'[dbo].[evidence]', N'U') IS NOT NULL DROP TABLE [dbo].[evidence];
IF OBJECT_ID(N'[dbo].[cases]', N'U') IS NOT NULL DROP TABLE [dbo].[cases];
IF OBJECT_ID(N'[dbo].[job_runs]', N'U') IS NOT NULL DROP TABLE [dbo].[job_runs];

IF OBJECT_ID(N'[dbo].[cti_approvals]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_approvals];
IF OBJECT_ID(N'[dbo].[cti_deployment_recommendations]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_deployment_recommendations];
IF OBJECT_ID(N'[dbo].[cti_feedback]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_feedback];
IF OBJECT_ID(N'[dbo].[cti_rule_proposals]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_rule_proposals];
IF OBJECT_ID(N'[dbo].[cti_decision_bundles]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_decision_bundles];
IF OBJECT_ID(N'[dbo].[cti_decisions]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_decisions];
IF OBJECT_ID(N'[dbo].[cti_decision_lineage_references]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_decision_lineage_references];
IF OBJECT_ID(N'[dbo].[cti_decision_evidence_references]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_decision_evidence_references];
IF OBJECT_ID(N'[dbo].[cti_model_decision_traces]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_model_decision_traces];
IF OBJECT_ID(N'[dbo].[cti_model_version_references]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_model_version_references];
IF OBJECT_ID(N'[dbo].[cti_policy_version_references]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_policy_version_references];
IF OBJECT_ID(N'[dbo].[cti_graph_derived_features]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_graph_derived_features];
IF OBJECT_ID(N'[dbo].[cti_graph_artifact_references]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_graph_artifact_references];
IF OBJECT_ID(N'[dbo].[cti_feature_vectors]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_feature_vectors];
IF OBJECT_ID(N'[dbo].[cti_asset_criticality_snapshot_values]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_asset_criticality_snapshot_values];
IF OBJECT_ID(N'[dbo].[cti_source_trust_snapshot_values]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_source_trust_snapshot_values];
IF OBJECT_ID(N'[dbo].[cti_feature_snapshots]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_feature_snapshots];
IF OBJECT_ID(N'[dbo].[cti_transformation_lineage_records]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_transformation_lineage_records];
IF OBJECT_ID(N'[dbo].[cti_evidence_assertions]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_evidence_assertions];
IF OBJECT_ID(N'[dbo].[cti_source_reliability_profiles]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_source_reliability_profiles];
IF OBJECT_ID(N'[dbo].[cti_audit_records]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_audit_records];
IF OBJECT_ID(N'[dbo].[cti_cases]', N'U') IS NOT NULL DROP TABLE [dbo].[cti_cases];

CREATE TABLE [dbo].[permissions] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Key] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(1000) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX [IX_permissions_key] ON [dbo].[permissions]([Key]);

CREATE TABLE [dbo].[role_permissions] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [RoleId] UNIQUEIDENTIFIER NOT NULL,
    [PermissionId] UNIQUEIDENTIFIER NOT NULL,
    [GrantedByUserId] NVARCHAR(128) NOT NULL,
    [GrantedAtUtc] DATETIMEOFFSET NOT NULL,
CONSTRAINT [FK_role_permissions_roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[roles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_role_permissions_permissions] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[permissions]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_role_permissions_role_permission] ON [dbo].[role_permissions]([RoleId], [PermissionId]);

CREATE TABLE [dbo].[networks] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [CidrBlock] NVARCHAR(64) NOT NULL,
    [Description] NVARCHAR(2000) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX [IX_networks_name] ON [dbo].[networks]([Name]);

CREATE TABLE [dbo].[subnets] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [NetworkId] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [CidrBlock] NVARCHAR(64) NOT NULL,
    [Gateway] NVARCHAR(64) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_subnets_networks] FOREIGN KEY ([NetworkId]) REFERENCES [dbo].[networks]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_subnets_network_cidr] ON [dbo].[subnets]([NetworkId], [CidrBlock]);

CREATE TABLE [dbo].[target_servers] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [SubnetId] UNIQUEIDENTIFIER NOT NULL,
    [Hostname] NVARCHAR(200) NOT NULL,
    [IpAddress] NVARCHAR(64) NOT NULL,
    [OperatingSystem] NVARCHAR(200) NOT NULL,
    [Environment] NVARCHAR(100) NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_target_servers_subnets] FOREIGN KEY ([SubnetId]) REFERENCES [dbo].[subnets]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_target_servers_ip] ON [dbo].[target_servers]([IpAddress]);

CREATE TABLE [dbo].[scanners] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [EngineType] NVARCHAR(120) NOT NULL,
    [Version] NVARCHAR(50) NOT NULL,
    [HealthStatus] NVARCHAR(64) NOT NULL,
    [LastHeartbeatUtc] DATETIMEOFFSET NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX [IX_scanners_name] ON [dbo].[scanners]([Name]);

CREATE TABLE [dbo].[feed_sources] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [SourceType] NVARCHAR(64) NOT NULL,
    [Endpoint] NVARCHAR(2000) NOT NULL,
    [IsEnabled] BIT NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX [IX_feed_sources_name] ON [dbo].[feed_sources]([Name]);

CREATE TABLE [dbo].[ioc_files] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [FeedSourceId] UNIQUEIDENTIFIER NOT NULL,
    [FileName] NVARCHAR(260) NOT NULL,
    [StorageUri] NVARCHAR(2000) NOT NULL,
    [ContentHash] NVARCHAR(128) NOT NULL,
    [ImportedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_ioc_files_feed_sources] FOREIGN KEY ([FeedSourceId]) REFERENCES [dbo].[feed_sources]([Id]) ON DELETE CASCADE
);
CREATE INDEX [IX_ioc_files_content_hash] ON [dbo].[ioc_files]([ContentHash]);

CREATE TABLE [dbo].[iocs] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [FeedSourceId] UNIQUEIDENTIFIER NOT NULL,
    [IocFileId] UNIQUEIDENTIFIER NULL,
    [Type] NVARCHAR(64) NOT NULL,
    [Value] NVARCHAR(500) NOT NULL,
    [Severity] NVARCHAR(64) NOT NULL,
    [Confidence] DECIMAL(5,4) NOT NULL,
    [FirstSeenAtUtc] DATETIMEOFFSET NOT NULL,
    [LastSeenAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_iocs_feed_sources] FOREIGN KEY ([FeedSourceId]) REFERENCES [dbo].[feed_sources]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_iocs_ioc_files] FOREIGN KEY ([IocFileId]) REFERENCES [dbo].[ioc_files]([Id]) ON DELETE SET NULL,
    CONSTRAINT [CK_iocs_confidence] CHECK ([Confidence] >= 0 AND [Confidence] <= 1)
);
CREATE UNIQUE INDEX [IX_iocs_type_value] ON [dbo].[iocs]([Type], [Value]);

CREATE TABLE [dbo].[rule_artifacts] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [RuleFamily] NVARCHAR(64) NOT NULL,
    [Description] NVARCHAR(2000) NOT NULL,
    [IsActive] BIT NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX [IX_rule_artifacts_family_name] ON [dbo].[rule_artifacts]([RuleFamily], [Name]);

CREATE TABLE [dbo].[rule_revisions_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [RuleArtifactId] UNIQUEIDENTIFIER NOT NULL,
    [RevisionNumber] INT NOT NULL,
    [RuleBody] NVARCHAR(MAX) NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_rule_revisions_v2_rule_artifacts] FOREIGN KEY ([RuleArtifactId]) REFERENCES [dbo].[rule_artifacts]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_rule_revisions_v2_artifact_revision] ON [dbo].[rule_revisions_v2]([RuleArtifactId], [RevisionNumber]);

CREATE TABLE [dbo].[rule_distributions] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [RuleRevisionId] UNIQUEIDENTIFIER NOT NULL,
    [TargetServerId] UNIQUEIDENTIFIER NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [Notes] NVARCHAR(2000) NULL,
    [DistributedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_rule_distributions_rule_revisions_v2] FOREIGN KEY ([RuleRevisionId]) REFERENCES [dbo].[rule_revisions_v2]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_rule_distributions_target_servers] FOREIGN KEY ([TargetServerId]) REFERENCES [dbo].[target_servers]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_rule_distributions_revision_target] ON [dbo].[rule_distributions]([RuleRevisionId], [TargetServerId]);

CREATE TABLE [dbo].[scan_plans] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(2000) NOT NULL,
    [ScheduleExpression] NVARCHAR(200) NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);

CREATE TABLE [dbo].[scan_plan_target_servers] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ScanPlanId] UNIQUEIDENTIFIER NOT NULL,
    [TargetServerId] UNIQUEIDENTIFIER NOT NULL,
    [AddedByUserId] NVARCHAR(128) NOT NULL,
    [AddedAtUtc] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_scan_plan_target_servers_scan_plans] FOREIGN KEY ([ScanPlanId]) REFERENCES [dbo].[scan_plans]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_scan_plan_target_servers_target_servers] FOREIGN KEY ([TargetServerId]) REFERENCES [dbo].[target_servers]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_scan_plan_target_servers_unique] ON [dbo].[scan_plan_target_servers]([ScanPlanId], [TargetServerId]);

CREATE TABLE [dbo].[scan_plan_rule_revisions] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ScanPlanId] UNIQUEIDENTIFIER NOT NULL,
    [RuleRevisionId] UNIQUEIDENTIFIER NOT NULL,
    [AddedByUserId] NVARCHAR(128) NOT NULL,
    [AddedAtUtc] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_scan_plan_rule_revisions_scan_plans] FOREIGN KEY ([ScanPlanId]) REFERENCES [dbo].[scan_plans]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_scan_plan_rule_revisions_rule_revisions_v2] FOREIGN KEY ([RuleRevisionId]) REFERENCES [dbo].[rule_revisions_v2]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_scan_plan_rule_revisions_unique] ON [dbo].[scan_plan_rule_revisions]([ScanPlanId], [RuleRevisionId]);

CREATE TABLE [dbo].[scan_jobs] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ScanPlanId] UNIQUEIDENTIFIER NULL,
    [TriggerSource] NVARCHAR(120) NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [QueuedAtUtc] DATETIMEOFFSET NOT NULL,
    [StartedAtUtc] DATETIMEOFFSET NULL,
    [CompletedAtUtc] DATETIMEOFFSET NULL,
    [TriggeredByUserId] NVARCHAR(128) NOT NULL,
    [Summary] NVARCHAR(4000) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_scan_jobs_scan_plans] FOREIGN KEY ([ScanPlanId]) REFERENCES [dbo].[scan_plans]([Id]) ON DELETE SET NULL
);
CREATE INDEX [IX_scan_jobs_status_queued] ON [dbo].[scan_jobs]([Status], [QueuedAtUtc]);

CREATE TABLE [dbo].[job_attempts] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ScanJobId] UNIQUEIDENTIFIER NOT NULL,
    [AttemptNumber] INT NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [StartedAtUtc] DATETIMEOFFSET NOT NULL,
    [CompletedAtUtc] DATETIMEOFFSET NULL,
    [Details] NVARCHAR(4000) NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_job_attempts_scan_jobs] FOREIGN KEY ([ScanJobId]) REFERENCES [dbo].[scan_jobs]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_job_attempts_job_attempt] ON [dbo].[job_attempts]([ScanJobId], [AttemptNumber]);

CREATE TABLE [dbo].[scan_results] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [JobAttemptId] UNIQUEIDENTIFIER NOT NULL,
    [TargetServerId] UNIQUEIDENTIFIER NOT NULL,
    [RuleRevisionId] UNIQUEIDENTIFIER NULL,
    [IocId] UNIQUEIDENTIFIER NULL,
    [Disposition] NVARCHAR(64) NOT NULL,
    [Confidence] DECIMAL(5,4) NOT NULL,
    [EvidenceJson] NVARCHAR(MAX) NOT NULL,
    [ObservedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_scan_results_job_attempts] FOREIGN KEY ([JobAttemptId]) REFERENCES [dbo].[job_attempts]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_scan_results_target_servers] FOREIGN KEY ([TargetServerId]) REFERENCES [dbo].[target_servers]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_scan_results_rule_revisions_v2] FOREIGN KEY ([RuleRevisionId]) REFERENCES [dbo].[rule_revisions_v2]([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_scan_results_iocs] FOREIGN KEY ([IocId]) REFERENCES [dbo].[iocs]([Id]) ON DELETE SET NULL,
    CONSTRAINT [CK_scan_results_confidence] CHECK ([Confidence] >= 0 AND [Confidence] <= 1)
);
CREATE INDEX [IX_scan_results_target_observed] ON [dbo].[scan_results]([TargetServerId], [ObservedAtUtc]);

CREATE TABLE [dbo].[alerts_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Title] NVARCHAR(200) NOT NULL,
    [Summary] NVARCHAR(4000) NOT NULL,
    [Severity] NVARCHAR(64) NOT NULL,
    [Status] NVARCHAR(64) NOT NULL,
    [OwnerUserId] NVARCHAR(128) NOT NULL,
    [ApprovalTierRequired] NVARCHAR(64) NOT NULL,
    [FirstDetectedAtUtc] DATETIMEOFFSET NOT NULL,
    [LastDetectedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE INDEX [IX_alerts_v2_status_severity] ON [dbo].[alerts_v2]([Status], [Severity]);

CREATE TABLE [dbo].[alert_scan_results] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [AlertId] UNIQUEIDENTIFIER NOT NULL,
    [ScanResultId] UNIQUEIDENTIFIER NOT NULL,
    [LinkedAtUtc] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_alert_scan_results_alerts_v2] FOREIGN KEY ([AlertId]) REFERENCES [dbo].[alerts_v2]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_alert_scan_results_scan_results] FOREIGN KEY ([ScanResultId]) REFERENCES [dbo].[scan_results]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_alert_scan_results_unique] ON [dbo].[alert_scan_results]([AlertId], [ScanResultId]);

CREATE TABLE [dbo].[reports_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Title] NVARCHAR(200) NOT NULL,
    [ReportType] NVARCHAR(64) NOT NULL,
    [SummaryJson] NVARCHAR(MAX) NOT NULL,
    [GeneratedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL
);
CREATE INDEX [IX_reports_v2_generated] ON [dbo].[reports_v2]([GeneratedAtUtc]);

CREATE TABLE [dbo].[report_alerts] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ReportId] UNIQUEIDENTIFIER NOT NULL,
    [AlertId] UNIQUEIDENTIFIER NOT NULL,
    [LinkedAtUtc] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_report_alerts_reports_v2] FOREIGN KEY ([ReportId]) REFERENCES [dbo].[reports_v2]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_report_alerts_alerts_v2] FOREIGN KEY ([AlertId]) REFERENCES [dbo].[alerts_v2]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_report_alerts_unique] ON [dbo].[report_alerts]([ReportId], [AlertId]);

CREATE TABLE [dbo].[audit_logs_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [ActorUserId] NVARCHAR(128) NOT NULL,
    [ActionType] NVARCHAR(128) NOT NULL,
    [EntityType] NVARCHAR(128) NOT NULL,
    [EntityId] NVARCHAR(128) NOT NULL,
    [PayloadJson] NVARCHAR(MAX) NOT NULL,
    [OccurredAtUtc] DATETIMEOFFSET NOT NULL
);
CREATE INDEX [IX_audit_logs_v2_entity] ON [dbo].[audit_logs_v2]([EntityType], [EntityId], [OccurredAtUtc]);

CREATE TABLE [dbo].[retention_policies_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [DataType] NVARCHAR(64) NOT NULL,
    [RetainDays] INT NOT NULL,
    [ArchiveAfterDays] INT NOT NULL,
    [IsEnabled] BIT NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [CK_retention_policies_v2_days] CHECK ([ArchiveAfterDays] > 0 AND [RetainDays] >= [ArchiveAfterDays])
);
CREATE UNIQUE INDEX [IX_retention_policies_v2_data_type] ON [dbo].[retention_policies_v2]([DataType]);

CREATE TABLE [dbo].[archive_records_v2] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [RetentionPolicyId] UNIQUEIDENTIFIER NOT NULL,
    [EntityType] NVARCHAR(128) NOT NULL,
    [EntityId] NVARCHAR(128) NOT NULL,
    [ArchiveUri] NVARCHAR(2000) NOT NULL,
    [ArchivedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
    [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
    [CreatedByUserId] NVARCHAR(128) NOT NULL,
    [UpdatedByUserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [FK_archive_records_v2_retention] FOREIGN KEY ([RetentionPolicyId]) REFERENCES [dbo].[retention_policies_v2]([Id]) ON DELETE CASCADE
);
CREATE INDEX [IX_archive_records_v2_entity] ON [dbo].[archive_records_v2]([EntityType], [EntityId], [ArchivedAtUtc]);

-- Seed baseline roles if missing.
IF NOT EXISTS (SELECT 1 FROM [dbo].[roles] WHERE [Name] = N'Analyst')
INSERT INTO [dbo].[roles]([Id], [Name], [NormalizedName], [ConcurrencyStamp]) VALUES ('3f8df2a9-1c49-4c41-b096-c57f5a5e62c7', N'Analyst', N'ANALYST', NEWID());
IF NOT EXISTS (SELECT 1 FROM [dbo].[roles] WHERE [Name] = N'Lead')
INSERT INTO [dbo].[roles]([Id], [Name], [NormalizedName], [ConcurrencyStamp]) VALUES ('ea4808e9-b86d-4cbe-9158-f37f2d78dbad', N'Lead', N'LEAD', NEWID());
IF NOT EXISTS (SELECT 1 FROM [dbo].[roles] WHERE [Name] = N'Admin')
INSERT INTO [dbo].[roles]([Id], [Name], [NormalizedName], [ConcurrencyStamp]) VALUES ('b3ca2ff3-d5d7-4e0d-bcc3-2e1b53ba689f', N'Admin', N'ADMIN', NEWID());

DECLARE @seedNow DATETIMEOFFSET = SYSUTCDATETIME();
INSERT INTO [dbo].[permissions]([Id], [Key], [Description], [CreatedAtUtc], [UpdatedAtUtc], [CreatedByUserId], [UpdatedByUserId]) VALUES
('531de6e3-6a5c-44de-8571-fc938f5f5e5d', N'identity.users.read', N'Permission ''identity.users.read''', @seedNow, @seedNow, N'system', N'system'),
('4f7d2634-a147-4a7f-b85b-35dfd4ebcab8', N'identity.roles.read', N'Permission ''identity.roles.read''', @seedNow, @seedNow, N'system', N'system'),
('2fd4ea17-1f9d-4ec2-9eab-2fce7a59064e', N'identity.permissions.manage', N'Permission ''identity.permissions.manage''', @seedNow, @seedNow, N'system', N'system'),
('e95ac11a-5e50-470a-a9da-9d7d9378db26', N'infrastructure.networks.manage', N'Permission ''infrastructure.networks.manage''', @seedNow, @seedNow, N'system', N'system'),
('f980df8a-9f67-432e-9d1d-21ea293f2f30', N'infrastructure.subnets.manage', N'Permission ''infrastructure.subnets.manage''', @seedNow, @seedNow, N'system', N'system'),
('17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a', N'infrastructure.target-servers.manage', N'Permission ''infrastructure.target-servers.manage''', @seedNow, @seedNow, N'system', N'system'),
('63db8c3d-57a0-4f0f-9fef-7693532968e0', N'infrastructure.scanners.manage', N'Permission ''infrastructure.scanners.manage''', @seedNow, @seedNow, N'system', N'system'),
('f7fa0ffd-9302-466e-81b8-b530fdb87f7d', N'ioc.feed-sources.manage', N'Permission ''ioc.feed-sources.manage''', @seedNow, @seedNow, N'system', N'system'),
('6cecc95e-d74f-4ac7-a0ca-2f9438f50ad8', N'ioc.files.manage', N'Permission ''ioc.files.manage''', @seedNow, @seedNow, N'system', N'system'),
('e78604df-3d8b-4fd6-9a66-2f19dc75ee15', N'ioc.items.manage', N'Permission ''ioc.items.manage''', @seedNow, @seedNow, N'system', N'system'),
('5c98b2d4-1fb7-4d54-83a5-1639812f4c8d', N'rules.artifacts.manage', N'Permission ''rules.artifacts.manage''', @seedNow, @seedNow, N'system', N'system'),
('620eec8f-fb99-4f04-baf5-2f95ae5ccf8c', N'rules.revisions.manage', N'Permission ''rules.revisions.manage''', @seedNow, @seedNow, N'system', N'system'),
('cb2a1811-e9ad-49b6-a949-26885283bc95', N'rules.distribution.manage', N'Permission ''rules.distribution.manage''', @seedNow, @seedNow, N'system', N'system'),
('9dcc59e3-9f74-4f71-8c62-7a6b97989d53', N'scanning.plans.manage', N'Permission ''scanning.plans.manage''', @seedNow, @seedNow, N'system', N'system'),
('44f889f9-3ce0-4ff8-9f91-1aa2acd9b4e2', N'scanning.jobs.manage', N'Permission ''scanning.jobs.manage''', @seedNow, @seedNow, N'system', N'system'),
('de5c4864-8f80-48a0-bb9f-8bcd7fdbb8cf', N'scanning.results.read', N'Permission ''scanning.results.read''', @seedNow, @seedNow, N'system', N'system'),
('22f7f6dd-55f2-4988-ba17-d5cc7adf872a', N'alerts.manage', N'Permission ''alerts.manage''', @seedNow, @seedNow, N'system', N'system'),
('60f2d5a4-5e54-4288-af88-1f6484cf68eb', N'reports.manage', N'Permission ''reports.manage''', @seedNow, @seedNow, N'system', N'system'),
('6114b9ff-9623-462e-b7c7-d0f85749ea3d', N'audit.read', N'Permission ''audit.read''', @seedNow, @seedNow, N'system', N'system'),
('293f2dbd-d847-4ae3-8f31-2fe578f4f4cf', N'retention.manage', N'Permission ''retention.manage''', @seedNow, @seedNow, N'system', N'system');

DECLARE @analystRoleId UNIQUEIDENTIFIER = (SELECT TOP 1 [Id] FROM [dbo].[roles] WHERE [Name] = N'Analyst');
DECLARE @leadRoleId UNIQUEIDENTIFIER = (SELECT TOP 1 [Id] FROM [dbo].[roles] WHERE [Name] = N'Lead');
DECLARE @adminRoleId UNIQUEIDENTIFIER = (SELECT TOP 1 [Id] FROM [dbo].[roles] WHERE [Name] = N'Admin');

INSERT INTO [dbo].[role_permissions]([Id], [RoleId], [PermissionId], [GrantedByUserId], [GrantedAtUtc])
SELECT NEWID(), @analystRoleId, p.[Id], N'system', @seedNow
FROM [dbo].[permissions] p
WHERE p.[Key] IN (N'identity.users.read', N'identity.roles.read', N'infrastructure.networks.manage', N'infrastructure.subnets.manage', N'infrastructure.target-servers.manage', N'infrastructure.scanners.manage', N'ioc.feed-sources.manage', N'ioc.files.manage', N'ioc.items.manage', N'rules.artifacts.manage', N'rules.revisions.manage', N'rules.distribution.manage', N'scanning.plans.manage', N'scanning.jobs.manage', N'scanning.results.read', N'alerts.manage', N'reports.manage', N'audit.read')
    AND @analystRoleId IS NOT NULL;

INSERT INTO [dbo].[role_permissions]([Id], [RoleId], [PermissionId], [GrantedByUserId], [GrantedAtUtc])
SELECT NEWID(), @leadRoleId, p.[Id], N'system', @seedNow
FROM [dbo].[permissions] p
WHERE p.[Key] IN (N'identity.users.read', N'identity.roles.read', N'identity.permissions.manage', N'infrastructure.networks.manage', N'infrastructure.subnets.manage', N'infrastructure.target-servers.manage', N'infrastructure.scanners.manage', N'ioc.feed-sources.manage', N'ioc.files.manage', N'ioc.items.manage', N'rules.artifacts.manage', N'rules.revisions.manage', N'rules.distribution.manage', N'scanning.plans.manage', N'scanning.jobs.manage', N'scanning.results.read', N'alerts.manage', N'reports.manage', N'audit.read', N'retention.manage')
    AND @leadRoleId IS NOT NULL;

INSERT INTO [dbo].[role_permissions]([Id], [RoleId], [PermissionId], [GrantedByUserId], [GrantedAtUtc])
SELECT NEWID(), @adminRoleId, p.[Id], N'system', @seedNow
FROM [dbo].[permissions] p
WHERE @adminRoleId IS NOT NULL;
""");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
IF OBJECT_ID(N'[dbo].[archive_records_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[archive_records_v2];
IF OBJECT_ID(N'[dbo].[retention_policies_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[retention_policies_v2];
IF OBJECT_ID(N'[dbo].[audit_logs_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[audit_logs_v2];
IF OBJECT_ID(N'[dbo].[report_alerts]', N'U') IS NOT NULL DROP TABLE [dbo].[report_alerts];
IF OBJECT_ID(N'[dbo].[reports_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[reports_v2];
IF OBJECT_ID(N'[dbo].[alert_scan_results]', N'U') IS NOT NULL DROP TABLE [dbo].[alert_scan_results];
IF OBJECT_ID(N'[dbo].[alerts_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[alerts_v2];
IF OBJECT_ID(N'[dbo].[scan_results]', N'U') IS NOT NULL DROP TABLE [dbo].[scan_results];
IF OBJECT_ID(N'[dbo].[job_attempts]', N'U') IS NOT NULL DROP TABLE [dbo].[job_attempts];
IF OBJECT_ID(N'[dbo].[scan_jobs]', N'U') IS NOT NULL DROP TABLE [dbo].[scan_jobs];
IF OBJECT_ID(N'[dbo].[scan_plan_rule_revisions]', N'U') IS NOT NULL DROP TABLE [dbo].[scan_plan_rule_revisions];
IF OBJECT_ID(N'[dbo].[scan_plan_target_servers]', N'U') IS NOT NULL DROP TABLE [dbo].[scan_plan_target_servers];
IF OBJECT_ID(N'[dbo].[scan_plans]', N'U') IS NOT NULL DROP TABLE [dbo].[scan_plans];
IF OBJECT_ID(N'[dbo].[rule_distributions]', N'U') IS NOT NULL DROP TABLE [dbo].[rule_distributions];
IF OBJECT_ID(N'[dbo].[rule_revisions_v2]', N'U') IS NOT NULL DROP TABLE [dbo].[rule_revisions_v2];
IF OBJECT_ID(N'[dbo].[rule_artifacts]', N'U') IS NOT NULL DROP TABLE [dbo].[rule_artifacts];
IF OBJECT_ID(N'[dbo].[iocs]', N'U') IS NOT NULL DROP TABLE [dbo].[iocs];
IF OBJECT_ID(N'[dbo].[ioc_files]', N'U') IS NOT NULL DROP TABLE [dbo].[ioc_files];
IF OBJECT_ID(N'[dbo].[feed_sources]', N'U') IS NOT NULL DROP TABLE [dbo].[feed_sources];
IF OBJECT_ID(N'[dbo].[scanners]', N'U') IS NOT NULL DROP TABLE [dbo].[scanners];
IF OBJECT_ID(N'[dbo].[target_servers]', N'U') IS NOT NULL DROP TABLE [dbo].[target_servers];
IF OBJECT_ID(N'[dbo].[subnets]', N'U') IS NOT NULL DROP TABLE [dbo].[subnets];
IF OBJECT_ID(N'[dbo].[networks]', N'U') IS NOT NULL DROP TABLE [dbo].[networks];
IF OBJECT_ID(N'[dbo].[role_permissions]', N'U') IS NOT NULL DROP TABLE [dbo].[role_permissions];
IF OBJECT_ID(N'[dbo].[permissions]', N'U') IS NOT NULL DROP TABLE [dbo].[permissions];
""");
    }
}
