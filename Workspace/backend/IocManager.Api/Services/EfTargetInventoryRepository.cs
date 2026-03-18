using IocVmwareIngestion.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace IocVmwareIngestion.Api.Services;

public sealed class EfTargetInventoryRepository(IocDbContext dbContext) : ITargetInventoryRepository
{
    private readonly IocDbContext _dbContext = dbContext;

    public async Task<IReadOnlyCollection<NetworkRecord>> GetNetworksAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Networks
            .AsNoTracking()
            .OrderBy(network => network.NetworkId)
            .Select(network => new NetworkRecord(network.NetworkId, network.Name, network.SubNet))
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<DiscoveredTargetRecord>> GetTargetsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Targets
            .AsNoTracking()
            .Include(target => target.Network)
            .OrderBy(target => target.TargetId)
            .Select(target => new DiscoveredTargetRecord(
                target.IPAddress,
                target.Status ?? "Offline",
                target.HostName,
                target.TargetOsType,
                target.NetworkId,
                target.Network != null ? target.Network.Name : null,
                target.TargetId,
                target.LastSweep))
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<DiscoveredTargetRecord>> UpsertTargetsAsync(
        IReadOnlyCollection<DiscoveredTargetRecord> targets,
        CancellationToken cancellationToken)
    {
        if (targets.Count == 0)
        {
            return [];
        }

        var lastSweepUtc = DateTime.UtcNow;

        var ipAddresses = targets
            .Select(target => target.IPAddress)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var existingTargets = await _dbContext.Targets
            .Include(target => target.Network)
            .Where(target => ipAddresses.Contains(target.IPAddress))
            .ToDictionaryAsync(target => target.IPAddress, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var target in targets)
        {
            if (existingTargets.TryGetValue(target.IPAddress, out var existing))
            {
                existing.Status = target.Status;
                existing.HostName = string.IsNullOrWhiteSpace(target.HostName) ? existing.HostName : target.HostName;
                existing.TargetOsType = string.IsNullOrWhiteSpace(target.TargetOsType) ? existing.TargetOsType : target.TargetOsType;
                existing.NetworkId = target.NetworkId;
                existing.LastSweep = target.LastSweep ?? lastSweepUtc;
                continue;
            }

            var entity = new TargetEntity
            {
                IPAddress = target.IPAddress,
                Status = target.Status,
                HostName = target.HostName,
                TargetOsType = target.TargetOsType,
                NetworkId = target.NetworkId,
                LastSweep = target.LastSweep ?? lastSweepUtc
            };

            _dbContext.Targets.Add(entity);
            existingTargets[target.IPAddress] = entity;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await _dbContext.Targets
            .AsNoTracking()
            .Include(target => target.Network)
            .Where(target => ipAddresses.Contains(target.IPAddress))
            .OrderBy(target => target.TargetId)
            .Select(target => new DiscoveredTargetRecord(
                target.IPAddress,
                target.Status ?? "Offline",
                target.HostName,
                target.TargetOsType,
                target.NetworkId,
                target.Network != null ? target.Network.Name : null,
                target.TargetId,
                target.LastSweep))
            .ToArrayAsync(cancellationToken);
    }
}
