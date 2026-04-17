using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class CaseDeploymentRecommendation
{
    [Key]
    public string DeploymentId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string RuleProposalId { get; set; } = string.Empty;
    public string TargetScopeJson { get; set; } = "{}";
    public string RolloutMode { get; set; } = RolloutModes.None;
    public double ExpectedNoise { get; set; }
    public double ExpectedCoverageGain { get; set; }
    public double CostEstimate { get; set; }
    public string ApprovalRequired { get; set; } = ApprovalTiers.Analyst;
    public string Status { get; set; } = "proposed";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
