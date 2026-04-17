using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class AnalystOverrideRecord
{
    [Key]
    public string OverrideId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string PreviousDecisionState { get; set; } = DecisionStates.Defer;
    public string NewDecisionState { get; set; } = DecisionStates.Recommend;
    public string Reason { get; set; } = string.Empty;
    public string ActorUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
