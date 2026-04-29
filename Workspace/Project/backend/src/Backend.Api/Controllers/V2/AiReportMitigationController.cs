using System.Text.Json;
using Backend.Api.Features.ReportMitigationPoc;
using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Contracts.V2;
using Backend.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
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

    private readonly CtiDbContext _dbContext;
    private readonly AegisMitigationPlanner _planner;
    private readonly IAuthSensitiveAuditService _auditService;

    public AiReportMitigationController(
        CtiDbContext dbContext,
        AegisMitigationPlanner planner,
        IAuthSensitiveAuditService auditService)
    {
        _dbContext = dbContext;
        _planner = planner;
        _auditService = auditService;
    }

    [HttpGet("plans")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ReportMitigationListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportMitigationListResponse>> ListPlans(CancellationToken cancellationToken)
    {
        try
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
        catch (SqlException exception) when (exception.Number == 208)
        {
            return Ok(new ReportMitigationListResponse(Array.Empty<ReportMitigationListItemResponse>(), 0));
        }
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
        return await GenerateFromSourceAsync(
            new AegisMitigationGenerationRequest(
                request.SourceName,
                request.SourceType,
                request.DocumentId,
                request.DocumentUrl,
                request.DocumentText,
                request.DocumentBytesBase64,
                request.BulletinJson,
                request.ExistingReportId,
                AlertId: null,
                ScanJobId: null,
                request.IncludeWorkspaceContext,
                request.ActorUserId,
                request.Regenerate),
            "aegis.mitigation.generate",
            cancellationToken);
    }

    [HttpPost("alerts/{alertId:guid}/generate")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ReportMitigationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ReportMitigationResponse>> GenerateFromAlert(
        Guid alertId,
        [FromBody] ReportMitigationGenerateFromAlertRequest request,
        CancellationToken cancellationToken)
    {
        return await GenerateFromSourceAsync(
            new AegisMitigationGenerationRequest(
                SourceName: "Aegis alert review",
                SourceType: "bulletin",
                DocumentId: null,
                DocumentUrl: null,
                DocumentText: null,
                DocumentBytesBase64: null,
                BulletinJson: null,
                ExistingReportId: null,
                AlertId: alertId,
                ScanJobId: null,
                request.IncludeWorkspaceContext,
                request.ActorUserId,
                request.Regenerate),
            "aegis.mitigation.generate_from_alert",
            cancellationToken);
    }

    [HttpPost("scan-jobs/{scanJobId:guid}/generate")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ReportMitigationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ReportMitigationResponse>> GenerateFromScanJob(
        Guid scanJobId,
        [FromBody] ReportMitigationGenerateFromScanJobRequest request,
        CancellationToken cancellationToken)
    {
        return await GenerateFromSourceAsync(
            new AegisMitigationGenerationRequest(
                SourceName: "Aegis scan review",
                SourceType: "bulletin",
                DocumentId: null,
                DocumentUrl: null,
                DocumentText: null,
                DocumentBytesBase64: null,
                BulletinJson: null,
                ExistingReportId: null,
                AlertId: null,
                ScanJobId: scanJobId,
                request.IncludeWorkspaceContext,
                request.ActorUserId,
                request.Regenerate),
            "aegis.mitigation.generate_from_scan",
            cancellationToken);
    }

    private async Task<ActionResult<ReportMitigationResponse>> GenerateFromSourceAsync(
        AegisMitigationGenerationRequest request,
        string auditAction,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            return BadRequest("ActorUserId is required.");
        }

        AegisMitigationGenerationOutcome outcome;
        try
        {
            outcome = await _planner.GenerateAsync(request, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (OptionalDependencyUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }

        await _auditService.TryWriteAsync(
            User,
            outcome.ReusedExistingPlan ? $"{auditAction}.reuse" : auditAction,
            "report",
            outcome.PersistedReport.Id.ToString("N"),
            new
            {
                request.ExistingReportId,
                request.AlertId,
                request.ScanJobId,
                SourceScanJobIds = outcome.ScanJobIds,
                outcome.Result.MitigationPlan.Severity,
                outcome.Result.MitigationPlan.Confidence,
                AlertCount = outcome.AlertIds.Count,
                outcome.ReusedExistingPlan,
            },
            cancellationToken);

        return Ok(ToResponse(
            outcome.Result,
            outcome.SourceReportId,
            outcome.PersistedReport.ToReportResponse(outcome.AlertIds)));
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

    private static ReportMitigationListItemResponse ToPlanListItem(Backend.Domain.IocManager.Report report, IReadOnlyList<Guid> alertIds)
    {
        var sourceReportId = ReadGuidFromSummary(report.SummaryJson, "sourceReportId");
        var sourceScanJobIds = ReadGuidArrayFromSummary(report.SummaryJson, "sourceScanJobIds");
        var severity = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "severity") ?? "unknown";
        var confidence = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "confidence") ?? "unknown";
        var summary = ReadNestedString(report.SummaryJson, "result", "mitigationPlan", "executiveSummary") ?? report.Title;
        return new ReportMitigationListItemResponse(report.Id, report.Title, sourceReportId, sourceScanJobIds, severity, confidence, summary, report.GeneratedAtUtc, alertIds);
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

    private static IReadOnlyList<Guid> ReadGuidArrayFromSummary(string summaryJson, string propertyName)
    {
        try
        {
            using var document = JsonDocument.Parse(summaryJson);
            if (!document.RootElement.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Array)
            {
                return Array.Empty<Guid>();
            }

            return value.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.String)
                .Select(item => Guid.TryParse(item.GetString(), out var parsed) ? parsed : Guid.Empty)
                .Where(item => item != Guid.Empty)
                .ToArray();
        }
        catch (JsonException)
        {
            return Array.Empty<Guid>();
        }
    }
}
