namespace Backend.Application.Abstractions.Services;

public interface IAiAdjudicationOrchestrator
{
    Task EnqueueAsync(Guid adjudicationId, CancellationToken cancellationToken);
    Task ProcessAsync(Guid adjudicationId, CancellationToken cancellationToken);
    Task RecoverAsync(CancellationToken cancellationToken);
    Task EnqueueDueAsync(CancellationToken cancellationToken);
}
