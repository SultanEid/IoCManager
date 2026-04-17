using Backend.Api.Infrastructure;
using Backend.Contracts.Auth;
using Backend.Contracts.Security;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Security;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Http.Json;

namespace Backend.Tests.Integration;

public sealed class AuthSecurityEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory;

    public AuthSecurityEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task TokenEndpoint_LocksOutAfterConfiguredFailures()
    {
        const string userName = "lockout-user";
        const string correctPassword = "Detective123!";

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var createResult = await userManager.CreateAsync(new ApplicationUser
            {
                UserName = userName,
                Email = "lockout-user@local.test",
                DisplayName = "Lockout User",
                LockoutEnabled = true,
            }, correctPassword);

            createResult.Succeeded.Should().BeTrue();
        }

        using var client = _factory.CreateClient();
        await using var optionsScope = _factory.Services.CreateAsyncScope();
        var identityOptions = optionsScope.ServiceProvider.GetRequiredService<IOptions<IdentitySecurityOptions>>().Value;

        for (var i = 0; i < identityOptions.MaxFailedAccessAttempts; i++)
        {
            var failedResponse = await RequestTokenAsync(
                client,
                new TokenRequest(userName, "WrongPassword!"),
                $"198.51.100.{i + 10}");

            failedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        var lockedOutResponse = await RequestTokenAsync(
            client,
            new TokenRequest(userName, correctPassword),
            "198.51.100.99");
        lockedOutResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await using var verifyScope = _factory.Services.CreateAsyncScope();
        var verifyUserManager = verifyScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var lockedUser = await verifyUserManager.FindByNameAsync(userName);

        lockedUser.Should().NotBeNull();
        (await verifyUserManager.IsLockedOutAsync(lockedUser!)).Should().BeTrue();
    }

    [Fact]
    public async Task TokenEndpoint_ReturnsTooManyRequests_WhenRateLimitExceeded()
    {
        await using var factory = new TestWebApplicationFactory(new Dictionary<string, string?>
        {
            ["RateLimiting:AuthToken:PermitLimit"] = "2",
            ["RateLimiting:AuthToken:WindowSeconds"] = "60",
            ["RateLimiting:AuthToken:QueueLimit"] = "0",
        });

        await factory.ResetDatabaseAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var options = scope.ServiceProvider.GetRequiredService<IOptions<ApiRateLimitingOptions>>().Value;
            options.AuthToken.PermitLimit.Should().Be(2);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });

        var firstResponse = await RequestTokenAsync(client, new TokenRequest("nobody", "bad"), "203.0.113.1");
        var secondResponse = await RequestTokenAsync(client, new TokenRequest("nobody", "bad"), "203.0.113.1");
        var thirdResponse = await RequestTokenAsync(client, new TokenRequest("nobody", "bad"), "203.0.113.1");

        firstResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        secondResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        thirdResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task AntiforgeryTokenEndpoint_ReturnsTokenAndCookie()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/security/antiforgery-token");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<AntiforgeryTokenResponse>();
        payload.Should().NotBeNull();
        payload!.HeaderName.Should().NotBeNullOrWhiteSpace();
        payload.RequestToken.Should().NotBeNullOrWhiteSpace();

        response.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeTrue();
        cookies.Should().NotBeNull();
        cookies!.Should().Contain(cookie => cookie.Contains("ioc.manager.csrf", StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<HttpResponseMessage> RequestTokenAsync(
        HttpClient client,
        TokenRequest request,
        string forwardedFor)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, "/api/auth/token")
        {
            Content = JsonContent.Create(request),
        };
        message.Headers.Add("X-Forwarded-For", forwardedFor);

        return await client.SendAsync(message);
    }
}
