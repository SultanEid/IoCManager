using System.Net;
using System.Text;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Integrations;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Infrastructure.Integrations;

public sealed class AiReportExtractionClientTests
{
    [Fact]
    public async Task ExtractAsync_ParsesStrictContractPayload()
    {
        var payload =
            """
            {
              "reportId": "rep-1",
              "sourceType": "blog",
              "humanReviewRequired": true,
              "weakEvidenceDetected": false,
              "processedAt": "2026-03-30T10:00:00Z",
              "claims": [
                {
                  "claimId": "claim-1",
                  "claimType": "ioc_url",
                  "statement": "https://evil-login-check.test/path",
                  "snippet": "Observed https://evil-login-check.test/path",
                  "sourceStartOffset": 9,
                  "sourceEndOffset": 44,
                  "pageIndex": null,
                  "extractionMethod": "regex",
                  "confidence": 0.82,
                  "isPromptInjectionSuspected": false,
                  "abstainReasonCodes": [],
                  "citations": []
                }
              ]
            }
            """;

        var client = BuildClient(payload);

        var result = await client.ExtractAsync(BuildRequest(), CancellationToken.None);

        result.ReportId.Should().Be("rep-1");
        result.SourceType.Should().Be("blog");
        result.HumanReviewRequired.Should().BeTrue();
        result.WeakEvidenceDetected.Should().BeFalse();
        result.Claims.Should().ContainSingle();
        result.Claims[0].ClaimId.Should().Be("claim-1");
        result.Claims[0].Confidence.Should().Be(0.82m);
    }

    [Fact]
    public async Task ExtractAsync_ThrowsUnavailable_WhenResponseUsesLegacyExtractedIocsOnly()
    {
        var payload =
            """
            {
              "reportId": "rep-1",
              "sourceType": "blog",
              "humanReviewRequired": true,
              "weakEvidenceDetected": false,
              "processedAt": "2026-03-30T10:00:00Z",
              "extractedIocs": [
                {
                  "iocType": "url",
                  "iocValue": "https://evil-login-check.test/path",
                  "confidence": 0.8
                }
              ]
            }
            """;

        var client = BuildClient(payload);

        var action = async () => await client.ExtractAsync(BuildRequest(), CancellationToken.None);

        await action.Should().ThrowAsync<OptionalDependencyUnavailableException>()
            .Where(ex => ex.DependencyName == "ai_sidecar" && ex.Condition == "temporarily_unavailable");
    }

    [Fact]
    public async Task ExtractAsync_ThrowsUnavailable_WhenRequiredClaimFieldIsMissing()
    {
        var payload =
            """
            {
              "reportId": "rep-1",
              "sourceType": "blog",
              "humanReviewRequired": true,
              "weakEvidenceDetected": false,
              "processedAt": "2026-03-30T10:00:00Z",
              "claims": [
                {
                  "claimType": "ioc_url",
                  "statement": "https://evil-login-check.test/path",
                  "snippet": "Observed https://evil-login-check.test/path",
                  "sourceStartOffset": 9,
                  "sourceEndOffset": 44,
                  "pageIndex": null,
                  "extractionMethod": "regex",
                  "confidence": 0.82,
                  "isPromptInjectionSuspected": false,
                  "abstainReasonCodes": [],
                  "citations": []
                }
              ]
            }
            """;

        var client = BuildClient(payload);

        var action = async () => await client.ExtractAsync(BuildRequest(), CancellationToken.None);

        await action.Should().ThrowAsync<OptionalDependencyUnavailableException>()
            .Where(ex => ex.DependencyName == "ai_sidecar" && ex.Condition == "temporarily_unavailable");
    }

    private static AiReportExtractionRequest BuildRequest()
    {
        return new AiReportExtractionRequest(
            SourceName: "ti-feed",
            SourceType: "blog",
            DocumentId: "rep-1",
            DocumentUrl: "https://example.org/advisory",
            DocumentText: "Observed indicator.",
            DocumentBytesBase64: null,
            BulletinJson: null,
            EnableLlmFallback: false,
            IngestionTimeUtc: DateTimeOffset.UtcNow);
    }

    private static AiReportExtractionClient BuildClient(string responseBody, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var handler = new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            });

        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost"),
        };

        var options = Options.Create(new AiSidecarOptions
        {
            BaseUrl = "http://localhost",
            ReportExtractionPath = "/extract_report",
            TimeoutSeconds = 5,
        });

        return new AiReportExtractionClient(httpClient, options, NullLogger<AiReportExtractionClient>.Instance);
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(_responseFactory(request));
        }
    }
}
