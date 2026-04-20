namespace Backend.Infrastructure.Configuration;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionStringName { get; set; } = "Main";
    public bool ApplyMigrationsOnStartup { get; set; }
}
