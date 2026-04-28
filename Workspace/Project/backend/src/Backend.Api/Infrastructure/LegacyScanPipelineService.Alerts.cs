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

        foreach (var candidate in candidates.OrderBy(item => item.DetectedAtUtc))
        {
            if (linkedIocIdSet.Contains(candidate.Ioc.Id))
            {
                continue;
            }

            var alert = CreateFindingAlert(target.TargetId, resultId, candidate, nowUtc);
            _ctiDbContext.AlertsV2.Add(alert);

            _ctiDbContext.AlertIocs.Add(AlertIoc.Create(alert.Id, candidate.Ioc.Id, nowUtc));
            linkedIocIdSet.Add(candidate.Ioc.Id);
        }

        await _ctiDbContext.SaveChangesAsync(cancellationToken);
    }

    private static Alert CreateFindingAlert(
        int targetId,
        int resultId,
        FindingAlertCandidate candidate,
        DateTimeOffset nowUtc)
    {
        return Alert.Create(
            BuildFindingAlertTitle(candidate, resultId),
            BuildFindingAlertSummary(candidate, resultId),
            candidate.Severity,
            AlertQueueOwnerUserId,
            "Analyst",
            candidate.ScannerFamily,
            targetId,
            candidate.TargetDisplay,
            candidate.RuleName,
            candidate.DetectedAtUtc,
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

    private static string BuildFindingAlertTitle(FindingAlertCandidate candidate, int resultId)
        => Truncate(
            $"Case alert: {candidate.ScannerFamily.ToUpperInvariant()} {candidate.RuleName} on {candidate.TargetDisplay} (scan {resultId})",
            AlertTitleMaxLength);

    private static string BuildFindingAlertSummary(FindingAlertCandidate candidate, int resultId)
        => Truncate(
            $"{candidate.Severity} severity {candidate.ScannerFamily.ToUpperInvariant()} finding from scan result {resultId}. "
            + $"Rule '{candidate.RuleName}' matched {candidate.IndicatorKind} '{candidate.IndicatorValue}' on {candidate.TargetDisplay}.",
            AlertSummaryMaxLength);

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
