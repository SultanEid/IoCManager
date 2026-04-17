using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Entities;

namespace IoCManager.Mvc.Services;

public interface IObservableLifecycleService
{
    IReadOnlyCollection<string> AllowedStatuses { get; }
    Task<ObservableRecord> UpsertAsync(IocUpsertRequest request, string actorUserId, CancellationToken cancellationToken = default);
    Task<ObservableRecord?> UpdateStatusAsync(int id, string nextStatus, string actorUserId, CancellationToken cancellationToken = default);
    Task RecomputeConfidenceAsync(int observableId, CancellationToken cancellationToken = default);
    Task RecomputeAllConfidenceAsync(CancellationToken cancellationToken = default);
}
