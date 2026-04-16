using System.Globalization;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private async Task<IReadOnlyList<LegacyPipelineReportSectionResponse>> BuildReportSectionsAsync(
        LegacyPipelineGenerateReportRequest request,
        CancellationToken cancellationToken)
    {
        var reportType = LegacyScanPipelineHelpers.NormalizeReportType(request.ReportType);
        var targetId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.TargetId, nameof(request.TargetId));
        var networkId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.NetworkId, nameof(request.NetworkId));
        var jobId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.JobId, nameof(request.JobId));
        var scannerFamily = LegacyScanPipelineHelpers.CleanOrNull(request.ScannerFamily)?.ToUpperInvariant();

        var results = _dbContext.ScanResults.AsNoTracking().AsQueryable();
        if (jobId.HasValue) results = results.Where(item => item.JobId == jobId.Value);
        if (targetId.HasValue) results = results.Where(item => item.TargetId == targetId.Value);
        if (scannerFamily is not null) results = results.Where(item => item.ScannerType == scannerFamily);

        if (networkId.HasValue)
        {
            var targetIds = await _dbContext.Targets.AsNoTracking()
                .Where(target => target.NetworkId == networkId.Value)
                .Select(target => target.TargetId)
                .ToArrayAsync(cancellationToken);
            results = results.Where(item => item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value));
        }

        var resultRows = await results.ToArrayAsync(cancellationToken);
        var resultIds = resultRows.Select(item => item.ResultId).ToArray();
        var iocRows = await _dbContext.Iocs.AsNoTracking()
            .Where(item => item.ResultId.HasValue && resultIds.Contains(item.ResultId.Value))
            .ToArrayAsync(cancellationToken);

        return reportType switch
        {
            "DetailedIocReport" => BuildDetailedIocSections(iocRows),
            "TargetExposureSummary" => await BuildTargetExposureSections(targetId, networkId, iocRows.Length, cancellationToken),
            "ScanActivitySummary" => BuildScanActivitySections(resultRows),
            _ => await BuildExecutiveSections(resultRows, iocRows, cancellationToken),
        };
    }

    private async Task<IReadOnlyList<LegacyPipelineReportSectionResponse>> BuildExecutiveSections(
        IReadOnlyList<LegacyPipelineScanResultEntity> resultRows,
        IReadOnlyList<LegacyPipelineIocEntity> iocRows,
        CancellationToken cancellationToken)
    {
        return
        [
            new LegacyPipelineReportSectionResponse(
                "Executive Summary",
                "High-level counts across stored scan jobs, scan results, and indicators.",
                [
                    new LegacyPipelineReportSectionMetricResponse("Scan Jobs", (await _dbContext.ScanJobs.CountAsync(cancellationToken)).ToString(CultureInfo.InvariantCulture), "Jobs currently stored for the selected scope."),
                    new LegacyPipelineReportSectionMetricResponse("Scan Results", resultRows.Count.ToString(CultureInfo.InvariantCulture), "Stored per-target execution results in scope."),
                    new LegacyPipelineReportSectionMetricResponse("Indicators", iocRows.Count.ToString(CultureInfo.InvariantCulture), "IOC findings linked to the selected scope."),
                ],
                iocRows
                    .Select(item => item.RuleName)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .GroupBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .OrderByDescending(group => group.Count())
                    .Take(8)
                    .Select(group => $"{group.Key} ({group.Count()})")
                    .ToArray())
        ];
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildDetailedIocSections(IReadOnlyList<LegacyPipelineIocEntity> iocRows)
    {
        return
        [
            new LegacyPipelineReportSectionResponse(
                "Detailed IOC Report",
                "IOC-heavy view grouped by scanner family and matched rule names.",
                [
                    new LegacyPipelineReportSectionMetricResponse("Total IOCs", iocRows.Count.ToString(CultureInfo.InvariantCulture), "All indicators inside the selected scope."),
                    new LegacyPipelineReportSectionMetricResponse("YARA", iocRows.Count(item => item.ScannerType == "YARA").ToString(CultureInfo.InvariantCulture), "Host file hits."),
                    new LegacyPipelineReportSectionMetricResponse("Sigma", iocRows.Count(item => item.ScannerType == "SIGMA").ToString(CultureInfo.InvariantCulture), "Log and event detections."),
                    new LegacyPipelineReportSectionMetricResponse("Network", iocRows.Count(item => item.ScannerType is "SNORT" or "SURICATA").ToString(CultureInfo.InvariantCulture), "Network detections."),
                ],
                iocRows
                    .Select(item => $"{item.RuleName} on {LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(item.TargetServer)}")
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(8)
                    .ToArray())
        ];
    }

    private async Task<IReadOnlyList<LegacyPipelineReportSectionResponse>> BuildTargetExposureSections(int? targetId, int? networkId, int findingsCount, CancellationToken cancellationToken)
    {
        var targetsQuery = _dbContext.Targets.AsNoTracking().AsQueryable();
        if (targetId.HasValue) targetsQuery = targetsQuery.Where(item => item.TargetId == targetId.Value);
        if (networkId.HasValue) targetsQuery = targetsQuery.Where(item => item.NetworkId == networkId.Value);
        var targets = await targetsQuery.ToArrayAsync(cancellationToken);

        return
        [
            new LegacyPipelineReportSectionResponse(
                "Target Exposure Summary",
                "Inventory posture and recent findings for the selected targets or subnet.",
                [
                    new LegacyPipelineReportSectionMetricResponse("Targets", targets.Length.ToString(CultureInfo.InvariantCulture), "Targets in the selected scope."),
                    new LegacyPipelineReportSectionMetricResponse("Online", targets.Count(item => item.Status == "Online").ToString(CultureInfo.InvariantCulture), "Targets currently marked online."),
                    new LegacyPipelineReportSectionMetricResponse("Offline", targets.Count(item => item.Status == "Offline").ToString(CultureInfo.InvariantCulture), "Targets currently marked offline."),
                    new LegacyPipelineReportSectionMetricResponse("Linked Findings", findingsCount.ToString(CultureInfo.InvariantCulture), "Indicators linked through stored scan results."),
                ],
                targets.Take(8).Select(item => $"{LegacyScanPipelineHelpers.ResolveTargetPrimaryLabel(item)} [{item.Status ?? "Unknown"}]").ToArray())
        ];
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildScanActivitySections(IReadOnlyList<LegacyPipelineScanResultEntity> resultRows)
    {
        return
        [
            new LegacyPipelineReportSectionResponse(
                "Scan Activity Summary",
                "Execution posture across stored scan results and status outcomes.",
                [
                    new LegacyPipelineReportSectionMetricResponse("Results", resultRows.Count.ToString(CultureInfo.InvariantCulture), "Stored per-target results."),
                    new LegacyPipelineReportSectionMetricResponse("Succeeded", resultRows.Count(item => item.Status == "Succeeded").ToString(CultureInfo.InvariantCulture), "Stored successful findings results."),
                    new LegacyPipelineReportSectionMetricResponse("NoFindings", resultRows.Count(item => item.Status == "NoFindings").ToString(CultureInfo.InvariantCulture), "Stored clean results."),
                    new LegacyPipelineReportSectionMetricResponse("Failed", resultRows.Count(item => item.Status == "Failed").ToString(CultureInfo.InvariantCulture), "Stored failed results."),
                ],
                resultRows
                    .OrderByDescending(item => item.FinishedAt ?? item.StartedAt)
                    .Take(8)
                    .Select(item => $"{item.ScannerType}: {item.Status} ({item.NoOfFindings ?? 0} findings)")
                    .ToArray())
        ];
    }

}
