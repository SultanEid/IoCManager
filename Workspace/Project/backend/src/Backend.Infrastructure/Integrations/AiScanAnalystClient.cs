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

            var payload = DeserializeRecommendation(responseBody);
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

    private AiScanAnalystRecommendationResult? DeserializeRecommendation(string responseBody)
    {
        try
        {
            return JsonSerializer.Deserialize<AiScanAnalystRecommendationResult>(responseBody, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "AI scan analyst returned strict-contract-invalid JSON. Attempting tolerant recovery.");
            var recovered = TryDeserializeLoosely(responseBody);
            if (recovered is not null)
            {
                return recovered;
            }

            throw;
        }
    }

    private AiScanAnalystRecommendationResult? TryDeserializeLoosely(string responseBody)
    {
        var payload = JsonSerializer.Deserialize<LooseRecommendationResult>(responseBody, JsonOptions);
        if (payload is null || payload.Proposal is null)
        {
            return null;
        }

        var targets = payload.Proposal.Targets
            .Select(ConvertTarget)
            .OfType<AiScanAnalystTargetRecommendation>()
            .ToList();
        var rules = payload.Proposal.Rules
            .Select(ConvertRule)
            .OfType<AiScanAnalystRuleRecommendation>()
            .ToList();

        var targetIds = payload.Proposal.TargetServerIds
            .Select(ParseGuidOrDefault)
            .Concat(targets.Select(x => x.TargetServerId))
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();
        var ruleIds = payload.Proposal.RuleRevisionIds
            .Select(ParseGuidOrDefault)
            .Concat(rules.Select(x => x.RuleRevisionId))
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();

        if (targetIds.Count == 0 && rules.Count == 0 && targets.Count == 0)
        {
            return null;
        }

        var proposal = new AiScanAnalystPlanProposal(
            payload.Proposal.Name ?? "zira-recovered-plan",
            payload.Proposal.Description ?? "Recovered plan from tolerant sidecar parsing.",
            payload.Proposal.ScannerCapability ?? payload.RecommendedScannerCapability ?? "Auto",
            payload.Proposal.RuleSelectionMode ?? "RuleSet",
            payload.Proposal.RuleScopeType,
            payload.Proposal.RuleScopeValue,
            payload.Proposal.CadenceType ?? "Manual",
            payload.Proposal.IntervalMinutes,
            payload.Proposal.RunAtHourUtc,
            payload.Proposal.RunAtMinuteUtc,
            payload.Proposal.WeeklyDayOfWeek,
            payload.Proposal.OperatorNotes ?? string.Empty,
            payload.Proposal.Status ?? "Draft",
            targetIds,
            ruleIds,
            targets,
            rules);

        _logger.LogInformation(
            "Recovered AI scan analyst response with {TargetCount} valid target ids and {RuleCount} valid rule ids after dropping malformed ids.",
            targetIds.Count,
            ruleIds.Count);

        return new AiScanAnalystRecommendationResult(
            payload.Summary ?? "Recovered AI scan analyst response.",
            payload.PlannerMode ?? "recovered",
            payload.Observations ?? Array.Empty<string>(),
            payload.Reasoning ?? Array.Empty<string>(),
            payload.ValidationWarnings ?? Array.Empty<string>(),
            payload.RecommendedScannerCapability ?? proposal.ScannerCapability,
            proposal);
    }

    private static AiScanAnalystTargetRecommendation? ConvertTarget(LooseTargetRecommendation target)
    {
        var targetServerId = ParseGuidOrDefault(target.TargetServerId);
        if (targetServerId == Guid.Empty)
        {
            return null;
        }

        return new AiScanAnalystTargetRecommendation(
            targetServerId,
            target.Hostname ?? "unknown-host",
            target.IpAddress ?? string.Empty,
            target.OperatingSystem ?? "Unknown",
            target.Environment ?? "Unknown",
            target.Status ?? "Unknown",
            target.ConnectivityStatus ?? "Unknown",
            target.ScannerCapabilities ?? Array.Empty<string>(),
            target.Reason ?? string.Empty);
    }

    private static AiScanAnalystRuleRecommendation? ConvertRule(LooseRuleRecommendation rule)
    {
        var ruleRevisionId = ParseGuidOrDefault(rule.RuleRevisionId);
        var ruleArtifactId = ParseGuidOrDefault(rule.RuleArtifactId);
        if (ruleRevisionId == Guid.Empty || ruleArtifactId == Guid.Empty)
        {
            return null;
        }

        return new AiScanAnalystRuleRecommendation(
            ruleRevisionId,
            ruleArtifactId,
            rule.RuleName ?? "unknown-rule",
            rule.RuleFamily ?? "unknown",
            rule.RevisionNumber,
            rule.VersionLabel ?? string.Empty,
            rule.LifecycleStatus ?? "Unknown",
            rule.ScopeType ?? "Global",
            rule.ScopeValue,
            rule.Reason ?? string.Empty);
    }

    private static Guid ParseGuidOrDefault(string? value)
    {
        return Guid.TryParse(value, out var parsed) ? parsed : Guid.Empty;
    }

    private static OptionalDependencyUnavailableException CreateUnavailableException(Exception? innerException = null)
    {
        return new OptionalDependencyUnavailableException(
            SidecarDependencyName,
            TemporaryUnavailableCondition,
            SafeUnavailableMessage,
            innerException);
    }

    private sealed record LooseRecommendationResult(
        string? Summary,
        string? PlannerMode,
        IReadOnlyList<string>? Observations,
        IReadOnlyList<string>? Reasoning,
        IReadOnlyList<string>? ValidationWarnings,
        string? RecommendedScannerCapability,
        LoosePlanProposal? Proposal);

    private sealed record LoosePlanProposal(
        string? Name,
        string? Description,
        string? ScannerCapability,
        string? RuleSelectionMode,
        string? RuleScopeType,
        string? RuleScopeValue,
        string? CadenceType,
        int? IntervalMinutes,
        int? RunAtHourUtc,
        int? RunAtMinuteUtc,
        int? WeeklyDayOfWeek,
        string? OperatorNotes,
        string? Status,
        IReadOnlyList<string> TargetServerIds,
        IReadOnlyList<string> RuleRevisionIds,
        IReadOnlyList<LooseTargetRecommendation> Targets,
        IReadOnlyList<LooseRuleRecommendation> Rules);

    private sealed record LooseTargetRecommendation(
        string? TargetServerId,
        string? Hostname,
        string? IpAddress,
        string? OperatingSystem,
        string? Environment,
        string? Status,
        string? ConnectivityStatus,
        IReadOnlyList<string>? ScannerCapabilities,
        string? Reason);

    private sealed record LooseRuleRecommendation(
        string? RuleRevisionId,
        string? RuleArtifactId,
        string? RuleName,
        string? RuleFamily,
        int RevisionNumber,
        string? VersionLabel,
        string? LifecycleStatus,
        string? ScopeType,
        string? ScopeValue,
        string? Reason);
}
