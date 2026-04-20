using Backend.Contracts.Admin;
using Backend.Contracts.Rules;
using Backend.Contracts.V2;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class AuthzAuditEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public AuthzAuditEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task SensitiveEndpoints_EnforceExpectedRoleMatrix()
    {
        using var anonymousClient = _factory.CreateAnonymousClient();
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        using var adminClient = _factory.CreateAuthenticatedClient("admin-1", "Admin");

        var anonymousNetwork = await anonymousClient.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest("Anonymous Network", "10.70.0.0/16", "anon", "anonymous"));
        anonymousNetwork.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var analystNetwork = await analystClient.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest("Analyst Network", "10.71.0.0/16", "analyst", "analyst-1"));
        analystNetwork.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadNetwork = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest("Lead Network", "10.72.0.0/16", "lead", "lead-1"));
        leadNetwork.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdNetwork = await leadNetwork.Content.ReadFromJsonAsync<NetworkResponse>(JsonOptions);
        createdNetwork.Should().NotBeNull();

        var leadSubnet = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/subnets",
            new CreateSubnetRequest(createdNetwork!.Id, "Lead Subnet", "10.72.1.0/24", "10.72.1.1", "lead-1"));
        leadSubnet.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdSubnet = await leadSubnet.Content.ReadFromJsonAsync<SubnetResponse>(JsonOptions);
        createdSubnet.Should().NotBeNull();

        var leadTargetServer = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/target-servers",
            new CreateTargetServerRequest(
                SubnetId: createdSubnet!.Id,
                Hostname: "authz-srv-01",
                IpAddress: "10.72.1.21",
                OperatingSystem: "Linux",
                Environment: "prod",
                ActorUserId: "lead-1"));
        leadTargetServer.StatusCode.Should().Be(HttpStatusCode.Created);
        var targetServer = await leadTargetServer.Content.ReadFromJsonAsync<TargetServerResponse>(JsonOptions);
        targetServer.Should().NotBeNull();

        var analystQueueDiscovery = await analystClient.PostAsJsonAsync(
            "/api/v2/infrastructure/discovery/runs",
            new CreateDiscoveryRunRequest(createdSubnet!.Id, "analyst-1", "10.72.1.10", "10.72.1.10"));
        analystQueueDiscovery.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var analystPromoteHost = await analystClient.PostAsJsonAsync(
            $"/api/v2/infrastructure/discovered-hosts/{Guid.NewGuid()}/promote",
            new PromoteDiscoveredHostRequest("host-1", "Windows", "lab", "analyst-1"));
        analystPromoteHost.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadPromoteHost = await leadClient.PostAsJsonAsync(
            $"/api/v2/infrastructure/discovered-hosts/{Guid.NewGuid()}/promote",
            new PromoteDiscoveredHostRequest("host-1", "Windows", "lab", "lead-1"));
        leadPromoteHost.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var analystCreatePlan = await analystClient.PostAsJsonAsync(
            "/api/v2/scanning/plans",
            new CreateScanPlanRequest(
                Name: "Authz Analyst Plan",
                Description: "Analyst mutation should be forbidden.",
                ScannerCapability: "Yara",
                RuleSelectionMode: "RuleScope",
                RuleScopeType: "Global",
                RuleScopeValue: null,
                CadenceType: "Manual",
                IntervalMinutes: null,
                RunAtHourUtc: null,
                RunAtMinuteUtc: null,
                WeeklyDayOfWeek: null,
                OperatorNotes: "authz",
                Status: "Active",
                ActorUserId: "analyst-1",
                TargetServerIds: [targetServer!.Id],
                RuleRevisionIds: []));
        analystCreatePlan.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadCreatePlan = await leadClient.PostAsJsonAsync(
            "/api/v2/scanning/plans",
            new CreateScanPlanRequest(
                Name: "Authz Lead Plan",
                Description: "Lead mutation should succeed.",
                ScannerCapability: "Yara",
                RuleSelectionMode: "RuleScope",
                RuleScopeType: "Global",
                RuleScopeValue: null,
                CadenceType: "Manual",
                IntervalMinutes: null,
                RunAtHourUtc: null,
                RunAtMinuteUtc: null,
                WeeklyDayOfWeek: null,
                OperatorNotes: "authz",
                Status: "Active",
                ActorUserId: "lead-1",
                TargetServerIds: [targetServer.Id],
                RuleRevisionIds: []));
        leadCreatePlan.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdScanPlan = await leadCreatePlan.Content.ReadFromJsonAsync<ScanPlanResponse>(JsonOptions);
        createdScanPlan.Should().NotBeNull();

        var analystRunPlan = await analystClient.PostAsJsonAsync(
            $"/api/v2/scanning/plans/{createdScanPlan!.Id}/run",
            new RunScanPlanRequest("analyst-1", "Manual"));
        analystRunPlan.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadRunPlan = await leadClient.PostAsJsonAsync(
            $"/api/v2/scanning/plans/{createdScanPlan.Id}/run",
            new RunScanPlanRequest("lead-1", "Manual"));
        leadRunPlan.StatusCode.Should().Be(HttpStatusCode.Created);

        var leadIdentityList = await leadClient.GetAsync("/api/v2/identity/users");
        leadIdentityList.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var adminIdentityList = await adminClient.GetAsync("/api/v2/identity/users");
        adminIdentityList.StatusCode.Should().Be(HttpStatusCode.OK);

        var leadCreateUser = await leadClient.PostAsJsonAsync(
            "/api/v2/identity/users",
            new CreateUserRequest("operator.user", "operator@local.test", "Operator User", "operatorpass123", ["Analyst"]));
        leadCreateUser.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var adminCreateUser = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/users",
            new CreateUserRequest("admin.created", "admin.created@local.test", "Created User", "createdpass123", ["Analyst"]));
        adminCreateUser.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdAlertResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/alerts",
            new CreateAlertRequest(
                "Authz Matrix Alert",
                "Used for report export policy verification.",
                "High",
                "lead-1",
                "Lead",
                DateTimeOffset.UtcNow,
                "lead-1"));
        createdAlertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdAlert = await createdAlertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        createdAlert.Should().NotBeNull();

        var analystCreateReport = await analystClient.PostAsJsonAsync(
            "/api/v2/reports",
            new CreateReportRequest(
                "Analyst Report",
                "Operational",
                "{\"ok\":true}",
                [createdAlert!.Id],
                "analyst-1"));
        analystCreateReport.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadCreateReport = await leadClient.PostAsJsonAsync(
            "/api/v2/reports",
            new CreateReportRequest(
                "Lead Report",
                "Operational",
                "{\"ok\":true}",
                [createdAlert.Id],
                "lead-1"));
        leadCreateReport.StatusCode.Should().Be(HttpStatusCode.Created);

        var leadRetention = await leadClient.PostAsJsonAsync(
            "/api/v2/retention/policies",
            new CreateRetentionPolicyRequest("Report", 30, 14, "lead-1"));
        leadRetention.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var adminRetention = await adminClient.PostAsJsonAsync(
            "/api/v2/retention/policies",
            new CreateRetentionPolicyRequest("Report", 30, 14, "admin-1"));
        adminRetention.StatusCode.Should().Be(HttpStatusCode.Created);

        var leadRunJob = await leadClient.PostAsJsonAsync(
            "/api/admin/jobs/scheduled-scan",
            new RunJobRequest("lead-1"));
        leadRunJob.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var adminRunJob = await adminClient.PostAsJsonAsync(
            "/api/admin/jobs/scheduled-scan",
            new RunJobRequest("admin-1"));
        adminRunJob.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var analystLegacyCreate = await analystClient.PostAsJsonAsync(
            "/api/rules",
            new CreateRuleRequest(
                Guid.NewGuid(),
                "Legacy Compatibility Rule",
                "sigma",
                "title: legacy-compatibility",
                "v1",
                "analyst-1"));
        analystLegacyCreate.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadLegacyCreate = await leadClient.PostAsJsonAsync(
            "/api/rules",
            new CreateRuleRequest(
                Guid.NewGuid(),
                "Legacy Compatibility Rule",
                "sigma",
                "title: legacy-compatibility",
                "v1",
                "lead-1"));
        leadLegacyCreate.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);

        var legacyRuleId = Guid.NewGuid();
        var analystLegacyDelete = await analystClient.DeleteAsync($"/api/rules/{legacyRuleId}?actorUserId=analyst-1");
        analystLegacyDelete.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var leadLegacyDelete = await leadClient.DeleteAsync($"/api/rules/{legacyRuleId}?actorUserId=lead-1");
        leadLegacyDelete.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SensitiveMutations_WriteAuditRecords()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        using var adminClient = _factory.CreateAuthenticatedClient("admin-1", "Admin");

        var networkResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest("Audit Network", "10.80.0.0/16", "audit", "lead-1"));
        networkResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createUserResponse = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/users",
            new CreateUserRequest("audit.user", "audit.user@local.test", "Audit User", "auditpass1234", ["Analyst"]));
        createUserResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var alertResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/alerts",
            new CreateAlertRequest(
                "Audit Alert",
                "Audit check alert",
                "High",
                "lead-1",
                "Lead",
                DateTimeOffset.UtcNow,
                "lead-1"));
        alertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var alert = await alertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        alert.Should().NotBeNull();

        var reportResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/reports",
            new CreateReportRequest("Audit Report", "Operational", "{\"audit\":true}", [alert!.Id], "lead-1"));
        reportResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var logs = dbContext.AuditLogsV2.ToList();

        logs.Should().Contain(x => x.ActionType == "infrastructure.network.create");
        logs.Should().Contain(x => x.ActionType == "identity.user.create");
        logs.Should().Contain(x => x.ActionType == "reports.export.create");
        logs.Should().OnlyContain(x => !string.IsNullOrWhiteSpace(x.ActorUserId));
    }

    [Fact]
    public async Task SensitiveMutations_DoNotFail_WhenAuditWriteFails()
    {
        await using var failingAuditFactory = new TestWebApplicationFactory(new Dictionary<string, string?>
        {
            ["Audit:AuthSensitive:SimulateFailure"] = "true",
        });
        await failingAuditFactory.ResetDatabaseAsync();

        using var leadClient = failingAuditFactory.CreateAuthenticatedClient("lead-1", "Lead");

        var networkResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest("Failure Tolerant Network", "10.81.0.0/16", "audit failure simulation", "lead-1"));

        networkResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        await using var scope = failingAuditFactory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        dbContext.AuditLogsV2.Should().BeEmpty();
    }
}
