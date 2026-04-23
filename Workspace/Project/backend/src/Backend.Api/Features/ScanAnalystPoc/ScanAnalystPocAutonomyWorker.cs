using Microsoft.Extensions.Options;

namespace Backend.Api.Features.ScanAnalystPoc;

public sealed class ScanAnalystPocAutonomyWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<ScanAnalystPocOptions> _optionsMonitor;
    private readonly ILogger<ScanAnalystPocAutonomyWorker> _logger;

    public ScanAnalystPocAutonomyWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<ScanAnalystPocOptions> optionsMonitor,
        ILogger<ScanAnalystPocAutonomyWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var options = _optionsMonitor.CurrentValue;
        if (!options.Enabled || !options.AutonomyEnabled)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(15, options.AutonomyIntervalSeconds)));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<ScanAnalystPocService>();
                await service.RunAutonomousPassAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Autonomous scan analyst pass failed.");
            }
        }
    }
}
