namespace IoCManager.Mvc.Entities;

public sealed class ReportIngestionRecord
{
    public int Id { get; set; }
    public string ReportId { get; set; } = string.Empty;
    public string SourceName { get; set; } = string.Empty;
    public string DocumentId { get; set; } = string.Empty;
    public string? DocumentUrl { get; set; }
    public int ExtractedIocCount { get; set; }
    public bool HumanReviewRequired { get; set; } = true;
    public string CampaignHintsJson { get; set; } = "[]";
    public string MalwareFamilyHintsJson { get; set; } = "[]";
    public string PayloadJson { get; set; } = "{}";
    public DateTime IngestionTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
