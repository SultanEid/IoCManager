using Microsoft.AspNetCore.Mvc;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Route("api/system")]
public sealed class SystemController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "ok",
            service = "Detective API",
            nowUtc = DateTime.UtcNow
        });
    }
}
