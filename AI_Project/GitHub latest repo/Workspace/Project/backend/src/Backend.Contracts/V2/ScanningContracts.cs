using System.Text.Json;

namespace Backend.Contracts.V2;

public sealed record CreateScanPlanRequest(
    string Name,
    string Description,
    string ScannerCapability,
    string RuleSelectionMode,
    string? RuleScopeType,
    string? RuleScopeValue,
    string CadenceType,
    int? IntervalMinutes,
    int? RunAtHourUtc,
    int? RunAtMinuteUtc,
    int? WeeklyDayOfWeek,
    string? OperatorNotes,
    string? Status,
    string ActorUserId,
    IReadOnlyList<Guid> TargetServerIds,
    IReadOnlyList<Guid> RuleRevisionIds);

public sealed record UpdateScanPlanRequest(
    string Name,
    string Description,
    string ScannerCapability,
    string RuleSelectionMode,
    string? RuleScopeType,
    string? RuleScopeValue,
    string CadenceType,
    int? IntervalMinutes,
    int? RunAtHourUtc,
    int? RunAtMinuteUtc,
    int? WeeklyDayOfWeek,
    string? OperatorNotes,
    string Status,
    string ActorUserId,
    IReadOnlyList<Guid> TargetServerIds,
    IReadOnlyList<Guid> RuleRevisionIds);

public sealed record RunScanPlanRequest(string ActorUserId, string? TriggerSource);

public sealed record ScanPlanResponse(
    Guid Id,
    string Name,
    string Description,
    string ScannerCapability,
    string RuleSelectionMode,
    string? RuleScopeType,
    string? RuleScopeValue,
    string CadenceType,
    int? IntervalMinutes,
    int? RunAtHourUtc,
    int? RunAtMinuteUtc,
    int? WeeklyDayOfWeek,
    string OperatorNotes,
    string Status,
    DateTimeOffset? NextRunAtUtc,
    DateTimeOffset? LastQueuedAtUtc,
    DateTimeOffset? LastCompletedAtUtc,
    string? LastResultStatus,
    string? LastResultSummary,
    IReadOnlyList<Guid> TargetServerIds,
    IReadOnlyList<Guid> RuleRevisionIds,
    IReadOnlyList<ScanPlanTargetSummaryResponse> TargetServers,
    IReadOnlyList<ScanPlanRuleSummaryResponse> Rules,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record ScanPlanTargetSummaryResponse(
    Guid TargetServerId,
    string Hostname,
    string IpAddress);

public sealed record ScanPlanRuleSummaryResponse(
    Guid RuleRevisionId,
    Guid RuleArtifactId,
    string RuleName,
    string RuleFamily,
    int RevisionNumber,
    string VersionLabel);

public sealed record CancelScanJobRequest(string ActorUserId, string? Reason);

public sealed record ScanJobResponse(
    Guid Id,
    Guid? ScanPlanId,
    string TriggerSource,
    string Status,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    string TriggeredByUserId,
    string Summary,
    bool CancellationRequested,
    DateTimeOffset? CancellationRequestedAtUtc,
    string? CancellationReason,
    int TotalTargets,
    int CompletedTargets,
    int FailedTargets,
    int CancelledTargets,
    int PartiallyCompletedTargets,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record ScanJobTargetExecutionResponse(
    Guid Id,
    Guid ScanJobId,
    Guid TargetServerId,
    string TargetHostname,
    string TargetIpAddress,
    Guid? ScannerId,
    string ScannerName,
    string Status,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    string Summary,
    string? ErrorMessage,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record DetectionResultIngestionRequest(
    string Source,
    string ActorUserId,
    IReadOnlyList<DetectionResultIngestionRowRequest> Rows);

public sealed record DetectionResultIngestionRowRequest(
    string ScannerFamily,
    JsonElement Payload);

public sealed record DetectionResultIngestionResponse(
    Guid IngestionRunId,
    int TotalRows,
    int AcceptedRows,
    int DeduplicatedRows,
    int RejectedRows,
    IReadOnlyList<DetectionResultIngestionAcceptedRowResponse> Accepted,
    IReadOnlyList<DetectionResultIngestionDiagnosticResponse> Diagnostics);

public sealed record DetectionResultIngestionAcceptedRowResponse(
    int RowIndex,
    Guid ScanResultId,
    bool Deduplicated,
    string Fingerprint);

public sealed record DetectionResultIngestionDiagnosticResponse(
    int RowIndex,
    string Code,
    string Field,
    string Message,
    string RawSnippetHash);

public sealed record DetectionHistoryResponse(
    int Total,
    int Take,
    int Skip,
    IReadOnlyList<DetectionHistoryItemResponse> Items);

public sealed record DetectionSearchQuery : PagedQuery
{
    public Guid? ServerId { get; init; }
    public Guid? IocId { get; init; }
    public Guid? RuleRevisionId { get; init; }
    public string? Family { get; init; }
    public string? Status { get; init; }
    public string? Source { get; init; }
    public Guid? ScanJobId { get; init; }
    public bool IncludeProvenance { get; init; }
    public string? Sort { get; init; }
}

public sealed record DetectionHistoryItemResponse(
    Guid Id,
    string Fingerprint,
    string ScannerFamily,
    Guid ServerId,
    Guid? ScanJobId,
    Guid? JobAttemptId,
    Guid? TargetExecutionId,
    Guid? RuleRevisionId,
    Guid? IocId,
    string Disposition,
    decimal Confidence,
    DateTimeOffset ObservedAtUtc,
    DateTimeOffset FirstObservedAtUtc,
    DateTimeOffset LastObservedAtUtc,
    int OccurrenceCount,
    bool IsExecutionArtifact,
    string EvidenceJson,
    string RawPayloadHash,
    int ProvenanceCount,
    IReadOnlyList<DetectionHistoryProvenanceResponse> Provenance,
    string? ServerHostname = null,
    string? IocValue = null,
    string? RuleName = null,
    string? Source = null);

public sealed record DetectionHistoryProvenanceResponse(
    Guid Id,
    Guid IngestionRunId,
    int RowIndex,
    bool IsDuplicate,
    DateTimeOffset ObservedAtUtc,
    string RawPayloadHash,
    string RawSampleJson,
    string CorrelationMetadataJson,
    Guid? ScanJobId,
    Guid? JobAttemptId,
    Guid? TargetExecutionId,
    DateTimeOffset CreatedAtUtc);
