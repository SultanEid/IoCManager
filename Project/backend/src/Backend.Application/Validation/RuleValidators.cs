using Backend.Contracts.Rules;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class CreateRuleRequestValidator : AbstractValidator<CreateRuleRequest>
{
    public CreateRuleRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily).NotEmpty().Must(BeSupportedRuleFamily).WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.RuleBody).NotEmpty();
        RuleFor(x => x.Version).NotEmpty().MaximumLength(50);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.SourceOfOrigin).MaximumLength(200);
        RuleFor(x => x.AuthorUserId).MaximumLength(128);
        RuleFor(x => x.ReviewerUserId).MaximumLength(128);
        RuleFor(x => x.LinkedCampaign).MaximumLength(200);
        RuleFor(x => x.LinkedMalwareFamily).MaximumLength(200);
        RuleFor(x => x.BlastRadius).MaximumLength(128);
        RuleFor(x => x.PredictedCoverage).InclusiveBetween(0m, 1m).When(x => x.PredictedCoverage.HasValue);
        RuleFor(x => x.PredictedFalsePositiveRisk).InclusiveBetween(0m, 1m).When(x => x.PredictedFalsePositiveRisk.HasValue);
        RuleForEach(x => x.LinkedAttackTechniques).NotEmpty().MaximumLength(64);
    }

    internal static bool BeSupportedRuleFamily(string value)
    {
        return RuleFamilyCatalog.IsSupported(value);
    }
}

public sealed class UpdateRuleRequestValidator : AbstractValidator<UpdateRuleRequest>
{
    public UpdateRuleRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily).NotEmpty().Must(CreateRuleRequestValidator.BeSupportedRuleFamily).WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.RuleBody).NotEmpty();
        RuleFor(x => x.Version).NotEmpty().MaximumLength(50);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.SourceOfOrigin).MaximumLength(200);
        RuleFor(x => x.AuthorUserId).MaximumLength(128);
        RuleFor(x => x.ReviewerUserId).MaximumLength(128);
        RuleFor(x => x.LinkedCampaign).MaximumLength(200);
        RuleFor(x => x.LinkedMalwareFamily).MaximumLength(200);
        RuleFor(x => x.BlastRadius).MaximumLength(128);
        RuleFor(x => x.ChangeReason).MaximumLength(2000);
        RuleFor(x => x.PredictedCoverage).InclusiveBetween(0m, 1m).When(x => x.PredictedCoverage.HasValue);
        RuleFor(x => x.PredictedFalsePositiveRisk).InclusiveBetween(0m, 1m).When(x => x.PredictedFalsePositiveRisk.HasValue);
        RuleForEach(x => x.LinkedAttackTechniques).NotEmpty().MaximumLength(64);
    }
}

public sealed class UpdateRuleStatusRequestValidator : AbstractValidator<UpdateRuleStatusRequest>
{
    public UpdateRuleStatusRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Reason).MaximumLength(2000);
        RuleFor(x => x.Status).Must(EnumValidation.IsDefinedValue<RuleStatus>).WithMessage("Status must be a valid RuleStatus value.");
    }
}

public sealed class ReviewRuleRequestValidator : AbstractValidator<ReviewRuleRequest>
{
    public ReviewRuleRequestValidator()
    {
        RuleFor(x => x.Decision)
            .NotEmpty()
            .Must(x => NormalizeDecision(x) is "approve" or "reject" or "needs-review")
            .WithMessage("Decision must be approve, reject, or needs-review.");
        RuleFor(x => x.ReviewerUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Reason).MaximumLength(2000);
    }

    private static string NormalizeDecision(string value)
    {
        return value.Trim().ToLowerInvariant().Replace('_', '-');
    }
}

public sealed class ValidateRuleRequestValidator : AbstractValidator<ValidateRuleRequest>
{
    public ValidateRuleRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}

public sealed class RecordRuleHitRequestValidator : AbstractValidator<RecordRuleHitRequest>
{
    public RecordRuleHitRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}
