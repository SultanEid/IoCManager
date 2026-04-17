namespace IoCManager.Mvc.Entities;

public sealed class DashboardMetric
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Delta { get; set; } = string.Empty;
    public string DeltaDirection { get; set; } = "up";
    public string Headline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
