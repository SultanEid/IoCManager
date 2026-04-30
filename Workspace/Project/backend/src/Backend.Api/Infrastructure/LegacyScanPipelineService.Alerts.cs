using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private const string AlertQueueOwnerUserId = "unassigned";
    private const string AlertPromotionActorUserId = "legacy-pipeline";
    private const int AlertTitleMaxLength = 200;
    private const int AlertSummaryMaxLength = 4000;
    private const int AlertRuleNameMaxLength = 255;

    internal sealed record FindingAlertCandidate(
        LegacyPipelinePersistedIoc Ioc,
        string ScannerFamily,
        AlertSeverity Severity,
        string RuleName,
        string TargetDisplay,
        string IndicatorValue,
        string IndicatorKind,
        DateTimeOffset DetectedAtUtc);

    private async Task PromoteIocsToAlertsAsync(
        LegacyPipelineTargetEntity target,
        int? jobId,
        int resultId,
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

        var alert = CreateScanResultAlert(target.TargetId, jobId, resultId, unlinkedCandidates, nowUtc);
        _ctiDbContext.AlertsV2.Add(alert);
        foreach (var candidate in unlinkedCandidates.OrderBy(item => item.DetectedAtUtc))
        {
            _ctiDbContext.AlertIocs.Add(AlertIoc.Create(alert.Id, candidate.Ioc.Id, nowUtc));
        }

        await _ctiDbContext.SaveChangesAsync(cancellationToken);
    }

    internal static IReadOnlyList<FindingAlertCandidate> ExcludeLinkedCandidates(
        IReadOnlyList<FindingAlertCandidate> candidates,
        ISet<Guid> linkedIocIds)
        => candidates
            .Where(candidate => !linkedIocIds.Contains(candidate.Ioc.Id))
            .OrderBy(candidate => candidate.DetectedAtUtc)
            .ToArray();

    internal static Alert CreateScanResultAlert(
        int? targetId,
        int? jobId,
        int resultId,
        IReadOnlyList<FindingAlertCandidate> candidates,
        DateTimeOffset nowUtc)
    {
        if (candidates.Count == 0)
        {
            throw new ArgumentException("At least one IOC candidate is required.", nameof(candidates));
        }

        var title = BuildScanResultAlertTitle(candidates, jobId, resultId);
        var summary = BuildScanResultAlertSummary(candidates, jobId, resultId);
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
            firstCandidate.ScannerFamily,
            targetId,
            firstCandidate.TargetDisplay,
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
            normalizedFamily,
            ResolveFindingAlertSeverity(ioc),
            Truncate(string.IsNullOrWhiteSpace(ioc.RuleName) ? "unknown" : ioc.RuleName.Trim(), AlertRuleNameMaxLength),
            LegacyScanPipelineHelpers.BuildTargetDisplay(target),
            indicatorValue,
            indicatorKind,
            ioc.TimestampUtc);
    }

    internal static AlertSeverity ResolveFindingAlertSeverity(LegacyPipelinePersistedIoc ioc)
    {
        if (string.Equals(ioc.ScannerType, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            // Temporary testing override: promote legacy YARA matches as High so Aegis auto-plan flows can be exercised.
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

    internal static string ResolveGroupedAlertRuleName(IReadOnlyList<FindingAlertCandidate> candidates)
    {
        var ruleNames = candidates
            .Select(candidate => candidate.RuleName)
            .Where(ruleName => !string.IsNullOrWhiteSpace(ruleName))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return ruleNames.Length == 1 ? Truncate(ruleNames[0], AlertRuleNameMaxLength) : "Multiple rules";
    }

    private static string BuildScanResultAlertTitle(
        IReadOnlyList<FindingAlertCandidate> candidates,
        int? jobId,
        int resultId)
    {
        var firstCandidate = candidates[0];
        var jobFragment = jobId.HasValue ? $"job {jobId.Value}, " : string.Empty;
        return Truncate(
            $"{firstCandidate.ScannerFamily.ToUpperInvariant()} findings on {firstCandidate.TargetDisplay} ({jobFragment}result {resultId})",
            AlertTitleMaxLength);
    }

    private static string BuildScanResultAlertSummary(
        IReadOnlyList<FindingAlertCandidate> candidates,
        int? jobId,
        int resultId)
    {
        var firstCandidate = candidates[0];
        var severity = ResolveGroupedAlertSeverity(candidates);
        var jobFragment = jobId.HasValue ? $" for job {jobId.Value}" : string.Empty;
        return Truncate(
            $"{candidates.Count} IOC finding(s) from {firstCandidate.ScannerFamily.ToUpperInvariant()} scan result {resultId}{jobFragment} on {firstCandidate.TargetDisplay}. "
            + $"Highest severity: {severity}. Matched rules: {BuildGroupedRuleSummary(candidates)}.",
            AlertSummaryMaxLength);
    }

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
