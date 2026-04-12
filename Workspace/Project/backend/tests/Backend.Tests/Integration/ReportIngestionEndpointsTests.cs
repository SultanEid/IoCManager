using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Backend.Contracts.Cases;
using Backend.Contracts.Evidence;
using Backend.Contracts.Reports;
using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration;

public sealed class ReportIngestionEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public ReportIngestionEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(Skip = "Deprecated CTI report ingestion surface; replaced by IoC ingestion and v2 reporting endpoints.")]
    public async Task IngestReport_PersistsRunClaimsAndEvidence_ForAnalyst()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        var caseId = await CreateCaseAsync(client);

        using var content = BuildMultipartContent(caseId, sourceType: "pdf");
        var ingestResponse = await client.PostAsync("/api/reports/ingestions", content);
        ingestResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await ingestResponse.Content.ReadFromJsonAsync<ReportIngestionResponse>(JsonOptions);
        created.Should().NotBeNull();
        created!.AcceptedClaims.Should().Be(1);
        created.AbstainedClaims.Should().Be(1);

        var getResponse = await client.GetAsync($"/api/reports/ingestions/{created.IngestionId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await getResponse.Content.ReadFromJsonAsync<ReportIngestionDetailResponse>(JsonOptions);
        detail.Should().NotBeNull();
        detail!.Claims.Should().HaveCount(2);
        var acceptedClaim = detail.Claims.Should().ContainSingle(x => x.IsAccepted).Subject;
        var abstainedClaim = detail.Claims.Should().ContainSingle(x => !x.IsAccepted && x.ExtractionMethod == "abstained").Subject;
        detail.Claims.Should().ContainSingle(x => x.SourceStartOffset.HasValue && x.SourceEndOffset.HasValue);
        acceptedClaim.Citations.Should().ContainSingle();
        acceptedClaim.Citations[0].StartOffset.Should().Be(9);
        acceptedClaim.Citations[0].EndOffset.Should().Be(44);
        abstainedClaim.AbstainReasonCodes.Should().Contain("weak_evidence_low_confidence");

        var evidence = await client.GetFromJsonAsync<IReadOnlyList<EvidenceResponse>>($"/api/evidence/case/{caseId}", JsonOptions);
        evidence.Should().NotBeNull();
        evidence!.Should().ContainSingle(x => x.EvidenceType == "report_ingestion_pdf");

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        dbContext.CtiEvidenceAssertions.Should().ContainSingle();
        dbContext.ReportIngestionClaims.Should().ContainSingle(x => !x.IsAccepted && !x.EvidenceAssertionId.HasValue);
    }

    [Fact(Skip = "Deprecated CTI report ingestion surface; replaced by IoC ingestion and v2 reporting endpoints.")]
    public async Task IngestReport_WithDecisionBundle_LinksAcceptedClaimToDecisionEvidenceReferences()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        var caseId = await CreateCaseAsync(client);
        var decisionBundleId = await SeedDecisionBundleAsync(caseId);

        using var content = BuildMultipartContent(caseId, sourceType: "blog", decisionBundleId: decisionBundleId);
        var ingestResponse = await client.PostAsync("/api/reports/ingestions", content);
        ingestResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        dbContext.CtiDecisionEvidenceReferences.Should().ContainSingle(x => x.DecisionId != Guid.Empty);
        dbContext.ReportIngestionRuns.Should().ContainSingle(x => x.DecisionBundleId == decisionBundleId);
        dbContext.ReportIngestionClaims.Should().ContainSingle(x => x.IsAccepted && x.EvidenceAssertionId.HasValue);
    }

    [Fact(Skip = "Deprecated CTI report ingestion surface; replaced by IoC ingestion and v2 reporting endpoints.")]
    public async Task IngestReport_ReturnsNotFound_WhenDecisionBundleIsMissing()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        var caseId = await CreateCaseAsync(client);

        using var content = BuildMultipartContent(caseId, sourceType: "blog", decisionBundleId: Guid.NewGuid());
        var response = await client.PostAsync("/api/reports/ingestions", content);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(Skip = "Deprecated CTI report ingestion surface; replaced by IoC ingestion and v2 reporting endpoints.")]
    public async Task IngestReport_ReturnsServiceUnavailable_WhenAiSidecarIsTemporarilyUnavailable()
    {
        using var client = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        var caseId = await CreateCaseAsync(client);

        using var content = BuildMultipartContent(
            caseId,
            sourceType: "blog",
            sourceName: "simulate-sidecar-unavailable");
        var response = await client.PostAsync("/api/reports/ingestions", content);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        root.GetProperty("title").GetString().Should().Be("Dependency Temporarily Unavailable");
        root.GetProperty("status").GetInt32().Should().Be(StatusCodes.Status503ServiceUnavailable);
        root.GetProperty("detail").GetString().Should().Be("AI sidecar is temporarily unavailable. Retry later.");
        root.GetProperty("dependency").GetString().Should().Be("ai_sidecar");
        root.GetProperty("condition").GetString().Should().Be("temporarily_unavailable");
        root.GetProperty("dependencyType").GetString().Should().Be("optional");
        root.GetProperty("retryable").GetBoolean().Should().BeTrue();
    }

    private static MultipartFormDataContent BuildMultipartContent(
        Guid caseId,
        string sourceType,
        Guid? decisionBundleId = null,
        string sourceName = "ti-feed")
    {
        var content = new MultipartFormDataContent();
        content.Add(new StringContent(caseId.ToString()), "caseId");
        content.Add(new StringContent("analyst-1"), "actorUserId");
        content.Add(new StringContent(sourceName), "sourceName");
        content.Add(new StringContent(sourceType), "sourceType");
        content.Add(new StringContent("doc-01"), "documentId");
        content.Add(new StringContent("https://example.org/advisory"), "documentUrl");
        content.Add(new StringContent("Indicator: https://evil-login-check.test/path"), "documentText");
        content.Add(new StringContent("false"), "enableLlmFallback");
        if (decisionBundleId.HasValue)
        {
            content.Add(new StringContent(decisionBundleId.Value.ToString()), "decisionBundleId");
        }

        var bytes = Encoding.UTF8.GetBytes("%PDF-1.4 fake pdf stream with IOC https://evil-login-check.test/path");
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(fileContent, "file", "report.pdf");
        return content;
    }

    private static async Task<Guid> CreateCaseAsync(HttpClient client)
    {
        var caseResponse = await client.PostAsJsonAsync("/api/cases", new
        {
            title = "Report ingestion test case",
            summary = "Case for report ingestion integration",
            priority = "High",
            ownerUserId = "analyst-1",
            approvalTierRequired = "Lead",
            requestedByUserId = "analyst-1",
        });

        caseResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdCase = await caseResponse.Content.ReadFromJsonAsync<CaseResponse>(JsonOptions);
        createdCase.Should().NotBeNull();
        return createdCase!.Id;
    }

    private async Task<Guid> SeedDecisionBundleAsync(Guid caseId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var now = DateTimeOffset.UtcNow;

        var snapshot = CtiFeatureSnapshot.Capture(
            caseId: caseId,
            snapshotHash: "snap-report-test",
            capturedAtUtc: now.AddHours(-2),
            featureWindowStartUtc: now.AddHours(-6),
            featureWindowEndUtc: now.AddHours(-2),
            capturedByPipeline: "test",
            actorUserId: "system",
            nowUtc: now.AddHours(-2));

        var decision = CtiDecision.Create(
            caseId: caseId,
            featureSnapshotId: snapshot.Id,
            supersedesDecisionId: null,
            decisionState: DecisionState.Recommend,
            approvalTierRequired: ApprovalTier.Lead,
            recommendationCode: "contain",
            recommendationSummary: "Contain and monitor",
            snapshotHash: snapshot.SnapshotHash,
            modelVersion: "model-v1",
            policyVersion: "policy-v1",
            transformationLineageHash: "lineage-v1",
            actorUserId: "policy-engine",
            decidedAtUtc: now.AddHours(-1));

        var bundle = CtiDecisionBundle.Create(
            caseId: caseId,
            decisionId: decision.Id,
            featureSnapshotId: snapshot.Id,
            supersedesDecisionBundleId: null,
            decisionState: DecisionState.Recommend,
            approvalTierRequired: ApprovalTier.Lead,
            nextBestEvidenceType: NextBestEvidenceType.SourceCorroboration,
            recommendationCode: "contain",
            recommendationSummary: "Contain and monitor",
            nextBestEvidenceRequest: "Collect corroborating source",
            nextBestEvidenceRationale: "Need corroboration before rollout.",
            snapshotHash: snapshot.SnapshotHash,
            modelVersion: "model-v1",
            policyVersion: "policy-v1",
            transformationLineageHash: "lineage-v1",
            actorUserId: "policy-engine",
            decidedAtUtc: now.AddHours(-1));

        dbContext.CtiFeatureSnapshots.Add(snapshot);
        dbContext.CtiDecisions.Add(decision);
        dbContext.CtiDecisionBundles.Add(bundle);
        await dbContext.SaveChangesAsync();
        return bundle.Id;
    }
}
