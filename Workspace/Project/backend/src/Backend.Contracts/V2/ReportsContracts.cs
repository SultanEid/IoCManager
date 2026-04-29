namespace Backend.Contracts.V2;

public sealed record CreateReportRequest(string Title, string ReportType, string SummaryJson, IReadOnlyList<Guid> AlertIds, string ActorUserId);
public sealed record ReportResponse(Guid Id, string Title, string ReportType, string SummaryJson, DateTimeOffset GeneratedAtUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc, IReadOnlyList<Guid> AlertIds);
public sealed record GenerateReportRequest(
    string ReportType,
    string? Title,
    string? FromUtc,
    string? ToUtc,
    Guid? TargetServerId,
    string? ScannerFamily,
    string? Severity,
    string? Status,
    string? IocType,
    string? Source,
    bool Persist,
    string ActorUserId);

public sealed record GeneratedReportMetricResponse(
    string Label,
    string Value,
    string Detail);

public sealed record GeneratedReportTableColumnResponse(string Key, string Label);
public sealed record GeneratedReportTableRowResponse(IReadOnlyDictionary<string, string> Values);
public sealed record GeneratedReportTableResponse(
    string Title,
    IReadOnlyList<GeneratedReportTableColumnResponse> Columns,
    IReadOnlyList<GeneratedReportTableRowResponse> Rows);

public sealed record GeneratedReportSectionResponse(
    string Title,
    string Summary,
    IReadOnlyList<GeneratedReportMetricResponse> Metrics,
    IReadOnlyList<string> Highlights,
    string? Narrative = null,
    IReadOnlyList<GeneratedReportTableResponse>? Tables = null);

public sealed record GeneratedReportResponse(
    string RequestedReportType,
    string Title,
    string Status,
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<GeneratedReportSectionResponse> Sections,
    IReadOnlyList<Guid> AlertIds,
    ReportResponse? PersistedReport);

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
    IReadOnlyList<string> Tags,
    string? EmbedToken,
    DateTimeOffset? EmbedTokenExpiresAtUtc,
    string TokenType);

public sealed record PowerBiVisualizationCatalogResponse(
    string Status,
    string? DefaultVisualizationKey,
    string Message,
    IReadOnlyList<PowerBiWorkspaceResponse> Workspaces,
    IReadOnlyList<PowerBiVisualizationResponse> Visualizations);
