using Backend.Contracts.Decisions;

namespace Backend.Application.Abstractions.Services;

public interface IDecisionService
{
    Task<DecisionResponse> CreateAsync(CreateDecisionRequest request, CancellationToken cancellationToken);
    Task<DecisionResponse?> FinalizeAsync(Guid decisionId, FinalizeDecisionRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<DecisionResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
