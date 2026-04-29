using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.V2;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/ai/decisions")]
public sealed class AiDecisionsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAiDecisionService _service;
    private readonly IAiDecisionClient _aiDecisionClient;
    private readonly IAuthSensitiveAuditService _auditService;
    private readonly ILegacyScanPipelineService _legacyScanPipelineService;
    private readonly CtiDbContext _dbContext;

    public AiDecisionsController(
        IAiDecisionService service,
        IAiDecisionClient aiDecisionClient,
        IAuthSensitiveAuditService auditService,
        ILegacyScanPipelineService legacyScanPipelineService,
        CtiDbContext dbContext)
    {
        _service = service;
        _aiDecisionClient = aiDecisionClient;
        _auditService = auditService;
        _legacyScanPipelineService = legacyScanPipelineService;
        _dbContext = dbContext;
    }

    [HttpGet("/api/v2/ai/model-statistics")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<AiModelStatisticsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AiModelStatisticsDto>> GetModelStatistics(CancellationToken cancellationToken)
    {
        var stats = await _aiDecisionClient.GetModelStatisticsAsync(cancellationToken);
        return Ok(new AiModelStatisticsDto(
            stats.ModelId,
            stats.ModelVersion,
            stats.Status,
            stats.DatasetVersion,
            stats.ScoringProfileVersion,
            stats.FeatureSchemaVersion,
            stats.CreatedAtUtc,
            stats.PublishedAtUtc,
            stats.TrainingWindowStartUtc,
            stats.TrainingWindowEndUtc,
            stats.EvaluationWindowStartUtc,
            stats.EvaluationWindowEndUtc,
            stats.DatasetManifestHash,
            stats.Metrics,
            stats.Thresholds,
            stats.DatasetCounts,
            stats.RuntimeWarnings,
            stats.ReadinessStatus,
            stats.Notes));
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<SubmitDecisionAcceptedDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SubmitDecisionAcceptedDto>> Submit(
        [FromBody] SubmitDecisionRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _service.SubmitAsync(request, cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.submit",
            entityType: "ai_decision",
            entityId: response.DecisionId.ToString("D"),
            payload: new
            {
                request.CaseId,
                request.DetectionId,
                request.IocType,
                request.IocValue,
                response.Status,
            },
            cancellationToken: cancellationToken);

        return Accepted(response);
    }

    [HttpGet("{decisionId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DecisionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DecisionResultDto>> GetResult(Guid decisionId, CancellationToken cancellationToken)
    {
        var response = await _service.GetResultAsync(decisionId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.result.read",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new { response.Status },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("/api/v2/ai/decisions/detections/{detectionId:guid}/latest")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<DecisionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DecisionResultDto>> GetLatestDecisionByDetection(
        Guid detectionId,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetLatestResultByDetectionAsync(detectionId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.result.read",
            entityType: "ai_decision",
            entityId: response.DecisionId.ToString("D"),
            payload: new
            {
                detectionId = detectionId.ToString("D"),
                response.Status,
            },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("/api/v2/ai/decisions/iocs/{iocId:guid}/latest")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IocLatestDecisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IocLatestDecisionDto>> GetLatestDecisionByIoc(
        Guid iocId,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetLatestResultByIocAsync(iocId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.ioc.read",
            entityType: "ai_decision",
            entityId: response.Result.DecisionId.ToString("D"),
            payload: new
            {
                iocId = iocId.ToString("D"),
                detectionId = response.DetectionId?.ToString("D"),
                response.Result.Status,
            },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpPost("/api/v2/ai/decisions/iocs/{iocId:guid}/generate")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<SubmitDecisionAcceptedDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SubmitDecisionAcceptedDto>> GenerateDecisionByIoc(
        Guid iocId,
        [FromBody] GenerateIocDecisionRequestDto request,
        CancellationToken cancellationToken)
    {
        var detail = await _legacyScanPipelineService.GetIocFindingDetailAsync(iocId.ToString("D"), cancellationToken);
        if (detail is null)
        {
            return NotFound();
        }

        var caseId = await ResolveCaseIdForIocAsync(iocId, cancellationToken) ?? $"legacy-ioc:{iocId:D}";
        var detectionId = $"legacy-ioc:{iocId:D}";
        var detectionPackage = BuildLegacyIocDetectionPackage(iocId, caseId, detectionId, detail);

        var response = await _service.SubmitAsync(
            new SubmitDecisionRequestDto(
                CaseId: caseId,
                DetectionId: detectionId,
                IocType: MapIocType(detail),
                IocValue: detail.IndicatorValue,
                ObservedAtUtc: detail.TimestampUtc,
                DetectionPackage: detectionPackage,
                SubmittedByUserId: request.SubmittedByUserId),
            cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.ioc.generate",
            entityType: "ai_decision",
            entityId: response.DecisionId.ToString("D"),
            payload: new
            {
                iocId = iocId.ToString("D"),
                caseId,
                detectionId,
                response.Status,
            },
            cancellationToken: cancellationToken);

        return Accepted(response);
    }

    [HttpGet("{decisionId:guid}/explanation")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<ExplanationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<PendingResponseDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExplanationDetailDto>> GetExplanation(Guid decisionId, CancellationToken cancellationToken)
    {
        var response = await _service.GetExplanationAsync(decisionId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.explanation.read",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new { response.Status, hasContent = response.GeneratedAtUtc.HasValue },
            cancellationToken: cancellationToken);

        if (!response.GeneratedAtUtc.HasValue)
        {
            return StatusCode(StatusCodes.Status202Accepted, new PendingResponseDto(
                DecisionId: decisionId,
                Status: response.Status,
                Message: "Explanation is not ready yet."));
        }

        return Ok(response);
    }

    [HttpGet("{decisionId:guid}/action-plan")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RecommendedActionPlanDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<PendingResponseDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecommendedActionPlanDto>> GetActionPlan(Guid decisionId, CancellationToken cancellationToken)
    {
        var response = await _service.GetActionPlanAsync(decisionId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.actionplan.read",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new { response.Status, hasContent = response.GeneratedAtUtc.HasValue },
            cancellationToken: cancellationToken);

        if (!response.GeneratedAtUtc.HasValue)
        {
            return StatusCode(StatusCodes.Status202Accepted, new PendingResponseDto(
                DecisionId: decisionId,
                Status: response.Status,
                Message: "Action plan is not ready yet."));
        }

        return Ok(response);
    }

    [HttpPost("{decisionId:guid}/override-closure")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<OverrideOrClosureResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OverrideOrClosureResponseDto>> SubmitOverrideOrClosure(
        Guid decisionId,
        [FromBody] OverrideOrClosureRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _service.SubmitOverrideOrClosureAsync(decisionId, request, cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.override_closure.submit",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new
            {
                response.OverrideId,
                response.ActionType,
                response.PreviousStatus,
                response.NewStatus,
                response.Reason,
                response.SubmittedByUserId,
            },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("{decisionId:guid}/similar-detections")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<SimilarDetectionsResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SimilarDetectionsResponseDto>> GetSimilarDetections(
        Guid decisionId,
        [FromQuery] SimilarDetectionsQueryDto query,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetSimilarDetectionsAsync(decisionId, query.Limit, query.Cursor, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.similar.read",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new { query.Limit, query.Cursor, itemCount = response.Items.Count },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    [HttpGet("{decisionId:guid}/evidence-sources")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<EvidenceSourcesResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvidenceSourcesResponseDto>> GetEvidenceSources(
        Guid decisionId,
        [FromQuery] EvidenceSourcesQueryDto query,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetEvidenceSourcesAsync(decisionId, query.Limit, query.Cursor, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        await _auditService.TryWriteAsync(
            User,
            actionType: "ai.decision.evidence.read",
            entityType: "ai_decision",
            entityId: decisionId.ToString("D"),
            payload: new { query.Limit, query.Cursor, itemCount = response.Items.Count },
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    private async Task<string?> ResolveCaseIdForIocAsync(Guid iocId, CancellationToken cancellationToken)
    {
        return await (
            from link in _dbContext.AlertIocs.AsNoTracking()
            join alert in _dbContext.AlertsV2.AsNoTracking() on link.AlertId equals alert.Id
            where link.IocId == iocId
            orderby link.LinkedAtUtc descending, alert.UpdatedAtUtc descending
            select alert.Id.ToString())
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static JsonElement BuildLegacyIocDetectionPackage(
        Guid iocId,
        string caseId,
        string detectionId,
        LegacyPipelineIocFindingDetailResponse detail)
    {
        var objectType = MapObjectType(detail);
        var sourceSystem = MapSourceSystem(detail);
        var family = detail.ScannerFamily.Trim().ToLowerInvariant();
        var evidenceHash = ComputeSha256Hex(detail.RawPayload ?? detail.IndicatorValue);

        var payload = new
        {
            caseId,
            detectionId,
            legacyIocId = iocId.ToString("D"),
            observedAt = detail.TimestampUtc,
            rule_family = family,
            source = "legacy-ioc-explorer",
            fingerprint = evidenceHash,
            object_metadata = new
            {
                object_id = iocId.ToString("D"),
                object_type = objectType,
                source_system = sourceSystem,
                confidence_hint = MapConfidence(detail),
                labels = new[] { "legacy_ioc", family },
                custom_attributes = new
                {
                    target_display = detail.TargetDisplay,
                    target_ip = detail.TargetIp,
                    target_os_type = detail.TargetOsType,
                    severity = detail.Severity,
                    pain_level = detail.PainLevel,
                    related_scan_job_id = detail.RelatedScan?.JobId,
                    related_scan_plan_id = detail.RelatedScan?.ScanPlanId,
                },
            },
            rule_metadata = BuildRuleMetadata(iocId, detail),
            raw_hit_payload = BuildRawHitPayload(iocId, detail),
            asset_context = new
            {
                asset_id = detail.Target?.Id ?? detail.TargetDisplay,
                asset_name = detail.Target?.Hostname ?? detail.TargetDisplay,
                asset_type = "scan_target",
                criticality = MapAssetCriticality(detail),
                environment = "lab",
                internet_exposed = false,
            },
            time_prevalence_context = new
            {
                first_seen = detail.TimestampUtc,
                last_seen = detail.TimestampUtc,
                hit_count_24h = 1,
                hit_count_7d = 1,
                prevalence_ratio = 0.001m,
                recency_bucket = "new",
                trend = "new",
            },
            linked_enrichment = new
            {
                enrichments = new[]
                {
                    new
                    {
                        kind = $"scanner_result_{detail.Severity.Trim().ToLowerInvariant()}",
                        source = "legacy-ioc-explorer",
                        confidence = MapProviderConfidence(detail),
                        value = new
                        {
                            scanner_family = family,
                            severity = detail.Severity,
                            pain_level = detail.PainLevel,
                            rule_name = detail.RuleName,
                        },
                    },
                },
            },
            behavior_report_references = new
            {
                reports = new[]
                {
                    new
                    {
                        report_id = $"legacy-scan-{iocId:D}",
                        source = "legacy-ioc-explorer",
                        observed_at = detail.TimestampUtc,
                        summary = BuildBehaviorSummary(detail),
                    },
                },
            },
            hostContext = new
            {
                hostname = detail.Target?.Hostname ?? detail.TargetDisplay,
                ipAddress = detail.Target?.IpAddress ?? detail.TargetIp,
                operatingSystem = detail.Target?.TargetOsType ?? detail.TargetOsType,
                status = detail.Target?.Status,
                criticality = MapHostCriticality(detail),
                assetExposure = 0.25m,
            },
            ruleContext = new
            {
                ruleName = detail.RuleName,
                scannerFamily = detail.ScannerFamily,
                severity = detail.Severity,
                indicatorKind = detail.IndicatorKind,
                severityScore = MapSeverityScore(detail),
                sourceTrust = MapSourceTrust(detail),
                scannerAgreement = MapScannerAgreement(detail),
                sourceName = "legacy-ioc-explorer",
                activitySignal = MapActivitySignal(detail),
                providerConfidence = MapProviderConfidence(detail),
                indicatorStrength = MapIndicatorStrength(detail),
                enrichmentStrength = MapEnrichmentStrength(detail),
                benignContext = 0.04m,
                heuristicNoise = 0.08m,
                sourceThreatSignal = MapSourceThreatSignal(detail),
                externalSourceSignal = MapExternalSourceSignal(detail),
                sightingsCount = 1,
                sightingsCorroboration = MapSightingsCorroboration(detail),
                evidenceConflict = 0.0m,
            },
        };

        return JsonSerializer.SerializeToElement(payload, JsonOptions);
    }

    private static object BuildRuleMetadata(Guid iocId, LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return new
            {
                source = "legacy-ioc-explorer",
                rule_id = $"legacy-sigma-{iocId:D}",
                title = detail.RuleName,
                severity = detail.Severity,
                tags = new[] { detail.PainLevel, "legacy_ioc" },
                logsource = detail.SigmaDetail?.LogSource,
            };
        }

        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return new
            {
                source = "legacy-ioc-explorer",
                rule_id = $"legacy-yara-{iocId:D}",
                rule_name = detail.RuleName,
                severity = detail.Severity,
                tags = new[] { detail.PainLevel, "legacy_ioc" },
            };
        }

        return new
        {
            source = "legacy-ioc-explorer",
            rule_id = $"legacy-network-{iocId:D}",
            sid = detail.RelatedScan?.JobId,
            msg = detail.RuleName,
            severity = detail.Severity,
            tags = new[] { detail.PainLevel, "legacy_ioc" },
        };
    }

    private static object BuildRawHitPayload(Guid iocId, LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return new
            {
                event_id = iocId.ToString("D"),
                message = detail.RawPayload ?? detail.RuleName,
                command_line = detail.SigmaDetail?.CommandLine,
                image = detail.IndicatorKind.Equals("process", StringComparison.OrdinalIgnoreCase) ? detail.IndicatorValue : null,
                log_source = detail.SigmaDetail?.LogSource,
            };
        }

        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return new
            {
                event_id = iocId.ToString("D"),
                message = detail.RawPayload ?? detail.RuleName,
                matched_strings = new[] { detail.IndicatorValue },
                match_count = 1,
                file_path = detail.YaraDetail?.FilePath,
                file_hash = detail.YaraDetail?.FileHash,
            };
        }

        return new
        {
            event_id = iocId.ToString("D"),
            message = detail.RawPayload ?? detail.RuleName,
            network = new
            {
                five_tuple = new
                {
                    src_ip = detail.NetworkDetail?.SourceIp,
                    dst_ip = detail.NetworkDetail?.DestIp,
                    protocol = detail.NetworkDetail?.Protocol,
                },
                flow_id = detail.NetworkDetail?.FlowId,
            },
        };
    }

    private static string MapIocType(LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.IndicatorKind, "network", StringComparison.OrdinalIgnoreCase))
        {
            return "ip";
        }

        if (string.Equals(detail.IndicatorKind, "process", StringComparison.OrdinalIgnoreCase)
            || string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return "process";
        }

        return "artifact";
    }

    private static string MapObjectType(LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return "process_event";
        }

        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return "file";
        }

        return "network_flow";
    }

    private static string MapSourceSystem(LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return "siem";
        }

        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return "edr";
        }

        return "ids";
    }

    private static decimal MapConfidence(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.90m,
            "high" => 0.78m,
            "medium" => 0.62m,
            "low" => 0.48m,
            _ => 0.50m,
        };
    }

    private static decimal MapSeverityScore(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.92m,
            "high" => 0.78m,
            "medium" => 0.60m,
            "low" => 0.42m,
            _ => 0.50m,
        };
    }

    private static decimal MapSourceTrust(LegacyPipelineIocFindingDetailResponse detail)
    {
        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return 0.72m;
        }

        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return 0.68m;
        }

        return 0.64m;
    }

    private static decimal MapScannerAgreement(LegacyPipelineIocFindingDetailResponse detail)
    {
        var baseValue = detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.52m,
            "high" => 0.44m,
            "medium" => 0.36m,
            "low" => 0.28m,
            _ => 0.32m,
        };

        if (string.Equals(detail.ScannerFamily, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return Math.Min(0.65m, baseValue + 0.10m);
        }

        if (string.Equals(detail.ScannerFamily, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return Math.Min(0.62m, baseValue + 0.08m);
        }

        return baseValue;
    }

    private static decimal MapActivitySignal(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Status.Trim().ToLowerInvariant() switch
        {
            "completed" => 0.58m,
            "running" => 0.52m,
            "queued" => 0.44m,
            _ => 0.40m,
        };
    }

    private static string MapAssetCriticality(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => "high",
            "high" => "high",
            "medium" => "medium",
            _ => "low",
        };
    }

    private static decimal MapHostCriticality(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.85m,
            "high" => 0.72m,
            "medium" => 0.50m,
            _ => 0.30m,
        };
    }

    private static decimal MapProviderConfidence(LegacyPipelineIocFindingDetailResponse detail)
    {
        var scannerBoost = detail.ScannerFamily.Trim().ToLowerInvariant() switch
        {
            "yara" => 0.08m,
            "sigma" => 0.05m,
            "suricata" => 0.04m,
            "snort" => 0.04m,
            _ => 0.00m,
        };

        return Math.Min(0.92m, MapConfidence(detail) + scannerBoost);
    }

    private static decimal MapIndicatorStrength(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.ScannerFamily.Trim().ToLowerInvariant() switch
        {
            "yara" => 0.82m,
            "sigma" => 0.70m,
            "suricata" => 0.76m,
            "snort" => 0.76m,
            _ => 0.62m,
        };
    }

    private static decimal MapEnrichmentStrength(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.72m,
            "high" => 0.64m,
            "medium" => 0.48m,
            _ => 0.34m,
        };
    }

    private static decimal MapSourceThreatSignal(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.86m,
            "high" => 0.76m,
            "medium" => 0.58m,
            _ => 0.36m,
        };
    }

    private static decimal MapExternalSourceSignal(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.ScannerFamily.Trim().ToLowerInvariant() switch
        {
            "yara" => 0.68m,
            "sigma" => 0.64m,
            "suricata" => 0.72m,
            "snort" => 0.72m,
            _ => 0.48m,
        };
    }

    private static decimal MapSightingsCorroboration(LegacyPipelineIocFindingDetailResponse detail)
    {
        return detail.Severity.Trim().ToLowerInvariant() switch
        {
            "critical" => 0.56m,
            "high" => 0.48m,
            "medium" => 0.34m,
            _ => 0.20m,
        };
    }

    private static string BuildBehaviorSummary(LegacyPipelineIocFindingDetailResponse detail)
    {
        var family = detail.ScannerFamily.Trim().ToUpperInvariant();
        return $"{family} scanner reported {detail.Severity.Trim().ToLowerInvariant()} severity evidence for {detail.RuleName}.";
    }

    private static string ComputeSha256Hex(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        var builder = new StringBuilder(bytes.Length * 2);
        foreach (var item in bytes)
        {
            builder.Append(item.ToString("x2"));
        }

        return builder.ToString();
    }
}

