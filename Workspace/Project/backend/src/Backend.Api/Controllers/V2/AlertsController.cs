using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
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

    public AlertsController(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
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
                || EF.Functions.Like(x.ApprovalTierRequired, pattern));
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

            normalizedFamily = parsedFamily;
        }

        if (query.ServerId.HasValue || normalizedFamily is not null)
        {
            var relatedAlertIds = _dbContext.AlertScanResults
                .AsNoTracking()
                .Join(
                    _dbContext.ScanResults.AsNoTracking(),
                    alertLink => alertLink.ScanResultId,
                    scanResult => scanResult.Id,
                    (alertLink, scanResult) => new
                    {
                        alertLink.AlertId,
                        scanResult.TargetServerId,
                        scanResult.ScannerFamily,
                    });

            if (query.ServerId.HasValue)
            {
                relatedAlertIds = relatedAlertIds.Where(x => x.TargetServerId == query.ServerId.Value);
            }

            if (normalizedFamily is not null)
            {
                relatedAlertIds = relatedAlertIds.Where(x => x.ScannerFamily == normalizedFamily);
            }

            alerts = alerts.Where(x => relatedAlertIds.Select(link => link.AlertId).Distinct().Contains(x.Id));
        }

        var totalCount = await alerts.CountAsync(cancellationToken);
        var items = await alerts
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .Select(x => x.ToAlertResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(new AlertListResponse(items, totalCount, page, pageSize));
    }

    [HttpGet("{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertResponse>> GetById(Guid alertId, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        return Ok(entity.ToAlertResponse());
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AlertResponse>> Create([FromBody] CreateAlertRequest request, CancellationToken cancellationToken)
    {
        var severity = V2Mappings.ParseSeverityOrPriority(request.Severity);

        var existing = await _dbContext.AlertsV2.FirstOrDefaultAsync(
            x => x.Title == request.Title.Trim()
                && x.OwnerUserId == request.OwnerUserId.Trim()
                && x.Severity == severity
                && (x.Status == AlertStatus.Open || x.Status == AlertStatus.Investigating),
            cancellationToken);

        if (existing is not null)
        {
            existing.TouchDetection(request.DetectedAtUtc, request.ActorUserId, DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(existing.ToAlertResponse());
        }

        var entity = Alert.Create(
            request.Title,
            request.Summary,
            severity,
            request.OwnerUserId,
            request.ApprovalTierRequired,
            request.DetectedAtUtc,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.AlertsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { alertId = entity.Id }, entity.ToAlertResponse());
    }

    [HttpPatch("{alertId:guid}/status")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertResponse>> UpdateStatus(
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
        return Ok(entity.ToAlertResponse());
    }

    [HttpPost("{alertId:guid}/scan-results")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> LinkScanResult(
        Guid alertId,
        [FromBody] LinkAlertScanResultRequest request,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.AlertScanResults.AnyAsync(
            x => x.AlertId == alertId && x.ScanResultId == request.ScanResultId,
            cancellationToken);

        if (exists)
        {
            return Conflict("Scan result already linked.");
        }

        var alertExists = await _dbContext.AlertsV2.AnyAsync(x => x.Id == alertId, cancellationToken);
        var resultExists = await _dbContext.ScanResults.AnyAsync(x => x.Id == request.ScanResultId, cancellationToken);
        if (!alertExists || !resultExists)
        {
            return NotFound();
        }

        _dbContext.AlertScanResults.Add(AlertScanResult.Create(alertId, request.ScanResultId, DateTimeOffset.UtcNow));
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { alertId }, null);
    }
}
