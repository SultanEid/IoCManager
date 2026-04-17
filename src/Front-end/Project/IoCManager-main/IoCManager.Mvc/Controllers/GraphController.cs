using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "AnalystAccess")]
[Route("api/graph")]
public sealed class GraphController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public GraphController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("node/{id:int}")]
    public async Task<IActionResult> GetNode(int id, CancellationToken cancellationToken)
    {
        var observable = await _dbContext.Observables.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (observable is null)
        {
            return NotFound(new { message = "Node not found." });
        }

        var edges = await _dbContext.ObservableRelationships.AsNoTracking()
            .Where(x => x.FromObservableId == id || x.ToObservableId == id)
            .OrderByDescending(x => x.Confidence)
            .Take(30)
            .ToListAsync(cancellationToken);

        var neighborIds = edges
            .Select(x => x.FromObservableId == id ? x.ToObservableId : x.FromObservableId)
            .Distinct()
            .ToArray();

        var neighbors = await _dbContext.Observables.AsNoTracking()
            .Where(x => neighborIds.Contains(x.Id))
            .Select(x => new GraphNodeResponse
            {
                Id = x.Id,
                NodeType = "observable",
                ObservableType = x.Type,
                Label = x.ValueRaw,
                Status = x.Status,
                Confidence = x.Confidence
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            node = MapNode(observable),
            neighbors,
            edges = edges.Select(MapEdge),
            metadata = new
            {
                computedAt = DateTime.UtcNow,
                evidenceCount = edges.Sum(x => x.EvidenceCount),
                ruleHits = edges.Sum(x => x.EvidenceCount)
            }
        });
    }

    [HttpGet("explore")]
    public async Task<IActionResult> Explore(
        [FromQuery] int seedId,
        [FromQuery] int depth = 1,
        [FromQuery] int limit = 160,
        CancellationToken cancellationToken = default)
    {
        var maxDepth = depth is 2 ? 2 : 1;
        var maxLimit = Math.Clamp(limit, 20, 800);

        var seed = await _dbContext.Observables.AsNoTracking().FirstOrDefaultAsync(x => x.Id == seedId, cancellationToken);
        if (seed is null)
        {
            return NotFound(new { message = "Seed node not found." });
        }

        var nodeIds = new HashSet<int> { seedId };
        var frontier = new HashSet<int> { seedId };
        var edges = new List<GraphEdgeResponse>();

        for (var level = 0; level < maxDepth; level++)
        {
            if (frontier.Count == 0 || nodeIds.Count >= maxLimit)
            {
                break;
            }

            var frontierIds = frontier.ToArray();
            frontier.Clear();

            var levelEdges = await _dbContext.ObservableRelationships.AsNoTracking()
                .Where(x => frontierIds.Contains(x.FromObservableId) || frontierIds.Contains(x.ToObservableId))
                .OrderByDescending(x => x.Confidence)
                .Take(maxLimit)
                .ToListAsync(cancellationToken);

            foreach (var edge in levelEdges)
            {
                if (edges.Count >= maxLimit)
                {
                    break;
                }

                edges.Add(MapEdge(edge));
                if (nodeIds.Add(edge.FromObservableId))
                {
                    frontier.Add(edge.FromObservableId);
                }

                if (nodeIds.Add(edge.ToObservableId))
                {
                    frontier.Add(edge.ToObservableId);
                }
            }
        }

        var nodes = await _dbContext.Observables.AsNoTracking()
            .Where(x => nodeIds.Contains(x.Id))
            .Select(x => new GraphNodeResponse
            {
                Id = x.Id,
                NodeType = "observable",
                ObservableType = x.Type,
                Label = x.ValueRaw,
                Status = x.Status,
                Confidence = x.Confidence
            })
            .Take(maxLimit)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            seedId,
            nodes,
            edges = edges
                .DistinctBy(x => (x.Source, x.Target))
                .ToArray(),
            metadata = new
            {
                computedAt = DateTime.UtcNow,
                evidenceCount = edges.Sum(x => x.EvidenceCount),
                ruleHits = edges.Sum(x => x.EvidenceCount)
            }
        });
    }

    private static GraphNodeResponse MapNode(Entities.ObservableRecord source)
    {
        return new GraphNodeResponse
        {
            Id = source.Id,
            NodeType = "observable",
            ObservableType = source.Type,
            Label = source.ValueRaw,
            Status = source.Status,
            Confidence = source.Confidence
        };
    }

    private static GraphEdgeResponse MapEdge(Entities.ObservableRelationship edge)
    {
        return new GraphEdgeResponse
        {
            Id = edge.Id,
            Source = edge.FromObservableId,
            Target = edge.ToObservableId,
            RelationshipType = edge.RelationshipType,
            Confidence = edge.Confidence,
            EvidenceCount = edge.EvidenceCount
        };
    }
}
