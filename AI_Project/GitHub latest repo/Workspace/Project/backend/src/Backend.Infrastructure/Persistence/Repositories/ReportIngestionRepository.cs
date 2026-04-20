using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cases;
using Backend.Domain.Common;
using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Domain.Reports;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class ReportIngestionRepository : IReportIngestionRepository
{
    private readonly CtiDbContext _dbContext;

    public ReportIngestionRepository(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CtiDecisionBundleLookup?> GetDecisionBundleAsync(Guid decisionBundleId, CancellationToken cancellationToken)
    {
        return await _dbContext.CtiDecisionBundles
            .AsNoTracking()
            .Where(x => x.Id == decisionBundleId)
            .Select(x => new CtiDecisionBundleLookup(x.Id, x.CaseId, x.DecisionId, x.DecidedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<CtiSourceReliabilityProfile> GetOrCreateSourceReliabilityProfileAsync(
        string sourceSystem,
        string actorUserId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var normalized = sourceSystem.Trim();
        var existing = await _dbContext.CtiSourceReliabilityProfiles
            .Where(x =>
                x.SourceSystem == normalized
                && x.EffectiveFromUtc <= nowUtc
                && (!x.EffectiveToUtc.HasValue || x.EffectiveToUtc.Value >= nowUtc))
            .OrderByDescending(x => x.EffectiveFromUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        var profile = CtiSourceReliabilityProfile.Create(
            sourceSystem: normalized,
            historicalPrecision: 0.50m,
            historicalRecall: 0.50m,
            trustScore: 0.50m,
            effectiveFromUtc: nowUtc,
            effectiveToUtc: null,
            actorUserId: actorUserId,
            nowUtc: nowUtc);

        await _dbContext.CtiSourceReliabilityProfiles.AddAsync(profile, cancellationToken);
        return profile;
    }

    public async Task EnsureCtiCaseExistsAsync(CaseRecord caseRecord, string actorUserId, DateTimeOffset nowUtc, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.CtiCases.AnyAsync(x => x.Id == caseRecord.Id, cancellationToken);
        if (exists)
        {
            return;
        }

        var ctiCase = CtiCase.Create(
            title: caseRecord.Title,
            summary: caseRecord.Summary,
            ownerUserId: caseRecord.OwnerUserId,
            initialState: MapCaseState(caseRecord.Status),
            actorUserId: actorUserId,
            openedAtUtc: caseRecord.CreatedAtUtc);

        await _dbContext.CtiCases.AddAsync(ctiCase, cancellationToken);
    }

    public Task AddReportIngestionRunAsync(ReportIngestionRun run, CancellationToken cancellationToken)
    {
        return _dbContext.ReportIngestionRuns.AddAsync(run, cancellationToken).AsTask();
    }

    public Task AddReportIngestionClaimsAsync(IEnumerable<ReportIngestionClaim> claims, CancellationToken cancellationToken)
    {
        var materialized = claims as ReportIngestionClaim[] ?? claims.ToArray();
        return _dbContext.ReportIngestionClaims.AddRangeAsync(materialized, cancellationToken);
    }

    public Task AddEvidenceAssertionsAsync(IEnumerable<CtiEvidenceAssertion> assertions, CancellationToken cancellationToken)
    {
        var materialized = assertions as CtiEvidenceAssertion[] ?? assertions.ToArray();
        if (materialized.Length == 0)
        {
            return Task.CompletedTask;
        }

        return _dbContext.CtiEvidenceAssertions.AddRangeAsync(materialized, cancellationToken);
    }

    public Task AddDecisionEvidenceReferencesAsync(IEnumerable<CtiDecisionEvidenceReference> references, CancellationToken cancellationToken)
    {
        var materialized = references as CtiDecisionEvidenceReference[] ?? references.ToArray();
        if (materialized.Length == 0)
        {
            return Task.CompletedTask;
        }

        return _dbContext.CtiDecisionEvidenceReferences.AddRangeAsync(materialized, cancellationToken);
    }

    public async Task<ReportIngestionRun?> GetRunByIdAsync(Guid ingestionId, CancellationToken cancellationToken)
    {
        return await _dbContext.ReportIngestionRuns
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == ingestionId, cancellationToken);
    }

    public async Task<IReadOnlyList<ReportIngestionClaim>> ListClaimsByRunIdAsync(Guid ingestionId, CancellationToken cancellationToken)
    {
        return await _dbContext.ReportIngestionClaims
            .AsNoTracking()
            .Where(x => x.IngestionRunId == ingestionId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    private static CaseState MapCaseState(CaseStatus status)
    {
        return status switch
        {
            CaseStatus.Open => CaseState.Open,
            CaseStatus.InReview => CaseState.Triage,
            CaseStatus.AwaitingApproval => CaseState.AwaitingApproval,
            CaseStatus.Approved => CaseState.Promoted,
            CaseStatus.Rejected => CaseState.EvidencePending,
            CaseStatus.Closed => CaseState.Closed,
            _ => CaseState.Open,
        };
    }
}
