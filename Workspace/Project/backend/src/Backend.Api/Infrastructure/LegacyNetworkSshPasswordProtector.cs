using Microsoft.AspNetCore.DataProtection;

namespace Backend.Api.Infrastructure;

public sealed class LegacyNetworkSshPasswordProtector
{
    private const string Purpose = "ioc-manager:v2:legacy-network-ssh-password";
    private readonly IDataProtector _protector;

    public LegacyNetworkSshPasswordProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector(Purpose);
    }

    public string Protect(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        return _protector.Protect(password);
    }

    public string Unprotect(string encryptedPassword)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedPassword);
        return _protector.Unprotect(encryptedPassword);
    }
}
