namespace Backend.Infrastructure.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Auth:Jwt";

    public string Issuer { get; set; } = "cti-platform";
    public string Audience { get; set; } = "cti-platform-clients";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenLifetimeMinutes { get; set; } = 60;
}
