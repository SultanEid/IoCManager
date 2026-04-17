using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class AnalystFeedbackEvent
{
    [Key]
    public string FeedbackId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string VerdictType { get; set; } = string.Empty;
    public string LabelStrength { get; set; } = "weak";
    public string DispositionReason { get; set; } = string.Empty;
    public double OperatorConfidence { get; set; } = 0.5;
    public string OverrideReason { get; set; } = string.Empty;
    public long ReviewLatencyMs { get; set; }
    public string TeamId { get; set; } = "default";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
