namespace IoCManager.Mvc.Entities;

public sealed class ThreatEntity
{
    public int Id { get; set; }
    public string EntityType { get; set; } = "campaign";
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
