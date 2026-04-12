using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class EvidenceAssertion : Entity
{
    private EvidenceAssertion()
    {
    }

    public string AssertionType { get; private set; } = string.Empty;
    public string Statement { get; private set; } = string.Empty;
    public decimal Confidence { get; private set; }
    public bool IsConflicting { get; private set; }
    public DateTimeOffset ObservedAtUtc { get; private set; }
    public string SourceReference { get; private set; } = string.Empty;

    public static EvidenceAssertion Create(
        string assertionType,
        string statement,
        decimal confidence,
        bool isConflicting,
        DateTimeOffset observedAtUtc,
        string sourceReference)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(assertionType);
        ArgumentException.ThrowIfNullOrWhiteSpace(statement);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceReference);

        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        return new EvidenceAssertion
        {
            AssertionType = assertionType.Trim(),
            Statement = statement.Trim(),
            Confidence = confidence,
            IsConflicting = isConflicting,
            ObservedAtUtc = observedAtUtc,
            SourceReference = sourceReference.Trim(),
        };
    }
}
