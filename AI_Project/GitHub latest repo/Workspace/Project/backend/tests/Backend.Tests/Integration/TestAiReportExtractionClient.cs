using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;

namespace Backend.Tests.Integration;

public sealed class TestAiReportExtractionClient : IAiReportExtractionClient
{
    public Task<AiReportExtractionResult> ExtractAsync(AiReportExtractionRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.Equals(request.SourceName, "simulate-sidecar-unavailable", StringComparison.OrdinalIgnoreCase))
        {
            throw new OptionalDependencyUnavailableException(
                dependencyName: "ai_sidecar",
                condition: "temporarily_unavailable",
                message: "AI sidecar is temporarily unavailable. Retry later.");
        }

        var claims = new List<AiReportExtractedClaim>
        {
            new(
                ClaimId: "claim-accepted",
                ClaimType: "ioc_url",
                Statement: "https://evil-login-check.test/path",
                Snippet: "Observed https://evil-login-check.test/path in campaign infrastructure.",
                SourceStartOffset: 9,
                SourceEndOffset: 44,
                PageIndex: request.SourceType == "pdf" ? 0 : null,
                ExtractionMethod: "regex",
                Confidence: 0.82m,
                IsPromptInjectionSuspected: false,
                AbstainReasonCodesJson: "[]",
                CitationsJson: JsonSerializer.Serialize(
                    new[]
                    {
                        new
                        {
                            sourceId = request.DocumentId,
                            sourceType = "report",
                            snippet = "Observed https://evil-login-check.test/path in campaign infrastructure.",
                            sourceUri = request.DocumentUrl,
                            startOffset = 9,
                            endOffset = 44,
                            confidence = 0.82m,
                        },
                    })),
            new(
                ClaimId: "claim-abstained",
                ClaimType: "text_fact",
                Statement: "Unconfirmed rumor from anonymous forum post.",
                Snippet: "Unconfirmed rumor from anonymous forum post.",
                SourceStartOffset: null,
                SourceEndOffset: null,
                PageIndex: null,
                ExtractionMethod: "abstained",
                Confidence: 0.31m,
                IsPromptInjectionSuspected: true,
                AbstainReasonCodesJson: "[\"weak_evidence_low_confidence\"]",
                CitationsJson: "[]"),
        };

        var output = new
        {
            reportId = request.DocumentId,
            sourceType = request.SourceType,
            humanReviewRequired = true,
            weakEvidenceDetected = true,
            claims = claims.Select(x => new
            {
                claimId = x.ClaimId,
                claimType = x.ClaimType,
                statement = x.Statement,
                snippet = x.Snippet,
                sourceStartOffset = x.SourceStartOffset,
                sourceEndOffset = x.SourceEndOffset,
                pageIndex = x.PageIndex,
                extractionMethod = x.ExtractionMethod,
                confidence = x.Confidence,
                abstainReasonCodes = JsonSerializer.Deserialize<string[]>(x.AbstainReasonCodesJson) ?? Array.Empty<string>(),
                isPromptInjectionSuspected = x.IsPromptInjectionSuspected,
                citations = JsonSerializer.Deserialize<object[]>(x.CitationsJson) ?? Array.Empty<object>(),
            }),
            processedAt = request.IngestionTimeUtc,
        };
        var outputJson = JsonSerializer.Serialize(output);

        return Task.FromResult(
            new AiReportExtractionResult(
                ReportId: request.DocumentId,
                SourceType: request.SourceType,
                HumanReviewRequired: true,
                WeakEvidenceDetected: true,
                ProcessedAtUtc: request.IngestionTimeUtc,
                OutputPayloadJson: outputJson,
                Claims: claims));
    }
}
