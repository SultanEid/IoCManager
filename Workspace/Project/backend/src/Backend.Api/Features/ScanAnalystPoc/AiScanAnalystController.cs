using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Features.ScanAnalystPoc;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/ai/scan-analyst")]
public sealed class AiScanAnalystController : ControllerBase
{
    private readonly ScanAnalystPocService _service;
    private readonly IAuthSensitiveAuditService _auditService;

    public AiScanAnalystController(
        ScanAnalystPocService service,
        IAuthSensitiveAuditService auditService)
    {
        _service = service;
        _auditService = auditService;
    }

    [HttpGet("status")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ScanAnalystAgentStatusDto>(StatusCodes.Status200OK)]
    public ActionResult<ScanAnalystAgentStatusDto> GetStatus()
    {
        return Ok(_service.GetStatus());
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanAnalystResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanAnalystResponseDto>> Analyze(
        [FromBody] ScanAnalystRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _service.AnalyzeAsync(request, cancellationToken);

            await _auditService.TryWriteAsync(
                User,
                actionType: "ai.scan_analyst.execute",
                entityType: "scan_plan",
                entityId: response.CreatedPlan?.Id.ToString("D") ?? response.QueuedJob?.Id.ToString("D") ?? "proposal",
                payload: new
                {
                    request.Action,
                    request.SubnetId,
                    response.RecommendedScannerCapability,
                    proposedTargetCount = response.ProposedPlan.TargetServerIds.Count,
                    proposedRuleCount = response.ProposedPlan.RuleRevisionIds.Count,
                    createdPlanId = response.CreatedPlan?.Id,
                    queuedJobId = response.QueuedJob?.Id,
                },
                cancellationToken: cancellationToken);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("chat")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanAnalystChatResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanAnalystChatResponseDto>> Chat(
        [FromBody] ScanAnalystChatRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _service.ChatAsync(request, cancellationToken);

            await _auditService.TryWriteAsync(
                User,
                actionType: "ai.scan_analyst.chat",
                entityType: "scan_analyst_session",
                entityId: response.SessionId.ToString("D"),
                payload: new
                {
                    request.Action,
                    request.SubnetId,
                    request.SimulatedConditions,
                    response.OperatingMode,
                    response.ActiveMockConditions,
                    createdPlanId = response.LatestAnalysis.CreatedPlan?.Id,
                    queuedJobId = response.LatestAnalysis.QueuedJob?.Id,
                },
                cancellationToken: cancellationToken);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("runs/{scanJobId:guid}/summary")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ScanAnalystRunSummaryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScanAnalystRunSummaryDto>> GetRunSummary(Guid scanJobId, CancellationToken cancellationToken)
    {
        var summary = await _service.GetRunSummaryAsync(scanJobId, cancellationToken);
        if (summary is null)
        {
            return NotFound();
        }

        return Ok(summary);
    }
}
