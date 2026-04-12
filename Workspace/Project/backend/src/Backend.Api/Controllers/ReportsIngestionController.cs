using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/reports/ingestions")]
[ApiExplorerSettings(IgnoreApi = true)]
[Obsolete("Report ingestion endpoint is deprecated outside IoC Manager v2 scope and retained only as a compatibility surface.")]
public sealed class ReportsIngestionController : ControllerBase
{
    private const int MaxUploadSizeBytes = 5 * 1024 * 1024;
    private readonly IReportIngestionService _reportIngestionService;

    public ReportsIngestionController(IReportIngestionService reportIngestionService)
    {
        _reportIngestionService = reportIngestionService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ReportIngestionResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ReportIngestionResponse>> Ingest(
        [FromForm] ReportIngestionFormRequest request,
        CancellationToken cancellationToken)
    {
        if (request.File is { Length: > MaxUploadSizeBytes })
        {
            throw new ArgumentException($"Uploaded file exceeds max size of {MaxUploadSizeBytes} bytes.");
        }

        byte[]? uploadedBytes = null;
        if (request.File is { Length: > 0 })
        {
            await using var stream = request.File.OpenReadStream();
            using var memory = new MemoryStream();
            await stream.CopyToAsync(memory, cancellationToken);
            uploadedBytes = memory.ToArray();
        }

        var command = new IngestReportRequest(
            CaseId: request.CaseId,
            ActorUserId: request.ActorUserId,
            SourceName: request.SourceName,
            SourceType: request.SourceType,
            DocumentId: request.DocumentId,
            DocumentUrl: request.DocumentUrl,
            DocumentText: request.DocumentText,
            BulletinJson: request.BulletinJson,
            DecisionBundleId: request.DecisionBundleId,
            EnableLlmFallback: request.EnableLlmFallback);

        var response = await _reportIngestionService.IngestAsync(
            command,
            uploadedBytes,
            request.File?.FileName,
            request.File?.ContentType,
            cancellationToken);
        return CreatedAtAction(nameof(GetById), new { ingestionId = response.IngestionId }, response);
    }

    [HttpGet("{ingestionId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ReportIngestionDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReportIngestionDetailResponse>> GetById(Guid ingestionId, CancellationToken cancellationToken)
    {
        var item = await _reportIngestionService.GetAsync(ingestionId, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }
}

public sealed class ReportIngestionFormRequest
{
    public Guid CaseId { get; init; }
    public Guid? DecisionBundleId { get; init; }
    public string ActorUserId { get; init; } = string.Empty;
    public string SourceName { get; init; } = string.Empty;
    public string SourceType { get; init; } = string.Empty;
    public string? DocumentId { get; init; }
    public string? DocumentUrl { get; init; }
    public string? DocumentText { get; init; }
    public string? BulletinJson { get; init; }
    public bool EnableLlmFallback { get; init; }
    public IFormFile? File { get; init; }
}
