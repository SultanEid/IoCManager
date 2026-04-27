using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Features.ReportMitigationPoc;

public sealed class AegisMitigationAutonomyWorker : BackgroundService
{
    private const string SummaryMarker = "aegisMitigationPlanVersion";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<AegisMitigationOptions> _options;
    private readonly ILogger<AegisMitigationAutonomyWorker> _logger;

    public AegisMitigationAutonomyWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<AegisMitigationOptions> options,
        ILogger<AegisMitigationAutonomyWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _options.CurrentValue;
            if (options.AutonomyEnabled)
            {
                try
                {
                    await RunPassAsync(options, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Aegis autonomous mitigation pass failed.");
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Max(30, options.AutonomyIntervalSeconds)), stoppingToken);
        }
    }

    private async Task RunPassAsync(AegisMitigationOptions options, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var mitigationClient = scope.ServiceProvider.GetRequiredService<IAiReportMitigationClient>();

        var cutoff = DateTimeOffset.UtcNow.AddHours(-Math.Max(1, options.SevereAlertLookbackHours));
        var candidates = await dbContext.AlertsV2
            .AsNoTracking()
            .Where(alert =>
                alert.Status == AlertStatus.Open
                && alert.LastDetectedAtUtc >= cutoff
                && (alert.Severity == AlertSeverity.High || alert.Severity == AlertSeverity.Critical))
            .OrderByDescending(alert => alert.Severity)
            .ThenByDescending(alert => alert.LastDetectedAtUtc)
            .Take(Math.Clamp(options.MaxAlertsPerPass, 1, 10))
            .ToArrayAsync(cancellationToken);

        foreach (var alert in candidates)
        {
            var alreadyPlanned = await dbContext.ReportAlerts
                .AsNoTracking()
                .Where(link => link.AlertId == alert.Id)
                .Join(
                    dbContext.ReportsV2.AsNoTracking().Where(report => report.SummaryJson.Contains(SummaryMarker)),
                    link => link.ReportId,
                    report => report.Id,
                    (_, report) => report.Id)
                .AnyAsync(cancellationToken);

            if (alreadyPlanned)
            {
                continue;
            }

            await CreateMitigationForAlertAsync(dbContext, mitigationClient, alert, options.SystemActorUserId, cancellationToken);
        }
    }

    private async Task CreateMitigationForAlertAsync(
        CtiDbContext dbContext,
        IAiReportMitigationClient mitigationClient,
        Alert alert,
        string actorUserId,
        CancellationToken cancellationToken)
    {
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

        AiReportMitigationResult result;
        try
        {
            result = await mitigationClient.GenerateAsync(
                new AiReportMitigationRequest(
                    SourceName: $"Severe alert: {alert.Title}",
                    SourceType: "bulletin",
                    DocumentId: alert.Id.ToString("D"),
                    DocumentUrl: null,
                    DocumentText: documentText,
                    DocumentBytesBase64: null,
                    BulletinJson: null,
                    EnableLlmFallback: true,
                    IngestionTime: DateTimeOffset.UtcNow,
                    EnvironmentContext: new Dictionary<string, object?>
                    {
                        ["agent"] = "Aegis",
                        ["trigger"] = "severe_alert",
                        ["authority"] = "read_only_recommendations",
                    },
                    AssetContext: Array.Empty<IReadOnlyDictionary<string, object?>>(),
                    AlertContext:
                    [
                        new Dictionary<string, object?>
                        {
                            ["alertId"] = alert.Id,
                            ["title"] = alert.Title,
                            ["summary"] = alert.Summary,
                            ["severity"] = alert.Severity.ToString(),
                            ["scannerFamily"] = alert.ScannerFamily,
                            ["targetDisplay"] = alert.TargetDisplay,
                            ["ruleName"] = alert.RuleName,
                            ["lastDetectedAtUtc"] = alert.LastDetectedAtUtc,
                        },
                    ],
                    RuleContext: Array.Empty<IReadOnlyDictionary<string, object?>>(),
                    PriorOutcomeContext: Array.Empty<IReadOnlyDictionary<string, object?>>()),
                cancellationToken);
        }
        catch (OptionalDependencyUnavailableException ex)
        {
            _logger.LogInformation(ex, "Aegis skipped autonomous mitigation for alert {AlertId} because the AI sidecar is unavailable.", alert.Id);
            return;
        }

        var generatedAtUtc = DateTimeOffset.UtcNow;
        var title = $"Aegis mitigation: {alert.Title}";
        if (title.Length > 190)
        {
            title = string.Concat(title.AsSpan(0, 187), "...");
        }

        var summaryJson = JsonSerializer.Serialize(new
        {
            aegisMitigationPlanVersion = 1,
            autonomousTrigger = "severe_alert",
            sourceAlertId = alert.Id,
            result,
        }, JsonOptions);

        var report = Report.Create(
            title,
            ReportType.Operational,
            summaryJson,
            actorUserId,
            generatedAtUtc,
            generatedAtUtc);

        dbContext.ReportsV2.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.ReportAlerts.Add(ReportAlert.Create(report.Id, alert.Id, generatedAtUtc));
        await dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Aegis created mitigation report {ReportId} for severe alert {AlertId}.", report.Id, alert.Id);
    }
}
