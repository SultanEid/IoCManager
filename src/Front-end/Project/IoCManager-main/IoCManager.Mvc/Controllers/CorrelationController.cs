using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "AnalystAccess")]
[Route("api/correlation")]
public sealed class CorrelationController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICorrelationEngine _correlationEngine;

    public CorrelationController(ApplicationDbContext dbContext, ICorrelationEngine correlationEngine)
    {
        _dbContext = dbContext;
        _correlationEngine = correlationEngine;
    }

    [HttpGet("clusters")]
    public async Task<IActionResult> GetClusters(CancellationToken cancellationToken)
    {
        var memberships = await _dbContext.ClusterMemberships.AsNoTracking().ToListAsync(cancellationToken);
        var caseShells = await _dbContext.CaseShells.AsNoTracking().ToDictionaryAsync(x => x.ClusterId, x => x.Id, cancellationToken);

        var rows = await _dbContext.CorrelationClusters.AsNoTracking()
            .OrderByDescending(x => x.AverageConfidence)
            .ThenByDescending(x => x.ObservableCount)
            .ToListAsync(cancellationToken);

        var response = rows.Select(x => new CorrelationClusterResponse
            {
                Id = x.Id,
                Name = x.Name,
                RiskLevel = x.RiskLevel,
                AverageConfidence = x.AverageConfidence,
                ObservableCount = x.ObservableCount,
                SeedObservableId = memberships.Where(m => m.ClusterId == x.Id).OrderByDescending(m => m.Weight).Select(m => m.ObservableId).FirstOrDefault(),
                CaseId = caseShells.TryGetValue(x.Id, out var caseId) ? caseId : null,
                ComputedUtc = x.ComputedUtc
            })
            .ToList();

        return Ok(new
        {
            clusters = response,
            metadata = new
            {
                computedAt = DateTime.UtcNow
            }
        });
    }

    [HttpGet("stories/{observableId:int}")]
    public async Task<IActionResult> GetStory(int observableId, CancellationToken cancellationToken)
    {
        var story = await _dbContext.CorrelationStories.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ObservableId == observableId, cancellationToken);

        if (story is null)
        {
            return NotFound(new { message = "No correlation story available for this observable." });
        }

        var response = new CorrelationStoryResponse
        {
            ObservableId = story.ObservableId,
            Summary = story.Summary,
            EvidenceCount = story.EvidenceCount,
            RuleHits = story.RuleHits,
            ComputedUtc = story.ComputedUtc
        };

        return Ok(new
        {
            story = response,
            metadata = new
            {
                computedAt = DateTime.UtcNow,
                evidenceCount = story.EvidenceCount,
                ruleHits = story.RuleHits
            }
        });
    }

    [HttpPost("run")]
    [Authorize(Policy = "AdminAccess")]
    public async Task<IActionResult> Run(CancellationToken cancellationToken)
    {
        var result = await _correlationEngine.RunAsync("manual", cancellationToken);
        return Ok(new CorrelationRunResponse
        {
            StartedUtc = result.StartedUtc,
            FinishedUtc = result.FinishedUtc,
            DurationMs = result.DurationMs,
            RulesFiredCount = result.RulesFiredCount,
            ClustersProduced = result.ClustersProduced,
            ComputedAt = DateTime.UtcNow
        });
    }
}
