using Backend.Contracts.CtiPolicy;
using Backend.Domain.Cti.V1;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class EvaluateCtiPolicyRequestValidator : AbstractValidator<EvaluateCtiPolicyRequest>
{
    public EvaluateCtiPolicyRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.MaliciousnessScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.ActionabilityScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.DeployabilityScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.DecayScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.UncertaintyScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.BlastRadiusScore).InclusiveBetween(0m, 1m);
        RuleFor(x => x.SourceTrust).InclusiveBetween(0m, 1m);

        RuleFor(x => x.AssetCriticality)
            .Must(EnumValidation.IsDefinedValue<AssetCriticality>)
            .WithMessage("AssetCriticality must be a valid AssetCriticality value.");

        RuleFor(x => x.EvidenceFreshness)
            .Must(EnumValidation.IsDefinedValue<EvidenceFreshness>)
            .WithMessage("EvidenceFreshness must be a valid EvidenceFreshness value.");

        RuleFor(x => x.EvidenceConflict)
            .Must(EnumValidation.IsDefinedValue<EvidenceConflictLevel>)
            .WithMessage("EvidenceConflict must be a valid EvidenceConflictLevel value.");

        RuleFor(x => x.CurrentRolloutStage)
            .Must(EnumValidation.IsDefinedValue<RolloutMode>)
            .WithMessage("CurrentRolloutStage must be a valid RolloutMode value.");

        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}
