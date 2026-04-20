using Backend.Domain.Rules;

namespace Backend.Application.Abstractions.Persistence;

public interface IRulesRepository
{
    Task AddAsync(RuleRecord item, CancellationToken cancellationToken);
    Task AddRevisionAsync(RuleRevisionRecord item, CancellationToken cancellationToken);
    Task RemoveAsync(RuleRecord item, CancellationToken cancellationToken);
    Task<RuleRecord?> GetByIdAsync(Guid ruleId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
    Task<RuleRecord?> FindDuplicateAsync(Guid caseId, string ruleFamily, string bodyFingerprint, Guid? excludeRuleId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleRecord>> ListOverlapCandidatesAsync(Guid caseId, string ruleFamily, Guid? excludeRuleId, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuleRevisionRecord>> ListRevisionsAsync(Guid ruleId, CancellationToken cancellationToken);
    Task<int> GetNextRevisionNumberAsync(Guid ruleId, CancellationToken cancellationToken);
}
