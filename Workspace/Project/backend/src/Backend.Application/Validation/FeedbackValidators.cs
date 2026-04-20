using Backend.Contracts.Feedback;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class SubmitFeedbackRequestValidator : AbstractValidator<SubmitFeedbackRequest>
{
    public SubmitFeedbackRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.SubmittedByUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.Verdict)
            .Must(value => FeedbackTaxonomy.TryParseVerdict(value, out _))
            .WithMessage("Verdict must be a supported feedback verdict.");

        RuleFor(x => x.Confidence)
            .InclusiveBetween(0m, 1m)
            .When(x => x.Confidence.HasValue);

        RuleFor(x => x.FalsePositiveRisk)
            .InclusiveBetween(0m, 1m)
            .When(x => x.FalsePositiveRisk.HasValue);

        RuleFor(x => x.ReviewPriority)
            .Must(value => value is null || FeedbackTaxonomy.TryParsePriority(value, out _))
            .WithMessage("ReviewPriority must be one of: low, medium, high, critical.");
    }
}
