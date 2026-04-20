using System.Text.Json;
using Backend.Infrastructure.Integrations;
using FluentAssertions;

namespace Backend.Tests.Infrastructure.Integrations;

public sealed class AiDecisionContractParserTests
{
    [Fact]
    public void ParseScoreCaseResponse_UsesGroundedDecisionWrapperAsAuthoritative()
    {
        var payload =
            """
            {
              "verdict": "likely_benign",
              "action": "monitor",
              "confidence": 0.12,
              "groundedDecision": {
                "verdict": "likely_malicious",
                "action": "canary",
                "confidence": 0.61,
                "provenance": [
                  { "source": "rule_context", "key": "scannerAgreement", "value": "0.71" }
                ],
                "reasons": ["camel decision"],
                "abstainReason": null,
                "nextBestEvidence": ["collect_post_action_validation_signals"]
              },
              "grounded_decision": {
                "verdict": "confirmed_malicious",
                "action": "deploy",
                "confidence": 0.93,
                "provenance": [
                  { "source": "rule_context", "key": "scannerAgreement", "value": "0.92" }
                ],
                "reasons": ["snake decision"],
                "abstain_reason": null,
                "next_best_evidence": ["collect_post_action_validation_signals"]
              }
            }
            """;

        var decision = AiDecisionContractParser.ParseScoreCaseResponse(payload);

        decision.Verdict.Should().Be("confirmed_malicious");
        decision.Action.Should().Be("deploy");
        decision.Confidence.Should().Be(0.93m);
        decision.Reasons.Should().ContainSingle().Which.Should().Be("snake decision");
    }

    [Fact]
    public void ParseRecommendActionResponse_AcceptsCamelCaseFields()
    {
        var payload =
            """
            {
              "verdict": "likely_malicious",
              "action": "canary",
              "confidence": 0.65,
              "provenance": [
                { "source": "score", "key": "maliciousness_score", "value": "0.72", "evidenceId": "ev-1", "citationRef": "cit-1" }
              ],
              "reasons": ["action=canary selected for controlled operational response"],
              "abstainReason": null,
              "nextBestEvidence": ["collect_post_action_validation_signals"]
            }
            """;

        var decision = AiDecisionContractParser.ParseRecommendActionResponse(payload);

        decision.Verdict.Should().Be("likely_malicious");
        decision.AbstainReason.Should().BeNull();
        decision.NextBestEvidence.Should().ContainSingle().Which.Should().Be("collect_post_action_validation_signals");
        decision.Provenance.Should().ContainSingle();
        decision.Provenance[0].EvidenceId.Should().Be("ev-1");
        decision.Provenance[0].CitationRef.Should().Be("cit-1");
    }

    [Fact]
    public void ParseRequestMoreEvidenceResponse_AcceptsSnakeCaseFields()
    {
        var payload =
            """
            {
              "verdict": "insufficient_evidence",
              "action": "hold",
              "confidence": 0.81,
              "provenance": [
                { "source": "score", "key": "uncertainty_score", "value": "0.81" }
              ],
              "reasons": ["decision abstained until stronger corroborated evidence is collected"],
              "abstain_reason": "high_uncertainty",
              "next_best_evidence": ["collect_independent_high_trust_corroboration"]
            }
            """;

        var decision = AiDecisionContractParser.ParseRequestMoreEvidenceResponse(payload);

        decision.Verdict.Should().Be("insufficient_evidence");
        decision.Action.Should().Be("hold");
        decision.AbstainReason.Should().Be("high_uncertainty");
        decision.NextBestEvidence.Should().ContainSingle().Which.Should().Be("collect_independent_high_trust_corroboration");
    }

    [Fact]
    public void ParseRequestMoreEvidenceResponse_Throws_WhenAbstainReasonIsMissing()
    {
        var payload =
            """
            {
              "verdict": "insufficient_evidence",
              "action": "hold",
              "confidence": 0.81,
              "provenance": [
                { "source": "score", "key": "uncertainty_score", "value": "0.81" }
              ],
              "reasons": ["decision abstained until stronger corroborated evidence is collected"],
              "next_best_evidence": ["collect_independent_high_trust_corroboration"]
            }
            """;

        var action = () => AiDecisionContractParser.ParseRequestMoreEvidenceResponse(payload);

        action.Should().Throw<JsonException>()
            .WithMessage("*abstain_reason is required*");
    }
}
