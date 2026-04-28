using Backend.Contracts.V2;
using Backend.Infrastructure.Configuration;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Api.Infrastructure;

public interface IPowerBiVisualizationCatalogService
{
    PowerBiVisualizationCatalogResponse BuildCatalog(ClaimsPrincipal user);
    Task<PowerBiVisualizationCatalogResponse> BuildCatalogAsync(ClaimsPrincipal user, CancellationToken cancellationToken);
}

public sealed class PowerBiVisualizationCatalogService : IPowerBiVisualizationCatalogService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IOptionsMonitor<PowerBiVisualizationOptions> _optionsMonitor;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;

    public PowerBiVisualizationCatalogService(
        IOptionsMonitor<PowerBiVisualizationOptions> optionsMonitor,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory)
    {
        _optionsMonitor = optionsMonitor;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
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

    public async Task<PowerBiVisualizationCatalogResponse> BuildCatalogAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var catalog = BuildCatalog(user);
        if (!CanGenerateEmbedTokens(options) || catalog.Visualizations.Count == 0)
        {
            return catalog;
        }

        var apiToken = await AcquirePowerBiApiTokenAsync(options, cancellationToken);
        var tokenizedVisualizations = new List<PowerBiVisualizationResponse>(catalog.Visualizations.Count);
        foreach (var visualization in catalog.Visualizations)
        {
            if (!visualization.IsConfigured)
            {
                tokenizedVisualizations.Add(visualization);
                continue;
            }

            var embedToken = await GenerateReportEmbedTokenAsync(options, apiToken, visualization, cancellationToken);
            tokenizedVisualizations.Add(visualization with
            {
                EmbedToken = embedToken.Token,
                EmbedTokenExpiresAtUtc = embedToken.Expiration,
                RequiresUserSignIn = false,
                TokenType = "Embed",
            });
        }

        return catalog with
        {
            Status = tokenizedVisualizations.Any(item => !string.IsNullOrWhiteSpace(item.EmbedToken))
                ? "configured"
                : catalog.Status,
            Message = "Power BI embeds are served with app-owned embed tokens and will refresh before token expiry.",
            Visualizations = tokenizedVisualizations,
        };
    }

    private static PowerBiVisualizationResponse CreateVisualization(
        PowerBiWorkspaceOptions workspace,
        PowerBiReportOptions report,
        bool embedsEnabled)
    {
        var workspaceName = string.IsNullOrWhiteSpace(workspace.DisplayName) ? workspace.Key : workspace.DisplayName;
        var title = string.IsNullOrWhiteSpace(report.Title) ? report.Key : report.Title;
        var workspaceId = workspace.WorkspaceId?.Trim() ?? string.Empty;
        var reportId = report.ReportId?.Trim() ?? string.Empty;
        var embedUrl = ResolveEmbedUrl(workspaceId, reportId, report.EmbedUrl);
        var isConfigured =
            embedsEnabled
            && !string.IsNullOrWhiteSpace(workspaceId)
            && !string.IsNullOrWhiteSpace(reportId)
            && !string.IsNullOrWhiteSpace(embedUrl);

        return new PowerBiVisualizationResponse(
            report.Key,
            title,
            report.Description,
            workspace.Key,
            workspaceName,
            workspaceId,
            reportId,
            embedUrl,
            isConfigured ? "ready" : "placeholder",
            workspace.RequiresUserSignIn,
            isConfigured,
            report.IsDefault,
            Math.Max(480, report.EmbedHeightPx),
            report.Tags,
            EmbedToken: null,
            EmbedTokenExpiresAtUtc: null,
            TokenType: "Iframe");
    }

    private static bool CanGenerateEmbedTokens(PowerBiVisualizationOptions options)
    {
        return options.Enabled
            && !string.IsNullOrWhiteSpace(options.TenantId)
            && !string.IsNullOrWhiteSpace(options.ClientId)
            && !string.IsNullOrWhiteSpace(options.ClientSecret);
    }

    private async Task<string> AcquirePowerBiApiTokenAsync(PowerBiVisualizationOptions options, CancellationToken cancellationToken)
    {
        var authorityHost = options.AuthorityHost.TrimEnd('/');
        var tokenEndpoint = $"{authorityHost}/{Uri.EscapeDataString(options.TenantId.Trim())}/oauth2/v2.0/token";
        using var request = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = options.ClientId,
                ["client_secret"] = options.ClientSecret,
                ["scope"] = options.PowerBiApiScope,
                ["grant_type"] = "client_credentials",
            }),
        };

        using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Power BI Microsoft Entra token request failed with HTTP {(int)response.StatusCode}.");
        }

        var token = JsonSerializer.Deserialize<EntraTokenResponse>(responseBody, JsonOptions);
        if (string.IsNullOrWhiteSpace(token?.AccessToken))
        {
            throw new InvalidOperationException("Power BI Microsoft Entra token response did not include an access token.");
        }

        return token.AccessToken;
    }

    private async Task<PowerBiEmbedTokenResponse> GenerateReportEmbedTokenAsync(
        PowerBiVisualizationOptions options,
        string apiToken,
        PowerBiVisualizationResponse visualization,
        CancellationToken cancellationToken)
    {
        var apiBaseUrl = options.PowerBiApiBaseUrl.TrimEnd('/');
        var endpoint =
            $"{apiBaseUrl}/groups/{Uri.EscapeDataString(visualization.WorkspaceId)}/reports/{Uri.EscapeDataString(visualization.ReportId)}/GenerateToken";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new { accessLevel = "View", allowSaveAs = false }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Power BI embed token request for '{visualization.Key}' failed with HTTP {(int)response.StatusCode}.");
        }

        var token = JsonSerializer.Deserialize<PowerBiEmbedTokenResponse>(responseBody, JsonOptions);
        if (string.IsNullOrWhiteSpace(token?.Token))
        {
            throw new InvalidOperationException($"Power BI embed token response for '{visualization.Key}' did not include a token.");
        }

        return token;
    }

    private static string ResolveEmbedUrl(string workspaceId, string reportId, string? configuredEmbedUrl)
    {
        var trimmedConfigured = configuredEmbedUrl?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(workspaceId) || string.IsNullOrWhiteSpace(reportId))
        {
            return trimmedConfigured;
        }

        if (string.IsNullOrWhiteSpace(trimmedConfigured))
        {
            return BuildCanonicalEmbedUrl(workspaceId, reportId);
        }

        if (!Uri.TryCreate(trimmedConfigured, UriKind.Absolute, out var parsed))
        {
            return trimmedConfigured;
        }

        if (!string.Equals(parsed.Host, "app.powerbi.com", StringComparison.OrdinalIgnoreCase))
        {
            return trimmedConfigured;
        }

        var query = QueryHelpers.ParseQuery(parsed.Query);
        var hasReportId = HasQueryKey(query, "reportId");
        var hasGroupId = HasQueryKey(query, "groupId");

        var updated = trimmedConfigured;
        if (!hasReportId)
        {
            updated = QueryHelpers.AddQueryString(updated, "reportId", reportId);
        }

        if (!hasGroupId)
        {
            updated = QueryHelpers.AddQueryString(updated, "groupId", workspaceId);
        }

        updated = EnsureDefaultPresentationParams(updated);
        return updated;
    }

    private static string BuildCanonicalEmbedUrl(string workspaceId, string reportId)
    {
        const string basePath = "https://app.powerbi.com/reportEmbed";
        var withReportId = QueryHelpers.AddQueryString(basePath, "reportId", reportId);
        var withGroupId = QueryHelpers.AddQueryString(withReportId, "groupId", workspaceId);
        return EnsureDefaultPresentationParams(withGroupId);
    }

    private static bool HasQueryKey(Dictionary<string, Microsoft.Extensions.Primitives.StringValues> query, string key)
    {
        return query.Keys.Any(existing => string.Equals(existing, key, StringComparison.OrdinalIgnoreCase));
    }

    private static string EnsureDefaultPresentationParams(string url)
    {
        var withAutoAuth = EnsureQueryParam(url, "autoAuth", "true");
        var withFilterHidden = EnsureQueryParam(withAutoAuth, "filterPaneEnabled", "false");
        var withNavHidden = EnsureQueryParam(withFilterHidden, "navContentPaneEnabled", "false");
        return EnsureQueryParam(withNavHidden, "pageView", "fitToWidth");
    }

    private static string EnsureQueryParam(string url, string key, string value)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed))
        {
            return url;
        }

        var query = QueryHelpers.ParseQuery(parsed.Query);
        if (HasQueryKey(query, key))
        {
            return url;
        }

        return QueryHelpers.AddQueryString(url, key, value);
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

    private sealed record EntraTokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);

    private sealed record PowerBiEmbedTokenResponse(
        [property: JsonPropertyName("token")] string Token,
        [property: JsonPropertyName("expiration")] DateTimeOffset Expiration);
}
