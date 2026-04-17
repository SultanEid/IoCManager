using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public DashboardController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var metrics = await _dbContext.DashboardMetrics
            .OrderBy(x => x.SortOrder)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                value = x.Value,
                delta = x.Delta,
                deltaDirection = x.DeltaDirection,
                headline = x.Headline,
                description = x.Description
            })
            .ToListAsync();

        return Ok(new { metrics });
    }

    [HttpGet("visitors")]
    public async Task<IActionResult> GetVisitors([FromQuery] string range = "7d")
    {
        var normalizedRange = range.Trim().ToLowerInvariant();
        var days = normalizedRange switch
        {
            "90d" => 90,
            "30d" => 30,
            _ => 7
        };

        var startDate = DateTime.UtcNow.Date.AddDays(-days);

        var points = await _dbContext.VisitorPoints
            .Where(x => x.DateUtc >= startDate)
            .OrderBy(x => x.DateUtc)
            .Select(x => new
            {
                date = x.DateUtc.ToString("yyyy-MM-dd"),
                desktop = x.Desktop,
                mobile = x.Mobile
            })
            .ToListAsync();

        return Ok(new
        {
            range = normalizedRange,
            points
        });
    }

    [HttpGet("sections")]
    public async Task<IActionResult> GetSections()
    {
        var rows = await _dbContext.SectionRecords
            .OrderBy(x => x.SortOrder)
            .Select(x => new
            {
                id = x.Id,
                header = x.Header,
                type = x.Type,
                status = x.Status,
                target = x.Target,
                limit = x.Limit,
                reviewer = x.Reviewer
            })
            .ToListAsync();

        return Ok(new { rows });
    }
}
