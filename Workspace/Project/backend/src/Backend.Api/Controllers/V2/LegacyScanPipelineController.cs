using System.Text.Json;
using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/legacy-pipeline")]
public sealed class LegacyScanPipelineController : ControllerBase
{
    private readonly ILegacyScanPipelineService _service;

    public LegacyScanPipelineController(ILegacyScanPipelineService service)
    {
        _service = service;
    }

    [HttpGet("networks")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineNetworkResponse>>> ListNetworks(CancellationToken cancellationToken)
        => Ok(await _service.ListNetworksAsync(cancellationToken));

    [HttpPost("networks")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineNetworkResponse>> CreateNetwork(
        [FromBody] CreateLegacyPipelineNetworkRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.CreateNetworkAsync(request, cancellationToken);
            return CreatedAtAction(nameof(ListNetworks), new { id = created.Id }, created);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("networks/{networkId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineNetworkResponse>> UpdateNetwork(
        string networkId,
        [FromBody] UpdateLegacyPipelineNetworkRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateNetworkAsync(networkId, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("networks/{networkId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineNetworkDeletionResponse>> DeleteNetwork(
        string networkId,
        [FromQuery] bool force,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteNetworkAsync(networkId, force, cancellationToken);
            return deleted is null ? NotFound() : Ok(deleted);
        }
        catch (LegacyPipelineNetworkDeletionBlockedException ex)
        {
            return Conflict(ex.Response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("networks/{networkId}/discover")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineDiscoveryResponse>> DiscoverNetwork(
        string networkId,
        [FromBody] LegacyPipelineDiscoveryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.DiscoverNetworkAsync(networkId, request, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("targets")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineTargetResponse>>> ListTargets([FromQuery] string? networkId, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ListTargetsAsync(networkId, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("targets/{targetId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineTargetResponse>> UpdateTarget(
        string targetId,
        [FromBody] UpdateLegacyPipelineTargetRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateTargetAsync(targetId, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("rule-presets")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineRulePresetResponse>>> ListRulePresets(CancellationToken cancellationToken)
        => Ok(await _service.ListRulePresetsAsync(cancellationToken));

    [HttpGet("plans")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineScanPlanResponse>>> ListPlans(CancellationToken cancellationToken)
        => Ok(await _service.ListPlansAsync(cancellationToken));

    [HttpPost("plans")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanPlanResponse>> CreatePlan(
        [FromBody] LegacyPipelineScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.CreatePlanAsync(request, cancellationToken);
            return CreatedAtAction(nameof(ListPlans), new { id = created.Id }, created);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("plans/{planId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanPlanResponse>> UpdatePlan(
        string planId,
        [FromBody] LegacyPipelineScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdatePlanAsync(planId, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("plans/{planId}/clone")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanPlanResponse>> ClonePlan(
        string planId,
        CancellationToken cancellationToken)
    {
        try
        {
            var cloned = await _service.ClonePlanAsync(planId, cancellationToken);
            return cloned is null ? NotFound() : Ok(cloned);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("plans/{planId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanPlanDeletionResponse>> DeletePlan(
        string planId,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeletePlanAsync(planId, cancellationToken);
            return deleted is null ? NotFound() : Ok(deleted);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("plans/{planId}/run")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanPlanRunResponse>> RunPlan(
        string planId,
        [FromBody] LegacyPipelineScanPlanRunRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _service.RunPlanAsync(planId, request, cancellationToken);
            return response is null ? NotFound() : Ok(response);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("custom-scans")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<LegacyPipelineCustomScanResponse>> CreateCustomScan(CancellationToken cancellationToken)
    {
        try
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            var request = new LegacyPipelineCustomScanRequest(
                form["actorUserId"].ToString(),
                ParseStringArray(form["scannerFamiliesJson"].ToString()),
                form["ruleInputMode"].ToString(),
                NullIfEmpty(form["rulePath"].ToString()),
                ParseDictionary(form["rulePathsByFamilyJson"].ToString()),
                ParseStringArray(form["networkIdsJson"].ToString()),
                ParseStringArray(form["targetIdsJson"].ToString()),
                ParseDictionary(form["optionsJson"].ToString()),
                ParseNonNullDictionary(form["targetOsOverridesJson"].ToString()));

            var ruleFiles = form.Files.Where(file => !string.Equals(file.Name, "pcapFile", StringComparison.OrdinalIgnoreCase)).ToArray();
            var pcapFile = form.Files.FirstOrDefault(file => string.Equals(file.Name, "pcapFile", StringComparison.OrdinalIgnoreCase));
            return Ok(await _service.CreateCustomScanAsync(request, ruleFiles, pcapFile, cancellationToken));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or JsonException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineScanJobResponse>>> ListJobs(CancellationToken cancellationToken)
        => Ok(await _service.ListJobsAsync(cancellationToken));

    [HttpPost("jobs/{jobId}/stop")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineScanJobResponse>> StopJob(string jobId, CancellationToken cancellationToken)
    {
        try
        {
            var stopped = await _service.StopJobAsync(jobId, cancellationToken);
            return stopped is null ? NotFound() : Ok(stopped);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("results")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineScanResultResponse>>> ListResults(
        [FromQuery] string? jobId,
        [FromQuery] string? targetId,
        [FromQuery] int? limit,
        [FromQuery] string? scannerFamily,
        [FromQuery] string? status,
        [FromQuery] bool includeOrphaned,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ListResultsAsync(jobId, targetId, limit, scannerFamily, status, includeOrphaned, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("iocs")]
    public async Task<ActionResult<LegacyPipelineIocFindingListResponse>> ListIocFindings(
        [FromQuery] string? scannerFamily,
        [FromQuery] string? targetId,
        [FromQuery] string? severity,
        [FromQuery] string? fromUtc,
        [FromQuery] string? toUtc,
        [FromQuery] string? q,
        [FromQuery] string? painLevel,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ListIocFindingsAsync(scannerFamily, targetId, severity, fromUtc, toUtc, q, painLevel, page, pageSize, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("iocs/{iocId}")]
    public async Task<ActionResult<LegacyPipelineIocFindingDetailResponse>> GetIocFindingDetail(
        string iocId,
        CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _service.GetIocFindingDetailAsync(iocId, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("pain-analysis")]
    public async Task<ActionResult<LegacyPipelinePainAnalysisResponse>> GetPainAnalysis(
        [FromQuery] string? scannerFamily,
        [FromQuery] string? targetId,
        [FromQuery] string? severity,
        [FromQuery] string? fromUtc,
        [FromQuery] string? toUtc,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetPainAnalysisAsync(scannerFamily, targetId, severity, fromUtc, toUtc, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("overview-summary")]
    public async Task<ActionResult<LegacyPipelineOverviewSummaryResponse>> GetOverviewSummary(CancellationToken cancellationToken)
        => Ok(await _service.GetOverviewSummaryAsync(cancellationToken));

    [HttpGet("reports")]
    public async Task<ActionResult<IReadOnlyList<LegacyPipelineReportRecordResponse>>> ListReports(CancellationToken cancellationToken)
        => Ok(await _service.ListReportsAsync(cancellationToken));

    [HttpGet("reports/{reportId}")]
    public async Task<ActionResult<LegacyPipelineReportDetailResponse>> GetReportDetail(string reportId, CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _service.GetReportDetailAsync(reportId, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("reports/generate")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineGeneratedReportResponse>> GenerateReport(
        [FromBody] LegacyPipelineGenerateReportRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Persist)
        {
            return BadRequest("Legacy report persistence is disabled. Use /api/v2/reports/generate to save reports in reports_v2.");
        }

        try
        {
            return Ok(await _service.GenerateReportAsync(request, cancellationToken));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("reports/{reportId}/download")]
    public async Task<IActionResult> DownloadReport(string reportId, [FromQuery] string? format, CancellationToken cancellationToken)
    {
        try
        {
            var file = await _service.ResolveReportDownloadAsync(reportId, format, cancellationToken);
            return file is null ? NotFound() : PhysicalFile(file.FilePath, file.ContentType, file.FileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("reports/{reportId}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    public async Task<ActionResult<LegacyPipelineReportDeletionResponse>> DeleteReport(string reportId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteReportAsync(reportId, cancellationToken);
            return deleted is null ? NotFound() : Ok(deleted);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private static IReadOnlyList<string> ParseStringArray(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        return JsonSerializer.Deserialize<string[]>(json) ?? [];
    }

    private static Dictionary<string, string?>? ParseDictionary(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        return JsonSerializer.Deserialize<Dictionary<string, string?>>(json);
    }

    private static Dictionary<string, string>? ParseNonNullDictionary(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
    }

    private static string? NullIfEmpty(string value)
        => string.IsNullOrWhiteSpace(value) ? null : value;
}
