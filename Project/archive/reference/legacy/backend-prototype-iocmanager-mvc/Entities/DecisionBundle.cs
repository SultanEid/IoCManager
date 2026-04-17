using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class DecisionBundle
{
    [Key]
    public string BundleId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string ScoreVectorJson { get; set; } = "{}";
    public string PolicyOutcomeJson { get; set; } = "{}";
    public string TopEvidenceJson { get; set; } = "[]";
    public string NeighborContextJson { get; set; } = "[]";
    public string SimilarCaseRefsJson { get; set; } = "[]";
    public string NextBestEvidenceJson { get; set; } = "[]";
    public string RolloutPlanJson { get; set; } = "{}";
    public string RollbackPlanJson { get; set; } = "{}";
    public string SnapshotRefsJson { get; set; } = "{}";
    public string GeneratedExplanation { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
