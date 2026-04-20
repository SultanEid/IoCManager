using Backend.Contracts.Decisions;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class CreateDecisionRequestValidator : AbstractValidator<CreateDecisionRequest>
{
    public CreateDecisionRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.RecommendedAction).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ApprovalTierRequired).Must(EnumValidation.IsDefinedValue<ApprovalTier>).WithMessage("Approval tier must be a valid ApprovalTier value.");
        RuleFor(x => x.PolicyVersion).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ModelVersion).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Reasoning).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}

public sealed class FinalizeDecisionRequestValidator : AbstractValidator<FinalizeDecisionRequest>
{
    public FinalizeDecisionRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Outcome)
            .Must(value => EnumValidation.IsDefinedValue<DecisionState>(value)
                           && !value.Equals(DecisionState.Proposed.ToString(), StringComparison.OrdinalIgnoreCase))
            .WithMessage("Outcome must be Approved, Rejected, or Deferred.");
    }
}
