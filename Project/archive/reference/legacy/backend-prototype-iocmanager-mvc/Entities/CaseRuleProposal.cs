using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class CaseRuleProposal
{
    [Key]
    public string ProposalId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string RuleType { get; set; } = "sigma";
    public string RuleBody { get; set; } = string.Empty;
    public string MetadataTagsJson { get; set; } = "[]";
    public double PredictedCoverage { get; set; }
    public double PredictedFpRisk { get; set; }
    public string TargetAssetClassesJson { get; set; } = "[]";
    public string Status { get; set; } = "proposed";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
