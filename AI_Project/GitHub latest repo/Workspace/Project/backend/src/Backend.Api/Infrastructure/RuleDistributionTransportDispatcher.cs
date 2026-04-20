using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Backend.Domain.IocManager;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed record RuleDistributionDispatchResult(
    RuleDistributionTargetStatus Status,
    bool IsRetryable,
    string Transport,
    string? Diagnostic,
    string? RemoteCorrelationId);

public interface IRuleDistributionTransportDispatcher
{
    Task<RuleDistributionDispatchResult> DispatchAsync(
        TargetServer targetServer,
        TargetServerConnectionSecret? connectionSecret,
        RuleArtifact ruleArtifact,
        RuleRevision ruleRevision,
        RuleDistributionJob job,
        RuleDistributionAttempt attempt,
        RuleDistributionTarget target,
        CancellationToken cancellationToken);
}

public sealed class RuleDistributionTransportDispatcher : IRuleDistributionTransportDispatcher
{
    public const string HttpClientName = "RuleDistributionTransport";

    private static readonly string[] UnreachableTokens =
    [
        "timed out",
        "no route",
        "network is unreachable",
        "connection refused",
        "could not resolve",
        "host is down",
        "connection reset",
    ];

    private readonly IRuleDistributionCommandRunner _commandRunner;
    private readonly TargetServerConnectionSecretProtector _secretProtector;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<RuleDistributionExecutionOptions> _options;
    private readonly ILogger<RuleDistributionTransportDispatcher> _logger;

    public RuleDistributionTransportDispatcher(
        IRuleDistributionCommandRunner commandRunner,
        TargetServerConnectionSecretProtector secretProtector,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<RuleDistributionExecutionOptions> options,
        ILogger<RuleDistributionTransportDispatcher> logger)
    {
        _commandRunner = commandRunner;
        _secretProtector = secretProtector;
        _httpClientFactory = httpClientFactory;
        _options = options;
        _logger = logger;
    }

    public async Task<RuleDistributionDispatchResult> DispatchAsync(
        TargetServer targetServer,
        TargetServerConnectionSecret? connectionSecret,
        RuleArtifact ruleArtifact,
        RuleRevision ruleRevision,
        RuleDistributionJob job,
        RuleDistributionAttempt attempt,
        RuleDistributionTarget target,
        CancellationToken cancellationToken)
    {
        var secret = ReadSecret(connectionSecret);
        if (!secret.IsValid)
        {
            return ValidationFailed(secret.Error ?? "Invalid connection secret payload.");
        }

        return targetServer.ConnectionProtocol switch
        {
            ConnectionProtocol.Ssh => await DispatchSshAsync(targetServer, ruleArtifact, ruleRevision, job, attempt, secret, cancellationToken),
            ConnectionProtocol.Agent => await DispatchAgentAsync(targetServer, ruleArtifact, ruleRevision, job, attempt, secret, cancellationToken),
            _ => ValidationFailed("Connection protocol is unsupported for distribution."),
        };
    }

    private async Task<RuleDistributionDispatchResult> DispatchSshAsync(
        TargetServer server,
        RuleArtifact artifact,
        RuleRevision revision,
        RuleDistributionJob job,
        RuleDistributionAttempt attempt,
        ParsedSecret secret,
        CancellationToken cancellationToken)
    {
        if (server.ConnectionAuthMode == ConnectionAuthMode.Password)
        {
            return ValidationFailed("SSH password mode is not supported for non-interactive rule distribution.");
        }

        if (string.IsNullOrWhiteSpace(server.ConnectionHost) || !server.ConnectionPort.HasValue)
        {
            return ValidationFailed("SSH connection host/port is not configured.");
        }

        var content = string.IsNullOrWhiteSpace(revision.OriginalContent) ? revision.RuleBody : revision.OriginalContent;
        if (string.IsNullOrWhiteSpace(content))
        {
            return ValidationFailed("Rule revision content is empty.");
        }

        var destination = string.IsNullOrWhiteSpace(server.ConnectionUsername)
            ? server.ConnectionHost.Trim()
            : $"{server.ConnectionUsername.Trim()}@{server.ConnectionHost.Trim()}";
        var remotePath = ResolveRemotePath(secret, artifact, revision);
        var tempFile = Path.GetTempFileName();

        await File.WriteAllTextAsync(tempFile, content, Encoding.UTF8, cancellationToken);
        try
        {
            var timeout = TimeSpan.FromSeconds(_options.CurrentValue.CommandTimeoutSeconds);
            var scpArgs = new List<string>();
            AppendCommonSshArgs(scpArgs, isScp: true, server.ConnectionPort.Value, secret);
            scpArgs.Add(tempFile);
            scpArgs.Add($"{destination}:{remotePath}");
            var scp = await _commandRunner.RunAsync("scp", scpArgs, timeout, cancellationToken);

            if (scp.TimedOut)
            {
                return Unreachable("scp command timed out while transferring rule payload.");
            }

            if (scp.ExitCode != 0)
            {
                var diagnostic = BuildCommandDiagnostic("scp", scp);
                return LooksUnreachable(diagnostic) ? Unreachable(diagnostic) : Failure(diagnostic);
            }

            var applyTemplate = secret.SshApplyCommandTemplate ?? _options.CurrentValue.SshApplyCommandTemplate;
            if (string.IsNullOrWhiteSpace(applyTemplate))
            {
                return Partial("Rule file transferred by scp but apply command is not configured.");
            }

            var applyCommand = applyTemplate
                .Replace("{remoteFile}", remotePath, StringComparison.OrdinalIgnoreCase)
                .Replace("{jobId}", job.Id.ToString("N"), StringComparison.OrdinalIgnoreCase)
                .Replace("{attemptId}", attempt.Id.ToString("N"), StringComparison.OrdinalIgnoreCase)
                .Replace("{ruleRevisionId}", revision.Id.ToString("N"), StringComparison.OrdinalIgnoreCase)
                .Replace("{ruleArtifactId}", artifact.Id.ToString("N"), StringComparison.OrdinalIgnoreCase)
                .Replace("{ruleFamily}", artifact.RuleFamily, StringComparison.OrdinalIgnoreCase)
                .Replace("{revisionNumber}", revision.RevisionNumber.ToString(), StringComparison.OrdinalIgnoreCase);

            var sshArgs = new List<string>();
            AppendCommonSshArgs(sshArgs, isScp: false, server.ConnectionPort.Value, secret);
            sshArgs.Add(destination);
            sshArgs.Add(applyCommand);
            var ssh = await _commandRunner.RunAsync("ssh", sshArgs, timeout, cancellationToken);

            if (ssh.TimedOut)
            {
                return Unreachable("ssh apply command timed out.");
            }

            if (ssh.ExitCode != 0)
            {
                var diagnostic = BuildCommandDiagnostic("ssh", ssh);
                return LooksUnreachable(diagnostic)
                    ? Unreachable(diagnostic)
                    : Partial($"Rule file transferred, but apply command failed: {diagnostic}");
            }

            return Success("Rule transferred and apply command completed.", transport: "ssh-scp");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SSH distribution failed for target server {TargetServerId}.", server.Id);
            return Failure($"SSH distribution failed: {ex.Message}");
        }
        finally
        {
            TryDelete(tempFile);
        }
    }

    private async Task<RuleDistributionDispatchResult> DispatchAgentAsync(
        TargetServer server,
        RuleArtifact artifact,
        RuleRevision revision,
        RuleDistributionJob job,
        RuleDistributionAttempt attempt,
        ParsedSecret secret,
        CancellationToken cancellationToken)
    {
        var endpoint = ResolveAgentEndpoint(server, secret);
        if (endpoint is null)
        {
            return ValidationFailed("Managed connector endpoint is not configured.");
        }

        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = JsonContent.Create(new
                {
                    jobId = job.Id,
                    attemptId = attempt.Id,
                    targetServerId = server.Id,
                    ruleRevisionId = revision.Id,
                    ruleArtifactId = artifact.Id,
                    ruleFamily = artifact.RuleFamily,
                    revisionNumber = revision.RevisionNumber,
                    versionLabel = revision.VersionLabel,
                    ruleBody = string.IsNullOrWhiteSpace(revision.OriginalContent) ? revision.RuleBody : revision.OriginalContent,
                    requestedAtUtc = DateTimeOffset.UtcNow,
                }),
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
            var parsed = ParseAgentBody(body);

            if (parsed.Status is not null)
            {
                return parsed.Status.Value switch
                {
                    RuleDistributionTargetStatus.Success => Success(parsed.Message ?? "Connector accepted distribution request.", "agent-http", parsed.CorrelationId),
                    RuleDistributionTargetStatus.ValidationFailed => ValidationFailed(parsed.Message ?? "Connector validation rejected the payload.", parsed.CorrelationId),
                    RuleDistributionTargetStatus.Unreachable => Unreachable(parsed.Message ?? "Connector reported target as unreachable.", parsed.CorrelationId),
                    RuleDistributionTargetStatus.PartiallyApplied => Partial(parsed.Message ?? "Connector reported partial application.", parsed.CorrelationId),
                    RuleDistributionTargetStatus.Failure => Failure(parsed.Message ?? "Connector reported distribution failure.", parsed.CorrelationId),
                    _ => Failure(parsed.Message ?? "Connector returned unsupported status.", parsed.CorrelationId),
                };
            }

            if (response.IsSuccessStatusCode)
            {
                return Success(parsed.Message ?? "Connector accepted distribution request.", "agent-http", parsed.CorrelationId);
            }

            var diagnostic = BuildHttpDiagnostic(response.StatusCode, body);
            return response.StatusCode switch
            {
                HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity => ValidationFailed(diagnostic, parsed.CorrelationId),
                HttpStatusCode.RequestTimeout or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout => Unreachable(diagnostic, parsed.CorrelationId),
                _ => Failure(diagnostic, parsed.CorrelationId),
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            return Unreachable("Connector request timed out.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Managed connector request failed for target server {TargetServerId}.", server.Id);
            return Unreachable($"Connector request failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Managed connector distribution failed for target server {TargetServerId}.", server.Id);
            return Failure($"Connector distribution failed: {ex.Message}");
        }
    }

    private ParsedSecret ReadSecret(TargetServerConnectionSecret? secret)
    {
        if (secret is null)
        {
            return ParsedSecret.Empty;
        }

        string payload;
        try
        {
            payload = _secretProtector.Unprotect(secret.EncryptedPayload);
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
            var ssh = TryGetObject(root, "ssh");
            var agent = TryGetObject(root, "agent");

            return ParsedSecret.Empty with
            {
                SshPrivateKeyPath = ReadString(ssh, "privateKeyPath", "privateKey", "keyPath") ?? ReadString(root, "sshPrivateKeyPath"),
                SshRemotePath = ReadString(ssh, "remotePath", "remoteRulePath") ?? ReadString(root, "sshRemoteRulePath", "remotePath"),
                SshApplyCommandTemplate = ReadString(ssh, "applyCommand", "applyCommandTemplate") ?? ReadString(root, "sshApplyCommand", "applyCommand"),
                SkipHostKeyChecking = ReadBool(ssh, "skipHostKeyChecking") ?? ReadBool(root, "skipHostKeyChecking") ?? true,
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

    private Uri? ResolveAgentEndpoint(TargetServer server, ParsedSecret secret)
    {
        if (TryAbsoluteUri(secret.AgentEndpointUrl, out var explicitUri))
        {
            return explicitUri;
        }

        if (string.IsNullOrWhiteSpace(server.ConnectionHost))
        {
            return null;
        }

        var path = string.IsNullOrWhiteSpace(secret.AgentEndpointPath)
            ? _options.CurrentValue.AgentEndpointPath
            : secret.AgentEndpointPath.Trim();
        var normalizedPath = path.StartsWith("/", StringComparison.Ordinal) ? path : $"/{path}";

        if (TryAbsoluteUri(server.ConnectionHost, out var hostAbsolute))
        {
            return new Uri(hostAbsolute!, normalizedPath);
        }

        var scheme = secret.AgentUseHttps == true ? "https" : "http";
        if (!Uri.TryCreate($"{scheme}://{server.ConnectionHost}", UriKind.Absolute, out var baseHost))
        {
            return null;
        }

        var builder = new UriBuilder(baseHost)
        {
            Path = normalizedPath,
        };
        if (server.ConnectionPort.HasValue)
        {
            builder.Port = server.ConnectionPort.Value;
        }

        return builder.Uri;
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

    private string ResolveRemotePath(ParsedSecret secret, RuleArtifact artifact, RuleRevision revision)
    {
        if (!string.IsNullOrWhiteSpace(secret.SshRemotePath))
        {
            return secret.SshRemotePath.Trim();
        }

        var root = string.IsNullOrWhiteSpace(_options.CurrentValue.SshRemoteRuleDirectory)
            ? "/tmp/ioc-rules"
            : _options.CurrentValue.SshRemoteRuleDirectory.Trim();
        root = root.TrimEnd('/');
        return $"{root}/{artifact.RuleFamily}-{artifact.Id:N}-r{revision.RevisionNumber}.rule";
    }

    private static void AppendCommonSshArgs(List<string> args, bool isScp, int port, ParsedSecret secret)
    {
        args.Add(isScp ? "-P" : "-p");
        args.Add(port.ToString());

        if (!string.IsNullOrWhiteSpace(secret.SshPrivateKeyPath))
        {
            args.Add("-i");
            args.Add(secret.SshPrivateKeyPath);
        }

        if (secret.SkipHostKeyChecking)
        {
            args.Add("-o");
            args.Add("StrictHostKeyChecking=no");
            args.Add("-o");
            args.Add($"UserKnownHostsFile={(OperatingSystem.IsWindows() ? "NUL" : "/dev/null")}");
        }
    }

    private static bool LooksUnreachable(string diagnostic)
    {
        return UnreachableTokens.Any(token => diagnostic.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static string BuildCommandDiagnostic(string command, RuleDistributionCommandResult result)
    {
        var stderr = string.IsNullOrWhiteSpace(result.StandardError) ? "none" : result.StandardError;
        var stdout = string.IsNullOrWhiteSpace(result.StandardOutput) ? "none" : result.StandardOutput;
        return $"{command} exit={result.ExitCode}; stderr={stderr}; stdout={stdout}";
    }

    private static string BuildHttpDiagnostic(HttpStatusCode statusCode, string body)
    {
        var compact = string.IsNullOrWhiteSpace(body) ? "empty response body" : Truncate(body.Trim(), 4000);
        return $"Connector returned {(int)statusCode} ({statusCode}): {compact}";
    }

    private static (RuleDistributionTargetStatus? Status, string? Message, string? CorrelationId) ParseAgentBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return (null, null, null);
        }

        try
        {
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.ValueKind != JsonValueKind.Object)
            {
                return (null, null, null);
            }

            var statusRaw = ReadString(json.RootElement, "status", "result", "outcome");
            RuleDistributionTargetStatus? status = statusRaw?.Trim().ToLowerInvariant() switch
            {
                "success" or "succeeded" => RuleDistributionTargetStatus.Success,
                "failure" or "failed" => RuleDistributionTargetStatus.Failure,
                "unreachable" => RuleDistributionTargetStatus.Unreachable,
                "validationfailed" or "validation_failed" or "validation-failed" => RuleDistributionTargetStatus.ValidationFailed,
                "partiallyapplied" or "partially_applied" or "partially-applied" => RuleDistributionTargetStatus.PartiallyApplied,
                _ => null,
            };

            var message = ReadString(json.RootElement, "message", "detail", "diagnostic");
            var correlationId = ReadString(json.RootElement, "correlationId", "correlation_id", "requestId", "request_id");
            return (status, message, correlationId);
        }
        catch (JsonException)
        {
            return (null, null, null);
        }
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
        if (bool.TryParse(text, out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private static string Truncate(string text, int maxLength)
    {
        if (text.Length <= maxLength)
        {
            return text;
        }

        return $"{text[..maxLength]}...";
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Ignore temporary file cleanup failures.
        }
    }

    private static RuleDistributionDispatchResult Success(string? message, string transport, string? correlationId = null)
        => new(RuleDistributionTargetStatus.Success, false, transport, string.IsNullOrWhiteSpace(message) ? null : Truncate(message, 4000), correlationId);

    private static RuleDistributionDispatchResult Failure(string message, string? correlationId = null)
        => new(RuleDistributionTargetStatus.Failure, true, "error", Truncate(message, 4000), correlationId);

    private static RuleDistributionDispatchResult Unreachable(string message, string? correlationId = null)
        => new(RuleDistributionTargetStatus.Unreachable, true, "network", Truncate(message, 4000), correlationId);

    private static RuleDistributionDispatchResult ValidationFailed(string message, string? correlationId = null)
        => new(RuleDistributionTargetStatus.ValidationFailed, false, "validation", Truncate(message, 4000), correlationId);

    private static RuleDistributionDispatchResult Partial(string message, string? correlationId = null)
        => new(RuleDistributionTargetStatus.PartiallyApplied, true, "partial", Truncate(message, 4000), correlationId);

    private sealed record ParsedSecret(
        bool IsValid,
        string? Error,
        string? SshPrivateKeyPath,
        string? SshRemotePath,
        string? SshApplyCommandTemplate,
        bool SkipHostKeyChecking,
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
            SshPrivateKeyPath: null,
            SshRemotePath: null,
            SshApplyCommandTemplate: null,
            SkipHostKeyChecking: true,
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
