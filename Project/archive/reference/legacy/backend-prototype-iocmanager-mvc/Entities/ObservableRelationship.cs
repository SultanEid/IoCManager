namespace IoCManager.Mvc.Entities;

public sealed class ObservableRelationship
{
    public int Id { get; set; }
    public int FromObservableId { get; set; }
    public int ToObservableId { get; set; }
    public string RelationshipType { get; set; } = "correlated";
    public int Confidence { get; set; }
    public int EvidenceCount { get; set; }
    public DateTime FirstSeenUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
}
