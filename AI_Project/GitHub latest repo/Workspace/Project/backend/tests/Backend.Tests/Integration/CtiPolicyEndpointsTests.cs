using Backend.Contracts.CtiPolicy;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class CtiPolicyEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public CtiPolicyEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task EvaluatePolicy_ReturnsDeterministicOutcome_ForAnalyst()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");

        var response = await client.PostAsJsonAsync("/api/cti/policy/evaluate", new
        {
            caseId = Guid.NewGuid(),
            maliciousnessScore = 0.82m,
            actionabilityScore = 0.74m,
            deployabilityScore = 0.71m,
            decayScore = 0.20m,
            uncertaintyScore = 0.24m,
            blastRadiusScore = 0.32m,
            assetCriticality = "Medium",
            evidenceFreshness = "Fresh",
            sourceTrust = 0.86m,
            evidenceConflict = "Low",
            currentRolloutStage = "None",
            actorUserId = "analyst-1",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<CtiPolicyEvaluationResponse>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.DecisionState.Should().NotBeNullOrWhiteSpace();
        payload.RecommendedAction.Should().NotBeNullOrWhiteSpace();
        payload.ApprovalTierRequired.Should().NotBeNullOrWhiteSpace();
        payload.RolloutMode.Should().NotBeNullOrWhiteSpace();
        payload.RollbackRequirement.Should().NotBeNullOrWhiteSpace();
        payload.NextBestEvidenceType.Should().NotBeNullOrWhiteSpace();
        payload.NextBestEvidenceRequest.Should().NotBeNullOrWhiteSpace();
        payload.NextBestEvidenceRationale.Should().NotBeNullOrWhiteSpace();
        payload.GuardrailNotes.Should().NotBeEmpty();
    }

    [Fact]
    public async Task EvaluatePolicy_RejectsInsufficientRoleRequests()
    {
        using var viewerClient = _factory.CreateAuthenticatedClient("viewer-1", "Viewer");

        var body = new
        {
            caseId = Guid.NewGuid(),
            maliciousnessScore = 0.6m,
            actionabilityScore = 0.6m,
            deployabilityScore = 0.6m,
            decayScore = 0.3m,
            uncertaintyScore = 0.2m,
            blastRadiusScore = 0.2m,
            assetCriticality = "Low",
            evidenceFreshness = "Fresh",
            sourceTrust = 0.8m,
            evidenceConflict = "Low",
            currentRolloutStage = "None",
            actorUserId = "analyst-1",
        };

        var forbidden = await viewerClient.PostAsJsonAsync("/api/cti/policy/evaluate", body);
        forbidden.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task EvaluatePolicy_ReturnsBadRequest_WhenInputIsInvalid()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");

        var response = await client.PostAsJsonAsync("/api/cti/policy/evaluate", new
        {
            caseId = Guid.Empty,
            maliciousnessScore = 1.20m,
            actionabilityScore = 0.50m,
            deployabilityScore = 0.50m,
            decayScore = 0.10m,
            uncertaintyScore = 0.10m,
            blastRadiusScore = 0.10m,
            assetCriticality = "Unknown",
            evidenceFreshness = "Fresh",
            sourceTrust = 0.80m,
            evidenceConflict = "Low",
            currentRolloutStage = "Invalid",
            actorUserId = "",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
