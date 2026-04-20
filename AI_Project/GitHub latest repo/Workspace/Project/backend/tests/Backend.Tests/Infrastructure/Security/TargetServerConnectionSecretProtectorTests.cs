using Backend.Api.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Infrastructure.Security;

public sealed class TargetServerConnectionSecretProtectorTests
{
    [Fact]
    public void ProtectThenUnprotect_RoundTripsSecretPayload()
    {
        var provider = BuildProvider();
        var protector = new TargetServerConnectionSecretProtector(provider);
        const string payload = "{\"password\":\"super-secret\",\"token\":\"abc\"}";

        var encrypted = protector.Protect(payload);
        var decrypted = protector.Unprotect(encrypted);

        encrypted.Should().NotBe(payload);
        decrypted.Should().Be(payload);
    }

    [Fact]
    public void Protect_RejectsEmptyPayload()
    {
        var provider = BuildProvider();
        var protector = new TargetServerConnectionSecretProtector(provider);

        var act = () => protector.Protect("  ");
        act.Should().Throw<ArgumentException>();
    }

    private static IDataProtectionProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddDataProtection();
        return services.BuildServiceProvider().GetRequiredService<IDataProtectionProvider>();
    }
}
