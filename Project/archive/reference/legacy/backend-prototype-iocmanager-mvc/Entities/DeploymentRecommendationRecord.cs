namespace IoCManager.Mvc.Entities;

public sealed class DeploymentRecommendationRecord
{
    public int Id { get; set; }
    public string RecommendationId { get; set; } = string.Empty;
    public string RuleFamily { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public bool Deploy { get; set; }
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool HumanApprovalRequired { get; set; } = true;
    public string Status { get; set; } = "proposed";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
