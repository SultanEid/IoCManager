namespace Backend.Infrastructure.Configuration;

public sealed class SqlUserTableAuthOptions
{
    public const string SectionName = "Auth:SqlUserTable";

    public bool Enabled { get; set; }
    public bool AcceptPreHashedPassword { get; set; } = true;
    public string TableName { get; set; } = "[dbo].[User]";
    public bool DevelopmentFallbackEnabled { get; set; }
    public string DevelopmentFallbackUserName { get; set; } = "team";
    public string DevelopmentFallbackEmail { get; set; } = "team@local.test";
    public string DevelopmentFallbackPassword { get; set; } = "team123";
    public string DevelopmentFallbackRole { get; set; } = "Admin";
}
