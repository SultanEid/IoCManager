using Microsoft.AspNetCore.DataProtection;

namespace Backend.Api.Infrastructure;

public sealed class TargetServerConnectionSecretProtector
{
    private const string Purpose = "ioc-manager:v2:managed-server-connection-secret";
    private readonly IDataProtector _protector;

    public TargetServerConnectionSecretProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector(Purpose);
    }

    public string Protect(string secretPayload)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(secretPayload);
        return _protector.Protect(secretPayload.Trim());
    }

    public string Unprotect(string encryptedPayload)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedPayload);
        return _protector.Unprotect(encryptedPayload.Trim());
    }
}
