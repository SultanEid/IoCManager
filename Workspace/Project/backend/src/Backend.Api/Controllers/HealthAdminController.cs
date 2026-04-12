using Backend.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthAdminController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public HealthAdminController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpGet("info")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Info()
    {
        return Ok(new
        {
            Service = "Backend.Api",
            Environment = _environment.EnvironmentName,
            UtcNow = DateTimeOffset.UtcNow,
        });
    }

    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult AdminInfo()
    {
        return Ok(new
        {
            Runtime = Environment.Version.ToString(),
            MachineName = Environment.MachineName,
            ProcessId = Environment.ProcessId,
        });
    }
}
