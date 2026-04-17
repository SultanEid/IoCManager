using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed record RuleValidationPipelineRequest(
    string RuleFamily,
    string OriginalContent,
    string Name,
    string Source,
    string Severity,
    string Status,
    RuleScopeType ScopeType,
    string? ScopeValue,
    string VersionLabel,
    IReadOnlyList<string> Tags,
    string? FileName = null,
    string ActorUserId = "");

public interface IRuleRevisionValidationPipeline
{
    Task<RuleValidationResultResponse> ValidateAsync(RuleValidationPipelineRequest request, CancellationToken cancellationToken);
}

public sealed class RuleRevisionValidationPipeline : IRuleRevisionValidationPipeline
{
    private const string SyntaxStage = "syntax";
    private const string MetadataStage = "metadata";
    private const string DeploymentReadinessStage = "deployment_readiness";
    private const string CapabilityHeuristic = "heuristic";
    private const string CapabilityUnavailable = "not_available";

    private static readonly IReadOnlyDictionary<string, string[]> FamilyExtensions =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["yara"] = [".yar", ".yara"],
            ["sigma"] = [".yml", ".yaml"],
            ["snort"] = [".rules", ".snort", ".conf"],
            ["suricata"] = [".rules", ".suricata", ".sur"],
        };

    private static readonly HashSet<string> SupportedStatuses =
    [
        "draft",
        "parsed",
        "validated",
        "needs review",
        "approved",
        "shadow",
        "canary",
        "promoted",
        "disabled",
        "retired",
        "rejected",
    ];

    private readonly CtiDbContext _dbContext;

    public RuleRevisionValidationPipeline(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<RuleValidationResultResponse> ValidateAsync(RuleValidationPipelineRequest request, CancellationToken cancellationToken)
    {
        RuleFamilyCatalog.TryNormalize(request.RuleFamily, out var normalizedFamily);
        var syntax = ValidateSyntax(request, normalizedFamily);
        var metadata = ValidateMetadata(request, normalizedFamily);
        var readiness = await ValidateDeploymentReadinessAsync(request, normalizedFamily, cancellationToken);

        return new RuleValidationResultResponse(
            CanPersist: syntax.Passed && metadata.Passed,
            IsDeploymentReady: readiness.Passed,
            EvaluatedAtUtc: DateTimeOffset.UtcNow,
            Stages: [syntax, metadata, readiness]);
    }

    private static RuleValidationStageResultResponse ValidateSyntax(RuleValidationPipelineRequest request, string normalizedFamily)
    {
        if (string.IsNullOrWhiteSpace(normalizedFamily))
        {
            return CreateStage(
                stage: SyntaxStage,
                capabilityDepth: CapabilityUnavailable,
                limitation: "Syntax validation is unavailable for unsupported rule families.",
                diagnostics:
                [
                    Diagnostic("syntax.family.unsupported", "error", "RuleFamily must be one of: yara, sigma, snort, suricata."),
                    Diagnostic("syntax.engine_validation.unavailable", "note", "Full engine-level syntax validation is unavailable in this phase."),
                ]);
        }

        var diagnostics = new List<RuleValidationDiagnosticResponse>();
        var trimmedBody = request.OriginalContent?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedBody))
        {
            diagnostics.Add(Diagnostic("syntax.content.required", "error", "Rule content cannot be empty."));
        }

        if (!string.IsNullOrWhiteSpace(request.FileName)
            && FamilyExtensions.TryGetValue(normalizedFamily, out var allowedExtensions))
        {
            var extension = Path.GetExtension(request.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                diagnostics.Add(
                    Diagnostic(
                        "syntax.file_extension.mismatch",
                        "error",
                        $"Declared family '{normalizedFamily}' does not match extension '{extension}'. Expected: {string.Join(", ", allowedExtensions)}."));
            }
        }

        switch (normalizedFamily)
        {
            case "yara":
                if (!trimmedBody.Contains("rule ", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.yara.rule_name.required", "error", "YARA rule must declare a rule name."));
                }

                if (!trimmedBody.Contains("condition:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.yara.condition.required", "error", "YARA rule must include a condition section."));
                }

                break;
            case "sigma":
                if (!trimmedBody.Contains("title:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.sigma.title.required", "error", "Sigma rule should include a title."));
                }

                if (!trimmedBody.Contains("detection:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.sigma.detection.required", "error", "Sigma rule must include detection logic."));
                }

                break;
            case "snort":
                if (!trimmedBody.Contains("alert ", StringComparison.OrdinalIgnoreCase)
                    && !trimmedBody.Contains("drop ", StringComparison.OrdinalIgnoreCase)
                    && !trimmedBody.Contains("reject ", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.snort.action.required", "error", "Snort rule must start with an alert/drop/reject action."));
                }

                if (!trimmedBody.Contains("sid:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.snort.sid.required", "error", "Snort rule must include sid."));
                }

                break;
            case "suricata":
                if (!trimmedBody.Contains("title:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.suricata.title.required", "error", "Suricata rule should include a title."));
                }

                if (!trimmedBody.Contains("alert ", StringComparison.OrdinalIgnoreCase)
                    && !trimmedBody.Contains("drop ", StringComparison.OrdinalIgnoreCase)
                    && !trimmedBody.Contains("reject ", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.suricata.action.required", "error", "Suricata rule must start with an alert/drop/reject action."));
                }

                if (!trimmedBody.Contains("sid:", StringComparison.OrdinalIgnoreCase))
                {
                    diagnostics.Add(Diagnostic("syntax.suricata.sid.required", "error", "Suricata rule must include sid."));
                }

                break;
        }

        diagnostics.Add(
            Diagnostic(
                "syntax.engine_validation.unavailable",
                "note",
                "Full engine-level syntax validation is unavailable in this phase; heuristic checks were applied."));

        return CreateStage(
            stage: SyntaxStage,
            capabilityDepth: CapabilityHeuristic,
            limitation: "Full engine-level syntax validation is unavailable in this phase; heuristic checks were applied.",
            diagnostics: diagnostics);
    }

    private static RuleValidationStageResultResponse ValidateMetadata(RuleValidationPipelineRequest request, string normalizedFamily)
    {
        var diagnostics = new List<RuleValidationDiagnosticResponse>();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            diagnostics.Add(Diagnostic("metadata.name.required", "error", "Rule name/title is required."));
        }

        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            diagnostics.Add(Diagnostic("metadata.actor.required", "error", "ActorUserId is required."));
        }

        if (string.IsNullOrWhiteSpace(normalizedFamily))
        {
            diagnostics.Add(Diagnostic("metadata.family.invalid", "error", "RuleFamily must be one of: yara, sigma, snort, suricata."));
        }

        if (string.IsNullOrWhiteSpace(request.Source))
        {
            diagnostics.Add(Diagnostic("metadata.source.required", "error", "Source is required."));
        }

        if (string.IsNullOrWhiteSpace(request.Severity))
        {
            diagnostics.Add(Diagnostic("metadata.severity.required", "error", "Severity is required."));
        }

        var normalizedStatus = NormalizeOptional(request.Status);
        if (string.IsNullOrWhiteSpace(normalizedStatus) || !SupportedStatuses.Contains(normalizedStatus))
        {
            diagnostics.Add(Diagnostic("metadata.status.invalid", "error", "Status is invalid for repository lifecycle."));
        }

        if (request.ScopeType != RuleScopeType.Global && string.IsNullOrWhiteSpace(request.ScopeValue))
        {
            diagnostics.Add(Diagnostic("metadata.scope_value.required", "error", "ScopeValue is required when ScopeType is not global."));
        }

        if (string.IsNullOrWhiteSpace(request.VersionLabel))
        {
            diagnostics.Add(Diagnostic("metadata.version.required", "error", "Version label is required."));
        }

        if (request.Tags is null || request.Tags.Count == 0)
        {
            diagnostics.Add(Diagnostic("metadata.tags.empty", "warning", "No tags were provided or parsed for this revision."));
        }

        return CreateStage(
            stage: MetadataStage,
            capabilityDepth: CapabilityHeuristic,
            limitation: null,
            diagnostics: diagnostics);
    }

    private async Task<RuleValidationStageResultResponse> ValidateDeploymentReadinessAsync(
        RuleValidationPipelineRequest request,
        string normalizedFamily,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(normalizedFamily))
        {
            return CreateStage(
                stage: DeploymentReadinessStage,
                capabilityDepth: CapabilityUnavailable,
                limitation: "Deployment readiness cannot be evaluated for unsupported rule families.",
                diagnostics:
                [
                    Diagnostic("readiness.family.unsupported", "error", "Deployment readiness requires a supported rule family."),
                ]);
        }

        var diagnostics = new List<RuleValidationDiagnosticResponse>();
        var capability = normalizedFamily switch
        {
            "yara" => ScannerCapability.Yara,
            "sigma" => ScannerCapability.Sigma,
            "snort" => ScannerCapability.Snort,
            "suricata" => ScannerCapability.Suricata,
            _ => (ScannerCapability?)null,
        };

        if (!capability.HasValue)
        {
            return CreateStage(
                stage: DeploymentReadinessStage,
                capabilityDepth: CapabilityUnavailable,
                limitation: "Deployment readiness cannot map rule family to scanner capabilities.",
                diagnostics:
                [
                    Diagnostic("readiness.capability.mapping.unavailable", "error", "Deployment readiness cannot map this rule family to scanner capability."),
                ]);
        }

        var scannerIds = await _dbContext.ScannerCapabilityBindings
            .AsNoTracking()
            .Where(x => x.Capability == capability.Value)
            .Select(x => x.ScannerId)
            .Distinct()
            .ToArrayAsync(cancellationToken);

        if (scannerIds.Length == 0)
        {
            diagnostics.Add(
                Diagnostic(
                    "readiness.capability.missing",
                    "warning",
                    $"No scanner with '{capability.Value}' capability is registered. This revision is not production-ready."));
        }
        else
        {
            var healthyScannerIds = await _dbContext.Scanners
                .AsNoTracking()
                .Where(x => scannerIds.Contains(x.Id) && x.HealthStatus == ScannerHealthStatus.Healthy)
                .Select(x => x.Id)
                .Distinct()
                .ToArrayAsync(cancellationToken);

            if (healthyScannerIds.Length == 0)
            {
                diagnostics.Add(
                    Diagnostic(
                        "readiness.scanner.none_healthy",
                        "warning",
                        $"Registered '{capability.Value}' scanners are not healthy. This revision is not production-ready."));
            }

            var enabledAssignmentCount = await _dbContext.TargetServerScannerAssignments
                .AsNoTracking()
                .Where(x => scannerIds.Contains(x.ScannerId) && x.IsEnabled && x.ConnectivityStatus != ConnectivityStatus.Offline)
                .CountAsync(cancellationToken);

            if (enabledAssignmentCount == 0)
            {
                diagnostics.Add(
                    Diagnostic(
                        "readiness.assignment.none_enabled",
                        "warning",
                        $"No enabled non-offline server assignment was found for '{capability.Value}' scanners. This revision is not production-ready."));
            }
        }

        if (diagnostics.Count == 0)
        {
            diagnostics.Add(
                Diagnostic(
                    "readiness.ready",
                    "note",
                    "Deployment-readiness checks passed for current scanner capability and assignment signals."));
        }
        else
        {
            diagnostics.Add(
                Diagnostic(
                    "readiness.production_not_ready",
                    "note",
                    "This revision is not production-ready based on current deployment-readiness checks."));
        }

        return CreateStage(
            stage: DeploymentReadinessStage,
            capabilityDepth: CapabilityHeuristic,
            limitation: "Deployment-readiness checks are signal-based and do not run full engine execution simulations.",
            diagnostics: diagnostics);
    }

    private static RuleValidationStageResultResponse CreateStage(
        string stage,
        string capabilityDepth,
        string? limitation,
        IReadOnlyList<RuleValidationDiagnosticResponse> diagnostics)
    {
        return new RuleValidationStageResultResponse(
            Stage: stage,
            Passed: !diagnostics.Any(x => string.Equals(x.Severity, "error", StringComparison.OrdinalIgnoreCase))
                && (stage != DeploymentReadinessStage || !diagnostics.Any(x => string.Equals(x.Severity, "warning", StringComparison.OrdinalIgnoreCase))),
            CapabilityDepth: capabilityDepth,
            Limitation: limitation,
            Diagnostics: diagnostics);
    }

    private static RuleValidationDiagnosticResponse Diagnostic(
        string code,
        string severity,
        string message,
        int? line = null,
        int? column = null)
    {
        return new RuleValidationDiagnosticResponse(code, NormalizeSeverity(severity), message, line, column);
    }

    private static string NormalizeSeverity(string severity)
    {
        var normalized = severity.Trim().ToLowerInvariant();
        return normalized switch
        {
            "error" => "error",
            "warning" => "warning",
            _ => "note",
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
    }
}

public static class RuleValidationResultExtensions
{
    public static IReadOnlyList<RuleValidationDiagnosticResponse> FlattenDiagnostics(this RuleValidationResultResponse result)
    {
        return result.Stages.SelectMany(x => x.Diagnostics).ToArray();
    }

    public static bool HasBlockingPersistenceErrors(this RuleValidationResultResponse result)
    {
        var persistedStages = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "syntax",
            "metadata",
        };

        return result.Stages
            .Where(x => persistedStages.Contains(x.Stage))
            .SelectMany(x => x.Diagnostics)
            .Any(x => string.Equals(x.Severity, "error", StringComparison.OrdinalIgnoreCase));
    }
}
