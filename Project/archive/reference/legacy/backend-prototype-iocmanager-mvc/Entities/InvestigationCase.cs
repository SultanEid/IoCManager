using System.ComponentModel.DataAnnotations;

namespace IoCManager.Mvc.Entities;

public sealed class InvestigationCase
{
    [Key]
    public string CaseId { get; set; } = Guid.NewGuid().ToString("D");
    public string Title { get; set; } = string.Empty;
    public string CaseType { get; set; } = "ioc";
    public string Priority { get; set; } = "medium";
    public string State { get; set; } = CaseStates.Open;
    public string OwnerUserId { get; set; } = string.Empty;
    public DateTime? SlaDueAt { get; set; }
    public string RiskBudgetId { get; set; } = "default";
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? ParentCaseId { get; set; }
    public string? MergedIntoCaseId { get; set; }
    public double StrategicValueScore { get; set; } = 0.5;
    public string PrimaryIocType { get; set; } = string.Empty;
    public string PrimaryIocValue { get; set; } = string.Empty;
}
