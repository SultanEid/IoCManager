namespace Backend.Infrastructure.Configuration;

public sealed class PowerBiVisualizationOptions
{
    public const string SectionName = "Reporting:PowerBi";

    public bool Enabled { get; set; }
    public bool AllowDevelopmentPlaceholders { get; set; } = true;
    public string? DefaultVisualizationKey { get; set; }
    public List<PowerBiWorkspaceOptions> Workspaces { get; set; } = [];
}

public sealed class PowerBiWorkspaceOptions
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string WorkspaceId { get; set; } = string.Empty;
    public bool RequiresUserSignIn { get; set; } = true;
    public List<PowerBiReportOptions> Reports { get; set; } = [];
}

public sealed class PowerBiReportOptions
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ReportId { get; set; } = string.Empty;
    public string EmbedUrl { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int EmbedHeightPx { get; set; } = 720;
    public string[] Tags { get; set; } = [];
    public string[] AllowedRoles { get; set; } = [];
}
