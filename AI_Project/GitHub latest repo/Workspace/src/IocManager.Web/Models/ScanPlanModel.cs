namespace IocVmwareIngestion.Api.Models;

public sealed class ScanPlanModel
{
    public int PlanId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Status { get; init; }
    public DateTime? CreatedAtUtc { get; init; }
    public DateTime? ScheduledAtUtc { get; init; }
    public string? ScannerConfigJson { get; init; }
    public string? TargetScopeJson { get; init; }
}
