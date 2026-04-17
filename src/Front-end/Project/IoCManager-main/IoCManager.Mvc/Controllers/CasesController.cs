using System.Security.Claims;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "LeadAccess")]
[Route("api/cases")]
public sealed class CasesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public CasesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("promote-cluster/{clusterId:int}")]
    public async Task<IActionResult> PromoteCluster(int clusterId, CancellationToken cancellationToken)
    {
        var cluster = await _dbContext.CorrelationClusters.FirstOrDefaultAsync(x => x.Id == clusterId, cancellationToken);
        if (cluster is null)
        {
            return NotFound(new { message = "Cluster not found." });
        }

        var existing = await _dbContext.CaseShells.FirstOrDefaultAsync(x => x.ClusterId == clusterId, cancellationToken);
        if (existing is not null)
        {
            return Ok(new
            {
                caseId = existing.Id,
                clusterId,
                status = existing.Status,
                createdUtc = existing.CreatedUtc,
                alreadyExisted = true
            });
        }

        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var caseShell = new CaseShell
        {
            ClusterId = clusterId,
            Title = $"Incident Case for {cluster.Name}",
            Status = "open",
            CreatedByUserId = actor,
            CreatedUtc = DateTime.UtcNow
        };
        _dbContext.CaseShells.Add(caseShell);
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actor,
            Action = "CASE_PROMOTE_CLUSTER",
            EntityType = "CorrelationCluster",
            EntityId = clusterId.ToString(),
            Details = $"Cluster promoted to case shell '{caseShell.Title}'.",
            OccurredUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new
        {
            caseId = caseShell.Id,
            clusterId,
            status = caseShell.Status,
            createdUtc = caseShell.CreatedUtc,
            alreadyExisted = false
        });
    }
}
