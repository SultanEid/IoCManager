namespace IoCManager.Mvc.Entities;

public sealed class ObservableEvidence
{
    public int Id { get; set; }
    public int ObservableId { get; set; }
    public string Source { get; set; } = string.Empty;
    public string EvidenceType { get; set; } = string.Empty;
    public string EvidenceKey { get; set; } = string.Empty;
    public string EvidenceValue { get; set; } = string.Empty;
    public DateTime ObservedUtc { get; set; } = DateTime.UtcNow;
}
