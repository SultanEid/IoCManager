using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class EvidenceAssertion
{
    [Key]
    public string AssertionId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public int? SourceSpanStart { get; set; }
    public int? SourceSpanEnd { get; set; }
    public string ExtractionMethod { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public DateTime ExtractedAt { get; set; } = DateTime.UtcNow;
}
