namespace Backend.Api.Infrastructure;

public sealed class ApiRateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public ApiRateLimitPolicyOptions AuthToken { get; set; } = new();
    public ApiRateLimitPolicyOptions Write { get; set; } = new()
    {
        PermitLimit = 30,
    };
    public ApiRateLimitPolicyOptions Read { get; set; } = new()
    {
        PermitLimit = 120,
    };
}

public sealed class ApiRateLimitPolicyOptions
{
    public int PermitLimit { get; set; } = 5;
    public int WindowSeconds { get; set; } = 60;
    public int QueueLimit { get; set; }
}
