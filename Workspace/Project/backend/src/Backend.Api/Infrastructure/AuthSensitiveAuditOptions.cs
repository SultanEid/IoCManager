namespace Backend.Api.Infrastructure;

public sealed class AuthSensitiveAuditOptions
{
    public const string SectionName = "Audit:AuthSensitive";

    public bool SimulateFailure { get; set; }
}
