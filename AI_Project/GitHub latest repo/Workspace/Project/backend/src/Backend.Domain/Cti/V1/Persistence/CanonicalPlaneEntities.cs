using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1.Persistence;

public sealed class CtiCase : AuditableEntity
{
    private CtiCase()
    {
    }

    public string Title { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public string OwnerUserId { get; private set; } = string.Empty;
    public CaseState State { get; private set; } = CaseState.Open;
    public Guid? ParentCaseId { get; private set; }
    public Guid? MergedIntoCaseId { get; private set; }
    public string? MergeReason { get; private set; }
    public DateTimeOffset OpenedAtUtc { get; private set; }
    public DateTimeOffset? ClosedAtUtc { get; private set; }

    public static CtiCase Create(
        string title,
        string summary,
        string ownerUserId,
        CaseState initialState,
        string actorUserId,
        DateTimeOffset openedAtUtc,
        Guid? parentCaseId = null,
        Guid? mergedIntoCaseId = null,
        string? mergeReason = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (mergedIntoCaseId.HasValue && string.IsNullOrWhiteSpace(mergeReason))
        {
            throw new InvalidOperationException("Merged cases must include a merge reason.");
        }

        var item = new CtiCase
        {
            Title = title.Trim(),
            Summary = summary.Trim(),
            OwnerUserId = ownerUserId.Trim(),
            State = initialState,
            ParentCaseId = parentCaseId,
            MergedIntoCaseId = mergedIntoCaseId,
            MergeReason = string.IsNullOrWhiteSpace(mergeReason) ? null : mergeReason.Trim(),
            OpenedAtUtc = openedAtUtc,
            ClosedAtUtc = initialState == CaseState.Closed ? openedAtUtc : null,
        };

        item.StampCreation(actorUserId, openedAtUtc);
        return item;
    }
}

public sealed class CtiSourceReliabilityProfile : AuditableEntity
{
    private CtiSourceReliabilityProfile()
    {
    }

    public string SourceSystem { get; private set; } = string.Empty;
    public decimal HistoricalPrecision { get; private set; }
    public decimal HistoricalRecall { get; private set; }
    public decimal TrustScore { get; private set; }
    public DateTimeOffset EffectiveFromUtc { get; private set; }
    public DateTimeOffset? EffectiveToUtc { get; private set; }

    public static CtiSourceReliabilityProfile Create(
        string sourceSystem,
        decimal historicalPrecision,
        decimal historicalRecall,
        decimal trustScore,
        DateTimeOffset effectiveFromUtc,
        DateTimeOffset? effectiveToUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceSystem);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (effectiveToUtc.HasValue && effectiveToUtc < effectiveFromUtc)
        {
            throw new ArgumentOutOfRangeException(nameof(effectiveToUtc), "Effective-to must be greater than or equal to effective-from.");
        }

        var item = new CtiSourceReliabilityProfile
        {
            SourceSystem = sourceSystem.Trim(),
            HistoricalPrecision = ValidateUnitInterval(historicalPrecision, nameof(historicalPrecision)),
            HistoricalRecall = ValidateUnitInterval(historicalRecall, nameof(historicalRecall)),
            TrustScore = ValidateUnitInterval(trustScore, nameof(trustScore)),
            EffectiveFromUtc = effectiveFromUtc,
            EffectiveToUtc = effectiveToUtc,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }

    private static decimal ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }

        return value;
    }
}

public sealed class CtiEvidenceAssertion : AuditableEntity
{
    private CtiEvidenceAssertion()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid SourceReliabilityProfileId { get; private set; }
    public string EvidenceReference { get; private set; } = string.Empty;
    public string AssertionType { get; private set; } = string.Empty;
    public string Statement { get; private set; } = string.Empty;
    public decimal Confidence { get; private set; }
    public bool IsConflicting { get; private set; }
    public string SourceReference { get; private set; } = string.Empty;
    public DateTimeOffset ObservedAtUtc { get; private set; }

    public static CtiEvidenceAssertion Create(
        Guid caseId,
        Guid sourceReliabilityProfileId,
        string evidenceReference,
        string assertionType,
        string statement,
        decimal confidence,
        bool isConflicting,
        string sourceReference,
        DateTimeOffset observedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(evidenceReference);
        ArgumentException.ThrowIfNullOrWhiteSpace(assertionType);
        ArgumentException.ThrowIfNullOrWhiteSpace(statement);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceReference);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (sourceReliabilityProfileId == Guid.Empty)
        {
            throw new ArgumentException("Source reliability profile id is required.", nameof(sourceReliabilityProfileId));
        }

        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        var item = new CtiEvidenceAssertion
        {
            CaseId = caseId,
            SourceReliabilityProfileId = sourceReliabilityProfileId,
            EvidenceReference = evidenceReference.Trim(),
            AssertionType = assertionType.Trim(),
            Statement = statement.Trim(),
            Confidence = confidence,
            IsConflicting = isConflicting,
            SourceReference = sourceReference.Trim(),
            ObservedAtUtc = observedAtUtc,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }
}

public sealed class CtiDecision : AuditableEntity
{
    private CtiDecision()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid FeatureSnapshotId { get; private set; }
    public Guid? SupersedesDecisionId { get; private set; }
    public DecisionState DecisionState { get; private set; }
    public ApprovalTier ApprovalTierRequired { get; private set; }
    public string RecommendationCode { get; private set; } = string.Empty;
    public string RecommendationSummary { get; private set; } = string.Empty;
    public string SnapshotHash { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public string PolicyVersion { get; private set; } = string.Empty;
    public string TransformationLineageHash { get; private set; } = string.Empty;
    public DateTimeOffset DecidedAtUtc { get; private set; }

    public static CtiDecision Create(
        Guid caseId,
        Guid featureSnapshotId,
        Guid? supersedesDecisionId,
        DecisionState decisionState,
        ApprovalTier approvalTierRequired,
        string recommendationCode,
        string recommendationSummary,
        string snapshotHash,
        string modelVersion,
        string policyVersion,
        string transformationLineageHash,
        string actorUserId,
        DateTimeOffset decidedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendationCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendationSummary);
        ArgumentException.ThrowIfNullOrWhiteSpace(snapshotHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(transformationLineageHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        var item = new CtiDecision
        {
            CaseId = caseId,
            FeatureSnapshotId = featureSnapshotId,
            SupersedesDecisionId = supersedesDecisionId,
            DecisionState = decisionState,
            ApprovalTierRequired = approvalTierRequired,
            RecommendationCode = recommendationCode.Trim(),
            RecommendationSummary = recommendationSummary.Trim(),
            SnapshotHash = snapshotHash.Trim(),
            ModelVersion = modelVersion.Trim(),
            PolicyVersion = policyVersion.Trim(),
            TransformationLineageHash = transformationLineageHash.Trim(),
            DecidedAtUtc = decidedAtUtc,
        };

        item.StampCreation(actorUserId, decidedAtUtc);
        return item;
    }
}

public sealed class CtiDecisionBundle : AuditableEntity
{
    private CtiDecisionBundle()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid DecisionId { get; private set; }
    public Guid FeatureSnapshotId { get; private set; }
    public Guid? SupersedesDecisionBundleId { get; private set; }
    public DecisionState DecisionState { get; private set; }
    public ApprovalTier ApprovalTierRequired { get; private set; }
    public NextBestEvidenceType NextBestEvidenceType { get; private set; }
    public string RecommendationCode { get; private set; } = string.Empty;
    public string RecommendationSummary { get; private set; } = string.Empty;
    public string NextBestEvidenceRequest { get; private set; } = string.Empty;
    public string NextBestEvidenceRationale { get; private set; } = string.Empty;
    public string SnapshotHash { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public string PolicyVersion { get; private set; } = string.Empty;
    public string TransformationLineageHash { get; private set; } = string.Empty;
    public DateTimeOffset DecidedAtUtc { get; private set; }

    public static CtiDecisionBundle Create(
        Guid caseId,
        Guid decisionId,
        Guid featureSnapshotId,
        Guid? supersedesDecisionBundleId,
        DecisionState decisionState,
        ApprovalTier approvalTierRequired,
        NextBestEvidenceType nextBestEvidenceType,
        string recommendationCode,
        string recommendationSummary,
        string nextBestEvidenceRequest,
        string nextBestEvidenceRationale,
        string snapshotHash,
        string modelVersion,
        string policyVersion,
        string transformationLineageHash,
        string actorUserId,
        DateTimeOffset decidedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendationCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendationSummary);
        ArgumentException.ThrowIfNullOrWhiteSpace(nextBestEvidenceRequest);
        ArgumentException.ThrowIfNullOrWhiteSpace(nextBestEvidenceRationale);
        ArgumentException.ThrowIfNullOrWhiteSpace(snapshotHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(transformationLineageHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        var item = new CtiDecisionBundle
        {
            CaseId = caseId,
            DecisionId = decisionId,
            FeatureSnapshotId = featureSnapshotId,
            SupersedesDecisionBundleId = supersedesDecisionBundleId,
            DecisionState = decisionState,
            ApprovalTierRequired = approvalTierRequired,
            NextBestEvidenceType = nextBestEvidenceType,
            RecommendationCode = recommendationCode.Trim(),
            RecommendationSummary = recommendationSummary.Trim(),
            NextBestEvidenceRequest = nextBestEvidenceRequest.Trim(),
            NextBestEvidenceRationale = nextBestEvidenceRationale.Trim(),
            SnapshotHash = snapshotHash.Trim(),
            ModelVersion = modelVersion.Trim(),
            PolicyVersion = policyVersion.Trim(),
            TransformationLineageHash = transformationLineageHash.Trim(),
            DecidedAtUtc = decidedAtUtc,
        };

        item.StampCreation(actorUserId, decidedAtUtc);
        return item;
    }
}

public sealed class CtiApproval : AuditableEntity
{
    private CtiApproval()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid DecisionId { get; private set; }
    public ApprovalTier RequiredTier { get; private set; }
    public ApprovalTier ApprovedTier { get; private set; }
    public string ApprovedByUserId { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public DateTimeOffset ApprovedAtUtc { get; private set; }

    public static CtiApproval Create(
        Guid caseId,
        Guid decisionId,
        ApprovalTier requiredTier,
        ApprovalTier approvedTier,
        string approvedByUserId,
        string? notes,
        DateTimeOffset approvedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approvedByUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (approvedTier < requiredTier)
        {
            throw new InvalidOperationException("Approved tier cannot be lower than required tier.");
        }

        var actor = approvedByUserId.Trim();
        var item = new CtiApproval
        {
            CaseId = caseId,
            DecisionId = decisionId,
            RequiredTier = requiredTier,
            ApprovedTier = approvedTier,
            ApprovedByUserId = actor,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            ApprovedAtUtc = approvedAtUtc,
        };

        item.StampCreation(actor, approvedAtUtc);
        return item;
    }
}

public sealed class CtiRuleProposal : AuditableEntity
{
    private CtiRuleProposal()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public string ProposalName { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string RuleBody { get; private set; } = string.Empty;
    public string ProposedVersion { get; private set; } = string.Empty;
    public string ProposedByUserId { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;
    public DateTimeOffset ProposedAtUtc { get; private set; }

    public static CtiRuleProposal Create(
        Guid caseId,
        Guid? decisionId,
        string proposalName,
        string ruleFamily,
        string ruleBody,
        string proposedVersion,
        string proposedByUserId,
        string rationale,
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

        var actor = proposedByUserId.Trim();
        var item = new CtiRuleProposal
        {
            CaseId = caseId,
            DecisionId = decisionId,
            ProposalName = proposalName.Trim(),
            RuleFamily = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily)),
            RuleBody = ruleBody.Trim(),
            ProposedVersion = proposedVersion.Trim(),
            ProposedByUserId = actor,
            Rationale = rationale.Trim(),
            ProposedAtUtc = proposedAtUtc,
        };

        item.StampCreation(actor, proposedAtUtc);
        return item;
    }
}

public sealed class CtiDeploymentRecommendation : AuditableEntity
{
    private CtiDeploymentRecommendation()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid DecisionId { get; private set; }
    public Guid? RuleProposalId { get; private set; }
    public string TargetEnvironment { get; private set; } = string.Empty;
    public RolloutMode RecommendedRolloutMode { get; private set; }
    public decimal RiskScore { get; private set; }
    public bool RequiresHumanApproval { get; private set; }
    public string RequestedByUserId { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;
    public DateTimeOffset RecommendedAtUtc { get; private set; }

    public static CtiDeploymentRecommendation Create(
        Guid caseId,
        Guid decisionId,
        Guid? ruleProposalId,
        string targetEnvironment,
        RolloutMode recommendedRolloutMode,
        decimal riskScore,
        bool requiresHumanApproval,
        string requestedByUserId,
        string rationale,
        DateTimeOffset recommendedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetEnvironment);
        ArgumentException.ThrowIfNullOrWhiteSpace(requestedByUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (riskScore is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(riskScore), "Risk score must be between 0 and 1.");
        }

        var actor = requestedByUserId.Trim();
        var item = new CtiDeploymentRecommendation
        {
            CaseId = caseId,
            DecisionId = decisionId,
            RuleProposalId = ruleProposalId,
            TargetEnvironment = targetEnvironment.Trim(),
            RecommendedRolloutMode = recommendedRolloutMode,
            RiskScore = riskScore,
            RequiresHumanApproval = requiresHumanApproval,
            RequestedByUserId = actor,
            Rationale = rationale.Trim(),
            RecommendedAtUtc = recommendedAtUtc,
        };

        item.StampCreation(actor, recommendedAtUtc);
        return item;
    }
}

public sealed class CtiFeedback : AuditableEntity
{
    private CtiFeedback()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public FeedbackVerdict Verdict { get; private set; } = FeedbackVerdict.NeedsMoreEvidence;
    public string Notes { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset SubmittedAtUtc { get; private set; }

    public static CtiFeedback Create(
        Guid caseId,
        Guid? decisionId,
        FeedbackVerdict verdict,
        string notes,
        string submittedByUserId,
        DateTimeOffset submittedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var actor = submittedByUserId.Trim();
        var item = new CtiFeedback
        {
            CaseId = caseId,
            DecisionId = decisionId,
            Verdict = verdict,
            Notes = notes.Trim(),
            SubmittedByUserId = actor,
            SubmittedAtUtc = submittedAtUtc,
        };

        item.StampCreation(actor, submittedAtUtc);
        return item;
    }
}

public sealed class CtiAuditRecord : Entity
{
    private CtiAuditRecord()
    {
    }

    public Guid? CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public string ActorUserId { get; private set; } = string.Empty;
    public string ActionType { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public string EntityKey { get; private set; } = string.Empty;
    public string PayloadHash { get; private set; } = string.Empty;
    public string? CorrelationId { get; private set; }
    public DateTimeOffset OccurredAtUtc { get; private set; }

    public static CtiAuditRecord Create(
        Guid? caseId,
        Guid? decisionId,
        string actorUserId,
        string actionType,
        string entityType,
        string entityKey,
        string payloadHash,
        string? correlationId,
        DateTimeOffset occurredAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actionType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(payloadHash);

        return new CtiAuditRecord
        {
            CaseId = caseId,
            DecisionId = decisionId,
            ActorUserId = actorUserId.Trim(),
            ActionType = actionType.Trim(),
            EntityType = entityType.Trim(),
            EntityKey = entityKey.Trim(),
            PayloadHash = payloadHash.Trim(),
            CorrelationId = string.IsNullOrWhiteSpace(correlationId) ? null : correlationId.Trim(),
            OccurredAtUtc = occurredAtUtc,
        };
    }
}

public sealed class CtiTransformationLineageRecord : Entity
{
    private CtiTransformationLineageRecord()
    {
    }

    public Guid CaseId { get; private set; }
    public Guid SourceCaseId { get; private set; }
    public Guid TargetCaseId { get; private set; }
    public string Relationship { get; private set; } = string.Empty;
    public string Rationale { get; private set; } = string.Empty;
    public string RecordedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset RecordedAtUtc { get; private set; }

    public static CtiTransformationLineageRecord Create(
        Guid caseId,
        Guid sourceCaseId,
        Guid targetCaseId,
        string relationship,
        string rationale,
        string recordedByUserId,
        DateTimeOffset recordedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relationship);
        ArgumentException.ThrowIfNullOrWhiteSpace(rationale);
        ArgumentException.ThrowIfNullOrWhiteSpace(recordedByUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (sourceCaseId == Guid.Empty || targetCaseId == Guid.Empty)
        {
            throw new ArgumentException("Source and target case ids are required.");
        }

        return new CtiTransformationLineageRecord
        {
            CaseId = caseId,
            SourceCaseId = sourceCaseId,
            TargetCaseId = targetCaseId,
            Relationship = relationship.Trim(),
            Rationale = rationale.Trim(),
            RecordedByUserId = recordedByUserId.Trim(),
            RecordedAtUtc = recordedAtUtc,
        };
    }
}

public sealed class CtiDecisionEvidenceReference : Entity
{
    private CtiDecisionEvidenceReference()
    {
    }

    public Guid DecisionId { get; private set; }
    public Guid EvidenceAssertionId { get; private set; }
    public DateTimeOffset ReferencedAtUtc { get; private set; }

    public static CtiDecisionEvidenceReference Create(Guid decisionId, Guid evidenceAssertionId, DateTimeOffset referencedAtUtc)
    {
        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (evidenceAssertionId == Guid.Empty)
        {
            throw new ArgumentException("Evidence assertion id is required.", nameof(evidenceAssertionId));
        }

        return new CtiDecisionEvidenceReference
        {
            DecisionId = decisionId,
            EvidenceAssertionId = evidenceAssertionId,
            ReferencedAtUtc = referencedAtUtc,
        };
    }
}

public sealed class CtiDecisionLineageReference : Entity
{
    private CtiDecisionLineageReference()
    {
    }

    public Guid DecisionId { get; private set; }
    public Guid LineageRecordId { get; private set; }
    public DateTimeOffset ReferencedAtUtc { get; private set; }

    public static CtiDecisionLineageReference Create(Guid decisionId, Guid lineageRecordId, DateTimeOffset referencedAtUtc)
    {
        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (lineageRecordId == Guid.Empty)
        {
            throw new ArgumentException("Lineage record id is required.", nameof(lineageRecordId));
        }

        return new CtiDecisionLineageReference
        {
            DecisionId = decisionId,
            LineageRecordId = lineageRecordId,
            ReferencedAtUtc = referencedAtUtc,
        };
    }
}
