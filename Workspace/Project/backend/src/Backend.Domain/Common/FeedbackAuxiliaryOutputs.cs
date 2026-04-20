namespace Backend.Domain.Common;

public sealed record FeedbackAuxiliaryOutputs(
    decimal Confidence,
    decimal FalsePositiveRisk,
    CasePriority ReviewPriority,
    bool ShouldPromoteToIndicator,
    bool ShouldSuppress,
    bool ShouldAllowlist,
    bool ShouldEscalate)
{
    public static FeedbackAuxiliaryOutputs Create(
        decimal confidence,
        decimal falsePositiveRisk,
        CasePriority reviewPriority,
        bool shouldPromoteToIndicator,
        bool shouldSuppress,
        bool shouldAllowlist,
        bool shouldEscalate)
    {
        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        if (falsePositiveRisk is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(falsePositiveRisk), "False-positive risk must be between 0 and 1.");
        }

        return new FeedbackAuxiliaryOutputs(
            confidence,
            falsePositiveRisk,
            reviewPriority,
            shouldPromoteToIndicator,
            shouldSuppress,
            shouldAllowlist,
            shouldEscalate);
    }

    public static FeedbackAuxiliaryOutputs Resolve(
        FeedbackVerdict verdict,
        decimal? confidence = null,
        decimal? falsePositiveRisk = null,
        CasePriority? reviewPriority = null,
        bool? shouldPromoteToIndicator = null,
        bool? shouldSuppress = null,
        bool? shouldAllowlist = null,
        bool? shouldEscalate = null)
    {
        var defaults = CreateDefaults(verdict);
        return Create(
            confidence ?? defaults.Confidence,
            falsePositiveRisk ?? defaults.FalsePositiveRisk,
            reviewPriority ?? defaults.ReviewPriority,
            shouldPromoteToIndicator ?? defaults.ShouldPromoteToIndicator,
            shouldSuppress ?? defaults.ShouldSuppress,
            shouldAllowlist ?? defaults.ShouldAllowlist,
            shouldEscalate ?? defaults.ShouldEscalate);
    }

    public static FeedbackAuxiliaryOutputs CreateDefaults(FeedbackVerdict verdict)
    {
        return Create(
            confidence: 0.5m,
            falsePositiveRisk: 0.5m,
            reviewPriority: CasePriority.Medium,
            shouldPromoteToIndicator: verdict is FeedbackVerdict.Suspicious or FeedbackVerdict.LikelyMalicious or FeedbackVerdict.Malicious,
            shouldSuppress: verdict is FeedbackVerdict.FalsePositive or FeedbackVerdict.StaleOrRevoked,
            shouldAllowlist: verdict is FeedbackVerdict.Benign or FeedbackVerdict.LikelyBenign or FeedbackVerdict.FalsePositive,
            shouldEscalate: verdict is FeedbackVerdict.Suspicious or FeedbackVerdict.LikelyMalicious or FeedbackVerdict.Malicious or FeedbackVerdict.InsufficientEvidence);
    }
}
