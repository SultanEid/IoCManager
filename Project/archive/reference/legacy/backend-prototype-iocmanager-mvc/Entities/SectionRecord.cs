namespace IoCManager.Mvc.Entities;

public sealed class SectionRecord
{
    public int Id { get; set; }
    public string Header { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Limit { get; set; } = string.Empty;
    public string Reviewer { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
