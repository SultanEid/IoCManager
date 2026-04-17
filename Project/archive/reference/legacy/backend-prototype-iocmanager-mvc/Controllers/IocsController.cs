using System.Security.Claims;
using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "AnalystAccess")]
[Route("api/iocs")]
public sealed class IocsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IObservableLifecycleService _lifecycleService;
    private readonly IIocIntelligenceClient _intelligenceClient;
    private readonly IIocDecisionTraceService _decisionTraceService;

    public IocsController(
        ApplicationDbContext dbContext,
        IObservableLifecycleService lifecycleService,
        IIocIntelligenceClient intelligenceClient,
        IIocDecisionTraceService decisionTraceService)
    {
        _dbContext = dbContext;
        _lifecycleService = lifecycleService;
        _intelligenceClient = intelligenceClient;
        _decisionTraceService = decisionTraceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetIocs(
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] string? q = null,
        [FromQuery] DateTime? since = null,
        [FromQuery] int confidenceMin = 0,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 200);
        var query = _dbContext.Observables.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalized = type.Trim().ToLowerInvariant();
            query = query.Where(x => x.Type == normalized);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = status.Trim().ToLowerInvariant();
            query = query.Where(x => x.Status == normalized);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var normalized = q.Trim().ToLowerInvariant();
            query = query.Where(x => x.ValueRaw.ToLower().Contains(normalized) || x.ValueCanonical.Contains(normalized));
        }

        if (since.HasValue)
        {
            query = query.Where(x => x.LastSeenUtc >= since.Value);
        }

        if (confidenceMin > 0)
        {
            query = query.Where(x => x.Confidence >= confidenceMin);
        }

        var total = await query.CountAsync(cancellationToken);
        var rawRows = await query
            .OrderByDescending(x => x.Confidence)
            .ThenByDescending(x => x.LastSeenUtc)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(x => new
            {
                Id = x.Id,
                Type = x.Type,
                Value = x.ValueRaw,
                Status = x.Status,
                Confidence = x.Confidence,
                SourceCount = x.SourceCount,
                FirstSeenUtc = x.FirstSeenUtc,
                LastSeenUtc = x.LastSeenUtc,
                ExpiresAtUtc = x.ExpiresAtUtc,
                BaseConfidence = x.BaseConfidence,
                SourceBonus = x.SourceBonus,
                SightingBonus = x.SightingBonus,
                CorrelationBonus = x.CorrelationBonus,
                RiskScore = x.ModelRiskScore,
                RiskTier = x.RiskTier,
                ModelConfidence = x.ModelConfidence,
                RecommendedAction = x.RecommendedAction,
                ModelVersion = x.ModelVersion,
                LastScoredUtc = x.LastScoredUtc
            })
            .ToListAsync(cancellationToken);

        var rows = rawRows.Select(x => new IocListResponse
        {
            Id = x.Id,
            Type = x.Type,
            Value = x.Value,
            Status = x.Status,
            Confidence = x.Confidence,
            SourceCount = x.SourceCount,
            FirstSeenUtc = x.FirstSeenUtc,
            LastSeenUtc = x.LastSeenUtc,
            ExpiresAtUtc = x.ExpiresAtUtc,
            ConfidenceFactors = new Dictionary<string, int>
            {
                ["base"] = x.BaseConfidence,
                ["sourceBonus"] = x.SourceBonus,
                ["sightingBonus"] = x.SightingBonus,
                ["correlationBonus"] = x.CorrelationBonus
            },
            RiskScore = x.RiskScore,
            RiskTier = x.RiskTier,
            ModelConfidence = x.ModelConfidence,
            RecommendedAction = x.RecommendedAction,
            ModelVersion = x.ModelVersion,
            LastScoredUtc = x.LastScoredUtc
        }).ToList();

        return Ok(new
        {
            items = rows,
            pagination = new { total, page = safePage, pageSize = safePageSize },
            computedAt = DateTime.UtcNow
        });
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] IocUpsertRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var observable = await _lifecycleService.UpsertAsync(request, actorUserId, cancellationToken);
        var scoreRequest = new ScoreIocRequest
        {
            IocValue = request.Value,
            IocType = request.Type,
            SourceSystem = string.IsNullOrWhiteSpace(request.SourceSystem) ? request.Source : request.SourceSystem,
            EventTime = request.EventTime?.ToUniversalTime() ?? DateTime.UtcNow,
            HostContext = request.HostContext ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
            RuleContext = request.RuleContext ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        };

        scoreRequest.RuleContext["observable_id"] = observable.Id.ToString();
        scoreRequest.RuleContext["observable_status"] = observable.Status;

        var scoreResult = await _intelligenceClient.ScoreAsync(scoreRequest, cancellationToken);
        if (scoreResult.Score is not null)
        {
            await _decisionTraceService.RecordScoreAsync(observable, scoreRequest, scoreResult.Score, cancellationToken);
        }

        return Ok(new
        {
            id = observable.Id,
            type = observable.Type,
            value = observable.ValueRaw,
            canonical = observable.ValueCanonical,
            status = observable.Status,
            confidence = observable.Confidence,
            risk_score = observable.ModelRiskScore,
            risk_tier = observable.RiskTier,
            model_confidence = observable.ModelConfidence,
            uncertainty_set = observable.UncertaintySet,
            recommended_action = observable.RecommendedAction,
            ttl_hours = observable.TtlHours,
            model_version = observable.ModelVersion,
            scoring_error = scoreResult.Score is null ? scoreResult.Error : null,
            computedAt = DateTime.UtcNow
        });
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] IocStatusUpdateRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

        try
        {
            var updated = await _lifecycleService.UpdateStatusAsync(id, request.Status, actorUserId, cancellationToken);
            if (updated is null)
            {
                return NotFound(new { message = "IOC not found." });
            }

            return Ok(new
            {
                id = updated.Id,
                status = updated.Status,
                computedAt = DateTime.UtcNow
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
