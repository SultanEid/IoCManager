using Backend.Domain.Common;

namespace Backend.Domain.RuleLifecycle;

public sealed class RuleProposal : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public string ProposalName { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string RuleBody { get; private set; } = string.Empty;
    public string ProposedVersion { get; private set; } = string.Empty;
    public string ProposedByUserId { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;
    public decimal PolicyRiskScore { get; private set; }
    public RuleProposalStatus Status { get; private set; } = RuleProposalStatus.Proposed;
    public string? ReviewedByUserId { get; private set; }
    public DateTimeOffset? ReviewedAtUtc { get; private set; }
    public string? ReviewReason { get; private set; }
    public string? OverrideReason { get; private set; }

    private RuleProposal()
    {
    }

    public static RuleProposal Create(
        Guid caseId,
        string proposalName,
        string ruleFamily,
        string ruleBody,
        string proposedVersion,
        string proposedByUserId,
        string rationale,
        decimal policyRiskScore,
        DateTimeOffset proposedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(proposalName);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleBody);
        ArgumentException.ThrowIfNullOrWhiteSpace(proposedVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(proposedByUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (policyRiskScore is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(policyRiskScore), "Policy risk score must be between 0 and 1.");
        }

        var actor = proposedByUserId.Trim();
        var proposal = new RuleProposal
        {
            CaseId = caseId,
            ProposalName = proposalName.Trim(),
            RuleFamily = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily)),
            RuleBody = ruleBody.Trim(),
            ProposedVersion = proposedVersion.Trim(),
            ProposedByUserId = actor,
            Rationale = rationale.Trim(),
            PolicyRiskScore = policyRiskScore,
            Status = RuleProposalStatus.Proposed,
        };

        proposal.StampCreation(actor, proposedAtUtc);
        return proposal;
    }

    public bool IsHighRisk(decimal threshold)
    {
        if (threshold is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0 and 1.");
        }

        return PolicyRiskScore >= threshold;
    }

    public void Accept(string reviewerUserId, string reviewReason, string? overrideReason, decimal highRiskThreshold, DateTimeOffset reviewedAtUtc)
    {
        EnsureReviewable();
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewReason);

        if (IsHighRisk(highRiskThreshold) && string.IsNullOrWhiteSpace(overrideReason))
        {
            throw new InvalidOperationException("High-risk proposals require an override reason before acceptance.");
        }

        Status = RuleProposalStatus.Accepted;
        ReviewedByUserId = reviewerUserId.Trim();
        ReviewedAtUtc = reviewedAtUtc;
        ReviewReason = reviewReason.Trim();
        OverrideReason = string.IsNullOrWhiteSpace(overrideReason) ? null : overrideReason.Trim();
        Touch(reviewerUserId.Trim(), reviewedAtUtc);
    }

    public void Reject(string reviewerUserId, string reviewReason, DateTimeOffset reviewedAtUtc)
    {
        EnsureReviewable();
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewReason);

        var actor = reviewerUserId.Trim();
        Status = RuleProposalStatus.Rejected;
        ReviewedByUserId = actor;
        ReviewedAtUtc = reviewedAtUtc;
        ReviewReason = reviewReason.Trim();
        OverrideReason = null;
        Touch(actor, reviewedAtUtc);
    }

    private void EnsureReviewable()
    {
        if (Status != RuleProposalStatus.Proposed)
        {
            throw new InvalidOperationException("Only proposed rules can be reviewed.");
        }
    }
}
