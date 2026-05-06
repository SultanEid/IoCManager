using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private const string PromoteYaraHighTestingEnvironmentVariable = "IOC_MANAGER_PROMOTE_YARA_HIGH_FOR_TESTING";
    private const string AlertQueueOwnerUserId = "unassigned";
    private const string AlertPromotionActorUserId = "legacy-pipeline";
    private const int AlertTitleMaxLength = 200;
    private const int AlertSummaryMaxLength = 4000;
    private const int AlertRuleNameMaxLength = 255;

    internal sealed record FindingAlertCandidate(
        LegacyPipelinePersistedIoc Ioc,
        int? TargetId,
        string ScannerFamily,
        AlertSeverity Severity,
        string RuleName,
        string TargetDisplay,
        string IndicatorValue,
        string IndicatorKind,
        DateTimeOffset DetectedAtUtc);

    private async Task PromoteIocsToAlertsAsync(
        LegacyPipelineTargetEntity target,
        LegacyPipelineScanJobEntity job,
        IReadOnlyList<LegacyPipelinePersistedIoc> iocs,
        CancellationToken cancellationToken)
    {
        if (iocs.Count == 0)
        {
            return;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var candidates = BuildFindingAlertCandidates(target, iocs);

        if (candidates.Count == 0)
        {
            return;
        }

        var scanCandidates = await BuildScanFindingAlertCandidatesAsync(job, cancellationToken);
        if (scanCandidates.Count == 0)
        {
            scanCandidates = candidates;
        }

        var candidateIocIds = candidates.Select(candidate => candidate.Ioc.Id).ToArray();
        var linkedIocIds = await _ctiDbContext.AlertIocs
            .Where(link => candidateIocIds.Contains(link.IocId))
            .Select(link => link.IocId)
            .ToListAsync(cancellationToken);
        var linkedIocIdSet = linkedIocIds.ToHashSet();
        var unlinkedCandidates = ExcludeLinkedCandidates(candidates, linkedIocIdSet);

        if (unlinkedCandidates.Count == 0)
        {
            return;
        }

        var alert = await FindExistingScanAlertAsync(job, cancellationToken);
        if (alert is null)
        {
            alert = CreateScanAlert(job.BatchId, job.JobId, scanCandidates, nowUtc);
            _ctiDbContext.AlertsV2.Add(alert);
        }
        else
        {
            RefreshScanAlert(alert, job.BatchId, job.JobId, scanCandidates, nowUtc);
        }

        foreach (var candidate in unlinkedCandidates.OrderBy(item => item.DetectedAtUtc))
        {
            _ctiDbContext.AlertIocs.Add(AlertIoc.Create(alert.Id, candidate.Ioc.Id, nowUtc));
        }

        await _ctiDbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Alert?> FindExistingScanAlertAsync(
        LegacyPipelineScanJobEntity job,
        CancellationToken cancellationToken)
    {
        var scanResultIds = await ResolveScanResultIdsAsync(job, cancellationToken);
        if (scanResultIds.Length == 0)
        {
            return null;
        }

        var scanIocIds = await _dbContext.Iocs
            .AsNoTracking()
            .Where(ioc => ioc.ResultId.HasValue && scanResultIds.Contains(ioc.ResultId.Value))
            .Select(ioc => ioc.Id)
            .ToArrayAsync(cancellationToken);
        if (scanIocIds.Length == 0)
        {
            return null;
        }

        var alertId = await _ctiDbContext.AlertIocs
            .AsNoTracking()
            .Where(link => scanIocIds.Contains(link.IocId))
            .OrderBy(link => link.LinkedAtUtc)
            .Select(link => (Guid?)link.AlertId)
            .FirstOrDefaultAsync(cancellationToken);

        return alertId.HasValue
            ? await _ctiDbContext.AlertsV2.FirstOrDefaultAsync(alert => alert.Id == alertId.Value, cancellationToken)
            : null;
    }

    private async Task<IReadOnlyList<FindingAlertCandidate>> BuildScanFindingAlertCandidatesAsync(
        LegacyPipelineScanJobEntity job,
        CancellationToken cancellationToken)
    {
        var scanResultIds = await ResolveScanResultIdsAsync(job, cancellationToken);
        if (scanResultIds.Length == 0)
        {
            return [];
        }

        var results = await _dbContext.ScanResults
            .AsNoTracking()
            .Where(result => scanResultIds.Contains(result.ResultId))
            .ToArrayAsync(cancellationToken);
        var resultsById = results.ToDictionary(result => result.ResultId);
        var targetIds = results
            .Where(result => result.TargetId.HasValue)
            .Select(result => result.TargetId!.Value)
            .Distinct()
            .ToArray();
        var targetsById = targetIds.Length == 0
            ? new Dictionary<int, LegacyPipelineTargetEntity>()
            : await _dbContext.Targets
                .AsNoTracking()
                .Where(target => targetIds.Contains(target.TargetId))
                .ToDictionaryAsync(target => target.TargetId, cancellationToken);

        var persistedIocs = await _dbContext.Iocs
            .AsNoTracking()
            .Where(ioc => ioc.ResultId.HasValue && scanResultIds.Contains(ioc.ResultId.Value))
            .Include(ioc => ioc.YaraDetail)
            .Include(ioc => ioc.SigmaDetail)
            .Include(ioc => ioc.NetworkDetail)
            .ToArrayAsync(cancellationToken);

        return persistedIocs
            .Select(ioc =>
            {
                LegacyPipelineTargetEntity? target = null;
                if (ioc.ResultId.HasValue
                    && resultsById.TryGetValue(ioc.ResultId.Value, out var result)
                    && result.TargetId.HasValue)
                {
                    targetsById.TryGetValue(result.TargetId.Value, out target);
                }

                target ??= new LegacyPipelineTargetEntity
                {
                    TargetId = 0,
                    DisplayName = ioc.TargetServer,
                    IPAddress = ioc.TargetServer,
                    TargetOsType = ioc.TargetOsType,
                };
                return BuildFindingAlertCandidate(target, ioc);
            })
            .Where(candidate => candidate is not null)
            .Cast<FindingAlertCandidate>()
            .OrderBy(candidate => candidate.DetectedAtUtc)
            .ToArray();
    }

    private async Task<int[]> ResolveScanResultIdsAsync(
        LegacyPipelineScanJobEntity job,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ScanResults.AsNoTracking().AsQueryable();
        query = job.BatchId.HasValue
            ? from result in query
              join scanJob in _dbContext.ScanJobs.AsNoTracking() on result.JobId equals scanJob.JobId
              where scanJob.BatchId == job.BatchId
              select result
            : query.Where(result => result.JobId == job.JobId);

        return await query
            .Select(result => result.ResultId)
            .Distinct()
            .ToArrayAsync(cancellationToken);
    }

    internal static IReadOnlyList<FindingAlertCandidate> ExcludeLinkedCandidates(
        IReadOnlyList<FindingAlertCandidate> candidates,
        ISet<Guid> linkedIocIds)
        => candidates
            .Where(candidate => !linkedIocIds.Contains(candidate.Ioc.Id))
            .OrderBy(candidate => candidate.DetectedAtUtc)
            .ToArray();

    internal static Alert CreateScanAlert(
        Guid? batchId,
        int? jobId,
        IReadOnlyList<FindingAlertCandidate> candidates,
        DateTimeOffset nowUtc)
    {
        if (candidates.Count == 0)
        {
            throw new ArgumentException("At least one IOC candidate is required.", nameof(candidates));
        }

        var title = BuildScanAlertTitle(candidates, batchId, jobId);
        var summary = BuildScanAlertSummary(candidates, batchId, jobId);
        var severity = ResolveGroupedAlertSeverity(candidates);
        var firstCandidate = candidates.OrderBy(candidate => candidate.DetectedAtUtc).First();
        var lastCandidate = candidates.OrderByDescending(candidate => candidate.DetectedAtUtc).First();
        var alert = Alert.Create(
            title,
            summary,
            severity,
            AlertQueueOwnerUserId,
            string.Empty,
            null,
            "Analyst",
            ResolveGroupedScannerFamily(candidates),
            ResolveGroupedTargetId(candidates),
            ResolveGroupedTargetDisplay(candidates),
            ResolveGroupedAlertRuleName(candidates),
            firstCandidate.DetectedAtUtc,
            AlertPromotionActorUserId,
            nowUtc);
        if (lastCandidate.DetectedAtUtc > firstCandidate.DetectedAtUtc)
        {
            alert.RefreshDetection(title, summary, severity, lastCandidate.DetectedAtUtc, AlertPromotionActorUserId, nowUtc);
        }

        return alert;
    }

    internal static void RefreshScanAlert(
        Alert alert,
        Guid? batchId,
        int? jobId,
        IReadOnlyList<FindingAlertCandidate> candidates,
        DateTimeOffset nowUtc)
    {
        if (candidates.Count == 0)
        {
            throw new ArgumentException("At least one IOC candidate is required.", nameof(candidates));
        }

        var firstCandidate = candidates.OrderBy(candidate => candidate.DetectedAtUtc).First();
        var lastCandidate = candidates.OrderByDescending(candidate => candidate.DetectedAtUtc).First();
        alert.RefreshScanContext(
            BuildScanAlertTitle(candidates, batchId, jobId),
            BuildScanAlertSummary(candidates, batchId, jobId),
            ResolveGroupedAlertSeverity(candidates),
            ResolveGroupedScannerFamily(candidates),
            ResolveGroupedTargetId(candidates),
            ResolveGroupedTargetDisplay(candidates),
            ResolveGroupedAlertRuleName(candidates),
            firstCandidate.DetectedAtUtc,
            lastCandidate.DetectedAtUtc,
            AlertPromotionActorUserId,
            nowUtc);
    }

    internal static IReadOnlyList<FindingAlertCandidate> BuildFindingAlertCandidates(
        LegacyPipelineTargetEntity target,
        IReadOnlyList<LegacyPipelinePersistedIoc> iocs)
        => iocs
            .Select(ioc => BuildFindingAlertCandidate(target, ioc))
            .Where(candidate => candidate is not null)
            .Cast<FindingAlertCandidate>()
            .ToArray();

    private static FindingAlertCandidate? BuildFindingAlertCandidate(LegacyPipelineTargetEntity target, LegacyPipelinePersistedIoc ioc)
    {
        if (!RuleFamilyCatalog.TryNormalize(ioc.ScannerType, out var normalizedFamily))
        {
            return null;
        }

        var (indicatorValue, indicatorKind) = ResolveFindingIndicator(normalizedFamily, ioc);
        return new FindingAlertCandidate(
            ioc,
            target.TargetId == 0 ? null : target.TargetId,
            normalizedFamily,
            ResolveFindingAlertSeverity(ioc),
            Truncate(string.IsNullOrWhiteSpace(ioc.RuleName) ? "unknown" : ioc.RuleName.Trim(), AlertRuleNameMaxLength),
            LegacyScanPipelineHelpers.BuildTargetDisplay(target),
            indicatorValue,
            indicatorKind,
            ioc.TimestampUtc);
    }

    private static FindingAlertCandidate? BuildFindingAlertCandidate(LegacyPipelineTargetEntity target, LegacyPipelineIocEntity ioc)
    {
        if (!RuleFamilyCatalog.TryNormalize(ioc.ScannerType, out var normalizedFamily))
        {
            return null;
        }

        var (indicatorValue, indicatorKind) = ResolveFindingIndicator(normalizedFamily, ioc);
        return new FindingAlertCandidate(
            new LegacyPipelinePersistedIoc(
                ioc.Id,
                DateTime.SpecifyKind(ioc.TimestampUtc, DateTimeKind.Utc),
                ioc.ScannerType,
                ioc.TargetServer,
                ioc.TargetOsType,
                ioc.RuleName,
                ioc.RawPayload ?? "{}",
                ioc.YaraDetail is null ? null : new LegacyPipelinePersistedYaraDetail(ioc.YaraDetail.FilePath, ioc.YaraDetail.FileHash),
                ioc.SigmaDetail is null ? null : new LegacyPipelinePersistedSigmaDetail(ioc.SigmaDetail.LogSource, ioc.SigmaDetail.Severity, ioc.SigmaDetail.CommandLine),
                ioc.NetworkDetail is null ? null : new LegacyPipelinePersistedNetworkDetail(ioc.NetworkDetail.SourceIP, ioc.NetworkDetail.DestIP, ioc.NetworkDetail.Protocol, ioc.NetworkDetail.Severity, ioc.NetworkDetail.FlowId)),
            target.TargetId == 0 ? null : target.TargetId,
            normalizedFamily,
            ResolveFindingAlertSeverity(ioc),
            Truncate(string.IsNullOrWhiteSpace(ioc.RuleName) ? "unknown" : ioc.RuleName.Trim(), AlertRuleNameMaxLength),
            LegacyScanPipelineHelpers.BuildTargetDisplay(target),
            indicatorValue,
            indicatorKind,
            DateTime.SpecifyKind(ioc.TimestampUtc, DateTimeKind.Utc));
    }

    internal static AlertSeverity ResolveFindingAlertSeverity(LegacyPipelinePersistedIoc ioc)
    {
        if (string.Equals(ioc.ScannerType, "YARA", StringComparison.OrdinalIgnoreCase)
            && IsYaraHighSeverityTestingOverrideEnabled())
        {
            // Local testing override: promote legacy YARA matches as High so Aegis auto-plan flows can be exercised
            // without changing the default production/test expectation.
            return AlertSeverity.High;
        }

        if (ioc.SigmaDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.SigmaDetail.Severity);
        }

        if (ioc.NetworkDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.NetworkDetail.Severity);
        }

        return AlertSeverity.Medium;
    }

    private static AlertSeverity ResolveFindingAlertSeverity(LegacyPipelineIocEntity ioc)
    {
        if (string.Equals(ioc.ScannerType, "YARA", StringComparison.OrdinalIgnoreCase)
            && IsYaraHighSeverityTestingOverrideEnabled())
        {
            return AlertSeverity.High;
        }

        if (ioc.SigmaDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.SigmaDetail.Severity);
        }

        if (ioc.NetworkDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.NetworkDetail.Severity);
        }

        return AlertSeverity.Medium;
    }

    private static bool IsYaraHighSeverityTestingOverrideEnabled()
        => string.Equals(
            Environment.GetEnvironmentVariable(PromoteYaraHighTestingEnvironmentVariable),
            "true",
            StringComparison.OrdinalIgnoreCase);

    private static (string Value, string Kind) ResolveFindingIndicator(string normalizedFamily, LegacyPipelinePersistedIoc ioc)
    {
        if (string.Equals(normalizedFamily, "yara", StringComparison.OrdinalIgnoreCase))
        {
            return (
                FirstNonEmpty(ioc.YaraDetail?.FileHash, ioc.YaraDetail?.FilePath, ioc.RawPayload, ioc.RuleName),
                ioc.YaraDetail?.FileHash is null ? "file" : "file_hash");
        }

        if (string.Equals(normalizedFamily, "sigma", StringComparison.OrdinalIgnoreCase))
        {
            return (FirstNonEmpty(ioc.SigmaDetail?.CommandLine, ioc.RawPayload, ioc.RuleName), "event");
        }

        var networkIndicator = string.IsNullOrWhiteSpace(ioc.NetworkDetail?.SourceIp) && string.IsNullOrWhiteSpace(ioc.NetworkDetail?.DestIp)
            ? FirstNonEmpty(ioc.RawPayload, ioc.RuleName)
            : $"{FirstNonEmpty(ioc.NetworkDetail?.SourceIp, "unknown")} -> {FirstNonEmpty(ioc.NetworkDetail?.DestIp, "unknown")}";
        return (networkIndicator, "network");
    }

    private static (string Value, string Kind) ResolveFindingIndicator(string normalizedFamily, LegacyPipelineIocEntity ioc)
    {
        if (string.Equals(normalizedFamily, "yara", StringComparison.OrdinalIgnoreCase))
        {
            return (
                FirstNonEmpty(ioc.YaraDetail?.FileHash, ioc.YaraDetail?.FilePath, ioc.RawPayload, ioc.RuleName),
                ioc.YaraDetail?.FileHash is null ? "file" : "file_hash");
        }

        if (string.Equals(normalizedFamily, "sigma", StringComparison.OrdinalIgnoreCase))
        {
            return (FirstNonEmpty(ioc.SigmaDetail?.CommandLine, ioc.RawPayload, ioc.RuleName), "event");
        }

        var networkIndicator = string.IsNullOrWhiteSpace(ioc.NetworkDetail?.SourceIP) && string.IsNullOrWhiteSpace(ioc.NetworkDetail?.DestIP)
            ? FirstNonEmpty(ioc.RawPayload, ioc.RuleName)
            : $"{FirstNonEmpty(ioc.NetworkDetail?.SourceIP, "unknown")} -> {FirstNonEmpty(ioc.NetworkDetail?.DestIP, "unknown")}";
        return (networkIndicator, "network");
    }

    private static AlertSeverity NormalizeAlertSeverity(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return AlertSeverity.Low;
        }

        var normalized = rawValue.Trim();
        if (int.TryParse(normalized, out var numeric))
        {
            return numeric switch
            {
                <= 1 => AlertSeverity.Critical,
                2 => AlertSeverity.High,
                3 => AlertSeverity.Medium,
                _ => AlertSeverity.Low,
            };
        }

        return normalized.ToLowerInvariant() switch
        {
            "critical" or "crit" => AlertSeverity.Critical,
            "high" => AlertSeverity.High,
            "medium" or "med" => AlertSeverity.Medium,
            "low" => AlertSeverity.Low,
            _ => AlertSeverity.Low,
        };
    }

    internal static AlertSeverity ResolveGroupedAlertSeverity(IReadOnlyList<FindingAlertCandidate> candidates)
        => candidates.Max(candidate => candidate.Severity);

    internal static string ResolveGroupedScannerFamily(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        var families = candidates
            .Select(candidate => candidate.ScannerFamily)
            .Where(family => !string.IsNullOrWhiteSpace(family))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return families.Length == 1 ? families[0] : "mixed";
    }

    internal static int? ResolveGroupedTargetId(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        var targetIds = candidates
            .Where(candidate => candidate.TargetId.HasValue)
            .Select(candidate => candidate.TargetId!.Value)
            .Distinct()
            .ToArray();

        return targetIds.Length == 1 && candidates.All(candidate => candidate.TargetId == targetIds[0])
            ? targetIds[0]
            : null;
    }

    internal static string ResolveGroupedTargetDisplay(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        var targetDisplays = candidates
            .Select(candidate => candidate.TargetDisplay)
            .Where(display => !string.IsNullOrWhiteSpace(display))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return targetDisplays.Length == 1 ? targetDisplays[0] : "Multiple targets";
    }

    internal static string ResolveGroupedAlertRuleName(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        var ruleNames = candidates
            .Select(candidate => candidate.RuleName)
            .Where(ruleName => !string.IsNullOrWhiteSpace(ruleName))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return ruleNames.Length == 1 ? Truncate(ruleNames[0], AlertRuleNameMaxLength) : "Multiple rules";
    }

    private static string BuildScanAlertTitle(
        IReadOnlyList<FindingAlertCandidate> candidates,
        Guid? batchId,
        int? jobId)
    {
        var scannerFamily = ResolveGroupedScannerFamily(candidates);
        var scannerLabel = string.Equals(scannerFamily, "mixed", StringComparison.OrdinalIgnoreCase)
            ? "Mixed scanner"
            : scannerFamily.ToUpperInvariant();
        return Truncate(
            $"{scannerLabel} findings on {ResolveGroupedTargetDisplay(candidates)} ({BuildScanLabel(batchId, jobId)})",
            AlertTitleMaxLength);
    }

    private static string BuildScanAlertSummary(
        IReadOnlyList<FindingAlertCandidate> candidates,
        Guid? batchId,
        int? jobId)
    {
        var severity = ResolveGroupedAlertSeverity(candidates);
        var scannerFamilies = candidates
            .Select(candidate => candidate.ScannerFamily.ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(family => family, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var targetCount = candidates
            .Select(candidate => candidate.TargetDisplay)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();
        return Truncate(
            $"{candidates.Count} IOC finding(s) from {string.Join(", ", scannerFamilies)} in {BuildScanLabel(batchId, jobId)} across {targetCount} target(s). "
            + $"Highest severity: {severity}. Matched rules: {BuildGroupedRuleSummary(candidates)}.",
            AlertSummaryMaxLength);
    }

    private static string BuildScanLabel(Guid? batchId, int? jobId)
        => batchId.HasValue
            ? $"scan {batchId.Value.ToString("D")[..8]}"
            : jobId.HasValue
                ? $"scan job {jobId.Value}"
                : "scan";

    private static string BuildGroupedRuleSummary(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        const int maxRules = 5;
        var ruleNames = candidates
            .Select(candidate => candidate.RuleName)
            .Where(ruleName => !string.IsNullOrWhiteSpace(ruleName))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(ruleName => ruleName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (ruleNames.Length == 0)
        {
            return "unknown";
        }

        var visibleRules = ruleNames.Take(maxRules);
        var suffix = ruleNames.Length > maxRules ? $"; +{ruleNames.Length - maxRules} more" : string.Empty;
        return string.Join("; ", visibleRules) + suffix;
    }

    private static string FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return "unknown";
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}
