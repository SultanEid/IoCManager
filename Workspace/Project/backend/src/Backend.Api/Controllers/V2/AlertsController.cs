using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/alerts")]
public sealed class AlertsController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly LegacyScanPipelineDbContext _legacyDbContext;

    public AlertsController(CtiDbContext dbContext, LegacyScanPipelineDbContext legacyDbContext)
    {
        _dbContext = dbContext;
        _legacyDbContext = legacyDbContext;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlertListResponse>> List([FromQuery] AlertSearchQuery query, CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(query.FromUtc, nameof(query.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(query.ToUtc, nameof(query.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(query.FromUtc), nameof(query.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize);
        var alerts = _dbContext.AlertsV2.AsNoTracking().AsQueryable();

        var q = V2SearchHelpers.NormalizeNullable(query.Q);
        if (q is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(q);
            alerts = alerts.Where(x =>
                EF.Functions.Like(x.Title, pattern)
                || EF.Functions.Like(x.Summary, pattern)
                || EF.Functions.Like(x.OwnerUserId, pattern)
                || EF.Functions.Like(x.TargetDisplay, pattern)
                || EF.Functions.Like(x.RuleName, pattern));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = V2Mappings.ParseAlertStatusFromCaseStatus(query.Status);
            alerts = alerts.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Severity))
        {
            var severity = V2Mappings.ParseSeverityOrPriority(query.Severity);
            alerts = alerts.Where(x => x.Severity == severity);
        }

        var ownerUserId = V2SearchHelpers.NormalizeNullable(query.OwnerUserId);
        if (ownerUserId is not null)
        {
            var ownerPattern = V2SearchHelpers.ToContainsPattern(ownerUserId);
            alerts = alerts.Where(x => EF.Functions.Like(x.OwnerUserId, ownerPattern));
        }

        if (fromUtc.HasValue)
        {
            alerts = alerts.Where(x => x.LastDetectedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            alerts = alerts.Where(x => x.LastDetectedAtUtc <= toUtc.Value);
        }

        var normalizedFamily = V2SearchHelpers.NormalizeNullable(query.Family);
        if (normalizedFamily is not null)
        {
            if (!RuleFamilyCatalog.TryNormalize(normalizedFamily, out var parsedFamily))
            {
                return BadRequest($"Invalid family '{query.Family}'.");
            }

            alerts = alerts.Where(x => x.ScannerFamily == parsedFamily);
        }

        var normalizedTargetId = V2SearchHelpers.NormalizeNullable(query.TargetId);
        if (normalizedTargetId is not null)
        {
            if (!int.TryParse(normalizedTargetId, out var parsedTargetId))
            {
                return BadRequest($"Invalid target id '{query.TargetId}'.");
            }

            alerts = alerts.Where(x => x.TargetId == parsedTargetId);
        }

        var totalCount = await alerts.CountAsync(cancellationToken);
        var items = await alerts
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .Select(x => new
            {
                Alert = x,
                LinkedIocCount = _dbContext.AlertIocs.Count(link => link.AlertId == x.Id),
            })
            .ToArrayAsync(cancellationToken);

        return Ok(new AlertListResponse(
            items.Select(item => item.Alert.ToAlertResponse(item.LinkedIocCount)).ToArray(),
            totalCount,
            page,
            pageSize));
    }

    [HttpGet("{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> GetById(Guid alertId, CancellationToken cancellationToken)
    {
        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AlertResponse>> Create([FromBody] CreateAlertRequest request, CancellationToken cancellationToken)
    {
        var severity = V2Mappings.ParseSeverityOrPriority(request.Severity);
        var nowUtc = DateTimeOffset.UtcNow;

        var existing = await _dbContext.AlertsV2.FirstOrDefaultAsync(
            x => x.Title == request.Title.Trim()
                && x.OwnerUserId == request.OwnerUserId.Trim()
                && x.Severity == severity
                && (x.Status == AlertStatus.Open || x.Status == AlertStatus.Investigating),
            cancellationToken);

        if (existing is not null)
        {
            existing.RefreshDetection(request.Title, request.Summary, severity, request.DetectedAtUtc, request.ActorUserId, nowUtc);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(existing.ToAlertResponse());
        }

        var entity = Alert.Create(
            request.Title,
            request.Summary,
            severity,
            request.OwnerUserId,
            request.ApprovalTierRequired,
            "manual",
            null,
            "Unscoped",
            request.Title,
            request.DetectedAtUtc,
            request.ActorUserId,
            nowUtc);

        _dbContext.AlertsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { alertId = entity.Id }, entity.ToAlertResponse());
    }

    [HttpPatch("{alertId:guid}/status")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> UpdateStatus(
        Guid alertId,
        [FromBody] UpdateAlertStatusRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseAlertStatusFromCaseStatus(request.Status);
        entity.SetStatus(status, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPost("{alertId:guid}/scan-results")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult LinkScanResult(
        Guid alertId,
        [FromBody] LinkAlertScanResultRequest request,
        CancellationToken cancellationToken)
    {
        _ = alertId;
        _ = request;
        _ = cancellationToken;

        return Problem(
            title: "Manual scan-result linking is unavailable",
            detail: "Legacy IOC-driven alerts derive related scan runs from linked IOC evidence and do not support direct V2 scan-result links on this surface yet.",
            statusCode: StatusCodes.Status501NotImplemented);
    }

    private async Task<AlertDetailResponse?> BuildAlertDetailAsync(Guid alertId, CancellationToken cancellationToken)
    {
        var alertRow = await _dbContext.AlertsV2
            .AsNoTracking()
            .Where(x => x.Id == alertId)
            .Select(x => new
            {
                Alert = x,
                LinkedIocCount = _dbContext.AlertIocs.Count(link => link.AlertId == x.Id),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (alertRow is null)
        {
            return null;
        }

        var linkedIocIds = await _dbContext.AlertIocs
            .AsNoTracking()
            .Where(x => x.AlertId == alertId)
            .OrderByDescending(x => x.LinkedAtUtc)
            .Select(x => x.IocId)
            .ToArrayAsync(cancellationToken);

        var linkedIocs = linkedIocIds.Length == 0
            ? []
            : await _legacyDbContext.Iocs
                .AsNoTracking()
                .Where(x => linkedIocIds.Contains(x.Id))
                .Include(x => x.YaraDetail)
                .Include(x => x.SigmaDetail)
                .Include(x => x.NetworkDetail)
                .OrderByDescending(x => x.TimestampUtc)
                .ToArrayAsync(cancellationToken);

        var linkedResultIds = linkedIocs
            .Where(x => x.ResultId.HasValue)
            .Select(x => x.ResultId!.Value)
            .Distinct()
            .ToArray();

        var linkedResults = linkedResultIds.Length == 0
            ? []
            : await _legacyDbContext.ScanResults
                .AsNoTracking()
                .Where(x => linkedResultIds.Contains(x.ResultId))
                .OrderByDescending(x => x.FinishedAt ?? x.StartedAt)
                .ToArrayAsync(cancellationToken);

        var target = alertRow.Alert.TargetId.HasValue
            ? await _legacyDbContext.Targets.AsNoTracking().FirstOrDefaultAsync(x => x.TargetId == alertRow.Alert.TargetId.Value, cancellationToken)
            : null;

        var detail = new AlertDetailResponse(
            alertRow.Alert.Id,
            alertRow.Alert.Title,
            alertRow.Alert.Summary,
            alertRow.Alert.Severity.ToString(),
            alertRow.Alert.Status.ToString(),
            alertRow.Alert.OwnerUserId,
            alertRow.Alert.ApprovalTierRequired,
            alertRow.Alert.ScannerFamily,
            alertRow.Alert.TargetId?.ToString(),
            alertRow.Alert.TargetDisplay,
            alertRow.Alert.RuleName,
            alertRow.LinkedIocCount,
            alertRow.Alert.FirstDetectedAtUtc,
            alertRow.Alert.LastDetectedAtUtc,
            alertRow.Alert.CreatedAtUtc,
            alertRow.Alert.UpdatedAtUtc,
            target is null
                ? null
                : new AlertTargetSummaryResponse(
                    target.TargetId.ToString(),
                    string.IsNullOrWhiteSpace(target.DisplayName)
                        ? string.IsNullOrWhiteSpace(target.HostName)
                            ? target.IPAddress
                            : $"{target.HostName} - {target.IPAddress}"
                        : $"{target.DisplayName} - {target.IPAddress}",
                    target.HostName,
                    target.IPAddress,
                    target.Status,
                    target.TargetOsType),
            linkedIocs.Select(ToLinkedIocResponse).ToArray(),
            linkedResults.Select(ToLinkedScanResultResponse).ToArray());

        return detail;
    }

    private static AlertLinkedIocResponse ToLinkedIocResponse(LegacyPipelineIocEntity source)
    {
        var severity = NormalizeAlertSeverity(
            source.ScannerType,
            source.SigmaDetail?.Severity,
            source.NetworkDetail?.Severity);

        var indicator = ResolveIndicator(source);
        return new AlertLinkedIocResponse(
            source.Id.ToString(),
            NormalizeFamily(source.ScannerType),
            source.RuleName,
            indicator.Value,
            indicator.Kind,
            severity,
            DateTime.SpecifyKind(source.TimestampUtc, DateTimeKind.Utc),
            source.RawPayload,
            source.YaraDetail is null ? null : new AlertLinkedIocYaraDetailResponse(source.YaraDetail.FilePath, source.YaraDetail.FileHash),
            source.SigmaDetail is null ? null : new AlertLinkedIocSigmaDetailResponse(source.SigmaDetail.LogSource, NormalizeFreeformSeverity(source.SigmaDetail.Severity), source.SigmaDetail.CommandLine),
            source.NetworkDetail is null ? null : new AlertLinkedIocNetworkDetailResponse(source.NetworkDetail.SourceIP, source.NetworkDetail.DestIP, source.NetworkDetail.Protocol, NormalizeFreeformSeverity(source.NetworkDetail.Severity), source.NetworkDetail.FlowId));
    }

    private static AlertLinkedScanResultResponse ToLinkedScanResultResponse(LegacyPipelineScanResultEntity source)
    {
        return new AlertLinkedScanResultResponse(
            source.ResultId.ToString(),
            source.JobId?.ToString(),
            source.Status ?? "Unknown",
            source.NoOfFindings ?? 0,
            source.StartedAt is null ? null : DateTime.SpecifyKind(source.StartedAt.Value, DateTimeKind.Utc),
            source.FinishedAt is null ? null : DateTime.SpecifyKind(source.FinishedAt.Value, DateTimeKind.Utc));
    }

    private static (string Value, string Kind) ResolveIndicator(LegacyPipelineIocEntity source)
    {
        var family = NormalizeFamily(source.ScannerType);
        if (family == "yara")
        {
            return (source.YaraDetail?.FilePath ?? source.RawPayload ?? source.RuleName, "file");
        }

        if (family == "sigma")
        {
            return (source.SigmaDetail?.CommandLine ?? source.RuleName ?? source.RawPayload ?? string.Empty, "event");
        }

        var networkIndicator = string.IsNullOrWhiteSpace(source.NetworkDetail?.SourceIP) && string.IsNullOrWhiteSpace(source.NetworkDetail?.DestIP)
            ? source.RawPayload ?? source.RuleName
            : $"{source.NetworkDetail?.SourceIP ?? "unknown"} -> {source.NetworkDetail?.DestIP ?? "unknown"}";
        return (networkIndicator, "network");
    }

    private static string NormalizeFamily(string? rawFamily)
    {
        return RuleFamilyCatalog.TryNormalize(rawFamily, out var normalized) ? normalized : (rawFamily ?? "unknown").ToLowerInvariant();
    }

    private static string NormalizeAlertSeverity(string scannerType, string? sigmaSeverity, string? networkSeverity)
    {
        var family = NormalizeFamily(scannerType);
        return family switch
        {
            "sigma" => NormalizeFreeformSeverity(sigmaSeverity),
            "snort" or "suricata" => NormalizeFreeformSeverity(networkSeverity),
            _ => "Unknown",
        };
    }

    private static string NormalizeFreeformSeverity(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return "Unknown";
        }

        var normalized = rawValue.Trim();
        if (int.TryParse(normalized, out var numeric))
        {
            return numeric switch
            {
                <= 1 => "Critical",
                2 => "High",
                3 => "Medium",
                _ => "Low",
            };
        }

        return normalized.ToLowerInvariant() switch
        {
            "crit" or "critical" => "Critical",
            "high" => "High",
            "med" or "medium" => "Medium",
            "low" => "Low",
            _ => "Unknown",
        };
    }
}
