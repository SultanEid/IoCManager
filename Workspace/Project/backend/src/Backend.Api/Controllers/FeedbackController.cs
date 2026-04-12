using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Feedback;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/feedback")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Feedback endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;

    public FeedbackController(IFeedbackService feedbackService)
    {
        _feedbackService = feedbackService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<FeedbackResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<FeedbackResponse>> Submit([FromBody] SubmitFeedbackRequest request, CancellationToken cancellationToken)
    {
        var item = await _feedbackService.SubmitAsync(request, cancellationToken);
        return CreatedAtAction(nameof(ListByCase), new { caseId = item.CaseId }, item);
    }

    [HttpGet("case/{caseId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<FeedbackResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FeedbackResponse>>> ListByCase(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _feedbackService.ListByCaseAsync(caseId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("alert/{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<FeedbackResponse>>(StatusCodes.Status200OK)]
    public Task<ActionResult<IReadOnlyList<FeedbackResponse>>> ListByAlert(Guid alertId, CancellationToken cancellationToken)
    {
        return ListByCase(alertId, cancellationToken);
    }
}
