using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.RuleLifecycle;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/rule-workflow")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Rule workflow endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class RuleWorkflowController : ControllerBase
{
    private readonly IRuleWorkflowService _ruleWorkflowService;

    public RuleWorkflowController(IRuleWorkflowService ruleWorkflowService)
    {
        _ruleWorkflowService = ruleWorkflowService;
    }

    [HttpPost("proposals")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleProposalResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RuleProposalResponse>> CreateProposal(
        [FromBody] CreateRuleProposalRequest request,
        CancellationToken cancellationToken)
    {
        var proposal = await _ruleWorkflowService.CreateProposalAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetAlertWorkflow), new { alertId = proposal.CaseId }, proposal);
    }

    [HttpPatch("proposals/{proposalId:guid}/review")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleProposalResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleProposalResponse>> ReviewProposal(
        Guid proposalId,
        [FromBody] ReviewRuleProposalRequest request,
        CancellationToken cancellationToken)
    {
        var proposal = await _ruleWorkflowService.ReviewProposalAsync(proposalId, request, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPost("proposals/{proposalId:guid}/simulate")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleSimulationResultResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleSimulationResultResponse>> SimulateProposal(
        Guid proposalId,
        [FromBody] SimulateRuleProposalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ruleWorkflowService.SimulateProposalAsync(proposalId, request, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPatch("rollouts/{rolloutPlanId:guid}/stage")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RolloutPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RolloutPlanResponse>> AdvanceRolloutStage(
        Guid rolloutPlanId,
        [FromBody] AdvanceRolloutStageRequest request,
        CancellationToken cancellationToken)
    {
        var rolloutPlan = await _ruleWorkflowService.AdvanceRolloutStageAsync(rolloutPlanId, request, cancellationToken);
        if (rolloutPlan is null)
        {
            return NotFound();
        }

        return Ok(rolloutPlan);
    }

    [HttpPatch("rollouts/{rolloutPlanId:guid}/canary-observation")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RolloutPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RolloutPlanResponse>> RecordCanaryObservation(
        Guid rolloutPlanId,
        [FromBody] RecordCanaryObservationRequest request,
        CancellationToken cancellationToken)
    {
        var rolloutPlan = await _ruleWorkflowService.RecordCanaryObservationAsync(rolloutPlanId, request, cancellationToken);
        if (rolloutPlan is null)
        {
            return NotFound();
        }

        return Ok(rolloutPlan);
    }

    [HttpPost("rollbacks/{rollbackPlanId:guid}/trigger")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RollbackPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RollbackPlanResponse>> TriggerRollback(
        Guid rollbackPlanId,
        [FromBody] TriggerRollbackRequest request,
        CancellationToken cancellationToken)
    {
        var rollbackPlan = await _ruleWorkflowService.TriggerRollbackAsync(rollbackPlanId, request, cancellationToken);
        if (rollbackPlan is null)
        {
            return NotFound();
        }

        return Ok(rollbackPlan);
    }

    [HttpGet("alerts/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<CaseRuleWorkflowResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CaseRuleWorkflowResponse>> GetAlertWorkflow(Guid alertId, CancellationToken cancellationToken)
    {
        var response = await _ruleWorkflowService.GetCaseWorkflowAsync(alertId, cancellationToken);
        return Ok(response);
    }

    [HttpGet("cases/{caseId:guid}")]
    [Obsolete("Use /api/rule-workflow/alerts/{alertId}. /api/rule-workflow/cases/{caseId} is retained as a compatibility shim.")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<CaseRuleWorkflowResponse>(StatusCodes.Status200OK)]
    public Task<ActionResult<CaseRuleWorkflowResponse>> GetCaseWorkflow(Guid caseId, CancellationToken cancellationToken)
    {
        return GetAlertWorkflow(caseId, cancellationToken);
    }
}
