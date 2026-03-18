namespace IocVmwareIngestion.Api.Entities;

public sealed class ScanRun
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ScannerType { get; set; } = string.Empty;
    public string TargetKey { get; set; } = string.Empty;
    public string TargetAddress { get; set; } = string.Empty;
    public string TargetServer { get; set; } = string.Empty;
    public string TargetOsType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ExitCode { get; set; }
    public int FindingsCount { get; set; }
    public string CommandLine { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public string? RawStdOut { get; set; }
    public string? RawStdErr { get; set; }
    public int? ResultId { get; set; }
    public DateTime StartedUtc { get; set; }
    public DateTime? CompletedUtc { get; set; }
    public List<IocRecord> IocRecords { get; set; } = [];
}
