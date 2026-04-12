using Backend.Contracts.Cases;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class CreateCaseRequestValidator : AbstractValidator<CreateCaseRequest>
{
    public CreateCaseRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Summary).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.OwnerUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.RequestedByUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Priority).Must(EnumValidation.IsDefinedValue<CasePriority>).WithMessage("Priority must be a valid CasePriority value.");
        RuleFor(x => x.ApprovalTierRequired).Must(EnumValidation.IsDefinedValue<ApprovalTier>).WithMessage("Approval tier must be a valid ApprovalTier value.");
    }
}

public sealed class UpdateCaseStatusRequestValidator : AbstractValidator<UpdateCaseStatusRequest>
{
    public UpdateCaseStatusRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Status).Must(EnumValidation.IsDefinedValue<CaseStatus>).WithMessage("Status must be a valid CaseStatus value.");
    }
}
