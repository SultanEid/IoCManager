namespace Backend.Contracts.V2;

public sealed record CreateAlertRequest(
    string Title,
    string Summary,
    string Severity,
    string OwnerUserId,
    string ApprovalTierRequired,
    DateTimeOffset DetectedAtUtc,
    string ActorUserId);

public sealed record UpdateAlertStatusRequest(string Status, string ActorUserId);
public sealed record UpdateAlertIocStatusRequest(string Status, string ActorUserId);
public sealed record UpdateAlertOwnerRequest(string OwnerUserId, string ActorUserId);
public sealed record LinkAlertScanResultRequest(Guid ScanResultId, string ActorUserId);
public sealed record SendAlertEmailUpdateRequest(string Subject, string Body, IReadOnlyList<string>? CcEmails, string ActorUserId);

public sealed record AlertOwnerResponse(string Key, string DisplayName, string Email);
public sealed record AlertOwnerDirectoryResponse(
    string Key,
    string DisplayName,
    string Email,
    bool IsEnabled,
    string Source,
    DateTimeOffset? CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    string? CreatedByUserId,
    string? UpdatedByUserId);

public sealed record CreateAlertOwnerDirectoryRequest(
    string Key,
    string DisplayName,
    string Email,
    bool IsEnabled,
    string ActorUserId);

public sealed record UpdateAlertOwnerDirectoryRequest(
    string DisplayName,
    string Email,
    bool IsEnabled,
    string ActorUserId);

public sealed record AlertEmailUpdateResponse(
    Guid Id,
    Guid AlertId,
    string Subject,
    string Body,
    string ToEmail,
    IReadOnlyList<string> CcEmails,
    string DeliveryStatus,
    string? FailureDetail,
    DateTimeOffset? SentAtUtc,
    string CreatedByUserId,
    DateTimeOffset CreatedAtUtc);

public sealed record AlertProgressResponse(
    int TotalIocs,
    int OpenCount,
    int InReviewCount,
    int CompletedCount,
    int PercentComplete);

public sealed record AlertResponse(
    Guid Id,
    string Title,
    string Summary,
    string Severity,
    string Status,
    string OwnerUserId,
    string OwnerDisplayName,
    string? OwnerEmail,
    string ApprovalTierRequired,
    string ScannerFamily,
    string? TargetId,
    string TargetDisplay,
    string RuleName,
    int LinkedIocCount,
    AlertProgressResponse Progress,
    DateTimeOffset FirstDetectedAtUtc,
    DateTimeOffset LastDetectedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record AlertLinkedIocYaraDetailResponse(string? FilePath, string? FileHash);
public sealed record AlertLinkedIocSigmaDetailResponse(string? LogSource, string? Severity, string? CommandLine);
public sealed record AlertLinkedIocNetworkDetailResponse(string? SourceIp, string? DestIp, string? Protocol, string? Severity, long? FlowId);

public sealed record AlertLinkedIocResponse(
    string IocId,
    string ScannerFamily,
    string RuleName,
    string IndicatorValue,
    string IndicatorKind,
    string Severity,
    string Status,
    DateTimeOffset StatusUpdatedAtUtc,
    string StatusUpdatedByUserId,
    DateTimeOffset TimestampUtc,
    string? RawPayload,
    AlertLinkedIocYaraDetailResponse? YaraDetail,
    AlertLinkedIocSigmaDetailResponse? SigmaDetail,
    AlertLinkedIocNetworkDetailResponse? NetworkDetail);

public sealed record AlertLinkedScanResultResponse(
    string ResultId,
    string? JobId,
    string Status,
    int FindingsCount,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? FinishedAtUtc);

public sealed record AlertTargetSummaryResponse(
    string? Id,
    string Display,
    string? Hostname,
    string? IpAddress,
    string? Status,
    string? TargetOsType);

public sealed record AlertDetailResponse(
    Guid Id,
    string Title,
    string Summary,
    string Severity,
    string Status,
    string OwnerUserId,
    string OwnerDisplayName,
    string? OwnerEmail,
    string ApprovalTierRequired,
    string ScannerFamily,
    string? TargetId,
    string TargetDisplay,
    string RuleName,
    int LinkedIocCount,
    AlertProgressResponse Progress,
    DateTimeOffset FirstDetectedAtUtc,
    DateTimeOffset LastDetectedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    AlertTargetSummaryResponse? Target,
    IReadOnlyList<AlertLinkedIocResponse> LinkedIocs,
    IReadOnlyList<AlertLinkedScanResultResponse> LinkedScanResults);

public sealed record AlertSearchQuery : PagedQuery
{
    public string? Status { get; init; }
    public string? Severity { get; init; }
    public string? Family { get; init; }
    public string? TargetId { get; init; }
    public string? OwnerUserId { get; init; }
}

public sealed record AlertListResponse(
    IReadOnlyList<AlertResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);
