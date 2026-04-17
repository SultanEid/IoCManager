namespace IoCManager.Mvc.Entities;

public sealed class VisitorPoint
{
    public int Id { get; set; }
    public DateTime DateUtc { get; set; }
    public int Desktop { get; set; }
    public int Mobile { get; set; }
}
