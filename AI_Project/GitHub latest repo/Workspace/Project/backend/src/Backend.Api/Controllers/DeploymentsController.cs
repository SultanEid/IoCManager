using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Deployments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/deployments")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Deployments endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class DeploymentsController : ControllerBase
{
    private readonly IDeploymentService _deploymentService;

    public DeploymentsController(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DeploymentResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<DeploymentResponse>> Create(
        [FromBody] CreateDeploymentRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _deploymentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(ListByCase), new { caseId = item.CaseId }, item);
    }

    [HttpGet("case/{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DeploymentResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DeploymentResponse>>> ListByCase(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _deploymentService.ListByCaseAsync(caseId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("alert/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DeploymentResponse>>(StatusCodes.Status200OK)]
    public Task<ActionResult<IReadOnlyList<DeploymentResponse>>> ListByAlert(Guid alertId, CancellationToken cancellationToken)
    {
        return ListByCase(alertId, cancellationToken);
    }

    [HttpPatch("{deploymentId:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DeploymentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeploymentResponse>> UpdateStatus(
        Guid deploymentId,
        [FromBody] UpdateDeploymentStatusRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _deploymentService.UpdateStatusAsync(deploymentId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }
}
