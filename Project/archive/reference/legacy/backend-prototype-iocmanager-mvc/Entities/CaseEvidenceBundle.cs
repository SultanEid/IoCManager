using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class CaseEvidenceBundle
{
    [Key]
    public string BundleId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public DateTime AsOfTime { get; set; } = DateTime.UtcNow;
    public string SourceIdsJson { get; set; } = "[]";
    public string DetectionObservationsJson { get; set; } = "[]";
    public string RelatedIocsJson { get; set; } = "[]";
    public string GraphNeighborsJson { get; set; } = "[]";
    public string SimilarCasesJson { get; set; } = "[]";
    public string MissingEvidenceHintsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
