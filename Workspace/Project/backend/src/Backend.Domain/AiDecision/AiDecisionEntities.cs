using Backend.Domain.Common;

namespace Backend.Domain.AiDecision;

public enum AiDecisionStatus
{
    Queued = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Overridden = 5,
    Closed = 6,
}

public enum AiDecisionJobStatus
{
    Queued = 1,
    Running = 2,
    Succeeded = 3,
    Failed = 4,
}

public enum AiAnalystActionType
{
    Override = 1,
    Close = 2,
}

public sealed class AiDecisionRequest : AuditableEntity
{
    private AiDecisionRequest() { }

    public string CaseId { get; private set; } = string.Empty;
    public string DetectionId { get; private set; } = string.Empty;
    public Guid? DetectionRecordId { get; private set; }
    public string IocType { get; private set; } = string.Empty;
    public string IocValue { get; private set; } = string.Empty;
    public DateTimeOffset ObservedAtUtc { get; private set; }
    public string DetectionPackageJson { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;
    public AiDecisionStatus Status { get; private set; } = AiDecisionStatus.Queued;
    public DateTimeOffset SubmittedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string? FailureCode { get; private set; }
    public string? FailureMessage { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public string? ModelVersion { get; private set; }
    public string? DatasetVersion { get; private set; }

    public static AiDecisionRequest Queue(
        string caseId,
        string detectionId,
        Guid? detectionRecordId,
        string iocType,
        string iocValue,
        DateTimeOffset observedAtUtc,
        string detectionPackageJson,
        string submittedByUserId,
        DateTimeOffset submittedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(caseId);
        ArgumentException.ThrowIfNullOrWhiteSpace(detectionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(iocType);
        ArgumentException.ThrowIfNullOrWhiteSpace(iocValue);
        ArgumentException.ThrowIfNullOrWhiteSpace(detectionPackageJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);

        var actor = submittedByUserId.Trim();
        var item = new AiDecisionRequest
        {
            CaseId = caseId.Trim(),
            DetectionId = detectionId.Trim(),
            DetectionRecordId = detectionRecordId == Guid.Empty ? null : detectionRecordId,
            IocType = iocType.Trim().ToLowerInvariant(),
            IocValue = iocValue.Trim(),
            ObservedAtUtc = observedAtUtc,
            DetectionPackageJson = detectionPackageJson,
            SubmittedByUserId = actor,
            Status = AiDecisionStatus.Queued,
            SubmittedAtUtc = submittedAtUtc,
            AttemptCount = 0,
            NextAttemptAtUtc = submittedAtUtc,
        };

        item.StampCreation(actor, submittedAtUtc);
        return item;
    }

    public void StartProcessing(string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (Status != AiDecisionStatus.Queued)
        {
            throw new InvalidOperationException($"Only queued decisions can start. Current status: {Status}.");
        }

        Status = AiDecisionStatus.Running;
        StartedAtUtc ??= startedAtUtc;
        FailureCode = null;
        FailureMessage = null;
        NextAttemptAtUtc = null;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void RegisterAttempt(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        AttemptCount += 1;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void MarkRetryQueued(
        string actorUserId,
        DateTimeOffset nowUtc,
        DateTimeOffset nextAttemptAtUtc,
        string? failureCode,
        string? failureMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = AiDecisionStatus.Queued;
        FailureCode = string.IsNullOrWhiteSpace(failureCode) ? null : failureCode.Trim();
        FailureMessage = string.IsNullOrWhiteSpace(failureMessage) ? null : failureMessage.Trim();
        NextAttemptAtUtc = nextAttemptAtUtc;
        CompletedAtUtc = null;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void MarkCompleted(
        string actorUserId,
        DateTimeOffset completedAtUtc,
        string? modelVersion,
        string? datasetVersion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = AiDecisionStatus.Completed;
        CompletedAtUtc = completedAtUtc;
        NextAttemptAtUtc = null;
        FailureCode = null;
        FailureMessage = null;
        ModelVersion = string.IsNullOrWhiteSpace(modelVersion) ? null : modelVersion.Trim();
        DatasetVersion = string.IsNullOrWhiteSpace(datasetVersion) ? null : datasetVersion.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }

    public void MarkFailed(string actorUserId, DateTimeOffset completedAtUtc, string? failureCode, string failureMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureMessage);

        Status = AiDecisionStatus.Failed;
        CompletedAtUtc = completedAtUtc;
        NextAttemptAtUtc = null;
        FailureCode = string.IsNullOrWhiteSpace(failureCode) ? null : failureCode.Trim();
        FailureMessage = failureMessage.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }

    public void ApplyAnalystAction(
        AiAnalystActionType actionType,
        string actorUserId,
        DateTimeOffset nowUtc,
        string? failureMessage = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = actionType switch
        {
            AiAnalystActionType.Override => AiDecisionStatus.Overridden,
            AiAnalystActionType.Close => AiDecisionStatus.Closed,
            _ => throw new ArgumentOutOfRangeException(nameof(actionType), $"Unsupported action type '{actionType}'."),
        };
        CompletedAtUtc ??= nowUtc;
        FailureMessage = string.IsNullOrWhiteSpace(failureMessage) ? FailureMessage : failureMessage.Trim();
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AiDecisionJob : AuditableEntity
{
    private AiDecisionJob() { }

    public Guid DecisionRequestId { get; private set; }
    public int AttemptNumber { get; private set; }
    public AiDecisionJobStatus Status { get; private set; } = AiDecisionJobStatus.Queued;
    public DateTimeOffset QueuedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }

    public static AiDecisionJob Queue(Guid decisionRequestId, int attemptNumber, DateTimeOffset queuedAtUtc, string actorUserId)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        if (attemptNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Attempt number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiDecisionJob
        {
            DecisionRequestId = decisionRequestId,
            AttemptNumber = attemptNumber,
            Status = AiDecisionJobStatus.Queued,
            QueuedAtUtc = queuedAtUtc,
            Summary = string.Empty,
        };

        item.StampCreation(actor, queuedAtUtc);
        return item;
    }

    public void Start(string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (Status != AiDecisionJobStatus.Queued)
        {
            throw new InvalidOperationException($"Only queued jobs can start. Current status: {Status}.");
        }

        Status = AiDecisionJobStatus.Running;
        StartedAtUtc = startedAtUtc;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void CompleteSucceeded(string actorUserId, DateTimeOffset completedAtUtc, string summary)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = AiDecisionJobStatus.Succeeded;
        CompletedAtUtc = completedAtUtc;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        ErrorCode = null;
        ErrorMessage = null;
        NextAttemptAtUtc = null;
        Touch(actorUserId.Trim(), completedAtUtc);
    }

    public void CompleteFailed(
        string actorUserId,
        DateTimeOffset completedAtUtc,
        string summary,
        string? errorCode,
        string? errorMessage,
        DateTimeOffset? nextAttemptAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = AiDecisionJobStatus.Failed;
        CompletedAtUtc = completedAtUtc;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        ErrorCode = string.IsNullOrWhiteSpace(errorCode) ? null : errorCode.Trim();
        ErrorMessage = string.IsNullOrWhiteSpace(errorMessage) ? null : errorMessage.Trim();
        NextAttemptAtUtc = nextAttemptAtUtc;
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class AiDecisionResult : AuditableEntity
{
    private AiDecisionResult() { }

    public Guid DecisionRequestId { get; private set; }
    public string Verdict { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public decimal Confidence { get; private set; }
    public decimal FalsePositiveRisk { get; private set; }
    public string ReviewPriority { get; private set; } = string.Empty;
    public bool ShouldPromoteToIndicator { get; private set; }
    public bool ShouldSuppress { get; private set; }
    public bool ShouldAllowlist { get; private set; }
    public bool ShouldEscalate { get; private set; }
    public string ReasonsJson { get; private set; } = "[]";
    public string ProvenanceJson { get; private set; } = "[]";
    public string NextBestEvidenceJson { get; private set; } = "[]";
    public string? AbstainReason { get; private set; }
    public string? ModelVersion { get; private set; }
    public string? DatasetVersion { get; private set; }
    public DateTimeOffset ScoredAtUtc { get; private set; }
    public string RawPayloadJson { get; private set; } = string.Empty;

    public static AiDecisionResult Create(
        Guid decisionRequestId,
        string verdict,
        string action,
        decimal confidence,
        decimal falsePositiveRisk,
        string reviewPriority,
        bool shouldPromoteToIndicator,
        bool shouldSuppress,
        bool shouldAllowlist,
        bool shouldEscalate,
        string reasonsJson,
        string provenanceJson,
        string nextBestEvidenceJson,
        string? abstainReason,
        string? modelVersion,
        string? datasetVersion,
        DateTimeOffset scoredAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(verdict);
        ArgumentException.ThrowIfNullOrWhiteSpace(action);
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewPriority);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiDecisionResult
        {
            DecisionRequestId = decisionRequestId,
            Verdict = verdict.Trim(),
            Action = action.Trim(),
            Confidence = confidence,
            FalsePositiveRisk = falsePositiveRisk,
            ReviewPriority = reviewPriority.Trim(),
            ShouldPromoteToIndicator = shouldPromoteToIndicator,
            ShouldSuppress = shouldSuppress,
            ShouldAllowlist = shouldAllowlist,
            ShouldEscalate = shouldEscalate,
            ReasonsJson = string.IsNullOrWhiteSpace(reasonsJson) ? "[]" : reasonsJson,
            ProvenanceJson = string.IsNullOrWhiteSpace(provenanceJson) ? "[]" : provenanceJson,
            NextBestEvidenceJson = string.IsNullOrWhiteSpace(nextBestEvidenceJson) ? "[]" : nextBestEvidenceJson,
            AbstainReason = string.IsNullOrWhiteSpace(abstainReason) ? null : abstainReason.Trim(),
            ModelVersion = string.IsNullOrWhiteSpace(modelVersion) ? null : modelVersion.Trim(),
            DatasetVersion = string.IsNullOrWhiteSpace(datasetVersion) ? null : datasetVersion.Trim(),
            ScoredAtUtc = scoredAtUtc,
            RawPayloadJson = rawPayloadJson,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void Update(
        string verdict,
        string action,
        decimal confidence,
        decimal falsePositiveRisk,
        string reviewPriority,
        bool shouldPromoteToIndicator,
        bool shouldSuppress,
        bool shouldAllowlist,
        bool shouldEscalate,
        string reasonsJson,
        string provenanceJson,
        string nextBestEvidenceJson,
        string? abstainReason,
        string? modelVersion,
        string? datasetVersion,
        DateTimeOffset scoredAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Verdict = verdict.Trim();
        Action = action.Trim();
        Confidence = confidence;
        FalsePositiveRisk = falsePositiveRisk;
        ReviewPriority = reviewPriority.Trim();
        ShouldPromoteToIndicator = shouldPromoteToIndicator;
        ShouldSuppress = shouldSuppress;
        ShouldAllowlist = shouldAllowlist;
        ShouldEscalate = shouldEscalate;
        ReasonsJson = string.IsNullOrWhiteSpace(reasonsJson) ? "[]" : reasonsJson;
        ProvenanceJson = string.IsNullOrWhiteSpace(provenanceJson) ? "[]" : provenanceJson;
        NextBestEvidenceJson = string.IsNullOrWhiteSpace(nextBestEvidenceJson) ? "[]" : nextBestEvidenceJson;
        AbstainReason = string.IsNullOrWhiteSpace(abstainReason) ? null : abstainReason.Trim();
        ModelVersion = string.IsNullOrWhiteSpace(modelVersion) ? null : modelVersion.Trim();
        DatasetVersion = string.IsNullOrWhiteSpace(datasetVersion) ? null : datasetVersion.Trim();
        ScoredAtUtc = scoredAtUtc;
        RawPayloadJson = rawPayloadJson;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AiDecisionExplanation : AuditableEntity
{
    private AiDecisionExplanation() { }

    public Guid DecisionRequestId { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string DecisionState { get; private set; } = string.Empty;
    public string RecommendedAction { get; private set; } = string.Empty;
    public string RationaleJson { get; private set; } = "[]";
    public string CitationsJson { get; private set; } = "[]";
    public string NextBestEvidenceJson { get; private set; } = "[]";
    public string? PolicyVersion { get; private set; }
    public string? ModelVersion { get; private set; }
    public string? DatasetVersion { get; private set; }
    public DateTimeOffset GeneratedAtUtc { get; private set; }
    public string RawPayloadJson { get; private set; } = string.Empty;

    public static AiDecisionExplanation Create(
        Guid decisionRequestId,
        string summary,
        string decisionState,
        string recommendedAction,
        string rationaleJson,
        string citationsJson,
        string nextBestEvidenceJson,
        string? policyVersion,
        string? modelVersion,
        string? datasetVersion,
        DateTimeOffset generatedAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(decisionState);
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendedAction);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiDecisionExplanation
        {
            DecisionRequestId = decisionRequestId,
            Summary = summary.Trim(),
            DecisionState = decisionState.Trim(),
            RecommendedAction = recommendedAction.Trim(),
            RationaleJson = string.IsNullOrWhiteSpace(rationaleJson) ? "[]" : rationaleJson,
            CitationsJson = string.IsNullOrWhiteSpace(citationsJson) ? "[]" : citationsJson,
            NextBestEvidenceJson = string.IsNullOrWhiteSpace(nextBestEvidenceJson) ? "[]" : nextBestEvidenceJson,
            PolicyVersion = string.IsNullOrWhiteSpace(policyVersion) ? null : policyVersion.Trim(),
            ModelVersion = string.IsNullOrWhiteSpace(modelVersion) ? null : modelVersion.Trim(),
            DatasetVersion = string.IsNullOrWhiteSpace(datasetVersion) ? null : datasetVersion.Trim(),
            GeneratedAtUtc = generatedAtUtc,
            RawPayloadJson = rawPayloadJson,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void Update(
        string summary,
        string decisionState,
        string recommendedAction,
        string rationaleJson,
        string citationsJson,
        string nextBestEvidenceJson,
        string? policyVersion,
        string? modelVersion,
        string? datasetVersion,
        DateTimeOffset generatedAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Summary = summary.Trim();
        DecisionState = decisionState.Trim();
        RecommendedAction = recommendedAction.Trim();
        RationaleJson = string.IsNullOrWhiteSpace(rationaleJson) ? "[]" : rationaleJson;
        CitationsJson = string.IsNullOrWhiteSpace(citationsJson) ? "[]" : citationsJson;
        NextBestEvidenceJson = string.IsNullOrWhiteSpace(nextBestEvidenceJson) ? "[]" : nextBestEvidenceJson;
        PolicyVersion = string.IsNullOrWhiteSpace(policyVersion) ? null : policyVersion.Trim();
        ModelVersion = string.IsNullOrWhiteSpace(modelVersion) ? null : modelVersion.Trim();
        DatasetVersion = string.IsNullOrWhiteSpace(datasetVersion) ? null : datasetVersion.Trim();
        GeneratedAtUtc = generatedAtUtc;
        RawPayloadJson = rawPayloadJson;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AiActionPlanRecommendation : AuditableEntity
{
    private AiActionPlanRecommendation() { }

    public Guid DecisionRequestId { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string RecommendedActionsJson { get; private set; } = "[]";
    public string PrerequisitesJson { get; private set; } = "[]";
    public string CautionsJson { get; private set; } = "[]";
    public bool NeverAutoExecutes { get; private set; }
    public bool PolicyConstrained { get; private set; }
    public bool EvidenceBased { get; private set; }
    public DateTimeOffset GeneratedAtUtc { get; private set; }
    public string RawPayloadJson { get; private set; } = string.Empty;

    public static AiActionPlanRecommendation Create(
        Guid decisionRequestId,
        string summary,
        string recommendedActionsJson,
        string prerequisitesJson,
        string cautionsJson,
        bool neverAutoExecutes,
        bool policyConstrained,
        bool evidenceBased,
        DateTimeOffset generatedAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiActionPlanRecommendation
        {
            DecisionRequestId = decisionRequestId,
            Summary = summary.Trim(),
            RecommendedActionsJson = string.IsNullOrWhiteSpace(recommendedActionsJson) ? "[]" : recommendedActionsJson,
            PrerequisitesJson = string.IsNullOrWhiteSpace(prerequisitesJson) ? "[]" : prerequisitesJson,
            CautionsJson = string.IsNullOrWhiteSpace(cautionsJson) ? "[]" : cautionsJson,
            NeverAutoExecutes = neverAutoExecutes,
            PolicyConstrained = policyConstrained,
            EvidenceBased = evidenceBased,
            GeneratedAtUtc = generatedAtUtc,
            RawPayloadJson = rawPayloadJson,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void Update(
        string summary,
        string recommendedActionsJson,
        string prerequisitesJson,
        string cautionsJson,
        bool neverAutoExecutes,
        bool policyConstrained,
        bool evidenceBased,
        DateTimeOffset generatedAtUtc,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Summary = summary.Trim();
        RecommendedActionsJson = string.IsNullOrWhiteSpace(recommendedActionsJson) ? "[]" : recommendedActionsJson;
        PrerequisitesJson = string.IsNullOrWhiteSpace(prerequisitesJson) ? "[]" : prerequisitesJson;
        CautionsJson = string.IsNullOrWhiteSpace(cautionsJson) ? "[]" : cautionsJson;
        NeverAutoExecutes = neverAutoExecutes;
        PolicyConstrained = policyConstrained;
        EvidenceBased = evidenceBased;
        GeneratedAtUtc = generatedAtUtc;
        RawPayloadJson = rawPayloadJson;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AiDecisionOverride : AuditableEntity
{
    private AiDecisionOverride() { }

    public Guid DecisionRequestId { get; private set; }
    public AiAnalystActionType ActionType { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public string? OverrideVerdict { get; private set; }
    public string? ClosureDisposition { get; private set; }
    public bool IsFinal { get; private set; }
    public string PreviousStatus { get; private set; } = string.Empty;
    public string NewStatus { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset SubmittedAtUtc { get; private set; }

    public static AiDecisionOverride Create(
        Guid decisionRequestId,
        AiAnalystActionType actionType,
        string reason,
        string? notes,
        string? overrideVerdict,
        string? closureDisposition,
        bool isFinal,
        string previousStatus,
        string newStatus,
        string submittedByUserId,
        DateTimeOffset submittedAtUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        ArgumentException.ThrowIfNullOrWhiteSpace(previousStatus);
        ArgumentException.ThrowIfNullOrWhiteSpace(newStatus);
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);

        var actor = submittedByUserId.Trim();
        var item = new AiDecisionOverride
        {
            DecisionRequestId = decisionRequestId,
            ActionType = actionType,
            Reason = reason.Trim(),
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            OverrideVerdict = string.IsNullOrWhiteSpace(overrideVerdict) ? null : overrideVerdict.Trim(),
            ClosureDisposition = string.IsNullOrWhiteSpace(closureDisposition) ? null : closureDisposition.Trim(),
            IsFinal = isFinal,
            PreviousStatus = previousStatus.Trim(),
            NewStatus = newStatus.Trim(),
            SubmittedByUserId = actor,
            SubmittedAtUtc = submittedAtUtc,
        };

        item.StampCreation(actor, submittedAtUtc);
        return item;
    }
}

public sealed class AiDecisionSimilarDetection : AuditableEntity
{
    private AiDecisionSimilarDetection() { }

    public Guid DecisionRequestId { get; private set; }
    public string DetectionId { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string RuleId { get; private set; } = string.Empty;
    public string RelationType { get; private set; } = string.Empty;
    public DateTimeOffset ObservedAtUtc { get; private set; }
    public decimal Confidence { get; private set; }
    public decimal SimilarityScore { get; private set; }
    public string SimilarityReasonsJson { get; private set; } = "[]";
    public string PriorVerdictsJson { get; private set; } = "[]";
    public string PriorAcceptedActionsJson { get; private set; } = "[]";
    public string PriorOutcomesJson { get; private set; } = "[]";
    public int Rank { get; private set; }

    public static AiDecisionSimilarDetection Create(
        Guid decisionRequestId,
        string detectionId,
        string ruleFamily,
        string ruleId,
        string relationType,
        DateTimeOffset observedAtUtc,
        decimal confidence,
        decimal similarityScore,
        string similarityReasonsJson,
        string priorVerdictsJson,
        string priorAcceptedActionsJson,
        string priorOutcomesJson,
        int rank,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(detectionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleId);
        ArgumentException.ThrowIfNullOrWhiteSpace(relationType);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiDecisionSimilarDetection
        {
            DecisionRequestId = decisionRequestId,
            DetectionId = detectionId.Trim(),
            RuleFamily = ruleFamily.Trim().ToLowerInvariant(),
            RuleId = ruleId.Trim(),
            RelationType = relationType.Trim(),
            ObservedAtUtc = observedAtUtc,
            Confidence = confidence,
            SimilarityScore = similarityScore,
            SimilarityReasonsJson = string.IsNullOrWhiteSpace(similarityReasonsJson) ? "[]" : similarityReasonsJson,
            PriorVerdictsJson = string.IsNullOrWhiteSpace(priorVerdictsJson) ? "[]" : priorVerdictsJson,
            PriorAcceptedActionsJson = string.IsNullOrWhiteSpace(priorAcceptedActionsJson) ? "[]" : priorAcceptedActionsJson,
            PriorOutcomesJson = string.IsNullOrWhiteSpace(priorOutcomesJson) ? "[]" : priorOutcomesJson,
            Rank = rank,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }
}

public sealed class AiDecisionEvidenceSource : AuditableEntity
{
    private AiDecisionEvidenceSource() { }

    public Guid DecisionRequestId { get; private set; }
    public string Channel { get; private set; } = string.Empty;
    public string Source { get; private set; } = string.Empty;
    public string? EvidenceId { get; private set; }
    public string? Reference { get; private set; }
    public string Category { get; private set; } = string.Empty;
    public string Polarity { get; private set; } = string.Empty;
    public decimal? Confidence { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string Anchor { get; private set; } = string.Empty;
    public int Rank { get; private set; }

    public static AiDecisionEvidenceSource Create(
        Guid decisionRequestId,
        string channel,
        string source,
        string? evidenceId,
        string? reference,
        string category,
        string polarity,
        decimal? confidence,
        string summary,
        string anchor,
        int rank,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (decisionRequestId == Guid.Empty)
        {
            throw new ArgumentException("Decision request id is required.", nameof(decisionRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(channel);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(polarity);
        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(anchor);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiDecisionEvidenceSource
        {
            DecisionRequestId = decisionRequestId,
            Channel = channel.Trim(),
            Source = source.Trim(),
            EvidenceId = string.IsNullOrWhiteSpace(evidenceId) ? null : evidenceId.Trim(),
            Reference = string.IsNullOrWhiteSpace(reference) ? null : reference.Trim(),
            Category = category.Trim(),
            Polarity = polarity.Trim(),
            Confidence = confidence,
            Summary = summary.Trim(),
            Anchor = anchor.Trim(),
            Rank = rank,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }
}

