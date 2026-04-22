using Microsoft.AspNetCore.Authorization;

namespace Backend.Api.Infrastructure;

public static class AuthorizationPolicies
{
    public const string AnalystAccess = nameof(AnalystAccess);
    public const string LeadAccess = nameof(LeadAccess);
    public const string AdminAccess = nameof(AdminAccess);
    public const string AlertAccess = nameof(AlertAccess);
    public const string InfrastructureReadAccess = nameof(InfrastructureReadAccess);
    public const string WorkflowSettingsAccess = nameof(WorkflowSettingsAccess);
    public const string AuditAccess = nameof(AuditAccess);

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(AnalystAccess, policy => policy.RequireRole("Analyst", "Lead", "DEV"));
        options.AddPolicy(LeadAccess, policy => policy.RequireRole("Analyst", "Lead", "DEV"));
        options.AddPolicy(AdminAccess, policy => policy.RequireRole("Admin", "DEV"));
        options.AddPolicy(AlertAccess, policy => policy.RequireRole("IT", "Analyst", "Lead", "DEV"));
        options.AddPolicy(InfrastructureReadAccess, policy => policy.RequireRole("Analyst", "Lead", "Admin", "DEV"));
        options.AddPolicy(WorkflowSettingsAccess, policy => policy.RequireRole("Analyst", "Lead", "Admin", "DEV"));
        options.AddPolicy(AuditAccess, policy => policy.RequireRole("Analyst", "Lead", "Admin", "DEV"));
    }
}
