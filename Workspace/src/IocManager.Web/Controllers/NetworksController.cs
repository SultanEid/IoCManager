using IocVmwareIngestion.Api.Contracts;
using IocVmwareIngestion.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IocVmwareIngestion.Api.Controllers;

[ApiController]
[Route("api/networks")]
public sealed class NetworksController(ITargetInventoryRepository repository) : ControllerBase
{
    private readonly ITargetInventoryRepository _repository = repository;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<NetworkResponse>>> GetNetworks(CancellationToken cancellationToken)
    {
        var networks = await _repository.GetNetworksAsync(cancellationToken);
        return Ok(networks.Select(network => new NetworkResponse(network.NetworkId, network.Name, network.SubNet)).ToArray());
    }
}
