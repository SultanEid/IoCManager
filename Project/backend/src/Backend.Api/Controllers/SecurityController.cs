using Backend.Api.Infrastructure;
using Backend.Contracts.Security;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/security")]
public sealed class SecurityController : ControllerBase
{
    private readonly IAntiforgery _antiforgery;

    public SecurityController(IAntiforgery antiforgery)
    {
        _antiforgery = antiforgery;
    }

    [HttpGet("antiforgery-token")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AntiforgeryTokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public ActionResult<AntiforgeryTokenResponse> GetAntiforgeryToken()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        Response.Headers.CacheControl = "no-store";

        return Ok(new AntiforgeryTokenResponse(
            tokens.HeaderName ?? "X-CSRF-TOKEN",
            tokens.RequestToken ?? string.Empty));
    }
}
