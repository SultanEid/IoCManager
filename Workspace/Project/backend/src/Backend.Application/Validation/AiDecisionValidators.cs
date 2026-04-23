using System.Globalization;
using System.Text.Json;
using Backend.Contracts.V2;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class SubmitDecisionRequestValidator : AbstractValidator<SubmitDecisionRequestDto>
{
    private const int MaxDetectionPackageChars = 256_000;
    private const int MaxEvidenceItems = 200;
    private const int MaxArtifacts = 200;

    public SubmitDecisionRequestValidator()
    {
        RuleFor(x => x.CaseId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.DetectionId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.IocType).NotEmpty().MaximumLength(64);
        RuleFor(x => x.IocValue).NotEmpty().MaximumLength(1024);
        RuleFor(x => x.SubmittedByUserId).NotEmpty().MaximumLength(128);
        RuleFor(x => x.ObservedAtUtc)
            .Must(value => value != default)
            .WithMessage("ObservedAtUtc is required.");

        RuleFor(x => x.DetectionPackage)
            .Must(x => x.ValueKind == JsonValueKind.Object)
            .WithMessage("DetectionPackage must be a JSON object.");

        RuleFor(x => x)
            .Must(request => request.DetectionPackage.ValueKind == JsonValueKind.Object
                && request.DetectionPackage.GetRawText().Length <= MaxDetectionPackageChars)
            .WithMessage($"DetectionPackage exceeds max payload size of {MaxDetectionPackageChars} characters.");

        RuleFor(x => x)
            .Must(HasObservedAt)
            .WithMessage("DetectionPackage must include observedAt/observed_at timestamp.");

        RuleFor(x => x)
            .Must(HasRequiredPackageIds)
            .WithMessage("DetectionPackage must include non-empty caseId/case_id and detectionId/detection_id.");

        RuleFor(x => x)
            .Must(HasValidArtifactsBounds)
            .WithMessage($"DetectionPackage artifacts array exceeds max size of {MaxArtifacts}.");

        RuleFor(x => x)
            .Must(HasValidEvidenceBounds)
            .WithMessage($"DetectionPackage evidence array exceeds max size of {MaxEvidenceItems}.");

        RuleFor(x => x)
            .Must(HasMatchingCaseAndDetectionIds)
            .WithMessage("DetectionPackage caseId/detectionId must match request identifiers when supplied.");
    }

    private static bool HasObservedAt(SubmitDecisionRequestDto request)
    {
        if (!TryGetProperty(request.DetectionPackage, "observedAt", "observed_at", out var observedNode))
        {
            return false;
        }

        if (observedNode.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        var raw = observedNode.GetString();
        return DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out _);
    }

    private static bool HasValidArtifactsBounds(SubmitDecisionRequestDto request)
    {
        if (!TryGetProperty(request.DetectionPackage, "artifacts", out var node))
        {
            return true;
        }

        return node.ValueKind != JsonValueKind.Array || node.GetArrayLength() <= MaxArtifacts;
    }

    private static bool HasRequiredPackageIds(SubmitDecisionRequestDto request)
    {
        return TryGetProperty(request.DetectionPackage, "caseId", "case_id", out var caseIdNode)
            && caseIdNode.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(caseIdNode.GetString())
            && TryGetProperty(request.DetectionPackage, "detectionId", "detection_id", out var detectionNode)
            && detectionNode.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(detectionNode.GetString());
    }

    private static bool HasValidEvidenceBounds(SubmitDecisionRequestDto request)
    {
        if (!TryGetProperty(request.DetectionPackage, "evidence", out var node))
        {
            return true;
        }

        return node.ValueKind != JsonValueKind.Array || node.GetArrayLength() <= MaxEvidenceItems;
    }

    private static bool HasMatchingCaseAndDetectionIds(SubmitDecisionRequestDto request)
    {
        var package = request.DetectionPackage;

        if (TryGetProperty(package, "caseId", "case_id", out var caseIdNode)
            && caseIdNode.ValueKind == JsonValueKind.String
            && !string.Equals(caseIdNode.GetString(), request.CaseId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (TryGetProperty(package, "detectionId", "detection_id", out var detectionNode)
            && detectionNode.ValueKind == JsonValueKind.String
            && !string.Equals(detectionNode.GetString(), request.DetectionId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out value))
        {
            return true;
        }

        value = default;
        return false;
    }

    private static bool TryGetProperty(JsonElement element, string propertyA, string propertyB, out JsonElement value)
    {
        return TryGetProperty(element, propertyA, out value)
            || TryGetProperty(element, propertyB, out value);
    }
}

public sealed class OverrideOrClosureRequestValidator : AbstractValidator<OverrideOrClosureRequestDto>
{
    public OverrideOrClosureRequestValidator()
    {
        RuleFor(x => x.ActionType)
            .NotEmpty()
            .Must(action => action.Equals("Override", StringComparison.OrdinalIgnoreCase)
                            || action.Equals("Close", StringComparison.OrdinalIgnoreCase))
            .WithMessage("ActionType must be Override or Close.");

        RuleFor(x => x.Reason).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.OverrideVerdict).MaximumLength(64);
        RuleFor(x => x.ClosureDisposition).MaximumLength(128);
        RuleFor(x => x.SubmittedByUserId).NotEmpty().MaximumLength(128);

        When(x => string.Equals(x.ActionType, "Close", StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.ClosureDisposition)
                .NotEmpty()
                .WithMessage("ClosureDisposition is required when action type is Close.");
        });

        When(x => string.Equals(x.ActionType, "Override", StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.OverrideVerdict)
                .NotEmpty()
                .WithMessage("OverrideVerdict is required when action type is Override.");
        });
    }
}

public sealed class SimilarDetectionsQueryValidator : AbstractValidator<SimilarDetectionsQueryDto>
{
    public SimilarDetectionsQueryValidator()
    {
        RuleFor(x => x.Limit).InclusiveBetween(1, 100);
        RuleFor(x => x.Cursor).MaximumLength(256);
    }
}

public sealed class EvidenceSourcesQueryValidator : AbstractValidator<EvidenceSourcesQueryDto>
{
    public EvidenceSourcesQueryValidator()
    {
        RuleFor(x => x.Limit).InclusiveBetween(1, 100);
        RuleFor(x => x.Cursor).MaximumLength(256);
    }
}

