using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class RollbackPlan
{
    [Key]
    public string RollbackPlanId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public string RollbackConditionsJson { get; set; } = "{}";
    public string RollbackScope { get; set; } = "canary";
    public bool RestorePreviousVersion { get; set; } = true;
    public string NotificationTargetsJson { get; set; } = "[]";
}
