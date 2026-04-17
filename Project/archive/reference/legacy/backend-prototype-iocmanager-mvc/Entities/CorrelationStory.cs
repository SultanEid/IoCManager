namespace IoCManager.Mvc.Entities;

public sealed class CorrelationStory
{
    public int Id { get; set; }
    public int ObservableId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public int EvidenceCount { get; set; }
    public int RuleHits { get; set; }
    public DateTime ComputedUtc { get; set; } = DateTime.UtcNow;
}
