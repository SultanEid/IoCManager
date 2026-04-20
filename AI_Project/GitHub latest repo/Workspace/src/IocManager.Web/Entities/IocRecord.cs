namespace IocVmwareIngestion.Api.Entities;

public sealed class IocRecord
{
    public Guid? DatabaseId { get; set; }
    public string IndicatorType { get; set; } = string.Empty;
    public string IndicatorValue { get; set; } = string.Empty;
    public string? RuleName { get; set; }
    public string? Severity { get; set; }
    public string? SourceIp { get; set; }
    public string? DestinationIp { get; set; }
    public string? Protocol { get; set; }
    public string? CommandLine { get; set; }
    public string? LogSource { get; set; }
    public string? FlowId { get; set; }
    public string? FileHash { get; set; }
    public DateTime? ObservedUtc { get; set; }
    public string RawPayloadJson { get; set; } = string.Empty;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
