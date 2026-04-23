using System.Net.Http.Json;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Integrations;

public sealed class AiScanAnalystClient : IAiScanAnalystClient
{
    private const string SidecarDependencyName = "ai_sidecar";
    private const string TemporaryUnavailableCondition = "temporarily_unavailable";
    private const string SafeUnavailableMessage = "AI sidecar is temporarily unavailable. Retry later.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly AiSidecarOptions _options;
    private readonly ILogger<AiScanAnalystClient> _logger;

    public AiScanAnalystClient(
        HttpClient httpClient,
        IOptions<AiSidecarOptions> options,
        ILogger<AiScanAnalystClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiScanAnalystRecommendationResult> RecommendAsync(AiScanAnalystContextRequest request, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(_options.ScanAnalystPath, request, JsonOptions, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI sidecar scan analyst endpoint returned status {StatusCode}. Payload: {Body}",
                    (int)response.StatusCode,
                    responseBody);
                throw CreateUnavailableException();
            }

            var payload = JsonSerializer.Deserialize<AiScanAnalystRecommendationResult>(responseBody, JsonOptions);
            if (payload is null)
            {
                throw CreateUnavailableException();
            }

            return payload;
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "AI scan analyst request timed out after {TimeoutSeconds}s.", _options.TimeoutSeconds);
            throw CreateUnavailableException(ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI scan analyst transport failure.");
            throw CreateUnavailableException(ex);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "AI scan analyst returned invalid JSON.");
            throw CreateUnavailableException(ex);
        }
    }

    private static OptionalDependencyUnavailableException CreateUnavailableException(Exception? innerException = null)
    {
        return new OptionalDependencyUnavailableException(
            SidecarDependencyName,
            TemporaryUnavailableCondition,
            SafeUnavailableMessage,
            innerException);
    }
}
