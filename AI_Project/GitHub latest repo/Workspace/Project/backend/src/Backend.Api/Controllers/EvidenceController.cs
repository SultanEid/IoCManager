using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Evidence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/evidence")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Evidence endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class EvidenceController : ControllerBase
{
    private readonly IEvidenceService _evidenceService;

    public EvidenceController(IEvidenceService evidenceService)
    {
        _evidenceService = evidenceService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<EvidenceResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<EvidenceResponse>> Add([FromBody] AddEvidenceRequest request, CancellationToken cancellationToken)
    {
        var item = await _evidenceService.AddAsync(request, cancellationToken);
        return CreatedAtAction(nameof(ListByCase), new { caseId = item.CaseId }, item);
    }

    [HttpGet("case/{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<EvidenceResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EvidenceResponse>>> ListByCase(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _evidenceService.ListByCaseAsync(caseId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("alert/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<EvidenceResponse>>(StatusCodes.Status200OK)]
    public Task<ActionResult<IReadOnlyList<EvidenceResponse>>> ListByAlert(Guid alertId, CancellationToken cancellationToken)
    {
        return ListByCase(alertId, cancellationToken);
    }
}
