using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.InfrastructureReadAccess)]
[Route("api/v2/infrastructure")]
public sealed partial class InfrastructureController : ControllerBase
{
    private static readonly IReadOnlyDictionary<string, ScannerCapability> EngineTypeFallbackCapabilities =
        new Dictionary<string, ScannerCapability>(StringComparer.OrdinalIgnoreCase)
        {
            ["yara"] = ScannerCapability.Yara,
            ["sigma"] = ScannerCapability.Sigma,
            ["snort"] = ScannerCapability.Snort,
            ["suricata"] = ScannerCapability.Suricata,
        };

    private readonly CtiDbContext _dbContext;
    private readonly IAuthSensitiveAuditService _auditService;
    private readonly DiscoveryTargetRangeParser _discoveryTargetRangeParser;
    private readonly IDiscoveryRunQueue _discoveryRunQueue;
    private readonly ILegacyAzureCompatibilityReader _legacyAzureCompatibilityReader;
    private readonly TargetServerConnectionSecretProtector _secretProtector;

    public InfrastructureController(
        CtiDbContext dbContext,
        IAuthSensitiveAuditService auditService,
        DiscoveryTargetRangeParser discoveryTargetRangeParser,
        IDiscoveryRunQueue discoveryRunQueue,
        ILegacyAzureCompatibilityReader legacyAzureCompatibilityReader,
        TargetServerConnectionSecretProtector secretProtector)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _discoveryTargetRangeParser = discoveryTargetRangeParser;
        _discoveryRunQueue = discoveryRunQueue;
        _legacyAzureCompatibilityReader = legacyAzureCompatibilityReader;
        _secretProtector = secretProtector;
    }

    [HttpGet("networks")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<NetworkResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NetworkResponse>>> ListNetworks(CancellationToken cancellationToken)
    {
        try
        {
            var items = await _dbContext.Networks
                .OrderBy(x => x.Name)
                .Select(x => x.ToNetworkResponse())
                .ToArrayAsync(cancellationToken);

            if (items.Length > 0 || !_legacyAzureCompatibilityReader.IsEnabled)
            {
                return Ok(items);
            }
        }
        catch (Exception ex) when (_legacyAzureCompatibilityReader.IsEnabled && LegacyCompatibilityFallbackPolicy.ShouldUseFallback(ex))
        {
        }

        var legacyItems = await _legacyAzureCompatibilityReader.ListNetworksAsync(cancellationToken);
        return Ok(legacyItems.Select(x => new NetworkResponse(x.Id, x.Name, x.CidrBlock, x.Description, x.CreatedAtUtc, x.UpdatedAtUtc)).ToArray());
    }

    [HttpPost("networks")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<NetworkResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<NetworkResponse>> CreateNetwork([FromBody] CreateNetworkRequest request, CancellationToken cancellationToken)
    {
        var entity = Network.Create(request.Name, request.CidrBlock, request.Description, request.ActorUserId, DateTimeOffset.UtcNow);
        _dbContext.Networks.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.network.create",
            "network",
            entity.Id.ToString("N"),
            new { entity.Name, entity.CidrBlock },
            cancellationToken);
        return CreatedAtAction(nameof(ListNetworks), new { id = entity.Id }, entity.ToNetworkResponse());
    }

    [HttpGet("subnets")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<SubnetResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SubnetResponse>>> ListSubnets([FromQuery] Guid? networkId, CancellationToken cancellationToken)
    {
        var query = _dbContext.Subnets.AsQueryable();
        if (networkId.HasValue)
        {
            query = query.Where(x => x.NetworkId == networkId.Value);
        }

        var items = await query
            .OrderBy(x => x.Name)
            .Select(x => x.ToSubnetResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("subnets")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<SubnetResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SubnetResponse>> CreateSubnet([FromBody] CreateSubnetRequest request, CancellationToken cancellationToken)
    {
        var entity = Subnet.Create(request.NetworkId, request.Name, request.CidrBlock, request.Gateway, request.ActorUserId, DateTimeOffset.UtcNow);
        _dbContext.Subnets.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.subnet.create",
            "subnet",
            entity.Id.ToString("N"),
            new { entity.Name, entity.CidrBlock },
            cancellationToken);
        return CreatedAtAction(nameof(ListSubnets), new { id = entity.Id }, entity.ToSubnetResponse());
    }

    [HttpGet("target-servers")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<TargetServerResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TargetServerResponse>>> ListTargetServers([FromQuery] Guid? subnetId, CancellationToken cancellationToken)
    {
        try
        {
            var query = _dbContext.TargetServers.AsQueryable();
            if (subnetId.HasValue)
            {
                query = query.Where(x => x.SubnetId == subnetId.Value);
            }

            var items = await query
                .OrderBy(x => x.Hostname)
                .Select(x => x.ToTargetServerResponse())
                .ToArrayAsync(cancellationToken);

            if (items.Length > 0 || !_legacyAzureCompatibilityReader.IsEnabled)
            {
                return Ok(items);
            }
        }
        catch (Exception ex) when (_legacyAzureCompatibilityReader.IsEnabled && LegacyCompatibilityFallbackPolicy.ShouldUseFallback(ex))
        {
        }

        var legacyItems = await _legacyAzureCompatibilityReader.ListTargetServersAsync(subnetId, cancellationToken);
        return Ok(legacyItems
            .Select(x => new TargetServerResponse(x.Id, x.SubnetId, x.Hostname, x.IpAddress, x.OperatingSystem, x.Environment, x.Status, x.CreatedAtUtc, x.UpdatedAtUtc))
            .ToArray());
    }

    [HttpPost("target-servers")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<TargetServerResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<TargetServerResponse>> CreateTargetServer([FromBody] CreateTargetServerRequest request, CancellationToken cancellationToken)
    {
        var entity = TargetServer.Create(
            request.SubnetId,
            request.Hostname,
            request.IpAddress,
            request.OperatingSystem,
            request.Environment,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.TargetServers.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-server.create",
            "target_server",
            entity.Id.ToString("N"),
            new { entity.Hostname, entity.IpAddress },
            cancellationToken);
        return CreatedAtAction(nameof(ListTargetServers), new { id = entity.Id }, entity.ToTargetServerResponse());
    }

    [HttpPatch("target-servers/{targetServerId:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<TargetServerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TargetServerResponse>> UpdateTargetServerStatus(
        Guid targetServerId,
        [FromBody] UpdateTargetServerStatusRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseEnum<TargetServerStatus>(request.Status, nameof(request.Status));
        entity.UpdateStatus(status, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-server.status.update",
            "target_server",
            entity.Id.ToString("N"),
            new { request.Status },
            cancellationToken);
        return Ok(entity.ToTargetServerResponse());
    }

    [HttpGet("target-groups")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<TargetGroupResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TargetGroupResponse>>> ListTargetGroups(CancellationToken cancellationToken)
    {
        var groups = await _dbContext.TargetGroups
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);

        if (groups.Length == 0)
        {
            return Ok(Array.Empty<TargetGroupResponse>());
        }

        var groupIds = groups.Select(x => x.Id).ToArray();
        var memberCounts = await _dbContext.TargetGroupMembers
            .AsNoTracking()
            .Where(x => groupIds.Contains(x.TargetGroupId))
            .GroupBy(x => x.TargetGroupId)
            .ToDictionaryAsync(x => x.Key, x => x.Count(), cancellationToken);

        var responses = groups
            .Select(group => group.ToTargetGroupResponse(memberCounts.TryGetValue(group.Id, out var count) ? count : 0))
            .ToArray();

        return Ok(responses);
    }

    [HttpGet("target-groups/{targetGroupId:guid}/members")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<TargetGroupMemberResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<TargetGroupMemberResponse>>> ListTargetGroupMembers(
        Guid targetGroupId,
        CancellationToken cancellationToken)
    {
        var groupExists = await _dbContext.TargetGroups
            .AsNoTracking()
            .AnyAsync(x => x.Id == targetGroupId, cancellationToken);
        if (!groupExists)
        {
            return NotFound();
        }

        var members = await _dbContext.TargetGroupMembers
            .AsNoTracking()
            .Where(x => x.TargetGroupId == targetGroupId)
            .OrderBy(x => x.AddedAtUtc)
            .ToArrayAsync(cancellationToken);

        if (members.Length == 0)
        {
            return Ok(Array.Empty<TargetGroupMemberResponse>());
        }

        var serverIds = members.Select(x => x.TargetServerId).Distinct().ToArray();
        var servers = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => serverIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var response = members
            .Select(member =>
            {
                var server = servers.TryGetValue(member.TargetServerId, out var mapped) ? mapped : null;
                return member.ToTargetGroupMemberResponse(
                    server?.Hostname ?? member.TargetServerId.ToString("N"),
                    server?.IpAddress ?? string.Empty);
            })
            .ToArray();

        return Ok(response);
    }

    [HttpPost("target-groups")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<TargetGroupResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TargetGroupResponse>> CreateTargetGroup(
        [FromBody] CreateTargetGroupRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedName = request.Name.Trim();
        var exists = await _dbContext.TargetGroups
            .AsNoTracking()
            .AnyAsync(x => x.Name == normalizedName, cancellationToken);
        if (exists)
        {
            return Conflict("Target group name already exists.");
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var entity = TargetGroup.Create(request.Name, request.Description, request.ActorUserId, nowUtc);
        _dbContext.TargetGroups.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-group.create",
            "target_group",
            entity.Id.ToString("N"),
            new { entity.Name, entity.IsEnabled },
            cancellationToken);

        return CreatedAtAction(nameof(ListTargetGroups), new { targetGroupId = entity.Id }, entity.ToTargetGroupResponse(memberCount: 0));
    }

    [HttpPut("target-groups/{targetGroupId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<TargetGroupResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TargetGroupResponse>> UpdateTargetGroup(
        Guid targetGroupId,
        [FromBody] UpdateTargetGroupRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.TargetGroups.FirstOrDefaultAsync(x => x.Id == targetGroupId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var normalizedName = request.Name.Trim();
        var duplicate = await _dbContext.TargetGroups
            .AsNoTracking()
            .AnyAsync(x => x.Id != targetGroupId && x.Name == normalizedName, cancellationToken);
        if (duplicate)
        {
            return Conflict("Target group name already exists.");
        }

        entity.Update(request.Name, request.Description, request.IsEnabled, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var memberCount = await _dbContext.TargetGroupMembers
            .AsNoTracking()
            .CountAsync(x => x.TargetGroupId == targetGroupId, cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-group.update",
            "target_group",
            entity.Id.ToString("N"),
            new { entity.Name, entity.IsEnabled },
            cancellationToken);

        return Ok(entity.ToTargetGroupResponse(memberCount));
    }

    [HttpDelete("target-groups/{targetGroupId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTargetGroup(Guid targetGroupId, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.TargetGroups.FirstOrDefaultAsync(x => x.Id == targetGroupId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        _dbContext.TargetGroups.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-group.delete",
            "target_group",
            targetGroupId.ToString("N"),
            new { targetGroupId },
            cancellationToken);

        return NoContent();
    }

    [HttpPut("target-groups/{targetGroupId:guid}/members/{targetServerId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<TargetGroupMemberResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TargetGroupMemberResponse>> UpsertTargetGroupMember(
        Guid targetGroupId,
        Guid targetServerId,
        [FromQuery] string actorUserId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            throw new ArgumentException("actorUserId is required.", nameof(actorUserId));
        }

        var group = await _dbContext.TargetGroups.FirstOrDefaultAsync(x => x.Id == targetGroupId, cancellationToken);
        if (group is null)
        {
            return NotFound($"Target group '{targetGroupId}' was not found.");
        }

        var targetServer = await _dbContext.TargetServers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (targetServer is null)
        {
            return NotFound($"Target server '{targetServerId}' was not found.");
        }

        var existing = await _dbContext.TargetGroupMembers
            .FirstOrDefaultAsync(x => x.TargetGroupId == targetGroupId && x.TargetServerId == targetServerId, cancellationToken);
        if (existing is null)
        {
            _dbContext.TargetGroupMembers.Add(TargetGroupMember.Create(targetGroupId, targetServerId, actorUserId, DateTimeOffset.UtcNow));
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var member = await _dbContext.TargetGroupMembers
            .AsNoTracking()
            .FirstAsync(x => x.TargetGroupId == targetGroupId && x.TargetServerId == targetServerId, cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-group.member.upsert",
            "target_group",
            targetGroupId.ToString("N"),
            new { targetServerId },
            cancellationToken);

        return Ok(member.ToTargetGroupMemberResponse(targetServer.Hostname, targetServer.IpAddress));
    }

    [HttpDelete("target-groups/{targetGroupId:guid}/members/{targetServerId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteTargetGroupMember(
        Guid targetGroupId,
        Guid targetServerId,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.TargetGroupMembers
            .FirstOrDefaultAsync(x => x.TargetGroupId == targetGroupId && x.TargetServerId == targetServerId, cancellationToken);
        if (existing is null)
        {
            return NoContent();
        }

        _dbContext.TargetGroupMembers.Remove(existing);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.target-group.member.delete",
            "target_group",
            targetGroupId.ToString("N"),
            new { targetServerId },
            cancellationToken);

        return NoContent();
    }

    [HttpGet("managed-servers")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ManagedServerInventoryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ManagedServerInventoryResponse>> ListManagedServers(
        [FromQuery] ManagedServerInventoryQuery queryModel,
        CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(queryModel.FromUtc, nameof(queryModel.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(queryModel.ToUtc, nameof(queryModel.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(queryModel.FromUtc), nameof(queryModel.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(queryModel.Page, queryModel.PageSize);
        var nowUtc = DateTimeOffset.UtcNow;
        var query = _dbContext.TargetServers.AsQueryable();

        if (queryModel.SubnetId.HasValue)
        {
            query = query.Where(x => x.SubnetId == queryModel.SubnetId.Value);
        }

        var q = V2SearchHelpers.NormalizeNullable(queryModel.Q);
        if (q is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(q);
            query = query.Where(x =>
                EF.Functions.Like(x.Hostname, pattern)
                || EF.Functions.Like(x.IpAddress, pattern)
                || EF.Functions.Like(x.OperatingSystem, pattern)
                || EF.Functions.Like(x.Environment, pattern)
                || EF.Functions.Like(x.ConnectionHost, pattern));
        }

        if (!string.IsNullOrWhiteSpace(queryModel.Status))
        {
            var connectivity = V2Mappings.ParseEnum<ConnectivityStatus>(queryModel.Status, nameof(queryModel.Status));
            query = query.Where(x => x.ConnectivityStatus == connectivity);
        }

        var environment = V2SearchHelpers.NormalizeNullable(queryModel.Environment);
        if (environment is not null)
        {
            var environmentPattern = V2SearchHelpers.ToContainsPattern(environment);
            query = query.Where(x => EF.Functions.Like(x.Environment, environmentPattern));
        }

        if (!string.IsNullOrWhiteSpace(queryModel.LastContact))
        {
            query = ApplyLastContactFilter(query, queryModel.LastContact, nowUtc);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value <= toUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(queryModel.ScannerCapability))
        {
            var capability = V2Mappings.ParseEnum<ScannerCapability>(queryModel.ScannerCapability, nameof(queryModel.ScannerCapability));
            var matchingServerIds = await _dbContext.TargetServerScannerAssignments
                .Where(x => x.IsEnabled)
                .Join(
                    _dbContext.ScannerCapabilityBindings.Where(x => x.Capability == capability),
                    assignment => assignment.ScannerId,
                    binding => binding.ScannerId,
                    (assignment, _) => assignment.TargetServerId)
                .Distinct()
                .ToArrayAsync(cancellationToken);

            query = query.Where(x => matchingServerIds.Contains(x.Id));
        }

        var totalServers = await query.CountAsync(cancellationToken);
        var staleCutoffUtc = nowUtc.AddHours(-72);
        var unhealthyServers = await query.CountAsync(x => x.ConnectivityStatus != ConnectivityStatus.Online, cancellationToken);
        var unreachableServers = await query.CountAsync(x => x.ConnectivityStatus == ConnectivityStatus.Offline, cancellationToken);
        var staleContactServers = await query.CountAsync(
            x => !x.LastContactUtc.HasValue || x.LastContactUtc.Value < staleCutoffUtc,
            cancellationToken);

        var servers = await query
            .OrderBy(x => x.Hostname)
            .Skip(skip)
            .Take(pageSize)
            .ToArrayAsync(cancellationToken);

        var managedServers = await BuildManagedServerResponsesAsync(servers, cancellationToken);

        return Ok(new ManagedServerInventoryResponse(
            managedServers,
            totalServers,
            unhealthyServers,
            unreachableServers,
            staleContactServers,
            page,
            pageSize));
    }

    [HttpGet("managed-servers/{targetServerId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ManagedServerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ManagedServerResponse>> GetManagedServer(Guid targetServerId, CancellationToken cancellationToken)
    {
        var server = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (server is null)
        {
            return NotFound();
        }

        var response = await BuildManagedServerResponsesAsync([server], cancellationToken);
        return Ok(response[0]);
    }

    [HttpPost("managed-servers")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ManagedServerResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ManagedServerResponse>> CreateManagedServer(
        [FromBody] CreateManagedServerRequest request,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var connectionProtocol = ParseOptionalEnum<ConnectionProtocol>(request.ConnectionProtocol, nameof(request.ConnectionProtocol));
        var connectionAuthMode = ParseOptionalEnum<ConnectionAuthMode>(request.ConnectionAuthMode, nameof(request.ConnectionAuthMode));
        var managedStatus = ParseOptionalEnum<TargetServerStatus>(request.Status, nameof(request.Status));
        var connectivityStatus = ParseOptionalEnum<ConnectivityStatus>(request.ConnectivityStatus, nameof(request.ConnectivityStatus));

        var entity = TargetServer.Create(
            request.SubnetId,
            request.Hostname,
            request.IpAddress,
            request.OperatingSystem,
            request.Environment,
            request.ActorUserId,
            nowUtc,
            connectionProtocol,
            request.ConnectionHost,
            request.ConnectionPort,
            connectionAuthMode,
            request.ConnectionUsername);

        if (managedStatus.HasValue && managedStatus.Value != entity.Status)
        {
            entity.UpdateStatus(managedStatus.Value, request.ActorUserId, nowUtc);
        }

        if (connectivityStatus.HasValue && connectivityStatus.Value != entity.ConnectivityStatus)
        {
            entity.UpdateConnectivity(connectivityStatus.Value, null, null, request.ActorUserId, nowUtc);
        }

        _dbContext.TargetServers.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.managed-server.create",
            "target_server",
            entity.Id.ToString("N"),
            new
            {
                entity.Hostname,
                entity.IpAddress,
                entity.ConnectionProtocol,
                entity.ConnectionHost,
                entity.ConnectionPort,
                entity.ConnectionAuthMode,
                hasConnectionUsername = !string.IsNullOrWhiteSpace(entity.ConnectionUsername),
            },
            cancellationToken);

        var response = await BuildManagedServerResponsesAsync([entity], cancellationToken);
        return CreatedAtAction(nameof(GetManagedServer), new { targetServerId = entity.Id }, response[0]);
    }

    [HttpPut("managed-servers/{targetServerId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ManagedServerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ManagedServerResponse>> UpdateManagedServer(
        Guid targetServerId,
        [FromBody] UpdateManagedServerRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var connectionProtocol = ParseOptionalEnum<ConnectionProtocol>(request.ConnectionProtocol, nameof(request.ConnectionProtocol));
        var connectionAuthMode = ParseOptionalEnum<ConnectionAuthMode>(request.ConnectionAuthMode, nameof(request.ConnectionAuthMode));
        var managedStatus = ParseOptionalEnum<TargetServerStatus>(request.Status, nameof(request.Status));
        var connectivityStatus = ParseOptionalEnum<ConnectivityStatus>(request.ConnectivityStatus, nameof(request.ConnectivityStatus));

        entity.UpdateManagedDetails(
            request.Hostname,
            request.IpAddress,
            request.OperatingSystem,
            request.Environment,
            connectionProtocol,
            request.ConnectionHost,
            request.ConnectionPort,
            connectionAuthMode,
            request.ConnectionUsername,
            request.ActorUserId,
            nowUtc);

        if (managedStatus.HasValue)
        {
            entity.UpdateStatus(managedStatus.Value, request.ActorUserId, nowUtc);
        }

        if (connectivityStatus.HasValue)
        {
            entity.UpdateConnectivity(connectivityStatus.Value, entity.LastHeartbeatUtc, entity.LastContactUtc, request.ActorUserId, nowUtc);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.managed-server.update",
            "target_server",
            entity.Id.ToString("N"),
            new
            {
                entity.Hostname,
                entity.IpAddress,
                entity.ConnectionProtocol,
                entity.ConnectionHost,
                entity.ConnectionPort,
                entity.ConnectionAuthMode,
                hasConnectionUsername = !string.IsNullOrWhiteSpace(entity.ConnectionUsername),
            },
            cancellationToken);

        var response = await BuildManagedServerResponsesAsync([entity], cancellationToken);
        return Ok(response[0]);
    }

    [HttpPost("managed-servers/{targetServerId:guid}/connection-secret")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ManagedServerConnectionSecretMetadataResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ManagedServerConnectionSecretMetadataResponse>> RotateManagedServerConnectionSecret(
        Guid targetServerId,
        [FromBody] RotateManagedServerConnectionSecretRequest request,
        CancellationToken cancellationToken)
    {
        var targetServer = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (targetServer is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.SecretPayload))
        {
            throw new ArgumentException("Secret payload is required.", nameof(request.SecretPayload));
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var encryptedPayload = _secretProtector.Protect(request.SecretPayload);
        var existingSecret = await _dbContext.TargetServerConnectionSecrets
            .FirstOrDefaultAsync(x => x.TargetServerId == targetServerId, cancellationToken);

        if (existingSecret is null)
        {
            _dbContext.TargetServerConnectionSecrets.Add(
                TargetServerConnectionSecret.Create(targetServerId, encryptedPayload, request.ActorUserId, nowUtc));
        }
        else
        {
            existingSecret.Rotate(encryptedPayload, request.ActorUserId, nowUtc);
        }

        targetServer.MarkConnectionSecretRotated(request.ActorUserId, nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.managed-server.connection-secret.rotate",
            "target_server",
            targetServer.Id.ToString("N"),
            new
            {
                hasConnectionSecret = true,
                targetServer.ConnectionSecretUpdatedAtUtc,
            },
            cancellationToken);

        return Ok(new ManagedServerConnectionSecretMetadataResponse(targetServerId, true, targetServer.ConnectionSecretUpdatedAtUtc));
    }

    [HttpPut("managed-servers/{targetServerId:guid}/scanner-assignments/{scannerId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ManagedServerScannerAssignmentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ManagedServerScannerAssignmentResponse>> UpsertManagedServerScannerAssignment(
        Guid targetServerId,
        Guid scannerId,
        [FromBody] UpsertManagedServerScannerAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var targetServer = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (targetServer is null)
        {
            return NotFound();
        }

        var scanner = await _dbContext.Scanners.FirstOrDefaultAsync(x => x.Id == scannerId, cancellationToken);
        if (scanner is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var connectivityStatus = V2Mappings.ParseEnum<ConnectivityStatus>(request.ConnectivityStatus, nameof(request.ConnectivityStatus));
        var assignment = await _dbContext.TargetServerScannerAssignments
            .FirstOrDefaultAsync(x => x.TargetServerId == targetServerId && x.ScannerId == scannerId, cancellationToken);

        if (assignment is null)
        {
            assignment = TargetServerScannerAssignment.Create(
                targetServerId,
                scannerId,
                connectivityStatus,
                request.LastHeartbeatUtc,
                request.LastContactUtc,
                request.IsEnabled,
                request.ActorUserId,
                nowUtc);
            _dbContext.TargetServerScannerAssignments.Add(assignment);
        }
        else
        {
            assignment.Update(
                connectivityStatus,
                request.LastHeartbeatUtc,
                request.LastContactUtc,
                request.IsEnabled,
                request.ActorUserId,
                nowUtc);
        }

        await ApplyManagedServerContactRollupAsync(targetServer, request.ActorUserId, nowUtc, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.managed-server.scanner-assignment.upsert",
            "target_server_scanner_assignment",
            assignment.Id.ToString("N"),
            new
            {
                assignment.TargetServerId,
                assignment.ScannerId,
                assignment.ConnectivityStatus,
                assignment.IsEnabled,
            },
            cancellationToken);

        var capabilityMap = await GetScannerCapabilityMapAsync([scannerId], cancellationToken);
        var capabilities = capabilityMap.TryGetValue(scannerId, out var scannerCapabilities)
            ? scannerCapabilities
            : [];
        return Ok(assignment.ToManagedServerScannerAssignmentResponse(scanner.Name, capabilities));
    }

    [HttpDelete("managed-servers/{targetServerId:guid}/scanner-assignments/{scannerId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveManagedServerScannerAssignment(
        Guid targetServerId,
        Guid scannerId,
        CancellationToken cancellationToken)
    {
        var targetServer = await _dbContext.TargetServers.FirstOrDefaultAsync(x => x.Id == targetServerId, cancellationToken);
        if (targetServer is null)
        {
            return NotFound();
        }

        var assignment = await _dbContext.TargetServerScannerAssignments
            .FirstOrDefaultAsync(x => x.TargetServerId == targetServerId && x.ScannerId == scannerId, cancellationToken);
        if (assignment is null)
        {
            return NotFound();
        }

        _dbContext.TargetServerScannerAssignments.Remove(assignment);
        await ApplyManagedServerContactRollupAsync(targetServer, actorUserId: "system", nowUtc: DateTimeOffset.UtcNow, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.managed-server.scanner-assignment.remove",
            "target_server_scanner_assignment",
            assignment.Id.ToString("N"),
            new
            {
                assignment.TargetServerId,
                assignment.ScannerId,
            },
            cancellationToken);

        return NoContent();
    }

    [HttpPost("discovery/runs")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DiscoveryRunResponse>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DiscoveryRunResponse>> QueueDiscoveryRun([FromBody] CreateDiscoveryRunRequest request, CancellationToken cancellationToken)
    {
        var subnet = await _dbContext.Subnets
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.SubnetId, cancellationToken);
        if (subnet is null)
        {
            return NotFound();
        }

        var targetRange = _discoveryTargetRangeParser.Parse(subnet.CidrBlock, request.RangeStartIp, request.RangeEndIp);
        var nowUtc = DateTimeOffset.UtcNow;
        var entity = DiscoveryRun.Queue(
            subnetId: request.SubnetId,
            requestedCidr: targetRange.RequestedCidr,
            rangeStartIp: targetRange.RangeStartIp,
            rangeEndIp: targetRange.RangeEndIp,
            totalHosts: targetRange.Targets.Count,
            actorUserId: request.ActorUserId,
            nowUtc: nowUtc);

        _dbContext.DiscoveryRuns.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _discoveryRunQueue.EnqueueAsync(entity.Id, cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.discovery.run.queue",
            "discovery_run",
            entity.Id.ToString("N"),
            new
            {
                entity.SubnetId,
                entity.RequestedCidr,
                entity.RangeStartIp,
                entity.RangeEndIp,
                entity.TotalHosts,
            },
            cancellationToken);

        return Accepted(entity.ToDiscoveryRunResponse());
    }

    [HttpGet("discovery/runs")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DiscoveryRunResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DiscoveryRunResponse>>> ListDiscoveryRuns([FromQuery] Guid? subnetId, CancellationToken cancellationToken)
    {
        var query = _dbContext.DiscoveryRuns.AsQueryable();
        if (subnetId.HasValue)
        {
            query = query.Where(x => x.SubnetId == subnetId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.QueuedAtUtc)
            .Select(x => x.ToDiscoveryRunResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("discovered-hosts")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DiscoveredHostResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DiscoveredHostResponse>>> ListDiscoveredHosts([FromQuery] Guid? subnetId, CancellationToken cancellationToken)
    {
        var query = _dbContext.DiscoveredHosts.AsQueryable();
        if (subnetId.HasValue)
        {
            query = query.Where(x => x.SubnetId == subnetId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.LastCheckedAtUtc)
            .ThenBy(x => x.IpAddress)
            .Select(x => x.ToDiscoveredHostResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("discovered-hosts/{discoveredHostId:guid}/promote")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<PromoteDiscoveredHostResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PromoteDiscoveredHostResponse>> PromoteDiscoveredHost(
        Guid discoveredHostId,
        [FromBody] PromoteDiscoveredHostRequest request,
        CancellationToken cancellationToken)
    {
        var discoveredHost = await _dbContext.DiscoveredHosts.FirstOrDefaultAsync(x => x.Id == discoveredHostId, cancellationToken);
        if (discoveredHost is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var alreadyPromoted = discoveredHost.PromotedTargetServerId.HasValue;
        var promotedAtUtc = discoveredHost.PromotedAtUtc ?? nowUtc;

        TargetServer? targetServer = null;
        if (discoveredHost.PromotedTargetServerId.HasValue)
        {
            targetServer = await _dbContext.TargetServers
                .FirstOrDefaultAsync(x => x.Id == discoveredHost.PromotedTargetServerId.Value, cancellationToken);
        }

        targetServer ??= await _dbContext.TargetServers
            .FirstOrDefaultAsync(x => x.IpAddress == discoveredHost.IpAddress, cancellationToken);

        if (targetServer is null)
        {
            targetServer = TargetServer.Create(
                subnetId: discoveredHost.SubnetId,
                hostname: request.Hostname,
                ipAddress: discoveredHost.IpAddress,
                operatingSystem: request.OperatingSystem,
                environment: request.Environment,
                actorUserId: request.ActorUserId,
                nowUtc: nowUtc);
            targetServer.UpdateStatus(TargetServerStatus.Active, request.ActorUserId, nowUtc);
            _dbContext.TargetServers.Add(targetServer);
        }
        else if (targetServer.Status != TargetServerStatus.Active)
        {
            targetServer.UpdateStatus(TargetServerStatus.Active, request.ActorUserId, nowUtc);
        }

        if (!alreadyPromoted || discoveredHost.PromotedTargetServerId != targetServer.Id)
        {
            promotedAtUtc = alreadyPromoted ? promotedAtUtc : nowUtc;
            discoveredHost.MarkPromoted(targetServer.Id, request.ActorUserId, promotedAtUtc);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.discovered-host.promote",
            "discovered_host",
            discoveredHost.Id.ToString("N"),
            new
            {
                discoveredHost.IpAddress,
                targetServerId = targetServer.Id,
                alreadyPromoted,
            },
            cancellationToken);

        return Ok(new PromoteDiscoveredHostResponse(discoveredHost.Id, targetServer.Id, alreadyPromoted, promotedAtUtc));
    }

    [HttpGet("scanners")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<ScannerResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScannerResponse>>> ListScanners(CancellationToken cancellationToken)
    {
        var scanners = await _dbContext.Scanners
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);
        var capabilityMap = await GetScannerCapabilityMapAsync(scanners.Select(x => x.Id), cancellationToken);

        var items = scanners
            .Select(scanner =>
            {
                var capabilities = capabilityMap.TryGetValue(scanner.Id, out var rows) ? rows : [];
                return scanner.ToScannerResponse(capabilities);
            })
            .ToArray();

        return Ok(items);
    }

    [HttpPost("scanners")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScannerResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ScannerResponse>> CreateScanner([FromBody] CreateScannerRequest request, CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var capabilities = ResolveScannerCapabilities(request.Capabilities, request.EngineType, allowEngineTypeFallback: true);
        var entity = Scanner.Create(request.Name, request.EngineType, request.Version, request.ActorUserId, nowUtc);
        _dbContext.Scanners.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var capability in capabilities)
        {
            _dbContext.ScannerCapabilityBindings.Add(ScannerCapabilityBinding.Create(entity.Id, capability, request.ActorUserId, nowUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.scanner.create",
            "scanner",
            entity.Id.ToString("N"),
            new
            {
                entity.Name,
                entity.EngineType,
                capabilities = capabilities.Select(x => x.ToString()).ToArray(),
            },
            cancellationToken);

        return CreatedAtAction(
            nameof(ListScanners),
            new { id = entity.Id },
            entity.ToScannerResponse(capabilities.Select(x => x.ToString()).ToArray()));
    }

    [HttpPut("scanners/{scannerId:guid}/capabilities")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScannerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScannerResponse>> UpdateScannerCapabilities(
        Guid scannerId,
        [FromBody] UpdateScannerCapabilitiesRequest request,
        CancellationToken cancellationToken)
    {
        var scanner = await _dbContext.Scanners.FirstOrDefaultAsync(x => x.Id == scannerId, cancellationToken);
        if (scanner is null)
        {
            return NotFound();
        }

        var desiredCapabilities = ResolveScannerCapabilities(request.Capabilities, scanner.EngineType, allowEngineTypeFallback: false);
        var desiredSet = desiredCapabilities.ToHashSet();
        var existing = await _dbContext.ScannerCapabilityBindings
            .Where(x => x.ScannerId == scannerId)
            .ToArrayAsync(cancellationToken);

        foreach (var row in existing)
        {
            if (!desiredSet.Contains(row.Capability))
            {
                _dbContext.ScannerCapabilityBindings.Remove(row);
            }
        }

        var existingSet = existing.Select(x => x.Capability).ToHashSet();
        foreach (var capability in desiredCapabilities)
        {
            if (!existingSet.Contains(capability))
            {
                _dbContext.ScannerCapabilityBindings.Add(
                    ScannerCapabilityBinding.Create(scannerId, capability, request.ActorUserId, DateTimeOffset.UtcNow));
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.scanner.capabilities.update",
            "scanner",
            scanner.Id.ToString("N"),
            new { capabilities = desiredCapabilities.Select(x => x.ToString()).ToArray() },
            cancellationToken);
        return Ok(scanner.ToScannerResponse(desiredCapabilities.Select(x => x.ToString()).ToArray()));
    }

    [HttpPost("scanners/{scannerId:guid}/heartbeat")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScannerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScannerResponse>> HeartbeatScanner(
        Guid scannerId,
        [FromBody] ScannerHeartbeatRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Scanners.FirstOrDefaultAsync(x => x.Id == scannerId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseEnum<ScannerHealthStatus>(request.HealthStatus, nameof(request.HealthStatus));
        var nowUtc = DateTimeOffset.UtcNow;
        entity.Heartbeat(status, request.ActorUserId, nowUtc);

        var assignmentConnectivity = status switch
        {
            ScannerHealthStatus.Healthy => ConnectivityStatus.Online,
            ScannerHealthStatus.Degraded => ConnectivityStatus.Degraded,
            ScannerHealthStatus.Offline => ConnectivityStatus.Offline,
            _ => ConnectivityStatus.Unknown,
        };

        var assignments = await _dbContext.TargetServerScannerAssignments
            .Where(x => x.ScannerId == scannerId)
            .ToArrayAsync(cancellationToken);

        foreach (var assignment in assignments)
        {
            assignment.Update(
                assignmentConnectivity,
                nowUtc,
                nowUtc,
                assignment.IsEnabled,
                request.ActorUserId,
                nowUtc);
        }

        if (assignments.Length > 0)
        {
            var targetServerIds = assignments.Select(a => a.TargetServerId).Distinct().ToArray();
            var targetServers = await _dbContext.TargetServers
                .Where(x => targetServerIds.Contains(x.Id))
                .ToArrayAsync(cancellationToken);

            foreach (var targetServer in targetServers)
            {
                await ApplyManagedServerContactRollupAsync(targetServer, request.ActorUserId, nowUtc, cancellationToken);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "infrastructure.scanner.heartbeat",
            "scanner",
            entity.Id.ToString("N"),
            new { request.HealthStatus },
            cancellationToken);

        var capabilityMap = await GetScannerCapabilityMapAsync([entity.Id], cancellationToken);
        var capabilities = capabilityMap.TryGetValue(entity.Id, out var rows) ? rows : [];
        return Ok(entity.ToScannerResponse(capabilities));
    }

    private static IQueryable<TargetServer> ApplyLastContactFilter(
        IQueryable<TargetServer> query,
        string lastContact,
        DateTimeOffset nowUtc)
    {
        var normalized = lastContact.Trim().ToLowerInvariant();
        return normalized switch
        {
            "24h" => query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value >= nowUtc.AddHours(-24)),
            "72h" => query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value >= nowUtc.AddHours(-72)),
            "7d" => query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value >= nowUtc.AddDays(-7)),
            "30d" => query.Where(x => x.LastContactUtc.HasValue && x.LastContactUtc.Value >= nowUtc.AddDays(-30)),
            "stale" => query.Where(x => !x.LastContactUtc.HasValue || x.LastContactUtc.Value < nowUtc.AddHours(-72)),
            "never" => query.Where(x => !x.LastContactUtc.HasValue),
            _ => throw new ArgumentException("Last contact filter must be one of: 24h, 72h, 7d, 30d, stale, never.", nameof(lastContact)),
        };
    }

    private static TEnum? ParseOptionalEnum<TEnum>(string? rawValue, string fieldName)
        where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return null;
        }

        return V2Mappings.ParseEnum<TEnum>(rawValue, fieldName);
    }

    private static IReadOnlyList<ScannerCapability> ResolveScannerCapabilities(
        IReadOnlyList<string>? requestedCapabilities,
        string engineType,
        bool allowEngineTypeFallback)
    {
        var parsed = new List<ScannerCapability>();
        if (requestedCapabilities is not null)
        {
            foreach (var raw in requestedCapabilities)
            {
                if (string.IsNullOrWhiteSpace(raw))
                {
                    continue;
                }

                parsed.Add(V2Mappings.ParseEnum<ScannerCapability>(raw, nameof(requestedCapabilities)));
            }
        }

        if (parsed.Count == 0 && allowEngineTypeFallback)
        {
            foreach (var (token, capability) in EngineTypeFallbackCapabilities)
            {
                if (engineType.Contains(token, StringComparison.OrdinalIgnoreCase))
                {
                    parsed.Add(capability);
                }
            }
        }

        var normalized = parsed.Distinct().OrderBy(x => x.ToString(), StringComparer.OrdinalIgnoreCase).ToArray();
        if (normalized.Length == 0)
        {
            throw new ArgumentException("At least one scanner capability is required.");
        }

        return normalized;
    }

    private async Task ApplyManagedServerContactRollupAsync(
        TargetServer targetServer,
        string actorUserId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.TargetServerScannerAssignments
            .Where(x => x.TargetServerId == targetServer.Id && x.IsEnabled)
            .ToArrayAsync(cancellationToken);

        if (assignments.Length == 0)
        {
            targetServer.UpdateConnectivity(ConnectivityStatus.Unknown, null, null, actorUserId, nowUtc);
            return;
        }

        var lastHeartbeatUtc = assignments
            .Select(x => x.LastHeartbeatUtc)
            .OrderByDescending(x => x)
            .FirstOrDefault();
        var lastContactUtc = assignments
            .Select(x => x.LastContactUtc)
            .OrderByDescending(x => x)
            .FirstOrDefault();
        var statusSet = assignments.Select(x => x.ConnectivityStatus).ToHashSet();
        var rollupStatus = statusSet.Count == 1
            ? statusSet.First()
            : statusSet.Contains(ConnectivityStatus.Online)
                ? ConnectivityStatus.Degraded
                : statusSet.Contains(ConnectivityStatus.Degraded)
                    ? ConnectivityStatus.Degraded
                    : statusSet.Contains(ConnectivityStatus.Offline)
                        ? ConnectivityStatus.Offline
                        : ConnectivityStatus.Unknown;

        targetServer.UpdateConnectivity(rollupStatus, lastHeartbeatUtc, lastContactUtc, actorUserId, nowUtc);
    }

    private async Task<IReadOnlyDictionary<Guid, string[]>> GetScannerCapabilityMapAsync(
        IEnumerable<Guid> scannerIds,
        CancellationToken cancellationToken)
    {
        var ids = scannerIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<Guid, string[]>();
        }

        return await _dbContext.ScannerCapabilityBindings
            .Where(x => ids.Contains(x.ScannerId))
            .GroupBy(x => x.ScannerId)
            .ToDictionaryAsync(
                group => group.Key,
                group => group
                    .Select(row => row.Capability.ToString())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                cancellationToken);
    }

    private async Task<IReadOnlyList<ManagedServerResponse>> BuildManagedServerResponsesAsync(
        IReadOnlyList<TargetServer> servers,
        CancellationToken cancellationToken)
    {
        if (servers.Count == 0)
        {
            return [];
        }

        var serverIds = servers.Select(x => x.Id).ToArray();
        var assignments = await _dbContext.TargetServerScannerAssignments
            .Where(x => serverIds.Contains(x.TargetServerId))
            .OrderBy(x => x.TargetServerId)
            .ThenBy(x => x.ScannerId)
            .ToArrayAsync(cancellationToken);

        var scannerIds = assignments.Select(x => x.ScannerId).Distinct().ToArray();
        var scannersById = await _dbContext.Scanners
            .Where(x => scannerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x, cancellationToken);
        var capabilitiesByScannerId = await GetScannerCapabilityMapAsync(scannerIds, cancellationToken);
        var secretServerIds = await _dbContext.TargetServerConnectionSecrets
            .Where(x => serverIds.Contains(x.TargetServerId))
            .Select(x => x.TargetServerId)
            .Distinct()
            .ToArrayAsync(cancellationToken);
        var secretServerSet = secretServerIds.ToHashSet();

        var assignmentsByServer = assignments
            .GroupBy(x => x.TargetServerId)
            .ToDictionary(x => x.Key, x => x.ToArray());

        var output = new List<ManagedServerResponse>(servers.Count);
        foreach (var server in servers)
        {
            var assignmentRows = assignmentsByServer.TryGetValue(server.Id, out var rows) ? rows : [];
            var assignmentResponses = assignmentRows
                .Select(assignment =>
                {
                    var scannerName = scannersById.TryGetValue(assignment.ScannerId, out var scanner)
                        ? scanner.Name
                        : assignment.ScannerId.ToString("N");
                    var capabilities = capabilitiesByScannerId.TryGetValue(assignment.ScannerId, out var scannerCapabilities)
                        ? scannerCapabilities
                        : [];
                    return assignment.ToManagedServerScannerAssignmentResponse(scannerName, capabilities);
                })
                .ToArray();

            var serverCapabilities = assignmentResponses
                .SelectMany(x => x.Capabilities)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            output.Add(server.ToManagedServerResponse(
                hasConnectionSecret: secretServerSet.Contains(server.Id),
                scannerAssignments: assignmentResponses,
                scannerCapabilities: serverCapabilities));
        }

        return output;
    }
}
