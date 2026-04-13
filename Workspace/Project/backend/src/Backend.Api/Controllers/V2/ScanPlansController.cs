using Backend.Application.Abstractions.Services;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Route("api/v2/scan-plans")]
public sealed class ScanPlansController : ControllerBase
{
    private readonly IScanPlanService _scanPlanService;

    public ScanPlansController(IScanPlanService scanPlanService)
    {
        _scanPlanService = scanPlanService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ScanPlanResponse>>> List(CancellationToken cancellationToken)
    {
        var result = await _scanPlanService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ScanPlanResponse>> Create(
        [FromBody] CreateScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _scanPlanService.CreateAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/run")]
    public async Task<ActionResult<ScanJobResponse>> Run(
        Guid id,
        [FromBody] RunScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _scanPlanService.RunAsync(id, request, cancellationToken);
        return Ok(result);
    }
}