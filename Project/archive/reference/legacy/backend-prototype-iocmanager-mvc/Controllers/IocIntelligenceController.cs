using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using IoCManager.Mvc.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize(Policy = "AnalystAccess")]
[Route("api/intelligence")]
public sealed class IocIntelligenceController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IIocIntelligenceClient _intelligenceClient;
    private readonly IIocDecisionTraceService _decisionTraceService;
    private readonly IIocIntelligenceOpsStore _opsStore;

    public IocIntelligenceController(
        ApplicationDbContext dbContext,
        IIocIntelligenceClient intelligenceClient,
        IIocDecisionTraceService decisionTraceService,
        IIocIntelligenceOpsStore opsStore)
    {
        _dbContext = dbContext;
        _intelligenceClient = intelligenceClient;
        _decisionTraceService = decisionTraceService;
        _opsStore = opsStore;
    }

    [HttpPost("score_ioc")]
    public async Task<IActionResult> ScoreIoc([FromBody] ScoreIocRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.IocValue) || string.IsNullOrWhiteSpace(request.IocType))
        {
            return BadRequest(new { message = "ioc_value and ioc_type are required." });
        }

        var result = await _intelligenceClient.ScoreAsync(request, cancellationToken);
        if (result.Score is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Scoring service is unavailable.",
                detail = result.Error
            });
        }

        return Ok(result.Score);
    }

    [HttpPost("score_batch")]
    public async Task<IActionResult> ScoreBatch([FromBody] ScoreBatchRequest request, CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            return BadRequest(new { message = "At least one IOC item is required." });
        }

        var response = await _intelligenceClient.ScoreBatchAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Batch scoring service unavailable." });
        }

        return Ok(response);
    }

    [HttpPost("feedback")]
    public async Task<IActionResult> Feedback([FromBody] FeedbackRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Verdict))
        {
            return BadRequest(new { message = "verdict is required." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _decisionTraceService.RecordFeedbackAsync(request, actorUserId, cancellationToken);
        var pushed = await _intelligenceClient.SendFeedbackAsync(request, cancellationToken);

        return Ok(new
        {
            accepted = true,
            forwarded = pushed,
            recordedAt = DateTime.UtcNow
        });
    }

    [HttpGet("model_card")]
    public async Task<IActionResult> ModelCard(CancellationToken cancellationToken)
    {
        var modelCard = await _intelligenceClient.GetModelCardAsync(cancellationToken);
        if (modelCard is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Model card is unavailable." });
        }

        return Ok(modelCard);
    }

    [HttpPost("open_case")]
    public async Task<IActionResult> OpenCase([FromBody] OpenCaseRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.IocType) ||
            string.IsNullOrWhiteSpace(request.IocValue))
        {
            return BadRequest(new { message = "title, ioc_type and ioc_value are required." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var now = DateTime.UtcNow;
        var investigationCase = new InvestigationCase
        {
            Title = request.Title.Trim(),
            CaseType = request.CaseType.Trim().ToLowerInvariant(),
            Priority = request.Priority.Trim().ToLowerInvariant(),
            State = CaseStates.Open,
            OwnerUserId = actorUserId,
            SlaDueAt = request.SlaDueAt,
            OpenedAt = now,
            UpdatedAt = now,
            StrategicValueScore = request.StrategicValueScore,
            PrimaryIocType = request.IocType.Trim().ToLowerInvariant(),
            PrimaryIocValue = request.IocValue.Trim()
        };

        var bundle = new CaseEvidenceBundle
        {
            CaseId = investigationCase.CaseId,
            AsOfTime = now,
            SourceIdsJson = JsonSerializer.Serialize(new[] { "manual" }),
            RelatedIocsJson = JsonSerializer.Serialize(new[]
            {
                new
                {
                    iocType = investigationCase.PrimaryIocType,
                    iocValue = investigationCase.PrimaryIocValue
                }
            }),
            DetectionObservationsJson = "[]",
            GraphNeighborsJson = "[]",
            SimilarCasesJson = "[]",
            MissingEvidenceHintsJson = "[]",
            CreatedAt = now
        };

        _dbContext.InvestigationCases.Add(investigationCase);
        _dbContext.CaseEvidenceBundles.Add(bundle);
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actorUserId,
            Action = "CASE_OPEN",
            EntityType = nameof(InvestigationCase),
            EntityId = investigationCase.CaseId,
            Details = $"Title={investigationCase.Title}; IOC={investigationCase.PrimaryIocType}:{investigationCase.PrimaryIocValue}",
            OccurredUtc = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new OpenCaseResponse
        {
            CaseId = investigationCase.CaseId,
            State = investigationCase.State,
            BundleId = bundle.BundleId,
            OpenedAt = investigationCase.OpenedAt
        });
    }

    [HttpPost("score_case")]
    public async Task<IActionResult> ScoreCase([FromBody] ScoreCaseRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId))
        {
            return BadRequest(new { message = "case_id is required." });
        }

        var investigationCase = await _dbContext.InvestigationCases
            .FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        if (investigationCase is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        request.IocType = string.IsNullOrWhiteSpace(request.IocType) ? investigationCase.PrimaryIocType : request.IocType.Trim().ToLowerInvariant();
        request.IocValue = string.IsNullOrWhiteSpace(request.IocValue) ? investigationCase.PrimaryIocValue : request.IocValue.Trim();
        if (request.HostContext.Count == 0)
        {
            request.HostContext["criticality"] = investigationCase.Priority is "critical" or "high" ? "0.85" : "0.55";
        }
        if (request.RuleContext.Count == 0)
        {
            request.RuleContext["scanner_agreement"] = "0.50";
            request.RuleContext["severity_score"] = investigationCase.Priority is "critical" or "high" ? "0.80" : "0.50";
        }

        var score = await _intelligenceClient.ScoreCaseAsync(request, cancellationToken);
        if (score is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Case scoring service unavailable." });
        }

        var asOfTime = request.AsOfTime?.ToUniversalTime() ?? DateTime.UtcNow;
        var vectorJson = JsonSerializer.Serialize(new
        {
            maliciousness = score.MaliciousnessScore,
            actionability = score.ActionabilityScore,
            deployability = score.DeployabilityScore,
            decay = score.DecayScore,
            uncertainty = score.UncertaintyScore,
            blastRadius = score.BlastRadiusScore
        });
        var hash = ComputeHash($"{request.CaseId}|{asOfTime:O}|{vectorJson}|{score.DatasetVersion}|{score.ModelVersion}");

        _dbContext.PointInTimeFeatureSnapshots.Add(new PointInTimeFeatureSnapshot
        {
            CaseId = request.CaseId,
            AsOfTime = asOfTime,
            DatasetVersion = score.DatasetVersion,
            FeatureSnapshotHash = score.FeatureSnapshotHash,
            FeatureValuesJson = vectorJson,
            GraphVersion = "v1",
            PolicyVersionRef = "cti-policy-v1",
            CreatedAt = DateTime.UtcNow
        });

        _dbContext.DecisionBundles.Add(new DecisionBundle
        {
            CaseId = request.CaseId,
            ScoreVectorJson = vectorJson,
            PolicyOutcomeJson = "{}",
            TopEvidenceJson = JsonSerializer.Serialize(score.TopEvidence),
            NeighborContextJson = "[]",
            SimilarCaseRefsJson = "[]",
            NextBestEvidenceJson = "[]",
            RolloutPlanJson = "{}",
            RollbackPlanJson = "{}",
            SnapshotRefsJson = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["dataset_version"] = score.DatasetVersion,
                ["feature_snapshot_hash"] = score.FeatureSnapshotHash
            }),
            GeneratedExplanation = "Case scored using multi-axis CTI fusion model.",
            CreatedAt = DateTime.UtcNow
        });

        _dbContext.ModelDecisionTraces.Add(new ModelDecisionTrace
        {
            CaseId = request.CaseId,
            ObservableId = 0,
            ObservableType = investigationCase.PrimaryIocType,
            SourceSystem = request.SourceSystem,
            EventTimeUtc = asOfTime.ToString("O"),
            AsOfTimeUtc = asOfTime.ToString("O"),
            RiskScore = score.MaliciousnessScore,
            RiskTier = score.MaliciousnessScore >= 0.85 ? "critical" : score.MaliciousnessScore >= 0.60 ? "high" : score.MaliciousnessScore >= 0.40 ? "medium" : "low",
            Confidence = 1.0 - score.UncertaintyScore,
            UncertaintySetJson = JsonSerializer.Serialize(score.UncertaintyBand),
            TopEvidenceJson = JsonSerializer.Serialize(score.TopEvidence),
            RecommendedAction = ActionTypes.Monitor,
            TtlHours = 24,
            ModelVersion = score.ModelVersion,
            DatasetVersion = score.DatasetVersion,
            FeatureSnapshotHash = score.FeatureSnapshotHash,
            PolicyVersion = "cti-policy-v1",
            DecisionState = DecisionStates.Defer,
            MissingEvidenceHintsJson = "[]",
            TopContributingFeaturesJson = JsonSerializer.Serialize(score.TopEvidence),
            NeighborContextRefsJson = "[]",
            SimilarCaseRefsJson = "[]",
            DecisionTraceHash = hash,
            CreatedUtc = DateTime.UtcNow
        });
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "CASE_SCORE",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"Model={score.ModelVersion}; Maliciousness={score.MaliciousnessScore:F4}",
            OccurredUtc = DateTime.UtcNow
        });

        investigationCase.State = CaseStates.RecommendationReady;
        investigationCase.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(score);
    }

    [HttpPost("recommend_action")]
    public async Task<IActionResult> RecommendAction([FromBody] RecommendActionRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId))
        {
            return BadRequest(new { message = "case_id is required." });
        }

        var investigationCase = await _dbContext.InvestigationCases
            .FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        if (investigationCase is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        if (request.ScoreVector is null)
        {
            var latestBundle = await _dbContext.DecisionBundles.AsNoTracking()
                .Where(x => x.CaseId == request.CaseId)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (latestBundle is null)
            {
                return BadRequest(new { message = "No score vector found for case. Call /score_case first." });
            }

            var scoreJson = JsonDocument.Parse(latestBundle.ScoreVectorJson).RootElement;
            request.ScoreVector = new CaseScoreVectorResponse
            {
                MaliciousnessScore = scoreJson.TryGetProperty("maliciousness", out var m) ? m.GetDouble() : 0.0,
                ActionabilityScore = scoreJson.TryGetProperty("actionability", out var a) ? a.GetDouble() : 0.0,
                DeployabilityScore = scoreJson.TryGetProperty("deployability", out var d) ? d.GetDouble() : 0.0,
                DecayScore = scoreJson.TryGetProperty("decay", out var de) ? de.GetDouble() : 0.0,
                UncertaintyScore = scoreJson.TryGetProperty("uncertainty", out var u) ? u.GetDouble() : 1.0,
                BlastRadiusScore = scoreJson.TryGetProperty("blastRadius", out var b) ? b.GetDouble() : 1.0,
                ModelVersion = "unknown",
                DatasetVersion = "unknown",
                FeatureSnapshotHash = string.Empty
            };
        }

        var response = await _intelligenceClient.RecommendActionAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Recommend action service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        _dbContext.CaseDecisions.Add(new CaseDecision
        {
            CaseId = request.CaseId,
            DecisionState = response.DecisionState,
            RecommendedAction = response.RecommendedAction,
            ApprovalTierRequired = response.ApprovalTierRequired,
            RolloutMode = response.RolloutMode,
            ReasonSummary = response.ReasonSummary,
            PolicyVersion = response.PolicyVersion,
            ModelVersion = response.ModelVersion,
            CreatedBy = actorUserId,
            CreatedAt = DateTime.UtcNow
        });
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actorUserId,
            Action = "CASE_RECOMMEND_ACTION",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"{response.DecisionState}:{response.RecommendedAction}; Approval={response.ApprovalTierRequired}",
            OccurredUtc = DateTime.UtcNow
        });

        _dbContext.DecisionBundles.Add(new DecisionBundle
        {
            CaseId = request.CaseId,
            ScoreVectorJson = JsonSerializer.Serialize(request.ScoreVector),
            PolicyOutcomeJson = JsonSerializer.Serialize(new
            {
                response.DecisionState,
                response.RecommendedAction,
                response.ApprovalTierRequired,
                response.RolloutMode
            }),
            TopEvidenceJson = JsonSerializer.Serialize(response.TopEvidence),
            NeighborContextJson = "[]",
            SimilarCaseRefsJson = "[]",
            NextBestEvidenceJson = JsonSerializer.Serialize(response.NextBestEvidence),
            RolloutPlanJson = JsonSerializer.Serialize(new { mode = response.RolloutMode }),
            RollbackPlanJson = response.RollbackPlan,
            SnapshotRefsJson = JsonSerializer.Serialize(response.SnapshotRefs),
            GeneratedExplanation = response.ReasonSummary,
            CreatedAt = DateTime.UtcNow
        });

        investigationCase.State = response.DecisionState == DecisionStates.Recommend
            ? CaseStates.AwaitingApproval
            : response.DecisionState == DecisionStates.Abstain
                ? CaseStates.EvidencePending
                : CaseStates.Triage;
        investigationCase.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("request_more_evidence")]
    public async Task<IActionResult> RequestMoreEvidence([FromBody] RequestMoreEvidenceRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId))
        {
            return BadRequest(new { message = "case_id is required." });
        }

        var investigationCase = await _dbContext.InvestigationCases.FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        if (investigationCase is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        var response = await _intelligenceClient.RequestMoreEvidenceAsync(request, cancellationToken)
            ?? new RequestMoreEvidenceResponse
            {
                CaseId = request.CaseId,
                DecisionState = DecisionStates.Defer,
                NextBestEvidence = new[] { "collect_internal_sightings", "run_shadow_simulation" },
                Reason = "Evidence is insufficient for safe action."
            };

        investigationCase.State = CaseStates.EvidencePending;
        investigationCase.UpdatedAt = DateTime.UtcNow;
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "CASE_REQUEST_MORE_EVIDENCE",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = response.Reason,
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("problematic_queue")]
    public async Task<IActionResult> GetProblematicQueue([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 200);
        var cases = await _dbContext.InvestigationCases.AsNoTracking()
            .Where(x => x.State != CaseStates.Closed)
            .OrderByDescending(x => x.UpdatedAt)
            .Take(safeLimit * 3)
            .ToListAsync(cancellationToken);

        var caseIds = cases.Select(x => x.CaseId).ToArray();
        var decisions = await _dbContext.CaseDecisions.AsNoTracking()
            .Where(x => caseIds.Contains(x.CaseId))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var decisionMap = decisions
            .GroupBy(x => x.CaseId)
            .ToDictionary(group => group.Key, group => group.First());

        var traces = await _dbContext.ModelDecisionTraces.AsNoTracking()
            .Where(x => x.CaseId != null && caseIds.Contains(x.CaseId))
            .OrderByDescending(x => x.CreatedUtc)
            .ToListAsync(cancellationToken);
        var traceMap = traces
            .GroupBy(x => x.CaseId!)
            .ToDictionary(group => group.Key, group => group.First());

        var items = cases.Select(c =>
        {
            var trace = traceMap.TryGetValue(c.CaseId, out var traceRow) ? traceRow : null;
            var uncertainty = 1.0 - (trace?.Confidence ?? 0.0);
            var blastRadius = trace?.TopEvidenceJson.Contains("blast", StringComparison.OrdinalIgnoreCase) == true
                ? 0.8
                : (trace?.RiskScore ?? 0.2);
            var problematicScore = (0.40 * uncertainty) + (0.25 * blastRadius) + (0.20 * c.StrategicValueScore) + (0.15 * (trace?.RiskScore ?? 0.0));
            var decision = decisionMap.TryGetValue(c.CaseId, out var dec) ? dec : null;
            return new
            {
                caseId = c.CaseId,
                c.Title,
                c.Priority,
                c.State,
                decisionState = decision?.DecisionState ?? DecisionStates.Defer,
                recommendedAction = decision?.RecommendedAction ?? ActionTypes.RequestMoreEvidence,
                approvalTierRequired = decision?.ApprovalTierRequired ?? ApprovalTiers.Analyst,
                rolloutMode = decision?.RolloutMode ?? RolloutModes.None,
                uncertainty = Math.Round(uncertainty, 4),
                blastRadius = Math.Round(blastRadius, 4),
                strategicValue = Math.Round(c.StrategicValueScore, 4),
                problematicScore = Math.Round(problematicScore, 4),
                c.UpdatedAt
            };
        })
            .OrderByDescending(x => x.problematicScore)
            .Take(safeLimit)
            .ToList();

        return Ok(new
        {
            items,
            metadata = new
            {
                computedAt = DateTime.UtcNow,
                total = items.Count
            }
        });
    }

    [HttpGet("evidence_bundle/{caseId}")]
    public async Task<IActionResult> GetEvidenceBundle(string caseId, CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.CaseEvidenceBundles.AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (bundle is null)
        {
            return NotFound(new { message = "Evidence bundle not found." });
        }

        var assertions = await _dbContext.EvidenceAssertions.AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.ExtractedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            bundle,
            assertions,
            metadata = new { computedAt = DateTime.UtcNow }
        });
    }

    [HttpGet("decision_trace/{caseId}")]
    public async Task<IActionResult> GetDecisionTrace(string caseId, CancellationToken cancellationToken)
    {
        var bundles = await _dbContext.DecisionBundles.AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var traces = await _dbContext.ModelDecisionTraces.AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedUtc)
            .Take(20)
            .ToListAsync(cancellationToken);
        var decisions = await _dbContext.CaseDecisions.AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            caseId,
            decisions,
            modelTraces = traces,
            decisionBundles = bundles
        });
    }

    [HttpPost("simulate_rule")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> SimulateRule([FromBody] SimulateRuleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId) || string.IsNullOrWhiteSpace(request.RuleBody))
        {
            return BadRequest(new { message = "case_id and rule_body are required." });
        }

        var caseRow = await _dbContext.InvestigationCases.FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        if (caseRow is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        var response = await _intelligenceClient.SimulateRuleAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Rule simulation unavailable." });
        }

        _dbContext.CaseRuleProposals.Add(new CaseRuleProposal
        {
            CaseId = request.CaseId,
            RuleType = request.RuleType,
            RuleBody = request.RuleBody,
            MetadataTagsJson = JsonSerializer.Serialize(new[] { "simulated", "human-gated" }),
            PredictedCoverage = response.PredictedCoverage,
            PredictedFpRisk = response.PredictedFpRisk,
            TargetAssetClassesJson = JsonSerializer.Serialize(new[] { "server" }),
            Status = "simulated",
            CreatedAt = DateTime.UtcNow
        });
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "CASE_SIMULATE_RULE",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"RuleType={request.RuleType}; Coverage={response.PredictedCoverage:F2}; FpRisk={response.PredictedFpRisk:F2}",
            OccurredUtc = DateTime.UtcNow
        });

        caseRow.State = CaseStates.Shadow;
        caseRow.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("canary_deployment")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> CanaryDeployment([FromBody] CanaryDeploymentRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId) || string.IsNullOrWhiteSpace(request.RuleProposalId))
        {
            return BadRequest(new { message = "case_id and rule_proposal_id are required." });
        }

        var caseRow = await _dbContext.InvestigationCases.FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        var proposal = await _dbContext.CaseRuleProposals.FirstOrDefaultAsync(x => x.ProposalId == request.RuleProposalId, cancellationToken);
        if (caseRow is null || proposal is null)
        {
            return NotFound(new { message = "Case or proposal not found." });
        }

        _dbContext.RolloutPlans.Add(new RolloutPlan
        {
            CaseId = request.CaseId,
            ShadowWindowHours = 24,
            CanaryScopePercent = request.ScopePercent,
            PromotionThresholdsJson = JsonSerializer.Serialize(new
            {
                fpDeltaMax = 0.10,
                analystAcceptanceMin = 0.65
            }),
            ExpiryAt = DateTime.UtcNow.AddDays(7),
            SuccessCriteriaJson = JsonSerializer.Serialize(new { fpDelta = "<=0.10", overrideRate = "<=0.25" })
        });
        caseRow.State = CaseStates.Canary;
        caseRow.UpdatedAt = DateTime.UtcNow;
        proposal.Status = "canary";
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "CASE_CANARY_DEPLOYMENT",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"Proposal={request.RuleProposalId}; Scope={request.ScopePercent:F2}",
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new CanaryDeploymentResponse
        {
            CaseId = request.CaseId,
            RolloutMode = RolloutModes.Canary,
            Status = "scheduled",
            ScheduledAtUtc = DateTime.UtcNow
        });
    }

    [HttpPost("promote_rule_proposal")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> PromoteRuleProposal([FromBody] PromoteRuleProposalRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId) || string.IsNullOrWhiteSpace(request.RuleProposalId))
        {
            return BadRequest(new { message = "case_id and rule_proposal_id are required." });
        }

        var caseRow = await _dbContext.InvestigationCases.FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        var proposal = await _dbContext.CaseRuleProposals.FirstOrDefaultAsync(x => x.ProposalId == request.RuleProposalId, cancellationToken);
        if (caseRow is null || proposal is null)
        {
            return NotFound(new { message = "Case or proposal not found." });
        }

        caseRow.State = CaseStates.Promoted;
        caseRow.UpdatedAt = DateTime.UtcNow;
        proposal.Status = "promoted";
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "CASE_PROMOTE_RULE",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"Proposal={request.RuleProposalId}",
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new PromoteRuleProposalResponse
        {
            CaseId = request.CaseId,
            RuleProposalId = request.RuleProposalId,
            RolloutMode = RolloutModes.Promote,
            Status = "approved"
        });
    }

    [HttpPost("record_override")]
    public async Task<IActionResult> RecordOverride([FromBody] RecordOverrideRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CaseId) || string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "case_id and reason are required." });
        }

        var caseRow = await _dbContext.InvestigationCases.FirstOrDefaultAsync(x => x.CaseId == request.CaseId, cancellationToken);
        if (caseRow is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var overrideRecord = new AnalystOverrideRecord
        {
            CaseId = request.CaseId,
            PreviousDecisionState = request.PreviousDecisionState,
            NewDecisionState = request.NewDecisionState,
            Reason = request.Reason,
            ActorUserId = actorUserId,
            CreatedAt = DateTime.UtcNow
        };
        var feedback = new AnalystFeedbackEvent
        {
            CaseId = request.CaseId,
            VerdictType = request.VerdictType,
            LabelStrength = request.LabelStrength,
            DispositionReason = request.Reason,
            OperatorConfidence = request.OperatorConfidence,
            OverrideReason = request.Reason,
            ReviewLatencyMs = request.ReviewLatencyMs,
            TeamId = request.TeamId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.AnalystOverrideRecords.Add(overrideRecord);
        _dbContext.AnalystFeedbackEvents.Add(feedback);
        caseRow.State = CaseStates.Triage;
        caseRow.UpdatedAt = DateTime.UtcNow;
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actorUserId,
            Action = "CASE_OVERRIDE",
            EntityType = nameof(InvestigationCase),
            EntityId = request.CaseId,
            Details = $"{request.PreviousDecisionState}->{request.NewDecisionState}; {request.Reason}",
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new RecordOverrideResponse
        {
            CaseId = request.CaseId,
            OverrideId = overrideRecord.OverrideId,
            FeedbackId = feedback.FeedbackId,
            RecordedAtUtc = DateTime.UtcNow
        });
    }

    [HttpPost("ingest_report")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> IngestReport([FromBody] ReportIngestionRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DocumentId) || string.IsNullOrWhiteSpace(request.DocumentText))
        {
            return BadRequest(new { message = "document_id and document_text are required." });
        }

        var response = await _intelligenceClient.IngestReportAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Report ingestion service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _opsStore.SaveReportIngestionAsync(request, response, actorUserId, cancellationToken);

        return Ok(response);
    }

    [HttpPost("propose_rule")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> ProposeRule([FromBody] RuleProposalRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.IocType) || string.IsNullOrWhiteSpace(request.IocValue))
        {
            return BadRequest(new { message = "ioc_type and ioc_value are required." });
        }

        var response = await _intelligenceClient.ProposeRuleAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Rule proposal service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _opsStore.SaveRuleProposalAsync(request, response, actorUserId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("recommend_deployment")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> RecommendDeployment([FromBody] DeploymentRecommendationRequest request, CancellationToken cancellationToken)
    {
        if (request.Targets.Count == 0 || string.IsNullOrWhiteSpace(request.RuleFamily) || string.IsNullOrWhiteSpace(request.RuleName))
        {
            return BadRequest(new { message = "rule_family, rule_name and at least one target are required." });
        }

        var response = await _intelligenceClient.RecommendDeploymentAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Deployment recommendation service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _opsStore.SaveDeploymentRecommendationsAsync(request, response, actorUserId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("copilot/query")]
    public async Task<IActionResult> CopilotQuery([FromBody] CopilotQueryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            return BadRequest(new { message = "question is required." });
        }

        var response = await _intelligenceClient.QueryCopilotAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Copilot service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _opsStore.SaveCopilotResponseAsync(request, response, actorUserId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("graph/link_candidates")]
    public async Task<IActionResult> GraphLinkCandidates([FromBody] GraphLinkCandidateRequest request, CancellationToken cancellationToken)
    {
        if (request.SeedObservableId <= 0)
        {
            return BadRequest(new { message = "seed_observable_id is required." });
        }

        var seed = await _dbContext.Observables.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.SeedObservableId, cancellationToken);
        if (seed is null)
        {
            return NotFound(new { message = "Seed observable not found." });
        }

        var relationshipEndpoints = await _dbContext.ObservableRelationships.AsNoTracking()
            .Where(x => x.Confidence >= 50)
            .Select(x => new { x.FromObservableId, x.ToObservableId })
            .ToListAsync(cancellationToken);
        var linkMap = relationshipEndpoints
            .SelectMany(x => new[] { x.FromObservableId, x.ToObservableId })
            .GroupBy(x => x)
            .ToDictionary(group => group.Key, group => group.Count());

        var candidateRows = await _dbContext.Observables.AsNoTracking()
            .Where(x => x.Id != seed.Id && x.Status != "revoked")
            .OrderByDescending(x => x.Confidence)
            .Take(250)
            .ToListAsync(cancellationToken);

        request.SeedType = seed.Type;
        request.SeedValue = seed.ValueRaw;
        request.CandidateNodes = candidateRows.Select(x => new GraphCandidateObservableInput
        {
            ObservableId = x.Id,
            Type = x.Type,
            Value = x.ValueRaw,
            Confidence = x.Confidence,
            SourceCount = x.SourceCount,
            LastSeenUtc = x.LastSeenUtc,
            ExistingLinks = linkMap.TryGetValue(x.Id, out var count) ? count : 0
        }).ToList();

        var response = await _intelligenceClient.GetGraphLinkCandidatesAsync(request, cancellationToken);
        if (response is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Graph link candidate service unavailable." });
        }

        var actorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        await _opsStore.SaveGraphLinkCandidatesAsync(request, response, actorUserId, cancellationToken);
        return Ok(response);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetIngestedReports([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 300);
        var rows = await _dbContext.ReportIngestionRecords.AsNoTracking()
            .OrderByDescending(x => x.CreatedUtc)
            .Take(safeLimit)
            .Select(x => new
            {
                x.ReportId,
                x.SourceName,
                x.DocumentId,
                x.DocumentUrl,
                x.ExtractedIocCount,
                x.HumanReviewRequired,
                x.IngestionTimeUtc,
                x.CreatedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items = rows, metadata = new { computedAt = DateTime.UtcNow } });
    }

    private static string ComputeHash(string payload)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    [HttpGet("proposals")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> GetRuleProposals(
        [FromQuery] string status = "proposed",
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "proposed" : status.Trim().ToLowerInvariant();
        var safeLimit = Math.Clamp(limit, 1, 500);

        var rows = await _dbContext.RuleProposalRecords.AsNoTracking()
            .Where(x => x.Status == normalizedStatus)
            .OrderByDescending(x => x.CreatedUtc)
            .Take(safeLimit)
            .Select(x => new
            {
                x.ProposalId,
                x.ObservableId,
                x.RuleFamily,
                x.Title,
                x.Severity,
                x.Confidence,
                x.HumanReviewRequired,
                x.Status,
                x.CreatedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items = rows, metadata = new { computedAt = DateTime.UtcNow } });
    }

    [HttpGet("deployment-recommendations")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> GetDeploymentRecommendations(
        [FromQuery] string status = "proposed",
        [FromQuery] int limit = 200,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "proposed" : status.Trim().ToLowerInvariant();
        var safeLimit = Math.Clamp(limit, 1, 1000);

        var rows = await _dbContext.DeploymentRecommendationRecords.AsNoTracking()
            .Where(x => x.Status == normalizedStatus)
            .OrderByDescending(x => x.CreatedUtc)
            .Take(safeLimit)
            .Select(x => new
            {
                x.RecommendationId,
                x.RuleFamily,
                x.RuleName,
                x.ServerId,
                x.Hostname,
                x.Deploy,
                x.Score,
                x.Reason,
                x.HumanApprovalRequired,
                x.Status,
                x.CreatedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items = rows, metadata = new { computedAt = DateTime.UtcNow } });
    }

    [HttpPatch("proposals/{proposalId}/status")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> UpdateProposalStatus(string proposalId, [FromBody] IocStatusUpdateRequest request, CancellationToken cancellationToken)
    {
        var status = request.Status.Trim().ToLowerInvariant();
        if (status is not ("approved" or "rejected" or "proposed"))
        {
            return BadRequest(new { message = "Status must be one of: proposed, approved, rejected." });
        }

        var proposal = await _dbContext.RuleProposalRecords.FirstOrDefaultAsync(x => x.ProposalId == proposalId, cancellationToken);
        if (proposal is null)
        {
            return NotFound(new { message = "Proposal not found." });
        }

        proposal.Status = status;
        _dbContext.AuditEvents.Add(new Entities.AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "RULE_PROPOSAL_STATUS",
            EntityType = "RuleProposalRecord",
            EntityId = proposalId,
            Details = $"Status -> {status}",
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { proposalId, status, updatedAt = DateTime.UtcNow });
    }

    [HttpPatch("deployment-recommendations/{recommendationId}/status")]
    [Authorize(Policy = "LeadAccess")]
    public async Task<IActionResult> UpdateDeploymentRecommendationStatus(string recommendationId, [FromBody] IocStatusUpdateRequest request, CancellationToken cancellationToken)
    {
        var status = request.Status.Trim().ToLowerInvariant();
        if (status is not ("approved" or "rejected" or "proposed"))
        {
            return BadRequest(new { message = "Status must be one of: proposed, approved, rejected." });
        }

        var recommendation = await _dbContext.DeploymentRecommendationRecords.FirstOrDefaultAsync(x => x.RecommendationId == recommendationId, cancellationToken);
        if (recommendation is null)
        {
            return NotFound(new { message = "Recommendation not found." });
        }

        recommendation.Status = status;
        _dbContext.AuditEvents.Add(new Entities.AuditEvent
        {
            ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            Action = "DEPLOYMENT_RECOMMENDATION_STATUS",
            EntityType = "DeploymentRecommendationRecord",
            EntityId = recommendationId,
            Details = $"Status -> {status}",
            OccurredUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { recommendationId, status, updatedAt = DateTime.UtcNow });
    }
}
