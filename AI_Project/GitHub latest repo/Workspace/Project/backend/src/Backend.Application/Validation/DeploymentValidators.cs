using Backend.Contracts.Deployments;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class CreateDeploymentRequestValidator : AbstractValidator<CreateDeploymentRequest>
{
    public CreateDeploymentRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.RuleId).NotEmpty();
        RuleFor(x => x.TargetEnvironment).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RequestedByUserId).NotEmpty().MaximumLength(128);
    }
}

public sealed class UpdateDeploymentStatusRequestValidator : AbstractValidator<UpdateDeploymentStatusRequest>
{
    public UpdateDeploymentStatusRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Status).Must(EnumValidation.IsDefinedValue<DeploymentStatus>).WithMessage("Status must be a valid DeploymentStatus value.");
    }
}
