namespace Backend.Contracts.V2;

public sealed record CreateNetworkRequest(string Name, string CidrBlock, string Description, string ActorUserId);
public sealed record NetworkResponse(Guid Id, string Name, string CidrBlock, string Description, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateSubnetRequest(Guid NetworkId, string Name, string CidrBlock, string Gateway, string ActorUserId);
public sealed record SubnetResponse(Guid Id, Guid NetworkId, string Name, string CidrBlock, string Gateway, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateTargetServerRequest(Guid SubnetId, string Hostname, string IpAddress, string OperatingSystem, string Environment, string ActorUserId);
public sealed record UpdateTargetServerStatusRequest(string Status, string ActorUserId);
public sealed record TargetServerResponse(Guid Id, Guid SubnetId, string Hostname, string IpAddress, string OperatingSystem, string Environment, string Status, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record CreateTargetGroupRequest(string Name, string Description, string ActorUserId);
public sealed record UpdateTargetGroupRequest(string Name, string Description, bool IsEnabled, string ActorUserId);
public sealed record TargetGroupResponse(
    Guid Id,
    string Name,
    string Description,
    bool IsEnabled,
    int MemberCount,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
public sealed record TargetGroupMemberResponse(
    Guid TargetGroupId,
    Guid TargetServerId,
    string Hostname,
    string IpAddress,
    string AddedByUserId,
    DateTimeOffset AddedAtUtc);

public sealed record CreateManagedServerRequest(
    Guid SubnetId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string ActorUserId,
    string? Status = null,
    string? ConnectivityStatus = null,
    string? ConnectionProtocol = null,
    string? ConnectionHost = null,
    int? ConnectionPort = null,
    string? ConnectionAuthMode = null,
    string? ConnectionUsername = null);

public sealed record UpdateManagedServerRequest(
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string ActorUserId,
    string? Status = null,
    string? ConnectivityStatus = null,
    string? ConnectionProtocol = null,
    string? ConnectionHost = null,
    int? ConnectionPort = null,
    string? ConnectionAuthMode = null,
    string? ConnectionUsername = null);

public sealed record RotateManagedServerConnectionSecretRequest(string SecretPayload, string ActorUserId);
public sealed record ManagedServerConnectionSecretMetadataResponse(Guid TargetServerId, bool HasConnectionSecret, DateTimeOffset? ConnectionSecretUpdatedAtUtc);

public sealed record ManagedServerScannerAssignmentResponse(
    Guid TargetServerId,
    Guid ScannerId,
    string ScannerName,
    string ConnectivityStatus,
    DateTimeOffset? LastHeartbeatUtc,
    DateTimeOffset? LastContactUtc,
    bool IsEnabled,
    IReadOnlyList<string> Capabilities,
    DateTimeOffset UpdatedAtUtc);

public sealed record UpsertManagedServerScannerAssignmentRequest(
    string ConnectivityStatus,
    DateTimeOffset? LastHeartbeatUtc,
    DateTimeOffset? LastContactUtc,
    bool IsEnabled,
    string ActorUserId);

public sealed record ManagedServerResponse(
    Guid Id,
    Guid SubnetId,
    string Hostname,
    string IpAddress,
    string OperatingSystem,
    string Environment,
    string Status,
    string ConnectivityStatus,
    DateTimeOffset? LastHeartbeatUtc,
    DateTimeOffset? LastContactUtc,
    string? ConnectionProtocol,
    string? ConnectionHost,
    int? ConnectionPort,
    string? ConnectionAuthMode,
    string? ConnectionUsername,
    bool HasConnectionSecret,
    DateTimeOffset? ConnectionSecretUpdatedAtUtc,
    IReadOnlyList<ManagedServerScannerAssignmentResponse> ScannerAssignments,
    IReadOnlyList<string> ScannerCapabilities,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record ManagedServerInventoryResponse(
    IReadOnlyList<ManagedServerResponse> Servers,
    int TotalServers,
    int UnhealthyServers,
    int UnreachableServers,
    int StaleContactServers,
    int Page,
    int PageSize);

public sealed record ManagedServerInventoryQuery : PagedQuery
{
    public string? Status { get; init; }
    public string? ScannerCapability { get; init; }
    public Guid? SubnetId { get; init; }
    public string? LastContact { get; init; }
    public string? Environment { get; init; }
}

public sealed record CreateDiscoveryRunRequest(Guid SubnetId, string ActorUserId, string? RangeStartIp, string? RangeEndIp);
public sealed record DiscoveryRunResponse(
    Guid Id,
    Guid SubnetId,
    string RequestedCidr,
    string? RangeStartIp,
    string? RangeEndIp,
    string Status,
    DateTimeOffset QueuedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    int TotalHosts,
    int ReachableHosts,
    int UnreachableHosts,
    string Summary);

public sealed record DiscoveredHostResponse(
    Guid Id,
    Guid SubnetId,
    string IpAddress,
    string Hostname,
    string Reachability,
    DateTimeOffset FirstDiscoveredAtUtc,
    DateTimeOffset LastCheckedAtUtc,
    DateTimeOffset? LastSeenAtUtc,
    Guid LastDiscoveryRunId,
    Guid? PromotedTargetServerId,
    DateTimeOffset? PromotedAtUtc);

public sealed record PromoteDiscoveredHostRequest(string Hostname, string OperatingSystem, string Environment, string ActorUserId);
public sealed record PromoteDiscoveredHostResponse(Guid DiscoveredHostId, Guid TargetServerId, bool AlreadyPromoted, DateTimeOffset PromotedAtUtc);

public sealed record CreateScannerRequest(string Name, string EngineType, string Version, string ActorUserId, IReadOnlyList<string>? Capabilities = null);
public sealed record UpdateScannerCapabilitiesRequest(IReadOnlyList<string> Capabilities, string ActorUserId);
public sealed record ScannerHeartbeatRequest(string HealthStatus, string ActorUserId);
public sealed record ScannerResponse(Guid Id, string Name, string EngineType, string Version, string HealthStatus, DateTimeOffset? LastHeartbeatUtc, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc, IReadOnlyList<string> Capabilities);
