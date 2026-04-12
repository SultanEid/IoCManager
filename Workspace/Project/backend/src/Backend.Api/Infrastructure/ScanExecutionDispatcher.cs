using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Api.Infrastructure.Execution;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed record ScanExecutionResultFile(
    string? Name,
    string? Path,
    long? SizeBytes,
    string? Sha256);

public sealed record ScanExecutionDispatchFinding(
    Guid? RuleRevisionId,
    Guid? IocId,
    ScanResultDisposition Disposition,
    decimal Confidence,
    string EvidenceJson);

public sealed record ScanExecutionDispatchResult(
    ScanJobTargetExecutionStatus Status,
    string Summary,
    string? ErrorMessage,
    string? CorrelationId,
    string? RawOutput,
    IReadOnlyList<ScanExecutionResultFile> ResultFiles,
    IReadOnlyList<ScanExecutionDispatchFinding> Findings);

public interface IScanExecutionDispatcher
{
    Task<ScanExecutionDispatchResult> DispatchAsync(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        Scanner scanner,
        TargetServerScannerAssignment assignment,
        ScannerCapability capability,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        CancellationToken cancellationToken);
}

public sealed class ScanExecutionDispatcher : IScanExecutionDispatcher
{
    public const string HttpClientName = "ScanExecutionTransport";
    private const string EnvelopeVersion = "scan-execution-lab-v1";

    private static readonly string[] UnreachableTokens =
    [
        "timed out",
        "timeout",
        "no route",
        "network is unreachable",
        "connection refused",
        "could not resolve",
        "host is down",
        "connection reset",
    ];

    private static readonly string[] RemediationTokens =
    [
        "remediation",
        "responseactions",
        "response_actions",
        "actions",
        "quarantine",
        "isolate",
        "kill",
        "block",
    ];

    private readonly TargetServerConnectionSecretProtector _secretProtector;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILegacyScriptScanExecutor _legacyScriptScanExecutor;
    private readonly IOptionsMonitor<ScanExecutionOptions> _options;
    private readonly ILogger<ScanExecutionDispatcher> _logger;

    public ScanExecutionDispatcher(
        TargetServerConnectionSecretProtector secretProtector,
        IHttpClientFactory httpClientFactory,
        ILegacyScriptScanExecutor legacyScriptScanExecutor,
        IOptionsMonitor<ScanExecutionOptions> options,
        ILogger<ScanExecutionDispatcher> logger)
    {
        _secretProtector = secretProtector;
        _httpClientFactory = httpClientFactory;
        _legacyScriptScanExecutor = legacyScriptScanExecutor;
        _options = options;
        _logger = logger;
    }

    public async Task<ScanExecutionDispatchResult> DispatchAsync(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        Scanner scanner,
        TargetServerScannerAssignment assignment,
        ScannerCapability capability,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!assignment.IsEnabled)
        {
            return Failure("Scanner assignment is disabled.");
        }

        if (scanner.HealthStatus == ScannerHealthStatus.Offline)
        {
            return Failure($"Scanner '{scanner.Name}' is offline.");
        }

        if (targetServer.ConnectivityStatus == ConnectivityStatus.Offline)
        {
            return Failure($"Target server '{targetServer.Hostname}' is offline.");
        }

        if (effectiveRules.Count == 0)
        {
            return Failure("No effective rules were resolved.");
        }

        var scriptAttempt = await _legacyScriptScanExecutor.TryExecuteAsync(
            scanJob,
            targetExecution,
            targetServer,
            capability,
            connectionSecret,
            effectiveRules,
            cancellationToken);
        if (scriptAttempt.Handled)
        {
            return scriptAttempt.Result!;
        }

        if (targetServer.ConnectionProtocol != ConnectionProtocol.Agent)
        {
            return Failure("Only Agent protocol is executable for scan dispatch in lab v1. SSH/WinRM are contract-ready but unsupported.");
        }

        if (capability == ScannerCapability.Sigma)
        {
            return Failure("Sigma execution contract is ready, but runtime execution is not available in lab v1.");
        }

        var secret = ReadSecret(connectionSecret);
        if (!secret.IsValid)
        {
            return Failure(secret.Error ?? "Connection secret is invalid.");
        }

        var endpoint = ResolveAgentEndpoint(targetServer, secret);
        if (endpoint is null)
        {
            return Failure("Managed connector endpoint is not configured.");
        }

        var declaredRuleFamily = ResolveRuleFamily(capability);
        var requestBody = BuildConnectorRequest(
            scanJob,
            targetExecution,
            targetServer,
            scanner,
            capability,
            declaredRuleFamily,
            effectiveRules);

        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = JsonContent.Create(requestBody),
            };

            if (!string.IsNullOrWhiteSpace(secret.AgentToken))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret.AgentToken);
            }

            if (!string.IsNullOrWhiteSpace(secret.AgentHeaderName) && !string.IsNullOrWhiteSpace(secret.AgentHeaderValue))
            {
                request.Headers.TryAddWithoutValidation(secret.AgentHeaderName, secret.AgentHeaderValue);
            }

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(_options.CurrentValue.HttpTimeoutSeconds));
            using var response = await client.SendAsync(request, timeoutCts.Token);
            var body = await response.Content.ReadAsStringAsync(timeoutCts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var diagnostic = BuildHttpDiagnostic(response.StatusCode, body);
                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    return Failure($"Connector authentication failed: {diagnostic}");
                }

                var isUnreachable = response.StatusCode is HttpStatusCode.RequestTimeout
                    or HttpStatusCode.BadGateway
                    or HttpStatusCode.ServiceUnavailable
                    or HttpStatusCode.GatewayTimeout
                    || LooksUnreachable(diagnostic);

                return Failure(isUnreachable
                    ? $"Connector unreachable while dispatching scan: {diagnostic}"
                    : $"Connector rejected scan dispatch: {diagnostic}");
            }

            var parsed = ParseConnectorBody(body);
            if (!parsed.IsValid)
            {
                return Failure(parsed.Error ?? "Connector returned an invalid response payload.");
            }

            var remediationIgnoredSuffix = parsed.HasRemediationSignals
                ? " Remediation-like fields were ignored (lab-safe mode)."
                : string.Empty;

            if (parsed.HasRemediationSignals)
            {
                _logger.LogWarning(
                    "Connector response for scan job {ScanJobId} target execution {TargetExecutionId} included remediation-like fields; ignored in lab-safe mode.",
                    scanJob.Id,
                    targetExecution.Id);
            }

            var summary = string.IsNullOrWhiteSpace(parsed.Message)
                ? $"Connector processed {capability} scan request.{remediationIgnoredSuffix}"
                : $"{parsed.Message.Trim()}{remediationIgnoredSuffix}";

            return parsed.Status switch
            {
                ConnectorExecutionStatus.Success => Success(
                    summary,
                    parsed.CorrelationId,
                    parsed.RawOutput,
                    parsed.ResultFiles,
                    parsed.Findings),
                ConnectorExecutionStatus.Partial => Partial(
                    summary,
                    parsed.CorrelationId,
                    parsed.RawOutput,
                    parsed.ResultFiles,
                    parsed.Findings),
                ConnectorExecutionStatus.Unsupported => Failure(
                    parsed.Message ?? "Connector reported unsupported execution contract.",
                    parsed.RawOutput,
                    parsed.CorrelationId,
                    parsed.ResultFiles,
                    parsed.Findings),
                ConnectorExecutionStatus.Unreachable => Failure(
                    parsed.Message ?? "Connector reported target as unreachable.",
                    parsed.RawOutput,
                    parsed.CorrelationId,
                    parsed.ResultFiles,
                    parsed.Findings),
                ConnectorExecutionStatus.Failure => Failure(
                    parsed.Message ?? "Connector reported scan execution failure.",
                    parsed.RawOutput,
                    parsed.CorrelationId,
                    parsed.ResultFiles,
                    parsed.Findings),
                _ => Failure("Connector returned an unsupported execution status.")
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            return Failure("Connector request timed out while dispatching scan.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Managed connector request failed for target server {TargetServerId}.", targetServer.Id);
            return Failure($"Connector request failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Scan dispatch failed for target server {TargetServerId}.", targetServer.Id);
            return Failure($"Scan dispatch failed: {ex.Message}");
        }
    }

    private object BuildConnectorRequest(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        Scanner scanner,
        ScannerCapability capability,
        string declaredRuleFamily,
        IReadOnlyList<RuleRevision> effectiveRules)
    {
        var requestedAtUtc = DateTimeOffset.UtcNow;
        var rules = effectiveRules
            .Select(rule =>
            {
                var content = string.IsNullOrWhiteSpace(rule.OriginalContent) ? rule.RuleBody : rule.OriginalContent;
                var contract = BuildFamilyExecutionContract(capability, content);
                return new
                {
                    ruleRevisionId = rule.Id,
                    ruleArtifactId = rule.RuleArtifactId,
                    revisionNumber = rule.RevisionNumber,
                    versionLabel = rule.VersionLabel,
                    declaredRuleFamily,
                    ruleBody = content,
                    executionContract = contract,
                };
            })
            .ToArray();

        return new
        {
            version = EnvelopeVersion,
            scanJobId = scanJob.Id,
            targetExecutionId = targetExecution.Id,
            capability = capability.ToString(),
            requestedAtUtc,
            readOnly = true,
            targetServer = new
            {
                id = targetServer.Id,
                hostname = targetServer.Hostname,
                ipAddress = targetServer.IpAddress,
                operatingSystem = targetServer.OperatingSystem,
                environment = targetServer.Environment,
                connectionProtocol = targetServer.ConnectionProtocol?.ToString(),
                connectionHost = targetServer.ConnectionHost,
                connectionPort = targetServer.ConnectionPort,
                connectionAuthMode = targetServer.ConnectionAuthMode?.ToString(),
            },
            scanner = new
            {
                id = scanner.Id,
                name = scanner.Name,
                engineType = scanner.EngineType,
                version = scanner.Version,
            },
            rules,
        };
    }

    private static object BuildFamilyExecutionContract(ScannerCapability capability, string ruleBody)
    {
        return capability switch
        {
            ScannerCapability.Yara => new
            {
                contractVersion = "1.0",
                family = "Yara",
                executableInLabV1 = true,
                yara = new
                {
                    ruleContent = ruleBody,
                    expectedResultSchema = new
                    {
                        collection = "findings",
                        fields = new[] { "ruleRevisionId", "matchedStrings", "filePath", "confidence", "disposition", "evidence" },
                    },
                },
            },
            ScannerCapability.Snort => new
            {
                contractVersion = "1.0",
                family = "Snort",
                executableInLabV1 = true,
                snort = new
                {
                    ruleContent = ruleBody,
                    expectedResultSchema = new
                    {
                        collection = "alerts",
                        fields = new[] { "ruleRevisionId", "sid", "srcIp", "dstIp", "protocol", "confidence", "disposition", "evidence" },
                    },
                },
            },
            ScannerCapability.Suricata => new
            {
                contractVersion = "1.0",
                family = "Suricata",
                executableInLabV1 = true,
                suricata = new
                {
                    ruleContent = ruleBody,
                    expectedResultSchema = new
                    {
                        collection = "alerts",
                        fields = new[] { "ruleRevisionId", "alertName", "host", "severity", "confidence", "disposition", "evidence" },
                    },
                },
            },
            ScannerCapability.Sigma => new
            {
                contractVersion = "1.0",
                family = "Sigma",
                executableInLabV1 = false,
                limitation = "Contract is ready, but Sigma runtime execution is unavailable in lab v1.",
                sigma = new
                {
                    ruleContent = ruleBody,
                    expectedResultSchema = new
                    {
                        collection = "events",
                        fields = new[] { "ruleRevisionId", "eventId", "source", "confidence", "disposition", "evidence" },
                    },
                },
            },
            _ => new
            {
                contractVersion = "1.0",
                family = capability.ToString(),
                executableInLabV1 = false,
                limitation = "Unsupported family for lab execution contract.",
                ruleContent = ruleBody,
            },
        };
    }

    private ParsedSecret ReadSecret(TargetServerConnectionSecret? connectionSecret)
    {
        if (connectionSecret is null)
        {
            return ParsedSecret.Empty;
        }

        string payload;
        try
        {
            payload = _secretProtector.Unprotect(connectionSecret.EncryptedPayload);
        }
        catch
        {
            return ParsedSecret.Invalid("Connection secret could not be decrypted.");
        }

        if (string.IsNullOrWhiteSpace(payload))
        {
            return ParsedSecret.Empty;
        }

        try
        {
            using var json = JsonDocument.Parse(payload);
            if (json.RootElement.ValueKind != JsonValueKind.Object)
            {
                return ParsedSecret.Invalid("Connection secret payload must be a JSON object.");
            }

            var root = json.RootElement;
            var agent = TryGetObject(root, "agent");

            return ParsedSecret.Empty with
            {
                AgentEndpointUrl = ReadString(agent, "endpointUrl", "url", "baseUrl") ?? ReadString(root, "agentEndpointUrl", "endpointUrl"),
                AgentEndpointPath = ReadString(agent, "endpointPath", "path") ?? ReadString(root, "agentEndpointPath"),
                AgentToken = ReadString(agent, "token", "bearerToken", "apiToken") ?? ReadString(root, "agentToken", "token"),
                AgentHeaderName = ReadString(agent, "headerName") ?? ReadString(root, "agentHeaderName"),
                AgentHeaderValue = ReadString(agent, "headerValue") ?? ReadString(root, "agentHeaderValue"),
                AgentUseHttps = ReadBool(agent, "useHttps") ?? ReadBool(root, "agentUseHttps"),
            };
        }
        catch (JsonException)
        {
            return ParsedSecret.Invalid("Connection secret is not valid JSON.");
        }
    }

    private Uri? ResolveAgentEndpoint(TargetServer targetServer, ParsedSecret secret)
    {
        if (TryAbsoluteUri(secret.AgentEndpointUrl, out var explicitUri))
        {
            return explicitUri;
        }

        if (string.IsNullOrWhiteSpace(targetServer.ConnectionHost))
        {
            return null;
        }

        var configuredPath = string.IsNullOrWhiteSpace(secret.AgentEndpointPath)
            ? _options.CurrentValue.AgentEndpointPath
            : secret.AgentEndpointPath.Trim();
        var normalizedPath = configuredPath.StartsWith("/", StringComparison.Ordinal)
            ? configuredPath
            : $"/{configuredPath}";

        if (TryAbsoluteUri(targetServer.ConnectionHost, out var hostAbsolute))
        {
            return new Uri(hostAbsolute!, normalizedPath);
        }

        var scheme = secret.AgentUseHttps == true ? "https" : "http";
        if (!Uri.TryCreate($"{scheme}://{targetServer.ConnectionHost}", UriKind.Absolute, out var baseHost))
        {
            return null;
        }

        var builder = new UriBuilder(baseHost)
        {
            Path = normalizedPath,
        };
        if (targetServer.ConnectionPort.HasValue)
        {
            builder.Port = targetServer.ConnectionPort.Value;
        }

        return builder.Uri;
    }

    private ParsedConnectorBody ParseConnectorBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return ParsedConnectorBody.Invalid("Connector returned an empty response body.");
        }

        try
        {
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.ValueKind != JsonValueKind.Object)
            {
                return ParsedConnectorBody.Invalid("Connector response payload must be a JSON object.");
            }

            var root = json.RootElement;
            var statusRaw = ReadString(root, "status", "result", "outcome");
            var status = ParseConnectorStatus(statusRaw);
            if (status is null)
            {
                return ParsedConnectorBody.Invalid("Connector response does not include a valid status.");
            }

            var message = ReadString(root, "message", "detail", "diagnostic", "error");
            var correlationId = ReadString(root, "correlationId", "correlation_id", "requestId", "request_id");
            var rawOutput = Truncate(ReadFreeformString(root, "rawOutput", "output", "stdout"), _options.CurrentValue.MaxRawOutputChars);
            var resultFiles = ParseResultFiles(root, _options.CurrentValue.MaxResultFiles);
            var findings = ParseFindings(root, _options.CurrentValue.MaxFindings, _options.CurrentValue.MaxRawOutputChars);
            var hasRemediationSignals = ContainsRemediationSignals(root);

            return new ParsedConnectorBody(
                IsValid: true,
                Status: status.Value,
                Message: message,
                Error: null,
                CorrelationId: correlationId,
                RawOutput: rawOutput,
                ResultFiles: resultFiles,
                Findings: findings,
                HasRemediationSignals: hasRemediationSignals);
        }
        catch (JsonException)
        {
            return ParsedConnectorBody.Invalid("Connector returned invalid JSON payload.");
        }
    }

    private static ConnectorExecutionStatus? ParseConnectorStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var normalized = raw.Trim().Replace("-", string.Empty, StringComparison.Ordinal)
            .Replace("_", string.Empty, StringComparison.Ordinal)
            .ToLowerInvariant();

        return normalized switch
        {
            "success" or "succeeded" or "completed" or "ok" => ConnectorExecutionStatus.Success,
            "partial" or "partiallycompleted" => ConnectorExecutionStatus.Partial,
            "failure" or "failed" or "error" => ConnectorExecutionStatus.Failure,
            "unreachable" or "timeout" or "timedout" => ConnectorExecutionStatus.Unreachable,
            "unsupported" or "notsupported" => ConnectorExecutionStatus.Unsupported,
            _ => null,
        };
    }

    private static List<ScanExecutionResultFile> ParseResultFiles(JsonElement root, int maxResultFiles)
    {
        var filesArray = TryGetArray(root, "resultFiles")
            ?? TryGetArray(root, "results")
            ?? TryGetArray(root, "files")
            ?? TryGetArray(root, "artifacts");

        if (!filesArray.HasValue)
        {
            return [];
        }

        var result = new List<ScanExecutionResultFile>();
        foreach (var element in filesArray.Value.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var name = ReadString(element, "name", "fileName");
            var path = ReadString(element, "path", "filePath", "relativePath");
            var sizeBytes = ReadLong(element, "sizeBytes", "size", "bytes");
            var sha256 = ReadString(element, "sha256", "hash", "checksum");

            result.Add(new ScanExecutionResultFile(name, path, sizeBytes, sha256));
            if (result.Count >= maxResultFiles)
            {
                break;
            }
        }

        return result;
    }

    private static List<ScanExecutionDispatchFinding> ParseFindings(JsonElement root, int maxFindings, int maxEvidenceChars)
    {
        var findingsArray = TryGetArray(root, "findings")
            ?? TryGetArray(root, "matches")
            ?? TryGetArray(root, "alerts")
            ?? TryGetArray(root, "events");

        if (!findingsArray.HasValue)
        {
            return [];
        }

        var findings = new List<ScanExecutionDispatchFinding>();
        foreach (var element in findingsArray.Value.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var ruleRevisionId = ReadGuid(element, "ruleRevisionId", "rule_revision_id", "ruleId");
            var iocId = ReadGuid(element, "iocId", "ioc_id");
            var disposition = ParseDisposition(ReadString(element, "disposition", "resultDisposition"));
            var confidence = ClampConfidence(ReadDecimal(element, "confidence", "score"));
            var evidenceJson = ResolveFindingEvidenceJson(element, maxEvidenceChars);

            findings.Add(new ScanExecutionDispatchFinding(
                ruleRevisionId,
                iocId,
                disposition,
                confidence,
                evidenceJson));

            if (findings.Count >= maxFindings)
            {
                break;
            }
        }

        return findings;
    }

    private static string ResolveFindingEvidenceJson(JsonElement element, int maxLength)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, "evidenceJson", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var value = property.Value.ValueKind switch
            {
                JsonValueKind.String => property.Value.GetString(),
                _ => property.Value.GetRawText(),
            };
            return string.IsNullOrWhiteSpace(value) ? "{}" : Truncate(value.Trim(), maxLength);
        }

        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, "evidence", StringComparison.OrdinalIgnoreCase))
            {
                return Truncate(property.Value.GetRawText(), maxLength);
            }
        }

        return Truncate(element.GetRawText(), maxLength);
    }

    private static ScanResultDisposition ParseDisposition(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return ScanResultDisposition.Informational;
        }

        return Enum.TryParse<ScanResultDisposition>(raw.Trim(), ignoreCase: true, out var parsed)
            ? parsed
            : ScanResultDisposition.Informational;
    }

    private static decimal ClampConfidence(decimal value)
    {
        if (value < 0m)
        {
            return 0m;
        }

        if (value > 1m)
        {
            return 1m;
        }

        return value;
    }

    private static bool ContainsRemediationSignals(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().Any(ContainsRemediationSignals),
            JsonValueKind.Array => element.EnumerateArray().Any(ContainsRemediationSignals),
            JsonValueKind.String => HasRemediationToken(element.GetString()),
            _ => false,
        };
    }

    private static bool ContainsRemediationSignals(JsonProperty property)
    {
        if (HasRemediationToken(property.Name))
        {
            return true;
        }

        return ContainsRemediationSignals(property.Value);
    }

    private static bool HasRemediationToken(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return RemediationTokens.Any(token => value.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static bool LooksUnreachable(string diagnostic)
    {
        return UnreachableTokens.Any(token => diagnostic.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static string ResolveRuleFamily(ScannerCapability capability)
    {
        return capability switch
        {
            ScannerCapability.Yara => RuleFamilyCatalog.NormalizeOrThrow("yara", nameof(capability)),
            ScannerCapability.Sigma => RuleFamilyCatalog.NormalizeOrThrow("sigma", nameof(capability)),
            ScannerCapability.Snort => RuleFamilyCatalog.NormalizeOrThrow("snort", nameof(capability)),
            ScannerCapability.Suricata => RuleFamilyCatalog.NormalizeOrThrow("suricata", nameof(capability)),
            _ => throw new ArgumentOutOfRangeException(nameof(capability), $"Unsupported scanner capability '{capability}'."),
        };
    }

    private static bool TryAbsoluteUri(string? raw, out Uri? uri)
    {
        uri = null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        return Uri.TryCreate(raw.Trim(), UriKind.Absolute, out uri);
    }

    private static string BuildHttpDiagnostic(HttpStatusCode statusCode, string body)
    {
        var compact = string.IsNullOrWhiteSpace(body)
            ? "empty response body"
            : Truncate(body.Trim(), 4000);
        return $"Connector returned {(int)statusCode} ({statusCode}): {compact}";
    }

    private static JsonElement? TryGetObject(JsonElement root, string key)
    {
        foreach (var property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Object)
            {
                return property.Value;
            }
        }

        return null;
    }

    private static JsonElement? TryGetArray(JsonElement root, string key)
    {
        foreach (var property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Array)
            {
                return property.Value;
            }
        }

        return null;
    }

    private static string? ReadString(JsonElement? container, params string[] keys)
    {
        if (!container.HasValue || container.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var key in keys)
        {
            foreach (var property in container.Value.EnumerateObject())
            {
                if (!string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return property.Value.ValueKind switch
                {
                    JsonValueKind.String => property.Value.GetString(),
                    JsonValueKind.Number => property.Value.GetRawText(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => null,
                };
            }
        }

        return null;
    }

    private static bool? ReadBool(JsonElement? container, params string[] keys)
    {
        var text = ReadString(container, keys);
        return bool.TryParse(text, out var parsed) ? parsed : null;
    }

    private static long? ReadLong(JsonElement container, params string[] keys)
    {
        var text = ReadString(container, keys);
        if (long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
        {
            return value;
        }

        return null;
    }

    private static decimal ReadDecimal(JsonElement container, params string[] keys)
    {
        var text = ReadString(container, keys);
        if (decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return value;
        }

        return 0m;
    }

    private static Guid? ReadGuid(JsonElement container, params string[] keys)
    {
        var text = ReadString(container, keys);
        if (Guid.TryParse(text, out var value))
        {
            return value;
        }

        return null;
    }

    private static string? ReadFreeformString(JsonElement container, params string[] keys)
    {
        foreach (var key in keys)
        {
            foreach (var property in container.EnumerateObject())
            {
                if (!string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return property.Value.ValueKind switch
                {
                    JsonValueKind.Null => null,
                    JsonValueKind.String => property.Value.GetString(),
                    _ => property.Value.GetRawText(),
                };
            }
        }

        return null;
    }

    private static string Truncate(string? text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var value = text.Trim();
        if (value.Length <= maxLength)
        {
            return value;
        }

        return $"{value[..maxLength]}...";
    }

    private static ScanExecutionDispatchResult Success(
        string summary,
        string? correlationId,
        string? rawOutput,
        IReadOnlyList<ScanExecutionResultFile> resultFiles,
        IReadOnlyList<ScanExecutionDispatchFinding> findings)
        => new(
            ScanJobTargetExecutionStatus.Completed,
            Summary: Truncate(summary, 4000),
            ErrorMessage: null,
            CorrelationId: correlationId,
            RawOutput: string.IsNullOrWhiteSpace(rawOutput) ? null : rawOutput,
            ResultFiles: resultFiles,
            Findings: findings);

    private static ScanExecutionDispatchResult Partial(
        string summary,
        string? correlationId,
        string? rawOutput,
        IReadOnlyList<ScanExecutionResultFile> resultFiles,
        IReadOnlyList<ScanExecutionDispatchFinding> findings)
        => new(
            ScanJobTargetExecutionStatus.PartiallyCompleted,
            Summary: Truncate(summary, 4000),
            ErrorMessage: null,
            CorrelationId: correlationId,
            RawOutput: string.IsNullOrWhiteSpace(rawOutput) ? null : rawOutput,
            ResultFiles: resultFiles,
            Findings: findings);

    private static ScanExecutionDispatchResult Failure(
        string message,
        string? rawOutput = null,
        string? correlationId = null,
        IReadOnlyList<ScanExecutionResultFile>? resultFiles = null,
        IReadOnlyList<ScanExecutionDispatchFinding>? findings = null)
    {
        var normalized = Truncate(message, 4000);
        return new ScanExecutionDispatchResult(
            ScanJobTargetExecutionStatus.Failed,
            Summary: normalized,
            ErrorMessage: normalized,
            CorrelationId: correlationId,
            RawOutput: string.IsNullOrWhiteSpace(rawOutput) ? null : rawOutput,
            ResultFiles: resultFiles ?? [],
            Findings: findings ?? []);
    }

    private enum ConnectorExecutionStatus
    {
        Success = 1,
        Partial = 2,
        Failure = 3,
        Unreachable = 4,
        Unsupported = 5,
    }

    private sealed record ParsedConnectorBody(
        bool IsValid,
        ConnectorExecutionStatus Status,
        string? Message,
        string? Error,
        string? CorrelationId,
        string? RawOutput,
        IReadOnlyList<ScanExecutionResultFile> ResultFiles,
        IReadOnlyList<ScanExecutionDispatchFinding> Findings,
        bool HasRemediationSignals)
    {
        public static ParsedConnectorBody Invalid(string error)
            => new(
                IsValid: false,
                Status: ConnectorExecutionStatus.Failure,
                Message: null,
                Error: error,
                CorrelationId: null,
                RawOutput: null,
                ResultFiles: [],
                Findings: [],
                HasRemediationSignals: false);
    }

    private sealed record ParsedSecret(
        bool IsValid,
        string? Error,
        string? AgentEndpointUrl,
        string? AgentEndpointPath,
        string? AgentToken,
        string? AgentHeaderName,
        string? AgentHeaderValue,
        bool? AgentUseHttps)
    {
        public static ParsedSecret Empty { get; } = new(
            IsValid: true,
            Error: null,
            AgentEndpointUrl: null,
            AgentEndpointPath: null,
            AgentToken: null,
            AgentHeaderName: null,
            AgentHeaderValue: null,
            AgentUseHttps: null);

        public static ParsedSecret Invalid(string error)
            => Empty with { IsValid = false, Error = error };
    }
}
