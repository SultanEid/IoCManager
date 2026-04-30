using Backend.Application.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Features.ReportMitigationPoc;

public sealed class AegisMitigationAutonomyWorker : BackgroundService
{
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
        var planner = scope.ServiceProvider.GetRequiredService<AegisMitigationPlanner>();

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

        var alertIds = candidates.Select(x => x.Id).ToArray();
        var linkedScanJobIds = alertIds.Length == 0
            ? new Dictionary<Guid, Guid?>()
            : await (
                    from link in dbContext.AlertScanResults.AsNoTracking()
                    join result in dbContext.ScanResults.AsNoTracking() on link.ScanResultId equals result.Id
                    where alertIds.Contains(link.AlertId)
                    group result by link.AlertId
                    into grouped
                    select new
                    {
                        AlertId = grouped.Key,
                        ScanJobId = grouped.Select(x => x.ScanJobId).FirstOrDefault(x => x.HasValue),
                    })
                .ToDictionaryAsync(x => x.AlertId, x => x.ScanJobId, cancellationToken);

        foreach (var group in candidates
                     .GroupBy(alert => linkedScanJobIds.GetValueOrDefault(alert.Id)))
        {
            var firstAlert = group.OrderByDescending(x => x.Severity).ThenByDescending(x => x.LastDetectedAtUtc).First();
            try
            {
                await planner.GenerateAsync(
                    new AegisMitigationGenerationRequest(
                        SourceName: firstAlert.Title,
                        SourceType: "bulletin",
                        DocumentId: null,
                        DocumentUrl: null,
                        DocumentText: null,
                        DocumentBytesBase64: null,
                        BulletinJson: null,
                        ExistingReportId: null,
                        AlertId: group.Key.HasValue ? null : firstAlert.Id,
                        ScanJobId: group.Key,
                        IncludeWorkspaceContext: true,
                        ActorUserId: options.SystemActorUserId,
                        Regenerate: false),
                    cancellationToken);
            }
            catch (OptionalDependencyUnavailableException ex)
            {
                _logger.LogInformation(ex, "Aegis skipped autonomous mitigation because the AI sidecar is unavailable.");
                return;
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("Aegis could not resolve an autonomous mitigation source for alert {AlertId}.", firstAlert.Id);
            }
        }
    }
}
