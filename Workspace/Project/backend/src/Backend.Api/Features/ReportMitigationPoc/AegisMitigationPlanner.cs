using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Features.ReportMitigationPoc;

public sealed class AegisMitigationPlanner
{
    private const string SummaryMarker = "aegisMitigationPlanVersion";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly CtiDbContext _dbContext;
    private readonly IAiReportMitigationClient _aiReportMitigationClient;

    public AegisMitigationPlanner(
        CtiDbContext dbContext,
        IAiReportMitigationClient aiReportMitigationClient)
    {
        _dbContext = dbContext;
        _aiReportMitigationClient = aiReportMitigationClient;
    }

    public async Task<AegisMitigationGenerationOutcome> GenerateAsync(
        AegisMitigationGenerationRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.ActorUserId);

        var sourceType = NormalizeSourceType(request.SourceType);
        if (sourceType is null)
        {
            throw new InvalidOperationException("SourceType must be one of: pdf, blog, bulletin.");
        }

        var resolved = await ResolveSourceAsync(request, sourceType, cancellationToken);
        if (!request.Regenerate)
        {
            var existing = await FindExistingPlanAsync(
                resolved.SourceReportId,
                resolved.AlertIds,
                resolved.ScanJobIds,
                cancellationToken);
            if (existing is not null)
            {
                return new AegisMitigationGenerationOutcome(
                    existing.Result,
                    resolved.SourceReportId,
                    existing.Report,
                    resolved.AlertIds,
                    resolved.ScanJobIds,
                    true);
            }
        }

        var environmentContext = resolved.IncludeWorkspaceContext
            ? await BuildEnvironmentContextAsync(cancellationToken)
            : new Dictionary<string, object?>();
        var assetContext = resolved.IncludeWorkspaceContext
            ? await BuildAssetContextAsync(cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var alertContext = resolved.IncludeWorkspaceContext
            ? await BuildAlertContextAsync(resolved.AlertIds, cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var ruleContext = resolved.IncludeWorkspaceContext
            ? await BuildRuleContextAsync(cancellationToken)
            : Array.Empty<IReadOnlyDictionary<string, object?>>();
        var priorOutcomeContext = await BuildPriorOutcomeContextAsync(cancellationToken);

        var aiResult = await _aiReportMitigationClient.GenerateAsync(
            new AiReportMitigationRequest(
                resolved.SourceName,
                sourceType,
                resolved.DocumentId,
                request.DocumentUrl,
                resolved.DocumentText,
                resolved.DocumentBytesBase64,
                resolved.BulletinJson,
                EnableLlmFallback: true,
                IngestionTime: DateTimeOffset.UtcNow,
                EnvironmentContext: environmentContext,
                AssetContext: assetContext,
                AlertContext: alertContext,
                RuleContext: ruleContext,
                PriorOutcomeContext: priorOutcomeContext),
            cancellationToken);

        var persisted = await PersistMitigationReportAsync(aiResult, resolved, request.ActorUserId, cancellationToken);
        return new AegisMitigationGenerationOutcome(
            aiResult,
            resolved.SourceReportId,
            persisted,
            resolved.AlertIds,
            resolved.ScanJobIds,
            false);
    }

    private async Task<AegisResolvedSource> ResolveSourceAsync(
        AegisMitigationGenerationRequest request,
        string sourceType,
        CancellationToken cancellationToken)
    {
        if (request.ExistingReportId.HasValue)
        {
            var report = await _dbContext.ReportsV2
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.ExistingReportId.Value, cancellationToken);
            if (report is null)
            {
                throw new KeyNotFoundException("The requested report was not found.");
            }

            var alertIds = await _dbContext.ReportAlerts
                .AsNoTracking()
                .Where(x => x.ReportId == report.Id)
                .Select(x => x.AlertId)
                .ToArrayAsync(cancellationToken);

            return new AegisResolvedSource(
                SourceName: report.Title,
                SourceType: sourceType,
                DocumentId: report.Id.ToString("D"),
                DocumentText: BuildExistingReportText(report),
                DocumentBytesBase64: null,
                BulletinJson: null,
                SourceReportId: report.Id,
                AlertIds: alertIds,
                ScanJobIds: Array.Empty<Guid>(),
                TriggerKind: "manual_report",
                IncludeWorkspaceContext: request.IncludeWorkspaceContext);
        }

        if (request.AlertId.HasValue)
        {
            var alertScanJobIds = await LoadScanJobIdsForAlertsAsync([request.AlertId.Value], cancellationToken);
            if (alertScanJobIds.Count > 0)
            {
                return await ResolveSourceFromScanJobAsync(
                    alertScanJobIds[0],
                    request.IncludeWorkspaceContext,
                    "manual_alert_scan_context",
                    cancellationToken);
            }

            return await ResolveSourceFromAlertAsync(request.AlertId.Value, request.IncludeWorkspaceContext, "manual_alert", cancellationToken);
        }

        if (request.ScanJobId.HasValue)
        {
            return await ResolveSourceFromScanJobAsync(request.ScanJobId.Value, request.IncludeWorkspaceContext, "manual_scan", cancellationToken);
        }

        var sourceName = string.IsNullOrWhiteSpace(request.SourceName) ? "Aegis report review" : request.SourceName.Trim();
        var documentId = string.IsNullOrWhiteSpace(request.DocumentId) ? $"aegis-{Guid.NewGuid():N}" : request.DocumentId.Trim();
        if (string.IsNullOrWhiteSpace(request.DocumentText)
            && string.IsNullOrWhiteSpace(request.DocumentBytesBase64)
            && string.IsNullOrWhiteSpace(request.BulletinJson))
        {
            throw new InvalidOperationException("Provide report text, PDF bytes, bulletin JSON, or an existing report, alert, or scan job.");
        }

        return new AegisResolvedSource(
            SourceName: sourceName,
            SourceType: sourceType,
            DocumentId: documentId,
            DocumentText: request.DocumentText,
            DocumentBytesBase64: request.DocumentBytesBase64,
            BulletinJson: request.BulletinJson,
            SourceReportId: null,
            AlertIds: Array.Empty<Guid>(),
            ScanJobIds: Array.Empty<Guid>(),
            TriggerKind: "manual_document",
            IncludeWorkspaceContext: request.IncludeWorkspaceContext);
    }

    private async Task<AegisResolvedSource> ResolveSourceFromAlertAsync(
        Guid alertId,
        bool includeWorkspaceContext,
        string triggerKind,
        CancellationToken cancellationToken)
    {
        var alert = await _dbContext.AlertsV2
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (alert is null)
        {
            throw new KeyNotFoundException("The requested alert was not found.");
        }

        var scanJobIds = await LoadScanJobIdsForAlertsAsync([alertId], cancellationToken);
        var documentText = string.Join(
            Environment.NewLine,
            [
                $"Alert: {alert.Title}",
                $"Severity: {alert.Severity}",
                $"Status: {alert.Status}",
                $"Scanner family: {alert.ScannerFamily}",
                $"Target: {alert.TargetDisplay}",
                $"Rule: {alert.RuleName}",
                $"First detected UTC: {alert.FirstDetectedAtUtc:O}",
                $"Last detected UTC: {alert.LastDetectedAtUtc:O}",
                "Summary:",
                alert.Summary,
            ]);

        return new AegisResolvedSource(
            SourceName: $"Severe alert: {alert.Title}",
            SourceType: "bulletin",
            DocumentId: alert.Id.ToString("D"),
            DocumentText: documentText,
            DocumentBytesBase64: null,
            BulletinJson: null,
            SourceReportId: null,
            AlertIds: [alert.Id],
            ScanJobIds: scanJobIds,
            TriggerKind: triggerKind,
            IncludeWorkspaceContext: includeWorkspaceContext);
    }

    private async Task<AegisResolvedSource> ResolveSourceFromScanJobAsync(
        Guid scanJobId,
        bool includeWorkspaceContext,
        string triggerKind,
        CancellationToken cancellationToken)
    {
        var scanJob = await _dbContext.ScanJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanJobId, cancellationToken);
        if (scanJob is null)
        {
            throw new KeyNotFoundException("The requested scan job was not found.");
        }

        var targetExecutions = await _dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJobId)
            .OrderBy(x => x.TargetHostname)
            .ToArrayAsync(cancellationToken);

        var scanResults = await _dbContext.ScanResults
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJobId && !x.IsExecutionArtifact)
            .OrderByDescending(x => x.Disposition)
            .ThenByDescending(x => x.Confidence)
            .ThenByDescending(x => x.LastObservedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        var scanResultIds = scanResults.Select(x => x.Id).ToArray();
        var alertIds = scanResultIds.Length == 0
            ? Array.Empty<Guid>()
            : await _dbContext.AlertScanResults
                .AsNoTracking()
                .Where(x => scanResultIds.Contains(x.ScanResultId))
                .Select(x => x.AlertId)
                .Distinct()
                .ToArrayAsync(cancellationToken);

        var alerts = alertIds.Length == 0
            ? Array.Empty<Alert>()
            : await _dbContext.AlertsV2
                .AsNoTracking()
                .Where(x => alertIds.Contains(x.Id))
                .OrderByDescending(x => x.Severity)
                .ThenByDescending(x => x.LastDetectedAtUtc)
                .ToArrayAsync(cancellationToken);

        var scannerFamilies = scanResults.Select(x => x.ScannerFamily).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var titleSuffix = scannerFamilies.Length switch
        {
            0 => "scan job",
            1 => $"{scannerFamilies[0]} scan",
            _ => $"{string.Join("/", scannerFamilies)} scan",
        };

        return new AegisResolvedSource(
            SourceName: $"Scan job {scanJob.Id:D} {titleSuffix}",
            SourceType: "bulletin",
            DocumentId: scanJob.Id.ToString("D"),
            DocumentText: BuildScanJobText(scanJob, targetExecutions, scanResults, alerts),
            DocumentBytesBase64: null,
            BulletinJson: null,
            SourceReportId: null,
            AlertIds: alertIds,
            ScanJobIds: [scanJob.Id],
            TriggerKind: triggerKind,
            IncludeWorkspaceContext: includeWorkspaceContext);
    }

    private async Task<IReadOnlyList<Guid>> LoadScanJobIdsForAlertsAsync(
        IReadOnlyList<Guid> alertIds,
        CancellationToken cancellationToken)
    {
        if (alertIds.Count == 0)
        {
            return Array.Empty<Guid>();
        }

        return await (
                from link in _dbContext.AlertScanResults.AsNoTracking()
                join result in _dbContext.ScanResults.AsNoTracking() on link.ScanResultId equals result.Id
                where alertIds.Contains(link.AlertId) && result.ScanJobId.HasValue
                select result.ScanJobId!.Value)
            .Distinct()
            .ToArrayAsync(cancellationToken);
    }

    private async Task<AegisStoredPlan?> FindExistingPlanAsync(
        Guid? sourceReportId,
        IReadOnlyList<Guid> alertIds,
        IReadOnlyList<Guid> scanJobIds,
        CancellationToken cancellationToken)
    {
        var candidates = await _dbContext.ReportsV2
            .AsNoTracking()
            .Where(x => x.SummaryJson.Contains(SummaryMarker))
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Take(200)
            .ToArrayAsync(cancellationToken);

        foreach (var candidate in candidates)
        {
            var metadata = ParseStoredPlan(candidate.SummaryJson);
            if (metadata?.Result is null)
            {
                continue;
            }

            var matchesSourceReport = sourceReportId.HasValue && metadata.SourceReportId == sourceReportId.Value;
            var matchesScan = scanJobIds.Count > 0 && metadata.SourceScanJobIds.Intersect(scanJobIds).Any();
            var matchesAlert = alertIds.Count > 0 && metadata.SourceAlertIds.Intersect(alertIds).Any();
            if (!matchesSourceReport && !matchesScan && !matchesAlert)
            {
                continue;
            }

            return new AegisStoredPlan(candidate, metadata.Result);
        }

        return null;
    }

    private async Task<Report> PersistMitigationReportAsync(
        AiReportMitigationResult result,
        AegisResolvedSource source,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        var generatedAtUtc = DateTimeOffset.UtcNow;
        var title = $"Aegis mitigation: {source.SourceName}";
        if (title.Length > 190)
        {
            title = string.Concat(title.AsSpan(0, 187), "...");
        }

        var summaryJson = JsonSerializer.Serialize(new
        {
            aegisMitigationPlanVersion = 2,
            planOrigin = source.TriggerKind.StartsWith("manual_", StringComparison.Ordinal) ? "manual" : "autonomy",
            planTrigger = source.TriggerKind,
            sourceReportId = source.SourceReportId,
            sourceAlertIds = source.AlertIds,
            sourceScanJobIds = source.ScanJobIds,
            result,
        }, JsonOptions);

        var report = Report.Create(
            title,
            ReportType.Operational,
            summaryJson,
            actorUserId,
            generatedAtUtc,
            generatedAtUtc);

        _dbContext.ReportsV2.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var alertId in source.AlertIds.Distinct())
        {
            _dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alertId, generatedAtUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return report;
    }

    private async Task<IReadOnlyDictionary<string, object?>> BuildEnvironmentContextAsync(CancellationToken cancellationToken)
    {
        var targetCount = await _dbContext.TargetServers.AsNoTracking().CountAsync(cancellationToken);
        var openAlertCount = await _dbContext.AlertsV2.AsNoTracking().CountAsync(x => x.Status == AlertStatus.Open, cancellationToken);
        var recentScanCount = await _dbContext.ScanJobs.AsNoTracking().CountAsync(x => x.QueuedAtUtc >= DateTimeOffset.UtcNow.AddDays(-7), cancellationToken);

        return new Dictionary<string, object?>
        {
            ["generatedAtUtc"] = DateTimeOffset.UtcNow,
            ["targetCount"] = targetCount,
            ["openAlertCount"] = openAlertCount,
            ["recentScanCount7d"] = recentScanCount,
            ["agent"] = "Aegis",
            ["authority"] = "read_only_recommendations",
        };
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildAssetContextAsync(CancellationToken cancellationToken)
    {
        var targets = await _dbContext.TargetServers
            .AsNoTracking()
            .OrderByDescending(x => x.LastContactUtc ?? x.UpdatedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return targets
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["targetServerId"] = x.Id,
                ["hostname"] = x.Hostname,
                ["ipAddress"] = x.IpAddress,
                ["operatingSystem"] = x.OperatingSystem,
                ["environment"] = x.Environment,
                ["status"] = x.Status.ToString(),
                ["connectivityStatus"] = x.ConnectivityStatus.ToString(),
                ["lastContactUtc"] = x.LastContactUtc,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildAlertContextAsync(
        IReadOnlyList<Guid> preferredAlertIds,
        CancellationToken cancellationToken)
    {
        var alerts = _dbContext.AlertsV2.AsNoTracking().AsQueryable();
        if (preferredAlertIds.Count > 0)
        {
            alerts = alerts.Where(x => preferredAlertIds.Contains(x.Id));
        }

        var items = await alerts
            .OrderByDescending(x => x.Severity)
            .ThenByDescending(x => x.LastDetectedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return items
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["alertId"] = x.Id,
                ["title"] = x.Title,
                ["summary"] = x.Summary,
                ["severity"] = x.Severity.ToString(),
                ["status"] = x.Status.ToString(),
                ["scannerFamily"] = x.ScannerFamily,
                ["targetDisplay"] = x.TargetDisplay,
                ["ruleName"] = x.RuleName,
                ["lastDetectedAtUtc"] = x.LastDetectedAtUtc,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildRuleContextAsync(CancellationToken cancellationToken)
    {
        var rules = await _dbContext.RuleArtifacts
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(40)
            .ToArrayAsync(cancellationToken);

        return rules
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["ruleArtifactId"] = x.Id,
                ["name"] = x.Name,
                ["ruleFamily"] = x.RuleFamily.ToString(),
                ["severity"] = x.Severity.ToString(),
                ["status"] = x.LifecycleStatus.ToString(),
                ["scopeType"] = x.ScopeType.ToString(),
                ["scopeValue"] = x.ScopeValue,
                ["description"] = x.Description,
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> BuildPriorOutcomeContextAsync(CancellationToken cancellationToken)
    {
        var priorPlans = await _dbContext.ReportsV2
            .AsNoTracking()
            .Where(x => x.SummaryJson.Contains(SummaryMarker))
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Take(10)
            .Select(x => new { x.Id, x.Title, x.GeneratedAtUtc })
            .ToArrayAsync(cancellationToken);

        return priorPlans
            .Select(x => (IReadOnlyDictionary<string, object?>)new Dictionary<string, object?>
            {
                ["mitigationReportId"] = x.Id,
                ["title"] = x.Title,
                ["generatedAtUtc"] = x.GeneratedAtUtc,
            })
            .ToArray();
    }

    private static string BuildExistingReportText(Report report)
    {
        return string.Join(
            Environment.NewLine,
            [
                $"Title: {report.Title}",
                $"Report type: {report.ReportType}",
                $"Generated at UTC: {report.GeneratedAtUtc:O}",
                "Summary JSON:",
                report.SummaryJson,
            ]);
    }

    private static string BuildScanJobText(
        ScanJob scanJob,
        IReadOnlyList<ScanJobTargetExecution> targetExecutions,
        IReadOnlyList<ScanResult> scanResults,
        IReadOnlyList<Alert> alerts)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Scan job id: {scanJob.Id:D}");
        builder.AppendLine($"Status: {scanJob.Status}");
        builder.AppendLine($"Trigger source: {scanJob.TriggerSource}");
        builder.AppendLine($"Queued at UTC: {scanJob.QueuedAtUtc:O}");
        if (scanJob.StartedAtUtc.HasValue)
        {
            builder.AppendLine($"Started at UTC: {scanJob.StartedAtUtc:O}");
        }

        if (scanJob.CompletedAtUtc.HasValue)
        {
            builder.AppendLine($"Completed at UTC: {scanJob.CompletedAtUtc:O}");
        }

        if (!string.IsNullOrWhiteSpace(scanJob.Summary))
        {
            builder.AppendLine($"Summary: {scanJob.Summary}");
        }

        builder.AppendLine($"Target executions: {targetExecutions.Count}");
        foreach (var execution in targetExecutions.Take(10))
        {
            builder.AppendLine($"- {execution.TargetHostname} ({execution.TargetIpAddress}) | {execution.Status} | {execution.ScannerName} | {execution.Summary}");
            if (!string.IsNullOrWhiteSpace(execution.ErrorMessage))
            {
                builder.AppendLine($"  Error: {execution.ErrorMessage}");
            }
        }

        builder.AppendLine($"Structured findings: {scanResults.Count}");
        foreach (var result in scanResults.Take(20))
        {
            builder.AppendLine(
                $"- {result.ScannerFamily} | disposition={result.Disposition} | confidence={result.Confidence:0.00} | occurrences={result.OccurrenceCount} | observed={result.LastObservedAtUtc:O}");
            if (!string.IsNullOrWhiteSpace(result.EvidenceJson))
            {
                builder.AppendLine($"  Evidence: {result.EvidenceJson}");
            }
        }

        if (alerts.Count > 0)
        {
            builder.AppendLine("Linked alerts:");
            foreach (var alert in alerts.Take(10))
            {
                builder.AppendLine($"- {alert.Severity} | {alert.Title} | {alert.TargetDisplay} | {alert.RuleName}");
                builder.AppendLine($"  {alert.Summary}");
            }
        }

        return builder.ToString();
    }

    private static string? NormalizeSourceType(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "bulletin" : value.Trim().ToLowerInvariant();
        return normalized is "pdf" or "blog" or "bulletin" ? normalized : null;
    }

    private static AegisStoredPlanMetadata? ParseStoredPlan(string summaryJson)
    {
        try
        {
            return JsonSerializer.Deserialize<AegisStoredPlanMetadata>(summaryJson, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record AegisStoredPlan(Report Report, AiReportMitigationResult Result);

    private sealed class AegisStoredPlanMetadata
    {
        public Guid? SourceReportId { get; init; }
        public Guid[] SourceAlertIds { get; init; } = [];
        public Guid[] SourceScanJobIds { get; init; } = [];
        public AiReportMitigationResult? Result { get; init; }
    }
}

public sealed record AegisMitigationGenerationRequest(
    string SourceName,
    string SourceType,
    string? DocumentId,
    string? DocumentUrl,
    string? DocumentText,
    string? DocumentBytesBase64,
    string? BulletinJson,
    Guid? ExistingReportId,
    Guid? AlertId,
    Guid? ScanJobId,
    bool IncludeWorkspaceContext,
    string ActorUserId,
    bool Regenerate = false);

public sealed record AegisMitigationGenerationOutcome(
    AiReportMitigationResult Result,
    Guid? SourceReportId,
    Report PersistedReport,
    IReadOnlyList<Guid> AlertIds,
    IReadOnlyList<Guid> ScanJobIds,
    bool ReusedExistingPlan);

internal sealed record AegisResolvedSource(
    string SourceName,
    string SourceType,
    string DocumentId,
    string? DocumentText,
    string? DocumentBytesBase64,
    string? BulletinJson,
    Guid? SourceReportId,
    IReadOnlyList<Guid> AlertIds,
    IReadOnlyList<Guid> ScanJobIds,
    string TriggerKind,
    bool IncludeWorkspaceContext);
