using Backend.Contracts.CtiPolicy;

namespace Backend.Application.Abstractions.Services;

public interface ICtiPolicyService
{
    Task<CtiPolicyEvaluationResponse> EvaluateAsync(EvaluateCtiPolicyRequest request, CancellationToken cancellationToken);
}
