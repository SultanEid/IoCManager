namespace Backend.Contracts.V2;

public sealed record CreateReportRequest(string Title, string ReportType, string SummaryJson, IReadOnlyList<Guid> AlertIds, string ActorUserId);
public sealed record ReportResponse(Guid Id, string Title, string ReportType, string SummaryJson, DateTimeOffset GeneratedAtUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc, IReadOnlyList<Guid> AlertIds);

public sealed record ReportSearchQuery : PagedQuery
{
    public string? ReportType { get; init; }
    public string? Severity { get; init; }
    public string? Status { get; init; }
    public string? Family { get; init; }
    public Guid? ServerId { get; init; }
}

public sealed record ReportListResponse(
    IReadOnlyList<ReportResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record PowerBiWorkspaceResponse(
    string Key,
    string DisplayName,
    string Description,
    string WorkspaceId);

public sealed record PowerBiVisualizationResponse(
    string Key,
    string Title,
    string Description,
    string WorkspaceKey,
    string WorkspaceName,
    string WorkspaceId,
    string ReportId,
    string EmbedUrl,
    string Status,
    bool RequiresUserSignIn,
    bool IsConfigured,
    bool IsDefault,
    int EmbedHeightPx,
    IReadOnlyList<string> Tags);

public sealed record PowerBiVisualizationCatalogResponse(
    string Status,
    string? DefaultVisualizationKey,
    string Message,
    IReadOnlyList<PowerBiWorkspaceResponse> Workspaces,
    IReadOnlyList<PowerBiVisualizationResponse> Visualizations);
