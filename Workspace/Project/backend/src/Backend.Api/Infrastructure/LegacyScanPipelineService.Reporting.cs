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
        var severity = LegacyScanPipelineHelpers.NormalizeSeverityValue(request.Severity);
        var status = LegacyScanPipelineHelpers.CleanOrNull(request.Status);
        var fromDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(request.FromUtc);
        var toDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(request.ToUtc);

        if (fromDate.HasValue && toDate.HasValue && fromDate > toDate)
        {
            throw new ArgumentException("'fromUtc' must be less than or equal to 'toUtc'.");
        }

        var targetsQuery = _dbContext.Targets.AsNoTracking()
            .Where(target => !LegacyScanPipelineHelpers.ExcludedTargetAddresses.Contains(target.IPAddress));
        if (targetId.HasValue) targetsQuery = targetsQuery.Where(target => target.TargetId == targetId.Value);
        if (networkId.HasValue) targetsQuery = targetsQuery.Where(target => target.NetworkId == networkId.Value);

        var targets = await targetsQuery.OrderBy(target => target.IPAddress).ToArrayAsync(cancellationToken);
        var targetIds = targets.Select(target => target.TargetId).ToArray();
        var targetLookup = targets.ToDictionary(target => target.TargetId);
        var targetByIp = targets.ToDictionary(target => target.IPAddress, StringComparer.OrdinalIgnoreCase);

        var resultsQuery = _dbContext.ScanResults.AsNoTracking().AsQueryable();
        if (jobId.HasValue) resultsQuery = resultsQuery.Where(item => item.JobId == jobId.Value);
        if (targetId.HasValue) resultsQuery = resultsQuery.Where(item => item.TargetId == targetId.Value);
        if (networkId.HasValue) resultsQuery = resultsQuery.Where(item => item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value));
        if (scannerFamily is not null) resultsQuery = resultsQuery.Where(item => item.ScannerType == scannerFamily);
        if (status is not null) resultsQuery = resultsQuery.Where(item => item.Status == status);
        if (fromDate.HasValue)
        {
            var fromUtc = fromDate.Value.UtcDateTime;
            resultsQuery = resultsQuery.Where(item => (item.FinishedAt ?? item.StartedAt) != null && (item.FinishedAt ?? item.StartedAt) >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = toDate.Value.UtcDateTime;
            resultsQuery = resultsQuery.Where(item => (item.FinishedAt ?? item.StartedAt) != null && (item.FinishedAt ?? item.StartedAt) <= toUtc);
        }

        var results = await resultsQuery.OrderByDescending(item => item.FinishedAt ?? item.StartedAt).ToArrayAsync(cancellationToken);
        var resultLookup = results.ToDictionary(item => item.ResultId);
        var resultIds = results.Select(item => item.ResultId).ToArray();

        var iocs = resultIds.Length == 0
            ? Array.Empty<LegacyPipelineIocEntity>()
            : await _dbContext.Iocs.AsNoTracking()
                .Include(item => item.YaraDetail)
                .Include(item => item.SigmaDetail)
                .Include(item => item.NetworkDetail)
                .Where(item => item.ResultId.HasValue && resultIds.Contains(item.ResultId.Value))
                .Where(item => !fromDate.HasValue || item.TimestampUtc >= fromDate.Value.UtcDateTime)
                .Where(item => !toDate.HasValue || item.TimestampUtc <= toDate.Value.UtcDateTime)
                .OrderByDescending(item => item.TimestampUtc)
                .ToArrayAsync(cancellationToken);
        if (severity is not null)
        {
            iocs = iocs.Where(item => ResolveReportIocSeverity(item) == severity).ToArray();
        }

        var scopedJobCount = await ResolveScopedJobCountAsync(
            jobId,
            fromDate,
            toDate,
            results,
            targetId.HasValue || networkId.HasValue || scannerFamily is not null || status is not null,
            cancellationToken);

        var context = new ReportContext(
            await ResolveReportScopeLabelAsync(request, cancellationToken),
            BuildTimeWindowLabel(fromDate, toDate),
            scannerFamily ?? "All scanners",
            severity ?? "All severities",
            status ?? "All result statuses",
            targets,
            targetLookup,
            targetByIp,
            results,
            resultLookup,
            iocs,
            scopedJobCount,
            targets.Select(item => item.NetworkId).Where(item => item.HasValue).Select(item => item!.Value).Distinct().Count());

        return reportType switch
        {
            "DetailedIocReport" => BuildDetailedIocSections(context),
            "TargetExposureSummary" => BuildTargetExposureSections(context),
            "ScanActivitySummary" => BuildScanActivitySections(context),
            _ => BuildExecutiveSections(context),
        };
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildExecutiveSections(ReportContext c)
    {
        var sev = BuildSeverityCounts(c.Iocs);
        return
        [
            new("Executive Summary",
                $"This snapshot covers {c.ScopeLabel} across {c.TimeWindowLabel.ToLowerInvariant()} and summarizes persisted scan activity, target exposure, and normalized findings.",
                [
                    new("Targets In Scope", c.Targets.Count.ToString(CultureInfo.InvariantCulture), "Non-reserved targets represented in this report."),
                    new("Jobs In Scope", c.ScopedJobCount.ToString(CultureInfo.InvariantCulture), "Stored scan jobs relevant to the selected scope."),
                    new("Results In Scope", c.Results.Count.ToString(CultureInfo.InvariantCulture), "Per-target result rows in scope."),
                    new("Findings In Scope", c.Iocs.Count.ToString(CultureInfo.InvariantCulture), "Normalized IOC rows in scope."),
                    new("Critical / High", (sev.Critical + sev.High).ToString(CultureInfo.InvariantCulture), "Highest-priority findings in scope."),
                ],
                [
                    $"Severity mix: {BuildSeveritySummary(sev)}",
                    $"Scanner distribution: {BuildScannerSummary(c.Iocs)}",
                    $"Top rules: {string.Join("; ", BuildTopRuleLines(c, 3))}"
                ]),
            BuildScopeSection(c),
            new("Risk and Exposure Highlights",
                "These highlights surface the most active rules, the most exposed targets, and the main operational gaps visible in the stored evidence.",
                [
                    new("Targets With Findings", BuildTargetsWithFindingsCount(c).ToString(CultureInfo.InvariantCulture), "Targets linked to one or more findings."),
                    new("Failed Results", c.Results.Count(item => string.Equals(item.Status, "Failed", StringComparison.OrdinalIgnoreCase)).ToString(CultureInfo.InvariantCulture), "Result rows that ended in failure."),
                    new("Offline Targets", c.Targets.Count(item => string.Equals(item.Status, "Offline", StringComparison.OrdinalIgnoreCase)).ToString(CultureInfo.InvariantCulture), "Targets currently marked offline."),
                    new("Distinct Rules", c.Iocs.Select(item => item.RuleName).Where(item => !string.IsNullOrWhiteSpace(item)).Distinct(StringComparer.OrdinalIgnoreCase).Count().ToString(CultureInfo.InvariantCulture), "Unique rules represented by current findings."),
                ],
                BuildTopRuleLines(c, 5).Concat(BuildTopTargetLines(c, 4)).ToArray()),
            new("Recommended Actions",
                "These actions are prioritized from the current evidence and intended to support analyst and lead review.",
                [],
                BuildRecommendations(c))
        ];
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildDetailedIocSections(ReportContext c)
    {
        var sev = BuildSeverityCounts(c.Iocs);
        return
        [
            new("Detection Overview",
                "This report emphasizes normalized IOC evidence, rule concentration, and the targets or scanners generating the most signal.",
                [
                    new("Total Findings", c.Iocs.Count.ToString(CultureInfo.InvariantCulture), "Normalized IOC rows in scope."),
                    new("Targets Impacted", BuildTargetsWithFindingsCount(c).ToString(CultureInfo.InvariantCulture), "Targets linked to at least one finding."),
                    new("High / Critical", (sev.High + sev.Critical).ToString(CultureInfo.InvariantCulture), "Highest-priority findings in scope."),
                    new("Distinct Rules", c.Iocs.Select(item => item.RuleName).Where(item => !string.IsNullOrWhiteSpace(item)).Distinct(StringComparer.OrdinalIgnoreCase).Count().ToString(CultureInfo.InvariantCulture), "Unique rule names represented here."),
                ],
                BuildTopRuleLines(c, 8)),
            BuildScopeSection(c),
            new("Finding Breakdown",
                "Severity and scanner-family distribution show where current evidence is concentrated and which engines are driving the dominant findings.",
                [
                    new("Critical", sev.Critical.ToString(CultureInfo.InvariantCulture), "Critical indicators in scope."),
                    new("High", sev.High.ToString(CultureInfo.InvariantCulture), "High-severity indicators in scope."),
                    new("Medium", sev.Medium.ToString(CultureInfo.InvariantCulture), "Medium-severity indicators in scope."),
                    new("Low / Unknown", (sev.Low + sev.Unknown).ToString(CultureInfo.InvariantCulture), "Low or unclassified indicators in scope."),
                ],
                BuildScannerLines(c)),
            new("Notable Evidence",
                "Representative examples from the newest matching IOC rows are included below for quick analyst review.",
                [],
                BuildEvidenceLines(c, 10)),
            new("Recommended Actions",
                "Recommendations reflect the density, quality, and operational context of the selected findings.",
                [],
                BuildRecommendations(c))
        ];
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildTargetExposureSections(ReportContext c)
    {
        var topTargets = BuildTopTargetRows(c, 8);
        var unknownOs = c.Targets.Count(item => string.IsNullOrWhiteSpace(item.TargetOsType));
        return
        [
            new("Exposure Overview",
                "This report focuses on inventory health, which targets carry the most findings, and where current discovery-backed posture still has blind spots.",
                [
                    new("Targets", c.Targets.Count.ToString(CultureInfo.InvariantCulture), "Targets represented in the selected scope."),
                    new("Targets With Findings", BuildTargetsWithFindingsCount(c).ToString(CultureInfo.InvariantCulture), "Targets linked to one or more findings."),
                    new("Offline Targets", c.Targets.Count(item => string.Equals(item.Status, "Offline", StringComparison.OrdinalIgnoreCase)).ToString(CultureInfo.InvariantCulture), "Targets currently marked offline."),
                    new("Unknown OS", unknownOs.ToString(CultureInfo.InvariantCulture), "Targets without a resolved OS type."),
                ],
                [
                    $"Scope includes {c.NetworkCount} subnet(s).",
                    topTargets.Count > 0 ? $"Most exposed targets: {string.Join("; ", topTargets.Take(3).Select(item => item.Summary))}" : "No findings-linked targets in scope."
                ]),
            BuildScopeSection(c),
            new("Target Posture",
                "The lines below combine target status, inventory context, and finding volume to highlight where review should begin.",
                [
                    new("Online", c.Targets.Count(item => string.Equals(item.Status, "Online", StringComparison.OrdinalIgnoreCase)).ToString(CultureInfo.InvariantCulture), "Targets marked online."),
                    new("Offline", c.Targets.Count(item => string.Equals(item.Status, "Offline", StringComparison.OrdinalIgnoreCase)).ToString(CultureInfo.InvariantCulture), "Targets marked offline."),
                    new("Findings Linked", c.Iocs.Count.ToString(CultureInfo.InvariantCulture), "Normalized findings tied to this scope."),
                    new("Average Findings / Target", c.Targets.Count == 0 ? "0.0" : (c.Iocs.Count / (double)c.Targets.Count).ToString("0.0", CultureInfo.InvariantCulture), "Average findings per target in scope."),
                ],
                topTargets.Select(item => item.Summary).ToArray()),
            new("Recommended Actions",
                "Recommendations emphasize exposure reduction, OS normalization, and recovery of offline coverage where needed.",
                [],
                BuildTargetRecommendations(c, topTargets, unknownOs))
        ];
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> BuildScanActivitySections(ReportContext c)
    {
        var succeeded = c.Results.Count(item => string.Equals(item.Status, "Succeeded", StringComparison.OrdinalIgnoreCase));
        var noFindings = c.Results.Count(item => string.Equals(item.Status, "NoFindings", StringComparison.OrdinalIgnoreCase));
        var failed = c.Results.Count(item => string.Equals(item.Status, "Failed", StringComparison.OrdinalIgnoreCase));
        var completionRate = c.Results.Count == 0 ? 0d : ((succeeded + noFindings) / (double)c.Results.Count) * 100d;

        return
        [
            new("Activity Overview",
                "This report summarizes scan throughput, execution quality, and where the pipeline is producing results versus operational friction.",
                [
                    new("Jobs In Scope", c.ScopedJobCount.ToString(CultureInfo.InvariantCulture), "Stored jobs relevant to the selected scope."),
                    new("Results", c.Results.Count.ToString(CultureInfo.InvariantCulture), "Per-target result rows in scope."),
                    new("Completion Rate", $"{completionRate:0.#}%", "Succeeded and no-findings results as a share of all results."),
                    new("Findings Produced", c.Iocs.Count.ToString(CultureInfo.InvariantCulture), "Normalized indicators generated by the selected activity."),
                ],
                BuildRecentResultLines(c, 8)),
            BuildScopeSection(c),
            new("Execution Outcomes",
                "Outcome distribution shows where the environment is producing signal, clean runs, or failure debt.",
                [
                    new("Succeeded", succeeded.ToString(CultureInfo.InvariantCulture), "Results that produced findings."),
                    new("No Findings", noFindings.ToString(CultureInfo.InvariantCulture), "Results that completed without findings."),
                    new("Failed", failed.ToString(CultureInfo.InvariantCulture), "Results that failed and may require rerun."),
                    new("Scanner Mix", c.Results.Select(item => item.ScannerType ?? "UNKNOWN").Distinct(StringComparer.OrdinalIgnoreCase).Count().ToString(CultureInfo.InvariantCulture), "Distinct scanner families represented."),
                ],
                BuildScannerExecutionLines(c)),
            new("Recommended Actions",
                "Recommendations focus on improving execution reliability and reducing failure-driven blind spots.",
                [],
                BuildScanRecommendations(c, failed, noFindings))
        ];
    }

    private static LegacyPipelineReportSectionResponse BuildScopeSection(ReportContext c)
        => new(
            "Scope and Methodology",
            "The report is generated from persisted ScanJob, ScanResult, Target, and IOC records after applying the selected scope and filter inputs.",
            [
                new("Scope", c.ScopeLabel, "Resolved scope label from job, target, or subnet filters."),
                new("Time Window", c.TimeWindowLabel, "UTC reporting window applied to results and findings."),
                new("Scanner Filter", c.ScannerFilterLabel, "Requested scanner-family filter."),
                new("Severity Filter", c.SeverityFilterLabel, "Requested severity filter for findings."),
                new("Status Filter", c.StatusFilterLabel, "Requested result-status filter."),
            ],
            [
                "Reserved infrastructure addresses are excluded from target inventory counts.",
                "Saved reports remain point-in-time snapshots when reopened from the library."
            ]);

    private async Task<string> ResolveReportScopeLabelAsync(
        LegacyPipelineGenerateReportRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request.JobId))
        {
            return $"Job {request.JobId}";
        }

        var targetId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.TargetId, nameof(request.TargetId));
        if (targetId.HasValue)
        {
            var target = await _dbContext.Targets.AsNoTracking()
                .FirstOrDefaultAsync(item => item.TargetId == targetId.Value, cancellationToken);
            return target is null
                ? $"Target {request.TargetId}"
                : LegacyScanPipelineHelpers.BuildTargetDisplay(target);
        }

        var networkId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.NetworkId, nameof(request.NetworkId));
        if (networkId.HasValue)
        {
            var network = await _dbContext.Networks.AsNoTracking()
                .FirstOrDefaultAsync(item => item.NetworkId == networkId.Value, cancellationToken);
            return network is null
                ? $"Subnet {request.NetworkId}"
                : $"{network.Name} ({network.SubNet})";
        }

        return "Global";
    }

    private static string BuildTimeWindowLabel(DateTimeOffset? fromDate, DateTimeOffset? toDate)
        => !fromDate.HasValue && !toDate.HasValue
            ? "all available time"
            : $"{(fromDate.HasValue ? fromDate.Value.ToString("u", CultureInfo.InvariantCulture) : "...")} to {(toDate.HasValue ? toDate.Value.ToString("u", CultureInfo.InvariantCulture) : "...")}";

    private static (int Critical, int High, int Medium, int Low, int Unknown) BuildSeverityCounts(IReadOnlyList<LegacyPipelineIocEntity> iocs)
    {
        var critical = 0; var high = 0; var medium = 0; var low = 0; var unknown = 0;
        foreach (var ioc in iocs)
        {
            switch (ResolveReportIocSeverity(ioc))
            {
                case "critical": critical++; break;
                case "high": high++; break;
                case "medium": medium++; break;
                case "low": low++; break;
                default: unknown++; break;
            }
        }

        return (critical, high, medium, low, unknown);
    }

    private static string BuildSeveritySummary((int Critical, int High, int Medium, int Low, int Unknown) s)
        => $"Critical {s.Critical}, High {s.High}, Medium {s.Medium}, Low {s.Low}, Unknown {s.Unknown}";

    private static string BuildScannerSummary(IReadOnlyList<LegacyPipelineIocEntity> iocs)
        => string.Join(", ", iocs.GroupBy(item => item.ScannerType ?? "UNKNOWN", StringComparer.OrdinalIgnoreCase).OrderByDescending(group => group.Count()).Take(3).Select(group => $"{group.Key} ({group.Count()})"));

    private static IReadOnlyList<string> BuildTopRuleLines(ReportContext c, int take)
        => c.Iocs.Where(item => !string.IsNullOrWhiteSpace(item.RuleName))
            .GroupBy(item => item.RuleName, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(group => group.Count())
            .Take(take)
            .Select(group => $"{group.Key} | {group.Count()} findings")
            .ToArray();

    private static IReadOnlyList<string> BuildScannerLines(ReportContext c)
        => c.Iocs.GroupBy(item => item.ScannerType ?? "UNKNOWN", StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(group => group.Count())
            .Take(6)
            .Select(group => $"{group.Key}: {group.Count()} findings | top rule {group.Where(item => !string.IsNullOrWhiteSpace(item.RuleName)).GroupBy(item => item.RuleName, StringComparer.OrdinalIgnoreCase).OrderByDescending(rule => rule.Count()).Select(rule => rule.Key).FirstOrDefault() ?? "none"}")
            .ToArray();

    private static IReadOnlyList<string> BuildEvidenceLines(ReportContext c, int take)
        => c.Iocs
            .Select(item => $"{FormatIocTimestamp(item)} | {item.ScannerType} | {SeverityLabel(SeverityRank(ResolveReportIocSeverity(item)))} | {item.RuleName} | {ResolveTargetLabel(c, item)} | {ResolveIndicatorValue(item)}")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(take)
            .ToArray();

    private static IReadOnlyList<TopTargetRow> BuildTopTargetRows(ReportContext c, int take)
        => c.Iocs.GroupBy(item => ResolveTargetLabel(c, item), StringComparer.OrdinalIgnoreCase)
            .Select(group => new TopTargetRow(group.Key, group.Count(), SeverityLabel(group.Max(item => SeverityRank(ResolveReportIocSeverity(item)))), $"{group.Key} | {group.Count()} findings | top severity {SeverityLabel(group.Max(item => SeverityRank(ResolveReportIocSeverity(item))))}"))
            .OrderByDescending(item => item.FindingCount)
            .Take(take)
            .ToArray();

    private static IReadOnlyList<string> BuildTopTargetLines(ReportContext c, int take)
        => BuildTopTargetRows(c, take).Select(item => item.Summary).ToArray();

    private static IReadOnlyList<string> BuildRecentResultLines(ReportContext c, int take)
        => c.Results.Take(take).Select(item => $"{item.ScannerType} | {item.Status} | {item.NoOfFindings ?? 0} findings | {FormatResultTimestamp(item)}").ToArray();

    private static IReadOnlyList<string> BuildScannerExecutionLines(ReportContext c)
        => c.Results.GroupBy(item => item.ScannerType ?? "UNKNOWN", StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(group => group.Count())
            .Take(6)
            .Select(group => $"{group.Key}: {group.Count()} results | {group.Sum(item => item.NoOfFindings ?? 0)} findings | {group.Count(item => string.Equals(item.Status, "Failed", StringComparison.OrdinalIgnoreCase))} failed")
            .ToArray();

    private static IReadOnlyList<string> BuildRecommendations(ReportContext c)
    {
        var sev = BuildSeverityCounts(c.Iocs);
        var items = new List<string>();
        if (sev.Critical + sev.High > 0) items.Add($"Prioritize review for {sev.Critical + sev.High} high-impact findings and confirm whether alert promotion or case follow-up is required.");
        var failed = c.Results.Count(item => string.Equals(item.Status, "Failed", StringComparison.OrdinalIgnoreCase));
        if (failed > 0) items.Add($"Review {failed} failed result(s) and rerun the affected jobs after fixing scanner, target, or credential issues.");
        var offline = c.Targets.Count(item => string.Equals(item.Status, "Offline", StringComparison.OrdinalIgnoreCase));
        if (offline > 0) items.Add($"Validate connectivity for {offline} offline target(s) so scheduled scans and reporting remain trustworthy.");
        if (c.Iocs.Count == 0) items.Add("No findings matched the selected scope; confirm the time window and filters before distributing this snapshot.");
        items.Add("Use IOC Explorer for deeper evidence review and keep this report as a point-in-time briefing artifact.");
        return items.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IReadOnlyList<string> BuildTargetRecommendations(ReportContext c, IReadOnlyList<TopTargetRow> topTargets, int unknownOs)
    {
        var items = new List<string>();
        if (topTargets.Count > 0) items.Add($"Start triage with the highest-density target: {topTargets[0].TargetLabel}.");
        if (unknownOs > 0) items.Add($"Resolve operating system metadata for {unknownOs} target(s) so OS-aware host scans remain accurate.");
        items.AddRange(BuildRecommendations(c));
        return items.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IReadOnlyList<string> BuildScanRecommendations(ReportContext c, int failed, int noFindings)
    {
        var items = new List<string>();
        if (failed > 0) items.Add($"Treat the {failed} failed result(s) as operational debt before the next reporting cycle.");
        if (noFindings > 0 && c.Iocs.Count == 0) items.Add("The selected activity window completed without findings; confirm that the scope truly reflects the intended detection window.");
        items.AddRange(BuildRecommendations(c).Where(item => failed == 0 || !item.Contains("failed result", StringComparison.OrdinalIgnoreCase)));
        return items.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static int BuildTargetsWithFindingsCount(ReportContext c)
        => c.Iocs.Select(item => ResolveTargetLabel(c, item)).Distinct(StringComparer.OrdinalIgnoreCase).Count();

    private static string ResolveTargetLabel(ReportContext c, LegacyPipelineIocEntity ioc)
    {
        if (ioc.ResultId.HasValue && c.ResultLookup.TryGetValue(ioc.ResultId.Value, out var result) && result.TargetId.HasValue && c.TargetLookup.TryGetValue(result.TargetId.Value, out var target))
        {
            return LegacyScanPipelineHelpers.BuildTargetDisplay(target);
        }

        var normalized = LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(ioc.TargetServer);
        if (c.TargetByIp.TryGetValue(normalized, out var byIp)) return LegacyScanPipelineHelpers.BuildTargetDisplay(byIp);
        if (LegacyScanPipelineHelpers.HardcodedTargetDisplayNames.TryGetValue(normalized, out var displayName)) return $"{displayName} ({normalized})";
        return string.IsNullOrWhiteSpace(normalized) ? "Unknown target" : normalized;
    }

    private static string ResolveIndicatorValue(LegacyPipelineIocEntity ioc)
    {
        if (!string.IsNullOrWhiteSpace(ioc.YaraDetail?.FilePath)) return ioc.YaraDetail.FilePath!;
        if (!string.IsNullOrWhiteSpace(ioc.NetworkDetail?.SourceIP) || !string.IsNullOrWhiteSpace(ioc.NetworkDetail?.DestIP)) return $"{ioc.NetworkDetail?.SourceIP ?? "unknown"} -> {ioc.NetworkDetail?.DestIP ?? "unknown"}";
        if (!string.IsNullOrWhiteSpace(ioc.SigmaDetail?.CommandLine)) return ioc.SigmaDetail.CommandLine!;
        var payload = ioc.RawPayload?.Replace("\r", " ", StringComparison.Ordinal).Replace("\n", " ", StringComparison.Ordinal).Trim() ?? "No payload detail";
        return payload.Length <= 120 ? payload : $"{payload[..117]}...";
    }

    private static string? ResolveReportIocSeverity(LegacyPipelineIocEntity item)
        => LegacyScanPipelineHelpers.NormalizeSeverityValue(item.SigmaDetail?.Severity ?? item.NetworkDetail?.Severity);

    private async Task<int> ResolveScopedJobCountAsync(
        int? jobId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        IReadOnlyList<LegacyPipelineScanResultEntity> resultRows,
        bool hasScopedFilters,
        CancellationToken cancellationToken)
    {
        if (jobId.HasValue)
        {
            return await _dbContext.ScanJobs.AsNoTracking().CountAsync(item => item.JobId == jobId.Value, cancellationToken);
        }

        var distinctJobIds = resultRows.Where(item => item.JobId.HasValue).Select(item => item.JobId!.Value).Distinct().ToArray();
        if (distinctJobIds.Length > 0) return distinctJobIds.Length;
        if (hasScopedFilters) return 0;

        var jobs = _dbContext.ScanJobs.AsNoTracking().AsQueryable();
        if (fromDate.HasValue)
        {
            var fromUtc = fromDate.Value.UtcDateTime;
            jobs = jobs.Where(item => item.QueuedAt.HasValue && item.QueuedAt.Value >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = toDate.Value.UtcDateTime;
            jobs = jobs.Where(item => item.QueuedAt.HasValue && item.QueuedAt.Value <= toUtc);
        }

        return await jobs.CountAsync(cancellationToken);
    }

    private static int SeverityRank(string? severity)
        => severity?.Trim().ToLowerInvariant() switch
        {
            "critical" => 4,
            "high" => 3,
            "medium" => 2,
            "low" => 1,
            _ => 0,
        };

    private static string SeverityLabel(int rank)
        => rank switch
        {
            4 => "Critical",
            3 => "High",
            2 => "Medium",
            1 => "Low",
            _ => "Unknown",
        };

    private static string FormatResultTimestamp(LegacyPipelineScanResultEntity result)
    {
        var timestamp = result.FinishedAt ?? result.StartedAt;
        return timestamp.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(timestamp.Value, DateTimeKind.Utc)).ToString("u", CultureInfo.InvariantCulture) : "timestamp unavailable";
    }

    private static string FormatIocTimestamp(LegacyPipelineIocEntity ioc)
        => ioc.TimestampUtc == default
            ? "timestamp unavailable"
            : new DateTimeOffset(DateTime.SpecifyKind(ioc.TimestampUtc, DateTimeKind.Utc)).ToString("u", CultureInfo.InvariantCulture);

    private sealed record ReportContext(
        string ScopeLabel,
        string TimeWindowLabel,
        string ScannerFilterLabel,
        string SeverityFilterLabel,
        string StatusFilterLabel,
        IReadOnlyList<LegacyPipelineTargetEntity> Targets,
        IReadOnlyDictionary<int, LegacyPipelineTargetEntity> TargetLookup,
        IReadOnlyDictionary<string, LegacyPipelineTargetEntity> TargetByIp,
        IReadOnlyList<LegacyPipelineScanResultEntity> Results,
        IReadOnlyDictionary<int, LegacyPipelineScanResultEntity> ResultLookup,
        IReadOnlyList<LegacyPipelineIocEntity> Iocs,
        int ScopedJobCount,
        int NetworkCount);

    private sealed record TopTargetRow(string TargetLabel, int FindingCount, string TopSeverity, string Summary);
}
