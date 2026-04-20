using Backend.Contracts.Cases;
using Backend.Contracts.Decisions;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class DecisionApprovalEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public DecisionApprovalEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(Skip = "Deprecated CTI decision approval surface; replaced by /api/v2/alerts lifecycle in IoC Manager v2.")]
    public async Task FinalizeDecision_RequiresLeadRole_AndUpdatesCaseStatus()
    {
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var caseResponse = await analystClient.PostAsJsonAsync("/api/cases", new
        {
            title = "High-confidence exfiltration indicator",
            summary = "Outbound data transfer to suspicious infrastructure.",
            priority = "Critical",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });

        caseResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdCase = await caseResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        createdCase.Should().NotBeNull();

        var decisionResponse = await analystClient.PostAsJsonAsync("/api/decisions", new
        {
            caseId = createdCase!.Id,
            recommendedAction = "contain_and_monitor",
            approvalTierRequired = "Lead",
            policyVersion = "policy-v1",
            modelVersion = "model-v1",
            reasoning = "Signals are consistent across independent sources.",
            actorUserId = "analyst-1",
        });

        decisionResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdDecision = await decisionResponse.Content.ReadFromJsonAsync<DecisionResponse>(JsonOptions);
        createdDecision.Should().NotBeNull();
        createdDecision!.State.Should().Be("Proposed");

        var forbiddenFinalize = await analystClient.PatchAsJsonAsync($"/api/decisions/{createdDecision.Id}/finalize", new
        {
            outcome = "Approved",
            actorUserId = "analyst-1",
        });

        forbiddenFinalize.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var finalizeResponse = await leadClient.PatchAsJsonAsync($"/api/decisions/{createdDecision.Id}/finalize", new
        {
            outcome = "Approved",
            actorUserId = "lead-1",
        });

        finalizeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var finalized = await finalizeResponse.Content.ReadFromJsonAsync<DecisionResponse>(JsonOptions);
        finalized.Should().NotBeNull();
        finalized!.State.Should().Be("Approved");
        finalized.ApprovedByUserId.Should().Be("lead-1");

        var caseGetResponse = await analystClient.GetAsync($"/api/cases/{createdCase.Id}");
        caseGetResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedCase = await caseGetResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        updatedCase.Should().NotBeNull();
        updatedCase!.Status.Should().Be("Approved");
    }
}
