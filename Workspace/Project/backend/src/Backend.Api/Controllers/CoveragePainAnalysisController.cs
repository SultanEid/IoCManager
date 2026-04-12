using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.CoveragePain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Net;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/cti/coverage-pain")]
[Route("api/reporting")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Coverage pain analysis endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class CoveragePainAnalysisController : ControllerBase
{
    private readonly ICoveragePainAnalysisService _service;

    public CoveragePainAnalysisController(ICoveragePainAnalysisService service)
    {
        _service = service;
    }

    [HttpGet("analysis")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<CoveragePainAnalysisResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CoveragePainAnalysisResponse>> GetAnalysis(
        [FromQuery] string scopeType = "entire-environment",
        [FromQuery] string? scopeValue = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedScope = scopeType.Trim().ToLowerInvariant();
        if (normalizedScope is not ("entire-environment" or "subnet" or "single-server"))
        {
            return BadRequest("scopeType must be one of: entire-environment, subnet, single-server.");
        }

        if (normalizedScope != "entire-environment" && string.IsNullOrWhiteSpace(scopeValue))
        {
            return BadRequest("scopeValue is required for subnet and single-server scopes.");
        }

        if (normalizedScope == "subnet" && !IsValidCidr(scopeValue!))
        {
            return BadRequest("scopeValue must be a valid IPv4 CIDR (for example 10.0.0.0/24).");
        }

        var response = await _service.GetAnalysisAsync(new GetCoveragePainAnalysisRequest(scopeType, scopeValue), cancellationToken);
        return Ok(response);
    }

    private static bool IsValidCidr(string cidr)
    {
        var parts = cidr.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2)
        {
            return false;
        }

        return IPAddress.TryParse(parts[0], out var ip)
            && ip.GetAddressBytes().Length == 4
            && int.TryParse(parts[1], out var prefix)
            && prefix is >= 0 and <= 32;
    }
}
