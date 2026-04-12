namespace Backend.Contracts.V2;

public sealed record CreateAuditLogRequest(string ActorUserId, string ActionType, string EntityType, string EntityId, string PayloadJson);

public sealed record AuditLogResponse(Guid Id, string ActorUserId, string ActionType, string EntityType, string EntityId, string PayloadJson, DateTimeOffset OccurredAtUtc);

public sealed record AuditLogSearchQuery : PagedQuery
{
    public string? ActorUserId { get; init; }
    public string? ActionType { get; init; }
    public string? EntityType { get; init; }
}

public sealed record AuditLogListResponse(
    IReadOnlyList<AuditLogResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);
