using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class SourceReliabilityProfile
{
    [Key]
    public string SourceId { get; set; } = string.Empty;
    public string SourceType { get; set; } = "feed";
    public double PrecisionEstimate { get; set; } = 0.5;
    public double NoveltyYield { get; set; } = 0.5;
    public string LatencyProfile { get; set; } = "unknown";
    public double HistoricalFpRate { get; set; } = 0.5;
    public string TrustBucket { get; set; } = "medium";
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}
