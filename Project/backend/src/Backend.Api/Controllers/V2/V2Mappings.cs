using Backend.Contracts.Cases;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;

namespace Backend.Api.Controllers.V2;

internal static class V2Mappings
{
    public static TEnum ParseEnum<TEnum>(string rawValue, string fieldName)
        where TEnum : struct, Enum
    {
        if (Enum.TryParse<TEnum>(rawValue, true, out var parsed))
        {
            return parsed;
        }

        throw new ArgumentException($"Invalid {fieldName} '{rawValue}'.", fieldName);
    }

    public static string ToCasePriority(AlertSeverity severity)
    {
        return severity.ToString();
    }

    public static AlertSeverity ParseSeverityOrPriority(string rawValue)
    {
        return ParseEnum<AlertSeverity>(rawValue, nameof(rawValue));
    }

    public static RuleScopeType ParseRuleScopeType(string rawValue)
    {
        return ParseEnum<RuleScopeType>(rawValue, nameof(rawValue));
    }

    public static AlertStatus ParseAlertStatusFromCaseStatus(string rawValue)
    {
        if (Enum.TryParse<AlertStatus>(rawValue, true, out var direct))
        {
            return direct;
        }

        return rawValue.Trim().ToLowerInvariant() switch
        {
            "inreview" => AlertStatus.Investigating,
            "awaitingapproval" => AlertStatus.Investigating,
            "approved" => AlertStatus.Resolved,
            "rejected" => AlertStatus.Resolved,
            _ => throw new ArgumentException($"Invalid status '{rawValue}'.", nameof(rawValue)),
        };
    }

    public static CaseResponse ToLegacyCaseResponse(this Alert source)
    {
        var legacyStatus = source.Status switch
        {
            AlertStatus.Open => "Open",
            AlertStatus.Investigating => "InReview",
            AlertStatus.Resolved => "Approved",
            AlertStatus.Closed => "Closed",
            _ => source.Status.ToString(),
        };

        return new CaseResponse(
            source.Id,
            source.Title,
            source.Summary,
            ToCasePriority(source.Severity),
            legacyStatus,
            source.OwnerUserId,
            source.ApprovalTierRequired,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);
    }

    public static AlertResponse ToAlertResponse(this Alert source)
    {
        return new AlertResponse(
            source.Id,
            source.Title,
            source.Summary,
            source.Severity.ToString(),
            source.Status.ToString(),
            source.OwnerUserId,
            source.ApprovalTierRequired,
            source.FirstDetectedAtUtc,
            source.LastDetectedAtUtc,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);
    }

    public static PermissionResponse ToPermissionResponse(this Permission source)
        => new(source.Id, source.Key, source.Description, source.CreatedAtUtc);

    public static RolePermissionResponse ToRolePermissionResponse(this RolePermission source)
        => new(source.RoleId, source.PermissionId, source.GrantedByUserId, source.GrantedAtUtc);

    public static NetworkResponse ToNetworkResponse(this Network source)
        => new(source.Id, source.Name, source.CidrBlock, source.Description, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static SubnetResponse ToSubnetResponse(this Subnet source)
        => new(source.Id, source.NetworkId, source.Name, source.CidrBlock, source.Gateway, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static TargetServerResponse ToTargetServerResponse(this TargetServer source)
        => new(source.Id, source.SubnetId, source.Hostname, source.IpAddress, source.OperatingSystem, source.Environment, source.Status.ToString(), source.CreatedAtUtc, source.UpdatedAtUtc);

    public static TargetGroupResponse ToTargetGroupResponse(this TargetGroup source, int memberCount)
        => new(source.Id, source.Name, source.Description, source.IsEnabled, memberCount, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static TargetGroupMemberResponse ToTargetGroupMemberResponse(this TargetGroupMember source, string hostname, string ipAddress)
        => new(source.TargetGroupId, source.TargetServerId, hostname, ipAddress, source.AddedByUserId, source.AddedAtUtc);

    public static DiscoveryRunResponse ToDiscoveryRunResponse(this DiscoveryRun source)
        => new(
            source.Id,
            source.SubnetId,
            source.RequestedCidr,
            source.RangeStartIp,
            source.RangeEndIp,
            source.Status.ToString(),
            source.QueuedAtUtc,
            source.StartedAtUtc,
            source.CompletedAtUtc,
            source.TotalHosts,
            source.ReachableHosts,
            source.UnreachableHosts,
            source.Summary);

    public static DiscoveredHostResponse ToDiscoveredHostResponse(this DiscoveredHost source)
        => new(
            source.Id,
            source.SubnetId,
            source.IpAddress,
            source.Hostname,
            source.Reachability.ToString(),
            source.FirstDiscoveredAtUtc,
            source.LastCheckedAtUtc,
            source.LastSeenAtUtc,
            source.LastDiscoveryRunId,
            source.PromotedTargetServerId,
            source.PromotedAtUtc);

    public static ManagedServerScannerAssignmentResponse ToManagedServerScannerAssignmentResponse(
        this TargetServerScannerAssignment source,
        string scannerName,
        IReadOnlyList<string> capabilities)
        => new(
            source.TargetServerId,
            source.ScannerId,
            scannerName,
            source.ConnectivityStatus.ToString(),
            source.LastHeartbeatUtc,
            source.LastContactUtc,
            source.IsEnabled,
            capabilities,
            source.UpdatedAtUtc);

    public static ManagedServerResponse ToManagedServerResponse(
        this TargetServer source,
        bool hasConnectionSecret,
        IReadOnlyList<ManagedServerScannerAssignmentResponse> scannerAssignments,
        IReadOnlyList<string> scannerCapabilities)
        => new(
            source.Id,
            source.SubnetId,
            source.Hostname,
            source.IpAddress,
            source.OperatingSystem,
            source.Environment,
            source.Status.ToString(),
            source.ConnectivityStatus.ToString(),
            source.LastHeartbeatUtc,
            source.LastContactUtc,
            source.ConnectionProtocol?.ToString(),
            string.IsNullOrWhiteSpace(source.ConnectionHost) ? null : source.ConnectionHost,
            source.ConnectionPort,
            source.ConnectionAuthMode?.ToString(),
            string.IsNullOrWhiteSpace(source.ConnectionUsername) ? null : source.ConnectionUsername,
            hasConnectionSecret,
            source.ConnectionSecretUpdatedAtUtc,
            scannerAssignments,
            scannerCapabilities,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static ScannerResponse ToScannerResponse(this Scanner source, IReadOnlyList<string> capabilities)
        => new(source.Id, source.Name, source.EngineType, source.Version, source.HealthStatus.ToString(), source.LastHeartbeatUtc, source.CreatedAtUtc, source.UpdatedAtUtc, capabilities);

    public static FeedSourceResponse ToFeedSourceResponse(this FeedSource source)
        => new(source.Id, source.Name, source.SourceType.ToString(), source.Endpoint, source.IsEnabled, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static IocFileResponse ToIocFileResponse(this IocFile source)
        => new(source.Id, source.FeedSourceId, source.FileName, source.StorageUri, source.ContentHash, source.ImportedAtUtc, source.CreatedAtUtc);

    public static IocResponse ToIocResponse(this Ioc source)
        => new(source.Id, source.FeedSourceId, source.IocFileId, source.Type.ToString(), source.Value, source.Severity.ToString(), source.Confidence, source.FirstSeenAtUtc, source.LastSeenAtUtc, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static RuleArtifactResponse ToRuleArtifactResponse(this RuleArtifact source)
        => new(source.Id, source.Name, source.RuleFamily, source.Description, source.IsActive, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static RuleRevisionResponse ToRuleRevisionResponse(this RuleRevision source)
        => new(source.Id, source.RuleArtifactId, source.RevisionNumber, source.RuleBody, source.Status.ToString(), source.CreatedAtUtc, source.UpdatedAtUtc);

    public static RuleListItemResponse ToRuleListItemResponse(this RuleArtifact source)
        => new(
            source.Id,
            source.Name,
            source.RuleFamily,
            source.Source,
            source.Description,
            source.Tags,
            source.Severity,
            source.LifecycleStatus,
            source.ScopeType.ToString().ToLowerInvariant(),
            source.ScopeValue,
            source.CurrentRevisionNumber,
            source.CurrentVersionLabel,
            source.IsDeleted,
            source.CreatedAtUtc,
            source.UpdatedAtUtc,
            source.CreatedByUserId,
            source.UpdatedByUserId);

    public static RuleRevisionItemResponse ToRuleRevisionItemResponse(this RuleRevision source, RuleValidationResultResponse validation)
        => new(
            source.Id,
            source.RuleArtifactId,
            source.RevisionNumber,
            source.VersionLabel,
            source.OriginalContent,
            source.MetadataJson,
            source.ChangeType,
            source.ChangeReason,
            source.LifecycleStatus,
            validation,
            source.RuleImportAttemptId,
            source.CreatedAtUtc,
            source.CreatedByUserId);

    public static RuleDistributionResponse ToRuleDistributionResponse(this RuleDistribution source)
        => new(source.Id, source.RuleRevisionId, source.TargetServerId, source.Status.ToString(), source.Notes, source.DistributedAtUtc, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static RuleDistributionAttemptResponse ToRuleDistributionAttemptResponse(this RuleDistributionAttempt source)
        => new(
            source.Id,
            source.RuleDistributionJobId,
            source.AttemptNumber,
            source.Status.ToString(),
            source.StartedAtUtc,
            source.CompletedAtUtc,
            source.BackoffSeconds,
            source.TriggeredByUserId,
            source.Summary,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static RuleDistributionTargetAttemptResponse ToRuleDistributionTargetAttemptResponse(this RuleDistributionTargetAttempt source)
        => new(
            source.Id,
            source.RuleDistributionAttemptId,
            source.RuleDistributionTargetId,
            source.Status.ToString(),
            source.Transport,
            source.RemoteCorrelationId,
            source.Diagnostic,
            source.IsRetryable,
            source.StartedAtUtc,
            source.CompletedAtUtc,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static RuleDistributionTargetResponse ToRuleDistributionTargetResponse(
        this RuleDistributionTarget source,
        IReadOnlyList<RuleDistributionTargetAttemptResponse> attempts)
        => new(
            source.Id,
            source.RuleDistributionJobId,
            source.TargetServerId,
            source.TargetHostname,
            source.TargetIpAddress,
            source.Status.ToString(),
            source.IsRetryable,
            source.AttemptCount,
            source.LastError,
            source.LastAttemptAtUtc,
            source.SucceededAtUtc,
            source.CreatedAtUtc,
            source.UpdatedAtUtc,
            attempts);

    public static RuleImportAttemptResponse ToRuleImportAttemptResponse(
        this RuleImportAttempt source,
        IReadOnlyList<RuleValidationDiagnosticResponse> diagnostics,
        RuleValidationResultResponse validation)
        => new(
            source.Id,
            source.FileName,
            source.FileHash,
            source.DeclaredRuleFamily,
            source.WasSuccessful,
            source.FailureReason,
            source.SourceMetadataJson,
            source.ParsedMetadataJson,
            diagnostics,
            validation,
            source.RuleArtifactId,
            source.RuleRevisionId,
            source.CreatedAtUtc,
            source.UpdatedAtUtc,
            source.CreatedByUserId);

    public static ScanPlanResponse ToScanPlanResponse(
        this ScanPlan source,
        IReadOnlyList<Guid> targetServerIds,
        IReadOnlyList<Guid> ruleRevisionIds,
        IReadOnlyList<ScanPlanTargetSummaryResponse> targetServers,
        IReadOnlyList<ScanPlanRuleSummaryResponse> rules,
        DateTimeOffset? lastCompletedAtUtc,
        string? lastResultStatus,
        string? lastResultSummary)
        => new(
            source.Id,
            source.Name,
            source.Description,
            source.ScannerCapability.ToString(),
            source.RuleSelectionMode.ToString(),
            source.RuleScopeType?.ToString(),
            source.RuleScopeValue,
            source.CadenceType.ToString(),
            source.IntervalMinutes,
            source.RunAtHourUtc,
            source.RunAtMinuteUtc,
            source.WeeklyDayOfWeek,
            source.OperatorNotes,
            source.Status.ToString(),
            source.NextRunAtUtc,
            source.LastQueuedAtUtc,
            lastCompletedAtUtc,
            lastResultStatus,
            lastResultSummary,
            targetServerIds,
            ruleRevisionIds,
            targetServers,
            rules,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static ScanJobResponse ToScanJobResponse(this ScanJob source, ScanJobStatusCounts counts)
        => new(
            source.Id,
            source.ScanPlanId,
            source.TriggerSource,
            source.Status.ToString(),
            source.QueuedAtUtc,
            source.StartedAtUtc,
            source.CompletedAtUtc,
            source.TriggeredByUserId,
            source.Summary,
            source.CancellationRequested,
            source.CancellationRequestedAtUtc,
            source.CancellationReason,
            counts.TotalTargets,
            counts.CompletedTargets,
            counts.FailedTargets,
            counts.CancelledTargets,
            counts.PartiallyCompletedTargets,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static ScanJobTargetExecutionResponse ToScanJobTargetExecutionResponse(this ScanJobTargetExecution source)
        => new(
            source.Id,
            source.ScanJobId,
            source.TargetServerId,
            source.TargetHostname,
            source.TargetIpAddress,
            source.ScannerId,
            source.ScannerName,
            source.Status.ToString(),
            source.StartedAtUtc,
            source.CompletedAtUtc,
            source.Summary,
            source.ErrorMessage,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);

    public static ReportResponse ToReportResponse(this Report source, IReadOnlyList<Guid> alertIds)
        => new(source.Id, source.Title, source.ReportType.ToString(), source.SummaryJson, source.GeneratedAtUtc, source.CreatedAtUtc, source.UpdatedAtUtc, alertIds);

    public static AuditLogResponse ToAuditLogResponse(this AuditLog source)
        => new(source.Id, source.ActorUserId, source.ActionType, source.EntityType, source.EntityId, source.PayloadJson, source.OccurredAtUtc);

    public static RetentionPolicyResponse ToRetentionPolicyResponse(this RetentionPolicy source)
        => new(source.Id, source.DataType.ToString(), source.RetainDays, source.ArchiveAfterDays, source.IsEnabled, source.CreatedAtUtc, source.UpdatedAtUtc);

    public static ArchiveRecordResponse ToArchiveRecordResponse(this ArchiveRecord source)
        => new(source.Id, source.RetentionPolicyId, source.EntityType, source.EntityId, source.ArchiveUri, source.ArchivedAtUtc, source.CreatedAtUtc);
}

internal sealed record ScanJobStatusCounts(
    int TotalTargets,
    int CompletedTargets,
    int FailedTargets,
    int CancelledTargets,
    int PartiallyCompletedTargets);
