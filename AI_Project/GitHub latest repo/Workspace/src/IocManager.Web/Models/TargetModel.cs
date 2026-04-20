namespace IocVmwareIngestion.Api.Models;

public sealed class TargetModel
{
    public int TargetId { get; init; }
    public string? HostName { get; init; }
    public string IPAddress { get; init; } = string.Empty;
    public string? Status { get; init; }
    public string? TargetOsType { get; init; }
    public int? NetworkId { get; init; }
    public DateTime? LastSweep { get; init; }
    public int IocCount { get; init; }
    public int AlertCount { get; init; }

    public bool IsOnline => string.Equals(Status, "Online", StringComparison.OrdinalIgnoreCase);
}
