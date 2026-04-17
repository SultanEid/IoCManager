namespace IoCManager.Mvc.Entities;

public sealed class CaseShell
{
    public int Id { get; set; }
    public int ClusterId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
