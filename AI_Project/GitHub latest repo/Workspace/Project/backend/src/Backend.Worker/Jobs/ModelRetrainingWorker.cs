using Backend.Application.Abstractions.Services;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace Backend.Worker.Jobs;

[Obsolete("Model retraining runtime path is deferred for IoC Manager v2 and should remain disabled.")]
public sealed class ModelRetrainingWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<JobSchedulingOptions> _optionsMonitor;
    private readonly ILogger<ModelRetrainingWorker> _logger;

    public ModelRetrainingWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<JobSchedulingOptions> optionsMonitor,
        ILogger<ModelRetrainingWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;
            var interval = TimeSpan.FromHours(Math.Clamp(options.ModelRetrainingIntervalHours, 1, 168));

            if (options.EnableModelRetraining)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IJobOrchestrationService>();
                    var result = await service.RunModelRetrainingAsync(options.SystemActorUserId, stoppingToken);
                    _logger.LogInformation("Model retraining finished with status {Status}. RunId={RunId}", result.Status, result.Id);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Model retraining execution failed.");
                }
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
