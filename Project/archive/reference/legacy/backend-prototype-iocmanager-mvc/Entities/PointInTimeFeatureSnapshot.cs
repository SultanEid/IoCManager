using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class PointInTimeFeatureSnapshot
{
    [Key]
    public string SnapshotId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public DateTime AsOfTime { get; set; } = DateTime.UtcNow;
    public string DatasetVersion { get; set; } = "unknown";
    public string FeatureSnapshotHash { get; set; } = string.Empty;
    public string FeatureValuesJson { get; set; } = "{}";
    public string GraphVersion { get; set; } = "v1";
    public string PolicyVersionRef { get; set; } = "cti-policy-v1";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
