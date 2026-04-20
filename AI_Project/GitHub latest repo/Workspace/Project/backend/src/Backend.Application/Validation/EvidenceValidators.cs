using Backend.Contracts.Evidence;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class AddEvidenceRequestValidator : AbstractValidator<AddEvidenceRequest>
{
    public AddEvidenceRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.EvidenceType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.SourceSystem).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContentHash).NotEmpty().MaximumLength(256);
        RuleFor(x => x.PayloadJson).NotEmpty();
        RuleFor(x => x.Confidence).InclusiveBetween(0m, 1m);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}
