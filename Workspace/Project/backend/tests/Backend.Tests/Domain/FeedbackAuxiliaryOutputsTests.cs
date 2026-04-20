using Backend.Domain.Common;
using FluentAssertions;

namespace Backend.Tests.Domain;

public sealed class FeedbackAuxiliaryOutputsTests
{
    [Theory]
    [InlineData(FeedbackVerdict.Suspicious, true, false, false, true)]
    [InlineData(FeedbackVerdict.LikelyMalicious, true, false, false, true)]
    [InlineData(FeedbackVerdict.Malicious, true, false, false, true)]
    [InlineData(FeedbackVerdict.FalsePositive, false, true, true, false)]
    [InlineData(FeedbackVerdict.StaleOrRevoked, false, true, false, false)]
    [InlineData(FeedbackVerdict.Benign, false, false, true, false)]
    [InlineData(FeedbackVerdict.LikelyBenign, false, false, true, false)]
    [InlineData(FeedbackVerdict.InsufficientEvidence, false, false, false, true)]
    public void CreateDefaults_DerivesPolicyFlags(
        FeedbackVerdict verdict,
        bool shouldPromote,
        bool shouldSuppress,
        bool shouldAllowlist,
        bool shouldEscalate)
    {
        var defaults = FeedbackAuxiliaryOutputs.CreateDefaults(verdict);

        defaults.Confidence.Should().Be(0.5m);
        defaults.FalsePositiveRisk.Should().Be(0.5m);
        defaults.ReviewPriority.Should().Be(CasePriority.Medium);
        defaults.ShouldPromoteToIndicator.Should().Be(shouldPromote);
        defaults.ShouldSuppress.Should().Be(shouldSuppress);
        defaults.ShouldAllowlist.Should().Be(shouldAllowlist);
        defaults.ShouldEscalate.Should().Be(shouldEscalate);
    }

    [Fact]
    public void Resolve_UsesCallerOverrides_WhenProvided()
    {
        var resolved = FeedbackAuxiliaryOutputs.Resolve(
            FeedbackVerdict.Benign,
            confidence: 0.91m,
            falsePositiveRisk: 0.08m,
            reviewPriority: CasePriority.Low,
            shouldPromoteToIndicator: true,
            shouldSuppress: true,
            shouldAllowlist: false,
            shouldEscalate: true);

        resolved.Confidence.Should().Be(0.91m);
        resolved.FalsePositiveRisk.Should().Be(0.08m);
        resolved.ReviewPriority.Should().Be(CasePriority.Low);
        resolved.ShouldPromoteToIndicator.Should().BeTrue();
        resolved.ShouldSuppress.Should().BeTrue();
        resolved.ShouldAllowlist.Should().BeFalse();
        resolved.ShouldEscalate.Should().BeTrue();
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(1.01)]
    public void Create_Throws_WhenConfidenceOutOfRange(decimal confidence)
    {
        var action = () => FeedbackAuxiliaryOutputs.Create(
            confidence,
            0.5m,
            CasePriority.Medium,
            shouldPromoteToIndicator: false,
            shouldSuppress: false,
            shouldAllowlist: false,
            shouldEscalate: false);

        action.Should().Throw<ArgumentOutOfRangeException>()
            .WithParameterName("confidence");
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(1.01)]
    public void Create_Throws_WhenFalsePositiveRiskOutOfRange(decimal falsePositiveRisk)
    {
        var action = () => FeedbackAuxiliaryOutputs.Create(
            0.5m,
            falsePositiveRisk,
            CasePriority.Medium,
            shouldPromoteToIndicator: false,
            shouldSuppress: false,
            shouldAllowlist: false,
            shouldEscalate: false);

        action.Should().Throw<ArgumentOutOfRangeException>()
            .WithParameterName("falsePositiveRisk");
    }
}
