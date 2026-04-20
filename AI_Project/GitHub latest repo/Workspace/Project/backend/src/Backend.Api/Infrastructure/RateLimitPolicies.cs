namespace Backend.Api.Infrastructure;

public static class RateLimitPolicies
{
    public const string AuthToken = nameof(AuthToken);
    public const string Write = nameof(Write);
    public const string Read = nameof(Read);
}
