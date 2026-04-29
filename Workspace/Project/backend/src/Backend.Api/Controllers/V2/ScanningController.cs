using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/scanning")]
public sealed class ScanningController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly IScanJobQueue _scanJobQueue;
    private readonly IResultIngestionService _resultIngestionService;

    public ScanningController(CtiDbContext dbContext, IScanJobQueue scanJobQueue, IResultIngestionService resultIngestionService)
    {
        _dbContext = dbContext;
        _scanJobQueue = scanJobQueue;
        _resultIngestionService = resultIngestionService;
    }

    [HttpGet("plans")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<ScanPlanResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScanPlanResponse>>> ListPlans(CancellationToken cancellationToken)
    {
        try
        {
            var plans = await _dbContext.ScanPlans
                .AsNoTracking()
                .OrderBy(x => x.Name)
                .ToArrayAsync(cancellationToken);

            if (plans.Length == 0)
            {
                return Ok(Array.Empty<ScanPlanResponse>());
            }

            return Ok(await BuildScanPlanResponsesAsync(plans, cancellationToken));
        }
        catch (SqlException exception) when (exception.Number == 208)
        {
            return Ok(Array.Empty<ScanPlanResponse>());
        }
    }

    [HttpGet("plans/{scanPlanId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ScanPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScanPlanResponse>> GetPlan(Guid scanPlanId, CancellationToken cancellationToken)
    {
        var plan = await _dbContext.ScanPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanPlanId, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        var response = await BuildScanPlanResponseAsync(plan, cancellationToken);
        return Ok(response);
    }

    [HttpPost("plans")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanPlanResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanPlanResponse>> CreatePlan([FromBody] CreateScanPlanRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var scannerCapability = V2Mappings.ParseEnum<ScannerCapability>(request.ScannerCapability, nameof(request.ScannerCapability));
            var ruleSelectionMode = V2Mappings.ParseEnum<ScanRuleSelectionMode>(request.RuleSelectionMode, nameof(request.RuleSelectionMode));
            var cadenceType = V2Mappings.ParseEnum<ScanCadenceType>(request.CadenceType, nameof(request.CadenceType));
            var status = string.IsNullOrWhiteSpace(request.Status)
                ? ScanPlanStatus.Draft
                : V2Mappings.ParseEnum<ScanPlanStatus>(request.Status, nameof(request.Status));

            RuleScopeType? ruleScopeType = null;
            if (!string.IsNullOrWhiteSpace(request.RuleScopeType))
            {
                ruleScopeType = V2Mappings.ParseEnum<RuleScopeType>(request.RuleScopeType, nameof(request.RuleScopeType));
            }

            var targetServerIds = request.TargetServerIds.Distinct().ToArray();
            var ruleRevisionIds = request.RuleRevisionIds.Distinct().ToArray();
            var validationError = await ValidatePlanLinkReferencesAsync(ruleSelectionMode, targetServerIds, ruleRevisionIds, cancellationToken);
            if (validationError is not null)
            {
                return BadRequest(validationError);
            }

            var nowUtc = DateTimeOffset.UtcNow;
            var plan = ScanPlan.Create(
                request.Name,
                request.Description,
                scannerCapability,
                ruleSelectionMode,
                ruleScopeType,
                request.RuleScopeValue,
                cadenceType,
                request.IntervalMinutes,
                request.RunAtHourUtc,
                request.RunAtMinuteUtc,
                request.WeeklyDayOfWeek,
                request.OperatorNotes,
                status,
                request.ActorUserId,
                nowUtc);

            _dbContext.ScanPlans.Add(plan);

            foreach (var targetServerId in targetServerIds)
            {
                _dbContext.ScanPlanTargetServers.Add(ScanPlanTargetServer.Create(plan.Id, targetServerId, request.ActorUserId, nowUtc));
            }

            foreach (var ruleRevisionId in ruleRevisionIds)
            {
                _dbContext.ScanPlanRuleRevisions.Add(ScanPlanRuleRevision.Create(plan.Id, ruleRevisionId, request.ActorUserId, nowUtc));
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            var response = await BuildScanPlanResponseAsync(plan, cancellationToken);
            return CreatedAtAction(nameof(GetPlan), new { scanPlanId = plan.Id }, response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("plans/{scanPlanId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanPlanResponse>> UpdatePlan(
        Guid scanPlanId,
        [FromBody] UpdateScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var scannerCapability = V2Mappings.ParseEnum<ScannerCapability>(request.ScannerCapability, nameof(request.ScannerCapability));
            var ruleSelectionMode = V2Mappings.ParseEnum<ScanRuleSelectionMode>(request.RuleSelectionMode, nameof(request.RuleSelectionMode));
            var cadenceType = V2Mappings.ParseEnum<ScanCadenceType>(request.CadenceType, nameof(request.CadenceType));
            var status = V2Mappings.ParseEnum<ScanPlanStatus>(request.Status, nameof(request.Status));

            RuleScopeType? ruleScopeType = null;
            if (!string.IsNullOrWhiteSpace(request.RuleScopeType))
            {
                ruleScopeType = V2Mappings.ParseEnum<RuleScopeType>(request.RuleScopeType, nameof(request.RuleScopeType));
            }

            var targetServerIds = request.TargetServerIds.Distinct().ToArray();
            var ruleRevisionIds = request.RuleRevisionIds.Distinct().ToArray();
            var validationError = await ValidatePlanLinkReferencesAsync(ruleSelectionMode, targetServerIds, ruleRevisionIds, cancellationToken);
            if (validationError is not null)
            {
                return BadRequest(validationError);
            }

            var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(x => x.Id == scanPlanId, cancellationToken);
            if (plan is null)
            {
                return NotFound();
            }

            var nowUtc = DateTimeOffset.UtcNow;
            plan.Update(
                request.Name,
                request.Description,
                scannerCapability,
                ruleSelectionMode,
                ruleScopeType,
                request.RuleScopeValue,
                cadenceType,
                request.IntervalMinutes,
                request.RunAtHourUtc,
                request.RunAtMinuteUtc,
                request.WeeklyDayOfWeek,
                request.OperatorNotes,
                request.ActorUserId,
                nowUtc);
            plan.SetStatus(status, request.ActorUserId, nowUtc);

            var targetLinks = await _dbContext.ScanPlanTargetServers
                .Where(x => x.ScanPlanId == scanPlanId)
                .ToArrayAsync(cancellationToken);
            _dbContext.ScanPlanTargetServers.RemoveRange(targetLinks);

            var ruleLinks = await _dbContext.ScanPlanRuleRevisions
                .Where(x => x.ScanPlanId == scanPlanId)
                .ToArrayAsync(cancellationToken);
            _dbContext.ScanPlanRuleRevisions.RemoveRange(ruleLinks);

            foreach (var targetServerId in targetServerIds)
            {
                _dbContext.ScanPlanTargetServers.Add(ScanPlanTargetServer.Create(scanPlanId, targetServerId, request.ActorUserId, nowUtc));
            }

            foreach (var ruleRevisionId in ruleRevisionIds)
            {
                _dbContext.ScanPlanRuleRevisions.Add(ScanPlanRuleRevision.Create(scanPlanId, ruleRevisionId, request.ActorUserId, nowUtc));
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(await BuildScanPlanResponseAsync(plan, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("plans/{scanPlanId:guid}/run")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanJobResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanJobResponse>> RunPlanNow(
        Guid scanPlanId,
        [FromBody] RunScanPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(x => x.Id == scanPlanId, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        var targetServerIds = await _dbContext.ScanPlanTargetServers
            .Where(x => x.ScanPlanId == scanPlanId)
            .Select(x => x.TargetServerId)
            .Distinct()
            .ToArrayAsync(cancellationToken);

        if (targetServerIds.Length == 0)
        {
            return BadRequest("Scan plan must include at least one target server.");
        }

        if (plan.RuleSelectionMode == ScanRuleSelectionMode.RuleSet)
        {
            var ruleCount = await _dbContext.ScanPlanRuleRevisions
                .CountAsync(x => x.ScanPlanId == scanPlanId, cancellationToken);
            if (ruleCount == 0)
            {
                return BadRequest("RuleSet mode requires at least one linked rule revision.");
            }
        }

        var triggerSource = string.IsNullOrWhiteSpace(request.TriggerSource)
            ? "Manual"
            : request.TriggerSource.Trim();
        var nowUtc = DateTimeOffset.UtcNow;
        var scanJob = ScanJob.Queue(scanPlanId, triggerSource, request.ActorUserId, nowUtc);
        _dbContext.ScanJobs.Add(scanJob);

        var targetRows = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => targetServerIds.Contains(x.Id))
            .ToArrayAsync(cancellationToken);
        foreach (var target in targetRows)
        {
            _dbContext.ScanJobTargetExecutions.Add(
                ScanJobTargetExecution.QueueSnapshot(
                    scanJob.Id,
                    target.Id,
                    target.Hostname,
                    target.IpAddress,
                    request.ActorUserId,
                    nowUtc));
        }

        plan.MarkQueued(request.ActorUserId, nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _scanJobQueue.EnqueueAsync(scanJob.Id, cancellationToken);

        var counts = await LoadJobCountsByJobIdAsync([scanJob.Id], cancellationToken);
        var response = scanJob.ToScanJobResponse(
            counts.TryGetValue(scanJob.Id, out var value)
                ? value
                : new ScanJobStatusCounts(0, 0, 0, 0, 0));
        return CreatedAtAction(nameof(GetJob), new { scanJobId = scanJob.Id }, response);
    }

    [HttpGet("jobs")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<ScanJobResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScanJobResponse>>> ListJobs(
        [FromQuery] Guid? scanPlanId,
        [FromQuery] string? status,
        [FromQuery] string? queuedFromUtc,
        [FromQuery] string? queuedToUtc,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var parsedStatus = TryParseScanJobStatus(status);
        if (!string.IsNullOrWhiteSpace(status) && !parsedStatus.HasValue)
        {
            return BadRequest($"Invalid status '{status}'.");
        }

        var parsedFromUtc = ParseOptionalDate(queuedFromUtc);
        if (!string.IsNullOrWhiteSpace(queuedFromUtc) && !parsedFromUtc.HasValue)
        {
            return BadRequest($"Invalid queuedFromUtc '{queuedFromUtc}'.");
        }

        var parsedToUtc = ParseOptionalDate(queuedToUtc);
        if (!string.IsNullOrWhiteSpace(queuedToUtc) && !parsedToUtc.HasValue)
        {
            return BadRequest($"Invalid queuedToUtc '{queuedToUtc}'.");
        }

        var boundedTake = Math.Clamp(take, 1, 500);
        var query = _dbContext.ScanJobs.AsNoTracking().AsQueryable();

        if (scanPlanId.HasValue)
        {
            query = query.Where(x => x.ScanPlanId == scanPlanId.Value);
        }

        if (parsedStatus.HasValue)
        {
            query = query.Where(x => x.Status == parsedStatus.Value);
        }

        if (parsedFromUtc.HasValue)
        {
            query = query.Where(x => x.QueuedAtUtc >= parsedFromUtc.Value);
        }

        if (parsedToUtc.HasValue)
        {
            query = query.Where(x => x.QueuedAtUtc <= parsedToUtc.Value);
        }

        try
        {
            var jobs = await query
                .OrderByDescending(x => x.QueuedAtUtc)
                .Take(boundedTake)
                .ToArrayAsync(cancellationToken);

            if (jobs.Length == 0)
            {
                return Ok(Array.Empty<ScanJobResponse>());
            }

            var counts = await LoadJobCountsByJobIdAsync(jobs.Select(x => x.Id), cancellationToken);
            var response = jobs
                .Select(job => job.ToScanJobResponse(
                    counts.TryGetValue(job.Id, out var value)
                        ? value
                        : new ScanJobStatusCounts(0, 0, 0, 0, 0)))
                .ToArray();

            return Ok(response);
        }
        catch (SqlException exception) when (exception.Number == 208)
        {
            return Ok(Array.Empty<ScanJobResponse>());
        }
    }

    [HttpGet("jobs/{scanJobId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ScanJobResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScanJobResponse>> GetJob(Guid scanJobId, CancellationToken cancellationToken)
    {
        var job = await _dbContext.ScanJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanJobId, cancellationToken);
        if (job is null)
        {
            return NotFound();
        }

        var counts = await LoadJobCountsByJobIdAsync([scanJobId], cancellationToken);
        return Ok(job.ToScanJobResponse(
            counts.TryGetValue(scanJobId, out var value)
                ? value
                : new ScanJobStatusCounts(0, 0, 0, 0, 0)));
    }

    [HttpGet("jobs/{scanJobId:guid}/targets")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<ScanJobTargetExecutionResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ScanJobTargetExecutionResponse>>> ListJobTargets(
        Guid scanJobId,
        CancellationToken cancellationToken)
    {
        var jobExists = await _dbContext.ScanJobs
            .AsNoTracking()
            .AnyAsync(x => x.Id == scanJobId, cancellationToken);
        if (!jobExists)
        {
            return NotFound();
        }

        var targets = await _dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJobId)
            .OrderBy(x => x.TargetHostname)
            .ThenBy(x => x.TargetIpAddress)
            .ToArrayAsync(cancellationToken);

        return Ok(targets.Select(x => x.ToScanJobTargetExecutionResponse()).ToArray());
    }

    [HttpPost("results/ingestions")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<DetectionResultIngestionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DetectionResultIngestionResponse>> IngestResults(
        [FromBody] DetectionResultIngestionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Rows is null || request.Rows.Count == 0)
        {
            return BadRequest("At least one result row is required.");
        }

        var ingestionResult = await _resultIngestionService.IngestAsync(
            new ResultIngestionBatchRequest(
                request.Source,
                request.ActorUserId,
                request.Rows
                    .Select(x => new ResultIngestionInputRow(x.ScannerFamily, x.Payload))
                    .ToArray()),
            cancellationToken);

        return Ok(new DetectionResultIngestionResponse(
            ingestionResult.IngestionRunId,
            ingestionResult.TotalRows,
            ingestionResult.AcceptedRows,
            ingestionResult.DeduplicatedRows,
            ingestionResult.RejectedRows,
            ingestionResult.Accepted
                .Select(x => new DetectionResultIngestionAcceptedRowResponse(
                    x.RowIndex,
                    x.ScanResultId,
                    x.Deduplicated,
                    x.Fingerprint))
                .ToArray(),
            ingestionResult.Diagnostics
                .Select(x => new DetectionResultIngestionDiagnosticResponse(
                    x.RowIndex,
                    x.Code,
                    x.Field,
                    x.Message,
                    x.RawSnippetHash))
                .ToArray()));
    }

    [HttpGet("results")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DetectionHistoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DetectionHistoryResponse>> ListDetectionHistory(
        [FromQuery] DetectionSearchQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(query.Family) && !RuleFamilyCatalog.TryNormalize(query.Family, out _))
        {
            return BadRequest($"Invalid scannerFamily '{query.Family}'.");
        }

        var parsedStatus = TryParseDisposition(query.Status);
        if (!string.IsNullOrWhiteSpace(query.Status) && !parsedStatus.HasValue)
        {
            return BadRequest($"Invalid status '{query.Status}'.");
        }

        var parsedFromUtc = ParseOptionalDate(query.FromUtc);
        if (!string.IsNullOrWhiteSpace(query.FromUtc) && !parsedFromUtc.HasValue)
        {
            return BadRequest($"Invalid fromUtc '{query.FromUtc}'.");
        }

        var parsedToUtc = ParseOptionalDate(query.ToUtc);
        if (!string.IsNullOrWhiteSpace(query.ToUtc) && !parsedToUtc.HasValue)
        {
            return BadRequest($"Invalid toUtc '{query.ToUtc}'.");
        }

        if (parsedFromUtc.HasValue && parsedToUtc.HasValue && parsedFromUtc.Value > parsedToUtc.Value)
        {
            return BadRequest("fromUtc must be less than or equal to toUtc.");
        }

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize, defaultPageSize: 50, maxPageSize: 500);
        var take = pageSize;

        try
        {
            var response = await BuildDetectionHistoryResponseAsync(
                query.ServerId,
                query.IocId,
                query.RuleRevisionId,
                query.Family,
                parsedStatus,
                query.Source,
                query.ScanJobId,
                parsedFromUtc,
                parsedToUtc,
                query.IncludeProvenance,
                take,
                skip,
                query.Sort,
                cancellationToken);

            return Ok(response);
        }
        catch (SqlException exception) when (exception.Number == 208)
        {
            return Ok(new DetectionHistoryResponse(0, take, skip, Array.Empty<DetectionHistoryItemResponse>()));
        }
    }

    [HttpGet("results/servers/{serverId:guid}/history")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DetectionHistoryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DetectionHistoryResponse>> GetServerDetectionHistory(
        Guid serverId,
        [FromQuery] Guid? iocId,
        [FromQuery] Guid? ruleRevisionId,
        [FromQuery] string? scannerFamily,
        [FromQuery] Guid? scanJobId,
        [FromQuery] string? fromUtc,
        [FromQuery] string? toUtc,
        [FromQuery] bool includeProvenance = false,
        [FromQuery] int take = 100,
        [FromQuery] int skip = 0,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        return await ListDetectionHistory(
            new DetectionSearchQuery
            {
                ServerId = serverId,
                IocId = iocId,
                RuleRevisionId = ruleRevisionId,
                Family = scannerFamily,
                ScanJobId = scanJobId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                IncludeProvenance = includeProvenance,
                Page = take <= 0 ? 1 : (skip / take) + 1,
                PageSize = take,
                Sort = sort,
            },
            cancellationToken);
    }

    [HttpGet("results/iocs/{iocId:guid}/history")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DetectionHistoryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DetectionHistoryResponse>> GetIocDetectionHistory(
        Guid iocId,
        [FromQuery] Guid? serverId,
        [FromQuery] Guid? ruleRevisionId,
        [FromQuery] string? scannerFamily,
        [FromQuery] Guid? scanJobId,
        [FromQuery] string? fromUtc,
        [FromQuery] string? toUtc,
        [FromQuery] bool includeProvenance = false,
        [FromQuery] int take = 100,
        [FromQuery] int skip = 0,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        return await ListDetectionHistory(
            new DetectionSearchQuery
            {
                ServerId = serverId,
                IocId = iocId,
                RuleRevisionId = ruleRevisionId,
                Family = scannerFamily,
                ScanJobId = scanJobId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                IncludeProvenance = includeProvenance,
                Page = take <= 0 ? 1 : (skip / take) + 1,
                PageSize = take,
                Sort = sort,
            },
            cancellationToken);
    }

    [HttpGet("results/rules/{ruleRevisionId:guid}/history")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DetectionHistoryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DetectionHistoryResponse>> GetRuleDetectionHistory(
        Guid ruleRevisionId,
        [FromQuery] Guid? serverId,
        [FromQuery] Guid? iocId,
        [FromQuery] string? scannerFamily,
        [FromQuery] Guid? scanJobId,
        [FromQuery] string? fromUtc,
        [FromQuery] string? toUtc,
        [FromQuery] bool includeProvenance = false,
        [FromQuery] int take = 100,
        [FromQuery] int skip = 0,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        return await ListDetectionHistory(
            new DetectionSearchQuery
            {
                ServerId = serverId,
                IocId = iocId,
                RuleRevisionId = ruleRevisionId,
                Family = scannerFamily,
                ScanJobId = scanJobId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                IncludeProvenance = includeProvenance,
                Page = take <= 0 ? 1 : (skip / take) + 1,
                PageSize = take,
                Sort = sort,
            },
            cancellationToken);
    }

    [HttpGet("results/{scanResultId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DetectionDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DetectionDetailResponse>> GetDetectionDetail(
        Guid scanResultId,
        CancellationToken cancellationToken = default)
    {
        var response = await BuildDetectionDetailResponseAsync(scanResultId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        return Ok(response);
    }

    [HttpPost("jobs/{scanJobId:guid}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<ScanJobResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScanJobResponse>> CancelJob(
        Guid scanJobId,
        [FromBody] CancelScanJobRequest request,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var scanJob = await _dbContext.ScanJobs
            .FirstOrDefaultAsync(x => x.Id == scanJobId, cancellationToken);
        if (scanJob is null)
        {
            return NotFound();
        }

        scanJob.RequestCancellation(request.ActorUserId, nowUtc, request.Reason);
        if (scanJob.Status == ScanJobStatus.Cancelled)
        {
            var targetRows = await _dbContext.ScanJobTargetExecutions
                .Where(x => x.ScanJobId == scanJobId
                    && (x.Status == ScanJobTargetExecutionStatus.Queued || x.Status == ScanJobTargetExecutionStatus.Running))
                .ToArrayAsync(cancellationToken);

            foreach (var targetRow in targetRows)
            {
                targetRow.Complete(
                    ScanJobTargetExecutionStatus.Cancelled,
                    summary: "Cancelled before execution.",
                    errorMessage: request.Reason,
                    actorUserId: request.ActorUserId,
                    completedAtUtc: nowUtc);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var counts = await LoadJobCountsByJobIdAsync([scanJobId], cancellationToken);
        return Ok(scanJob.ToScanJobResponse(
            counts.TryGetValue(scanJobId, out var value)
                ? value
                : new ScanJobStatusCounts(0, 0, 0, 0, 0)));
    }

    private async Task<DetectionDetailResponse?> BuildDetectionDetailResponseAsync(
        Guid scanResultId,
        CancellationToken cancellationToken)
    {
        var row = await _dbContext.ScanResults
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanResultId, cancellationToken);
        if (row is null)
        {
            return null;
        }

        var serverHostname = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => x.Id == row.TargetServerId)
            .Select(x => x.Hostname)
            .FirstOrDefaultAsync(cancellationToken);

        var ruleName = row.RuleRevisionId.HasValue
            ? await (
                from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
                join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                where revision.Id == row.RuleRevisionId.Value
                select artifact.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        string? iocType = null;
        string? iocValue = null;
        if (row.IocId.HasValue)
        {
            var ioc = await _dbContext.Iocs
                .AsNoTracking()
                .Where(x => x.Id == row.IocId.Value)
                .Select(x => new
                {
                    x.Type,
                    x.Value,
                })
                .FirstOrDefaultAsync(cancellationToken);
            if (ioc is not null)
            {
                iocType = ioc.Type.ToString();
                iocValue = ioc.Value;
            }
        }

        var source = await (
            from provenance in _dbContext.ScanResultProvenances.AsNoTracking()
            join run in _dbContext.ScanResultIngestionRuns.AsNoTracking() on provenance.IngestionRunId equals run.Id
            where provenance.ScanResultId == scanResultId
            orderby provenance.ObservedAtUtc descending
            select run.Source)
            .FirstOrDefaultAsync(cancellationToken);

        var linkedAlerts = await (
            from link in _dbContext.AlertScanResults.AsNoTracking()
            join alert in _dbContext.AlertsV2.AsNoTracking() on link.AlertId equals alert.Id
            where link.ScanResultId == scanResultId
            orderby alert.UpdatedAtUtc descending
            select new DetectionLinkedAlertCaseResponse(
                alert.Id,
                alert.Title,
                alert.Status.ToString(),
                alert.Severity.ToString(),
                alert.UpdatedAtUtc))
            .ToArrayAsync(cancellationToken);

        return new DetectionDetailResponse(
            Id: row.Id,
            Fingerprint: row.Fingerprint,
            ScannerFamily: row.ScannerFamily,
            ServerId: row.TargetServerId,
            ServerHostname: serverHostname,
            ScanJobId: row.ScanJobId,
            JobAttemptId: row.JobAttemptId,
            TargetExecutionId: row.TargetExecutionId,
            RuleRevisionId: row.RuleRevisionId,
            RuleName: ruleName,
            IocId: row.IocId,
            IocType: iocType,
            IocValue: iocValue,
            Disposition: row.Disposition.ToString(),
            Confidence: row.Confidence,
            ObservedAtUtc: row.ObservedAtUtc,
            FirstObservedAtUtc: row.FirstObservedAtUtc,
            LastObservedAtUtc: row.LastObservedAtUtc,
            OccurrenceCount: row.OccurrenceCount,
            IsExecutionArtifact: row.IsExecutionArtifact,
            EvidenceJson: row.EvidenceJson,
            RawPayloadHash: row.RawPayloadHash,
            Source: source,
            LinkedAlerts: linkedAlerts,
            LinkedCases: linkedAlerts);
    }

    private async Task<DetectionHistoryResponse> BuildDetectionHistoryResponseAsync(
        Guid? serverId,
        Guid? iocId,
        Guid? ruleRevisionId,
        string? scannerFamily,
        ScanResultDisposition? disposition,
        string? source,
        Guid? scanJobId,
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        bool includeProvenance,
        int take,
        int skip,
        string? sort,
        CancellationToken cancellationToken)
    {
        var boundedTake = Math.Clamp(take, 1, 500);
        var boundedSkip = Math.Clamp(skip, 0, 50_000);

        var query = _dbContext.ScanResults.AsNoTracking().AsQueryable();

        if (serverId.HasValue)
        {
            query = query.Where(x => x.TargetServerId == serverId.Value);
        }

        if (iocId.HasValue)
        {
            query = query.Where(x => x.IocId == iocId.Value);
        }

        if (ruleRevisionId.HasValue)
        {
            query = query.Where(x => x.RuleRevisionId == ruleRevisionId.Value);
        }

        if (!string.IsNullOrWhiteSpace(scannerFamily) && RuleFamilyCatalog.TryNormalize(scannerFamily, out var normalizedFamily))
        {
            query = query.Where(x => x.ScannerFamily == normalizedFamily);
        }

        if (disposition.HasValue)
        {
            query = query.Where(x => x.Disposition == disposition.Value);
        }

        if (scanJobId.HasValue)
        {
            query = query.Where(x => x.ScanJobId == scanJobId.Value);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.ObservedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.ObservedAtUtc <= toUtc.Value);
        }

        var normalizedSource = V2SearchHelpers.NormalizeNullable(source);
        if (normalizedSource is not null)
        {
            var sourcePattern = V2SearchHelpers.ToContainsPattern(normalizedSource);
            query = query.Where(x =>
                _dbContext.ScanResultProvenances.Any(provenance =>
                    provenance.ScanResultId == x.Id
                    && _dbContext.ScanResultIngestionRuns.Any(run =>
                        run.Id == provenance.IngestionRunId
                        && EF.Functions.Like(run.Source, sourcePattern))));
        }

        var total = await query.CountAsync(cancellationToken);
        if (total == 0)
        {
            return new DetectionHistoryResponse(0, boundedTake, boundedSkip, Array.Empty<DetectionHistoryItemResponse>());
        }

        var normalizedSort = string.IsNullOrWhiteSpace(sort)
            ? "observedAtUtc_desc"
            : sort.Trim().ToLowerInvariant();
        query = normalizedSort switch
        {
            "observedatutc_asc" => query.OrderBy(x => x.ObservedAtUtc),
            "firstobservedatutc_desc" => query.OrderByDescending(x => x.FirstObservedAtUtc),
            "firstobservedatutc_asc" => query.OrderBy(x => x.FirstObservedAtUtc),
            "lastobservedatutc_desc" => query.OrderByDescending(x => x.LastObservedAtUtc),
            "lastobservedatutc_asc" => query.OrderBy(x => x.LastObservedAtUtc),
            _ => query.OrderByDescending(x => x.ObservedAtUtc),
        };

        var rows = await query
            .Skip(boundedSkip)
            .Take(boundedTake)
            .ToArrayAsync(cancellationToken);
        if (rows.Length == 0)
        {
            return new DetectionHistoryResponse(total, boundedTake, boundedSkip, Array.Empty<DetectionHistoryItemResponse>());
        }

        var resultIds = rows.Select(x => x.Id).ToArray();
        var serverIds = rows.Select(x => x.TargetServerId).Distinct().ToArray();
        var serverNamesById = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => serverIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Hostname, cancellationToken);
        var iocIds = rows.Where(x => x.IocId.HasValue).Select(x => x.IocId!.Value).Distinct().ToArray();
        var iocValuesById = iocIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Iocs
                .AsNoTracking()
                .Where(x => iocIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Value, cancellationToken);
        var ruleRevisionIds = rows.Where(x => x.RuleRevisionId.HasValue).Select(x => x.RuleRevisionId!.Value).Distinct().ToArray();
        var ruleNamesByRevisionId = ruleRevisionIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await (
                from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
                join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                where ruleRevisionIds.Contains(revision.Id)
                select new
                {
                    revision.Id,
                    artifact.Name,
                })
                .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var provenanceCountRows = await _dbContext.ScanResultProvenances
            .AsNoTracking()
            .Where(x => resultIds.Contains(x.ScanResultId))
            .GroupBy(x => x.ScanResultId)
            .Select(group => new
            {
                ScanResultId = group.Key,
                Count = group.Count(),
            })
            .ToArrayAsync(cancellationToken);
        var provenanceCountByResultId = provenanceCountRows.ToDictionary(x => x.ScanResultId, x => x.Count);

        Dictionary<Guid, IReadOnlyList<DetectionHistoryProvenanceResponse>> provenanceByResultId;
        if (includeProvenance)
        {
            var provenanceRows = await _dbContext.ScanResultProvenances
                .AsNoTracking()
                .Where(x => resultIds.Contains(x.ScanResultId))
                .OrderByDescending(x => x.ObservedAtUtc)
                .ToArrayAsync(cancellationToken);
            provenanceByResultId = provenanceRows
                .GroupBy(x => x.ScanResultId)
                .ToDictionary(
                    group => group.Key,
                    group => (IReadOnlyList<DetectionHistoryProvenanceResponse>)group
                        .Take(25)
                        .Select(item => new DetectionHistoryProvenanceResponse(
                            item.Id,
                            item.IngestionRunId,
                            item.RowIndex,
                            item.IsDuplicate,
                            item.ObservedAtUtc,
                            item.RawPayloadHash,
                            item.RawSampleJson,
                            item.CorrelationMetadataJson,
                            item.ScanJobId,
                            item.JobAttemptId,
                            item.TargetExecutionId,
                            item.CreatedAtUtc))
                        .ToArray());
        }
        else
        {
            provenanceByResultId = new Dictionary<Guid, IReadOnlyList<DetectionHistoryProvenanceResponse>>();
        }

        var sourceRows = await (
            from provenance in _dbContext.ScanResultProvenances.AsNoTracking()
            join ingestionRun in _dbContext.ScanResultIngestionRuns.AsNoTracking() on provenance.IngestionRunId equals ingestionRun.Id
            where resultIds.Contains(provenance.ScanResultId)
            orderby provenance.ObservedAtUtc descending
            select new
            {
                provenance.ScanResultId,
                ingestionRun.Source,
            })
            .ToArrayAsync(cancellationToken);

        var sourceByResultId = sourceRows
            .GroupBy(x => x.ScanResultId)
            .ToDictionary(group => group.Key, group => group.Select(x => x.Source).FirstOrDefault());

        var items = rows.Select(row => new DetectionHistoryItemResponse(
                row.Id,
                row.Fingerprint,
                row.ScannerFamily,
                row.TargetServerId,
                row.ScanJobId,
                row.JobAttemptId,
                row.TargetExecutionId,
                row.RuleRevisionId,
                row.IocId,
                row.Disposition.ToString(),
                row.Confidence,
                row.ObservedAtUtc,
                row.FirstObservedAtUtc,
                row.LastObservedAtUtc,
                row.OccurrenceCount,
                row.IsExecutionArtifact,
                row.EvidenceJson,
                row.RawPayloadHash,
                provenanceCountByResultId.TryGetValue(row.Id, out var provenanceCount) ? provenanceCount : 0,
                provenanceByResultId.TryGetValue(row.Id, out var provenance)
                    ? provenance
                    : Array.Empty<DetectionHistoryProvenanceResponse>(),
                serverNamesById.TryGetValue(row.TargetServerId, out var serverHostname) ? serverHostname : null,
                row.IocId.HasValue && iocValuesById.TryGetValue(row.IocId.Value, out var iocValue) ? iocValue : null,
                row.RuleRevisionId.HasValue && ruleNamesByRevisionId.TryGetValue(row.RuleRevisionId.Value, out var ruleName) ? ruleName : null,
                sourceByResultId.TryGetValue(row.Id, out var resultSource) ? resultSource : null))
            .ToArray();

        return new DetectionHistoryResponse(total, boundedTake, boundedSkip, items);
    }

    private async Task<ScanPlanResponse> BuildScanPlanResponseAsync(ScanPlan plan, CancellationToken cancellationToken)
    {
        var responses = await BuildScanPlanResponsesAsync([plan], cancellationToken);
        return responses[0];
    }

    private async Task<IReadOnlyList<ScanPlanResponse>> BuildScanPlanResponsesAsync(
        IReadOnlyCollection<ScanPlan> plans,
        CancellationToken cancellationToken)
    {
        if (plans.Count == 0)
        {
            return Array.Empty<ScanPlanResponse>();
        }

        var planIds = plans.Select(x => x.Id).Distinct().ToArray();
        var targetLinkRows = await _dbContext.ScanPlanTargetServers
            .AsNoTracking()
            .Where(x => planIds.Contains(x.ScanPlanId))
            .ToArrayAsync(cancellationToken);
        var targetIds = targetLinkRows.Select(x => x.TargetServerId).Distinct().ToArray();
        var targetsById = targetIds.Length == 0
            ? new Dictionary<Guid, ScanPlanTargetSummaryResponse>()
            : await _dbContext.TargetServers
                .AsNoTracking()
                .Where(x => targetIds.Contains(x.Id))
                .Select(x => new ScanPlanTargetSummaryResponse(x.Id, x.Hostname, x.IpAddress))
                .ToDictionaryAsync(x => x.TargetServerId, cancellationToken);

        var ruleLinkRows = await _dbContext.ScanPlanRuleRevisions
            .AsNoTracking()
            .Where(x => planIds.Contains(x.ScanPlanId))
            .ToArrayAsync(cancellationToken);
        var ruleRevisionIds = ruleLinkRows.Select(x => x.RuleRevisionId).Distinct().ToArray();
        var rulesByRevisionId = ruleRevisionIds.Length == 0
            ? new Dictionary<Guid, ScanPlanRuleSummaryResponse>()
            : await (
                from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
                join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                where ruleRevisionIds.Contains(revision.Id)
                select new ScanPlanRuleSummaryResponse(
                    revision.Id,
                    revision.RuleArtifactId,
                    artifact.Name,
                    artifact.RuleFamily,
                    revision.RevisionNumber,
                    revision.VersionLabel))
                .ToDictionaryAsync(x => x.RuleRevisionId, cancellationToken);

        var latestJobsByPlanId = await _dbContext.ScanJobs
            .AsNoTracking()
            .Where(x => x.ScanPlanId.HasValue && planIds.Contains(x.ScanPlanId.Value))
            .OrderByDescending(x => x.QueuedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
        var latestJobLookup = latestJobsByPlanId
            .Where(x => x.ScanPlanId.HasValue)
            .GroupBy(x => x.ScanPlanId!.Value)
            .ToDictionary(x => x.Key, x => x.First());

        var targetIdLookup = targetLinkRows
            .GroupBy(x => x.ScanPlanId)
            .ToDictionary(
                x => x.Key,
                x => (IReadOnlyList<Guid>)x.Select(row => row.TargetServerId).Distinct().OrderBy(id => id).ToArray());
        var targetSummaryLookup = targetLinkRows
            .GroupBy(x => x.ScanPlanId)
            .ToDictionary(
                x => x.Key,
                x => (IReadOnlyList<ScanPlanTargetSummaryResponse>)x
                    .Select(row => targetsById.TryGetValue(row.TargetServerId, out var target)
                        ? target
                        : new ScanPlanTargetSummaryResponse(row.TargetServerId, row.TargetServerId.ToString("N")[..12], string.Empty))
                    .DistinctBy(row => row.TargetServerId)
                    .OrderBy(row => row.Hostname)
                    .ThenBy(row => row.IpAddress)
                    .ToArray());

        var ruleIdLookup = ruleLinkRows
            .GroupBy(x => x.ScanPlanId)
            .ToDictionary(
                x => x.Key,
                x => (IReadOnlyList<Guid>)x.Select(row => row.RuleRevisionId).Distinct().OrderBy(id => id).ToArray());
        var ruleSummaryLookup = ruleLinkRows
            .GroupBy(x => x.ScanPlanId)
            .ToDictionary(
                x => x.Key,
                x => (IReadOnlyList<ScanPlanRuleSummaryResponse>)x
                    .Where(row => rulesByRevisionId.ContainsKey(row.RuleRevisionId))
                    .Select(row => rulesByRevisionId[row.RuleRevisionId])
                    .DistinctBy(row => row.RuleRevisionId)
                    .OrderBy(row => row.RuleName)
                    .ThenBy(row => row.RevisionNumber)
                    .ToArray());

        return plans
            .OrderBy(x => x.Name)
            .Select(plan =>
            {
                latestJobLookup.TryGetValue(plan.Id, out var lastJob);

                return plan.ToScanPlanResponse(
                    targetIdLookup.TryGetValue(plan.Id, out var targetServerIds) ? targetServerIds : Array.Empty<Guid>(),
                    ruleIdLookup.TryGetValue(plan.Id, out var linkedRuleRevisionIds) ? linkedRuleRevisionIds : Array.Empty<Guid>(),
                    targetSummaryLookup.TryGetValue(plan.Id, out var targetSummaries) ? targetSummaries : Array.Empty<ScanPlanTargetSummaryResponse>(),
                    ruleSummaryLookup.TryGetValue(plan.Id, out var ruleSummaries) ? ruleSummaries : Array.Empty<ScanPlanRuleSummaryResponse>(),
                    lastJob?.CompletedAtUtc,
                    lastJob?.Status.ToString(),
                    string.IsNullOrWhiteSpace(lastJob?.Summary) ? null : lastJob!.Summary);
            })
            .ToArray();
    }

    private async Task<string?> ValidatePlanLinkReferencesAsync(
        ScanRuleSelectionMode ruleSelectionMode,
        IReadOnlyCollection<Guid> targetServerIds,
        IReadOnlyCollection<Guid> ruleRevisionIds,
        CancellationToken cancellationToken)
    {
        if (targetServerIds.Count == 0)
        {
            return "At least one target server is required.";
        }

        if (targetServerIds.Any(x => x == Guid.Empty))
        {
            return "Target server ids must be valid GUID values.";
        }

        var existingTargetCount = await _dbContext.TargetServers
            .AsNoTracking()
            .CountAsync(x => targetServerIds.Contains(x.Id), cancellationToken);
        if (existingTargetCount != targetServerIds.Count)
        {
            return "One or more target servers were not found.";
        }

        if (ruleSelectionMode == ScanRuleSelectionMode.RuleSet)
        {
            if (ruleRevisionIds.Count == 0)
            {
                return "RuleSet mode requires at least one rule revision.";
            }

            if (ruleRevisionIds.Any(x => x == Guid.Empty))
            {
                return "Rule revision ids must be valid GUID values.";
            }

            var existingRuleCount = await _dbContext.RuleRevisionsV2
                .AsNoTracking()
                .CountAsync(x => ruleRevisionIds.Contains(x.Id), cancellationToken);
            if (existingRuleCount != ruleRevisionIds.Count)
            {
                return "One or more rule revisions were not found.";
            }
        }
        else if (ruleRevisionIds.Count > 0)
        {
            return "Rule revisions cannot be supplied when RuleSelectionMode is RuleScope.";
        }

        return null;
    }

    private static ScanJobStatus? TryParseScanJobStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var normalized = raw.Trim();
        if (normalized.Equals("Canceled", StringComparison.OrdinalIgnoreCase))
        {
            return ScanJobStatus.Cancelled;
        }

        return Enum.TryParse<ScanJobStatus>(normalized, true, out var parsed)
            ? parsed
            : null;
    }

    private static DateTimeOffset? ParseOptionalDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return DateTimeOffset.TryParse(raw, out var parsed)
            ? parsed
            : null;
    }

    private static ScanResultDisposition? TryParseDisposition(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return Enum.TryParse<ScanResultDisposition>(raw.Trim(), ignoreCase: true, out var parsed)
            ? parsed
            : null;
    }

    private async Task<Dictionary<Guid, ScanJobStatusCounts>> LoadJobCountsByJobIdAsync(
        IEnumerable<Guid> scanJobIds,
        CancellationToken cancellationToken)
    {
        var ids = scanJobIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<Guid, ScanJobStatusCounts>();
        }

        var rows = await _dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .Where(x => ids.Contains(x.ScanJobId))
            .GroupBy(x => x.ScanJobId)
            .Select(group => new
            {
                ScanJobId = group.Key,
                TotalTargets = group.Count(),
                CompletedTargets = group.Count(x => x.Status == ScanJobTargetExecutionStatus.Completed),
                FailedTargets = group.Count(x => x.Status == ScanJobTargetExecutionStatus.Failed),
                CancelledTargets = group.Count(x => x.Status == ScanJobTargetExecutionStatus.Cancelled),
                PartiallyCompletedTargets = group.Count(x => x.Status == ScanJobTargetExecutionStatus.PartiallyCompleted),
            })
            .ToArrayAsync(cancellationToken);

        return rows.ToDictionary(
            x => x.ScanJobId,
            x => new ScanJobStatusCounts(
                x.TotalTargets,
                x.CompletedTargets,
                x.FailedTargets,
                x.CancelledTargets,
                x.PartiallyCompletedTargets));
    }
}
