namespace IocVmwareIngestion.Api.Models;

public sealed class NetworkModel
{
    public int NetworkId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string SubNet { get; init; } = string.Empty;
    public int TargetCount { get; init; }
    public int OnlineTargetCount { get; init; }
}
