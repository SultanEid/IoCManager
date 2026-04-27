using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class LegacyScanPipelineWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<ScanExecutionOptions> _scanExecutionOptions;
    private readonly IOptionsMonitor<DiscoveryExecutionOptions> _discoveryOptions;
    private readonly ILogger<LegacyScanPipelineWorker> _logger;
    private DateTimeOffset _nextScheduledNetworkSweepAtUtc = DateTimeOffset.MinValue;

    public LegacyScanPipelineWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<ScanExecutionOptions> scanExecutionOptions,
        IOptionsMonitor<DiscoveryExecutionOptions> discoveryOptions,
        ILogger<LegacyScanPipelineWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _scanExecutionOptions = scanExecutionOptions;
        _discoveryOptions = discoveryOptions;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<ILegacyScanPipelineService>();
                var queuedPlans = await service.EnqueueDuePlansAsync(stoppingToken);
                var processedJobs = await service.ProcessQueuedJobsAsync(stoppingToken);
                var sweptNetworks = await RunScheduledNetworkSweepsAsync(service, stoppingToken);
                if (queuedPlans > 0 || processedJobs > 0)
                {
                    _logger.LogInformation(
                        "Legacy scan pipeline worker queued {QueuedPlans} plans and processed {ProcessedJobs} jobs.",
                        queuedPlans,
                        processedJobs);
                }

                if (sweptNetworks > 0)
                {
                    _logger.LogInformation(
                        "Legacy scan pipeline worker refreshed discovery for {SweptNetworks} subnet(s).",
                        sweptNetworks);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Legacy scan pipeline worker cycle failed.");
            }

            var delaySeconds = Math.Clamp(_scanExecutionOptions.CurrentValue.SchedulerIntervalSeconds, 5, 60);
            await Task.Delay(TimeSpan.FromSeconds(delaySeconds), stoppingToken);
        }
    }

    private async Task<int> RunScheduledNetworkSweepsAsync(
        ILegacyScanPipelineService service,
        CancellationToken cancellationToken)
    {
        var options = _discoveryOptions.CurrentValue;
        if (!options.ScheduledLegacyNetworkSweepEnabled)
        {
            return 0;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        if (nowUtc < _nextScheduledNetworkSweepAtUtc)
        {
            return 0;
        }

        _nextScheduledNetworkSweepAtUtc = nowUtc.AddMinutes(Math.Clamp(options.ScheduledLegacyNetworkSweepIntervalMinutes, 1, 60));
        var networks = await service.ListNetworksAsync(cancellationToken);
        var sweptNetworks = 0;
        foreach (var network in networks)
        {
            try
            {
                await service.DiscoverNetworkAsync(
                    network.Id,
                    new Backend.Contracts.V2.LegacyPipelineDiscoveryRequest(
                        options.ScheduledLegacyNetworkSweepActorUserId,
                        RangeStartIp: null,
                        RangeEndIp: null),
                    cancellationToken);
                sweptNetworks++;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Scheduled discovery sweep failed for legacy network {NetworkId} ({NetworkName}).",
                    network.Id,
                    network.Name);
            }
        }

        return sweptNetworks;
    }
}
