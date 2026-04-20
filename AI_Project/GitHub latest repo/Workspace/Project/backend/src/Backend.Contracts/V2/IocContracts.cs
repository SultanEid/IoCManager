namespace Backend.Contracts.V2;

public sealed record CreateFeedSourceRequest(string Name, string SourceType, string Endpoint, string ActorUserId);
public sealed record FeedSourceResponse(Guid Id, string Name, string SourceType, string Endpoint, bool IsEnabled, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateIocFileRequest(Guid FeedSourceId, string FileName, string StorageUri, string ContentHash, DateTimeOffset ImportedAtUtc, string ActorUserId);
public sealed record IocFileResponse(Guid Id, Guid FeedSourceId, string FileName, string StorageUri, string ContentHash, DateTimeOffset ImportedAtUtc, DateTimeOffset CreatedAtUtc);

public sealed record CreateIocRequest(Guid FeedSourceId, Guid? IocFileId, string Type, string Value, string Severity, decimal Confidence, DateTimeOffset SeenAtUtc, string ActorUserId);
public sealed record IocResponse(Guid Id, Guid FeedSourceId, Guid? IocFileId, string Type, string Value, string Severity, decimal Confidence, DateTimeOffset FirstSeenAtUtc, DateTimeOffset LastSeenAtUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc, string? FeedSourceName = null, string? FeedSourceType = null, string? FileName = null);

public sealed record IocSearchQuery : PagedQuery
{
    public string? Severity { get; init; }
    public string? Type { get; init; }
    public string? Source { get; init; }
    public Guid? FeedSourceId { get; init; }
}

public sealed record IocListResponse(
    IReadOnlyList<IocResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);
