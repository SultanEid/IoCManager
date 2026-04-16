namespace Backend.Infrastructure.Configuration;

public sealed class SqlUserTableAuthOptions
{
    public const string SectionName = "Auth:SqlUserTable";

    public bool Enabled { get; set; }
    public bool AcceptPreHashedPassword { get; set; } = true;
    public string TableName { get; set; } = "[dbo].[User]";
}
