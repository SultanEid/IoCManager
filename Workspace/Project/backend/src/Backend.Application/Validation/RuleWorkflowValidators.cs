using Backend.Contracts.RuleLifecycle;
using Backend.Domain.Common;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class CreateRuleProposalRequestValidator : AbstractValidator<CreateRuleProposalRequest>
{
    public CreateRuleProposalRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.ProposalName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily)
            .NotEmpty()
            .MaximumLength(120)
            .Must(CreateRuleRequestValidator.BeSupportedRuleFamily)
            .WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.RuleBody).NotEmpty();
        RuleFor(x => x.ProposedVersion).NotEmpty().MaximumLength(120);
        RuleFor(x => x.ProposedByUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Rationale).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.PolicyRiskScore)
            .InclusiveBetween(0m, 1m)
            .When(x => x.PolicyRiskScore.HasValue);
    }
}

public sealed class ReviewRuleProposalRequestValidator : AbstractValidator<ReviewRuleProposalRequest>
{
    private static readonly string[] AllowedDecisions = ["accept", "reject"];

    public ReviewRuleProposalRequestValidator()
    {
        RuleFor(x => x.Decision)
            .NotEmpty()
            .Must(value => AllowedDecisions.Contains(value.Trim().ToLowerInvariant()))
            .WithMessage("Decision must be either 'accept' or 'reject'.");
        RuleFor(x => x.ReviewerUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ReviewReason).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.OverrideReason).MaximumLength(2000);
    }
}

public sealed class SimulateRuleProposalRequestValidator : AbstractValidator<SimulateRuleProposalRequest>
{
    public SimulateRuleProposalRequestValidator()
    {
        RuleFor(x => x.TargetEnvironment).NotEmpty().MaximumLength(64);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}

public sealed class AdvanceRolloutStageRequestValidator : AbstractValidator<AdvanceRolloutStageRequest>
{
    public AdvanceRolloutStageRequestValidator()
    {
        RuleFor(x => x.Stage)
            .Must(EnumValidation.IsDefinedValue<RolloutStage>)
            .WithMessage("Stage must be one of shadow, canary, promote, rollback.");
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.OverrideReason).MaximumLength(2000);
    }
}

public sealed class RecordCanaryObservationRequestValidator : AbstractValidator<RecordCanaryObservationRequest>
{
    public RecordCanaryObservationRequestValidator()
    {
        RuleFor(x => x.ObservedNoise).InclusiveBetween(0m, 1m);
        RuleFor(x => x.AnalystAcceptedCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.AnalystReviewedCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => x.AnalystAcceptedCount <= x.AnalystReviewedCount)
            .WithMessage("Accepted count cannot exceed reviewed count.");
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}

public sealed class TriggerRollbackRequestValidator : AbstractValidator<TriggerRollbackRequest>
{
    public TriggerRollbackRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.ObservedNoise)
            .InclusiveBetween(0m, 1m)
            .When(x => x.ObservedNoise.HasValue);
    }
}
