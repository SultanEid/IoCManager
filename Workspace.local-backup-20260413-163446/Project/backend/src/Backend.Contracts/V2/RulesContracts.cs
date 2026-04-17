namespace Backend.Contracts.V2;

public sealed record CreateRuleArtifactRequest(string Name, string RuleFamily, string Description, string ActorUserId);
public sealed record RuleArtifactResponse(Guid Id, string Name, string RuleFamily, string Description, bool IsActive, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateRuleRevisionRequest(Guid RuleArtifactId, int RevisionNumber, string RuleBody, string Status, string ActorUserId);
public sealed record RuleRevisionResponse(Guid Id, Guid RuleArtifactId, int RevisionNumber, string RuleBody, string Status, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateRuleDistributionRequest(Guid RuleRevisionId, Guid TargetServerId, string ActorUserId, string? Notes);
public sealed record UpdateRuleDistributionStatusRequest(string Status, string? Notes, string ActorUserId);
public sealed record RuleDistributionResponse(Guid Id, Guid RuleRevisionId, Guid TargetServerId, string Status, string? Notes, DateTimeOffset DistributedAtUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateRuleDistributionJobRequest(
    Guid RuleRevisionId,
    IReadOnlyList<Guid> TargetServerIds,
    IReadOnlyList<Guid> TargetGroupIds,
    string OperatorUserId,
    string? Notes,
    int? MaxAttempts);

public sealed record RetryRuleDistributionJobRequest(string ActorUserId, string? Notes);

public sealed record RuleDistributionJobResponse(
    Guid Id,
    Guid RuleRevisionId,
    string RuleFamily,
    int RevisionNumber,
    string VersionLabel,
    string Status,
    string OperatorUserId,
    int AttemptCount,
    int MaxAttempts,
    int TotalTargets,
    int SuccessfulTargets,
    int FailedTargets,
    int UnreachableTargets,
    int ValidationFailedTargets,
    int PartiallyAppliedTargets,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    DateTimeOffset? NextAttemptAtUtc,
    string Summary,
    string Notes,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RuleDistributionAttemptResponse(
    Guid Id,
    Guid RuleDistributionJobId,
    int AttemptNumber,
    string Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    int? BackoffSeconds,
    string TriggeredByUserId,
    string Summary,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RuleDistributionTargetAttemptResponse(
    Guid Id,
    Guid RuleDistributionAttemptId,
    Guid RuleDistributionTargetId,
    string Status,
    string Transport,
    string? RemoteCorrelationId,
    string? Diagnostic,
    bool IsRetryable,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset CompletedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record RuleDistributionTargetResponse(
    Guid Id,
    Guid RuleDistributionJobId,
    Guid TargetServerId,
    string TargetHostname,
    string TargetIpAddress,
    string Status,
    bool IsRetryable,
    int AttemptCount,
    string? LastError,
    DateTimeOffset? LastAttemptAtUtc,
    DateTimeOffset? SucceededAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    IReadOnlyList<RuleDistributionTargetAttemptResponse> Attempts);

public sealed record CreateRuleRepositoryRequest(
    string Name,
    string RuleFamily,
    string Source,
    string Description,
    string[] Tags,
    string Severity,
    string Status,
    string ScopeType,
    string? ScopeValue,
    string VersionLabel,
    string OriginalContent,
    string ActorUserId,
    string? ChangeReason);

public sealed record UpdateRuleRepositoryRequest(
    string Name,
    string RuleFamily,
    string Source,
    string Description,
    string[] Tags,
    string Severity,
    string Status,
    string ScopeType,
    string? ScopeValue,
    string VersionLabel,
    string OriginalContent,
    string ActorUserId,
    string? ChangeReason);

public sealed record RuleValidationDiagnosticResponse(string Code, string Severity, string Message, int? Line, int? Column);

public sealed record RuleValidationStageResultResponse(
    string Stage,
    bool Passed,
    string CapabilityDepth,
    string? Limitation,
    IReadOnlyList<RuleValidationDiagnosticResponse> Diagnostics);

public sealed record RuleValidationResultResponse(
    bool CanPersist,
    bool IsDeploymentReady,
    DateTimeOffset EvaluatedAtUtc,
    IReadOnlyList<RuleValidationStageResultResponse> Stages);

public sealed record RuleImportAttemptResponse(
    Guid Id,
    string FileName,
    string FileHash,
    string DeclaredRuleFamily,
    bool WasSuccessful,
    string? FailureReason,
    string SourceMetadataJson,
    string ParsedMetadataJson,
    IReadOnlyList<RuleValidationDiagnosticResponse> Diagnostics,
    RuleValidationResultResponse Validation,
    Guid? RuleArtifactId,
    Guid? RuleRevisionId,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string CreatedByUserId);

public sealed record RuleListItemResponse(
    Guid Id,
    string Name,
    string RuleFamily,
    string Source,
    string Description,
    IReadOnlyList<string> Tags,
    string Severity,
    string Status,
    string ScopeType,
    string? ScopeValue,
    int CurrentRevisionNumber,
    string CurrentVersionLabel,
    bool IsDeleted,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string CreatedByUserId,
    string UpdatedByUserId);

public sealed record RuleRevisionItemResponse(
    Guid Id,
    Guid RuleArtifactId,
    int RevisionNumber,
    string VersionLabel,
    string OriginalContent,
    string MetadataJson,
    string ChangeType,
    string? ChangeReason,
    string Status,
    RuleValidationResultResponse Validation,
    Guid? RuleImportAttemptId,
    DateTimeOffset CreatedAtUtc,
    string CreatedByUserId);

public sealed record RuleDetailResponse(
    RuleListItemResponse Rule,
    RuleRevisionItemResponse CurrentRevision,
    IReadOnlyList<RuleRevisionItemResponse> Revisions,
    IReadOnlyList<RuleImportAttemptResponse> ImportAttempts);

public sealed record RuleListResponse(
    IReadOnlyList<RuleListItemResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record RuleRepositoryQuery : PagedQuery
{
    public bool IncludeContent { get; init; }
    public string? Family { get; init; }
    public string? Severity { get; init; }
    public string? Status { get; init; }
    public string? ScopeType { get; init; }
    public string? Source { get; init; }
    public string? Tags { get; init; }
    public bool IncludeDeleted { get; init; }
    public string? Actor { get; init; }
    public string? Version { get; init; }
    public string? Sort { get; init; }
}

public sealed record ArchiveRuleRequest(string ActorUserId, string? ChangeReason);
public sealed record RestoreRuleRequest(string ActorUserId, string? ChangeReason, string? RestoredStatus);
