namespace IoCManager.Mvc.Entities;

public sealed class ObservableSighting
{
    public int Id { get; set; }
    public int ObservableId { get; set; }
    public string SensorName { get; set; } = string.Empty;
    public int HitCount { get; set; }
    public DateTime SeenUtc { get; set; } = DateTime.UtcNow;
}
