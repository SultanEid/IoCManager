using IocVmwareIngestion.Api.Services;

namespace IocVmwareIngestion.Api.Contracts;

public sealed record DiscoverTargetsRequest(
    string? Network = null,
    string? StartIp = null,
    string? EndIp = null,
    int TimeoutMs = 500,
    bool Persist = true);

public sealed record DiscoveredTargetResponse(
    int? TargetId,
    string IPAddress,
    string Status,
    string? HostName,
    string? TargetOsType,
    int? NetworkId,
    string? NetworkName,
    DateTime? LastSweep)
{
    public static DiscoveredTargetResponse FromModel(DiscoveredTargetRecord model) =>
        new(
            model.TargetId,
            model.IPAddress,
            model.Status,
            model.HostName,
            model.TargetOsType,
            model.NetworkId,
            model.NetworkName,
            model.LastSweep);
}

public sealed record DiscoverTargetsResponse(
    int TotalTargets,
    int OnlineTargets,
    int PersistedTargets,
    IReadOnlyCollection<DiscoveredTargetResponse> Targets);

public sealed record StoredTargetResponse(
    int TargetId,
    string IPAddress,
    string Status,
    string? HostName,
    string? TargetOsType,
    int? NetworkId,
    string? NetworkName,
    DateTime? LastSweep)
{
    public static StoredTargetResponse FromModel(DiscoveredTargetRecord model) =>
        new(
            model.TargetId ?? 0,
            model.IPAddress,
            model.Status,
            model.HostName,
            model.TargetOsType,
            model.NetworkId,
            model.NetworkName,
            model.LastSweep);
}

public sealed record NetworkResponse(
    int NetworkId,
    string? Name,
    string? SubNet);
