namespace Backend.Contracts.V2;

public abstract record PagedQuery
{
    public string? Q { get; init; }
    public string? FromUtc { get; init; }
    public string? ToUtc { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}

public sealed record PagedResponse<TItem>(
    IReadOnlyList<TItem> Items,
    int TotalCount,
    int Page,
    int PageSize);
