using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private const string AlertQueueOwnerUserId = "unassigned";
    private const string AlertPromotionActorUserId = "legacy-pipeline";

    private sealed record PromotableIocCandidate(
        LegacyPipelinePersistedIoc Ioc,
        string ScannerFamily,
        AlertSeverity Severity,
        string RuleName,
        string TargetDisplay,
        DateTimeOffset DetectedAtUtc);

    private async Task PromoteIocsToAlertsAsync(
        LegacyPipelineTargetEntity target,
        IReadOnlyList<LegacyPipelinePersistedIoc> iocs,
        CancellationToken cancellationToken)
    {
        if (iocs.Count == 0)
        {
            return;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var freshnessFloorUtc = nowUtc.AddHours(-24);
        var candidates = iocs
            .Select(ioc => BuildPromotableCandidate(target, ioc))
            .Where(candidate => candidate is not null && candidate.DetectedAtUtc >= freshnessFloorUtc)
            .Cast<PromotableIocCandidate>()
            .ToArray();

        if (candidates.Length == 0)
        {
            return;
        }

        var candidateIocIds = candidates.Select(candidate => candidate.Ioc.Id).ToArray();
        var matchingRuleNames = candidates.Select(item => item.RuleName).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var matchingFamilies = candidates.Select(item => item.ScannerFamily).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var existingAlerts = await _ctiDbContext.AlertsV2
            .Where(alert => alert.TargetId == target.TargetId
                && matchingRuleNames.Contains(alert.RuleName)
                && matchingFamilies.Contains(alert.ScannerFamily))
            .OrderByDescending(alert => alert.LastDetectedAtUtc)
            .ToListAsync(cancellationToken);

        var existingAlertLinks = await _ctiDbContext.AlertIocs
            .Where(link => candidateIocIds.Contains(link.IocId))
            .Select(link => new { link.AlertId, link.IocId })
            .ToListAsync(cancellationToken);

        var chosenAlerts = new Dictionary<string, Alert>(StringComparer.OrdinalIgnoreCase);
        foreach (var candidate in candidates.OrderBy(item => item.DetectedAtUtc))
        {
            var dedupeKey = BuildAlertDedupeKey(target.TargetId, candidate.ScannerFamily, candidate.RuleName);
            if (!chosenAlerts.TryGetValue(dedupeKey, out var alert))
            {
                alert = ResolveAlertForCandidate(existingAlerts, target.TargetId, candidate, nowUtc);
                chosenAlerts[dedupeKey] = alert;
            }
            else
            {
                alert.RefreshDetection(
                    BuildAlertTitle(candidate),
                    BuildAlertSummary(candidate),
                    candidate.Severity,
                    candidate.DetectedAtUtc,
                    AlertPromotionActorUserId,
                    nowUtc);
            }

            if (existingAlertLinks.Any(link => link.AlertId == alert.Id && link.IocId == candidate.Ioc.Id))
            {
                continue;
            }

            _ctiDbContext.AlertIocs.Add(AlertIoc.Create(alert.Id, candidate.Ioc.Id, nowUtc));
            existingAlertLinks.Add(new { AlertId = alert.Id, IocId = candidate.Ioc.Id });
        }

        await _ctiDbContext.SaveChangesAsync(cancellationToken);
    }

    private Alert ResolveAlertForCandidate(
        IReadOnlyList<Alert> existingAlerts,
        int targetId,
        PromotableIocCandidate candidate,
        DateTimeOffset nowUtc)
    {
        var title = BuildAlertTitle(candidate);
        var summary = BuildAlertSummary(candidate);
        var matchingAlerts = existingAlerts
            .Where(alert => alert.TargetId == targetId
                && string.Equals(alert.ScannerFamily, candidate.ScannerFamily, StringComparison.OrdinalIgnoreCase)
                && string.Equals(alert.RuleName, candidate.RuleName, StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var activeAlert = matchingAlerts.FirstOrDefault(alert => alert.Status is AlertStatus.Open or AlertStatus.Investigating);
        if (activeAlert is not null)
        {
            activeAlert.RefreshDetection(title, summary, candidate.Severity, candidate.DetectedAtUtc, AlertPromotionActorUserId, nowUtc);
            return activeAlert;
        }

        var resolvedAlert = matchingAlerts.FirstOrDefault(alert => alert.Status == AlertStatus.Resolved);
        if (resolvedAlert is not null)
        {
            resolvedAlert.RefreshDetection(title, summary, candidate.Severity, candidate.DetectedAtUtc, AlertPromotionActorUserId, nowUtc);
            resolvedAlert.SetStatus(AlertStatus.Open, AlertPromotionActorUserId, nowUtc);
            return resolvedAlert;
        }

        var created = Alert.Create(
            title,
            summary,
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
        _ctiDbContext.AlertsV2.Add(created);
        return created;
    }

    private static PromotableIocCandidate? BuildPromotableCandidate(LegacyPipelineTargetEntity target, LegacyPipelinePersistedIoc ioc)
    {
        if (!RuleFamilyCatalog.TryNormalize(ioc.ScannerType, out var normalizedFamily))
        {
            return null;
        }

        var severity = ResolveAlertPromotionSeverity(ioc);
        if (severity is not AlertSeverity.High and not AlertSeverity.Critical)
        {
            return null;
        }

        var ruleName = string.IsNullOrWhiteSpace(ioc.RuleName) ? "unknown" : ioc.RuleName.Trim();
        return new PromotableIocCandidate(
            ioc,
            normalizedFamily,
            severity,
            ruleName,
            LegacyScanPipelineHelpers.BuildTargetDisplay(target),
            ioc.TimestampUtc);
    }

    private static AlertSeverity ResolveAlertPromotionSeverity(LegacyPipelinePersistedIoc ioc)
    {
        if (ioc.SigmaDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.SigmaDetail.Severity);
        }

        if (ioc.NetworkDetail is not null)
        {
            return NormalizeAlertSeverity(ioc.NetworkDetail.Severity);
        }

        return AlertSeverity.Low;
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

    private static string BuildAlertDedupeKey(int targetId, string scannerFamily, string ruleName)
        => $"{targetId}:{scannerFamily}:{ruleName}".ToLowerInvariant();

    private static string BuildAlertTitle(PromotableIocCandidate candidate)
        => $"{candidate.ScannerFamily.ToUpperInvariant()} {candidate.RuleName} on {candidate.TargetDisplay}";

    private static string BuildAlertSummary(PromotableIocCandidate candidate)
        => $"{candidate.Severity} severity {candidate.ScannerFamily.ToUpperInvariant()} finding '{candidate.RuleName}' matched on {candidate.TargetDisplay}.";
}
