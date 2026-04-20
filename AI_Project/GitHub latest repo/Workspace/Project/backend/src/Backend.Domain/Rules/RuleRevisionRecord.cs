using Backend.Domain.Common;

namespace Backend.Domain.Rules;

public sealed class RuleRevisionRecord : AuditableEntity
{
    public Guid RuleId { get; private set; }
    public Guid CaseId { get; private set; }
    public int RevisionNumber { get; private set; }
    public string ChangeType { get; private set; } = string.Empty;
    public string? ChangeReason { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string RuleBody { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public RuleStatus Status { get; private set; }
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

    private RuleRevisionRecord()
    {
    }

    public static RuleRevisionRecord Capture(
        RuleRecord rule,
        int revisionNumber,
        string changeType,
        string actorUserId,
        string? changeReason,
        DateTimeOffset nowUtc)
    {
        ArgumentNullException.ThrowIfNull(rule);
        ArgumentException.ThrowIfNullOrWhiteSpace(changeType);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (revisionNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revisionNumber), "Revision number must be positive.");
        }

        var actor = actorUserId.Trim();
        var item = new RuleRevisionRecord
        {
            RuleId = rule.Id,
            CaseId = rule.CaseId,
            RevisionNumber = revisionNumber,
            ChangeType = changeType.Trim(),
            ChangeReason = string.IsNullOrWhiteSpace(changeReason) ? null : changeReason.Trim(),
            Name = rule.Name,
            RuleFamily = rule.RuleFamily,
            RuleBody = rule.RuleBody,
            Version = rule.Version,
            Status = rule.Status,
            SourceOfOrigin = rule.SourceOfOrigin,
            AuthorUserId = rule.AuthorUserId,
            ReviewerUserId = rule.ReviewerUserId,
            LinkedAttackTechniques = rule.LinkedAttackTechniques.ToArray(),
            LinkedCampaign = rule.LinkedCampaign,
            LinkedMalwareFamily = rule.LinkedMalwareFamily,
            PredictedCoverage = rule.PredictedCoverage,
            PredictedFalsePositiveRisk = rule.PredictedFalsePositiveRisk,
            BlastRadius = rule.BlastRadius,
            LastUsefulHitAtUtc = rule.LastUsefulHitAtUtc,
            LastDeploymentAtUtc = rule.LastDeploymentAtUtc,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }
}
