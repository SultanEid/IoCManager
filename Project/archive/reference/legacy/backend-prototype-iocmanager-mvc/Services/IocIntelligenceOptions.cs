namespace IoCManager.Mvc.Services;

public sealed class IocIntelligenceOptions
{
    public string BaseUrl { get; set; } = "http://127.0.0.1:8100";
    public int TimeoutSeconds { get; set; } = 8;
    public bool EnableScoring { get; set; } = true;
}
