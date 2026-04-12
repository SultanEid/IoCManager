using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class ScanPlan : AuditableEntity
{
    private ScanPlan() { }

    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public ScannerCapability ScannerCapability { get; private set; } = ScannerCapability.Yara;
    public ScanRuleSelectionMode RuleSelectionMode { get; private set; } = ScanRuleSelectionMode.RuleSet;
    public RuleScopeType? RuleScopeType { get; private set; }
    public string? RuleScopeValue { get; private set; }
    public ScanCadenceType CadenceType { get; private set; } = ScanCadenceType.Manual;
    public int? IntervalMinutes { get; private set; }
    public int? RunAtHourUtc { get; private set; }
    public int? RunAtMinuteUtc { get; private set; }
    public int? WeeklyDayOfWeek { get; private set; }
    public string OperatorNotes { get; private set; } = string.Empty;
    public DateTimeOffset? NextRunAtUtc { get; private set; }
    public DateTimeOffset? LastQueuedAtUtc { get; private set; }
    public ScanPlanStatus Status { get; private set; } = ScanPlanStatus.Draft;

    public static ScanPlan Create(
        string name,
        string description,
        ScannerCapability scannerCapability,
        ScanRuleSelectionMode ruleSelectionMode,
        RuleScopeType? ruleScopeType,
        string? ruleScopeValue,
        ScanCadenceType cadenceType,
        int? intervalMinutes,
        int? runAtHourUtc,
        int? runAtMinuteUtc,
        int? weeklyDayOfWeek,
        string? operatorNotes,
        ScanPlanStatus status,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ValidateRuleSelection(ruleSelectionMode, ruleScopeType, ruleScopeValue);
        ValidateCadence(cadenceType, intervalMinutes, runAtHourUtc, runAtMinuteUtc, weeklyDayOfWeek);

        var actor = actorUserId.Trim();
        var entity = new ScanPlan
        {
            Name = name.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? string.Empty : description.Trim(),
            ScannerCapability = scannerCapability,
            RuleSelectionMode = ruleSelectionMode,
            RuleScopeType = ruleScopeType,
            RuleScopeValue = string.IsNullOrWhiteSpace(ruleScopeValue) ? null : ruleScopeValue.Trim(),
            CadenceType = cadenceType,
            IntervalMinutes = cadenceType == ScanCadenceType.Interval ? intervalMinutes : null,
            RunAtHourUtc = cadenceType is ScanCadenceType.Daily or ScanCadenceType.Weekly ? runAtHourUtc : null,
            RunAtMinuteUtc = cadenceType is ScanCadenceType.Daily or ScanCadenceType.Weekly ? runAtMinuteUtc : null,
            WeeklyDayOfWeek = cadenceType == ScanCadenceType.Weekly ? weeklyDayOfWeek : null,
            OperatorNotes = string.IsNullOrWhiteSpace(operatorNotes) ? string.Empty : operatorNotes.Trim(),
            Status = status,
            NextRunAtUtc = ResolveInitialNextRunAtUtc(status, cadenceType, intervalMinutes, runAtHourUtc, runAtMinuteUtc, weeklyDayOfWeek, nowUtc),
            LastQueuedAtUtc = null,
        };

        entity.StampCreation(actor, nowUtc);
        return entity;
    }

    public void Update(
        string name,
        string description,
        ScannerCapability scannerCapability,
        ScanRuleSelectionMode ruleSelectionMode,
        RuleScopeType? ruleScopeType,
        string? ruleScopeValue,
        ScanCadenceType cadenceType,
        int? intervalMinutes,
        int? runAtHourUtc,
        int? runAtMinuteUtc,
        int? weeklyDayOfWeek,
        string? operatorNotes,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ValidateRuleSelection(ruleSelectionMode, ruleScopeType, ruleScopeValue);
        ValidateCadence(cadenceType, intervalMinutes, runAtHourUtc, runAtMinuteUtc, weeklyDayOfWeek);

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? string.Empty : description.Trim();
        ScannerCapability = scannerCapability;
        RuleSelectionMode = ruleSelectionMode;
        RuleScopeType = ruleScopeType;
        RuleScopeValue = string.IsNullOrWhiteSpace(ruleScopeValue) ? null : ruleScopeValue.Trim();
        CadenceType = cadenceType;
        IntervalMinutes = cadenceType == ScanCadenceType.Interval ? intervalMinutes : null;
        RunAtHourUtc = cadenceType is ScanCadenceType.Daily or ScanCadenceType.Weekly ? runAtHourUtc : null;
        RunAtMinuteUtc = cadenceType is ScanCadenceType.Daily or ScanCadenceType.Weekly ? runAtMinuteUtc : null;
        WeeklyDayOfWeek = cadenceType == ScanCadenceType.Weekly ? weeklyDayOfWeek : null;
        OperatorNotes = string.IsNullOrWhiteSpace(operatorNotes) ? string.Empty : operatorNotes.Trim();

        if (Status == ScanPlanStatus.Active)
        {
            NextRunAtUtc = ResolveNextRunAtUtc(nowUtc);
        }

        Touch(actorUserId.Trim(), nowUtc);
    }

    public void SetStatus(ScanPlanStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Status = status;
        NextRunAtUtc = status == ScanPlanStatus.Active ? ResolveNextRunAtUtc(nowUtc) : null;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void MarkQueued(string actorUserId, DateTimeOffset queuedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        LastQueuedAtUtc = queuedAtUtc;
        NextRunAtUtc = ResolveNextRunAtUtc(queuedAtUtc);
        Touch(actorUserId.Trim(), queuedAtUtc);
    }

    public DateTimeOffset? ResolveNextRunAtUtc(DateTimeOffset referenceUtc)
    {
        if (Status != ScanPlanStatus.Active)
        {
            return null;
        }

        return CadenceType switch
        {
            ScanCadenceType.Manual => null,
            ScanCadenceType.Interval => ResolveIntervalNextRun(referenceUtc),
            ScanCadenceType.Daily => ResolveDailyNextRun(referenceUtc),
            ScanCadenceType.Weekly => ResolveWeeklyNextRun(referenceUtc),
            _ => null,
        };
    }

    private static DateTimeOffset? ResolveInitialNextRunAtUtc(
        ScanPlanStatus status,
        ScanCadenceType cadenceType,
        int? intervalMinutes,
        int? runAtHourUtc,
        int? runAtMinuteUtc,
        int? weeklyDayOfWeek,
        DateTimeOffset nowUtc)
    {
        if (status != ScanPlanStatus.Active)
        {
            return null;
        }

        return cadenceType switch
        {
            ScanCadenceType.Manual => null,
            ScanCadenceType.Interval => nowUtc.AddMinutes(intervalMinutes ?? 1),
            ScanCadenceType.Daily => BuildNextUtcDaily(nowUtc, runAtHourUtc ?? 0, runAtMinuteUtc ?? 0),
            ScanCadenceType.Weekly => BuildNextUtcWeekly(nowUtc, weeklyDayOfWeek ?? 0, runAtHourUtc ?? 0, runAtMinuteUtc ?? 0),
            _ => null,
        };
    }

    private DateTimeOffset? ResolveIntervalNextRun(DateTimeOffset referenceUtc)
    {
        var interval = IntervalMinutes ?? 1;
        var baseTime = LastQueuedAtUtc ?? referenceUtc;
        var next = baseTime.AddMinutes(interval);
        return next <= referenceUtc ? referenceUtc.AddMinutes(interval) : next;
    }

    private DateTimeOffset? ResolveDailyNextRun(DateTimeOffset referenceUtc)
    {
        return BuildNextUtcDaily(referenceUtc, RunAtHourUtc ?? 0, RunAtMinuteUtc ?? 0);
    }

    private DateTimeOffset? ResolveWeeklyNextRun(DateTimeOffset referenceUtc)
    {
        return BuildNextUtcWeekly(referenceUtc, WeeklyDayOfWeek ?? 0, RunAtHourUtc ?? 0, RunAtMinuteUtc ?? 0);
    }

    private static DateTimeOffset BuildNextUtcDaily(DateTimeOffset referenceUtc, int hour, int minute)
    {
        var candidate = new DateTimeOffset(referenceUtc.Year, referenceUtc.Month, referenceUtc.Day, hour, minute, 0, TimeSpan.Zero);
        if (candidate <= referenceUtc)
        {
            candidate = candidate.AddDays(1);
        }

        return candidate;
    }

    private static DateTimeOffset BuildNextUtcWeekly(DateTimeOffset referenceUtc, int dayOfWeek, int hour, int minute)
    {
        var desired = (DayOfWeek)dayOfWeek;
        var daysToAdd = ((int)desired - (int)referenceUtc.DayOfWeek + 7) % 7;
        var candidateDate = referenceUtc.Date.AddDays(daysToAdd);
        var candidate = new DateTimeOffset(candidateDate.Year, candidateDate.Month, candidateDate.Day, hour, minute, 0, TimeSpan.Zero);

        if (candidate <= referenceUtc)
        {
            candidate = candidate.AddDays(7);
        }

        return candidate;
    }

    private static void ValidateRuleSelection(
        ScanRuleSelectionMode ruleSelectionMode,
        RuleScopeType? ruleScopeType,
        string? ruleScopeValue)
    {
        if (ruleSelectionMode == ScanRuleSelectionMode.RuleSet)
        {
            if (ruleScopeType.HasValue || !string.IsNullOrWhiteSpace(ruleScopeValue))
            {
                throw new ArgumentException("Rule scope fields are not allowed when rule selection mode is RuleSet.");
            }

            return;
        }

        if (!ruleScopeType.HasValue)
        {
            throw new ArgumentException("Rule scope type is required when rule selection mode is RuleScope.");
        }

        if (ruleScopeType != IocManager.RuleScopeType.Global && string.IsNullOrWhiteSpace(ruleScopeValue))
        {
            throw new ArgumentException("Rule scope value is required for non-global rule scopes.");
        }
    }

    private static void ValidateCadence(
        ScanCadenceType cadenceType,
        int? intervalMinutes,
        int? runAtHourUtc,
        int? runAtMinuteUtc,
        int? weeklyDayOfWeek)
    {
        if (runAtHourUtc is < 0 or > 23)
        {
            throw new ArgumentOutOfRangeException(nameof(runAtHourUtc), "RunAtHourUtc must be between 0 and 23.");
        }

        if (runAtMinuteUtc is < 0 or > 59)
        {
            throw new ArgumentOutOfRangeException(nameof(runAtMinuteUtc), "RunAtMinuteUtc must be between 0 and 59.");
        }

        if (weeklyDayOfWeek is < 0 or > 6)
        {
            throw new ArgumentOutOfRangeException(nameof(weeklyDayOfWeek), "WeeklyDayOfWeek must be between 0 (Sunday) and 6 (Saturday).");
        }

        switch (cadenceType)
        {
            case ScanCadenceType.Manual:
                if (intervalMinutes.HasValue || runAtHourUtc.HasValue || runAtMinuteUtc.HasValue || weeklyDayOfWeek.HasValue)
                {
                    throw new ArgumentException("Manual cadence does not allow interval/hour/minute/day fields.");
                }
                break;
            case ScanCadenceType.Interval:
                if (!intervalMinutes.HasValue || intervalMinutes is < 1 or > 10080)
                {
                    throw new ArgumentOutOfRangeException(nameof(intervalMinutes), "IntervalMinutes must be between 1 and 10080.");
                }

                if (runAtHourUtc.HasValue || runAtMinuteUtc.HasValue || weeklyDayOfWeek.HasValue)
                {
                    throw new ArgumentException("Interval cadence only allows IntervalMinutes.");
                }
                break;
            case ScanCadenceType.Daily:
                if (intervalMinutes.HasValue || !runAtHourUtc.HasValue || !runAtMinuteUtc.HasValue || weeklyDayOfWeek.HasValue)
                {
                    throw new ArgumentException("Daily cadence requires RunAtHourUtc and RunAtMinuteUtc only.");
                }
                break;
            case ScanCadenceType.Weekly:
                if (intervalMinutes.HasValue || !runAtHourUtc.HasValue || !runAtMinuteUtc.HasValue || !weeklyDayOfWeek.HasValue)
                {
                    throw new ArgumentException("Weekly cadence requires WeeklyDayOfWeek, RunAtHourUtc, and RunAtMinuteUtc.");
                }
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(cadenceType), "Unsupported cadence type.");
        }
    }
}

public sealed class ScanPlanTargetServer : Entity
{
    private ScanPlanTargetServer() { }

    public Guid ScanPlanId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public string AddedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; private set; }

    public static ScanPlanTargetServer Create(Guid scanPlanId, Guid targetServerId, string actorUserId, DateTimeOffset nowUtc)
    {
        if (scanPlanId == Guid.Empty)
        {
            throw new ArgumentException("Scan plan id is required.", nameof(scanPlanId));
        }

        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        return new ScanPlanTargetServer
        {
            ScanPlanId = scanPlanId,
            TargetServerId = targetServerId,
            AddedByUserId = actorUserId.Trim(),
            AddedAtUtc = nowUtc,
        };
    }
}

public sealed class ScanPlanRuleRevision : Entity
{
    private ScanPlanRuleRevision() { }

    public Guid ScanPlanId { get; private set; }
    public Guid RuleRevisionId { get; private set; }
    public string AddedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; private set; }

    public static ScanPlanRuleRevision Create(Guid scanPlanId, Guid ruleRevisionId, string actorUserId, DateTimeOffset nowUtc)
    {
        if (scanPlanId == Guid.Empty)
        {
            throw new ArgumentException("Scan plan id is required.", nameof(scanPlanId));
        }

        if (ruleRevisionId == Guid.Empty)
        {
            throw new ArgumentException("Rule revision id is required.", nameof(ruleRevisionId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        return new ScanPlanRuleRevision
        {
            ScanPlanId = scanPlanId,
            RuleRevisionId = ruleRevisionId,
            AddedByUserId = actorUserId.Trim(),
            AddedAtUtc = nowUtc,
        };
    }
}

public sealed class ScanJob : AuditableEntity
{
    private ScanJob() { }

    public Guid? ScanPlanId { get; private set; }
    public string TriggerSource { get; private set; } = string.Empty;
    public ScanJobStatus Status { get; private set; } = ScanJobStatus.Queued;
    public DateTimeOffset QueuedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string TriggeredByUserId { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public bool CancellationRequested { get; private set; }
    public DateTimeOffset? CancellationRequestedAtUtc { get; private set; }
    public string? CancellationReason { get; private set; }

    public static ScanJob Queue(Guid? scanPlanId, string triggerSource, string triggeredByUserId, DateTimeOffset queuedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(triggerSource);
        ArgumentException.ThrowIfNullOrWhiteSpace(triggeredByUserId);

        var actor = triggeredByUserId.Trim();

        var item = new ScanJob
        {
            ScanPlanId = scanPlanId,
            TriggerSource = triggerSource.Trim(),
            Status = ScanJobStatus.Queued,
            QueuedAtUtc = queuedAtUtc,
            TriggeredByUserId = actor,
            Summary = string.Empty,
            CancellationRequested = false,
            CancellationRequestedAtUtc = null,
            CancellationReason = null,
        };

        item.StampCreation(actor, queuedAtUtc);
        return item;
    }

    public void Start(string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (Status != ScanJobStatus.Queued)
        {
            throw new InvalidOperationException("Only queued jobs can be started.");
        }

        if (CancellationRequested)
        {
            throw new InvalidOperationException("Cancellation was requested for this job.");
        }

        Status = ScanJobStatus.Running;
        StartedAtUtc = startedAtUtc;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void RequestCancellation(string actorUserId, DateTimeOffset nowUtc, string? reason)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (Status is ScanJobStatus.Completed or ScanJobStatus.Failed or ScanJobStatus.Cancelled or ScanJobStatus.PartiallyCompleted)
        {
            return;
        }

        CancellationRequested = true;
        CancellationRequestedAtUtc = nowUtc;
        CancellationReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();

        if (Status == ScanJobStatus.Queued)
        {
            Status = ScanJobStatus.Cancelled;
            CompletedAtUtc = nowUtc;
            Summary = string.IsNullOrWhiteSpace(reason) ? "Cancelled before execution." : reason.Trim();
        }

        Touch(actorUserId.Trim(), nowUtc);
    }

    public void Complete(ScanJobStatus terminalStatus, string summary, string actorUserId, DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (terminalStatus is not (ScanJobStatus.Completed or ScanJobStatus.Failed or ScanJobStatus.Cancelled or ScanJobStatus.PartiallyCompleted))
        {
            throw new ArgumentOutOfRangeException(nameof(terminalStatus), "Scan job terminal state is required.");
        }

        Status = terminalStatus;
        CompletedAtUtc = completedAtUtc;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class ScanJobTargetExecution : AuditableEntity
{
    private ScanJobTargetExecution() { }

    public Guid ScanJobId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public string TargetHostname { get; private set; } = string.Empty;
    public string TargetIpAddress { get; private set; } = string.Empty;
    public Guid? ScannerId { get; private set; }
    public string ScannerName { get; private set; } = string.Empty;
    public ScanJobTargetExecutionStatus Status { get; private set; } = ScanJobTargetExecutionStatus.Queued;
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string? ErrorMessage { get; private set; }

    public static ScanJobTargetExecution QueueSnapshot(
        Guid scanJobId,
        Guid targetServerId,
        string targetHostname,
        string targetIpAddress,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (scanJobId == Guid.Empty)
        {
            throw new ArgumentException("Scan job id is required.", nameof(scanJobId));
        }

        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var item = new ScanJobTargetExecution
        {
            ScanJobId = scanJobId,
            TargetServerId = targetServerId,
            TargetHostname = string.IsNullOrWhiteSpace(targetHostname) ? string.Empty : targetHostname.Trim(),
            TargetIpAddress = string.IsNullOrWhiteSpace(targetIpAddress) ? string.Empty : targetIpAddress.Trim(),
            ScannerId = null,
            ScannerName = string.Empty,
            Status = ScanJobTargetExecutionStatus.Queued,
            StartedAtUtc = null,
            CompletedAtUtc = null,
            Summary = string.Empty,
            ErrorMessage = null,
        };

        item.StampCreation(actor, nowUtc);
        return item;
    }

    public void Start(Guid? scannerId, string? scannerName, string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status != ScanJobTargetExecutionStatus.Queued)
        {
            throw new InvalidOperationException("Only queued target executions can start.");
        }

        ScannerId = scannerId;
        ScannerName = string.IsNullOrWhiteSpace(scannerName) ? string.Empty : scannerName.Trim();
        Status = ScanJobTargetExecutionStatus.Running;
        StartedAtUtc = startedAtUtc;
        CompletedAtUtc = null;
        ErrorMessage = null;
        Summary = string.Empty;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void Complete(
        ScanJobTargetExecutionStatus terminalStatus,
        string? summary,
        string? errorMessage,
        string actorUserId,
        DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (terminalStatus is not (
            ScanJobTargetExecutionStatus.Completed
            or ScanJobTargetExecutionStatus.Failed
            or ScanJobTargetExecutionStatus.Cancelled
            or ScanJobTargetExecutionStatus.PartiallyCompleted))
        {
            throw new ArgumentOutOfRangeException(nameof(terminalStatus), "Target execution terminal state is required.");
        }

        Status = terminalStatus;
        CompletedAtUtc = completedAtUtc;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        ErrorMessage = string.IsNullOrWhiteSpace(errorMessage) ? null : errorMessage.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class JobAttempt : AuditableEntity
{
    private JobAttempt() { }

    public Guid ScanJobId { get; private set; }
    public int AttemptNumber { get; private set; }
    public JobAttemptStatus Status { get; private set; } = JobAttemptStatus.Running;
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string Details { get; private set; } = string.Empty;

    public static JobAttempt Start(Guid scanJobId, int attemptNumber, string actorUserId, DateTimeOffset startedAtUtc)
    {
        if (scanJobId == Guid.Empty)
        {
            throw new ArgumentException("Scan job id is required.", nameof(scanJobId));
        }

        if (attemptNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Attempt number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();

        var item = new JobAttempt
        {
            ScanJobId = scanJobId,
            AttemptNumber = attemptNumber,
            Status = JobAttemptStatus.Running,
            StartedAtUtc = startedAtUtc,
            Details = string.Empty,
        };

        item.StampCreation(actor, startedAtUtc);
        return item;
    }

    public void Complete(JobAttemptStatus status, string details, string actorUserId, DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (status is not (JobAttemptStatus.Succeeded or JobAttemptStatus.Failed))
        {
            throw new ArgumentOutOfRangeException(nameof(status), "Attempt terminal status is required.");
        }

        Status = status;
        CompletedAtUtc = completedAtUtc;
        Details = details.Trim();
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class ScanResult : AuditableEntity
{
    private ScanResult() { }

    public string ScannerFamily { get; private set; } = string.Empty;
    public Guid? ScanJobId { get; private set; }
    public Guid? JobAttemptId { get; private set; }
    public Guid? TargetExecutionId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public Guid? RuleRevisionId { get; private set; }
    public Guid? IocId { get; private set; }
    public ScanResultDisposition Disposition { get; private set; } = ScanResultDisposition.Informational;
    public decimal Confidence { get; private set; }
    public string Fingerprint { get; private set; } = string.Empty;
    public int OccurrenceCount { get; private set; }
    public DateTimeOffset FirstObservedAtUtc { get; private set; }
    public DateTimeOffset LastObservedAtUtc { get; private set; }
    public string EvidenceJson { get; private set; } = string.Empty;
    public string RawSampleJson { get; private set; } = string.Empty;
    public string RawPayloadHash { get; private set; } = string.Empty;
    public bool IsExecutionArtifact { get; private set; }
    public DateTimeOffset ObservedAtUtc { get; private set; }

    public static ScanResult Create(
        string scannerFamily,
        Guid? scanJobId,
        Guid? jobAttemptId,
        Guid? targetExecutionId,
        Guid targetServerId,
        Guid? ruleRevisionId,
        Guid? iocId,
        ScanResultDisposition disposition,
        decimal confidence,
        string fingerprint,
        string evidenceJson,
        string rawSampleJson,
        string rawPayloadHash,
        bool isExecutionArtifact,
        DateTimeOffset observedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(scannerFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(fingerprint);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        var item = new ScanResult
        {
            ScannerFamily = scannerFamily.Trim().ToLowerInvariant(),
            ScanJobId = scanJobId == Guid.Empty ? null : scanJobId,
            JobAttemptId = jobAttemptId,
            TargetExecutionId = targetExecutionId == Guid.Empty ? null : targetExecutionId,
            TargetServerId = targetServerId,
            RuleRevisionId = ruleRevisionId,
            IocId = iocId,
            Disposition = disposition,
            Confidence = confidence,
            Fingerprint = fingerprint.Trim(),
            OccurrenceCount = 1,
            FirstObservedAtUtc = observedAtUtc,
            LastObservedAtUtc = observedAtUtc,
            EvidenceJson = evidenceJson,
            RawSampleJson = rawSampleJson,
            RawPayloadHash = rawPayloadHash,
            IsExecutionArtifact = isExecutionArtifact,
            ObservedAtUtc = observedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void RegisterDuplicate(
        DateTimeOffset observedAtUtc,
        Guid? scanJobId,
        Guid? jobAttemptId,
        Guid? targetExecutionId,
        Guid? iocId,
        string rawSampleJson,
        string rawPayloadHash,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        OccurrenceCount += 1;
        if (observedAtUtc < FirstObservedAtUtc)
        {
            FirstObservedAtUtc = observedAtUtc;
            ObservedAtUtc = observedAtUtc;
        }

        if (observedAtUtc > LastObservedAtUtc)
        {
            LastObservedAtUtc = observedAtUtc;
        }

        if (!ScanJobId.HasValue && scanJobId.HasValue && scanJobId.Value != Guid.Empty)
        {
            ScanJobId = scanJobId.Value;
        }

        if (!JobAttemptId.HasValue && jobAttemptId.HasValue && jobAttemptId.Value != Guid.Empty)
        {
            JobAttemptId = jobAttemptId.Value;
        }

        if (!TargetExecutionId.HasValue && targetExecutionId.HasValue && targetExecutionId.Value != Guid.Empty)
        {
            TargetExecutionId = targetExecutionId.Value;
        }

        if (!IocId.HasValue && iocId.HasValue && iocId.Value != Guid.Empty)
        {
            IocId = iocId.Value;
        }

        RawSampleJson = rawSampleJson;
        RawPayloadHash = rawPayloadHash;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class ScanResultIngestionRun : AuditableEntity
{
    private ScanResultIngestionRun() { }

    public string Source { get; private set; } = string.Empty;
    public int TotalRows { get; private set; }
    public int AcceptedRows { get; private set; }
    public int DeduplicatedRows { get; private set; }
    public int RejectedRows { get; private set; }
    public string RequestPayloadHash { get; private set; } = string.Empty;

    public static ScanResultIngestionRun Start(
        string source,
        int totalRows,
        string requestPayloadHash,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(source);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new ScanResultIngestionRun
        {
            Source = source.Trim().ToLowerInvariant(),
            TotalRows = Math.Max(0, totalRows),
            AcceptedRows = 0,
            DeduplicatedRows = 0,
            RejectedRows = 0,
            RequestPayloadHash = string.IsNullOrWhiteSpace(requestPayloadHash) ? string.Empty : requestPayloadHash.Trim(),
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void Complete(
        int acceptedRows,
        int deduplicatedRows,
        int rejectedRows,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        AcceptedRows = Math.Max(0, acceptedRows);
        DeduplicatedRows = Math.Max(0, deduplicatedRows);
        RejectedRows = Math.Max(0, rejectedRows);
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class ScanResultProvenance : AuditableEntity
{
    private ScanResultProvenance() { }

    public Guid ScanResultId { get; private set; }
    public Guid IngestionRunId { get; private set; }
    public int RowIndex { get; private set; }
    public bool IsDuplicate { get; private set; }
    public DateTimeOffset ObservedAtUtc { get; private set; }
    public string RawPayloadHash { get; private set; } = string.Empty;
    public string RawSampleJson { get; private set; } = string.Empty;
    public string CorrelationMetadataJson { get; private set; } = "{}";
    public Guid? ScanJobId { get; private set; }
    public Guid? JobAttemptId { get; private set; }
    public Guid? TargetExecutionId { get; private set; }

    public static ScanResultProvenance Create(
        Guid scanResultId,
        Guid ingestionRunId,
        int rowIndex,
        bool isDuplicate,
        DateTimeOffset observedAtUtc,
        string rawPayloadHash,
        string rawSampleJson,
        string correlationMetadataJson,
        Guid? scanJobId,
        Guid? jobAttemptId,
        Guid? targetExecutionId,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (scanResultId == Guid.Empty)
        {
            throw new ArgumentException("Scan result id is required.", nameof(scanResultId));
        }

        if (ingestionRunId == Guid.Empty)
        {
            throw new ArgumentException("Ingestion run id is required.", nameof(ingestionRunId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new ScanResultProvenance
        {
            ScanResultId = scanResultId,
            IngestionRunId = ingestionRunId,
            RowIndex = Math.Max(0, rowIndex),
            IsDuplicate = isDuplicate,
            ObservedAtUtc = observedAtUtc,
            RawPayloadHash = string.IsNullOrWhiteSpace(rawPayloadHash) ? string.Empty : rawPayloadHash.Trim(),
            RawSampleJson = string.IsNullOrWhiteSpace(rawSampleJson) ? string.Empty : rawSampleJson,
            CorrelationMetadataJson = string.IsNullOrWhiteSpace(correlationMetadataJson) ? "{}" : correlationMetadataJson,
            ScanJobId = scanJobId == Guid.Empty ? null : scanJobId,
            JobAttemptId = jobAttemptId == Guid.Empty ? null : jobAttemptId,
            TargetExecutionId = targetExecutionId == Guid.Empty ? null : targetExecutionId,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class ScanResultIngestionDiagnostic : AuditableEntity
{
    private ScanResultIngestionDiagnostic() { }

    public Guid IngestionRunId { get; private set; }
    public int RowIndex { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Field { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public string RawSnippetHash { get; private set; } = string.Empty;
    public string RawPayloadJson { get; private set; } = string.Empty;

    public static ScanResultIngestionDiagnostic Create(
        Guid ingestionRunId,
        int rowIndex,
        string code,
        string field,
        string message,
        string rawSnippetHash,
        string rawPayloadJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (ingestionRunId == Guid.Empty)
        {
            throw new ArgumentException("Ingestion run id is required.", nameof(ingestionRunId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new ScanResultIngestionDiagnostic
        {
            IngestionRunId = ingestionRunId,
            RowIndex = Math.Max(0, rowIndex),
            Code = code.Trim(),
            Field = field.Trim(),
            Message = message.Trim(),
            RawSnippetHash = string.IsNullOrWhiteSpace(rawSnippetHash) ? string.Empty : rawSnippetHash.Trim(),
            RawPayloadJson = string.IsNullOrWhiteSpace(rawPayloadJson) ? string.Empty : rawPayloadJson,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}
