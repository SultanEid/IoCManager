using Backend.Domain.Common;

namespace Backend.Domain.AiAdjudication;

public enum AiAdjudicationStatus
{
    Queued = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Overridden = 5,
    Closed = 6,
}

public enum AiAdjudicationJobStatus
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

public sealed class AiAdjudicationRequest : AuditableEntity
{
    private AiAdjudicationRequest() { }

    public string CaseId { get; private set; } = string.Empty;
    public string DetectionId { get; private set; } = string.Empty;
    public string IocType { get; private set; } = string.Empty;
    public string IocValue { get; private set; } = string.Empty;
    public DateTimeOffset ObservedAtUtc { get; private set; }
    public string DetectionPackageJson { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;
    public AiAdjudicationStatus Status { get; private set; } = AiAdjudicationStatus.Queued;
    public DateTimeOffset SubmittedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string? FailureCode { get; private set; }
    public string? FailureMessage { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public string? ModelVersion { get; private set; }
    public string? DatasetVersion { get; private set; }

    public static AiAdjudicationRequest Queue(
        string caseId,
        string detectionId,
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
        var item = new AiAdjudicationRequest
        {
            CaseId = caseId.Trim(),
            DetectionId = detectionId.Trim(),
            IocType = iocType.Trim().ToLowerInvariant(),
            IocValue = iocValue.Trim(),
            ObservedAtUtc = observedAtUtc,
            DetectionPackageJson = detectionPackageJson,
            SubmittedByUserId = actor,
            Status = AiAdjudicationStatus.Queued,
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

        if (Status != AiAdjudicationStatus.Queued)
        {
            throw new InvalidOperationException($"Only queued adjudications can start. Current status: {Status}.");
        }

        Status = AiAdjudicationStatus.Running;
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

        Status = AiAdjudicationStatus.Queued;
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

        Status = AiAdjudicationStatus.Completed;
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

        Status = AiAdjudicationStatus.Failed;
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
            AiAnalystActionType.Override => AiAdjudicationStatus.Overridden,
            AiAnalystActionType.Close => AiAdjudicationStatus.Closed,
            _ => throw new ArgumentOutOfRangeException(nameof(actionType), $"Unsupported action type '{actionType}'."),
        };
        CompletedAtUtc ??= nowUtc;
        FailureMessage = string.IsNullOrWhiteSpace(failureMessage) ? FailureMessage : failureMessage.Trim();
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AiAdjudicationJob : AuditableEntity
{
    private AiAdjudicationJob() { }

    public Guid AdjudicationRequestId { get; private set; }
    public int AttemptNumber { get; private set; }
    public AiAdjudicationJobStatus Status { get; private set; } = AiAdjudicationJobStatus.Queued;
    public DateTimeOffset QueuedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }

    public static AiAdjudicationJob Queue(Guid adjudicationRequestId, int attemptNumber, DateTimeOffset queuedAtUtc, string actorUserId)
    {
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        if (attemptNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Attempt number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiAdjudicationJob
        {
            AdjudicationRequestId = adjudicationRequestId,
            AttemptNumber = attemptNumber,
            Status = AiAdjudicationJobStatus.Queued,
            QueuedAtUtc = queuedAtUtc,
            Summary = string.Empty,
        };

        item.StampCreation(actor, queuedAtUtc);
        return item;
    }

    public void Start(string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (Status != AiAdjudicationJobStatus.Queued)
        {
            throw new InvalidOperationException($"Only queued jobs can start. Current status: {Status}.");
        }

        Status = AiAdjudicationJobStatus.Running;
        StartedAtUtc = startedAtUtc;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void CompleteSucceeded(string actorUserId, DateTimeOffset completedAtUtc, string summary)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = AiAdjudicationJobStatus.Succeeded;
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

        Status = AiAdjudicationJobStatus.Failed;
        CompletedAtUtc = completedAtUtc;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        ErrorCode = string.IsNullOrWhiteSpace(errorCode) ? null : errorCode.Trim();
        ErrorMessage = string.IsNullOrWhiteSpace(errorMessage) ? null : errorMessage.Trim();
        NextAttemptAtUtc = nextAttemptAtUtc;
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class AiAdjudicationResult : AuditableEntity
{
    private AiAdjudicationResult() { }

    public Guid AdjudicationRequestId { get; private set; }
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

    public static AiAdjudicationResult Create(
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(verdict);
        ArgumentException.ThrowIfNullOrWhiteSpace(action);
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewPriority);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiAdjudicationResult
        {
            AdjudicationRequestId = adjudicationRequestId,
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

public sealed class AiAdjudicationExplanation : AuditableEntity
{
    private AiAdjudicationExplanation() { }

    public Guid AdjudicationRequestId { get; private set; }
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

    public static AiAdjudicationExplanation Create(
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(decisionState);
        ArgumentException.ThrowIfNullOrWhiteSpace(recommendedAction);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiAdjudicationExplanation
        {
            AdjudicationRequestId = adjudicationRequestId,
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

    public Guid AdjudicationRequestId { get; private set; }
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
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawPayloadJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiActionPlanRecommendation
        {
            AdjudicationRequestId = adjudicationRequestId,
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

public sealed class AiAdjudicationOverride : AuditableEntity
{
    private AiAdjudicationOverride() { }

    public Guid AdjudicationRequestId { get; private set; }
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

    public static AiAdjudicationOverride Create(
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        ArgumentException.ThrowIfNullOrWhiteSpace(previousStatus);
        ArgumentException.ThrowIfNullOrWhiteSpace(newStatus);
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);

        var actor = submittedByUserId.Trim();
        var item = new AiAdjudicationOverride
        {
            AdjudicationRequestId = adjudicationRequestId,
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

public sealed class AiAdjudicationSimilarDetection : AuditableEntity
{
    private AiAdjudicationSimilarDetection() { }

    public Guid AdjudicationRequestId { get; private set; }
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

    public static AiAdjudicationSimilarDetection Create(
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(detectionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleId);
        ArgumentException.ThrowIfNullOrWhiteSpace(relationType);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiAdjudicationSimilarDetection
        {
            AdjudicationRequestId = adjudicationRequestId,
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

public sealed class AiAdjudicationEvidenceSource : AuditableEntity
{
    private AiAdjudicationEvidenceSource() { }

    public Guid AdjudicationRequestId { get; private set; }
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

    public static AiAdjudicationEvidenceSource Create(
        Guid adjudicationRequestId,
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
        if (adjudicationRequestId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication request id is required.", nameof(adjudicationRequestId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(channel);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(polarity);
        ArgumentException.ThrowIfNullOrWhiteSpace(summary);
        ArgumentException.ThrowIfNullOrWhiteSpace(anchor);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new AiAdjudicationEvidenceSource
        {
            AdjudicationRequestId = adjudicationRequestId,
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
