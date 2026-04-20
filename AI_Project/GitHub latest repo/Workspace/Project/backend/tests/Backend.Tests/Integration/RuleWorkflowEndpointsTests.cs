using Backend.Contracts.Cases;
using Backend.Contracts.RuleLifecycle;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class RuleWorkflowEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public RuleWorkflowEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(Skip = "Deprecated CTI rule workflow surface; replaced by /api/v2/rules and /api/v2/scanning in IoC Manager v2.")]
    public async Task RuleWorkflow_ExecutesProposalReviewSimulationAndRollbackFlow()
    {
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var caseResponse = await analystClient.PostAsJsonAsync("/api/cases", new
        {
            title = "Suspicious powershell execution chain",
            summary = "Potential lateral movement behavior detected in server tier.",
            priority = "High",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });
        caseResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdCase = await caseResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        createdCase.Should().NotBeNull();

        var proposalResponse = await analystClient.PostAsJsonAsync("/api/rule-workflow/proposals", new
        {
            caseId = createdCase!.Id,
            proposalName = "Contain suspicious powershell chain",
            ruleFamily = "sigma",
            ruleBody = "title: Detect suspicious powershell chain\ncondition: selection",
            proposedVersion = "v1",
            proposedByUserId = "analyst-1",
            rationale = "High-confidence behavior should be staged with manual promotion.",
            policyRiskScore = 0.62m,
        });

        proposalResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<RuleProposalResponse>(JsonOptions);
        proposal.Should().NotBeNull();

        var reviewResponse = await leadClient.PatchAsJsonAsync($"/api/rule-workflow/proposals/{proposal!.Id}/review", new
        {
            decision = "accept",
            reviewerUserId = "lead-1",
            reviewReason = "Validated against policy constraints.",
            overrideReason = (string?)null,
        });
        reviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var simulationResponse = await analystClient.PostAsJsonAsync($"/api/rule-workflow/proposals/{proposal.Id}/simulate", new
        {
            targetEnvironment = "production",
            actorUserId = "analyst-1",
            notes = "Backtest indicates manageable noise profile.",
        });

        simulationResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var simulation = await simulationResponse.Content.ReadFromJsonAsync<RuleSimulationResultResponse>(JsonOptions);
        simulation.Should().NotBeNull();

        var advanceResponse = await leadClient.PatchAsJsonAsync($"/api/rule-workflow/rollouts/{simulation!.RolloutPlan.Id}/stage", new
        {
            stage = "canary",
            actorUserId = "lead-1",
            reason = "Start controlled rollout with strict observation window.",
            overrideReason = (string?)null,
        });
        advanceResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var observationResponse = await analystClient.PatchAsJsonAsync($"/api/rule-workflow/rollouts/{simulation.RolloutPlan.Id}/canary-observation", new
        {
            observedNoise = 0.41m,
            analystAcceptedCount = 6,
            analystReviewedCount = 10,
            actorUserId = "analyst-1",
        });
        observationResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var rollbackResponse = await leadClient.PostAsJsonAsync($"/api/rule-workflow/rollbacks/{simulation.RollbackPlan.Id}/trigger", new
        {
            actorUserId = "lead-1",
            reason = "Noise exceeded acceptable threshold in canary segment.",
            observedNoise = 0.46m,
        });
        rollbackResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var workflowResponse = await analystClient.GetAsync($"/api/rule-workflow/cases/{createdCase.Id}");
        workflowResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var workflow = await workflowResponse.Content.ReadFromJsonAsync<CaseRuleWorkflowResponse>(JsonOptions);
        workflow.Should().NotBeNull();
        workflow!.RolloutPlans.Should().ContainSingle(x => x.Id == simulation.RolloutPlan.Id && x.CurrentStage == "rollback");
        workflow.RollbackPlans.Should().ContainSingle(x => x.Id == simulation.RollbackPlan.Id && x.IsTriggered);
    }
}
