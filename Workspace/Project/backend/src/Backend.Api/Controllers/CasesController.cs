using Backend.Api.Controllers.V2;
using Backend.Api.Infrastructure;
using Backend.Contracts.Cases;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/cases")]
[Obsolete("Use /api/v2/alerts. /api/cases is retained as a one-release compatibility shim.")]
public sealed class CasesController : ControllerBase
{
    private readonly CtiDbContext _dbContext;

    public CasesController(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<CaseResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CaseResponse>>> List(CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var items = await _dbContext.AlertsV2
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .ToArrayAsync(cancellationToken);

        return Ok(items.Select(x => x.ToLegacyCaseResponse()).ToArray());
    }

    [HttpGet("{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<CaseResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CaseResponse>> GetById(Guid caseId, CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var item = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == caseId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item.ToLegacyCaseResponse());
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<CaseResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CaseResponse>> Create([FromBody] CreateCaseRequest request, CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var severity = V2Mappings.ParseSeverityOrPriority(request.Priority);
        var nowUtc = DateTimeOffset.UtcNow;

        var existing = await _dbContext.AlertsV2.FirstOrDefaultAsync(
            x => x.Title == request.Title.Trim()
                && x.OwnerUserId == request.OwnerUserId.Trim()
                && x.Severity == severity
                && (x.Status == AlertStatus.Open || x.Status == AlertStatus.Investigating),
            cancellationToken);

        if (existing is not null)
        {
            existing.RefreshDetection(request.Title, request.Summary, severity, nowUtc, request.RequestedByUserId, nowUtc);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(existing.ToLegacyCaseResponse());
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
            nowUtc,
            request.RequestedByUserId,
            nowUtc);

        _dbContext.AlertsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { caseId = entity.Id }, entity.ToLegacyCaseResponse());
    }

    [HttpPatch("{caseId:guid}/status")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<CaseResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CaseResponse>> UpdateStatus(
        Guid caseId,
        [FromBody] UpdateCaseStatusRequest request,
        CancellationToken cancellationToken)
    {
        SetDeprecationHeaders();

        var item = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == caseId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseAlertStatusFromCaseStatus(request.Status);
        item.SetStatus(status, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(item.ToLegacyCaseResponse());
    }

    private void SetDeprecationHeaders()
    {
        Response.Headers.TryAdd("Deprecation", "true");
        Response.Headers.TryAdd("Link", "</api/v2/alerts>; rel=\"successor-version\"");
    }
}
