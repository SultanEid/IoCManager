using Backend.Contracts.V2;
using FluentValidation;

namespace Backend.Application.Validation;

internal static class RuleRepositoryValidationCatalog
{
    private static readonly HashSet<string> SupportedStatuses =
    [
        "draft",
        "parsed",
        "validated",
        "needs review",
        "approved",
        "shadow",
        "canary",
        "promoted",
        "disabled",
        "retired",
        "rejected",
    ];

    private static readonly HashSet<string> SupportedScopeTypes =
    [
        "global",
        "environment",
        "subnet",
        "server",
        "scanner",
    ];

    public static bool BeSupportedStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        return SupportedStatuses.Contains(raw.Trim().ToLowerInvariant());
    }

    public static bool BeSupportedScopeType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        return SupportedScopeTypes.Contains(raw.Trim().ToLowerInvariant());
    }
}

public sealed class CreateRuleArtifactRequestValidator : AbstractValidator<CreateRuleArtifactRequest>
{
    public CreateRuleArtifactRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily)
            .NotEmpty()
            .MaximumLength(64)
            .Must(CreateRuleRequestValidator.BeSupportedRuleFamily)
            .WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
    }
}

public sealed class CreateRuleRepositoryRequestValidator : AbstractValidator<CreateRuleRepositoryRequest>
{
    public CreateRuleRepositoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily)
            .NotEmpty()
            .MaximumLength(64)
            .Must(CreateRuleRequestValidator.BeSupportedRuleFamily)
            .WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.Source).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Tags).NotNull();
        RuleForEach(x => x.Tags).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Severity).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Status)
            .NotEmpty()
            .MaximumLength(64)
            .Must(RuleRepositoryValidationCatalog.BeSupportedStatus)
            .WithMessage("Status must be one of: draft, parsed, validated, needs review, approved, shadow, canary, promoted, disabled, retired, rejected.");
        RuleFor(x => x.ScopeType)
            .NotEmpty()
            .MaximumLength(64)
            .Must(RuleRepositoryValidationCatalog.BeSupportedScopeType)
            .WithMessage("ScopeType must be one of: global, environment, subnet, server, scanner.");
        RuleFor(x => x.ScopeValue)
            .NotEmpty()
            .When(x => !string.Equals(x.ScopeType, "global", StringComparison.OrdinalIgnoreCase))
            .WithMessage("ScopeValue is required when ScopeType is not global.");
        RuleFor(x => x.VersionLabel).NotEmpty().MaximumLength(64);
        RuleFor(x => x.OriginalContent).NotEmpty();
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ChangeReason).MaximumLength(2000);
    }
}

public sealed class UpdateRuleRepositoryRequestValidator : AbstractValidator<UpdateRuleRepositoryRequest>
{
    public UpdateRuleRepositoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.RuleFamily)
            .NotEmpty()
            .MaximumLength(64)
            .Must(CreateRuleRequestValidator.BeSupportedRuleFamily)
            .WithMessage("RuleFamily must be one of: yara, sigma, snort, suricata.");
        RuleFor(x => x.Source).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Tags).NotNull();
        RuleForEach(x => x.Tags).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Severity).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Status)
            .NotEmpty()
            .MaximumLength(64)
            .Must(RuleRepositoryValidationCatalog.BeSupportedStatus)
            .WithMessage("Status must be one of: draft, parsed, validated, needs review, approved, shadow, canary, promoted, disabled, retired, rejected.");
        RuleFor(x => x.ScopeType)
            .NotEmpty()
            .MaximumLength(64)
            .Must(RuleRepositoryValidationCatalog.BeSupportedScopeType)
            .WithMessage("ScopeType must be one of: global, environment, subnet, server, scanner.");
        RuleFor(x => x.ScopeValue)
            .NotEmpty()
            .When(x => !string.Equals(x.ScopeType, "global", StringComparison.OrdinalIgnoreCase))
            .WithMessage("ScopeValue is required when ScopeType is not global.");
        RuleFor(x => x.VersionLabel).NotEmpty().MaximumLength(64);
        RuleFor(x => x.OriginalContent).NotEmpty();
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ChangeReason).MaximumLength(2000);
    }
}

public sealed class ArchiveRuleRequestValidator : AbstractValidator<ArchiveRuleRequest>
{
    public ArchiveRuleRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ChangeReason).MaximumLength(2000);
    }
}

public sealed class RestoreRuleRequestValidator : AbstractValidator<RestoreRuleRequest>
{
    public RestoreRuleRequestValidator()
    {
        RuleFor(x => x.ActorUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ChangeReason).MaximumLength(2000);
        RuleFor(x => x.RestoredStatus)
            .Must(RuleRepositoryValidationCatalog.BeSupportedStatus)
            .When(x => !string.IsNullOrWhiteSpace(x.RestoredStatus))
            .WithMessage("RestoredStatus must be one of: draft, parsed, validated, needs review, approved, shadow, canary, promoted, disabled, retired, rejected.");
    }
}
