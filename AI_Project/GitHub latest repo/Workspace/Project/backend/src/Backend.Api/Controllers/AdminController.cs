using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminAccess)]
[Route("api/admin")]
public sealed class AdminController : ControllerBase
{
    private readonly IJobOrchestrationService _jobOrchestrationService;
    private readonly IAuthSensitiveAuditService _auditService;

    public AdminController(
        IJobOrchestrationService jobOrchestrationService,
        IAuthSensitiveAuditService auditService)
    {
        _jobOrchestrationService = jobOrchestrationService;
        _auditService = auditService;
    }

    [HttpPost("jobs/model-retraining")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<JobRunResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<JobRunResponse>> RunModelRetraining(
        [FromBody] RunJobRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _jobOrchestrationService.RunModelRetrainingAsync(request.TriggeredByUserId, cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "settings.jobs.model-retraining",
            "job_run",
            item.Id.ToString("N"),
            new { item.JobType, item.Status, request.TriggeredByUserId },
            cancellationToken);
        return Ok(item);
    }

    [HttpGet("jobs/runs")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<JobRunResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<JobRunResponse>>> ListRecentJobRuns(
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var items = await _jobOrchestrationService.ListRecentAsync(take, cancellationToken);
        return Ok(items);
    }
}
