using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class TransformationLineage
{
    [Key]
    public string LineageId { get; set; } = Guid.NewGuid().ToString("D");
    public string SourceEntityType { get; set; } = string.Empty;
    public string SourceEntityId { get; set; } = string.Empty;
    public string TargetEntityType { get; set; } = string.Empty;
    public string TargetEntityId { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string MethodVersion { get; set; } = "v1";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
