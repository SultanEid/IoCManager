using System.Text.Json;
using IocVmwareIngestion.Api.Contracts;
using IocVmwareIngestion.Api.Entities;
using IocVmwareIngestion.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IocVmwareIngestion.Api.Controllers;

[ApiController]
[Route("api/scans")]
public sealed class ScansController(
    IScanOrchestrator orchestrator,
    IScanRunRepository repository,
    IocExtractionService extractionService) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IScanOrchestrator _orchestrator = orchestrator;
    private readonly IScanRunRepository _repository = repository;
    private readonly IocExtractionService _extractionService = extractionService;

    [HttpPost("preview-raw")]
    public ActionResult<RawScannerJsonPreviewResponse> PreviewRaw([FromBody] RawScannerJsonPreviewRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RawJson))
        {
            return BadRequest("RawJson is required.");
        }

        IReadOnlyCollection<ScannerEnvelope> envelopes;

        try
        {
            envelopes = ScannerOutputParser.ParseEnvelopes(request.RawJson, JsonOptions);
        }
        catch (JsonException exception)
        {
            return BadRequest($"Invalid scanner JSON: {exception.Message}");
        }

        if (envelopes.Count == 0)
        {
            return BadRequest("Scanner JSON could not be parsed.");
        }

        var firstEnvelope = envelopes.First();
        var iocs = envelopes.SelectMany(_extractionService.Extract).ToArray();

        return Ok(new RawScannerJsonPreviewResponse(
            firstEnvelope.Metadata.ScannerType,
            firstEnvelope.Metadata.TargetServer,
            firstEnvelope.Metadata.ExitCode,
            iocs.Length,
            iocs.Select(IocRecordResponse.FromEntity).ToArray()));
    }

    [HttpPost("save-raw")]
    public async Task<ActionResult<RawScannerJsonPersistResponse>> SaveRaw(
        [FromBody] RawScannerJsonPreviewRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RawJson))
        {
            return BadRequest("RawJson is required.");
        }

        IReadOnlyCollection<ScannerEnvelope> envelopes;

        try
        {
            envelopes = ScannerOutputParser.ParseEnvelopes(request.RawJson, JsonOptions);
        }
        catch (JsonException exception)
        {
            return BadRequest($"Invalid scanner JSON: {exception.Message}");
        }

        if (envelopes.Count == 0)
        {
            return BadRequest("Scanner JSON could not be parsed.");
        }

        var firstEnvelope = envelopes.First();
        var iocs = envelopes.SelectMany(_extractionService.Extract).ToList();
        var timestampUtc = DateTime.TryParse(firstEnvelope.Metadata.TimestampUtc, out var parsedUtc) ? parsedUtc : DateTime.UtcNow;
        var scanRun = new ScanRun
        {
            ScannerType = firstEnvelope.Metadata.ScannerType.Trim().ToLowerInvariant(),
            TargetServer = firstEnvelope.Metadata.TargetServer,
            TargetOsType = firstEnvelope.Metadata.OsType,
            TargetAddress = firstEnvelope.Metadata.TargetServer,
            ExitCode = firstEnvelope.Metadata.ExitCode,
            StartedUtc = timestampUtc,
            CompletedUtc = timestampUtc,
            CommandLine = firstEnvelope.Metadata.CommandLine,
            RawStdOut = request.RawJson,
            Status = iocs.Count == 0 ? "NoFindings" : "Succeeded",
            FindingsCount = iocs.Count
        };

        foreach (var ioc in iocs)
        {
            ioc.CreatedUtc = DateTime.UtcNow;
            scanRun.IocRecords.Add(ioc);
        }

        await _repository.SaveAsync(scanRun, cancellationToken);

        return Ok(new RawScannerJsonPersistResponse(
            firstEnvelope.Metadata.ScannerType,
            firstEnvelope.Metadata.TargetServer,
            firstEnvelope.Metadata.OsType,
            firstEnvelope.Metadata.ExitCode,
            scanRun.IocRecords.Count,
            scanRun.IocRecords.Select(IocRecordResponse.FromEntity).ToArray()));
    }

    [HttpPost("run")]
    public async Task<ActionResult<ScanRunResponse>> Run([FromBody] RunScanRequest request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.RunAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("run-all")]
    public async Task<ActionResult<IReadOnlyCollection<ScanRunResponse>>> RunAll(
        [FromBody] RunAllConfiguredScansRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _orchestrator.RunConfiguredTargetsAsync(request ?? new RunAllConfiguredScansRequest(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ScanRunDetailsResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var run = await _repository.GetAsync(id, cancellationToken);
        return run is null ? NotFound() : Ok(ScanRunDetailsResponse.FromEntity(run));
    }
}
