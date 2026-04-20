using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
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
[Route("api/v2/iocs")]
public sealed class IocsController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly ILegacyAzureCompatibilityReader _legacyAzureCompatibilityReader;

    public IocsController(CtiDbContext dbContext, ILegacyAzureCompatibilityReader legacyAzureCompatibilityReader)
    {
        _dbContext = dbContext;
        _legacyAzureCompatibilityReader = legacyAzureCompatibilityReader;
    }

    [HttpGet("feed-sources")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<FeedSourceResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FeedSourceResponse>>> ListFeedSources(CancellationToken cancellationToken)
    {
        var items = await _dbContext.FeedSources
            .OrderBy(x => x.Name)
            .Select(x => x.ToFeedSourceResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost("feed-sources")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<FeedSourceResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<FeedSourceResponse>> CreateFeedSource([FromBody] CreateFeedSourceRequest request, CancellationToken cancellationToken)
    {
        var sourceType = V2Mappings.ParseEnum<FeedSourceType>(request.SourceType, nameof(request.SourceType));
        var entity = FeedSource.Create(request.Name, sourceType, request.Endpoint, request.ActorUserId, DateTimeOffset.UtcNow);
        _dbContext.FeedSources.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(ListFeedSources), new { id = entity.Id }, entity.ToFeedSourceResponse());
    }

    [HttpGet("files")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<IocFileResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<IocFileResponse>>> ListIocFiles([FromQuery] Guid? feedSourceId, CancellationToken cancellationToken)
    {
        var query = _dbContext.IocFiles.AsQueryable();
        if (feedSourceId.HasValue)
        {
            query = query.Where(x => x.FeedSourceId == feedSourceId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.ImportedAtUtc)
            .Select(x => x.ToIocFileResponse())
            .ToArrayAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost("files")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<IocFileResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<IocFileResponse>> CreateIocFile([FromBody] CreateIocFileRequest request, CancellationToken cancellationToken)
    {
        var entity = IocFile.Create(
            request.FeedSourceId,
            request.FileName,
            request.StorageUri,
            request.ContentHash,
            request.ImportedAtUtc,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.IocFiles.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(ListIocFiles), new { id = entity.Id }, entity.ToIocFileResponse());
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IocListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IocListResponse>> ListIocs([FromQuery] IocSearchQuery query, CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(query.FromUtc, nameof(query.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(query.ToUtc, nameof(query.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(query.FromUtc), nameof(query.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize);
        try
        {
            var iocs = _dbContext.Iocs.AsNoTracking().AsQueryable();

            if (query.FeedSourceId.HasValue)
            {
                iocs = iocs.Where(x => x.FeedSourceId == query.FeedSourceId.Value);
            }

            var q = V2SearchHelpers.NormalizeNullable(query.Q);
            if (q is not null)
            {
                var pattern = V2SearchHelpers.ToContainsPattern(q);
                iocs = iocs.Where(x =>
                    EF.Functions.Like(x.Value, pattern)
                    || EF.Functions.Like(x.Type.ToString(), pattern));
            }

            if (!string.IsNullOrWhiteSpace(query.Severity))
            {
                var severity = V2Mappings.ParseSeverityOrPriority(query.Severity);
                iocs = iocs.Where(x => x.Severity == severity);
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = V2Mappings.ParseEnum<IocType>(query.Type, nameof(query.Type));
                iocs = iocs.Where(x => x.Type == type);
            }

            var source = V2SearchHelpers.NormalizeNullable(query.Source);
            if (source is not null)
            {
                var sourcePattern = V2SearchHelpers.ToContainsPattern(source);
                iocs = iocs.Where(x =>
                    _dbContext.FeedSources.Any(feed =>
                        feed.Id == x.FeedSourceId
                        && (EF.Functions.Like(feed.Name, sourcePattern)
                            || EF.Functions.Like(feed.SourceType.ToString(), sourcePattern)
                            || EF.Functions.Like(feed.Endpoint, sourcePattern))));
            }

            if (fromUtc.HasValue)
            {
                iocs = iocs.Where(x => x.LastSeenAtUtc >= fromUtc.Value);
            }

            if (toUtc.HasValue)
            {
                iocs = iocs.Where(x => x.LastSeenAtUtc <= toUtc.Value);
            }

            var totalCount = await iocs.CountAsync(cancellationToken);
            if (totalCount > 0 || !_legacyAzureCompatibilityReader.IsEnabled)
            {
                var rows = await (
                    from ioc in iocs
                    join feedSource in _dbContext.FeedSources.AsNoTracking() on ioc.FeedSourceId equals feedSource.Id
                    join iocFile in _dbContext.IocFiles.AsNoTracking() on ioc.IocFileId equals iocFile.Id into iocFiles
                    from iocFile in iocFiles.DefaultIfEmpty()
                    orderby ioc.LastSeenAtUtc descending
                    select new
                    {
                        Ioc = ioc,
                        FeedSourceName = feedSource.Name,
                        FeedSourceType = feedSource.SourceType.ToString(),
                        FileName = iocFile != null ? iocFile.FileName : null,
                    })
                    .Skip(skip)
                    .Take(pageSize)
                    .ToArrayAsync(cancellationToken);

                var items = rows
                    .Select(x => new IocResponse(
                        x.Ioc.Id,
                        x.Ioc.FeedSourceId,
                        x.Ioc.IocFileId,
                        x.Ioc.Type.ToString(),
                        x.Ioc.Value,
                        x.Ioc.Severity.ToString(),
                        x.Ioc.Confidence,
                        x.Ioc.FirstSeenAtUtc,
                        x.Ioc.LastSeenAtUtc,
                        x.Ioc.CreatedAtUtc,
                        x.Ioc.UpdatedAtUtc,
                        x.FeedSourceName,
                        x.FeedSourceType,
                        x.FileName))
                    .ToArray();

                return Ok(new IocListResponse(items, totalCount, page, pageSize));
            }
        }
        catch (Exception ex) when (_legacyAzureCompatibilityReader.IsEnabled && LegacyCompatibilityFallbackPolicy.ShouldUseFallback(ex))
        {
        }

        var legacyResponse = await _legacyAzureCompatibilityReader.ListIocsAsync(
            new LegacyIocQuery(query.Q, query.Severity, query.Type, query.Source, query.FeedSourceId, fromUtc, toUtc, page, pageSize),
            cancellationToken);

        return Ok(new IocListResponse(
            legacyResponse.Items
                .Select(x => new IocResponse(
                    x.Id,
                    x.FeedSourceId,
                    x.IocFileId,
                    x.Type,
                    x.Value,
                    x.Severity,
                    x.Confidence,
                    x.FirstSeenAtUtc,
                    x.LastSeenAtUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.FeedSourceName,
                    x.FeedSourceType,
                    x.FileName))
                .ToArray(),
            legacyResponse.TotalCount,
            legacyResponse.Page,
            legacyResponse.PageSize));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<IocResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<IocResponse>> CreateIoc([FromBody] CreateIocRequest request, CancellationToken cancellationToken)
    {
        var type = V2Mappings.ParseEnum<IocType>(request.Type, nameof(request.Type));
        var severity = V2Mappings.ParseSeverityOrPriority(request.Severity);

        var existing = await _dbContext.Iocs.FirstOrDefaultAsync(
            x => x.Type == type && x.Value == request.Value.Trim(),
            cancellationToken);

        if (existing is not null)
        {
            existing.RecordSeen(request.SeenAtUtc, request.ActorUserId, DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(existing.ToIocResponse());
        }

        var entity = Ioc.Create(
            request.FeedSourceId,
            request.IocFileId,
            type,
            request.Value,
            severity,
            request.Confidence,
            request.SeenAtUtc,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.Iocs.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(ListIocs), new { id = entity.Id }, entity.ToIocResponse());
    }
}
