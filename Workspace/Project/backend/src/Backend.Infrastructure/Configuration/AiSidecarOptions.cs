namespace Backend.Infrastructure.Configuration;

public sealed class AiSidecarOptions
{
    public const string SectionName = "AiSidecar";

    public string BaseUrl { get; set; } = "http://localhost:8100";
    public string ReportExtractionPath { get; set; } = "/extract_report";
    public int TimeoutSeconds { get; set; } = 30;
}
