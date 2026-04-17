using System.Text.Json;
using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize]
[Route("api/workspace")]
public sealed class WorkspaceController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public WorkspaceController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("panels")]
    public async Task<IActionResult> GetPanels()
    {
        var panels = await _dbContext.WorkspacePanels
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var response = panels.Select(x => new
        {
            id = x.Id,
            key = x.PanelKey,
            title = x.Title,
            payload = DeserializePayload(x.PayloadJson)
        });

        return Ok(new { panels = response });
    }

    private static object DeserializePayload(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new { };
        }

        try
        {
            return JsonSerializer.Deserialize<JsonElement>(json);
        }
        catch
        {
            return new { };
        }
    }
}
