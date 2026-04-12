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
[Route("api/v2/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly IAuthSensitiveAuditService _auditService;
    private readonly IPowerBiVisualizationCatalogService _powerBiCatalogService;

    public ReportsController(
        CtiDbContext dbContext,
        IAuthSensitiveAuditService auditService,
        IPowerBiVisualizationCatalogService powerBiCatalogService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _powerBiCatalogService = powerBiCatalogService;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ReportListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportListResponse>> List([FromQuery] ReportSearchQuery query, CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(query.FromUtc, nameof(query.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(query.ToUtc, nameof(query.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(query.FromUtc), nameof(query.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize);
        var reports = _dbContext.ReportsV2.AsNoTracking().AsQueryable();

        var q = V2SearchHelpers.NormalizeNullable(query.Q);
        if (q is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(q);
            reports = reports.Where(x =>
                EF.Functions.Like(x.Title, pattern)
                || EF.Functions.Like(x.SummaryJson, pattern));
        }

        if (!string.IsNullOrWhiteSpace(query.ReportType))
        {
            var reportType = V2Mappings.ParseEnum<ReportType>(query.ReportType, nameof(query.ReportType));
            reports = reports.Where(x => x.ReportType == reportType);
        }

        if (fromUtc.HasValue)
        {
            reports = reports.Where(x => x.GeneratedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            reports = reports.Where(x => x.GeneratedAtUtc <= toUtc.Value);
        }

        var normalizedSeverity = V2SearchHelpers.NormalizeNullable(query.Severity);
        AlertSeverity? severity = null;
        if (normalizedSeverity is not null)
        {
            severity = V2Mappings.ParseSeverityOrPriority(normalizedSeverity);
        }

        var normalizedStatus = V2SearchHelpers.NormalizeNullable(query.Status);
        AlertStatus? status = null;
        if (normalizedStatus is not null)
        {
            status = V2Mappings.ParseAlertStatusFromCaseStatus(normalizedStatus);
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

        if (severity.HasValue || status.HasValue || query.ServerId.HasValue || normalizedFamily is not null)
        {
            var relatedReportIds = from reportAlert in _dbContext.ReportAlerts.AsNoTracking()
                                   join alert in _dbContext.AlertsV2.AsNoTracking() on reportAlert.AlertId equals alert.Id
                                   where (!severity.HasValue || alert.Severity == severity.Value)
                                         && (!status.HasValue || alert.Status == status.Value)
                                   select new
                                   {
                                       reportAlert.ReportId,
                                       AlertId = alert.Id,
                                   };

            if (query.ServerId.HasValue || normalizedFamily is not null)
            {
                var serverId = query.ServerId;
                var family = normalizedFamily;
                relatedReportIds =
                    from candidate in relatedReportIds
                    where _dbContext.AlertScanResults.AsNoTracking()
                        .Join(
                            _dbContext.ScanResults.AsNoTracking(),
                            alertLink => alertLink.ScanResultId,
                            scanResult => scanResult.Id,
                            (alertLink, scanResult) => new
                            {
                                alertLink.AlertId,
                                scanResult.TargetServerId,
                                scanResult.ScannerFamily,
                            })
                        .Any(result =>
                            result.AlertId == candidate.AlertId
                            && (!serverId.HasValue || result.TargetServerId == serverId.Value)
                            && (family == null || result.ScannerFamily == family))
                    select candidate;
            }

            reports = reports.Where(x => relatedReportIds.Select(link => link.ReportId).Distinct().Contains(x.Id));
        }

        var totalCount = await reports.CountAsync(cancellationToken);
        var pageItems = await reports
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .ToArrayAsync(cancellationToken);

        var reportIds = pageItems.Select(x => x.Id).ToArray();
        var links = await _dbContext.ReportAlerts
            .Where(x => reportIds.Contains(x.ReportId))
            .ToListAsync(cancellationToken);

        var linkLookup = links
            .GroupBy(x => x.ReportId)
            .ToDictionary(x => x.Key, x => (IReadOnlyList<Guid>)x.Select(y => y.AlertId).ToArray());

        var items = pageItems
            .Select(report => report.ToReportResponse(linkLookup.GetValueOrDefault(report.Id, Array.Empty<Guid>())))
            .ToArray();

        return Ok(new ReportListResponse(items, totalCount, page, pageSize));
    }

    [HttpGet("power-bi")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<PowerBiVisualizationCatalogResponse>(StatusCodes.Status200OK)]
    public ActionResult<PowerBiVisualizationCatalogResponse> GetPowerBiCatalog()
    {
        return Ok(_powerBiCatalogService.BuildCatalog(User));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ReportResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ReportResponse>> Create([FromBody] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var reportType = V2Mappings.ParseEnum<ReportType>(request.ReportType, nameof(request.ReportType));
        var generatedAtUtc = DateTimeOffset.UtcNow;

        var report = Report.Create(
            request.Title,
            reportType,
            request.SummaryJson,
            request.ActorUserId,
            generatedAtUtc,
            generatedAtUtc);

        _dbContext.ReportsV2.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var distinctAlertIds = request.AlertIds.Distinct().ToArray();
        foreach (var alertId in distinctAlertIds)
        {
            _dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alertId, generatedAtUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "reports.export.create",
            "report",
            report.Id.ToString("N"),
            new
            {
                report.Title,
                report.ReportType,
                AlertCount = distinctAlertIds.Length,
            },
            cancellationToken);
        return CreatedAtAction(nameof(List), new { id = report.Id }, report.ToReportResponse(distinctAlertIds));
    }
}
