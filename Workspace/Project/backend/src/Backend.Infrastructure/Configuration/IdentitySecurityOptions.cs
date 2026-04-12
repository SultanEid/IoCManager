namespace Backend.Infrastructure.Configuration;

public sealed class IdentitySecurityOptions
{
    public const string SectionName = "Auth:Identity";

    public bool LockoutAllowedForNewUsers { get; set; } = true;
    public int MaxFailedAccessAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
}
