namespace Backend.Infrastructure.Configuration;

public sealed class LegacyAzureCompatibilityOptions
{
    public const string SectionName = "LegacyAzureCompatibility";

    public bool Enabled { get; set; }

    public string ConnectionStringName { get; set; } = "Main";
}
