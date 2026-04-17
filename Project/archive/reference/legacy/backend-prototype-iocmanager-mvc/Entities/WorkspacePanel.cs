namespace IoCManager.Mvc.Entities;

public sealed class WorkspacePanel
{
    public int Id { get; set; }
    public string PanelKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public int SortOrder { get; set; }
}
