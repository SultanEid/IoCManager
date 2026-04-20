using Backend.Domain.Cases;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Domain.Reports;

namespace Backend.Application.Abstractions.Persistence;

public interface IReportIngestionRepository
{
    Task<CtiDecisionBundleLookup?> GetDecisionBundleAsync(Guid decisionBundleId, CancellationToken cancellationToken);
    Task<CtiSourceReliabilityProfile> GetOrCreateSourceReliabilityProfileAsync(
        string sourceSystem,
        string actorUserId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task EnsureCtiCaseExistsAsync(CaseRecord caseRecord, string actorUserId, DateTimeOffset nowUtc, CancellationToken cancellationToken);

    Task AddReportIngestionRunAsync(ReportIngestionRun run, CancellationToken cancellationToken);
    Task AddReportIngestionClaimsAsync(IEnumerable<ReportIngestionClaim> claims, CancellationToken cancellationToken);
    Task AddEvidenceAssertionsAsync(IEnumerable<CtiEvidenceAssertion> assertions, CancellationToken cancellationToken);
    Task AddDecisionEvidenceReferencesAsync(IEnumerable<CtiDecisionEvidenceReference> references, CancellationToken cancellationToken);
    Task<ReportIngestionRun?> GetRunByIdAsync(Guid ingestionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReportIngestionClaim>> ListClaimsByRunIdAsync(Guid ingestionId, CancellationToken cancellationToken);
}

public sealed record CtiDecisionBundleLookup(
    Guid Id,
    Guid CaseId,
    Guid DecisionId,
    DateTimeOffset DecidedAtUtc);
