namespace IocVmwareIngestion.Api.Models;

public sealed class ReportModel
{
    public int ReportId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string ReportType { get; init; } = string.Empty;
    public DateTime? GeneratedAtUtc { get; init; }
    public int? GeneratedByUserId { get; init; }
    public string? ParametersJson { get; init; }
    public int? ResultId { get; init; }
    public Guid? IocId { get; init; }
    public string? Summary { get; init; }
}
