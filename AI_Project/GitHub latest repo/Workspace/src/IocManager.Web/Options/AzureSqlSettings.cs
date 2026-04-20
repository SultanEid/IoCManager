namespace IocVmwareIngestion.Api.Options;

public sealed class AzureSqlSettings
{
    public const string SectionName = "AzureSql";

    public string ConnectionString { get; set; } = string.Empty;

    public bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(ConnectionString)
        && !ConnectionString.Contains("REPLACE_WITH_", StringComparison.OrdinalIgnoreCase);
}
