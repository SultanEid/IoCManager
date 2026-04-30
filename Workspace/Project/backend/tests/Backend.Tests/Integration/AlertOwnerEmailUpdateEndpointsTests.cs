using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class AlertOwnerEmailUpdateEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public async Task OwnerAssignmentAndManualEmailUpdate_WorkForConfiguredDepartmentOwner()
    {
        var fakeSender = new TestAlertEmailSender();
        using var factory = CreateFactory(fakeSender);
        using var client = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var owners = await client.GetFromJsonAsync<IReadOnlyList<AlertOwnerResponse>>("/api/v2/alerts/owners", JsonOptions);
        owners.Should().NotBeNull();
        owners!.Should().Contain(x => x.Key == "soc" && x.Email == "soc@local.test");

        var createResponse = await client.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Department routed alert",
            Summary: "Alert that needs owner email routing.",
            Severity: "High",
            OwnerUserId: "soc",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        created.Should().NotBeNull();
        created!.OwnerUserId.Should().Be("soc");
        created.OwnerDisplayName.Should().Be("Security Operations Center");
        created.OwnerEmail.Should().Be("soc@local.test");

        var ownerResponse = await client.PatchAsJsonAsync($"/api/v2/alerts/{created.Id:D}/owner", new UpdateAlertOwnerRequest(
            OwnerUserId: "forensics",
            ActorUserId: "lead-1"));

        ownerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reassigned = await ownerResponse.Content.ReadFromJsonAsync<AlertDetailResponse>(JsonOptions);
        reassigned.Should().NotBeNull();
        reassigned!.OwnerUserId.Should().Be("forensics");
        reassigned.OwnerEmail.Should().Be("forensics@local.test");

        var sendResponse = await client.PostAsJsonAsync($"/api/v2/alerts/{created.Id:D}/email-updates", new SendAlertEmailUpdateRequest(
            Subject: "Containment update",
            Body: "Please review the linked IOC evidence and confirm containment owner.",
            CcEmails: ["lead@local.test"],
            ActorUserId: "lead-1"));

        sendResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var sent = await sendResponse.Content.ReadFromJsonAsync<AlertEmailUpdateResponse>(JsonOptions);
        sent.Should().NotBeNull();
        sent!.DeliveryStatus.Should().Be("Sent");
        sent.ToEmail.Should().Be("forensics@local.test");
        sent.CcEmails.Should().ContainSingle("lead@local.test");
        fakeSender.SentMessages.Should().ContainSingle(x => x.ToEmail == "forensics@local.test");

        var history = await client.GetFromJsonAsync<IReadOnlyList<AlertEmailUpdateResponse>>(
            $"/api/v2/alerts/{created.Id:D}/email-updates",
            JsonOptions);
        history.Should().NotBeNull();
        history!.Should().ContainSingle(x => x.Id == sent.Id);
    }

    [Fact]
    public async Task SendEmailUpdate_WhenSmtpNotConfigured_StoresNotConfiguredHistory()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var created = await CreateAlertAsync(client, "soc");

        var sendResponse = await client.PostAsJsonAsync($"/api/v2/alerts/{created.Id:D}/email-updates", new SendAlertEmailUpdateRequest(
            Subject: "Manual update",
            Body: "SMTP is intentionally disabled in this test.",
            CcEmails: [],
            ActorUserId: "lead-1"));

        sendResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var update = await sendResponse.Content.ReadFromJsonAsync<AlertEmailUpdateResponse>(JsonOptions);
        update.Should().NotBeNull();
        update!.DeliveryStatus.Should().Be("NotConfigured");
        update.FailureDetail.Should().Contain("SMTP");
    }

    [Fact]
    public async Task OwnerAndEmailValidation_ReturnBadRequestForInvalidInputs()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateAuthenticatedClient("lead-1", "Lead");

        var invalidOwnerResponse = await client.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Invalid owner alert",
            Summary: "Should fail owner validation.",
            Severity: "High",
            OwnerUserId: "unknown-owner",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        invalidOwnerResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var unassigned = await CreateAlertAsync(client, "unassigned");
        var missingOwnerEmailResponse = await client.PostAsJsonAsync($"/api/v2/alerts/{unassigned.Id:D}/email-updates", new SendAlertEmailUpdateRequest(
            Subject: "No owner",
            Body: "This should not send.",
            CcEmails: [],
            ActorUserId: "lead-1"));
        missingOwnerEmailResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var assigned = await CreateAlertAsync(client, "soc");
        var invalidCcResponse = await client.PostAsJsonAsync($"/api/v2/alerts/{assigned.Id:D}/email-updates", new SendAlertEmailUpdateRequest(
            Subject: "Bad cc",
            Body: "This should not send.",
            CcEmails: ["not-an-email"],
            ActorUserId: "lead-1"));
        invalidCcResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static TestWebApplicationFactory CreateFactory(TestAlertEmailSender? sender = null)
    {
        var overrides = new Dictionary<string, string?>
        {
            ["Alerts:Owners:0:Key"] = "soc",
            ["Alerts:Owners:0:DisplayName"] = "Security Operations Center",
            ["Alerts:Owners:0:Email"] = "soc@local.test",
            ["Alerts:Owners:1:Key"] = "forensics",
            ["Alerts:Owners:1:DisplayName"] = "Digital Forensics",
            ["Alerts:Owners:1:Email"] = "forensics@local.test",
            ["Notifications:Smtp:Enabled"] = "false",
            ["Notifications:Smtp:Port"] = "25",
        };

        return new TestWebApplicationFactory(
            overrides,
            services =>
            {
                if (sender is null)
                {
                    return;
                }

                services.RemoveAll<IAlertEmailSender>();
                services.AddSingleton<IAlertEmailSender>(sender);
            });
    }

    private static async Task<AlertResponse> CreateAlertAsync(HttpClient client, string ownerUserId)
    {
        var response = await client.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: $"Alert {Guid.NewGuid():N}",
            Summary: "Alert for email validation.",
            Severity: "High",
            OwnerUserId: ownerUserId,
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var alert = await response.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        alert.Should().NotBeNull();
        return alert!;
    }

    private sealed class TestAlertEmailSender : IAlertEmailSender
    {
        public List<(string ToEmail, IReadOnlyList<string> CcEmails, string Subject, string Body)> SentMessages { get; } = [];

        public Task<AlertEmailDeliveryResult> SendAsync(
            string toEmail,
            IReadOnlyList<string> ccEmails,
            string subject,
            string body,
            CancellationToken cancellationToken)
        {
            SentMessages.Add((toEmail, ccEmails, subject, body));
            return Task.FromResult(new AlertEmailDeliveryResult(AlertEmailDeliveryStatus.Sent, null, DateTimeOffset.UtcNow));
        }
    }
}
