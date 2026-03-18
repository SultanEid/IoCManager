namespace IocVmwareIngestion.Api.Services;

public interface ITargetInventoryRepository
{
    Task<IReadOnlyCollection<NetworkRecord>> GetNetworksAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DiscoveredTargetRecord>> GetTargetsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DiscoveredTargetRecord>> UpsertTargetsAsync(
        IReadOnlyCollection<DiscoveredTargetRecord> targets,
        CancellationToken cancellationToken);
}

public sealed record NetworkRecord(int NetworkId, string? Name, string? SubNet);

public sealed record DiscoveredTargetRecord(
    string IPAddress,
    string Status,
    string? HostName = null,
    string? TargetOsType = null,
    int? NetworkId = null,
    string? NetworkName = null,
    int? TargetId = null,
    DateTime? LastSweep = null);
