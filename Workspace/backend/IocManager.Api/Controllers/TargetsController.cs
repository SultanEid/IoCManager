using System.Text.Json;
using IocVmwareIngestion.Api.Contracts;
using IocVmwareIngestion.Api.Options;
using IocVmwareIngestion.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace IocVmwareIngestion.Api.Controllers;

[ApiController]
[Route("api/targets")]
public sealed class TargetsController(
    IOptions<VmwareTargetSettings> targetOptions,
    ITargetInventoryRepository inventoryRepository,
    ITargetDiscoveryService discoveryService) : ControllerBase
{
    private readonly VmwareTargetSettings _targetSettings = targetOptions.Value;
    private readonly ITargetInventoryRepository _inventoryRepository = inventoryRepository;
    private readonly ITargetDiscoveryService _discoveryService = discoveryService;

    [HttpGet]
    public ActionResult<IReadOnlyCollection<TargetSummaryResponse>> GetConfiguredTargets()
    {
        var targets = _targetSettings.Targets
            .Select(target => new TargetSummaryResponse(
                target.Key,
                target.Value.Address,
                target.Value.RemoteOs,
                target.Value.DefaultScanPath,
                target.Value.DefaultEvtxPath))
            .OrderBy(target => target.Key)
            .ToArray();

        return Ok(targets);
    }

    [HttpGet("discovered")]
    public async Task<ActionResult<IReadOnlyCollection<StoredTargetResponse>>> GetDiscoveredTargets(CancellationToken cancellationToken)
    {
        var targets = await _inventoryRepository.GetTargetsAsync(cancellationToken);
        return Ok(targets.Select(StoredTargetResponse.FromModel).ToArray());
    }

    [HttpPost("discover")]
    public async Task<ActionResult<DiscoverTargetsResponse>> DiscoverTargets(
        [FromBody] DiscoverTargetsRequest request,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<DiscoveredTargetRecord> targets;

        try
        {
            targets = await _discoveryService.DiscoverAsync(
                request.Network,
                request.StartIp,
                request.EndIp,
                request.TimeoutMs,
                request.Persist,
                cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidOperationException or FileNotFoundException or JsonException)
        {
            return BadRequest(exception.Message);
        }

        return Ok(new DiscoverTargetsResponse(
            targets.Count,
            targets.Count(target => string.Equals(target.Status, "Online", StringComparison.OrdinalIgnoreCase)),
            request.Persist ? targets.Count(target => target.TargetId.HasValue) : 0,
            targets.Select(DiscoveredTargetResponse.FromModel).ToArray()));
    }
}
