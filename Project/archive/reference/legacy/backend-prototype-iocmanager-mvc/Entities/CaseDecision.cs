using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class CaseDecision
{
    [Key]
    public string DecisionId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string DecisionState { get; set; } = DecisionStates.Defer;
    public string RecommendedAction { get; set; } = ActionTypes.Monitor;
    public string ApprovalTierRequired { get; set; } = ApprovalTiers.Analyst;
    public string RolloutMode { get; set; } = RolloutModes.None;
    public string ReasonSummary { get; set; } = string.Empty;
    public string PolicyVersion { get; set; } = "cti-policy-v1";
    public string ModelVersion { get; set; } = "unknown";
    public string CreatedBy { get; set; } = "system";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
