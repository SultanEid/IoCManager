namespace Backend.Domain.Cti.V1;

public sealed class TransformationLineage
{
    private readonly List<CaseLineageLink> _links = new();

    public IReadOnlyCollection<CaseLineageLink> Links => _links;

    public void RecordMerge(Guid sourceCaseId, Guid destinationCaseId, string rationale, DateTimeOffset recordedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        if (sourceCaseId == Guid.Empty || destinationCaseId == Guid.Empty)
        {
            throw new ArgumentException("Source and destination case ids are required.");
        }

        _links.Add(new CaseLineageLink(
            sourceCaseId,
            destinationCaseId,
            "merge",
            rationale.Trim(),
            recordedAtUtc));
    }

    public void RecordSplit(Guid parentCaseId, Guid childCaseId, string rationale, DateTimeOffset recordedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        if (parentCaseId == Guid.Empty || childCaseId == Guid.Empty)
        {
            throw new ArgumentException("Parent and child case ids are required.");
        }

        _links.Add(new CaseLineageLink(
            parentCaseId,
            childCaseId,
            "split",
            rationale.Trim(),
            recordedAtUtc));
    }
}

public sealed record CaseLineageLink(
    Guid SourceCaseId,
    Guid TargetCaseId,
    string Relationship,
    string Rationale,
    DateTimeOffset RecordedAtUtc);
