using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class LegacyScanPipelineWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<ScanExecutionOptions> _scanExecutionOptions;
    private readonly ILogger<LegacyScanPipelineWorker> _logger;

    public LegacyScanPipelineWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<ScanExecutionOptions> scanExecutionOptions,
        ILogger<LegacyScanPipelineWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _scanExecutionOptions = scanExecutionOptions;
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
                if (queuedPlans > 0 || processedJobs > 0)
                {
                    _logger.LogInformation(
                        "Legacy scan pipeline worker queued {QueuedPlans} plans and processed {ProcessedJobs} jobs.",
                        queuedPlans,
                        processedJobs);
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
}
