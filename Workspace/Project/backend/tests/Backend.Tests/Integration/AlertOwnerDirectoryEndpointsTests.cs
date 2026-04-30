using Backend.Contracts.V2;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class AlertOwnerDirectoryEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public async Task SettingsList_WhenDatabaseEmpty_ReturnsConfiguredFallbackOwners()
    {
        using var factory = CreateFactory();
        using var adminClient = factory.CreateAuthenticatedClient("admin-1", "Admin");
        using var leadClient = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var directory = await adminClient.GetFromJsonAsync<IReadOnlyList<AlertOwnerDirectoryResponse>>(
            "/api/v2/settings/alert-owners",
            JsonOptions);
        var assignable = await leadClient.GetFromJsonAsync<IReadOnlyList<AlertOwnerResponse>>(
            "/api/v2/alerts/owners",
            JsonOptions);

        directory.Should().NotBeNull();
        directory!.Should().Contain(x => x.Key == "soc" && x.Source == "configuration" && x.IsEnabled);
        assignable.Should().NotBeNull();
        assignable!.Should().Contain(x => x.Key == "soc" && x.Email == "soc@local.test");
    }

    [Fact]
    public async Task DatabaseOwners_OverrideFallbackAndDisabledOwnersCannotBeAssigned()
    {
        using var factory = CreateFactory();
        using var adminClient = factory.CreateAuthenticatedClient("admin-1", "Admin");
        using var leadClient = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var createResponse = await adminClient.PostAsJsonAsync("/api/v2/settings/alert-owners", new CreateAlertOwnerDirectoryRequest(
            Key: "incident-response",
            DisplayName: "Incident Response",
            Email: "ir@local.test",
            IsEnabled: true,
            ActorUserId: "admin-1"));

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var assignable = await leadClient.GetFromJsonAsync<IReadOnlyList<AlertOwnerResponse>>("/api/v2/alerts/owners", JsonOptions);
        assignable.Should().NotBeNull();
        assignable!.Should().Contain(x => x.Key == "incident-response");
        assignable.Should().Contain(x => x.Key == "soc");

        var disableResponse = await adminClient.PatchAsJsonAsync("/api/v2/settings/alert-owners/incident-response", new UpdateAlertOwnerDirectoryRequest(
            DisplayName: "Incident Response",
            Email: "ir@local.test",
            IsEnabled: false,
            ActorUserId: "admin-1"));
        disableResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var disabledAssignable = await leadClient.GetFromJsonAsync<IReadOnlyList<AlertOwnerResponse>>("/api/v2/alerts/owners", JsonOptions);
        disabledAssignable.Should().NotBeNull();
        disabledAssignable!.Should().NotContain(x => x.Key == "incident-response");

        var createAlertResponse = await leadClient.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Disabled owner alert",
            Summary: "Should not allow disabled owner assignment.",
            Severity: "High",
            OwnerUserId: "incident-response",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        createAlertResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignedAlert_KeepsHistoricalOwnerMetadataAfterDirectoryUpdate()
    {
        using var factory = CreateFactory();
        using var adminClient = factory.CreateAuthenticatedClient("admin-1", "Admin");
        using var leadClient = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var createOwnerResponse = await adminClient.PostAsJsonAsync("/api/v2/settings/alert-owners", new CreateAlertOwnerDirectoryRequest(
            Key: "threat-hunt",
            DisplayName: "Threat Hunt",
            Email: "hunt@local.test",
            IsEnabled: true,
            ActorUserId: "admin-1"));
        createOwnerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createAlertResponse = await leadClient.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Historical owner alert",
            Summary: "Alert should retain owner metadata.",
            Severity: "High",
            OwnerUserId: "threat-hunt",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        createAlertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdAlert = await createAlertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        createdAlert.Should().NotBeNull();

        var updateOwnerResponse = await adminClient.PatchAsJsonAsync("/api/v2/settings/alert-owners/threat-hunt", new UpdateAlertOwnerDirectoryRequest(
            DisplayName: "Threat Hunting Team",
            Email: "hunt-updated@local.test",
            IsEnabled: true,
            ActorUserId: "admin-1"));
        updateOwnerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await leadClient.GetFromJsonAsync<AlertDetailResponse>(
            $"/api/v2/alerts/{createdAlert!.Id:D}",
            JsonOptions);
        detail.Should().NotBeNull();
        detail!.OwnerDisplayName.Should().Be("Threat Hunt");
        detail.OwnerEmail.Should().Be("hunt@local.test");
    }

    [Theory]
    [InlineData("SOC", "Security Operations", "soc2@local.test", HttpStatusCode.BadRequest)]
    [InlineData("soc", "Security Operations", "soc2@local.test", HttpStatusCode.Conflict)]
    [InlineData("new-owner", "", "owner@local.test", HttpStatusCode.BadRequest)]
    [InlineData("new-owner", "Owner", "not-an-email", HttpStatusCode.BadRequest)]
    public async Task SettingsValidation_ReturnsExpectedStatus(
        string key,
        string displayName,
        string email,
        HttpStatusCode expectedStatus)
    {
        using var factory = CreateFactory();
        using var adminClient = factory.CreateAuthenticatedClient("admin-1", "Admin");

        var response = await adminClient.PostAsJsonAsync("/api/v2/settings/alert-owners", new CreateAlertOwnerDirectoryRequest(
            Key: key,
            DisplayName: displayName,
            Email: email,
            IsEnabled: true,
            ActorUserId: "admin-1"));

        response.StatusCode.Should().Be(expectedStatus);
    }

    private static TestWebApplicationFactory CreateFactory()
    {
        return new TestWebApplicationFactory(new Dictionary<string, string?>
        {
            ["Alerts:Owners:0:Key"] = "soc",
            ["Alerts:Owners:0:DisplayName"] = "Security Operations Center",
            ["Alerts:Owners:0:Email"] = "soc@local.test",
            ["Alerts:Owners:1:Key"] = "forensics",
            ["Alerts:Owners:1:DisplayName"] = "Digital Forensics",
            ["Alerts:Owners:1:Email"] = "forensics@local.test",
            ["Notifications:Smtp:Enabled"] = "false",
            ["Notifications:Smtp:Port"] = "25",
        });
    }
}
