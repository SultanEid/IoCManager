using Microsoft.AspNetCore.Authorization;

namespace Backend.Api.Infrastructure;

public static class AuthorizationPolicies
{
    public const string AnalystAccess = nameof(AnalystAccess);
    public const string LeadAccess = nameof(LeadAccess);
    public const string AdminAccess = nameof(AdminAccess);

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(AnalystAccess, policy => policy.RequireRole("Analyst", "Lead", "Admin"));
        options.AddPolicy(LeadAccess, policy => policy.RequireRole("Lead", "Admin"));
        options.AddPolicy(AdminAccess, policy => policy.RequireRole("Admin"));
    }
}
