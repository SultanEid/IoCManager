using Backend.Domain.Common;

namespace Backend.Domain.Rules;

public sealed class RuleRecord : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string RuleBody { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public string SourceOfOrigin { get; private set; } = string.Empty;
    public string AuthorUserId { get; private set; } = string.Empty;
    public string? ReviewerUserId { get; private set; }
    public string[] LinkedAttackTechniques { get; private set; } = [];
    public string? LinkedCampaign { get; private set; }
    public string? LinkedMalwareFamily { get; private set; }
    public decimal PredictedCoverage { get; private set; }
    public decimal PredictedFalsePositiveRisk { get; private set; }
    public string BlastRadius { get; private set; } = string.Empty;
    public DateTimeOffset? LastUsefulHitAtUtc { get; private set; }
    public DateTimeOffset? LastDeploymentAtUtc { get; private set; }
    public DateTimeOffset? LastParsedAtUtc { get; private set; }
    public DateTimeOffset? LastValidatedAtUtc { get; private set; }
    public bool? LastValidationPassed { get; private set; }
    public string? LastValidationSummary { get; private set; }
    public string BodyFingerprint { get; private set; } = string.Empty;
    public RuleStatus Status { get; private set; } = RuleStatus.Draft;

    private RuleRecord()
    {
    }

    public static RuleRecord Create(
        Guid caseId,
        string name,
        string ruleFamily,
        string ruleBody,
        string version,
        string sourceOfOrigin,
        string authorUserId,
        string[] linkedAttackTechniques,
        string? linkedCampaign,
        string? linkedMalwareFamily,
        decimal predictedCoverage,
        decimal predictedFalsePositiveRisk,
        string blastRadius,
        string bodyFingerprint,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleBody);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceOfOrigin);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(blastRadius);
        ArgumentException.ThrowIfNullOrWhiteSpace(bodyFingerprint);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var normalizedFamily = NormalizeRuleFamily(ruleFamily);
        var rule = new RuleRecord
        {
            CaseId = caseId,
            Name = name.Trim(),
            RuleFamily = normalizedFamily,
            RuleBody = ruleBody.Trim(),
            Version = version.Trim(),
            SourceOfOrigin = sourceOfOrigin.Trim(),
            AuthorUserId = authorUserId.Trim(),
            LinkedAttackTechniques = NormalizeLinkedTechniques(linkedAttackTechniques),
            LinkedCampaign = NormalizeOptional(linkedCampaign),
            LinkedMalwareFamily = NormalizeOptional(linkedMalwareFamily),
            PredictedCoverage = ValidateUnitInterval(predictedCoverage, nameof(predictedCoverage)),
            PredictedFalsePositiveRisk = ValidateUnitInterval(predictedFalsePositiveRisk, nameof(predictedFalsePositiveRisk)),
            BlastRadius = blastRadius.Trim(),
            BodyFingerprint = bodyFingerprint.Trim(),
            Status = RuleStatus.Draft,
        };

        rule.StampCreation(actorUserId, nowUtc);
        return rule;
    }

    public void UpdateContent(
        string name,
        string ruleFamily,
        string ruleBody,
        string version,
        string sourceOfOrigin,
        string authorUserId,
        string[] linkedAttackTechniques,
        string? linkedCampaign,
        string? linkedMalwareFamily,
        decimal predictedCoverage,
        decimal predictedFalsePositiveRisk,
        string blastRadius,
        string bodyFingerprint,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleBody);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceOfOrigin);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(blastRadius);
        ArgumentException.ThrowIfNullOrWhiteSpace(bodyFingerprint);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Name = name.Trim();
        RuleFamily = NormalizeRuleFamily(ruleFamily);
        RuleBody = ruleBody.Trim();
        Version = version.Trim();
        SourceOfOrigin = sourceOfOrigin.Trim();
        AuthorUserId = authorUserId.Trim();
        LinkedAttackTechniques = NormalizeLinkedTechniques(linkedAttackTechniques);
        LinkedCampaign = NormalizeOptional(linkedCampaign);
        LinkedMalwareFamily = NormalizeOptional(linkedMalwareFamily);
        PredictedCoverage = ValidateUnitInterval(predictedCoverage, nameof(predictedCoverage));
        PredictedFalsePositiveRisk = ValidateUnitInterval(predictedFalsePositiveRisk, nameof(predictedFalsePositiveRisk));
        BlastRadius = blastRadius.Trim();
        BodyFingerprint = bodyFingerprint.Trim();

        Touch(actorUserId, nowUtc);
    }

    public void UpdateStatus(RuleStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        EnsureTransitionAllowed(status);
        Status = status;
        Touch(actorUserId, nowUtc);
    }

    public void AssignReviewer(string reviewerUserId, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ReviewerUserId = reviewerUserId.Trim();
        Touch(actorUserId, nowUtc);
    }

    public void RecordValidation(bool passed, string summary, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        LastValidatedAtUtc = nowUtc;
        LastValidationPassed = passed;
        LastValidationSummary = summary.Trim();

        if (passed && Status is RuleStatus.Draft or RuleStatus.Parsed)
        {
            Status = RuleStatus.Validated;
        }
        else if (!passed && Status != RuleStatus.Retired)
        {
            Status = RuleStatus.NeedsReview;
        }

        Touch(actorUserId, nowUtc);
    }

    public void MarkParsed(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        LastParsedAtUtc = nowUtc;
        if (Status == RuleStatus.Draft)
        {
            Status = RuleStatus.Parsed;
        }

        Touch(actorUserId, nowUtc);
    }

    public void RecordUsefulHit(DateTimeOffset usefulHitAtUtc, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        LastUsefulHitAtUtc = usefulHitAtUtc;
        Touch(actorUserId, nowUtc);
    }

    public void RecordDeployment(DateTimeOffset deployedAtUtc, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        LastDeploymentAtUtc = deployedAtUtc;
        if (Status is RuleStatus.Approved or RuleStatus.Shadow or RuleStatus.Canary)
        {
            Status = RuleStatus.Promoted;
        }

        Touch(actorUserId, nowUtc);
    }

    public void Review(string decision, string reviewerUserId, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(decision);
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ReviewerUserId = reviewerUserId.Trim();
        var normalizedDecision = decision.Trim().ToLowerInvariant();
        Status = normalizedDecision switch
        {
            "approve" => RuleStatus.Approved,
            "reject" => RuleStatus.Rejected,
            "needsreview" => RuleStatus.NeedsReview,
            "needs-review" => RuleStatus.NeedsReview,
            "needs_review" => RuleStatus.NeedsReview,
            _ => throw new ArgumentException("Decision must be approve, reject, or needs-review.", nameof(decision)),
        };

        Touch(actorUserId, nowUtc);
    }

    private static string[] NormalizeLinkedTechniques(string[]? linkedAttackTechniques)
    {
        if (linkedAttackTechniques is null || linkedAttackTechniques.Length == 0)
        {
            return [];
        }

        return linkedAttackTechniques
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private void EnsureTransitionAllowed(RuleStatus nextStatus)
    {
        if (nextStatus == Status)
        {
            return;
        }

        var allowed = Status switch
        {
            RuleStatus.Draft => nextStatus is RuleStatus.Parsed or RuleStatus.NeedsReview or RuleStatus.Rejected or RuleStatus.Disabled,
            RuleStatus.Parsed => nextStatus is RuleStatus.Validated or RuleStatus.NeedsReview or RuleStatus.Rejected or RuleStatus.Disabled,
            RuleStatus.Validated => nextStatus is RuleStatus.NeedsReview or RuleStatus.Approved or RuleStatus.Rejected or RuleStatus.Shadow,
            RuleStatus.NeedsReview => nextStatus is RuleStatus.Validated or RuleStatus.Approved or RuleStatus.Rejected,
            RuleStatus.Approved => nextStatus is RuleStatus.Shadow or RuleStatus.Canary or RuleStatus.Promoted or RuleStatus.Disabled or RuleStatus.Retired,
            RuleStatus.Shadow => nextStatus is RuleStatus.Canary or RuleStatus.Disabled or RuleStatus.Retired,
            RuleStatus.Canary => nextStatus is RuleStatus.Promoted or RuleStatus.Disabled or RuleStatus.Retired,
            RuleStatus.Promoted => nextStatus is RuleStatus.Disabled or RuleStatus.Retired,
            RuleStatus.Disabled => nextStatus is RuleStatus.Draft or RuleStatus.Retired,
            RuleStatus.Rejected => nextStatus is RuleStatus.Draft or RuleStatus.Retired,
            RuleStatus.Retired => false,
            _ => false,
        };

        if (!allowed)
        {
            throw new InvalidOperationException($"Transition from {Status} to {nextStatus} is not allowed.");
        }
    }

    private static decimal ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }

        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static string NormalizeRuleFamily(string ruleFamily)
    {
        return RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily));
    }
}
