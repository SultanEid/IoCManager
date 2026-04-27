using System.Text.Json;
using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/ai/report-mitigation")]
public sealed class AiReportMitigationController : ControllerBase
{
    private const string SummaryMarker = "aegisMitigationPlanVersion";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly CtiDbContext _dbContext;
    private readonly IAiReportMitigationClient _aiReportMitigationClient;
    private readonly IAuthSensitiveAuditService _auditService;

    public AiReportMitigationController(
        CtiDbContext dbContext,
        IAiReportMitigationClient aiReportMitigationClient,
        IAuthSensitiveAuditService auditService)
    {
        _dbContext = dbContext;
        _aiReportMitigationClient = aiReportMitigationClient;
        _auditService = auditService;
    }

    [HttpGet("plans")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ReportMitigationListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportMitigationListResponse>> ListPlans(CancellationToken cancellationToken)
    {
        var reports = await _dbContext.ReportsV2
            .AsNoTracking()
            .Where(x => x.SummaryJson.Contains(SummaryMarker))
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Take(50)
            .ToArrayAsync(cancellationToken);

        var reportIds = reports.Select(x => x.Id).ToArray();
        var alertLinks = await _dbContext.ReportAlerts
            .AsNoTracking()
            .Where(x => reportIds.Contains(x.ReportId))
            .ToArrayAsync(cancellationToken);
        var alertLookup = alertLinks
            .GroupBy(x => x.ReportId)
            .ToDictionary(x => x.Key, x => (IReadOnlyList<Guid>)x.Select(link => link.AlertId).ToArray());

        var items = reports.Select(report => ToPlanListItem(report, alertLookup.GetValueOrDefault(report.Id, Array.Empty<Guid>()))).ToArray();
        return Ok(new ReportMitigationListResponse(items, items.Length));
    }

    [HttpGet("reports/{reportId:guid}/plan")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ReportMitigationListItemResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReportMitigationListItemResponse>> GetPlanForReport(Guid reportId, CancellationToken cancellationToken)
    {
        var sourceReportIdText = reportId.ToString("D");
        var report = await _dbContext.ReportsV2
            .AsNoTracking()
            .Where(x => x.SummaryJson.Contains(SummaryMarker) && x.SummaryJson.Contains(sourceReportIdText))
            .OrderByDescending(x => x.GeneratedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (report is null)
        {
            return NotFound();
        }

        var alertIds = await _dbContext.ReportAlerts
            .AsNoTracking()
            .Where(x => x.ReportId == report.Id)
            .Select(x => x.AlertId)
            .ToArrayAsync(cancellationToken);

        return Ok(ToPlanListItem(report, alertIds));
    }

    [HttpPost("generate")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ReportMitigationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ReportMitigationResponse>> Generate(
        [FromBody] ReportMitigationGenerateRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            return BadRequest("ActorUserId is required.");
        }

        var sourceType = NormalizeSourceType(request.SourceType);
        if (sourceType is null)
        {
            return BadRequest("SourceType must be one of: pdf, blog, bulletin.");
        }

        var sourceName = string.IsNullOrWhiteSpace(request.SourceName) ? "Aegis report review" : request.SourceName.Trim();
        var documentId = string.IsNullOrWhiteSpace(request.DocumentId) ? $"aegis-{Guid.NewGuid():N}" : request.DocumentId.Trim();
        var documentText = request.DocumentText;
        var alertIds = Array.Empty<Guid>();
        Report? sourceReport = null;

        if (request.ExistingReportId.HasValue)
        {
            sourceReport = await _dbContext.ReportsV2
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.ExistingReportId.Value, cancellationToken);
            if (sourceReport is null)
            {
                return NotFound();
            }

            sourceName = sourceReport.Title;
            documentId = sourceReport.Id.ToString("D");
            documentText = BuildExistingReportText(sourceReport);
            alertIds = await _dbContext.ReportAlerts
                .AsNoTracking()
                .Where(x => x.ReportId == sourceReport.Id)
                .Select(x => x.AlertId)
                .ToArrayAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(documentText)
            && string.IsNullOrWhiteSpace(request.DocumentBytesBase64)
            && string.IsNullOrWhiteSpace(request.BulletinJson))
        {
            return BadRequest("Provide report text, PDF bytes, bulletin JSON, or an ExistingReportId.");
        }

        var environmentContext = request.IncludeWorkspaceContext
            ? await BuildEnvironmentContextAsync(cancellationToken)
            : new Dictionary<string, object?>();
        var assetContext = request.IncludeWorkspaceContext
            ? await BuildAssetContextAsync(cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var alertContext = request.IncludeWorkspaceContext
            ? await BuildAlertContextAsync(alertIds, cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var ruleContext = request.IncludeWorkspaceContext
            ? await BuildRuleContextAsync(cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var priorOutcomeContext = await BuildPriorOutcomeContextAsync(cancellationToken);

        AiReportMitigationResult aiResult;
        try
        {
            aiResult = await _aiReportMitigationClient.GenerateAsync(
                new AiReportMitigationRequest(
                    sourceName,
                    sourceType,
                    documentId,
                    request.DocumentUrl,
                    documentText,
                    request.DocumentBytesBase64,
                    request.BulletinJson,
                    EnableLlmFallback: true,
                    IngestionTime: DateTimeOffset.UtcNow,
                    EnvironmentContext: environmentContext,
                    AssetContext: assetContext,
                    AlertContext: alertContext,
                    RuleContext: ruleContext,
                    PriorOutcomeContext: priorOutcomeContext),
                cancellationToken);
        }
        catch (OptionalDependencyUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }

        var persisted = await PersistMitigationReportAsync(
            aiResult,
            sourceName,
            request.ExistingReportId,
            alertIds,
            request.ActorUserId,
            cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "aegis.mitigation.generate",
            "report",
            persisted.Id.ToString("N"),
            new
            {
                SourceReportId = request.ExistingReportId,
                aiResult.MitigationPlan.Severity,
                aiResult.MitigationPlan.Confidence,
                AlertCount = alertIds.Length,
            },
            cancellationToken);

        return Ok(ToResponse(aiResult, request.ExistingReportId, persisted.ToReportResponse(alertIds)));
    }

    private async Task<Report> PersistMitigationReportAsync(
        AiReportMitigationResult result,
        string sourceName,
        Guid? sourceReportId,
        IReadOnlyList<Guid> alertIds,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        var generatedAtUtc = DateTimeOffset.UtcNow;
        var title = $"Aegis mitigation: {sourceName}";
        if (title.Length > 190)
        {
            title = string.Concat(title.AsSpan(0, 187), "...");
        }

        var summaryJson = JsonSerializer.Serialize(new
        {
            aegisMitigationPlanVersion = 1,
            sourceReportId,
            result,
        }, JsonOptions);

        var report = Report.Create(
            title,
            ReportType.Operational,
            summaryJson,
            actorUserId,
            generatedAtUtc,
            generatedAtUtc);

        _dbContext.ReportsV2.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var alertId in alertIds.Distinct())
        {
            _dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alertId, generatedAtUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return report;
    }

    private async Task<IReadOnlyDictionary<string, object?>> BuildEnvironmentContextAsync(CancellationToken cancellationToken)
    {
        var targetCount = await _dbContext.TargetServers.AsNoTracking().CountAsync(cancellationToken);
        var openAlertCount = await _dbContext.AlertsV2.AsNoTracking().CountAsync(x => x.Status == AlertStatus.Open, cancellationToken);
        var recentScanCount = await _dbContext.ScanJobs.AsNoTracking().CountAsync(x => x.QueuedAtUtc >= DateTimeOffset.UtcNow.AddDays(-7), cancellationToken);

        return new Dictionary<string, object?>
        {
            ["generatedAtUtc"] = DateTimeOffset.UtcNow,
            ["targetCount"] = targetCount,
            ["openAlertCount"] = openAlertCount,
            ["recentScanCount7d"] = recentScanCount,
            ["agent"] = "Aegis",
            ["authority"] = "read_only_recommendations",
        };
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildAssetContextAsync(CancellationToken cancellationToken)
    {
        var targets = await _dbContext.TargetServers
            .AsNoTracking()
            .OrderByDescending(x => x.LastContactUtc ?? x.UpdatedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return targets
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["targetServerId"] = x.Id,
                ["hostname"] = x.Hostname,
                ["ipAddress"] = x.IpAddress,
                ["operatingSystem"] = x.OperatingSystem,
                ["environment"] = x.Environment,
                ["status"] = x.Status.ToString(),
                ["connectivityStatus"] = x.ConnectivityStatus.ToString(),
                ["lastContactUtc"] = x.LastContactUtc,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildAlertContextAsync(
        IReadOnlyList<Guid> preferredAlertIds,
        CancellationToken cancellationToken)
    {
        var alerts = _dbContext.AlertsV2.AsNoTracking().AsQueryable();
        if (preferredAlertIds.Count > 0)
        {
            alerts = alerts.Where(x => preferredAlertIds.Contains(x.Id));
        }

        var items = await alerts
            .OrderByDescending(x => x.Severity)
            .ThenByDescending(x => x.LastDetectedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return items
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["alertId"] = x.Id,
                ["title"] = x.Title,
                ["summary"] = x.Summary,
                ["severity"] = x.Severity.ToString(),
                ["status"] = x.Status.ToString(),
                ["scannerFamily"] = x.ScannerFamily,
                ["targetDisplay"] = x.TargetDisplay,
                ["ruleName"] = x.RuleName,
                ["lastDetectedAtUtc"] = x.LastDetectedAtUtc,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildRuleContextAsync(CancellationToken cancellationToken)
    {
        var rules = await _dbContext.RuleArtifacts
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return rules
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["ruleArtifactId"] = x.Id,
                ["name"] = x.Name,
                ["ruleFamily"] = x.RuleFamily.ToString(),
                ["severity"] = x.Severity.ToString(),
                ["status"] = x.LifecycleStatus.ToString(),
                ["scopeType"] = x.ScopeType.ToString(),
                ["scopeValue"] = x.ScopeValue,
                ["description"] = x.Description,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildPriorOutcomeContextAsync(CancellationToken cancellationToken)
    {
        var priorPlans = await _dbContext.ReportsV2
            .AsNoTracking()
            .Where(x => x.SummaryJson.Contains(SummaryMarker))
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Take(10)
            .Select(x => new { x.Id, x.Title, x.GeneratedAtUtc })
            .ToArrayAsync(cancellationToken);

        return priorPlans
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["mitigationReportId"] = x.Id,
                ["title"] = x.Title,
                ["generatedAtUtc"] = x.GeneratedAtUtc,
            })
            .ToArray();
    }

    private static string BuildExistingReportText(Report report)
    {
        return string.Join(
            Environment.NewLine,
            [
                $"Title: {report.Title}",
                $"Report type: {report.ReportType}",
                $"Generated at UTC: {report.GeneratedAtUtc:O}",
                "Summary JSON:",
                report.SummaryJson,
            ]);
    }

    private static string? NormalizeSourceType(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "bulletin" : value.Trim().ToLowerInvariant();
        return normalized is "pdf" or "blog" or "bulletin" ? normalized : null;
    }

    private static ReportMitigationResponse ToResponse(
        AiReportMitigationResult result,
        Guid? sourceReportId,
        ReportResponse persistedReport)
        => new(
            result.ReportId,
            result.SourceType,
            result.PlannerModel,
            result.ExtractedIocs.Select(ToResponse).ToArray(),
            result.Claims.Select(ToResponse).ToArray(),
            result.CampaignHints,
            result.MalwareFamilyHints,
            ToResponse(result.MitigationPlan),
            result.GeneratedAt,
            sourceReportId,
            persistedReport);

    private static ReportMitigationExtractedIocResponse ToResponse(AiReportMitigationExtractedIoc source)
        => new(
            source.IocType,
            source.IocValue,
            source.Label,
            source.Confidence,
            source.AttackTechniques,
            source.CveRefs,
            source.Citations.Select(ToResponse).ToArray());

    private static ReportMitigationClaimResponse ToResponse(AiReportMitigationClaim source)
        => new(
            source.ClaimId,
            source.ClaimType,
            source.Statement,
            source.Snippet,
            source.SourceStartOffset,
            source.SourceEndOffset,
            source.PageIndex,
            source.ExtractionMethod,
            source.Confidence,
            source.IsPromptInjectionSuspected,
            source.AbstainReasonCodes,
            source.Citations.Select(ToResponse).ToArray());

    private static ReportMitigationCitationResponse ToResponse(AiReportMitigationCitation source)
        => new(source.SourceId, source.SourceType, source.Snippet, source.SourceUri, source.StartOffset, source.EndOffset, source.Confidence);

    private static ReportMitigationPlanResponse ToResponse(AiReportMitigationPlan source)
        => new(
            source.ExecutiveSummary,
            source.ThreatSummary,
            source.Severity,
            source.Confidence,
            source.AffectedAssetHypotheses,
            source.ImmediateActions.Select(ToResponse).ToArray(),
            source.DetectionActions.Select(ToResponse).ToArray(),
            source.HardeningActions.Select(ToResponse).ToArray(),
            source.ValidationSteps,
            source.ScanRecommendations.Select(ToResponse).ToArray(),
            source.Assumptions,
            source.Gaps,
            source.RequiresHumanReview);

    private static ReportMitigationActionResponse ToResponse(AiReportMitigationAction source)
        => new(source.Title, source.Rationale, source.Priority, source.OwnerHint, source.Validation, source.AutomationReadiness);

    private static ReportMitigationScanRecommendationResponse ToResponse(AiReportMitigationScanRecommendation source)
        => new(source.ScannerFamily, source.TargetHint, source.RuleHint, source.Rationale, source.Priority);

    private static ReportMitigationListItemResponse ToPlanListItem(Report report, IReadOnlyList<Guid> alertIds)
    {
        var sourceReportId = ReadGuidFromSummary(report.SummaryJson, "sourceReportId");
        var severity = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "severity") ?? "unknown";
        var confidence = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "confidence") ?? "unknown";
        var summary = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "executiveSummary") ?? report.Title;
        return new ReportMitigationListItemResponse(report.Id, report.Title, sourceReportId, severity, confidence, summary, report.GeneratedAtUtc, alertIds);
    }

    private static Guid? ReadGuidFromSummary(string summaryJson, string propertyName)
    {
        try
        {
            using var document = JsonDocument.Parse(summaryJson);
            if (!document.RootElement.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            return Guid.TryParse(value.GetString(), out var parsed) ? parsed : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ReadNestedString(string summaryJson, params string[] path)
    {
        try
        {
            using var document = JsonDocument.Parse(summaryJson);
            var current = document.RootElement;
            foreach (var part in path)
            {
                if (!current.TryGetProperty(part, out current))
                {
                    return null;
                }
            }

            return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
