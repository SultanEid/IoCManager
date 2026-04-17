using Backend.Contracts.Rules;

namespace Backend.Application.Abstractions.Services;

public interface IRuleService
{
    Task<RuleResponse> CreateAsync(CreateRuleRequest request, CancellationToken cancellationToken);
    Task<RuleResponse?> GetByIdAsync(Guid ruleId, CancellationToken cancellationToken);
    Task<RuleResponse?> UpdateAsync(Guid ruleId, UpdateRuleRequest request, CancellationToken cancellationToken);
    Task<RuleResponse?> UpdateStatusAsync(Guid ruleId, UpdateRuleStatusRequest request, CancellationToken cancellationToken);
    Task<RuleResponse?> ReviewAsync(Guid ruleId, ReviewRuleRequest request, CancellationToken cancellationToken);
    Task<RuleValidationResultResponse?> ValidateAsync(Guid ruleId, ValidateRuleRequest request, CancellationToken cancellationToken);
    Task<RuleResponse?> RecordUsefulHitAsync(Guid ruleId, RecordRuleHitRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid ruleId, string actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleRevisionResponse>> ListRevisionsAsync(Guid ruleId, CancellationToken cancellationToken);
}
