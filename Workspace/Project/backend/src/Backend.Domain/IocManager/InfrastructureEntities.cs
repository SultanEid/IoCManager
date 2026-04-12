using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class Network : AuditableEntity
{
    private Network() { }

    public string Name { get; private set; } = string.Empty;
    public string CidrBlock { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public static Network Create(string name, string cidrBlock, string description, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(cidrBlock);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new Network
        {
            Name = name.Trim(),
            CidrBlock = cidrBlock.Trim(),
            Description = description.Trim(),
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class Subnet : AuditableEntity
{
    private Subnet() { }

    public Guid NetworkId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string CidrBlock { get; private set; } = string.Empty;
    public string Gateway { get; private set; } = string.Empty;

    public static Subnet Create(Guid networkId, string name, string cidrBlock, string gateway, string actorUserId, DateTimeOffset nowUtc)
    {
        if (networkId == Guid.Empty)
        {
            throw new ArgumentException("Network id is required.", nameof(networkId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(cidrBlock);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new Subnet
        {
            NetworkId = networkId,
            Name = name.Trim(),
            CidrBlock = cidrBlock.Trim(),
            Gateway = gateway.Trim(),
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class TargetServer : AuditableEntity
{
    private TargetServer() { }

    public Guid SubnetId { get; private set; }
    public string Hostname { get; private set; } = string.Empty;
    public string IpAddress { get; private set; } = string.Empty;
    public string OperatingSystem { get; private set; } = string.Empty;
    public string Environment { get; private set; } = string.Empty;
    public TargetServerStatus Status { get; private set; } = TargetServerStatus.Discovered;
    public ConnectivityStatus ConnectivityStatus { get; private set; } = ConnectivityStatus.Unknown;
    public DateTimeOffset? LastHeartbeatUtc { get; private set; }
    public DateTimeOffset? LastContactUtc { get; private set; }
    public ConnectionProtocol? ConnectionProtocol { get; private set; }
    public string ConnectionHost { get; private set; } = string.Empty;
    public int? ConnectionPort { get; private set; }
    public ConnectionAuthMode? ConnectionAuthMode { get; private set; }
    public string ConnectionUsername { get; private set; } = string.Empty;
    public DateTimeOffset? ConnectionSecretUpdatedAtUtc { get; private set; }

    public static TargetServer Create(
        Guid subnetId,
        string hostname,
        string ipAddress,
        string operatingSystem,
        string environment,
        string actorUserId,
        DateTimeOffset nowUtc,
        ConnectionProtocol? connectionProtocol = null,
        string? connectionHost = null,
        int? connectionPort = null,
        ConnectionAuthMode? connectionAuthMode = null,
        string? connectionUsername = null)
    {
        if (subnetId == Guid.Empty)
        {
            throw new ArgumentException("Subnet id is required.", nameof(subnetId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(hostname);
        ArgumentException.ThrowIfNullOrWhiteSpace(ipAddress);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new TargetServer
        {
            SubnetId = subnetId,
            Hostname = hostname.Trim(),
            IpAddress = ipAddress.Trim(),
            OperatingSystem = operatingSystem.Trim(),
            Environment = environment.Trim(),
            Status = TargetServerStatus.Discovered,
            ConnectivityStatus = ConnectivityStatus.Unknown,
        };

        item.ApplyConnectionMetadata(
            connectionProtocol,
            connectionHost,
            connectionPort,
            connectionAuthMode,
            connectionUsername);
        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void UpdateManagedDetails(
        string hostname,
        string ipAddress,
        string operatingSystem,
        string environment,
        ConnectionProtocol? connectionProtocol,
        string? connectionHost,
        int? connectionPort,
        ConnectionAuthMode? connectionAuthMode,
        string? connectionUsername,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(hostname);
        ArgumentException.ThrowIfNullOrWhiteSpace(ipAddress);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Hostname = hostname.Trim();
        IpAddress = ipAddress.Trim();
        OperatingSystem = operatingSystem.Trim();
        Environment = environment.Trim();
        ApplyConnectionMetadata(connectionProtocol, connectionHost, connectionPort, connectionAuthMode, connectionUsername);
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void UpdateStatus(TargetServerStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = status;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void UpdateConnectivity(
        ConnectivityStatus connectivityStatus,
        DateTimeOffset? lastHeartbeatUtc,
        DateTimeOffset? lastContactUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ConnectivityStatus = connectivityStatus;
        LastHeartbeatUtc = lastHeartbeatUtc ?? LastHeartbeatUtc;
        LastContactUtc = lastContactUtc ?? lastHeartbeatUtc ?? LastContactUtc;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void MarkConnectionSecretRotated(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ConnectionSecretUpdatedAtUtc = nowUtc;
        Touch(actorUserId.Trim(), nowUtc);
    }

    private void ApplyConnectionMetadata(
        ConnectionProtocol? connectionProtocol,
        string? connectionHost,
        int? connectionPort,
        ConnectionAuthMode? connectionAuthMode,
        string? connectionUsername)
    {
        var normalizedHost = NormalizeNullable(connectionHost);
        var normalizedUsername = NormalizeNullable(connectionUsername);

        if (connectionPort.HasValue && (connectionPort.Value <= 0 || connectionPort.Value > 65535))
        {
            throw new ArgumentOutOfRangeException(nameof(connectionPort), "Connection port must be between 1 and 65535.");
        }

        var hasAnyConnectionValue =
            connectionProtocol.HasValue
            || connectionPort.HasValue
            || connectionAuthMode.HasValue
            || !string.IsNullOrWhiteSpace(normalizedHost)
            || !string.IsNullOrWhiteSpace(normalizedUsername);

        if (!hasAnyConnectionValue)
        {
            ConnectionProtocol = null;
            ConnectionHost = string.Empty;
            ConnectionPort = null;
            ConnectionAuthMode = null;
            ConnectionUsername = string.Empty;
            return;
        }

        if (!connectionProtocol.HasValue)
        {
            throw new ArgumentException("Connection protocol is required when connection metadata is provided.", nameof(connectionProtocol));
        }

        if (string.IsNullOrWhiteSpace(normalizedHost))
        {
            throw new ArgumentException("Connection host is required when connection metadata is provided.", nameof(connectionHost));
        }

        if (!connectionPort.HasValue)
        {
            throw new ArgumentException("Connection port is required when connection metadata is provided.", nameof(connectionPort));
        }

        if (!connectionAuthMode.HasValue)
        {
            throw new ArgumentException("Connection authentication mode is required when connection metadata is provided.", nameof(connectionAuthMode));
        }

        ConnectionProtocol = connectionProtocol;
        ConnectionHost = normalizedHost!;
        ConnectionPort = connectionPort;
        ConnectionAuthMode = connectionAuthMode;
        ConnectionUsername = normalizedUsername ?? string.Empty;
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public sealed class DiscoveryRun : AuditableEntity
{
    private DiscoveryRun() { }

    public Guid SubnetId { get; private set; }
    public string RequestedCidr { get; private set; } = string.Empty;
    public string? RangeStartIp { get; private set; }
    public string? RangeEndIp { get; private set; }
    public DiscoveryRunStatus Status { get; private set; } = DiscoveryRunStatus.Queued;
    public DateTimeOffset QueuedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public int TotalHosts { get; private set; }
    public int ReachableHosts { get; private set; }
    public int UnreachableHosts { get; private set; }
    public string Summary { get; private set; } = string.Empty;

    public static DiscoveryRun Queue(
        Guid subnetId,
        string requestedCidr,
        string? rangeStartIp,
        string? rangeEndIp,
        int totalHosts,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (subnetId == Guid.Empty)
        {
            throw new ArgumentException("Subnet id is required.", nameof(subnetId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(requestedCidr);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (totalHosts <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(totalHosts), "Total hosts must be positive.");
        }

        var actor = actorUserId.Trim();

        var item = new DiscoveryRun
        {
            SubnetId = subnetId,
            RequestedCidr = requestedCidr.Trim(),
            RangeStartIp = string.IsNullOrWhiteSpace(rangeStartIp) ? null : rangeStartIp.Trim(),
            RangeEndIp = string.IsNullOrWhiteSpace(rangeEndIp) ? null : rangeEndIp.Trim(),
            Status = DiscoveryRunStatus.Queued,
            QueuedAtUtc = nowUtc,
            TotalHosts = totalHosts,
            ReachableHosts = 0,
            UnreachableHosts = 0,
            Summary = string.Empty,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void Start(string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status != DiscoveryRunStatus.Queued)
        {
            throw new InvalidOperationException("Only queued discovery runs can start.");
        }

        Status = DiscoveryRunStatus.Running;
        StartedAtUtc = startedAtUtc;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void Complete(
        DiscoveryRunStatus terminalStatus,
        int totalHosts,
        int reachableHosts,
        int unreachableHosts,
        string summary,
        string actorUserId,
        DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (terminalStatus is not (DiscoveryRunStatus.Success or DiscoveryRunStatus.Partial or DiscoveryRunStatus.Unreachable or DiscoveryRunStatus.Failed))
        {
            throw new ArgumentOutOfRangeException(nameof(terminalStatus), "Terminal discovery status is required.");
        }

        if (totalHosts < 0 || reachableHosts < 0 || unreachableHosts < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(totalHosts), "Host counters cannot be negative.");
        }

        Status = terminalStatus;
        CompletedAtUtc = completedAtUtc;
        TotalHosts = totalHosts;
        ReachableHosts = reachableHosts;
        UnreachableHosts = unreachableHosts;
        Summary = summary.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class DiscoveredHost : AuditableEntity
{
    private DiscoveredHost() { }

    public Guid SubnetId { get; private set; }
    public string IpAddress { get; private set; } = string.Empty;
    public string Hostname { get; private set; } = string.Empty;
    public DiscoveredHostReachability Reachability { get; private set; } = DiscoveredHostReachability.Unreachable;
    public DateTimeOffset FirstDiscoveredAtUtc { get; private set; }
    public DateTimeOffset LastCheckedAtUtc { get; private set; }
    public DateTimeOffset? LastSeenAtUtc { get; private set; }
    public Guid LastDiscoveryRunId { get; private set; }
    public Guid? PromotedTargetServerId { get; private set; }
    public DateTimeOffset? PromotedAtUtc { get; private set; }

    public static DiscoveredHost CreateObservation(
        Guid subnetId,
        Guid discoveryRunId,
        string ipAddress,
        string? hostname,
        DiscoveredHostReachability reachability,
        DateTimeOffset checkedAtUtc,
        string actorUserId)
    {
        if (subnetId == Guid.Empty)
        {
            throw new ArgumentException("Subnet id is required.", nameof(subnetId));
        }

        if (discoveryRunId == Guid.Empty)
        {
            throw new ArgumentException("Discovery run id is required.", nameof(discoveryRunId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(ipAddress);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var resolvedHostname = string.IsNullOrWhiteSpace(hostname) ? string.Empty : hostname.Trim();

        var item = new DiscoveredHost
        {
            SubnetId = subnetId,
            LastDiscoveryRunId = discoveryRunId,
            IpAddress = ipAddress.Trim(),
            Hostname = resolvedHostname,
            Reachability = reachability,
            FirstDiscoveredAtUtc = checkedAtUtc,
            LastCheckedAtUtc = checkedAtUtc,
            LastSeenAtUtc = reachability == DiscoveredHostReachability.Reachable ? checkedAtUtc : null,
        };

        item.StampCreation(actorUserId.Trim(), checkedAtUtc);
        return item;
    }

    public void Observe(
        Guid discoveryRunId,
        string? hostname,
        DiscoveredHostReachability reachability,
        DateTimeOffset checkedAtUtc,
        string actorUserId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (discoveryRunId == Guid.Empty)
        {
            throw new ArgumentException("Discovery run id is required.", nameof(discoveryRunId));
        }

        LastDiscoveryRunId = discoveryRunId;
        Reachability = reachability;
        LastCheckedAtUtc = checkedAtUtc;
        if (reachability == DiscoveredHostReachability.Reachable)
        {
            LastSeenAtUtc = checkedAtUtc;
            if (!string.IsNullOrWhiteSpace(hostname))
            {
                Hostname = hostname.Trim();
            }
        }

        Touch(actorUserId.Trim(), checkedAtUtc);
    }

    public void MarkPromoted(Guid targetServerId, string actorUserId, DateTimeOffset promotedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        PromotedTargetServerId = targetServerId;
        PromotedAtUtc = promotedAtUtc;
        Touch(actorUserId.Trim(), promotedAtUtc);
    }
}

public sealed class Scanner : AuditableEntity
{
    private Scanner() { }

    public string Name { get; private set; } = string.Empty;
    public string EngineType { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public ScannerHealthStatus HealthStatus { get; private set; } = ScannerHealthStatus.Healthy;
    public DateTimeOffset? LastHeartbeatUtc { get; private set; }

    public static Scanner Create(string name, string engineType, string version, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(engineType);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new Scanner
        {
            Name = name.Trim(),
            EngineType = engineType.Trim(),
            Version = version.Trim(),
            HealthStatus = ScannerHealthStatus.Healthy,
            LastHeartbeatUtc = nowUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void Heartbeat(ScannerHealthStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        HealthStatus = status;
        LastHeartbeatUtc = nowUtc;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class TargetServerConnectionSecret : AuditableEntity
{
    private TargetServerConnectionSecret() { }

    public Guid TargetServerId { get; private set; }
    public string EncryptedPayload { get; private set; } = string.Empty;
    public DateTimeOffset RotatedAtUtc { get; private set; }

    public static TargetServerConnectionSecret Create(
        Guid targetServerId,
        string encryptedPayload,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedPayload);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var entity = new TargetServerConnectionSecret
        {
            TargetServerId = targetServerId,
            EncryptedPayload = encryptedPayload.Trim(),
            RotatedAtUtc = nowUtc,
        };

        entity.StampCreation(actorUserId.Trim(), nowUtc);
        return entity;
    }

    public void Rotate(
        string encryptedPayload,
        string actorUserId,
        DateTimeOffset rotatedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedPayload);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        EncryptedPayload = encryptedPayload.Trim();
        RotatedAtUtc = rotatedAtUtc;
        Touch(actorUserId.Trim(), rotatedAtUtc);
    }
}

public sealed class TargetServerScannerAssignment : AuditableEntity
{
    private TargetServerScannerAssignment() { }

    public Guid TargetServerId { get; private set; }
    public Guid ScannerId { get; private set; }
    public ConnectivityStatus ConnectivityStatus { get; private set; } = ConnectivityStatus.Unknown;
    public DateTimeOffset? LastHeartbeatUtc { get; private set; }
    public DateTimeOffset? LastContactUtc { get; private set; }
    public bool IsEnabled { get; private set; } = true;

    public static TargetServerScannerAssignment Create(
        Guid targetServerId,
        Guid scannerId,
        ConnectivityStatus connectivityStatus,
        DateTimeOffset? lastHeartbeatUtc,
        DateTimeOffset? lastContactUtc,
        bool isEnabled,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        if (scannerId == Guid.Empty)
        {
            throw new ArgumentException("Scanner id is required.", nameof(scannerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var entity = new TargetServerScannerAssignment
        {
            TargetServerId = targetServerId,
            ScannerId = scannerId,
            ConnectivityStatus = connectivityStatus,
            LastHeartbeatUtc = lastHeartbeatUtc,
            LastContactUtc = lastContactUtc ?? lastHeartbeatUtc,
            IsEnabled = isEnabled,
        };

        entity.StampCreation(actorUserId.Trim(), nowUtc);
        return entity;
    }

    public void Update(
        ConnectivityStatus connectivityStatus,
        DateTimeOffset? lastHeartbeatUtc,
        DateTimeOffset? lastContactUtc,
        bool isEnabled,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ConnectivityStatus = connectivityStatus;
        LastHeartbeatUtc = lastHeartbeatUtc ?? LastHeartbeatUtc;
        LastContactUtc = lastContactUtc ?? lastHeartbeatUtc ?? LastContactUtc;
        IsEnabled = isEnabled;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class ScannerCapabilityBinding : Entity
{
    private ScannerCapabilityBinding() { }

    public Guid ScannerId { get; private set; }
    public ScannerCapability Capability { get; private set; }
    public string AddedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; private set; }

    public static ScannerCapabilityBinding Create(
        Guid scannerId,
        ScannerCapability capability,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (scannerId == Guid.Empty)
        {
            throw new ArgumentException("Scanner id is required.", nameof(scannerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        return new ScannerCapabilityBinding
        {
            ScannerId = scannerId,
            Capability = capability,
            AddedByUserId = actorUserId.Trim(),
            AddedAtUtc = nowUtc,
        };
    }
}
