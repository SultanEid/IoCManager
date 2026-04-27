namespace Backend.Infrastructure.Configuration;

public sealed class PowerBiVisualizationOptions
{
    public const string SectionName = "Reporting:PowerBi";

    public bool Enabled { get; set; }
    public bool AllowDevelopmentPlaceholders { get; set; } = true;
    public string? DefaultVisualizationKey { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string AuthorityHost { get; set; } = "https://login.microsoftonline.com";
    public string PowerBiApiBaseUrl { get; set; } = "https://api.powerbi.com/v1.0/myorg";
    public string PowerBiApiScope { get; set; } = "https://analysis.windows.net/powerbi/api/.default";
    public int TokenRefreshSkewMinutes { get; set; } = 5;
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
