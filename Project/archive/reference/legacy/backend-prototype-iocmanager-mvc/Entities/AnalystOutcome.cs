namespace IoCManager.Mvc.Entities;

public sealed class AnalystOutcome
{
    public int Id { get; set; }
    public int? ObservableId { get; set; }
    public string IocType { get; set; } = string.Empty;
    public string IocValue { get; set; } = string.Empty;
    public string Verdict { get; set; } = string.Empty;
    public string AnalystUserId { get; set; } = string.Empty;
    public string CaseId { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = string.Empty;
    public string MetadataJson { get; set; } = "{}";
    public DateTime EventTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
