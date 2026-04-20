namespace Backend.Domain.Cti.V1;

public sealed class NextBestEvidence
{
    private NextBestEvidence()
    {
    }

    public NextBestEvidenceType Type { get; private set; }
    public string Request { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;

    public static NextBestEvidence Create(
        NextBestEvidenceType type,
        string request,
        string rationale)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);

        return new NextBestEvidence
        {
            Type = type,
            Request = request.Trim(),
            Rationale = rationale.Trim(),
        };
    }
}
