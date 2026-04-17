namespace IoCManager.Mvc.Entities;

public sealed class EvidenceCitationRecord
{
    public int Id { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string? SourceUri { get; set; }
    public int? StartOffset { get; set; }
    public int? EndOffset { get; set; }
    public double Confidence { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
