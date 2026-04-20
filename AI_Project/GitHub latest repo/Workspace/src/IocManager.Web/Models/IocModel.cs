namespace IocVmwareIngestion.Api.Models;

public sealed class IocModel
{
    public Guid? Id { get; init; }
    public int? ResultId { get; init; }
    public int? FileId { get; init; }
    public DateTime? TimestampUtc { get; init; }
    public string ScannerType { get; init; } = string.Empty;
    public string TargetServer { get; init; } = string.Empty;
    public string? TargetOsType { get; init; }
    public string RuleName { get; init; } = string.Empty;
    public string? Severity { get; init; }
    public string? IndicatorType { get; init; }
    public string? IndicatorValue { get; init; }
    public string? FilePath { get; init; }
    public string? FileHash { get; init; }
    public string? LogSource { get; init; }
    public string? CommandLine { get; init; }
    public string? SourceIp { get; init; }
    public string? DestinationIp { get; init; }
    public string? Protocol { get; init; }
    public long? FlowId { get; init; }
    public string? RawPayloadJson { get; init; }
}
