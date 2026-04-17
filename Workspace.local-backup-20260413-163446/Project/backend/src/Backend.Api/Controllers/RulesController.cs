using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Rules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/rules")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Rules endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class RulesController : ControllerBase
{
    private readonly IRuleService _ruleService;
    private readonly IAuthSensitiveAuditService _auditService;

    public RulesController(IRuleService ruleService, IAuthSensitiveAuditService auditService)
    {
        _ruleService = ruleService;
        _auditService = auditService;
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RuleResponse>> Create([FromBody] CreateRuleRequest request, CancellationToken cancellationToken)
    {
        var item = await _ruleService.CreateAsync(request, cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "rules.legacy.create",
            "rule",
            item.Id.ToString("N"),
            new { item.Name, item.RuleFamily, item.Version },
            cancellationToken);
        return CreatedAtAction(nameof(GetById), new { ruleId = item.Id }, item);
    }

    [HttpGet("{ruleId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleResponse>> GetById(Guid ruleId, CancellationToken cancellationToken)
    {
        var item = await _ruleService.GetByIdAsync(ruleId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpGet("case/{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleResponse>>> ListByCase(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _ruleService.ListByCaseAsync(caseId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("alert/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleResponse>>(StatusCodes.Status200OK)]
    public Task<ActionResult<IReadOnlyList<RuleResponse>>> ListByAlert(Guid alertId, CancellationToken cancellationToken)
    {
        return ListByCase(alertId, cancellationToken);
    }

    [HttpPut("{ruleId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleResponse>> Update(
        Guid ruleId,
        [FromBody] UpdateRuleRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _ruleService.UpdateAsync(ruleId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            "rules.legacy.update",
            "rule",
            item.Id.ToString("N"),
            new { item.Version, request.ChangeReason },
            cancellationToken);

        return Ok(item);
    }

    [HttpPatch("{ruleId:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleResponse>> UpdateStatus(
        Guid ruleId,
        [FromBody] UpdateRuleStatusRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _ruleService.UpdateStatusAsync(ruleId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            "rules.legacy.status.update",
            "rule",
            item.Id.ToString("N"),
            new { request.Status },
            cancellationToken);

        return Ok(item);
    }

    [HttpPatch("{ruleId:guid}/review")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleResponse>> Review(
        Guid ruleId,
        [FromBody] ReviewRuleRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _ruleService.ReviewAsync(ruleId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            "rules.legacy.review",
            "rule",
            item.Id.ToString("N"),
            new { request.Decision, request.ReviewerUserId },
            cancellationToken);

        return Ok(item);
    }

    [HttpPost("{ruleId:guid}/validate")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleValidationResultResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleValidationResultResponse>> Validate(
        Guid ruleId,
        [FromBody] ValidateRuleRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _ruleService.ValidateAsync(ruleId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpPatch("{ruleId:guid}/last-useful-hit")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleResponse>> RecordUsefulHit(
        Guid ruleId,
        [FromBody] RecordRuleHitRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _ruleService.RecordUsefulHitAsync(ruleId, request, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpGet("{ruleId:guid}/revisions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleRevisionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleRevisionResponse>>> Revisions(Guid ruleId, CancellationToken cancellationToken)
    {
        var items = await _ruleService.ListRevisionsAsync(ruleId, cancellationToken);
        return Ok(items);
    }

    [HttpDelete("{ruleId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid ruleId, [FromQuery] string actorUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            return BadRequest("actorUserId is required.");
        }

        var deleted = await _ruleService.DeleteAsync(ruleId, actorUserId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            "rules.legacy.delete",
            "rule",
            ruleId.ToString("N"),
            new { actorUserId },
            cancellationToken);

        return NoContent();
    }
}
