using Backend.Api.Controllers.V2;
using Backend.Api.Infrastructure;
using Backend.Contracts.Alerts;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/alerts")]
[Obsolete("Use /api/v2/alerts. /api/alerts is retained as a one-release compatibility alias.")]
public sealed class AlertsController : ControllerBase
{
    private readonly CtiDbContext _dbContext;

    public AlertsController(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<AlertResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AlertResponse>>> List(CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var items = await _dbContext.AlertsV2
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .ToArrayAsync(cancellationToken);

        return Ok(items.Select(ToLegacyAlertResponse).ToArray());
    }

    [HttpGet("{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertResponse>> GetById(Guid alertId, CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var item = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(ToLegacyAlertResponse(item));
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AlertResponse>> Create([FromBody] CreateAlertRequest request, CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var severity = V2Mappings.ParseSeverityOrPriority(request.Priority);
        var detectedAtUtc = DateTimeOffset.UtcNow;

        var existing = await _dbContext.AlertsV2.FirstOrDefaultAsync(
            x => x.Title == request.Title.Trim()
                && x.OwnerUserId == request.OwnerUserId.Trim()
                && x.Severity == severity
                && (x.Status == AlertStatus.Open || x.Status == AlertStatus.Investigating),
            cancellationToken);

        if (existing is not null)
        {
            existing.RefreshDetection(request.Title, request.Summary, severity, detectedAtUtc, request.RequestedByUserId, DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(ToLegacyAlertResponse(existing));
        }

        var entity = Alert.Create(
            request.Title,
            request.Summary,
            severity,
            request.OwnerUserId,
            string.Empty,
            null,
            request.ApprovalTierRequired,
            "manual",
            null,
            "Unscoped",
            request.Title,
            detectedAtUtc,
            request.RequestedByUserId,
            DateTimeOffset.UtcNow);

        _dbContext.AlertsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { alertId = entity.Id }, ToLegacyAlertResponse(entity));
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
        SetDeprecationHeaders();

        var item = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseAlertStatusFromCaseStatus(request.Status);
        item.SetStatus(status, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToLegacyAlertResponse(item));
    }

    private static AlertResponse ToLegacyAlertResponse(Alert source)
    {
        return new AlertResponse(
            source.Id,
            source.Title,
            source.Summary,
            source.Severity.ToString(),
            source.Status.ToString(),
            source.OwnerUserId,
            source.ApprovalTierRequired,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);
    }

    private void SetDeprecationHeaders()
    {
        Response.Headers.TryAdd("Deprecation", "true");
        Response.Headers.TryAdd("Link", "</api/v2/alerts>; rel=\"successor-version\"");
    }
}
