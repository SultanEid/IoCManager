using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Services;

public sealed class IocDecisionTraceService : IIocDecisionTraceService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ObservableCanonicalizer _canonicalizer;

    public IocDecisionTraceService(ApplicationDbContext dbContext, ObservableCanonicalizer canonicalizer)
    {
        _dbContext = dbContext;
        _canonicalizer = canonicalizer;
    }

    public async Task RecordScoreAsync(
        ObservableRecord observable,
        ScoreIocRequest scoreRequest,
        ScoreResponse scoreResponse,
        CancellationToken cancellationToken = default)
    {
        var uncertaintyJson = JsonSerializer.Serialize(scoreResponse.UncertaintySet);
        var evidenceJson = JsonSerializer.Serialize(scoreResponse.TopEvidence);
        var traceHash = CreateTraceHash(
            observable.Id,
            scoreRequest.IocType,
            scoreRequest.IocValue,
            scoreResponse.RiskScore,
            scoreResponse.ModelVersion,
            evidenceJson,
            uncertaintyJson);

        observable.ModelRiskScore = scoreResponse.RiskScore;
        observable.RiskTier = scoreResponse.RiskTier;
        observable.ModelConfidence = scoreResponse.Confidence;
        observable.UncertaintySet = uncertaintyJson;
        observable.RecommendedAction = scoreResponse.RecommendedAction;
        observable.TtlHours = scoreResponse.TtlHours;
        observable.ModelVersion = scoreResponse.ModelVersion;
        observable.LastScoredUtc = DateTime.UtcNow;

        _dbContext.ModelDecisionTraces.Add(new ModelDecisionTrace
        {
            ObservableId = observable.Id,
            ObservableType = observable.Type,
            SourceSystem = scoreRequest.SourceSystem,
            EventTimeUtc = scoreRequest.EventTime.ToUniversalTime().ToString("O"),
            RiskScore = scoreResponse.RiskScore,
            RiskTier = scoreResponse.RiskTier,
            Confidence = scoreResponse.Confidence,
            UncertaintySetJson = uncertaintyJson,
            TopEvidenceJson = evidenceJson,
            RecommendedAction = scoreResponse.RecommendedAction,
            TtlHours = scoreResponse.TtlHours,
            ModelVersion = scoreResponse.ModelVersion,
            DecisionTraceHash = traceHash,
            AsOfTimeUtc = scoreRequest.EventTime.ToUniversalTime().ToString("O"),
            DatasetVersion = "legacy-stream",
            FeatureSnapshotHash = traceHash,
            PolicyVersion = "cti-policy-v1",
            DecisionState = DecisionStates.Recommend,
            MissingEvidenceHintsJson = "[]",
            TopContributingFeaturesJson = evidenceJson,
            NeighborContextRefsJson = "[]",
            SimilarCaseRefsJson = "[]",
            CreatedUtc = DateTime.UtcNow
        });

        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = "ioc-intelligence-service",
            Action = "IOC_SCORE_RECORD",
            EntityType = "Observable",
            EntityId = observable.Id.ToString(),
            Details = $"Tier={scoreResponse.RiskTier}; Score={scoreResponse.RiskScore:F4}; Version={scoreResponse.ModelVersion}",
            OccurredUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RecordFeedbackAsync(
        FeedbackRequest request,
        string analystUserId,
        CancellationToken cancellationToken = default)
    {
        var metadataJson = request.Metadata is null
            ? "{}"
            : JsonSerializer.Serialize(request.Metadata);

        var normalizedType = request.IocType.Trim().ToLowerInvariant();
        var canonical = _canonicalizer.Canonicalize(normalizedType, request.IocValue);
        var observable = await _dbContext.Observables
            .FirstOrDefaultAsync(
                x => x.Type == normalizedType && x.ValueCanonical == canonical,
                cancellationToken);

        _dbContext.AnalystOutcomes.Add(new AnalystOutcome
        {
            ObservableId = observable?.Id,
            IocType = normalizedType,
            IocValue = request.IocValue.Trim(),
            Verdict = request.Verdict.Trim().ToLowerInvariant(),
            AnalystUserId = analystUserId,
            CaseId = request.CaseId?.Trim() ?? string.Empty,
            SourceSystem = request.SourceSystem.Trim(),
            MetadataJson = metadataJson,
            EventTimeUtc = request.EventTime.ToUniversalTime(),
            CreatedUtc = DateTime.UtcNow
        });

        if (!string.IsNullOrWhiteSpace(request.CaseId))
        {
            _dbContext.AnalystFeedbackEvents.Add(new AnalystFeedbackEvent
            {
                CaseId = request.CaseId.Trim(),
                VerdictType = request.Verdict.Trim().ToLowerInvariant(),
                LabelStrength = "weak",
                DispositionReason = "feedback_api",
                OperatorConfidence = 0.5,
                OverrideReason = string.Empty,
                ReviewLatencyMs = 0,
                TeamId = "default",
                CreatedAt = DateTime.UtcNow
            });
        }

        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = analystUserId,
            Action = "IOC_FEEDBACK_RECORD",
            EntityType = "AnalystOutcome",
            EntityId = request.IocValue,
            Details = $"Verdict={request.Verdict}; Source={request.SourceSystem}",
            OccurredUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string CreateTraceHash(
        int observableId,
        string iocType,
        string iocValue,
        double riskScore,
        string modelVersion,
        string evidenceJson,
        string uncertaintyJson)
    {
        var payload = $"{observableId}|{iocType}|{iocValue}|{riskScore:F6}|{modelVersion}|{evidenceJson}|{uncertaintyJson}";
        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
