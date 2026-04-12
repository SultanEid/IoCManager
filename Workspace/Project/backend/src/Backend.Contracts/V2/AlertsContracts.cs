namespace Backend.Contracts.V2;

public sealed record CreateAlertRequest(string Title, string Summary, string Severity, string OwnerUserId, string ApprovalTierRequired, DateTimeOffset DetectedAtUtc, string ActorUserId);
public sealed record UpdateAlertStatusRequest(string Status, string ActorUserId);
public sealed record LinkAlertScanResultRequest(Guid ScanResultId, string ActorUserId);
public sealed record AlertResponse(Guid Id, string Title, string Summary, string Severity, string Status, string OwnerUserId, string ApprovalTierRequired, DateTimeOffset FirstDetectedAtUtc, DateTimeOffset LastDetectedAtUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record AlertSearchQuery : PagedQuery
{
    public string? Status { get; init; }
    public string? Severity { get; init; }
    public string? Family { get; init; }
    public Guid? ServerId { get; init; }
    public string? OwnerUserId { get; init; }
}

public sealed record AlertListResponse(
    IReadOnlyList<AlertResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);
