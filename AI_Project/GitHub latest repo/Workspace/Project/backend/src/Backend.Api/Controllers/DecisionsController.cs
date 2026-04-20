using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Decisions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/decisions")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Decisions endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class DecisionsController : ControllerBase
{
    private readonly IDecisionService _decisionService;

    public DecisionsController(IDecisionService decisionService)
    {
        _decisionService = decisionService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DecisionResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<DecisionResponse>> Create([FromBody] CreateDecisionRequest request, CancellationToken cancellationToken)
    {
        var item = await _decisionService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(ListByCase), new { caseId = item.CaseId }, item);
    }

    [HttpGet("case/{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DecisionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DecisionResponse>>> ListByCase(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _decisionService.ListByCaseAsync(caseId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("alert/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<DecisionResponse>>(StatusCodes.Status200OK)]
    public Task<ActionResult<IReadOnlyList<DecisionResponse>>> ListByAlert(Guid alertId, CancellationToken cancellationToken)
    {
        return ListByCase(alertId, cancellationToken);
    }

    [HttpPatch("{decisionId:guid}/finalize")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DecisionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DecisionResponse>> FinalizeDecision(
        Guid decisionId,
        [FromBody] FinalizeDecisionRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _decisionService.FinalizeAsync(decisionId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }
}
