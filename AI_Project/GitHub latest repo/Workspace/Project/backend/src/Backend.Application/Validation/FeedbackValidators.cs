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
        RuleFor(x => x.Verdict).Must(EnumValidation.IsDefinedValue<FeedbackVerdict>).WithMessage("Verdict must be a valid FeedbackVerdict value.");
    }
}
