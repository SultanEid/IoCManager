using Backend.Contracts.V2;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class RuleRepositoryValidationEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public RuleRepositoryValidationEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Import_ReturnsStagedValidation_AndBlocksPersistence_WhenSyntaxFails()
    {
        using var client = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        using var form = BuildRuleImportContent(
            fileName: "invalid.yar",
            fileBytes: Array.Empty<byte>(),
            declaredRuleFamily: "yara",
            actorUserId: "lead-1");

        var response = await client.PostAsync("/api/v2/rules/import", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<RuleImportAttemptResponse>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.WasSuccessful.Should().BeFalse();
        payload.RuleArtifactId.Should().BeNull();
        payload.RuleRevisionId.Should().BeNull();
        payload.Validation.CanPersist.Should().BeFalse();
        payload.Validation.Stages.Should().Contain(x => x.Stage == "syntax");
        payload.Validation.Stages.Should().Contain(x => x.Stage == "metadata");
        payload.Validation.Stages.Should().Contain(x => x.Stage == "deployment_readiness");
        payload.Validation.Stages.Single(x => x.Stage == "syntax").Diagnostics.Should().Contain(x => x.Severity == "error");
    }

    [Fact]
    public async Task CreateRule_PersistsValidationSnapshot_AndKeepsReadinessNonBlocking()
    {
        using var client = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var response = await client.PostAsJsonAsync("/api/v2/rules", new CreateRuleRepositoryRequest(
            Name: "Yara IOC Rule",
            RuleFamily: "yara",
            Source: "manual",
            Description: "Test rule",
            Tags: ["integration", "validation"],
            Severity: "medium",
            Status: "draft",
            ScopeType: "global",
            ScopeValue: null,
            VersionLabel: "v1",
            OriginalContent: "rule test_rule { condition: true }",
            ActorUserId: "lead-1",
            ChangeReason: "integration test"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = await response.Content.ReadFromJsonAsync<RuleDetailResponse>(JsonOptions);
        detail.Should().NotBeNull();

        detail!.CurrentRevision.Validation.CanPersist.Should().BeTrue();
        detail.CurrentRevision.Validation.IsDeploymentReady.Should().BeFalse();
        detail.CurrentRevision.Validation.Stages
            .Single(x => x.Stage == "deployment_readiness")
            .Diagnostics.Should()
            .Contain(x => x.Severity == "warning");

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var revisionEntity = await dbContext.RuleRevisionsV2.FindAsync(detail.CurrentRevision.Id);

        revisionEntity.Should().NotBeNull();
        revisionEntity!.CanPersistValidation.Should().BeTrue();
        revisionEntity.IsDeploymentReady.Should().BeFalse();
        revisionEntity.ValidatedAtUtc.Should().NotBeNull();
        revisionEntity.ValidationResultJson.Should().Contain("deployment_readiness");
    }

    [Fact]
    public async Task Import_PersistsRevision_WhenOnlyReadinessFails()
    {
        using var client = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        var yaraBytes = Encoding.UTF8.GetBytes("rule imported_rule { condition: true }");
        using var form = BuildRuleImportContent(
            fileName: "imported.yar",
            fileBytes: yaraBytes,
            declaredRuleFamily: "yara",
            actorUserId: "lead-1");

        var response = await client.PostAsync("/api/v2/rules/import", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var attempt = await response.Content.ReadFromJsonAsync<RuleImportAttemptResponse>(JsonOptions);
        attempt.Should().NotBeNull();
        attempt!.WasSuccessful.Should().BeTrue();
        attempt.RuleArtifactId.Should().NotBeNull();
        attempt.RuleRevisionId.Should().NotBeNull();
        attempt.Validation.CanPersist.Should().BeTrue();
        attempt.Validation.IsDeploymentReady.Should().BeFalse();

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var revisionEntity = await dbContext.RuleRevisionsV2.FindAsync(attempt.RuleRevisionId!.Value);

        revisionEntity.Should().NotBeNull();
        revisionEntity!.CanPersistValidation.Should().BeTrue();
        revisionEntity.IsDeploymentReady.Should().BeFalse();
        revisionEntity.ValidationResultJson.Should().Contain("syntax");
    }

    private static MultipartFormDataContent BuildRuleImportContent(
        string fileName,
        byte[] fileBytes,
        string declaredRuleFamily,
        string actorUserId)
    {
        var content = new MultipartFormDataContent();
        content.Add(new StringContent(declaredRuleFamily), "declaredRuleFamily");
        content.Add(new StringContent(actorUserId), "actorUserId");

        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(fileContent, "file", fileName);
        return content;
    }
}
