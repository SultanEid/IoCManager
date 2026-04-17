using Backend.Api.Infrastructure;
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
[Route("api/v2/audit-logs")]
public sealed class AuditController : ControllerBase
{
    private readonly CtiDbContext _dbContext;

    public AuditController(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AuditLogListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuditLogListResponse>> List([FromQuery] AuditLogSearchQuery query, CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(query.FromUtc, nameof(query.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(query.ToUtc, nameof(query.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(query.FromUtc), nameof(query.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize);
        var auditLogs = _dbContext.AuditLogsV2.AsNoTracking().AsQueryable();

        var q = V2SearchHelpers.NormalizeNullable(query.Q);
        if (q is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(q);
            auditLogs = auditLogs.Where(x =>
                EF.Functions.Like(x.ActorUserId, pattern)
                || EF.Functions.Like(x.ActionType, pattern)
                || EF.Functions.Like(x.EntityType, pattern)
                || EF.Functions.Like(x.EntityId, pattern)
                || EF.Functions.Like(x.PayloadJson, pattern));
        }

        var actorUserId = V2SearchHelpers.NormalizeNullable(query.ActorUserId);
        if (actorUserId is not null)
        {
            var actorPattern = V2SearchHelpers.ToContainsPattern(actorUserId);
            auditLogs = auditLogs.Where(x => EF.Functions.Like(x.ActorUserId, actorPattern));
        }

        var actionType = V2SearchHelpers.NormalizeNullable(query.ActionType);
        if (actionType is not null)
        {
            var actionPattern = V2SearchHelpers.ToContainsPattern(actionType);
            auditLogs = auditLogs.Where(x => EF.Functions.Like(x.ActionType, actionPattern));
        }

        var entityType = V2SearchHelpers.NormalizeNullable(query.EntityType);
        if (entityType is not null)
        {
            var entityPattern = V2SearchHelpers.ToContainsPattern(entityType);
            auditLogs = auditLogs.Where(x => EF.Functions.Like(x.EntityType, entityPattern));
        }

        if (fromUtc.HasValue)
        {
            auditLogs = auditLogs.Where(x => x.OccurredAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            auditLogs = auditLogs.Where(x => x.OccurredAtUtc <= toUtc.Value);
        }

        var totalCount = await auditLogs.CountAsync(cancellationToken);
        var items = await auditLogs
            .OrderByDescending(x => x.OccurredAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .Select(x => x.ToAuditLogResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(new AuditLogListResponse(items, totalCount, page, pageSize));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AuditLogResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AuditLogResponse>> Create([FromBody] CreateAuditLogRequest request, CancellationToken cancellationToken)
    {
        var occurredAtUtc = DateTimeOffset.UtcNow;
        var entity = AuditLog.Create(
            request.ActorUserId,
            request.ActionType,
            request.EntityType,
            request.EntityId,
            request.PayloadJson,
            occurredAtUtc);

        _dbContext.AuditLogsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(List), new { id = entity.Id }, entity.ToAuditLogResponse());
    }
}
