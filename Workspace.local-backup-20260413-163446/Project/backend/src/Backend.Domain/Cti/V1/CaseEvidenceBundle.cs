using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class CaseEvidenceBundle : AuditableEntity
{
    private readonly List<EvidenceAssertion> _assertions = new();

    private CaseEvidenceBundle()
    {
    }

    public Guid CaseId { get; private set; }
    public string BundleName { get; private set; } = string.Empty;
    public DateTimeOffset CollectedAtUtc { get; private set; }
    public DateTimeOffset FreshUntilUtc { get; private set; }
    public decimal ConflictScore { get; private set; }
    public SourceReliabilityProfile SourceReliability { get; private set; } = null!;
    public IReadOnlyCollection<EvidenceAssertion> Assertions => _assertions;

    public bool HasActionableAssertions => _assertions.Any(x => !x.IsConflicting && x.Confidence >= 0.60m);

    public static CaseEvidenceBundle Create(
        Guid caseId,
        string bundleName,
        DateTimeOffset collectedAtUtc,
        DateTimeOffset freshUntilUtc,
        SourceReliabilityProfile sourceReliability,
        IEnumerable<EvidenceAssertion> assertions,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bundleName);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentNullException.ThrowIfNull(sourceReliability);
        ArgumentNullException.ThrowIfNull(assertions);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (freshUntilUtc < collectedAtUtc)
        {
            throw new ArgumentOutOfRangeException(nameof(freshUntilUtc), "Fresh-until must be on or after collected time.");
        }

        var bundle = new CaseEvidenceBundle
        {
            CaseId = caseId,
            BundleName = bundleName.Trim(),
            CollectedAtUtc = collectedAtUtc,
            FreshUntilUtc = freshUntilUtc,
            SourceReliability = sourceReliability,
        };

        bundle._assertions.AddRange(assertions);
        bundle.RecalculateConflictScore();
        bundle.StampCreation(actorUserId, nowUtc);
        return bundle;
    }

    public EvidenceFreshness GetFreshness(DateTimeOffset nowUtc)
    {
        if (nowUtc > FreshUntilUtc)
        {
            return EvidenceFreshness.Expired;
        }

        var age = FreshUntilUtc - nowUtc;
        if (age <= TimeSpan.FromHours(4))
        {
            return EvidenceFreshness.Stale;
        }

        if (age <= TimeSpan.FromHours(12))
        {
            return EvidenceFreshness.Aging;
        }

        return EvidenceFreshness.Fresh;
    }

    public void AddAssertion(EvidenceAssertion assertion, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentNullException.ThrowIfNull(assertion);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        _assertions.Add(assertion);
        RecalculateConflictScore();
        Touch(actorUserId, nowUtc);
    }

    public void MoveToCase(Guid destinationCaseId, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (destinationCaseId == Guid.Empty)
        {
            throw new ArgumentException("Destination case id is required.", nameof(destinationCaseId));
        }

        CaseId = destinationCaseId;
        Touch(actorUserId, nowUtc);
    }

    private void RecalculateConflictScore()
    {
        if (_assertions.Count == 0)
        {
            ConflictScore = 0m;
            return;
        }

        var conflicting = _assertions.Count(x => x.IsConflicting);
        ConflictScore = Math.Clamp(conflicting / (decimal)_assertions.Count, 0m, 1m);
    }
}
