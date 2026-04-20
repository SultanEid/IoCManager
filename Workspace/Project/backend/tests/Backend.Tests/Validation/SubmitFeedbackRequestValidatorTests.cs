using Backend.Application.Validation;
using Backend.Contracts.Feedback;
using FluentAssertions;

namespace Backend.Tests.Validation;

public sealed class SubmitFeedbackRequestValidatorTests
{
    private readonly SubmitFeedbackRequestValidator _validator = new();

    [Fact]
    public void Validate_AcceptsCanonicalVerdictAndAuxiliaryFields()
    {
        var request = CreateRequest(
            verdict: "likely_malicious",
            confidence: 0.78m,
            falsePositiveRisk: 0.19m,
            reviewPriority: "high");

        var result = _validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_AcceptsLegacyVerdictAlias_ForCompatibility()
    {
        var request = CreateRequest(verdict: "confirmed_malicious");

        var result = _validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_RejectsUnknownVerdict()
    {
        var request = CreateRequest(verdict: "approve_canary");

        var result = _validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(x => x.PropertyName == nameof(SubmitFeedbackRequest.Verdict));
    }

    [Fact]
    public void Validate_RejectsConfidenceOutsideRange()
    {
        var request = CreateRequest(confidence: 1.2m);

        var result = _validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(x => x.PropertyName == nameof(SubmitFeedbackRequest.Confidence));
    }

    [Fact]
    public void Validate_RejectsFalsePositiveRiskOutsideRange()
    {
        var request = CreateRequest(falsePositiveRisk: -0.1m);

        var result = _validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(x => x.PropertyName == nameof(SubmitFeedbackRequest.FalsePositiveRisk));
    }

    [Fact]
    public void Validate_RejectsUnknownReviewPriority()
    {
        var request = CreateRequest(reviewPriority: "urgent");

        var result = _validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(x => x.PropertyName == nameof(SubmitFeedbackRequest.ReviewPriority));
    }

    private static SubmitFeedbackRequest CreateRequest(
        string verdict = "insufficient_evidence",
        decimal? confidence = null,
        decimal? falsePositiveRisk = null,
        string? reviewPriority = null)
    {
        return new SubmitFeedbackRequest(
            CaseId: Guid.NewGuid(),
            DecisionId: null,
            Verdict: verdict,
            Confidence: confidence,
            FalsePositiveRisk: falsePositiveRisk,
            ReviewPriority: reviewPriority,
            ShouldPromoteToIndicator: null,
            ShouldSuppress: null,
            ShouldAllowlist: null,
            ShouldEscalate: null,
            Notes: "notes",
            SubmittedByUserId: "analyst-1");
    }
}
