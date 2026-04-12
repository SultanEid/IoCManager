using Backend.Domain.RuleLifecycle;

namespace Backend.Application.Abstractions.Persistence;

public interface IRuleWorkflowRepository
{
    Task AddProposalAsync(RuleProposal proposal, CancellationToken cancellationToken);
    Task<RuleProposal?> GetProposalByIdAsync(Guid proposalId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleProposal>> ListProposalsByCaseAsync(Guid caseId, CancellationToken cancellationToken);

    Task AddRecommendationAsync(DeploymentRecommendation recommendation, CancellationToken cancellationToken);
    Task<DeploymentRecommendation?> GetRecommendationByIdAsync(Guid recommendationId, CancellationToken cancellationToken);
    Task<DeploymentRecommendation?> GetRecommendationByProposalIdAsync(Guid proposalId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DeploymentRecommendation>> ListRecommendationsByCaseAsync(Guid caseId, CancellationToken cancellationToken);

    Task AddRolloutPlanAsync(RolloutPlan rolloutPlan, CancellationToken cancellationToken);
    Task<RolloutPlan?> GetRolloutPlanByIdAsync(Guid rolloutPlanId, CancellationToken cancellationToken);
    Task<RolloutPlan?> GetRolloutPlanByRecommendationIdAsync(Guid recommendationId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RolloutPlan>> ListRolloutPlansByCaseAsync(Guid caseId, CancellationToken cancellationToken);

    Task AddRollbackPlanAsync(RollbackPlan rollbackPlan, CancellationToken cancellationToken);
    Task<RollbackPlan?> GetRollbackPlanByIdAsync(Guid rollbackPlanId, CancellationToken cancellationToken);
    Task<RollbackPlan?> GetRollbackPlanByRolloutPlanIdAsync(Guid rolloutPlanId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RollbackPlan>> ListRollbackPlansByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
