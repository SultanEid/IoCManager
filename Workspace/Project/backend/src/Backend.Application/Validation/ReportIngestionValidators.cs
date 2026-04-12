using Backend.Contracts.Reports;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class IngestReportRequestValidator : AbstractValidator<IngestReportRequest>
{
    public IngestReportRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty();
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.SourceName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.SourceType)
            .NotEmpty()
            .Must(value => value.Trim().ToLowerInvariant() is "pdf" or "blog" or "bulletin")
            .WithMessage("SourceType must be one of: pdf, blog, bulletin.");

        RuleFor(x => x.DocumentId).MaximumLength(256);
        RuleFor(x => x.DocumentUrl).MaximumLength(2000);
        RuleFor(x => x.DocumentText).MaximumLength(200000);
        RuleFor(x => x.BulletinJson).MaximumLength(200000);
    }
}
