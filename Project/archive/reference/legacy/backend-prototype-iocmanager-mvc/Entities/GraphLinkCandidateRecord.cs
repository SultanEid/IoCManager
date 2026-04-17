namespace IoCManager.Mvc.Entities;

public sealed class GraphLinkCandidateRecord
{
    public int Id { get; set; }
    public int SeedObservableId { get; set; }
    public int CandidateObservableId { get; set; }
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string CitationsJson { get; set; } = "[]";
    public DateTime ComputedUtc { get; set; } = DateTime.UtcNow;
}
