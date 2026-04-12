using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class InvestigationCase : AuditableEntity
{
    private static readonly IReadOnlyDictionary<CaseState, IReadOnlySet<CaseState>> AllowedTransitions =
        new Dictionary<CaseState, IReadOnlySet<CaseState>>
        {
            [CaseState.Open] = new HashSet<CaseState> { CaseState.Triage, CaseState.Closed },
            [CaseState.Triage] = new HashSet<CaseState> { CaseState.EvidencePending, CaseState.RecommendationReady, CaseState.Closed },
            [CaseState.EvidencePending] = new HashSet<CaseState> { CaseState.Triage, CaseState.RecommendationReady, CaseState.Closed },
            [CaseState.RecommendationReady] = new HashSet<CaseState> { CaseState.EvidencePending, CaseState.AwaitingApproval, CaseState.Closed },
            [CaseState.AwaitingApproval] = new HashSet<CaseState> { CaseState.EvidencePending, CaseState.Shadow, CaseState.Canary, CaseState.Closed },
            [CaseState.Shadow] = new HashSet<CaseState> { CaseState.Canary, CaseState.Closed },
            [CaseState.Canary] = new HashSet<CaseState> { CaseState.Shadow, CaseState.Promoted, CaseState.Monitoring, CaseState.Closed },
            [CaseState.Promoted] = new HashSet<CaseState> { CaseState.Monitoring, CaseState.Closed },
            [CaseState.Monitoring] = new HashSet<CaseState> { CaseState.Triage, CaseState.Closed },
            [CaseState.Closed] = new HashSet<CaseState>(),
        };

    private readonly List<CaseEvidenceBundle> _evidenceBundles = new();
    private readonly List<DecisionBundle> _decisionBundles = new();
    private readonly List<CaseAssignment> _assignments = new();
    private readonly List<Guid> _mergedCaseIds = new();
    private readonly List<Guid> _childCaseIds = new();

    private InvestigationCase()
    {
    }

    public string Title { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public string OwnerUserId { get; private set; } = string.Empty;
    public CaseState State { get; private set; } = CaseState.Open;
    public CaseSla Sla { get; private set; } = null!;
    public RiskBudget RiskBudget { get; private set; } = null!;
    public ApprovalGate? ActiveApprovalGate { get; private set; }
    public RolloutPlan? ActiveRolloutPlan { get; private set; }
    public RollbackPlan? ActiveRollbackPlan { get; private set; }
    public TransformationLineage TransformationLineage { get; private set; } = new();
    public Guid? ParentCaseId { get; private set; }
    public Guid? MergedIntoCaseId { get; private set; }
    public string? MergeReason { get; private set; }
    public Guid? ActiveDecisionBundleId { get; private set; }
    public IReadOnlyCollection<CaseEvidenceBundle> EvidenceBundles => _evidenceBundles;
    public IReadOnlyCollection<DecisionBundle> DecisionBundles => _decisionBundles;
    public IReadOnlyCollection<CaseAssignment> Assignments => _assignments;
    public IReadOnlyCollection<Guid> MergedCaseIds => _mergedCaseIds;
    public IReadOnlyCollection<Guid> ChildCaseIds => _childCaseIds;

    public static InvestigationCase Open(
        string title,
        string summary,
        string ownerUserId,
        CaseSla sla,
        RiskBudget riskBudget,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentNullException.ThrowIfNull(sla);
        ArgumentNullException.ThrowIfNull(riskBudget);

        var item = new InvestigationCase
        {
            Title = title.Trim(),
            Summary = summary.Trim(),
            OwnerUserId = ownerUserId.Trim(),
            Sla = sla,
            RiskBudget = riskBudget,
            State = CaseState.Open,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }

    public void TransitionTo(CaseState nextState, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (nextState == State)
        {
            return;
        }

        if (!AllowedTransitions.TryGetValue(State, out var allowed) || !allowed.Contains(nextState))
        {
            throw new InvalidOperationException($"Case transition from {State} to {nextState} is not allowed.");
        }

        EnsureGuardrails(nextState);
        State = nextState;
        Touch(actorUserId, nowUtc);
    }

    public void Assign(
        string assignedToUserId,
        string assignedByUserId,
        DateTimeOffset assignedAtUtc,
        DateTimeOffset? expiresAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        var assignment = CaseAssignment.Create(
            Id,
            assignedToUserId,
            assignedByUserId,
            assignedAtUtc,
            expiresAtUtc,
            actorUserId,
            nowUtc);

        _assignments.Add(assignment);
        OwnerUserId = assignedToUserId.Trim();
        Touch(actorUserId, nowUtc);
    }

    public void AddEvidenceBundle(CaseEvidenceBundle evidenceBundle, string actorUserId, DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        ArgumentNullException.ThrowIfNull(evidenceBundle);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (evidenceBundle.CaseId != Id)
        {
            throw new InvalidOperationException("Evidence bundle belongs to another case.");
        }

        _evidenceBundles.Add(evidenceBundle);
        Touch(actorUserId, nowUtc);
    }

    public void RecordDecisionBundle(DecisionBundle decisionBundle, string actorUserId, DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        ArgumentNullException.ThrowIfNull(decisionBundle);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (decisionBundle.CaseId != Id)
        {
            throw new InvalidOperationException("Decision bundle belongs to another case.");
        }

        var activeBundle = GetActiveDecisionBundle();
        if (activeBundle is null && decisionBundle.SupersedesDecisionBundleId.HasValue)
        {
            throw new InvalidOperationException("First decision bundle cannot supersede another bundle.");
        }

        if (activeBundle is not null && decisionBundle.SupersedesDecisionBundleId != activeBundle.Id)
        {
            throw new InvalidOperationException("Decision bundles must append to the active bundle chain.");
        }

        _decisionBundles.Add(decisionBundle);
        ActiveDecisionBundleId = decisionBundle.Id;
        ActiveRolloutPlan = decisionBundle.Decision.RolloutPlan;
        ActiveRollbackPlan = decisionBundle.Decision.RollbackPlan;
        Touch(actorUserId, nowUtc);
    }

    public void SetApprovalGate(ApprovalGate approvalGate, string actorUserId, DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        ArgumentNullException.ThrowIfNull(approvalGate);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (approvalGate.CaseId != Id)
        {
            throw new InvalidOperationException("Approval gate belongs to another case.");
        }

        ActiveApprovalGate = approvalGate;
        Touch(actorUserId, nowUtc);
    }

    public void MergeFrom(InvestigationCase sourceCase, string rationale, string actorUserId, DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        ArgumentNullException.ThrowIfNull(sourceCase);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (sourceCase.Id == Id)
        {
            throw new InvalidOperationException("A case cannot be merged with itself.");
        }

        if (MergedIntoCaseId.HasValue)
        {
            throw new InvalidOperationException("Cannot merge into a case that has already been merged.");
        }

        if (sourceCase.MergedIntoCaseId.HasValue)
        {
            throw new InvalidOperationException("Source case has already been merged.");
        }

        if (sourceCase.State == CaseState.Closed)
        {
            throw new InvalidOperationException("Source case is already closed.");
        }

        var bundlesToMove = sourceCase._evidenceBundles.ToList();
        foreach (var bundle in bundlesToMove)
        {
            bundle.MoveToCase(Id, actorUserId, nowUtc);
            _evidenceBundles.Add(bundle);
        }

        sourceCase._evidenceBundles.Clear();
        if (!_mergedCaseIds.Contains(sourceCase.Id))
        {
            _mergedCaseIds.Add(sourceCase.Id);
        }

        TransformationLineage.RecordMerge(sourceCase.Id, Id, rationale, nowUtc);
        sourceCase.MarkMergedInto(Id, rationale, actorUserId, nowUtc);
        Touch(actorUserId, nowUtc);
    }

    public InvestigationCase SplitInto(
        string childTitle,
        string childSummary,
        IReadOnlyCollection<Guid> evidenceBundleIds,
        string childOwnerUserId,
        string rationale,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        EnsureMutableCase();
        ArgumentNullException.ThrowIfNull(evidenceBundleIds);
        ArgumentException.ThrowIfNullOrWhiteSpace(childOwnerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (evidenceBundleIds.Count == 0)
        {
            throw new InvalidOperationException("At least one evidence bundle is required to split a case.");
        }

        var uniqueIds = evidenceBundleIds.Distinct().ToArray();
        var bundlesToMove = _evidenceBundles
            .Where(x => uniqueIds.Contains(x.Id))
            .ToList();

        if (bundlesToMove.Count != uniqueIds.Length)
        {
            throw new InvalidOperationException("One or more evidence bundle ids do not exist on this case.");
        }

        var childCase = Open(
            childTitle,
            childSummary,
            childOwnerUserId,
            Sla,
            RiskBudget,
            actorUserId,
            nowUtc);

        childCase.ParentCaseId = Id;

        foreach (var bundle in bundlesToMove)
        {
            _evidenceBundles.Remove(bundle);
            bundle.MoveToCase(childCase.Id, actorUserId, nowUtc);
            childCase._evidenceBundles.Add(bundle);
        }

        if (!_childCaseIds.Contains(childCase.Id))
        {
            _childCaseIds.Add(childCase.Id);
        }

        TransformationLineage.RecordSplit(Id, childCase.Id, rationale, nowUtc);
        childCase.TransformationLineage.RecordSplit(Id, childCase.Id, rationale, nowUtc);
        Touch(actorUserId, nowUtc);
        return childCase;
    }

    private void EnsureMutableCase()
    {
        if (MergedIntoCaseId.HasValue)
        {
            throw new InvalidOperationException("Merged cases are immutable.");
        }

        if (State == CaseState.Closed)
        {
            throw new InvalidOperationException("Closed cases are immutable.");
        }
    }

    private void EnsureGuardrails(CaseState nextState)
    {
        switch (nextState)
        {
            case CaseState.RecommendationReady:
                if (!_evidenceBundles.Any(x => x.HasActionableAssertions))
                {
                    throw new InvalidOperationException("RecommendationReady requires actionable evidence.");
                }

                break;

            case CaseState.AwaitingApproval:
                var latestDecisionBundle = GetActiveDecisionBundle();

                if (latestDecisionBundle is null)
                {
                    throw new InvalidOperationException("AwaitingApproval requires an active decision bundle.");
                }

                if (latestDecisionBundle.Decision.DecisionState is not (DecisionState.Recommend or DecisionState.Escalate))
                {
                    throw new InvalidOperationException("AwaitingApproval requires decision state Recommend or Escalate.");
                }

                break;

            case CaseState.Shadow:
            case CaseState.Canary:
                var rolloutBundle = GetActiveDecisionBundle();
                if (rolloutBundle is null)
                {
                    throw new InvalidOperationException("Rollout states require an active decision bundle.");
                }

                if (rolloutBundle.Decision.DecisionState is not (DecisionState.Recommend or DecisionState.Escalate))
                {
                    throw new InvalidOperationException("Rollout states require decision state Recommend or Escalate.");
                }

                if (ActiveApprovalGate is null || !ActiveApprovalGate.IsApproved)
                {
                    throw new InvalidOperationException("Rollout states require an approved gate.");
                }

                if (rolloutBundle.Decision.RolloutPlan is null || rolloutBundle.Decision.RollbackPlan is null)
                {
                    throw new InvalidOperationException("Rollout states require rollout and rollback plans in the active decision bundle.");
                }

                break;

            case CaseState.Promoted:
                var promotionBundle = GetActiveDecisionBundle();
                if (promotionBundle is null)
                {
                    throw new InvalidOperationException("Promotion requires an active decision bundle.");
                }

                if (State != CaseState.Canary)
                {
                    throw new InvalidOperationException("Promotion is allowed only from Canary.");
                }

                if (promotionBundle.Decision.RollbackPlan.Requirement == RollbackRequirement.NotRequired)
                {
                    throw new InvalidOperationException("Promotion requires an explicit rollback requirement.");
                }

                break;

            case CaseState.Monitoring:
                if (State is not (CaseState.Canary or CaseState.Promoted))
                {
                    throw new InvalidOperationException("Monitoring requires canary or promoted state.");
                }

                break;
        }
    }

    private DecisionBundle? GetActiveDecisionBundle()
    {
        if (!ActiveDecisionBundleId.HasValue)
        {
            return null;
        }

        return _decisionBundles.SingleOrDefault(x => x.Id == ActiveDecisionBundleId.Value);
    }

    private void MarkMergedInto(Guid destinationCaseId, string rationale, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        MergedIntoCaseId = destinationCaseId;
        MergeReason = rationale.Trim();
        TransformationLineage.RecordMerge(Id, destinationCaseId, rationale, nowUtc);
        State = CaseState.Closed;
        Touch(actorUserId, nowUtc);
    }
}
