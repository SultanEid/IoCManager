namespace IoCManager.Mvc.Entities;

public sealed class ClusterMembership
{
    public int Id { get; set; }
    public int ClusterId { get; set; }
    public int ObservableId { get; set; }
    public int Weight { get; set; }
}
