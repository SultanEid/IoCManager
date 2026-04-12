using Backend.Application.Abstractions.Persistence;
using Backend.Domain.RuleLifecycle;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class RuleWorkflowRepository : IRuleWorkflowRepository
{
    private readonly CtiDbContext _dbContext;

    public RuleWorkflowRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddProposalAsync(RuleProposal proposal, CancellationToken cancellationToken)
    {
        return _dbContext.RuleProposals.AddAsync(proposal, cancellationToken).AsTask();
    }

    public Task<RuleProposal?> GetProposalByIdAsync(Guid proposalId, CancellationToken cancellationToken)
    {
        return _dbContext.RuleProposals.FirstOrDefaultAsync(x => x.Id == proposalId, cancellationToken);
    }

    public async Task<IReadOnlyList<RuleProposal>> ListProposalsByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.RuleProposals
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddRecommendationAsync(DeploymentRecommendation recommendation, CancellationToken cancellationToken)
    {
        return _dbContext.DeploymentRecommendations.AddAsync(recommendation, cancellationToken).AsTask();
    }

    public Task<DeploymentRecommendation?> GetRecommendationByIdAsync(Guid recommendationId, CancellationToken cancellationToken)
    {
        return _dbContext.DeploymentRecommendations.FirstOrDefaultAsync(x => x.Id == recommendationId, cancellationToken);
    }

    public Task<DeploymentRecommendation?> GetRecommendationByProposalIdAsync(Guid proposalId, CancellationToken cancellationToken)
    {
        return _dbContext.DeploymentRecommendations.FirstOrDefaultAsync(x => x.RuleProposalId == proposalId, cancellationToken);
    }

    public async Task<IReadOnlyList<DeploymentRecommendation>> ListRecommendationsByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.DeploymentRecommendations
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.RecommendedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddRolloutPlanAsync(RolloutPlan rolloutPlan, CancellationToken cancellationToken)
    {
        return _dbContext.RolloutPlans.AddAsync(rolloutPlan, cancellationToken).AsTask();
    }

    public Task<RolloutPlan?> GetRolloutPlanByIdAsync(Guid rolloutPlanId, CancellationToken cancellationToken)
    {
        return _dbContext.RolloutPlans.FirstOrDefaultAsync(x => x.Id == rolloutPlanId, cancellationToken);
    }

    public Task<RolloutPlan?> GetRolloutPlanByRecommendationIdAsync(Guid recommendationId, CancellationToken cancellationToken)
    {
        return _dbContext.RolloutPlans.FirstOrDefaultAsync(x => x.DeploymentRecommendationId == recommendationId, cancellationToken);
    }

    public async Task<IReadOnlyList<RolloutPlan>> ListRolloutPlansByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.RolloutPlans
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task AddRollbackPlanAsync(RollbackPlan rollbackPlan, CancellationToken cancellationToken)
    {
        return _dbContext.RollbackPlans.AddAsync(rollbackPlan, cancellationToken).AsTask();
    }

    public Task<RollbackPlan?> GetRollbackPlanByIdAsync(Guid rollbackPlanId, CancellationToken cancellationToken)
    {
        return _dbContext.RollbackPlans.FirstOrDefaultAsync(x => x.Id == rollbackPlanId, cancellationToken);
    }

    public Task<RollbackPlan?> GetRollbackPlanByRolloutPlanIdAsync(Guid rolloutPlanId, CancellationToken cancellationToken)
    {
        return _dbContext.RollbackPlans.FirstOrDefaultAsync(x => x.RolloutPlanId == rolloutPlanId, cancellationToken);
    }

    public async Task<IReadOnlyList<RollbackPlan>> ListRollbackPlansByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.RollbackPlans
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }
}
