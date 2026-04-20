using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/ai/adjudications")]
public sealed class AiAdjudicationsController : ControllerBase
{
    private readonly IAiAdjudicationService _service;
    private readonly IAuthSensitiveAuditService _auditService;

    public AiAdjudicationsController(
        IAiAdjudicationService service,
        IAuthSensitiveAuditService auditService)
    {
        _service = service;
        _auditService = auditService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<SubmitAdjudicationAcceptedDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SubmitAdjudicationAcceptedDto>> Submit(
        [FromBody] SubmitAdjudicationRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _service.SubmitAsync(request, cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.submit",
            entityType: "ai_adjudication",
            entityId: response.AdjudicationId.ToString("D"),
            payload: new
            {
                request.CaseId,
                request.DetectionId,
                request.IocType,
                request.IocValue,
                response.Status,
            },
            cancellationToken: cancellationToken);

        return Accepted(response);
    }

    [HttpGet("{adjudicationId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AdjudicationResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdjudicationResultDto>> GetResult(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var response = await _service.GetResultAsync(adjudicationId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.result.read",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new { response.Status },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("{adjudicationId:guid}/explanation")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ExplanationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<PendingResponseDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExplanationDetailDto>> GetExplanation(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var response = await _service.GetExplanationAsync(adjudicationId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.explanation.read",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new { response.Status, hasContent = response.GeneratedAtUtc.HasValue },
            cancellationToken: cancellationToken);

        if (!response.GeneratedAtUtc.HasValue)
        {
            return StatusCode(StatusCodes.Status202Accepted, new PendingResponseDto(
                AdjudicationId: adjudicationId,
                Status: response.Status,
                Message: "Explanation is not ready yet."));
        }

        return Ok(response);
    }

    [HttpGet("{adjudicationId:guid}/action-plan")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RecommendedActionPlanDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<PendingResponseDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecommendedActionPlanDto>> GetActionPlan(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var response = await _service.GetActionPlanAsync(adjudicationId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.actionplan.read",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new { response.Status, hasContent = response.GeneratedAtUtc.HasValue },
            cancellationToken: cancellationToken);

        if (!response.GeneratedAtUtc.HasValue)
        {
            return StatusCode(StatusCodes.Status202Accepted, new PendingResponseDto(
                AdjudicationId: adjudicationId,
                Status: response.Status,
                Message: "Action plan is not ready yet."));
        }

        return Ok(response);
    }

    [HttpPost("{adjudicationId:guid}/override-closure")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<OverrideOrClosureResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OverrideOrClosureResponseDto>> SubmitOverrideOrClosure(
        Guid adjudicationId,
        [FromBody] OverrideOrClosureRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _service.SubmitOverrideOrClosureAsync(adjudicationId, request, cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.override_closure.submit",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new
            {
                response.OverrideId,
                response.ActionType,
                response.PreviousStatus,
                response.NewStatus,
                response.Reason,
                response.SubmittedByUserId,
            },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("{adjudicationId:guid}/similar-detections")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<SimilarDetectionsResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SimilarDetectionsResponseDto>> GetSimilarDetections(
        Guid adjudicationId,
        [FromQuery] SimilarDetectionsQueryDto query,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetSimilarDetectionsAsync(adjudicationId, query.Limit, query.Cursor, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.similar.read",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new { query.Limit, query.Cursor, itemCount = response.Items.Count },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("{adjudicationId:guid}/evidence-sources")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<EvidenceSourcesResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvidenceSourcesResponseDto>> GetEvidenceSources(
        Guid adjudicationId,
        [FromQuery] EvidenceSourcesQueryDto query,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetEvidenceSourcesAsync(adjudicationId, query.Limit, query.Cursor, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.adjudication.evidence.read",
            entityType: "ai_adjudication",
            entityId: adjudicationId.ToString("D"),
            payload: new { query.Limit, query.Cursor, itemCount = response.Items.Count },
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
