using Backend.Domain.Common;

namespace Backend.Domain.Decisions;

public sealed class DecisionRecord : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public DecisionState State { get; private set; } = DecisionState.Proposed;
    public string RecommendedAction { get; private set; } = string.Empty;
    public ApprovalTier ApprovalTierRequired { get; private set; } = ApprovalTier.Analyst;
    public string PolicyVersion { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public string Reasoning { get; private set; } = string.Empty;
    public string? ApprovedByUserId { get; private set; }
    public DateTimeOffset? ApprovedAtUtc { get; private set; }

    private DecisionRecord()
    {
    }

    public static DecisionRecord Propose(
        Guid caseId,
        string recommendedAction,
        ApprovalTier approvalTierRequired,
        string policyVersion,
        string modelVersion,
        string reasoning,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendedAction);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(reasoning);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var decision = new DecisionRecord
        {
            CaseId = caseId,
            State = DecisionState.Proposed,
            RecommendedAction = recommendedAction.Trim(),
            ApprovalTierRequired = approvalTierRequired,
            PolicyVersion = policyVersion.Trim(),
            ModelVersion = modelVersion.Trim(),
            Reasoning = reasoning.Trim(),
        };

        decision.StampCreation(actorUserId, nowUtc);
        return decision;
    }

    public void Approve(string approverUserId, DateTimeOffset approvedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approverUserId);
        if (State is DecisionState.Approved or DecisionState.Rejected)
        {
            throw new InvalidOperationException("A finalized decision cannot be approved again.");
        }

        State = DecisionState.Approved;
        ApprovedByUserId = approverUserId;
        ApprovedAtUtc = approvedAtUtc;
        Touch(approverUserId, approvedAtUtc);
    }

    public void Reject(string approverUserId, DateTimeOffset rejectedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approverUserId);
        if (State is DecisionState.Approved or DecisionState.Rejected)
        {
            throw new InvalidOperationException("A finalized decision cannot be rejected again.");
        }

        State = DecisionState.Rejected;
        ApprovedByUserId = approverUserId;
        ApprovedAtUtc = rejectedAtUtc;
        Touch(approverUserId, rejectedAtUtc);
    }

    public void Defer(string actorUserId, DateTimeOffset deferredAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (State is DecisionState.Approved or DecisionState.Rejected)
        {
            throw new InvalidOperationException("A finalized decision cannot be deferred.");
        }

        State = DecisionState.Deferred;
        Touch(actorUserId, deferredAtUtc);
    }
}
