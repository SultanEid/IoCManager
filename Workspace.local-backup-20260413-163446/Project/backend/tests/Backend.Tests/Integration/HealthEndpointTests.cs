using FluentAssertions;
using System.Net;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class HealthEndpointTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory;

    public HealthEndpointTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task HealthInfo_ReturnsOk()
    {
        using var client = _factory.CreateAuthenticatedClient();
        var response = await client.GetAsync("/api/health/info");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task LivenessAndReadiness_ReturnOk()
    {
        using var client = _factory.CreateAuthenticatedClient();

        var liveResponse = await client.GetAsync("/health/live");
        liveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var readyResponse = await client.GetAsync("/health/ready");
        readyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Readiness_ReturnsStableComponentPayload_WhenSidecarIsUnavailable()
    {
        using var sidecarDownFactory = new TestWebApplicationFactory(new Dictionary<string, string?>
        {
            ["AiSidecar:BaseUrl"] = "http://127.0.0.1:65534",
        });
        await sidecarDownFactory.ResetDatabaseAsync();
        using var client = sidecarDownFactory.CreateAuthenticatedClient();

        var readyResponse = await client.GetAsync("/health/ready");
        readyResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await readyResponse.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        root.TryGetProperty("status", out var statusNode).Should().BeTrue();
        statusNode.GetString().Should().Be("ready");

        root.TryGetProperty("components", out var componentsNode).Should().BeTrue();
        componentsNode.ValueKind.Should().Be(JsonValueKind.Array);

        var components = componentsNode.EnumerateArray().ToArray();
        components.Should().ContainSingle(component =>
            component.GetProperty("name").GetString() == "database"
            && component.GetProperty("status").GetString() == "healthy"
            && component.GetProperty("required").GetBoolean()
            && component.GetProperty("message").ValueKind == JsonValueKind.String);

        components.Should().ContainSingle(component =>
            component.GetProperty("name").GetString() == "ai_sidecar"
            && component.GetProperty("status").GetString() == "degraded"
            && !component.GetProperty("required").GetBoolean()
            && component.GetProperty("message").ValueKind == JsonValueKind.String);
    }
}
