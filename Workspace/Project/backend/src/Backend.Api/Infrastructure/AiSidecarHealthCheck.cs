using System.Net;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class AiSidecarHealthCheck : IHealthCheck
{
    public const string ProbeClientName = "AiSidecarHealthProbe";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiSidecarOptions _options;

    public AiSidecarHealthCheck(
        IHttpClientFactory httpClientFactory,
        IOptions<AiSidecarOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var client = _httpClientFactory.CreateClient(ProbeClientName);
        using var request = new HttpRequestMessage(HttpMethod.Get, BuildProbeUri(_options.BaseUrl));

        try
        {
            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if ((int)response.StatusCode >= 500)
            {
                return HealthCheckResult.Degraded("AI sidecar temporarily unavailable.");
            }

            if (response.StatusCode is HttpStatusCode.Unauthorized
                or HttpStatusCode.Forbidden)
            {
                return HealthCheckResult.Healthy("AI sidecar reachable.");
            }

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("AI sidecar reachable.")
                : HealthCheckResult.Degraded("AI sidecar temporarily unavailable.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Degraded("AI sidecar check timed out.");
        }
        catch (HttpRequestException)
        {
            return HealthCheckResult.Degraded("AI sidecar unreachable.");
        }
    }

    private static Uri BuildProbeUri(string baseUrl)
    {
        var baseUri = new Uri(baseUrl, UriKind.Absolute);
        return new Uri(baseUri, "/health");
    }
}
