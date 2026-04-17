using System.Text.Json;
using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;

namespace IoCManager.Mvc.Services;

public sealed class IocIntelligenceOpsStore : IIocIntelligenceOpsStore
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ObservableCanonicalizer _canonicalizer;

    public IocIntelligenceOpsStore(ApplicationDbContext dbContext, ObservableCanonicalizer canonicalizer)
    {
        _dbContext = dbContext;
        _canonicalizer = canonicalizer;
    }

    public async Task SaveReportIngestionAsync(
        ReportIngestionRequest request,
        ReportIngestionResponse response,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        var record = new ReportIngestionRecord
        {
            ReportId = response.ReportId,
            SourceName = request.SourceName,
            DocumentId = request.DocumentId,
            DocumentUrl = request.DocumentUrl,
            ExtractedIocCount = response.ExtractedIocs.Count,
            HumanReviewRequired = response.HumanReviewRequired,
            CampaignHintsJson = JsonSerializer.Serialize(response.CampaignHints),
            MalwareFamilyHintsJson = JsonSerializer.Serialize(response.MalwareFamilyHints),
            PayloadJson = JsonSerializer.Serialize(response),
            IngestionTimeUtc = request.IngestionTime.ToUniversalTime(),
            CreatedUtc = DateTime.UtcNow
        };

        _dbContext.ReportIngestionRecords.Add(record);
        AddCitations("report", response.ReportId, response.ExtractedIocs.SelectMany(x => x.Citations));
        AddAudit(actorUserId, "REPORT_INGEST", "ReportIngestionRecord", response.ReportId, $"Extracted IOC count: {response.ExtractedIocs.Count}");
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveRuleProposalAsync(
        RuleProposalRequest request,
        RuleProposalResponse response,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        var observableId = request.ObservableId;
        if (observableId is null && !string.IsNullOrWhiteSpace(request.IocType) && !string.IsNullOrWhiteSpace(request.IocValue))
        {
            var canonical = _canonicalizer.Canonicalize(request.IocType, request.IocValue);
            observableId = _dbContext.Observables
                .Where(x => x.Type == request.IocType.Trim().ToLowerInvariant() && x.ValueCanonical == canonical)
                .Select(x => (int?)x.Id)
                .FirstOrDefault();
        }

        _dbContext.RuleProposalRecords.Add(new RuleProposalRecord
        {
            ProposalId = response.ProposalId,
            ObservableId = observableId,
            RuleFamily = response.RuleFamily,
            Title = response.Title,
            RuleBody = response.RuleBody,
            Severity = response.Severity,
            Confidence = response.Confidence,
            HumanReviewRequired = response.HumanReviewRequired,
            Status = "proposed",
            AttackTechniquesJson = JsonSerializer.Serialize(response.AttackTechniques),
            CitationsJson = JsonSerializer.Serialize(response.Citations),
            CreatedUtc = DateTime.UtcNow
        });

        AddCitations("rule_proposal", response.ProposalId, response.Citations);
        AddAudit(actorUserId, "RULE_PROPOSAL_CREATE", "RuleProposalRecord", response.ProposalId, $"Family={response.RuleFamily}; Severity={response.Severity}");
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveDeploymentRecommendationsAsync(
        DeploymentRecommendationRequest request,
        DeploymentRecommendationResponse response,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        foreach (var item in response.Recommendations)
        {
            _dbContext.DeploymentRecommendationRecords.Add(new DeploymentRecommendationRecord
            {
                RecommendationId = item.RecommendationId,
                RuleFamily = request.RuleFamily,
                RuleName = request.RuleName,
                ServerId = item.ServerId,
                Hostname = item.Hostname,
                Deploy = item.Deploy,
                Score = item.Score,
                Reason = item.Reason,
                HumanApprovalRequired = item.HumanApprovalRequired,
                Status = "proposed",
                CreatedUtc = DateTime.UtcNow
            });
        }

        AddAudit(actorUserId, "DEPLOYMENT_RECOMMEND", "DeploymentRecommendationRecord", request.RuleName, $"Generated {response.Recommendations.Count} recommendations.");
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveCopilotResponseAsync(
        CopilotQueryRequest request,
        CopilotQueryResponse response,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        var sourceId = request.ObservableId?.ToString() ?? "copilot";
        AddCitations("copilot", sourceId, response.Citations);
        AddAudit(actorUserId, "COPILOT_QUERY", "Observable", sourceId, $"Confidence={response.Confidence:F2}; MissingEvidence={response.MissingEvidence.Length}");
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveGraphLinkCandidatesAsync(
        GraphLinkCandidateRequest request,
        IReadOnlyList<GraphLinkCandidateResponse> response,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        foreach (var item in response)
        {
            _dbContext.GraphLinkCandidateRecords.Add(new GraphLinkCandidateRecord
            {
                SeedObservableId = request.SeedObservableId,
                CandidateObservableId = item.CandidateObservableId,
                Score = item.Score,
                Reason = item.Reason,
                CitationsJson = JsonSerializer.Serialize(item.Citations),
                ComputedUtc = DateTime.UtcNow
            });
        }

        AddAudit(actorUserId, "GRAPH_LINK_CANDIDATES", "GraphLinkCandidateRecord", request.SeedObservableId.ToString(), $"TopK={request.TopK}; Produced={response.Count}");
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private void AddCitations(string sourceType, string sourceId, IEnumerable<EvidenceCitationResponse> citations)
    {
        foreach (var citation in citations.Where(x => !string.IsNullOrWhiteSpace(x.Snippet)))
        {
            _dbContext.EvidenceCitationRecords.Add(new EvidenceCitationRecord
            {
                SourceType = sourceType,
                SourceId = sourceId,
                Snippet = citation.Snippet,
                SourceUri = citation.SourceUri,
                StartOffset = citation.StartOffset,
                EndOffset = citation.EndOffset,
                Confidence = citation.Confidence,
                CreatedUtc = DateTime.UtcNow
            });
        }
    }

    private void AddAudit(string actorUserId, string action, string entityType, string entityId, string details)
    {
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            OccurredUtc = DateTime.UtcNow
        });
    }
}
