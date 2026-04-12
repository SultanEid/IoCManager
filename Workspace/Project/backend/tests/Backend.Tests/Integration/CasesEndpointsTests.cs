using Backend.Contracts.Cases;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class CasesEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public CasesEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task CreateGetListAndUpdateStatus_WorkForAnalyst()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");

        var createResponse = await client.PostAsJsonAsync("/api/cases", new
        {
            title = "Possible command-and-control callback",
            summary = "Beaconing pattern observed from critical endpoint.",
            priority = "High",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        created.Should().NotBeNull();
        created!.Status.Should().Be("Open");

        var getResponse = await client.GetAsync($"/api/cases/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        fetched.Should().NotBeNull();
        fetched!.Id.Should().Be(created.Id);

        var list = await client.GetFromJsonAsync<IReadOnlyList<CaseResponse>>("/api/cases", JsonOptions);
        list.Should().NotBeNull();
        list!.Should().ContainSingle(x => x.Id == created.Id);

        var updateResponse = await client.PatchAsJsonAsync($"/api/cases/{created.Id}/status", new
        {
            status = "InReview",
            actorUserId = "analyst-1",
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        updated.Should().NotBeNull();
        updated!.Status.Should().Be("InReview");
    }
}
