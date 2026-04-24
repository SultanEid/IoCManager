using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
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

    [HttpGet("{reportId:guid}/pdf")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RenderSavedReportPdf(Guid reportId, CancellationToken cancellationToken)
    {
        var report = await _dbContext.ReportsV2.AsNoTracking().FirstOrDefaultAsync(x => x.Id == reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        var pdf = await BuildSavedReportPdfAsync(report, cancellationToken);
        return File(pdf, "application/pdf", $"{SanitizeFileName(report.Title)}.pdf");
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
        var ruleRevisionIds = scanResults
            .Where(x => x.RuleRevisionId.HasValue)
            .Select(x => x.RuleRevisionId!.Value)
            .Distinct()
            .ToArray();
        var ruleLookup = ruleRevisionIds.Length == 0
            ? new Dictionary<Guid, ReportRuleBrief>()
            : await (
                    from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
                    join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                    where ruleRevisionIds.Contains(revision.Id)
                    select new ReportRuleBrief(
                        revision.Id,
                        artifact.Name,
                        artifact.RuleFamily,
                        revision.VersionLabel,
                        revision.Status.ToString()))
                .ToDictionaryAsync(x => x.RuleRevisionId, cancellationToken);
        var powerBiCatalog = _powerBiCatalogService.BuildCatalog(User);

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
            feedSourceLookup,
            ruleLookup,
            powerBiCatalog,
            fromUtc,
            toUtc,
            scannerFamily,
            severity,
            alertStatus,
            iocType,
            source);

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
        var distinctAlertIds = request.AlertIds?.Distinct().ToArray() ?? [];

        if (distinctAlertIds.Length > 0)
        {
            var existingAlertIds = await _dbContext.AlertsV2
                .AsNoTracking()
                .Where(x => distinctAlertIds.Contains(x.Id))
                .Select(x => x.Id)
                .ToArrayAsync(cancellationToken);

            var missingAlertIds = distinctAlertIds.Except(existingAlertIds).ToArray();
            if (missingAlertIds.Length > 0)
            {
                return BadRequest($"Unknown alert id(s): {string.Join(", ", missingAlertIds.Select(x => x.ToString("D")))}.");
            }
        }

        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var report = Report.Create(
            request.Title,
            reportType,
            request.SummaryJson,
            request.ActorUserId,
            generatedAtUtc,
            generatedAtUtc);

        _dbContext.ReportsV2.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var alertId in distinctAlertIds)
        {
            _dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alertId, generatedAtUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
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

    [HttpDelete("{reportId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid reportId, CancellationToken cancellationToken)
    {
        var report = await _dbContext.ReportsV2.FirstOrDefaultAsync(x => x.Id == reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        await _dbContext.ReportAlerts
            .Where(x => x.ReportId == reportId)
            .ExecuteDeleteAsync(cancellationToken);

        _dbContext.ReportsV2.Remove(report);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "reports.delete",
            "report",
            report.Id.ToString("N"),
            new
            {
                report.Title,
                report.ReportType,
            },
            cancellationToken);

        return NoContent();
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

    private static async Task<byte[]> BuildSavedReportPdfAsync(Report report, CancellationToken cancellationToken)
    {
        var (scope, query, sections) = BuildPdfSnapshot(report);
        var tempPath = Path.Combine(Path.GetTempPath(), $"ioc-report-{report.Id:N}.pdf");
        try
        {
            LegacyScanPipelineFileWriters.WriteSimplePdf(
                tempPath,
                report.Title,
                FormatReportType(report.ReportType),
                scope,
                report.GeneratedAtUtc,
                query,
                sections);

            return await System.IO.File.ReadAllBytesAsync(tempPath, cancellationToken);
        }
        finally
        {
            if (System.IO.File.Exists(tempPath))
            {
                System.IO.File.Delete(tempPath);
            }
        }
    }

    private static (string Scope, LegacyPipelineReportQueryResponse Query, IReadOnlyList<LegacyPipelineReportSectionResponse> Sections) BuildPdfSnapshot(Report report)
    {
        try
        {
            using var document = JsonDocument.Parse(report.SummaryJson);
            var root = document.RootElement;
            var filters = TryGetProperty(root, out var filtersElement, "filters")
                ? filtersElement
                : TryGetProperty(root, out var queryElement, "query")
                    ? queryElement
                    : default;
            var query = new LegacyPipelineReportQueryResponse(
                JobId: null,
                TargetId: ReadString(filters, "targetServerId", "TargetServerId"),
                NetworkId: null,
                ScannerFamily: ReadString(filters, "scannerFamily", "ScannerFamily"),
                FromUtc: ReadString(filters, "fromUtc", "FromUtc"),
                ToUtc: ReadString(filters, "toUtc", "ToUtc"),
                Severity: ReadString(filters, "severity", "Severity"),
                Status: ReadString(filters, "status", "Status"));
            var scope = ReadString(root, "scope") ?? SummarizeReportScope(query);
            var sections = ReadLegacySections(root);
            return (scope, query, sections.Count == 0 ? BuildFallbackPdfSections(report) : sections);
        }
        catch
        {
            var query = new LegacyPipelineReportQueryResponse(null, null, null, null, null, null, null, null);
            return ("Stored snapshot", query, BuildFallbackPdfSections(report));
        }
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> ReadLegacySections(JsonElement root)
    {
        if (!TryGetProperty(root, out var sectionsElement, "sections") || sectionsElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var sections = new List<LegacyPipelineReportSectionResponse>();
        foreach (var sectionElement in sectionsElement.EnumerateArray())
        {
            if (sectionElement.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var metrics = new List<LegacyPipelineReportSectionMetricResponse>();
            if (TryGetProperty(sectionElement, out var metricsElement, "metrics") && metricsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var metricElement in metricsElement.EnumerateArray())
                {
                    metrics.Add(new LegacyPipelineReportSectionMetricResponse(
                        ReadString(metricElement, "label") ?? "Metric",
                        ReadString(metricElement, "value") ?? "n/a",
                        ReadString(metricElement, "detail") ?? string.Empty));
                }
            }

            var highlights = new List<string>();
            var narrative = ReadString(sectionElement, "narrative");
            if (!string.IsNullOrWhiteSpace(narrative))
            {
                highlights.Add(narrative);
            }

            if (TryGetProperty(sectionElement, out var highlightsElement, "highlights") && highlightsElement.ValueKind == JsonValueKind.Array)
            {
                highlights.AddRange(highlightsElement.EnumerateArray().Select(item => item.GetString()).Where(item => !string.IsNullOrWhiteSpace(item))!);
            }

            AddTableHighlights(sectionElement, highlights);

            sections.Add(new LegacyPipelineReportSectionResponse(
                ReadString(sectionElement, "title") ?? "Report Section",
                ReadString(sectionElement, "summary") ?? string.Empty,
                metrics,
                highlights));
        }

        return sections;
    }

    private static void AddTableHighlights(JsonElement sectionElement, List<string> highlights)
    {
        if (!TryGetProperty(sectionElement, out var tablesElement, "tables") || tablesElement.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var tableElement in tablesElement.EnumerateArray())
        {
            var title = ReadString(tableElement, "title") ?? "Table";
            var columns = ReadTableColumns(tableElement);
            highlights.Add($"{title}:");
            if (!TryGetProperty(tableElement, out var rowsElement, "rows") || rowsElement.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var rowElement in rowsElement.EnumerateArray().Take(8))
            {
                if (!TryGetProperty(rowElement, out var valuesElement, "values") || valuesElement.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var cells = columns
                    .Select(column => $"{column.Label}: {ReadString(valuesElement, column.Key) ?? "n/a"}")
                    .ToArray();
                highlights.Add(string.Join(" | ", cells));
            }
        }
    }

    private static IReadOnlyList<(string Key, string Label)> ReadTableColumns(JsonElement tableElement)
    {
        if (!TryGetProperty(tableElement, out var columnsElement, "columns") || columnsElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return columnsElement.EnumerateArray()
            .Select(column => (Key: ReadString(column, "key") ?? string.Empty, Label: ReadString(column, "label") ?? ReadString(column, "key") ?? "Column"))
            .Where(column => !string.IsNullOrWhiteSpace(column.Key))
            .ToArray();
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildFallbackPdfSections(Report report)
    {
        return
        [
            new LegacyPipelineReportSectionResponse(
                "Stored Snapshot",
                "This report was saved before structured report sections were available. The raw summary is preserved for review.",
                [
                    new LegacyPipelineReportSectionMetricResponse("Report type", FormatReportType(report.ReportType), "Persisted report classification."),
                    new LegacyPipelineReportSectionMetricResponse("Generated", FormatUtc(report.GeneratedAtUtc), "Snapshot generation time."),
                ],
                [Truncate(report.SummaryJson, 1800)]),
        ];
    }

    private static bool TryGetProperty(JsonElement source, out JsonElement value, params string[] names)
    {
        if (source.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in source.EnumerateObject())
            {
                if (names.Any(name => property.NameEquals(name) || string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)))
                {
                    value = property.Value;
                    return true;
                }
            }
        }

        value = default;
        return false;
    }

    private static string? ReadString(JsonElement source, params string[] names)
    {
        if (source.ValueKind != JsonValueKind.Object || !TryGetProperty(source, out var value, names))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => string.IsNullOrWhiteSpace(value.GetString()) ? null : value.GetString(),
            JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False => value.ToString(),
            _ => null,
        };
    }

    private static string SummarizeReportScope(LegacyPipelineReportQueryResponse query)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(query.TargetId)) parts.Add($"Target {query.TargetId}");
        if (!string.IsNullOrWhiteSpace(query.ScannerFamily)) parts.Add(query.ScannerFamily);
        if (!string.IsNullOrWhiteSpace(query.Severity)) parts.Add($"{query.Severity} severity");
        if (!string.IsNullOrWhiteSpace(query.Status)) parts.Add($"{query.Status} alerts");
        if (!string.IsNullOrWhiteSpace(query.FromUtc) || !string.IsNullOrWhiteSpace(query.ToUtc)) parts.Add($"{query.FromUtc ?? "..."} to {query.ToUtc ?? "..."}");
        return parts.Count == 0 ? "Global scope" : string.Join(" | ", parts);
    }

    private static string FormatReportType(ReportType reportType) => reportType switch
    {
        ReportType.ExecutiveSummary => "Executive Summary",
        ReportType.DetailedIocReport => "Detailed IOC Report",
        ReportType.TargetExposureSummary => "Target Exposure Summary",
        ReportType.ScanActivitySummary => "Scan Activity Summary",
        _ => reportType.ToString(),
    };

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(safe) ? "report" : Truncate(safe, 120);
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : $"{value[..Math.Max(0, maxLength - 3)]}...";

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
        IReadOnlyDictionary<Guid, string> feedSourceLookup,
        IReadOnlyDictionary<Guid, ReportRuleBrief> ruleLookup,
        PowerBiVisualizationCatalogResponse powerBiCatalog,
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        string? scannerFamily,
        AlertSeverity? severity,
        AlertStatus? alertStatus,
        IocType? iocType,
        string? source)
    {
        var context = new ReportBuildContext(
            reportType,
            alerts,
            iocs,
            targets,
            scanResults,
            scanJobs,
            feedSourceLookup,
            ruleLookup,
            powerBiCatalog,
            fromUtc,
            toUtc,
            scannerFamily,
            severity,
            alertStatus,
            iocType,
            source);

        var executive = BuildExecutiveAssessmentSection(context);
        var risks = BuildTopRisksSection(context);
        var assets = BuildAffectedAssetsSection(context);
        var evidence = BuildEvidenceSection(context);
        var timeline = BuildScanTimelineSection(context);
        var actions = BuildRecommendedActionsSection(context);
        var appendix = BuildScopeAppendixSection(context);

        return reportType switch
        {
            ReportType.DetailedIocReport => [executive, evidence, risks, assets, timeline, actions, appendix],
            ReportType.TargetExposureSummary => [executive, assets, risks, evidence, timeline, actions, appendix],
            ReportType.ScanActivitySummary => [executive, timeline, risks, assets, evidence, actions, appendix],
            _ => [executive, risks, assets, evidence, timeline, actions, appendix],
        };
    }

    private static GeneratedReportSectionResponse BuildExecutiveAssessmentSection(ReportBuildContext context)
    {
        var criticalAlerts = context.Alerts.Count(x => x.Severity == AlertSeverity.Critical);
        var highAlerts = context.Alerts.Count(x => x.Severity == AlertSeverity.High);
        var openAlerts = context.Alerts.Count(x => x.Status is AlertStatus.Open or AlertStatus.Investigating);
        var detections = context.ScanResults.Count(x => x.Disposition == ScanResultDisposition.Detection);
        var affectedAssets = context.ScanResults
            .Where(x => x.Disposition == ScanResultDisposition.Detection)
            .Select(x => x.TargetServerId)
            .Distinct()
            .Count();
        var failedJobs = context.ScanJobs.Count(x => x.Status == ScanJobStatus.Failed);
        var riskLevel = ResolveRiskLevel(criticalAlerts, highAlerts, detections, affectedAssets, failedJobs);
        var topFamily = context.ScanResults
            .GroupBy(x => x.ScannerFamily)
            .OrderByDescending(x => x.Count())
            .Select(x => $"{x.Key} ({x.Count()} result(s))")
            .FirstOrDefault() ?? "no scanner activity";

        return new GeneratedReportSectionResponse(
            "Executive Assessment",
            "Decision-ready summary of the current security posture for the selected scope.",
            [
                Metric("Risk level", riskLevel, "Derived from severity, detections, affected assets, and scan health."),
                Metric("Open alerts", openAlerts.ToString(CultureInfo.InvariantCulture), "Open or investigating alerts requiring action."),
                Metric("Detection events", detections.ToString(CultureInfo.InvariantCulture), "Canonical scan results marked as detections."),
                Metric("Affected assets", affectedAssets.ToString(CultureInfo.InvariantCulture), "Distinct targets with detection results."),
            ],
            [
                $"Dominant scanner signal: {topFamily}.",
                $"Evidence coverage includes {context.Iocs.Count} IOC row(s), {context.ScanResults.Count} scan result row(s), and {context.Alerts.Count} alert row(s).",
                context.PowerBiCatalog.Visualizations.Count > 0
                    ? $"Power BI context available: {context.PowerBiCatalog.Visualizations.Count} authorized visualization(s), catalog status {context.PowerBiCatalog.Status}."
                    : "No authorized Power BI visualization metadata is available for this session.",
            ],
            BuildExecutiveNarrative(riskLevel, openAlerts, detections, affectedAssets, failedJobs),
            []);
    }

    private static GeneratedReportSectionResponse BuildTopRisksSection(ReportBuildContext context)
    {
        var alertRows = context.Alerts
            .OrderByDescending(x => SeverityRank(x.Severity))
            .ThenByDescending(x => x.LastDetectedAtUtc)
            .Take(8)
            .Select(alert => Row(
                ("severity", alert.Severity.ToString()),
                ("status", alert.Status.ToString()),
                ("title", alert.Title),
                ("target", alert.TargetDisplay),
                ("lastSeen", FormatUtc(alert.LastDetectedAtUtc))))
            .ToArray();

        var topRiskHighlights = alertRows.Length == 0
            ? new[] { "No alert rows matched the selected scope." }
            : [$"{alertRows.Length} highest-priority alert(s) are listed by severity and recency."];

        return new GeneratedReportSectionResponse(
            "Top Risks",
            "Prioritized alert pressure ranked by severity, status, affected target, and last detection time.",
            [
                Metric("Critical alerts", context.Alerts.Count(x => x.Severity == AlertSeverity.Critical).ToString(CultureInfo.InvariantCulture), "Critical items in the selected scope."),
                Metric("High alerts", context.Alerts.Count(x => x.Severity == AlertSeverity.High).ToString(CultureInfo.InvariantCulture), "High-severity items in the selected scope."),
                Metric("Investigating", context.Alerts.Count(x => x.Status == AlertStatus.Investigating).ToString(CultureInfo.InvariantCulture), "Alerts already in analyst workflow."),
                Metric("Linked alerts", context.Alerts.Count.ToString(CultureInfo.InvariantCulture), "Alerts attached to this report snapshot."),
            ],
            topRiskHighlights,
            "This section is intended to be the handoff list for a lead analyst: it keeps the highest-value items visible before the supporting evidence tables.",
            [
                Table(
                    "Prioritized alert queue",
                    [Col("severity", "Severity"), Col("status", "Status"), Col("title", "Alert"), Col("target", "Target"), Col("lastSeen", "Last seen")],
                    alertRows),
            ]);
    }

    private static GeneratedReportSectionResponse BuildAffectedAssetsSection(ReportBuildContext context)
    {
        var targetLookup = context.Targets.ToDictionary(x => x.Id, x => x);
        var assetRows = context.ScanResults
            .GroupBy(x => x.TargetServerId)
            .Select(group =>
            {
                targetLookup.TryGetValue(group.Key, out var target);
                var detections = group.Count(x => x.Disposition == ScanResultDisposition.Detection);
                var latest = group.Max(x => x.LastObservedAtUtc);
                return new
                {
                    TargetId = group.Key,
                    Target = target,
                    Total = group.Count(),
                    Detections = detections,
                    Latest = latest,
                    Families = string.Join(", ", group.Select(x => x.ScannerFamily).Distinct().OrderBy(x => x)),
                };
            })
            .OrderByDescending(x => x.Detections)
            .ThenByDescending(x => x.Latest)
            .Take(10)
            .Select(row => Row(
                ("asset", row.Target is null ? ShortId(row.TargetId) : FormatTarget(row.Target)),
                ("environment", row.Target?.Environment ?? "Unknown"),
                ("connectivity", row.Target?.ConnectivityStatus.ToString() ?? "Unknown"),
                ("detections", row.Detections.ToString(CultureInfo.InvariantCulture)),
                ("results", row.Total.ToString(CultureInfo.InvariantCulture)),
                ("families", string.IsNullOrWhiteSpace(row.Families) ? "n/a" : row.Families),
                ("lastSeen", FormatUtc(row.Latest))))
            .ToArray();

        return new GeneratedReportSectionResponse(
            "Affected Assets",
            "Asset-centric view of detection pressure, scanner coverage, and latest observed activity.",
            [
                Metric("Targets in scope", context.Targets.Count.ToString(CultureInfo.InvariantCulture), "Inventory targets matching the builder scope."),
                Metric("Targets with detections", context.ScanResults.Where(x => x.Disposition == ScanResultDisposition.Detection).Select(x => x.TargetServerId).Distinct().Count().ToString(CultureInfo.InvariantCulture), "Distinct assets with detection results."),
                Metric("Reachable targets", context.Targets.Count(x => x.ConnectivityStatus is ConnectivityStatus.Online or ConnectivityStatus.Degraded).ToString(CultureInfo.InvariantCulture), "Targets currently online or degraded."),
                Metric("Unscanned inventory", Math.Max(0, context.Targets.Select(x => x.Id).Distinct().Count() - context.ScanResults.Select(x => x.TargetServerId).Distinct().Count()).ToString(CultureInfo.InvariantCulture), "Scoped inventory without matching scan results in this report."),
            ],
            assetRows.Length == 0
                ? ["No target-linked scan results matched the selected scope."]
                : ["Rows are ordered by detection count, then most recent activity."],
            "Use this section to decide where containment, validation, or targeted rescanning should start.",
            [
                Table(
                    "Asset exposure table",
                    [Col("asset", "Asset"), Col("environment", "Environment"), Col("connectivity", "Connectivity"), Col("detections", "Detections"), Col("results", "Results"), Col("families", "Families"), Col("lastSeen", "Last seen")],
                    assetRows),
            ]);
    }

    private static GeneratedReportSectionResponse BuildEvidenceSection(ReportBuildContext context)
    {
        var iocLookup = context.Iocs.ToDictionary(x => x.Id, x => x);
        var evidenceRows = context.ScanResults
            .OrderByDescending(x => x.Disposition == ScanResultDisposition.Detection)
            .ThenByDescending(x => x.LastObservedAtUtc)
            .Take(12)
            .Select(result =>
            {
                iocLookup.TryGetValue(result.IocId ?? Guid.Empty, out var ioc);
                var rule = result.RuleRevisionId.HasValue && context.RuleLookup.TryGetValue(result.RuleRevisionId.Value, out var ruleBrief)
                    ? ruleBrief
                    : null;
                return Row(
                    ("disposition", result.Disposition.ToString()),
                    ("scanner", result.ScannerFamily),
                    ("indicator", ioc is null ? "No IOC link" : $"{ioc.Type}: {ioc.Value}"),
                    ("rule", rule is null ? ShortId(result.RuleRevisionId) : $"{rule.RuleName} {rule.VersionLabel}"),
                    ("confidence", result.Confidence.ToString("P0", CultureInfo.InvariantCulture)),
                    ("occurrences", result.OccurrenceCount.ToString(CultureInfo.InvariantCulture)),
                    ("lastSeen", FormatUtc(result.LastObservedAtUtc)));
            })
            .ToArray();

        var sourceHighlights = context.Iocs
            .GroupBy(x => context.FeedSourceLookup.TryGetValue(x.FeedSourceId, out var name) ? name : "Unknown source")
            .OrderByDescending(x => x.Count())
            .Take(3)
            .Select(x => $"{x.Key}: {x.Count()} IOC(s)")
            .ToArray();

        return new GeneratedReportSectionResponse(
            "IOC And Rule Evidence",
            "Detection evidence combining IOC inventory, scanner results, and rule revision metadata.",
            [
                Metric("IOC rows", context.Iocs.Count.ToString(CultureInfo.InvariantCulture), "Stored indicators in scope."),
                Metric("Linked detections", context.ScanResults.Count(x => x.IocId.HasValue).ToString(CultureInfo.InvariantCulture), "Scan results connected to an IOC id."),
                Metric("Rule-linked results", context.ScanResults.Count(x => x.RuleRevisionId.HasValue).ToString(CultureInfo.InvariantCulture), "Scan results connected to a rule revision."),
                Metric("High-severity IOCs", context.Iocs.Count(x => x.Severity is AlertSeverity.High or AlertSeverity.Critical).ToString(CultureInfo.InvariantCulture), "High or critical indicators in scope."),
            ],
            sourceHighlights.Length > 0
                ? sourceHighlights
                : ["No IOC source breakdown is available for the selected scope."],
            "This section is built for analyst review: it keeps the observable, rule context, confidence, and recurrence count in one place.",
            [
                Table(
                    "Evidence table",
                    [Col("disposition", "Disposition"), Col("scanner", "Scanner"), Col("indicator", "Indicator"), Col("rule", "Rule"), Col("confidence", "Confidence"), Col("occurrences", "Occurrences"), Col("lastSeen", "Last seen")],
                    evidenceRows),
            ]);
    }

    private static GeneratedReportSectionResponse BuildScanTimelineSection(ReportBuildContext context)
    {
        var timelineRows = context.ScanJobs
            .OrderByDescending(x => x.CompletedAtUtc ?? x.StartedAtUtc ?? x.QueuedAtUtc)
            .Take(12)
            .Select(job => Row(
                ("time", FormatUtc(job.CompletedAtUtc ?? job.StartedAtUtc ?? job.QueuedAtUtc)),
                ("status", job.Status.ToString()),
                ("trigger", job.TriggerSource),
                ("summary", string.IsNullOrWhiteSpace(job.Summary) ? "No summary recorded" : job.Summary),
                ("job", ShortId(job.Id))))
            .ToArray();
        var familyRows = context.ScanResults
            .GroupBy(x => x.ScannerFamily)
            .OrderByDescending(x => x.Count())
            .Take(8)
            .Select(group => Row(
                ("family", group.Key),
                ("results", group.Count().ToString(CultureInfo.InvariantCulture)),
                ("detections", group.Count(x => x.Disposition == ScanResultDisposition.Detection).ToString(CultureInfo.InvariantCulture)),
                ("lastSeen", FormatUtc(group.Max(x => x.LastObservedAtUtc)))))
            .ToArray();

        return new GeneratedReportSectionResponse(
            "Scan Activity Timeline",
            "Recent execution sequence and scanner-family signal distribution for the selected scope.",
            [
                Metric("Queued jobs", context.ScanJobs.Count.ToString(CultureInfo.InvariantCulture), "Scan jobs matching the report filters."),
                Metric("Completed jobs", context.ScanJobs.Count(x => x.Status == ScanJobStatus.Completed).ToString(CultureInfo.InvariantCulture), "Jobs that completed successfully."),
                Metric("Failed jobs", context.ScanJobs.Count(x => x.Status == ScanJobStatus.Failed).ToString(CultureInfo.InvariantCulture), "Jobs that ended in failure."),
                Metric("Scanner families", context.ScanResults.Select(x => x.ScannerFamily).Distinct().Count().ToString(CultureInfo.InvariantCulture), "Distinct scanner families represented in results."),
            ],
            context.ScanJobs.Count == 0
                ? ["No scan jobs matched this report scope."]
                : ["Timeline rows are ordered by most recent terminal or started time."],
            "Use this section to separate real exposure from coverage gaps caused by failed or missing scan execution.",
            [
                Table(
                    "Execution timeline",
                    [Col("time", "Time"), Col("status", "Status"), Col("trigger", "Trigger"), Col("summary", "Summary"), Col("job", "Job")],
                    timelineRows),
                Table(
                    "Scanner family distribution",
                    [Col("family", "Family"), Col("results", "Results"), Col("detections", "Detections"), Col("lastSeen", "Last seen")],
                    familyRows),
            ]);
    }

    private static GeneratedReportSectionResponse BuildRecommendedActionsSection(ReportBuildContext context)
    {
        var recommendations = BuildRecommendedActions(context);
        return new GeneratedReportSectionResponse(
            "Recommended Actions",
            "Operational next steps generated deterministically from alert severity, detections, affected assets, and coverage gaps.",
            [
                Metric("Actions", recommendations.Length.ToString(CultureInfo.InvariantCulture), "Recommended actions included in this report."),
                Metric("Critical/high alerts", context.Alerts.Count(x => x.Severity is AlertSeverity.Critical or AlertSeverity.High).ToString(CultureInfo.InvariantCulture), "Alerts requiring lead attention."),
                Metric("Failed scans", context.ScanJobs.Count(x => x.Status == ScanJobStatus.Failed).ToString(CultureInfo.InvariantCulture), "Failed jobs that can hide coverage gaps."),
                Metric("Detection assets", context.ScanResults.Where(x => x.Disposition == ScanResultDisposition.Detection).Select(x => x.TargetServerId).Distinct().Count().ToString(CultureInfo.InvariantCulture), "Targets that should be prioritized."),
            ],
            recommendations,
            "These recommendations are rules-based for now. Future LLM enrichment can turn this same structured evidence into a richer narrative, but the data contract is already prepared for that layer.",
            []);
    }

    private static GeneratedReportSectionResponse BuildScopeAppendixSection(ReportBuildContext context)
    {
        var powerBiRows = context.PowerBiCatalog.Visualizations
            .Take(8)
            .Select(visual => Row(
                ("title", visual.Title),
                ("workspace", visual.WorkspaceName),
                ("status", visual.Status),
                ("configured", visual.IsConfigured ? "Yes" : "No"),
                ("tags", visual.Tags.Count == 0 ? "n/a" : string.Join(", ", visual.Tags))))
            .ToArray();

        return new GeneratedReportSectionResponse(
            "Scope And Analytics Appendix",
            "Report filter boundary, source-system coverage, and related Power BI visualization metadata.",
            [
                Metric("Window start", FormatUtc(context.FromUtc), "Lower UTC bound selected in the builder."),
                Metric("Window end", FormatUtc(context.ToUtc), "Upper UTC bound selected in the builder."),
                Metric("Power BI status", context.PowerBiCatalog.Status, context.PowerBiCatalog.Message),
                Metric("Visualizations", context.PowerBiCatalog.Visualizations.Count.ToString(CultureInfo.InvariantCulture), "Authorized Power BI visualization references available for this report."),
            ],
            [
                $"Scanner filter: {context.ScannerFamily ?? "all families"}.",
                $"Severity filter: {context.Severity?.ToString() ?? "all severities"}. Alert status filter: {context.AlertStatus?.ToString() ?? "all statuses"}.",
                $"IOC filter: {context.IocType?.ToString() ?? "all IOC types"}. Source filter: {context.Source ?? "all sources"}.",
            ],
            "This appendix keeps the report auditable: readers can see the exact filter shape and the analytics surfaces that can be used for follow-up.",
            [
                Table(
                    "Power BI references",
                    [Col("title", "Visualization"), Col("workspace", "Workspace"), Col("status", "Status"), Col("configured", "Configured"), Col("tags", "Tags")],
                    powerBiRows),
            ]);
    }

    private static string BuildExecutiveNarrative(string riskLevel, int openAlerts, int detections, int affectedAssets, int failedJobs)
    {
        if (openAlerts == 0 && detections == 0)
        {
            return "No active alert or detection pressure was found in the selected scope. Treat this as a clean operational slice only if scan coverage is current and complete.";
        }

        return $"Current posture is {riskLevel.ToLowerInvariant()} with {openAlerts} active alert(s), {detections} detection result(s), and {affectedAssets} affected asset(s). Failed scan jobs in scope: {failedJobs}.";
    }

    private static string[] BuildRecommendedActions(ReportBuildContext context)
    {
        var actions = new List<string>();
        var highPriorityAlerts = context.Alerts.Count(x =>
            (x.Severity is AlertSeverity.Critical or AlertSeverity.High)
            && (x.Status is AlertStatus.Open or AlertStatus.Investigating));
        var detectionTargets = context.ScanResults
            .Where(x => x.Disposition == ScanResultDisposition.Detection)
            .Select(x => x.TargetServerId)
            .Distinct()
            .Count();
        var failedJobs = context.ScanJobs.Count(x => x.Status == ScanJobStatus.Failed);

        if (highPriorityAlerts > 0)
        {
            actions.Add($"Triage {highPriorityAlerts} high-priority alert(s) first and assign owners before broad reporting.");
        }

        if (detectionTargets > 0)
        {
            actions.Add($"Run containment validation or targeted rescans on {detectionTargets} asset(s) with detection results.");
        }

        if (failedJobs > 0)
        {
            actions.Add($"Review {failedJobs} failed scan job(s) because coverage gaps can understate exposure.");
        }

        if (context.ScanResults.Any(x => x.IocId.HasValue) && context.Iocs.Count == 0)
        {
            actions.Add("Reconcile normalized IOC inventory with scan-result IOC links; the report has detections but no matching IOC rows in scope.");
        }

        if (context.PowerBiCatalog.Visualizations.Any(x => x.IsConfigured))
        {
            actions.Add("Use the configured Power BI visualization references in the appendix for trend validation before executive distribution.");
        }
        else if (context.PowerBiCatalog.Visualizations.Count > 0)
        {
            actions.Add("Finish Power BI embed configuration so report readers can pivot from this snapshot into live analytics.");
        }

        if (actions.Count == 0)
        {
            actions.Add("Maintain monitoring cadence and regenerate this report after the next scheduled scan window.");
        }

        return actions.Take(5).ToArray();
    }

    private static string ResolveRiskLevel(int criticalAlerts, int highAlerts, int detections, int affectedAssets, int failedJobs)
    {
        if (criticalAlerts > 0 || affectedAssets >= 5 || detections >= 25)
        {
            return "Critical";
        }

        if (highAlerts > 0 || affectedAssets >= 2 || detections >= 5 || failedJobs >= 3)
        {
            return "Elevated";
        }

        return detections > 0 || failedJobs > 0 ? "Guarded" : "Low";
    }

    private static int SeverityRank(AlertSeverity severity) => severity switch
    {
        AlertSeverity.Critical => 4,
        AlertSeverity.High => 3,
        AlertSeverity.Medium => 2,
        _ => 1,
    };

    private static GeneratedReportMetricResponse Metric(string label, string value, string detail)
        => new(label, value, detail);

    private static GeneratedReportTableColumnResponse Col(string key, string label)
        => new(key, label);

    private static GeneratedReportTableRowResponse Row(params (string Key, string? Value)[] values)
        => new(values.ToDictionary(x => x.Key, x => string.IsNullOrWhiteSpace(x.Value) ? "n/a" : x.Value!));

    private static GeneratedReportTableResponse Table(
        string title,
        IReadOnlyList<GeneratedReportTableColumnResponse> columns,
        IReadOnlyList<GeneratedReportTableRowResponse> rows)
        => new(title, columns, rows);

    private static string FormatTarget(TargetServer target)
        => string.IsNullOrWhiteSpace(target.Hostname)
            ? $"{target.IpAddress} ({ShortId(target.Id)})"
            : $"{target.Hostname} ({target.IpAddress})";

    private static string FormatUtc(DateTimeOffset? value)
        => value.HasValue ? value.Value.UtcDateTime.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture) : "n/a";

    private static string ShortId(Guid? id)
        => id.HasValue ? id.Value.ToString("N")[..8] : "n/a";

    private sealed record ReportRuleBrief(
        Guid RuleRevisionId,
        string RuleName,
        string RuleFamily,
        string VersionLabel,
        string Status);

    private sealed record ReportBuildContext(
        ReportType ReportType,
        IReadOnlyList<Alert> Alerts,
        IReadOnlyList<Ioc> Iocs,
        IReadOnlyList<TargetServer> Targets,
        IReadOnlyList<ScanResult> ScanResults,
        IReadOnlyList<ScanJob> ScanJobs,
        IReadOnlyDictionary<Guid, string> FeedSourceLookup,
        IReadOnlyDictionary<Guid, ReportRuleBrief> RuleLookup,
        PowerBiVisualizationCatalogResponse PowerBiCatalog,
        DateTimeOffset? FromUtc,
        DateTimeOffset? ToUtc,
        string? ScannerFamily,
        AlertSeverity? Severity,
        AlertStatus? AlertStatus,
        IocType? IocType,
        string? Source);
}
