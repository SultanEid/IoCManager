using System.Net.Http.Json;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Integrations;

public sealed class AiReportExtractionClient : IAiReportExtractionClient
{
    private const string SidecarDependencyName = "ai_sidecar";
    private const string TemporaryUnavailableCondition = "temporarily_unavailable";
    private const string SafeUnavailableMessage = "AI sidecar is temporarily unavailable. Retry later.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly AiSidecarOptions _options;
    private readonly ILogger<AiReportExtractionClient> _logger;

    public AiReportExtractionClient(
        HttpClient httpClient,
        IOptions<AiSidecarOptions> options,
        ILogger<AiReportExtractionClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiReportExtractionResult> ExtractAsync(AiReportExtractionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            object? bulletinPayload = null;
            if (!string.IsNullOrWhiteSpace(request.BulletinJson))
            {
                using var bulletinDoc = JsonDocument.Parse(request.BulletinJson);
                bulletinPayload = bulletinDoc.RootElement.Clone();
            }

            var payload = new Dictionary<string, object?>
            {
                ["sourceName"] = request.SourceName,
                ["sourceType"] = request.SourceType,
                ["documentId"] = request.DocumentId,
                ["documentUrl"] = request.DocumentUrl,
                ["documentText"] = request.DocumentText,
                ["documentBytesBase64"] = request.DocumentBytesBase64,
                ["bulletinJson"] = bulletinPayload,
                ["enableLlmFallback"] = request.EnableLlmFallback,
                ["ingestionTime"] = request.IngestionTimeUtc,
            };

            using var response = await _httpClient.PostAsJsonAsync(
                _options.ReportExtractionPath,
                payload,
                JsonOptions,
                cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI sidecar report extraction returned non-success status {StatusCode}.",
                    (int)response.StatusCode);
                throw CreateUnavailableException();
            }

            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;
            var reportId = ReadRequiredString(root, "reportId");
            var sourceType = ReadRequiredString(root, "sourceType");
            var humanReviewRequired = ReadRequiredBoolean(root, "humanReviewRequired");
            var weakEvidenceDetected = ReadRequiredBoolean(root, "weakEvidenceDetected");
            var processedAtUtc = ReadRequiredDateTimeOffset(root, "processedAt");
            var claims = ParseClaims(root);

            return new AiReportExtractionResult(
                ReportId: reportId,
                SourceType: sourceType,
                HumanReviewRequired: humanReviewRequired,
                WeakEvidenceDetected: weakEvidenceDetected,
                ProcessedAtUtc: processedAtUtc,
                OutputPayloadJson: responseBody,
                Claims: claims);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "AI sidecar request timed out after {TimeoutSeconds}s.", _options.TimeoutSeconds);
            throw CreateUnavailableException(ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI sidecar transport failure.");
            throw CreateUnavailableException(ex);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "AI sidecar returned an unreadable response payload.");
            throw CreateUnavailableException(ex);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "AI sidecar response is missing required fields.");
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

    private static IReadOnlyList<AiReportExtractedClaim> ParseClaims(JsonElement root)
    {
        if (!root.TryGetProperty("claims", out var claimsNode) || claimsNode.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException("AI sidecar response is missing required array field 'claims'.");
        }

        return claimsNode
            .EnumerateArray()
            .Select(ParseClaim)
            .ToArray();
    }

    private static AiReportExtractedClaim ParseClaim(JsonElement node)
    {
        var claimId = ReadRequiredString(node, "claimId");
        var claimType = ReadRequiredString(node, "claimType");
        var statement = ReadRequiredString(node, "statement");
        var snippet = ReadRequiredString(node, "snippet");
        var sourceStartOffset = ReadOptionalInt(node, "sourceStartOffset");
        var sourceEndOffset = ReadOptionalInt(node, "sourceEndOffset");
        var pageIndex = ReadOptionalInt(node, "pageIndex");
        var extractionMethod = ReadRequiredString(node, "extractionMethod");
        var confidence = ReadRequiredDecimal(node, "confidence");
        if (confidence is < 0m or > 1m)
        {
            throw new JsonException("Claim confidence must be between 0 and 1.");
        }

        var isPromptInjectionSuspected = ReadRequiredBoolean(node, "isPromptInjectionSuspected");
        var abstainReasonCodesJson = ReadRequiredArrayRawText(node, "abstainReasonCodes");
        var citationsJson = ReadRequiredArrayRawText(node, "citations");

        return new AiReportExtractedClaim(
            ClaimId: claimId,
            ClaimType: claimType,
            Statement: statement,
            Snippet: snippet,
            SourceStartOffset: sourceStartOffset,
            SourceEndOffset: sourceEndOffset,
            PageIndex: pageIndex,
            ExtractionMethod: extractionMethod,
            Confidence: confidence,
            IsPromptInjectionSuspected: isPromptInjectionSuspected,
            AbstainReasonCodesJson: abstainReasonCodesJson,
            CitationsJson: citationsJson);
    }

    private static string ReadRequiredString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String)
        {
            throw new JsonException($"Missing required string field '{propertyName}'.");
        }

        var result = value.GetString();
        if (string.IsNullOrWhiteSpace(result))
        {
            throw new JsonException($"Field '{propertyName}' cannot be empty.");
        }

        return result;
    }

    private static bool ReadRequiredBoolean(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) ||
            (value.ValueKind != JsonValueKind.True && value.ValueKind != JsonValueKind.False))
        {
            throw new JsonException($"Missing required boolean field '{propertyName}'.");
        }

        return value.GetBoolean();
    }

    private static DateTimeOffset ReadRequiredDateTimeOffset(JsonElement element, string propertyName)
    {
        var value = ReadRequiredString(element, propertyName);
        if (!DateTimeOffset.TryParse(value, out var parsed))
        {
            throw new JsonException($"Field '{propertyName}' must be a valid timestamp.");
        }

        return parsed;
    }

    private static int? ReadOptionalInt(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind != JsonValueKind.Number)
        {
            throw new JsonException($"Field '{propertyName}' must be a number or null.");
        }

        return value.GetInt32();
    }

    private static decimal ReadRequiredDecimal(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Number)
        {
            throw new JsonException($"Missing required number field '{propertyName}'.");
        }

        return value.GetDecimal();
    }

    private static string ReadRequiredArrayRawText(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException($"Missing required array field '{propertyName}'.");
        }

        return value.GetRawText();
    }
}
