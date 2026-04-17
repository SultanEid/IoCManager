using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize]
[Route("api/customizer")]
public sealed class CustomizerController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public CustomizerController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        var state = await _dbContext.CustomizerStates
            .OrderBy(x => x.Id)
            .FirstOrDefaultAsync();

        if (state is null)
        {
            return Ok(new
            {
                style = "Mira",
                @base = "Radix UI",
                baseColor = "Taupe",
                theme = "Blue",
                iconLibrary = "Tabler Icons",
                font = "Inter",
                radius = "Small",
                menuColor = "Default",
                menuAccent = "Subtle"
            });
        }

        return Ok(new
        {
            style = state.Style,
            @base = state.Base,
            baseColor = state.BaseColor,
            theme = state.Theme,
            iconLibrary = state.IconLibrary,
            font = state.Font,
            radius = state.Radius,
            menuColor = state.MenuColor,
            menuAccent = state.MenuAccent
        });
    }
}
