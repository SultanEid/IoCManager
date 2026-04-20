using Backend.Domain.Common;
using FluentAssertions;

namespace Backend.Tests.Domain;

public sealed class FeedbackTaxonomyTests
{
    [Theory]
    [InlineData("benign", FeedbackVerdict.Benign)]
    [InlineData("likely_benign", FeedbackVerdict.LikelyBenign)]
    [InlineData("suspicious", FeedbackVerdict.Suspicious)]
    [InlineData("likely_malicious", FeedbackVerdict.LikelyMalicious)]
    [InlineData("malicious", FeedbackVerdict.Malicious)]
    [InlineData("false_positive", FeedbackVerdict.FalsePositive)]
    [InlineData("insufficient_evidence", FeedbackVerdict.InsufficientEvidence)]
    [InlineData("stale_or_revoked", FeedbackVerdict.StaleOrRevoked)]
    [InlineData("ConfirmedThreat", FeedbackVerdict.Malicious)]
    [InlineData("confirmed_malicious", FeedbackVerdict.Malicious)]
    [InlineData("true_positive", FeedbackVerdict.Malicious)]
    [InlineData("escalated", FeedbackVerdict.Malicious)]
    [InlineData("Benign", FeedbackVerdict.Benign)]
    [InlineData("NeedsMoreEvidence", FeedbackVerdict.InsufficientEvidence)]
    public void TryParseVerdict_ParsesCanonicalAndAliases(string input, FeedbackVerdict expected)
    {
        var parsed = FeedbackTaxonomy.TryParseVerdict(input, out var verdict);

        parsed.Should().BeTrue();
        verdict.Should().Be(expected);
    }

    [Fact]
    public void TryParseVerdict_ReturnsFalse_WhenValueIsUnknown()
    {
        var parsed = FeedbackTaxonomy.TryParseVerdict("approve_canary", out _);

        parsed.Should().BeFalse();
    }

    [Theory]
    [InlineData(CasePriority.Low, "low")]
    [InlineData(CasePriority.Medium, "medium")]
    [InlineData(CasePriority.High, "high")]
    [InlineData(CasePriority.Critical, "critical")]
    public void ToWireValue_MapsCasePriority(CasePriority priority, string expected)
    {
        FeedbackTaxonomy.ToWireValue(priority).Should().Be(expected);
    }

    [Theory]
    [InlineData("low", CasePriority.Low)]
    [InlineData("medium", CasePriority.Medium)]
    [InlineData("high", CasePriority.High)]
    [InlineData("critical", CasePriority.Critical)]
    [InlineData("Medium", CasePriority.Medium)]
    public void TryParsePriority_ParsesCanonicalAndPascalCase(string input, CasePriority expected)
    {
        var parsed = FeedbackTaxonomy.TryParsePriority(input, out var priority);

        parsed.Should().BeTrue();
        priority.Should().Be(expected);
    }
}
