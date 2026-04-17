using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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

    [HttpGet("link-candidates")]
    public async Task<IActionResult> GetLinkCandidates(
        [FromQuery] int seedId,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        if (seedId <= 0)
        {
            return BadRequest(new { message = "seedId must be greater than zero." });
        }

        var safeLimit = Math.Clamp(limit, 1, 200);
        var rows = await _dbContext.GraphLinkCandidateRecords.AsNoTracking()
            .Where(x => x.SeedObservableId == seedId)
            .OrderByDescending(x => x.ComputedUtc)
            .ThenByDescending(x => x.Score)
            .Take(safeLimit)
            .Select(x => new
            {
                seedObservableId = x.SeedObservableId,
                candidateObservableId = x.CandidateObservableId,
                score = x.Score,
                reason = x.Reason,
                citationsJson = x.CitationsJson,
                computedUtc = x.ComputedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            seedId,
            items = rows,
            metadata = new
            {
                computedAt = DateTime.UtcNow,
                count = rows.Count
            }
        });
    }

    [HttpGet("attack-gaps")]
    public async Task<IActionResult> GetAttackCoverageGaps(
        [FromQuery] int confidenceMin = 70,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var safeConfidence = Math.Clamp(confidenceMin, 0, 100);
        var safeLimit = Math.Clamp(limit, 20, 500);

        var highRisk = await _dbContext.Observables.AsNoTracking()
            .Where(x => x.Confidence >= safeConfidence)
            .OrderByDescending(x => x.Confidence)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        var proposals = await _dbContext.RuleProposalRecords.AsNoTracking()
            .Where(x => x.ObservableId != null)
            .OrderByDescending(x => x.CreatedUtc)
            .ToListAsync(cancellationToken);

        var byObservable = proposals
            .GroupBy(x => x.ObservableId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var rows = highRisk.Select(observable =>
        {
            var hasProposal = byObservable.TryGetValue(observable.Id, out var proposal);
            var techniques = ExtractTechniques(proposal?.AttackTechniquesJson);

            return new
            {
                observableId = observable.Id,
                type = observable.Type,
                value = observable.ValueRaw,
                confidence = observable.Confidence,
                hasTechniqueMapping = techniques.Length > 0,
                techniques,
                proposalFamily = proposal?.RuleFamily,
                proposalStatus = proposal?.Status ?? "none"
            };
        }).ToList();

        var gaps = rows.Where(x => !x.hasTechniqueMapping).Take(50).ToList();

        return Ok(new
        {
            summary = new
            {
                highRiskCount = rows.Count,
                mappedCount = rows.Count(x => x.hasTechniqueMapping),
                gapCount = gaps.Count
            },
            gaps,
            metadata = new
            {
                computedAt = DateTime.UtcNow
            }
        });
    }

    private static string[] ExtractTechniques(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var values = JsonSerializer.Deserialize<string[]>(json);
            return values?.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToArray() ?? [];
        }
        catch
        {
            return [];
        }
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
