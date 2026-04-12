using Backend.Contracts.Cases;
using Backend.Contracts.Rules;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class RulesEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public RulesEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(Skip = "Deprecated CTI rule workflow surface; replaced by /api/v2/rules in IoC Manager v2.")]
    public async Task RulesCrudReviewValidateAndHistory_Works()
    {
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var caseResponse = await analystClient.PostAsJsonAsync("/api/cases", new
        {
            title = "Suspicious HTTP beaconing",
            summary = "Periodic callback pattern observed in egress flow.",
            priority = "High",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });

        caseResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdCase = await caseResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        createdCase.Should().NotBeNull();

        var createRuleResponse = await leadClient.PostAsJsonAsync("/api/rules", new
        {
            caseId = createdCase!.Id,
            name = "Beaconing Egress Pattern",
            ruleFamily = "sigma",
            ruleBody = "title: Beaconing Egress Pattern\nlogsource:\n  category: firewall\ndetection:\n  selection:\n    dst_port: 443\n  condition: selection",
            version = "v1",
            actorUserId = "lead-1",
            sourceOfOrigin = "Case Investigation",
            authorUserId = "lead-1",
            linkedAttackTechniques = new[] { "T1071.001" },
            linkedCampaign = "spring-beaconing",
            linkedMalwareFamily = "cobalt-strike",
            predictedCoverage = 0.73m,
            predictedFalsePositiveRisk = 0.19m,
            blastRadius = "Segment-A",
        });

        createRuleResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdRule = await createRuleResponse.Content.ReadFromJsonAsync<RuleResponse>(JsonOptions);
        createdRule.Should().NotBeNull();
        createdRule!.RuleFamily.Should().Be("sigma");
        createdRule.SourceOfOrigin.Should().Be("Case Investigation");

        var validateResponse = await analystClient.PostAsJsonAsync($"/api/rules/{createdRule.Id}/validate", new
        {
            actorUserId = "analyst-1",
            persistResult = true,
        });
        validateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var validation = await validateResponse.Content.ReadFromJsonAsync<RuleValidationResultResponse>(JsonOptions);
        validation.Should().NotBeNull();
        validation!.IsValid.Should().BeTrue();

        var reviewResponse = await leadClient.PatchAsJsonAsync($"/api/rules/{createdRule.Id}/review", new
        {
            decision = "approve",
            reviewerUserId = "lead-1",
            actorUserId = "lead-1",
            reason = "Rule lint passed and coverage is acceptable.",
        });
        reviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewedRule = await reviewResponse.Content.ReadFromJsonAsync<RuleResponse>(JsonOptions);
        reviewedRule.Should().NotBeNull();
        reviewedRule!.Status.Should().Be("Approved");
        reviewedRule.ReviewerUserId.Should().Be("lead-1");

        var updateResponse = await leadClient.PutAsJsonAsync($"/api/rules/{createdRule.Id}", new
        {
            name = "Beaconing Egress Pattern",
            ruleFamily = "sigma",
            ruleBody = "title: Beaconing Egress Pattern v2\nlogsource:\n  category: firewall\ndetection:\n  selection:\n    dst_port: 443\n    protocol: tcp\n  condition: selection",
            version = "v2",
            actorUserId = "lead-1",
            sourceOfOrigin = "Case Investigation",
            authorUserId = "lead-1",
            reviewerUserId = "lead-1",
            linkedAttackTechniques = new[] { "T1071.001", "T1041" },
            linkedCampaign = "spring-beaconing",
            linkedMalwareFamily = "cobalt-strike",
            predictedCoverage = 0.79m,
            predictedFalsePositiveRisk = 0.21m,
            blastRadius = "Segment-A",
            changeReason = "Added protocol qualifier for precision.",
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedRule = await updateResponse.Content.ReadFromJsonAsync<RuleResponse>(JsonOptions);
        updatedRule.Should().NotBeNull();
        updatedRule!.Version.Should().Be("v2");
        updatedRule.RevisionCount.Should().BeGreaterThan(1);

        var revisionsResponse = await analystClient.GetAsync($"/api/rules/{createdRule.Id}/revisions");
        revisionsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var revisions = await revisionsResponse.Content.ReadFromJsonAsync<IReadOnlyList<RuleRevisionResponse>>(JsonOptions);
        revisions.Should().NotBeNull();
        revisions!.Should().Contain(x => x.ChangeType == "created");
        revisions.Should().Contain(x => x.ChangeType == "updated");

        var deleteResponse = await leadClient.DeleteAsync($"/api/rules/{createdRule.Id}?actorUserId=lead-1");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getDeletedResponse = await analystClient.GetAsync($"/api/rules/{createdRule.Id}");
        getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
