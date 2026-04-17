using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "AnalystAccess")]
[Route("api/detections")]
public sealed class DetectionsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public DetectionsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("coverage")]
    public async Task<IActionResult> GetCoverage(CancellationToken cancellationToken)
    {
        var observables = await _dbContext.Observables.AsNoTracking()
            .OrderByDescending(x => x.Confidence)
            .Take(300)
            .ToListAsync(cancellationToken);

        var coverageRows = await _dbContext.DetectionCoverages.AsNoTracking()
            .Where(x => observables.Select(o => o.Id).Contains(x.ObservableId))
            .ToListAsync(cancellationToken);

        var rows = observables
            .Select(observable =>
            {
                var families = coverageRows
                    .Where(x => x.ObservableId == observable.Id)
                    .ToDictionary(x => x.RuleFamily, x => x.CoverageStatus, StringComparer.OrdinalIgnoreCase);

                return new DetectionCoverageRowResponse
                {
                    ObservableId = observable.Id,
                    Type = observable.Type,
                    Value = observable.ValueRaw,
                    Confidence = observable.Confidence,
                    Families = families
                };
            })
            .ToList();

        var gaps = rows
            .Where(x => x.Confidence >= 70)
            .Select(row =>
            {
                var missing = row.Families
                    .Where(pair => pair.Value == "none")
                    .Select(pair => pair.Key)
                    .ToArray();

                return new DetectionCoverageGapResponse
                {
                    ObservableId = row.ObservableId,
                    Type = row.Type,
                    Value = row.Value,
                    Confidence = row.Confidence,
                    MissingFamilies = string.Join(", ", missing)
                };
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.MissingFamilies))
            .OrderByDescending(x => x.Confidence)
            .ToList();

        return Ok(new
        {
            rows,
            gaps,
            metadata = new
            {
                computedAt = DateTime.UtcNow
            }
        });
    }
}
