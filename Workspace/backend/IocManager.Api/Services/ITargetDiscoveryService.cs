namespace IocVmwareIngestion.Api.Services;

public interface ITargetDiscoveryService
{
    Task<IReadOnlyCollection<DiscoveredTargetRecord>> DiscoverAsync(
        string? network,
        string? startIp,
        string? endIp,
        int timeoutMs,
        bool persist,
        CancellationToken cancellationToken);
}
