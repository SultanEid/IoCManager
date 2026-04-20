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
[Route("api/v2/retention")]
public sealed class RetentionController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly IAuthSensitiveAuditService _auditService;

    public RetentionController(CtiDbContext dbContext, IAuthSensitiveAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    [HttpGet("policies")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RetentionPolicyResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RetentionPolicyResponse>>> ListPolicies(CancellationToken cancellationToken)
    {
        var items = await _dbContext.RetentionPoliciesV2
            .OrderBy(x => x.DataType)
            .Select(x => x.ToRetentionPolicyResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost("policies")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RetentionPolicyResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RetentionPolicyResponse>> CreatePolicy(
        [FromBody] CreateRetentionPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var dataType = V2Mappings.ParseEnum<RetentionDataType>(request.DataType, nameof(request.DataType));
        var entity = RetentionPolicy.Create(
            dataType,
            request.RetainDays,
            request.ArchiveAfterDays,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.RetentionPoliciesV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "retention.policy.create",
            "retention_policy",
            entity.Id.ToString("N"),
            new
            {
                request.DataType,
                request.RetainDays,
                request.ArchiveAfterDays,
            },
            cancellationToken);
        return CreatedAtAction(nameof(ListPolicies), new { id = entity.Id }, entity.ToRetentionPolicyResponse());
    }

    [HttpGet("archives")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<ArchiveRecordResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ArchiveRecordResponse>>> ListArchiveRecords(
        [FromQuery] Guid? retentionPolicyId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ArchiveRecordsV2.AsQueryable();
        if (retentionPolicyId.HasValue)
        {
            query = query.Where(x => x.RetentionPolicyId == retentionPolicyId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.ArchivedAtUtc)
            .Select(x => x.ToArchiveRecordResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost("execute")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<IReadOnlyList<ArchiveRecordResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ArchiveRecordResponse>>> Execute(
        [FromBody] ExecuteRetentionPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var policy = await _dbContext.RetentionPoliciesV2.FirstOrDefaultAsync(x => x.Id == request.RetentionPolicyId, cancellationToken);
        if (policy is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var archiveThreshold = nowUtc.AddDays(-policy.ArchiveAfterDays);

        var existingList = await _dbContext.ArchiveRecordsV2
            .Where(x => x.RetentionPolicyId == policy.Id)
            .Select(x => $"{x.EntityType}:{x.EntityId}")
            .ToListAsync(cancellationToken);
        var existing = existingList.ToHashSet(StringComparer.Ordinal);

        var created = new List<ArchiveRecord>();
        foreach (var (entityType, entityId) in await ListArchiveCandidatesAsync(policy.DataType, archiveThreshold, cancellationToken))
        {
            var key = $"{entityType}:{entityId}";
            if (existing.Contains(key))
            {
                continue;
            }

            var archiveUri = $"{request.ArchiveUriPrefix.TrimEnd('/')}/{entityType}/{entityId}.json";
            var archiveRecord = ArchiveRecord.Create(
                policy.Id,
                entityType,
                entityId,
                archiveUri,
                request.ActorUserId,
                nowUtc,
                nowUtc);

            created.Add(archiveRecord);
            existing.Add(key);
        }

        _dbContext.ArchiveRecordsV2.AddRange(created);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "retention.execute",
            "retention_policy",
            policy.Id.ToString("N"),
            new
            {
                request.RetentionPolicyId,
                CreatedArchiveRecords = created.Count,
            },
            cancellationToken);
        return Ok(created.Select(x => x.ToArchiveRecordResponse()).ToArray());
    }

    private async Task<IReadOnlyList<(string EntityType, string EntityId)>> ListArchiveCandidatesAsync(
        RetentionDataType dataType,
        DateTimeOffset archiveThreshold,
        CancellationToken cancellationToken)
    {
        return dataType switch
        {
            RetentionDataType.ScanResult => await _dbContext.ScanResults
                .Where(x => x.ObservedAtUtc <= archiveThreshold)
                .Select(x => new ValueTuple<string, string>("scan_result", x.Id.ToString("N")))
                .ToListAsync(cancellationToken),
            RetentionDataType.Alert => await _dbContext.AlertsV2
                .Where(x => x.LastDetectedAtUtc <= archiveThreshold)
                .Select(x => new ValueTuple<string, string>("alert", x.Id.ToString("N")))
                .ToListAsync(cancellationToken),
            RetentionDataType.Report => await _dbContext.ReportsV2
                .Where(x => x.GeneratedAtUtc <= archiveThreshold)
                .Select(x => new ValueTuple<string, string>("report", x.Id.ToString("N")))
                .ToListAsync(cancellationToken),
            RetentionDataType.AuditLog => await _dbContext.AuditLogsV2
                .Where(x => x.OccurredAtUtc <= archiveThreshold)
                .Select(x => new ValueTuple<string, string>("audit_log", x.Id.ToString("N")))
                .ToListAsync(cancellationToken),
            RetentionDataType.IocFile => await _dbContext.IocFiles
                .Where(x => x.ImportedAtUtc <= archiveThreshold)
                .Select(x => new ValueTuple<string, string>("ioc_file", x.Id.ToString("N")))
                .ToListAsync(cancellationToken),
            _ => Array.Empty<(string, string)>(),
        };
    }
}
