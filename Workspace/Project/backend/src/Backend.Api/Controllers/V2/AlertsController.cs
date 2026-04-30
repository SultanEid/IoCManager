using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AlertAccess)]
[Route("api/v2/alerts")]
public sealed class AlertsController : ControllerBase
{
    private static readonly AlertProgressResponse EmptyProgress = new(0, 0, 0, 0, 0);

    private readonly CtiDbContext _dbContext;
    private readonly LegacyScanPipelineDbContext _legacyDbContext;
    private readonly IAlertOwnerResolver _ownerResolver;
    private readonly IAlertEmailSender _emailSender;

    public AlertsController(
        CtiDbContext dbContext,
        LegacyScanPipelineDbContext legacyDbContext,
        IAlertOwnerResolver ownerResolver,
        IAlertEmailSender emailSender)
    {
        _dbContext = dbContext;
        _legacyDbContext = legacyDbContext;
        _ownerResolver = ownerResolver;
        _emailSender = emailSender;
    }

    [HttpGet("owners")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<AlertOwnerResponse>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<AlertOwnerResponse>> ListOwners()
    {
        return Ok(_ownerResolver
            .ListConfiguredOwners()
            .Select(owner => new AlertOwnerResponse(owner.Key, owner.DisplayName, owner.Email))
            .ToArray());
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlertListResponse>> List([FromQuery] AlertSearchQuery query, CancellationToken cancellationToken)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(query.FromUtc, nameof(query.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(query.ToUtc, nameof(query.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(query.FromUtc), nameof(query.ToUtc));

        var (page, pageSize, skip) = V2SearchHelpers.NormalizePaging(query.Page, query.PageSize);
        var alerts = _dbContext.AlertsV2.AsNoTracking().AsQueryable();

        var q = V2SearchHelpers.NormalizeNullable(query.Q);
        if (q is not null)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(q);
            alerts = alerts.Where(x =>
                EF.Functions.Like(x.Title, pattern)
                || EF.Functions.Like(x.Summary, pattern)
                || EF.Functions.Like(x.OwnerUserId, pattern)
                || EF.Functions.Like(x.TargetDisplay, pattern)
                || EF.Functions.Like(x.RuleName, pattern));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = V2Mappings.ParseAlertStatusFromCaseStatus(query.Status);
            alerts = alerts.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Severity))
        {
            var severity = V2Mappings.ParseSeverityOrPriority(query.Severity);
            alerts = alerts.Where(x => x.Severity == severity);
        }

        var ownerUserId = V2SearchHelpers.NormalizeNullable(query.OwnerUserId);
        if (ownerUserId is not null)
        {
            var ownerPattern = V2SearchHelpers.ToContainsPattern(ownerUserId);
            alerts = alerts.Where(x => EF.Functions.Like(x.OwnerUserId, ownerPattern));
        }

        if (fromUtc.HasValue)
        {
            alerts = alerts.Where(x => x.LastDetectedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            alerts = alerts.Where(x => x.LastDetectedAtUtc <= toUtc.Value);
        }

        var normalizedFamily = V2SearchHelpers.NormalizeNullable(query.Family);
        if (normalizedFamily is not null)
        {
            if (!RuleFamilyCatalog.TryNormalize(normalizedFamily, out var parsedFamily))
            {
                return BadRequest($"Invalid family '{query.Family}'.");
            }

            alerts = alerts.Where(x => x.ScannerFamily == parsedFamily);
        }

        var normalizedTargetId = V2SearchHelpers.NormalizeNullable(query.TargetId);
        if (normalizedTargetId is not null)
        {
            if (!int.TryParse(normalizedTargetId, out var parsedTargetId))
            {
                return BadRequest($"Invalid target id '{query.TargetId}'.");
            }

            alerts = alerts.Where(x => x.TargetId == parsedTargetId);
        }

        var totalCount = await alerts.CountAsync(cancellationToken);
        var items = await alerts
            .OrderByDescending(x => x.LastDetectedAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .ToArrayAsync(cancellationToken);
        var progressByAlertId = await BuildProgressByAlertIdAsync(items.Select(x => x.Id).ToArray(), cancellationToken);

        return Ok(new AlertListResponse(
            items.Select(item =>
            {
                var progress = ResolveProgress(progressByAlertId, item.Id);
                return item.ToAlertResponse(progress.TotalIocs, progress);
            }).ToArray(),
            totalCount,
            page,
            pageSize));
    }

    [HttpGet("{alertId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> GetById(Guid alertId, CancellationToken cancellationToken)
    {
        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AlertResponse>> Create([FromBody] CreateAlertRequest request, CancellationToken cancellationToken)
    {
        if (!_ownerResolver.TryResolve(request.OwnerUserId, out var owner))
        {
            return BadRequest($"Invalid alert owner '{request.OwnerUserId}'.");
        }

        var severity = V2Mappings.ParseSeverityOrPriority(request.Severity);
        var nowUtc = DateTimeOffset.UtcNow;

        var existing = await _dbContext.AlertsV2.FirstOrDefaultAsync(
            x => x.Title == request.Title.Trim()
                && x.OwnerUserId == owner.Key
                && x.Severity == severity
                && (x.Status == AlertStatus.Open || x.Status == AlertStatus.Investigating),
            cancellationToken);

        if (existing is not null)
        {
            existing.SetOwner(owner.Key, owner.DisplayName, owner.Email, request.ActorUserId, nowUtc);
            existing.RefreshDetection(request.Title, request.Summary, severity, request.DetectedAtUtc, request.ActorUserId, nowUtc);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(existing.ToAlertResponse(progress: EmptyProgress));
        }

        var entity = Alert.Create(
            request.Title,
            request.Summary,
            severity,
            owner.Key,
            owner.DisplayName,
            owner.Email,
            request.ApprovalTierRequired,
            "manual",
            null,
            "Unscoped",
            request.Title,
            request.DetectedAtUtc,
            request.ActorUserId,
            nowUtc);

        _dbContext.AlertsV2.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { alertId = entity.Id }, entity.ToAlertResponse(progress: EmptyProgress));
    }

    [HttpPatch("{alertId:guid}/owner")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> UpdateOwner(
        Guid alertId,
        [FromBody] UpdateAlertOwnerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            return BadRequest("Actor user id is required.");
        }

        if (!_ownerResolver.TryResolve(request.OwnerUserId, out var owner))
        {
            return BadRequest($"Invalid alert owner '{request.OwnerUserId}'.");
        }

        var entity = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        entity.SetOwner(owner.Key, owner.DisplayName, owner.Email, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPatch("{alertId:guid}/status")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> UpdateStatus(
        Guid alertId,
        [FromBody] UpdateAlertStatusRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseAlertStatusFromCaseStatus(request.Status);
        entity.SetStatus(status, request.ActorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPatch("{alertId:guid}/iocs/{iocId:guid}/status")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertDetailResponse>> UpdateIocStatus(
        Guid alertId,
        Guid iocId,
        [FromBody] UpdateAlertIocStatusRequest request,
        CancellationToken cancellationToken)
    {
        var link = await _dbContext.AlertIocs
            .FirstOrDefaultAsync(x => x.AlertId == alertId && x.IocId == iocId, cancellationToken);
        if (link is null)
        {
            return NotFound();
        }

        var alert = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (alert is null)
        {
            return NotFound();
        }

        var status = V2Mappings.ParseAlertIocStatus(request.Status);
        var nowUtc = DateTimeOffset.UtcNow;
        link.SetStatus(status, request.ActorUserId, nowUtc);
        if (alert.Status == AlertStatus.Open && status != AlertIocStatus.Open)
        {
            alert.SetStatus(AlertStatus.Investigating, request.ActorUserId, nowUtc);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildAlertDetailAsync(alertId, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPost("{alertId:guid}/scan-results")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LinkScanResult(
        Guid alertId,
        [FromBody] LinkAlertScanResultRequest request,
        CancellationToken cancellationToken)
    {
        var alertExists = await _dbContext.AlertsV2
            .AsNoTracking()
            .AnyAsync(x => x.Id == alertId, cancellationToken);
        if (!alertExists)
        {
            return NotFound();
        }

        var scanResultExists = await _dbContext.ScanResults
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.ScanResultId, cancellationToken);
        if (!scanResultExists)
        {
            return NotFound();
        }

        var linkExists = await _dbContext.AlertScanResults
            .AsNoTracking()
            .AnyAsync(
                x => x.AlertId == alertId && x.ScanResultId == request.ScanResultId,
                cancellationToken);
        if (!linkExists)
        {
            _dbContext.AlertScanResults.Add(
                AlertScanResult.Create(alertId, request.ScanResultId, DateTimeOffset.UtcNow));
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    private async Task<IReadOnlyDictionary<Guid, AlertProgressResponse>> BuildProgressByAlertIdAsync(
        IReadOnlyCollection<Guid> alertIds,
        CancellationToken cancellationToken)
    {
        if (alertIds.Count == 0)
        {
            return new Dictionary<Guid, AlertProgressResponse>();
        }

        var links = await _dbContext.AlertIocs
            .AsNoTracking()
            .Where(x => alertIds.Contains(x.AlertId))
            .Select(x => new AlertIocProgressRow(x.AlertId, x.Status))
            .ToArrayAsync(cancellationToken);

        return links
            .GroupBy(x => x.AlertId)
            .ToDictionary(x => x.Key, x => BuildProgress(x.Select(item => item.Status)));
    }

    private static AlertProgressResponse ResolveProgress(
        IReadOnlyDictionary<Guid, AlertProgressResponse> progressByAlertId,
        Guid alertId)
    {
        return progressByAlertId.TryGetValue(alertId, out var progress) ? progress : EmptyProgress;
    }

    private static AlertProgressResponse BuildProgress(IEnumerable<AlertIoc> links)
    {
        return BuildProgress(links.Select(x => x.Status));
    }

    private static AlertProgressResponse BuildProgress(IEnumerable<AlertIocStatus> statuses)
    {
        var items = statuses.ToArray();
        if (items.Length == 0)
        {
            return EmptyProgress;
        }

        var openCount = items.Count(x => x == AlertIocStatus.Open);
        var inReviewCount = items.Count(x => x == AlertIocStatus.InReview);
        var completedCount = items.Count(IsCompletedIocStatus);
        var score = items.Sum(GetProgressScore);
        var percentComplete = (int)Math.Round(score / (double)items.Length, MidpointRounding.AwayFromZero);

        return new AlertProgressResponse(items.Length, openCount, inReviewCount, completedCount, percentComplete);
    }

    private static bool IsCompletedIocStatus(AlertIocStatus status)
        => status is AlertIocStatus.Contained or AlertIocStatus.FalsePositive or AlertIocStatus.AcceptedRisk;

    private static int GetProgressScore(AlertIocStatus status)
        => status switch
        {
            AlertIocStatus.Open => 0,
            AlertIocStatus.InReview => 50,
            _ => 100,
        };

    [HttpGet("{alertId:guid}/email-updates")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<AlertEmailUpdateResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<AlertEmailUpdateResponse>>> ListEmailUpdates(
        Guid alertId,
        CancellationToken cancellationToken)
    {
        var alertExists = await _dbContext.AlertsV2.AsNoTracking().AnyAsync(x => x.Id == alertId, cancellationToken);
        if (!alertExists)
        {
            return NotFound();
        }

        var updates = await _dbContext.AlertEmailUpdates
            .AsNoTracking()
            .Where(x => x.AlertId == alertId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

        return Ok(updates.Select(ToEmailUpdateResponse).ToArray());
    }

    [HttpPost("{alertId:guid}/email-updates")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertEmailUpdateResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertEmailUpdateResponse>> SendEmailUpdate(
        Guid alertId,
        [FromBody] SendAlertEmailUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateEmailUpdateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var alert = await _dbContext.AlertsV2.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (alert is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(alert.OwnerEmail))
        {
            return BadRequest("Alert owner email is required before sending an email update.");
        }

        var ccEmails = NormalizeCcEmails(request.CcEmails);
        AlertEmailDeliveryResult delivery;
        try
        {
            delivery = await _emailSender.SendAsync(
                alert.OwnerEmail,
                ccEmails,
                request.Subject.Trim(),
                request.Body.Trim(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            delivery = new AlertEmailDeliveryResult(AlertEmailDeliveryStatus.Failed, ex.Message, null);
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var entity = AlertEmailUpdate.Create(
            alert.Id,
            request.Subject,
            request.Body,
            alert.OwnerEmail,
            JsonSerializer.Serialize(ccEmails),
            delivery.Status,
            delivery.FailureDetail,
            delivery.SentAtUtc,
            request.ActorUserId,
            nowUtc);

        _dbContext.AlertEmailUpdates.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToEmailUpdateResponse(entity);
        return CreatedAtAction(nameof(ListEmailUpdates), new { alertId = alert.Id }, response);
    }

    private async Task<AlertDetailResponse?> BuildAlertDetailAsync(Guid alertId, CancellationToken cancellationToken)
    {
        var alert = await _dbContext.AlertsV2
            .AsNoTracking()
            .Where(x => x.Id == alertId)
            .FirstOrDefaultAsync(cancellationToken);

        if (alert is null)
        {
            return null;
        }

        var linkedIocLinks = await _dbContext.AlertIocs
            .AsNoTracking()
            .Where(x => x.AlertId == alertId)
            .OrderByDescending(x => x.LinkedAtUtc)
            .ToArrayAsync(cancellationToken);
        var linkedIocIds = linkedIocLinks.Select(x => x.IocId).ToArray();

        var linkedIocs = linkedIocIds.Length == 0
            ? []
            : await _legacyDbContext.Iocs
                .AsNoTracking()
                .Where(x => linkedIocIds.Contains(x.Id))
                .Include(x => x.YaraDetail)
                .Include(x => x.SigmaDetail)
                .Include(x => x.NetworkDetail)
                .OrderByDescending(x => x.TimestampUtc)
                .ToArrayAsync(cancellationToken);
        var linkedIocsById = linkedIocs.ToDictionary(x => x.Id);

        var linkedResultIds = linkedIocs
            .Where(x => x.ResultId.HasValue)
            .Select(x => x.ResultId!.Value)
            .Distinct()
            .ToArray();

        var linkedResults = linkedResultIds.Length == 0
            ? []
            : await _legacyDbContext.ScanResults
                .AsNoTracking()
                .Where(x => linkedResultIds.Contains(x.ResultId))
                .OrderByDescending(x => x.FinishedAt ?? x.StartedAt)
                .ToArrayAsync(cancellationToken);

        var normalizedLinkedResults = await (
                from link in _dbContext.AlertScanResults.AsNoTracking()
                join result in _dbContext.ScanResults.AsNoTracking() on link.ScanResultId equals result.Id
                where link.AlertId == alertId
                orderby link.LinkedAtUtc descending
                select result)
            .ToArrayAsync(cancellationToken);

        var target = alert.TargetId.HasValue
            ? await _legacyDbContext.Targets.AsNoTracking().FirstOrDefaultAsync(x => x.TargetId == alert.TargetId.Value, cancellationToken)
            : null;
        var progress = BuildProgress(linkedIocLinks);

        var detail = new AlertDetailResponse(
            alert.Id,
            alert.Title,
            alert.Summary,
            alert.Severity.ToString(),
            alert.Status.ToString(),
            alert.OwnerUserId,
            alert.OwnerDisplayName,
            alert.OwnerEmail,
            alert.ApprovalTierRequired,
            alert.ScannerFamily,
            alert.TargetId?.ToString(),
            alert.TargetDisplay,
            alert.RuleName,
            progress.TotalIocs,
            progress,
            alert.FirstDetectedAtUtc,
            alert.LastDetectedAtUtc,
            alert.CreatedAtUtc,
            alert.UpdatedAtUtc,
            target is null
                ? null
                : new AlertTargetSummaryResponse(
                    target.TargetId.ToString(),
                    string.IsNullOrWhiteSpace(target.DisplayName)
                        ? string.IsNullOrWhiteSpace(target.HostName)
                            ? target.IPAddress
                            : $"{target.HostName} - {target.IPAddress}"
                        : $"{target.DisplayName} - {target.IPAddress}",
                    target.HostName,
                    target.IPAddress,
                    target.Status,
                    target.TargetOsType),
            linkedIocLinks
                .Where(link => linkedIocsById.ContainsKey(link.IocId))
                .Select(link => ToLinkedIocResponse(linkedIocsById[link.IocId], link))
                .ToArray(),
            normalizedLinkedResults
                .Select(ToLinkedScanResultResponse)
                .Concat(linkedResults.Select(ToLinkedScanResultResponse))
                .ToArray());

        return detail;
    }

    private sealed record AlertIocProgressRow(Guid AlertId, AlertIocStatus Status);

    private static string? ValidateEmailUpdateRequest(SendAlertEmailUpdateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            return "Actor user id is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return "Subject is required.";
        }

        if (request.Subject.Trim().Length > 200)
        {
            return "Subject must be 200 characters or fewer.";
        }

        if (string.IsNullOrWhiteSpace(request.Body))
        {
            return "Body is required.";
        }

        if (request.Body.Trim().Length > 8000)
        {
            return "Body must be 8000 characters or fewer.";
        }

        var ccEmails = NormalizeCcEmails(request.CcEmails);
        if (ccEmails.Count > 10)
        {
            return "CC can include at most 10 email addresses.";
        }

        var emailValidator = new EmailAddressAttribute();
        var invalidCc = ccEmails.FirstOrDefault(email => !emailValidator.IsValid(email));
        return invalidCc is null ? null : $"Invalid CC email '{invalidCc}'.";
    }

    private static IReadOnlyList<string> NormalizeCcEmails(IReadOnlyList<string>? ccEmails)
    {
        return (ccEmails ?? [])
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Select(email => email.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static AlertEmailUpdateResponse ToEmailUpdateResponse(AlertEmailUpdate source)
    {
        var ccEmails = string.IsNullOrWhiteSpace(source.CcEmailsJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(source.CcEmailsJson) ?? [];

        return new AlertEmailUpdateResponse(
            source.Id,
            source.AlertId,
            source.Subject,
            source.Body,
            source.ToEmail,
            ccEmails,
            source.DeliveryStatus.ToString(),
            source.FailureDetail,
            source.SentAtUtc,
            source.CreatedByUserId,
            source.CreatedAtUtc);
    }

    private static AlertLinkedIocResponse ToLinkedIocResponse(LegacyPipelineIocEntity source, AlertIoc link)
    {
        var severity = NormalizeAlertSeverity(
            source.ScannerType,
            source.SigmaDetail?.Severity,
            source.NetworkDetail?.Severity);

        var indicator = ResolveIndicator(source);
        return new AlertLinkedIocResponse(
            source.Id.ToString(),
            NormalizeFamily(source.ScannerType),
            source.RuleName,
            indicator.Value,
            indicator.Kind,
            severity,
            link.Status.ToString(),
            link.StatusUpdatedAtUtc,
            link.StatusUpdatedByUserId,
            DateTime.SpecifyKind(source.TimestampUtc, DateTimeKind.Utc),
            source.RawPayload,
            source.YaraDetail is null ? null : new AlertLinkedIocYaraDetailResponse(source.YaraDetail.FilePath, source.YaraDetail.FileHash),
            source.SigmaDetail is null ? null : new AlertLinkedIocSigmaDetailResponse(source.SigmaDetail.LogSource, NormalizeFreeformSeverity(source.SigmaDetail.Severity), source.SigmaDetail.CommandLine),
            source.NetworkDetail is null ? null : new AlertLinkedIocNetworkDetailResponse(source.NetworkDetail.SourceIP, source.NetworkDetail.DestIP, source.NetworkDetail.Protocol, NormalizeFreeformSeverity(source.NetworkDetail.Severity), source.NetworkDetail.FlowId));
    }

    private static AlertLinkedScanResultResponse ToLinkedScanResultResponse(LegacyPipelineScanResultEntity source)
    {
        return new AlertLinkedScanResultResponse(
            source.ResultId.ToString(),
            source.JobId?.ToString(),
            source.Status ?? "Unknown",
            source.NoOfFindings ?? 0,
            source.StartedAt is null ? null : DateTime.SpecifyKind(source.StartedAt.Value, DateTimeKind.Utc),
            source.FinishedAt is null ? null : DateTime.SpecifyKind(source.FinishedAt.Value, DateTimeKind.Utc));
    }

    private static AlertLinkedScanResultResponse ToLinkedScanResultResponse(ScanResult source)
    {
        return new AlertLinkedScanResultResponse(
            source.Id.ToString("D"),
            source.ScanJobId?.ToString("D"),
            source.Disposition.ToString(),
            source.OccurrenceCount,
            source.FirstObservedAtUtc,
            source.LastObservedAtUtc);
    }

    private static (string Value, string Kind) ResolveIndicator(LegacyPipelineIocEntity source)
    {
        var family = NormalizeFamily(source.ScannerType);
        if (family == "yara")
        {
            return (source.YaraDetail?.FilePath ?? source.RawPayload ?? source.RuleName, "file");
        }

        if (family == "sigma")
        {
            return (source.SigmaDetail?.CommandLine ?? source.RuleName ?? source.RawPayload ?? string.Empty, "event");
        }

        var networkIndicator = string.IsNullOrWhiteSpace(source.NetworkDetail?.SourceIP) && string.IsNullOrWhiteSpace(source.NetworkDetail?.DestIP)
            ? source.RawPayload ?? source.RuleName
            : $"{source.NetworkDetail?.SourceIP ?? "unknown"} -> {source.NetworkDetail?.DestIP ?? "unknown"}";
        return (networkIndicator, "network");
    }

    private static string NormalizeFamily(string? rawFamily)
    {
        return RuleFamilyCatalog.TryNormalize(rawFamily, out var normalized) ? normalized : (rawFamily ?? "unknown").ToLowerInvariant();
    }

    private static string NormalizeAlertSeverity(string scannerType, string? sigmaSeverity, string? networkSeverity)
    {
        var family = NormalizeFamily(scannerType);
        return family switch
        {
            "sigma" => NormalizeFreeformSeverity(sigmaSeverity),
            "snort" or "suricata" => NormalizeFreeformSeverity(networkSeverity),
            _ => "Unknown",
        };
    }

    private static string NormalizeFreeformSeverity(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return "Unknown";
        }

        var normalized = rawValue.Trim();
        if (int.TryParse(normalized, out var numeric))
        {
            return numeric switch
            {
                <= 1 => "Critical",
                2 => "High",
                3 => "Medium",
                _ => "Low",
            };
        }

        return normalized.ToLowerInvariant() switch
        {
            "crit" or "critical" => "Critical",
            "high" => "High",
            "med" or "medium" => "Medium",
            "low" => "Low",
            _ => "Unknown",
        };
    }
}
