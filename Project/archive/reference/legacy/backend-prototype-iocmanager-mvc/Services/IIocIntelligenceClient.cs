using IoCManager.Mvc.Contracts.Intel;

namespace IoCManager.Mvc.Services;

public interface IIocIntelligenceClient
{
    Task<IocScoringResult> ScoreAsync(ScoreIocRequest request, CancellationToken cancellationToken = default);
    Task<BatchScoreResponse?> ScoreBatchAsync(ScoreBatchRequest request, CancellationToken cancellationToken = default);
    Task<bool> SendFeedbackAsync(FeedbackRequest request, CancellationToken cancellationToken = default);
    Task<ModelCardResponse?> GetModelCardAsync(CancellationToken cancellationToken = default);
    Task<ReportIngestionResponse?> IngestReportAsync(ReportIngestionRequest request, CancellationToken cancellationToken = default);
    Task<RuleProposalResponse?> ProposeRuleAsync(RuleProposalRequest request, CancellationToken cancellationToken = default);
    Task<DeploymentRecommendationResponse?> RecommendDeploymentAsync(DeploymentRecommendationRequest request, CancellationToken cancellationToken = default);
    Task<CopilotQueryResponse?> QueryCopilotAsync(CopilotQueryRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GraphLinkCandidateResponse>?> GetGraphLinkCandidatesAsync(GraphLinkCandidateRequest request, CancellationToken cancellationToken = default);
    Task<CaseScoreVectorResponse?> ScoreCaseAsync(ScoreCaseRequest request, CancellationToken cancellationToken = default);
    Task<RecommendActionResponse?> RecommendActionAsync(RecommendActionRequest request, CancellationToken cancellationToken = default);
    Task<RequestMoreEvidenceResponse?> RequestMoreEvidenceAsync(RequestMoreEvidenceRequest request, CancellationToken cancellationToken = default);
    Task<SimulateRuleResponse?> SimulateRuleAsync(SimulateRuleRequest request, CancellationToken cancellationToken = default);
}
