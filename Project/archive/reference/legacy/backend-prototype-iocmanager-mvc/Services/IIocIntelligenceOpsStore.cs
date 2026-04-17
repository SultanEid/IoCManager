using IoCManager.Mvc.Contracts.Intel;

namespace IoCManager.Mvc.Services;

public interface IIocIntelligenceOpsStore
{
    Task SaveReportIngestionAsync(ReportIngestionRequest request, ReportIngestionResponse response, string actorUserId, CancellationToken cancellationToken = default);
    Task SaveRuleProposalAsync(RuleProposalRequest request, RuleProposalResponse response, string actorUserId, CancellationToken cancellationToken = default);
    Task SaveDeploymentRecommendationsAsync(DeploymentRecommendationRequest request, DeploymentRecommendationResponse response, string actorUserId, CancellationToken cancellationToken = default);
    Task SaveCopilotResponseAsync(CopilotQueryRequest request, CopilotQueryResponse response, string actorUserId, CancellationToken cancellationToken = default);
    Task SaveGraphLinkCandidatesAsync(GraphLinkCandidateRequest request, IReadOnlyList<GraphLinkCandidateResponse> response, string actorUserId, CancellationToken cancellationToken = default);
}
