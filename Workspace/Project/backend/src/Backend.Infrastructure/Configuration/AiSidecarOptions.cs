namespace Backend.Infrastructure.Configuration;

public sealed class AiSidecarOptions
{
    public const string SectionName = "AiSidecar";

    public string BaseUrl { get; set; } = "http://localhost:8100";
    public string ScanAnalystPath { get; set; } = "/scan_analyst";
    public string ReportExtractionPath { get; set; } = "/extract_report";
    public string ScoreCasePath { get; set; } = "/score_case";
    public string ExplainCasePath { get; set; } = "/explain_case";
    public string RecommendActionPath { get; set; } = "/recommend_action";
    public string HistoricalLearningPath { get; set; } = "/historical_learning/query";
    public int TimeoutSeconds { get; set; } = 30;
    public string? ServiceToken { get; set; }
}
