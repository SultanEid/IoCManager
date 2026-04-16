namespace Backend.Infrastructure.Configuration;

public sealed class LegacyScanPipelineOptions
{
    public const string SectionName = "LegacyScanPipeline";

    public string TempRuleRootDirectory { get; set; } = Path.Combine(Path.GetTempPath(), "ioc-manager-legacy-pipeline");

    public string ReportsDirectory { get; set; } = Path.Combine(AppContext.BaseDirectory, "reports");

    public string DataProtectionKeyRingDirectory { get; set; } = "C:/Tools/IoCManager/data-protection-keys";

    public int MaxTargetsPerExecution { get; set; } = 25;

    public int MaxParallelTargetExecutions { get; set; } = 2;

    public Dictionary<string, string[]> RulePathPresets { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
