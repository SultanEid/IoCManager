namespace Backend.Application.Abstractions.Services;

public interface IAiDecisionOrchestrator
{
    Task EnqueueAsync(Guid decisionId, CancellationToken cancellationToken);
    Task ProcessAsync(Guid decisionId, CancellationToken cancellationToken);
    Task RecoverAsync(CancellationToken cancellationToken);
    Task EnqueueDueAsync(CancellationToken cancellationToken);
}

