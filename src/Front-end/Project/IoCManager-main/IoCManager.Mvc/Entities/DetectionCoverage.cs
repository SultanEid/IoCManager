namespace IoCManager.Mvc.Entities;

public sealed class DetectionCoverage
{
    public int Id { get; set; }
    public int ObservableId { get; set; }
    public string RuleFamily { get; set; } = "sigma";
    public string CoverageStatus { get; set; } = "none";
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}
