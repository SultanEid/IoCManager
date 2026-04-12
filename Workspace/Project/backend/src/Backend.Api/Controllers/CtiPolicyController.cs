using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.CtiPolicy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/cti/policy")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("CTI policy evaluation is outside IoC Manager v1 scope and retained only as a deferred compatibility surface.")]
public sealed class CtiPolicyController : ControllerBase
{
    private readonly ICtiPolicyService _ctiPolicyService;

    public CtiPolicyController(ICtiPolicyService ctiPolicyService)
    {
        _ctiPolicyService = ctiPolicyService;
    }

    [HttpPost("evaluate")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<CtiPolicyEvaluationResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CtiPolicyEvaluationResponse>> Evaluate(
        [FromBody] EvaluateCtiPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var outcome = await _ctiPolicyService.EvaluateAsync(request, cancellationToken);
        return Ok(outcome);
    }
}
