using Backend.Contracts.V2;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Backend.Api.Infrastructure;

public interface IPowerBiVisualizationCatalogService
{
    PowerBiVisualizationCatalogResponse BuildCatalog(ClaimsPrincipal user);
}

public sealed class PowerBiVisualizationCatalogService : IPowerBiVisualizationCatalogService
{
    private readonly IOptionsMonitor<PowerBiVisualizationOptions> _optionsMonitor;
    private readonly IWebHostEnvironment _environment;

    public PowerBiVisualizationCatalogService(
        IOptionsMonitor<PowerBiVisualizationOptions> optionsMonitor,
        IWebHostEnvironment environment)
    {
        _optionsMonitor = optionsMonitor;
        _environment = environment;
    }

    public PowerBiVisualizationCatalogResponse BuildCatalog(ClaimsPrincipal user)
    {
        var options = _optionsMonitor.CurrentValue;
        var callerRoles = ResolveRoles(user);
        var workspaces = new List<PowerBiWorkspaceResponse>();
        var visualizations = new List<PowerBiVisualizationResponse>();

        foreach (var workspace in options.Workspaces)
        {
            if (string.IsNullOrWhiteSpace(workspace.Key))
            {
                continue;
            }

            var workspaceVisualizations = workspace.Reports
                .Where(report => report.IsEnabled && IsAuthorized(report.AllowedRoles, callerRoles))
                .Select(report => CreateVisualization(workspace, report, options.Enabled))
                .ToArray();

            if (workspaceVisualizations.Length == 0)
            {
                continue;
            }

            workspaces.Add(new PowerBiWorkspaceResponse(
                workspace.Key,
                string.IsNullOrWhiteSpace(workspace.DisplayName) ? workspace.Key : workspace.DisplayName,
                workspace.Description,
                workspace.WorkspaceId));

            visualizations.AddRange(workspaceVisualizations);
        }

        var anyConfigured = visualizations.Any(item => string.Equals(item.Status, "ready", StringComparison.OrdinalIgnoreCase));
        var includePlaceholderState = _environment.IsDevelopment() && options.AllowDevelopmentPlaceholders;

        var status = anyConfigured
            ? "configured"
            : includePlaceholderState && visualizations.Count > 0
                ? "development_placeholder"
                : "unconfigured";

        var message = status switch
        {
            "configured" => "Authorized Power BI embeds are available for this session.",
            "development_placeholder" => "Power BI metadata is present, but one or more embeds are not configured yet. Development placeholders are shown instead of live charts.",
            _ => "No authorized Power BI embed configuration is available for this environment.",
        };

        var defaultKey = ResolveDefaultVisualizationKey(options, visualizations);

        return new PowerBiVisualizationCatalogResponse(
            status,
            defaultKey,
            message,
            workspaces,
            visualizations);
    }

    private static PowerBiVisualizationResponse CreateVisualization(
        PowerBiWorkspaceOptions workspace,
        PowerBiReportOptions report,
        bool embedsEnabled)
    {
        var workspaceName = string.IsNullOrWhiteSpace(workspace.DisplayName) ? workspace.Key : workspace.DisplayName;
        var title = string.IsNullOrWhiteSpace(report.Title) ? report.Key : report.Title;
        var isConfigured =
            embedsEnabled
            && !string.IsNullOrWhiteSpace(workspace.WorkspaceId)
            && !string.IsNullOrWhiteSpace(report.ReportId)
            && !string.IsNullOrWhiteSpace(report.EmbedUrl);

        return new PowerBiVisualizationResponse(
            report.Key,
            title,
            report.Description,
            workspace.Key,
            workspaceName,
            workspace.WorkspaceId,
            report.ReportId,
            report.EmbedUrl,
            isConfigured ? "ready" : "placeholder",
            workspace.RequiresUserSignIn,
            isConfigured,
            report.IsDefault,
            Math.Max(480, report.EmbedHeightPx),
            report.Tags);
    }

    private static bool IsAuthorized(IEnumerable<string> allowedRoles, ISet<string> callerRoles)
    {
        var normalizedRoles = allowedRoles
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToArray();

        if (normalizedRoles.Length == 0)
        {
            return true;
        }

        return normalizedRoles.Any(role => callerRoles.Contains(role));
    }

    private static string? ResolveDefaultVisualizationKey(
        PowerBiVisualizationOptions options,
        IReadOnlyList<PowerBiVisualizationResponse> visualizations)
    {
        if (!string.IsNullOrWhiteSpace(options.DefaultVisualizationKey)
            && visualizations.Any(item => string.Equals(item.Key, options.DefaultVisualizationKey, StringComparison.OrdinalIgnoreCase)))
        {
            return options.DefaultVisualizationKey;
        }

        var explicitDefault = visualizations.FirstOrDefault(item => item.IsDefault);
        if (explicitDefault is not null)
        {
            return explicitDefault.Key;
        }

        return visualizations.FirstOrDefault()?.Key;
    }

    private static HashSet<string> ResolveRoles(ClaimsPrincipal user)
    {
        return user.Claims
            .Where(claim =>
                string.Equals(claim.Type, ClaimTypes.Role, StringComparison.OrdinalIgnoreCase)
                || string.Equals(claim.Type, "role", StringComparison.OrdinalIgnoreCase)
                || string.Equals(claim.Type, "roles", StringComparison.OrdinalIgnoreCase))
            .Select(claim => claim.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
