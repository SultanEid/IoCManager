using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Headers;

namespace Backend.Tests.Integration;

public static class AuthenticatedClientExtensions
{
    public static HttpClient CreateAnonymousClient(this WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Add(TestAuthHandler.AnonymousHeader, "true");
        return client;
    }

    public static HttpClient CreateAuthenticatedClient(
        this WebApplicationFactory<Program> factory,
        string userId = "test-analyst",
        params string[] roles)
    {
        var resolvedRoles = roles.Length == 0 ? ["Analyst"] : roles;
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId);
        client.DefaultRequestHeaders.Add(TestAuthHandler.RolesHeader, string.Join(",", resolvedRoles));
        return client;
    }
}
