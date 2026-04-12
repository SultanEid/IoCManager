using Backend.Contracts.RuleLifecycle;

namespace Backend.Application.Abstractions.Services;

public interface IRuleWorkflowService
{
    Task<RuleProposalResponse> CreateProposalAsync(CreateRuleProposalRequest request, CancellationToken cancellationToken);
    Task<RuleProposalResponse?> ReviewProposalAsync(Guid proposalId, ReviewRuleProposalRequest request, CancellationToken cancellationToken);
    Task<RuleSimulationResultResponse?> SimulateProposalAsync(Guid proposalId, SimulateRuleProposalRequest request, CancellationToken cancellationToken);
    Task<RolloutPlanResponse?> AdvanceRolloutStageAsync(Guid rolloutPlanId, AdvanceRolloutStageRequest request, CancellationToken cancellationToken);
    Task<RolloutPlanResponse?> RecordCanaryObservationAsync(Guid rolloutPlanId, RecordCanaryObservationRequest request, CancellationToken cancellationToken);
    Task<RollbackPlanResponse?> TriggerRollbackAsync(Guid rollbackPlanId, TriggerRollbackRequest request, CancellationToken cancellationToken);
    Task<CaseRuleWorkflowResponse> GetCaseWorkflowAsync(Guid caseId, CancellationToken cancellationToken);
}
