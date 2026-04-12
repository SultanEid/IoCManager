using Backend.Contracts.Cases;
using Backend.Contracts.Deployments;
using Backend.Contracts.Rules;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class DeploymentsEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public DeploymentsEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(Skip = "Deprecated CTI deployment surface; replaced by /api/v2/rules distribution and /api/v2/scanning in IoC Manager v2.")]
    public async Task CreateAndAdvanceDeploymentStatus_WorksForLead()
    {
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var caseResponse = await analystClient.PostAsJsonAsync("/api/cases", new
        {
            title = "Suspicious outbound DNS tunneling",
            summary = "Potential data exfiltration over DNS observed.",
            priority = "High",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });
        caseResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdCase = await caseResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        createdCase.Should().NotBeNull();

        var ruleResponse = await leadClient.PostAsJsonAsync("/api/rules", new
        {
            caseId = createdCase!.Id,
            name = "Detect DNS tunneling",
            ruleFamily = "sigma",
            ruleBody = "title: DNS Tunneling\ncondition: selection",
            version = "v1",
            actorUserId = "lead-1",
        });
        ruleResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdRule = await ruleResponse.Content.ReadFromJsonAsync<RuleResponse>(JsonOptions);
        createdRule.Should().NotBeNull();

        var deploymentResponse = await leadClient.PostAsJsonAsync("/api/deployments", new
        {
            caseId = createdCase.Id,
            ruleId = createdRule!.Id,
            targetEnvironment = "production",
            requestedByUserId = "lead-1",
        });
        deploymentResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var deployment = await deploymentResponse.Content.ReadFromJsonAsync<DeploymentResponse>(JsonOptions);
        deployment.Should().NotBeNull();
        deployment!.Status.Should().Be("Proposed");

        var approveResponse = await leadClient.PatchAsJsonAsync($"/api/deployments/{deployment.Id}/status", new
        {
            status = "Approved",
            actorUserId = "lead-1",
        });
        approveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var scheduleResponse = await leadClient.PatchAsJsonAsync($"/api/deployments/{deployment.Id}/status", new
        {
            status = "Scheduled",
            actorUserId = "lead-1",
        });
        scheduleResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var deployedResponse = await leadClient.PatchAsJsonAsync($"/api/deployments/{deployment.Id}/status", new
        {
            status = "Deployed",
            actorUserId = "lead-1",
        });
        deployedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var deployed = await deployedResponse.Content.ReadFromJsonAsync<DeploymentResponse>(JsonOptions);
        deployed.Should().NotBeNull();
        deployed!.Status.Should().Be("Deployed");
        deployed.DeployedAtUtc.Should().NotBeNull();

        var listResponse = await leadClient.GetAsync($"/api/deployments/case/{createdCase.Id}");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var deployments = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<DeploymentResponse>>(JsonOptions);
        deployments.Should().NotBeNull();
        deployments!.Should().ContainSingle(x => x.Id == deployment.Id && x.Status == "Deployed");
    }
}
