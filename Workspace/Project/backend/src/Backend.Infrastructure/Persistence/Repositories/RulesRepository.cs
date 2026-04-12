using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class RulesRepository : IRulesRepository
{
    private readonly CtiDbContext _dbContext;

    public RulesRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(RuleRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.Rules.AddAsync(item, cancellationToken).AsTask();
    }

    public Task AddRevisionAsync(RuleRevisionRecord item, CancellationToken cancellationToken)
    {
        return _dbContext.RuleRevisions.AddAsync(item, cancellationToken).AsTask();
    }

    public Task RemoveAsync(RuleRecord item, CancellationToken cancellationToken)
    {
        _dbContext.Rules.Remove(item);
        return Task.CompletedTask;
    }

    public Task<RuleRecord?> GetByIdAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        return _dbContext.Rules.FirstOrDefaultAsync(x => x.Id == ruleId, cancellationToken);
    }

    public async Task<IReadOnlyList<RuleRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        return await _dbContext.Rules
            .AsNoTracking()
            .Where(x => x.CaseId == caseId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public Task<RuleRecord?> FindDuplicateAsync(
        Guid caseId,
        string ruleFamily,
        string bodyFingerprint,
        Guid? excludeRuleId,
        CancellationToken cancellationToken)
    {
        return _dbContext.Rules
            .AsNoTracking()
            .Where(x => x.CaseId == caseId && x.RuleFamily == ruleFamily && x.BodyFingerprint == bodyFingerprint)
            .Where(x => !excludeRuleId.HasValue || x.Id != excludeRuleId.Value)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RuleRecord>> ListOverlapCandidatesAsync(
        Guid caseId,
        string ruleFamily,
        Guid? excludeRuleId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Rules
            .AsNoTracking()
            .Where(x => x.CaseId == caseId && x.RuleFamily == ruleFamily)
            .Where(x => !excludeRuleId.HasValue || x.Id != excludeRuleId.Value)
            .Where(x => x.Status != Backend.Domain.Common.RuleStatus.Retired)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(50)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RuleRevisionRecord>> ListRevisionsAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        return await _dbContext.RuleRevisions
            .AsNoTracking()
            .Where(x => x.RuleId == ruleId)
            .OrderByDescending(x => x.RevisionNumber)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<int> GetNextRevisionNumberAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        var maxRevision = await _dbContext.RuleRevisions
            .AsNoTracking()
            .Where(x => x.RuleId == ruleId)
            .Select(x => (int?)x.RevisionNumber)
            .MaxAsync(cancellationToken);

        return (maxRevision ?? 0) + 1;
    }
}
