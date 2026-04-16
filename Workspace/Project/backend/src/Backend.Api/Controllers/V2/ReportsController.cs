using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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

    [HttpPost("generate")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<GeneratedReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<GeneratedReportResponse>> Generate([FromBody] GenerateReportRequest request, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.ActorUserId);

        var reportType = V2Mappings.ParseEnum<ReportType>(request.ReportType, nameof(request.ReportType));
        var generatedAtUtc = DateTimeOffset.UtcNow;
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(request.FromUtc, nameof(request.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(request.ToUtc, nameof(request.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(request.FromUtc), nameof(request.ToUtc));

        var scannerFamily = NormalizeScannerFamily(request.ScannerFamily);
        var severity = ParseOptionalSeverity(request.Severity);
        var alertStatus = ParseOptionalAlertStatus(request.Status);
        var scanJobStatus = ParseOptionalScanJobStatus(request.Status);
        var iocType = ParseOptionalIocType(request.IocType);
        var source = V2SearchHelpers.NormalizeNullable(request.Source);

        var alertsQuery = _dbContext.AlertsV2.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue)
        {
            alertsQuery = alertsQuery.Where(x => x.LastDetectedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            alertsQuery = alertsQuery.Where(x => x.LastDetectedAtUtc <= toUtc.Value);
        }

        if (severity.HasValue)
        {
            alertsQuery = alertsQuery.Where(x => x.Severity == severity.Value);
        }

        if (alertStatus.HasValue)
        {
            alertsQuery = alertsQuery.Where(x => x.Status == alertStatus.Value);
        }

        if (request.TargetServerId.HasValue || scannerFamily is not null)
        {
            var targetServerId = request.TargetServerId;
            var normalizedFamily = scannerFamily;
            alertsQuery = alertsQuery.Where(alert =>
                _dbContext.AlertScanResults.AsNoTracking()
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
                        result.AlertId == alert.Id
                        && (!targetServerId.HasValue || result.TargetServerId == targetServerId.Value)
                        && (normalizedFamily == null || result.ScannerFamily == normalizedFamily)));
        }

        var iocsQuery = _dbContext.Iocs.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue)
        {
            iocsQuery = iocsQuery.Where(x => x.LastSeenAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            iocsQuery = iocsQuery.Where(x => x.LastSeenAtUtc <= toUtc.Value);
        }

        if (severity.HasValue)
        {
            iocsQuery = iocsQuery.Where(x => x.Severity == severity.Value);
        }

        if (iocType.HasValue)
        {
            iocsQuery = iocsQuery.Where(x => x.Type == iocType.Value);
        }

        if (source is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(source);
            iocsQuery =
                from ioc in iocsQuery
                join feedSource in _dbContext.FeedSources.AsNoTracking() on ioc.FeedSourceId equals feedSource.Id
                where EF.Functions.Like(feedSource.Name, pattern)
                    || EF.Functions.Like(feedSource.Endpoint, pattern)
                select ioc;
        }

        var targetServersQuery = _dbContext.TargetServers.AsNoTracking().AsQueryable();
        if (request.TargetServerId.HasValue)
        {
            targetServersQuery = targetServersQuery.Where(x => x.Id == request.TargetServerId.Value);
        }

        var scanResultsQuery = _dbContext.ScanResults.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue)
        {
            scanResultsQuery = scanResultsQuery.Where(x => x.ObservedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            scanResultsQuery = scanResultsQuery.Where(x => x.ObservedAtUtc <= toUtc.Value);
        }

        if (request.TargetServerId.HasValue)
        {
            scanResultsQuery = scanResultsQuery.Where(x => x.TargetServerId == request.TargetServerId.Value);
        }

        if (scannerFamily is not null)
        {
            scanResultsQuery = scanResultsQuery.Where(x => x.ScannerFamily == scannerFamily);
        }

        if (iocType.HasValue)
        {
            scanResultsQuery = scanResultsQuery.Where(x => x.IocId.HasValue);
        }

        var scanJobsQuery = _dbContext.ScanJobs.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue)
        {
            scanJobsQuery = scanJobsQuery.Where(x => x.QueuedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            scanJobsQuery = scanJobsQuery.Where(x => x.QueuedAtUtc <= toUtc.Value);
        }

        if (scanJobStatus.HasValue)
        {
            scanJobsQuery = scanJobsQuery.Where(x => x.Status == scanJobStatus.Value);
        }

        if (request.TargetServerId.HasValue || scannerFamily is not null)
        {
            var targetServerId = request.TargetServerId;
            var normalizedFamily = scannerFamily;
            scanJobsQuery = scanJobsQuery.Where(job =>
                _dbContext.ScanJobTargetExecutions.AsNoTracking()
                    .Where(x => x.ScanJobId == job.Id)
                    .Any(execution =>
                        (!targetServerId.HasValue || execution.TargetServerId == targetServerId.Value)
                        && (normalizedFamily == null || execution.ScannerName.ToLower() == normalizedFamily || _dbContext.ScanResults.AsNoTracking().Any(result => result.ScanJobId == job.Id && result.ScannerFamily == normalizedFamily))));
        }

        var alerts = await alertsQuery
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .Take(100)
            .ToArrayAsync(cancellationToken);
        var iocs = await iocsQuery
            .OrderByDescending(x => x.LastSeenAtUtc)
            .Take(150)
            .ToArrayAsync(cancellationToken);
        var targets = await targetServersQuery
            .OrderBy(x => x.Hostname)
            .Take(100)
            .ToArrayAsync(cancellationToken);
        var scanResults = await scanResultsQuery
            .OrderByDescending(x => x.ObservedAtUtc)
            .Take(200)
            .ToArrayAsync(cancellationToken);
        var scanJobs = await scanJobsQuery
            .OrderByDescending(x => x.QueuedAtUtc)
            .Take(100)
            .ToArrayAsync(cancellationToken);
        var feedSourceLookup = await _dbContext.FeedSources.AsNoTracking()
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var title = string.IsNullOrWhiteSpace(request.Title)
            ? BuildDefaultReportTitle(reportType, generatedAtUtc)
            : request.Title.Trim();

        var sections = BuildSections(
            reportType,
            alerts,
            iocs,
            targets,
            scanResults,
            scanJobs,
            feedSourceLookup);

        var summaryJson = JsonSerializer.Serialize(new
        {
            requestedReportType = reportType.ToString(),
            generatedAtUtc,
            filters = new
            {
                request.FromUtc,
                request.ToUtc,
                request.TargetServerId,
                ScannerFamily = scannerFamily,
                request.Severity,
                request.Status,
                request.IocType,
                request.Source,
            },
            sections,
        });

        ReportResponse? persistedReport = null;
        var alertIds = alerts.Select(x => x.Id).Distinct().ToArray();
        if (request.Persist)
        {
            var report = Report.Create(
                title,
                reportType,
                summaryJson,
                request.ActorUserId,
                generatedAtUtc,
                generatedAtUtc);

            _dbContext.ReportsV2.Add(report);
            await _dbContext.SaveChangesAsync(cancellationToken);

            foreach (var alertId in alertIds)
            {
                _dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alertId, generatedAtUtc));
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await _auditService.TryWriteAsync(
                User,
                "reports.generate",
                "report",
                report.Id.ToString("N"),
                new
                {
                    report.Title,
                    report.ReportType,
                    AlertCount = alertIds.Length,
                },
                cancellationToken);

            persistedReport = report.ToReportResponse(alertIds);
        }

        return Ok(new GeneratedReportResponse(
            reportType.ToString(),
            title,
            request.Persist ? "persisted" : "preview_ready",
            generatedAtUtc,
            sections,
            alertIds,
            persistedReport));
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

    private static string BuildDefaultReportTitle(ReportType reportType, DateTimeOffset generatedAtUtc)
    {
        var friendlyType = reportType switch
        {
            ReportType.ExecutiveSummary => "Executive Summary",
            ReportType.DetailedIocReport => "Detailed IOC Report",
            ReportType.TargetExposureSummary => "Target Exposure Summary",
            ReportType.ScanActivitySummary => "Scan Activity Summary",
            _ => reportType.ToString(),
        };

        return $"{friendlyType} - {generatedAtUtc:yyyy-MM-dd HH:mm} UTC";
    }

    private static string? NormalizeScannerFamily(string? scannerFamily)
    {
        var normalized = V2SearchHelpers.NormalizeNullable(scannerFamily);
        if (normalized is null)
        {
            return null;
        }

        if (!RuleFamilyCatalog.TryNormalize(normalized, out var parsedFamily))
        {
            throw new ArgumentException($"Invalid scanner family '{scannerFamily}'.", nameof(scannerFamily));
        }

        return parsedFamily;
    }

    private static AlertSeverity? ParseOptionalSeverity(string? severity)
    {
        var normalized = V2SearchHelpers.NormalizeNullable(severity);
        return normalized is null ? null : V2Mappings.ParseSeverityOrPriority(normalized);
    }

    private static AlertStatus? ParseOptionalAlertStatus(string? status)
    {
        var normalized = V2SearchHelpers.NormalizeNullable(status);
        return normalized is null ? null : V2Mappings.ParseAlertStatusFromCaseStatus(normalized);
    }

    private static ScanJobStatus? ParseOptionalScanJobStatus(string? status)
    {
        var normalized = V2SearchHelpers.NormalizeNullable(status);
        if (normalized is null)
        {
            return null;
        }

        return Enum.TryParse<ScanJobStatus>(normalized, true, out var parsed) ? parsed : null;
    }

    private static IocType? ParseOptionalIocType(string? iocType)
    {
        var normalized = V2SearchHelpers.NormalizeNullable(iocType);
        if (normalized is null)
        {
            return null;
        }

        return V2Mappings.ParseEnum<IocType>(normalized, nameof(iocType));
    }

    private static GeneratedReportSectionResponse[] BuildSections(
        ReportType reportType,
        IReadOnlyList<Alert> alerts,
        IReadOnlyList<Ioc> iocs,
        IReadOnlyList<TargetServer> targets,
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyList<ScanJob> scanJobs,
        IReadOnlyDictionary<Guid, string> feedSourceLookup)
    {
        return reportType switch
        {
            ReportType.ExecutiveSummary => BuildExecutiveSummarySections(alerts, iocs, targets, scanResults, scanJobs),
            ReportType.DetailedIocReport => BuildDetailedIocSections(iocs, scanResults, feedSourceLookup),
            ReportType.TargetExposureSummary => BuildTargetExposureSections(alerts, targets, scanResults, scanJobs),
            ReportType.ScanActivitySummary => BuildScanActivitySections(scanResults, scanJobs, targets),
            _ => BuildExecutiveSummarySections(alerts, iocs, targets, scanResults, scanJobs),
        };
    }

    private static GeneratedReportSectionResponse[] BuildExecutiveSummarySections(
        IReadOnlyList<Alert> alerts,
        IReadOnlyList<Ioc> iocs,
        IReadOnlyList<TargetServer> targets,
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyList<ScanJob> scanJobs)
    {
        var criticalAlerts = alerts.Count(x => x.Severity == AlertSeverity.Critical);
        var openAlerts = alerts.Count(x => x.Status == AlertStatus.Open);
        var detections = scanResults.Count(x => x.Disposition == ScanResultDisposition.Detection);
        var activeTargets = targets.Count(x => x.Status == TargetServerStatus.Active);
        var latestScannerFamily = scanResults
            .GroupBy(x => x.ScannerFamily)
            .OrderByDescending(x => x.Count())
            .Select(x => $"{x.Key}: {x.Count()} result(s)")
            .FirstOrDefault() ?? "No scanner activity in scope.";

        return
        [
            new GeneratedReportSectionResponse(
                "Executive Posture",
                "High-level security posture using current alert, IOC, target, and scan activity totals.",
                [
                    new GeneratedReportMetricResponse("Open alerts", openAlerts.ToString(), "Alerts still requiring analyst action."),
                    new GeneratedReportMetricResponse("Critical alerts", criticalAlerts.ToString(), "Critical severity incidents in scope."),
                    new GeneratedReportMetricResponse("Active targets", activeTargets.ToString(), "Targets currently marked active."),
                    new GeneratedReportMetricResponse("Detection events", detections.ToString(), "Scan results currently marked as detections."),
                ],
                [
                    $"Indexed IOCs in scope: {iocs.Count}.",
                    $"Recent scan jobs in scope: {scanJobs.Count}.",
                    $"Most active scanner family: {latestScannerFamily}",
                ]),
        ];
    }

    private static GeneratedReportSectionResponse[] BuildDetailedIocSections(
        IReadOnlyList<Ioc> iocs,
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyDictionary<Guid, string> feedSourceLookup)
    {
        var byType = iocs
            .GroupBy(x => x.Type)
            .OrderByDescending(x => x.Count())
            .Take(4)
            .Select(x => $"{x.Key}: {x.Count()} IOC(s)")
            .ToArray();
        var bySource = iocs
            .GroupBy(x => feedSourceLookup.TryGetValue(x.FeedSourceId, out var name) ? name : "Unknown source")
            .OrderByDescending(x => x.Count())
            .Take(4)
            .Select(x => $"{x.Key}: {x.Count()} IOC(s)")
            .ToArray();
        var linkedDetections = scanResults.Count(x => x.IocId.HasValue);
        var highSeverity = iocs.Count(x => x.Severity is AlertSeverity.High or AlertSeverity.Critical);

        return
        [
            new GeneratedReportSectionResponse(
                "IOC Inventory",
                "Detailed IOC posture using stored IoC rows and linked scan result references.",
                [
                    new GeneratedReportMetricResponse("Matching IOCs", iocs.Count.ToString(), "Stored indicators matching the selected scope."),
                    new GeneratedReportMetricResponse("High severity IOCs", highSeverity.ToString(), "High or critical indicators in scope."),
                    new GeneratedReportMetricResponse("Distinct IOC types", iocs.Select(x => x.Type).Distinct().Count().ToString(), "IOC type spread within the current filter."),
                    new GeneratedReportMetricResponse("Linked detections", linkedDetections.ToString(), "Scan results linked to an IOC id."),
                ],
                byType.Length > 0 || bySource.Length > 0
                    ? byType.Concat(bySource).Distinct().ToArray()
                    : ["No IOC detail rows matched the current filter set."]),
        ];
    }

    private static GeneratedReportSectionResponse[] BuildTargetExposureSections(
        IReadOnlyList<Alert> alerts,
        IReadOnlyList<TargetServer> targets,
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyList<ScanJob> scanJobs)
    {
        var detectionsByTarget = scanResults
            .Where(x => x.Disposition == ScanResultDisposition.Detection)
            .GroupBy(x => x.TargetServerId)
            .OrderByDescending(x => x.Count())
            .Take(4)
            .Select(x => $"{x.Key.ToString("N")[..8]}: {x.Count()} detection(s)")
            .ToArray();
        var reachableTargets = targets.Count(x => x.ConnectivityStatus is ConnectivityStatus.Online or ConnectivityStatus.Degraded);

        return
        [
            new GeneratedReportSectionResponse(
                "Target Exposure",
                "Target posture using stored server inventory, scan activity, and linked alert pressure.",
                [
                    new GeneratedReportMetricResponse("Targets in scope", targets.Count.ToString(), "Servers matching the selected scope."),
                    new GeneratedReportMetricResponse("Reachable targets", reachableTargets.ToString(), "Targets marked online or degraded."),
                    new GeneratedReportMetricResponse("Alerts in scope", alerts.Count.ToString(), "Alerts associated with the same filtered environment."),
                    new GeneratedReportMetricResponse("Recent scan jobs", scanJobs.Count.ToString(), "Queued scan jobs in the selected window."),
                ],
                detectionsByTarget.Length > 0
                    ? detectionsByTarget
                    : ["No target-linked detections were found for the current filter set."]),
        ];
    }

    private static GeneratedReportSectionResponse[] BuildScanActivitySections(
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyList<ScanJob> scanJobs,
        IReadOnlyList<TargetServer> targets)
    {
        var completedJobs = scanJobs.Count(x => x.Status == ScanJobStatus.Completed);
        var failedJobs = scanJobs.Count(x => x.Status == ScanJobStatus.Failed);
        var detectionResults = scanResults.Count(x => x.Disposition == ScanResultDisposition.Detection);
        var familyBreakdown = scanResults
            .GroupBy(x => x.ScannerFamily)
            .OrderByDescending(x => x.Count())
            .Take(4)
            .Select(x => $"{x.Key}: {x.Count()} result(s)")
            .ToArray();

        return
        [
            new GeneratedReportSectionResponse(
                "Scan Activity",
                "Execution summary using stored scan jobs, scan results, and target coverage.",
                [
                    new GeneratedReportMetricResponse("Queued jobs", scanJobs.Count.ToString(), "Scan jobs matching the selected time range."),
                    new GeneratedReportMetricResponse("Completed jobs", completedJobs.ToString(), "Successfully completed scans in scope."),
                    new GeneratedReportMetricResponse("Failed jobs", failedJobs.ToString(), "Failed scans in scope."),
                    new GeneratedReportMetricResponse("Targets touched", scanResults.Select(x => x.TargetServerId).Distinct().Count().ToString(), $"Out of {targets.Count} scoped target(s)."),
                    new GeneratedReportMetricResponse("Detection results", detectionResults.ToString(), "Scan results currently marked as detections."),
                ],
                familyBreakdown.Length > 0
                    ? familyBreakdown
                    : ["No scan results were found for the current filter set."]),
        ];
    }
}
