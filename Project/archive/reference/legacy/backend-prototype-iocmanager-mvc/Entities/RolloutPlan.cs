using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class RolloutPlan
{
    [Key]
    public string RolloutPlanId { get; set; } = Guid.NewGuid().ToString("D");
    public string CaseId { get; set; } = string.Empty;
    public int ShadowWindowHours { get; set; } = 24;
    public double CanaryScopePercent { get; set; } = 10;
    public string PromotionThresholdsJson { get; set; } = "{}";
    public DateTime? ExpiryAt { get; set; }
    public string SuccessCriteriaJson { get; set; } = "{}";
}
