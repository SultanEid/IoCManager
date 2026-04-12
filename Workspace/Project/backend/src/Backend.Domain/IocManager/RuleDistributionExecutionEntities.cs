using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class TargetGroup : AuditableEntity
{
    private TargetGroup()
    {
    }

    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool IsEnabled { get; private set; } = true;

    public static TargetGroup Create(string name, string description, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var entity = new TargetGroup
        {
            Name = name.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? string.Empty : description.Trim(),
            IsEnabled = true,
        };

        entity.StampCreation(actorUserId.Trim(), nowUtc);
        return entity;
    }

    public void Update(string name, string description, bool isEnabled, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? string.Empty : description.Trim();
        IsEnabled = isEnabled;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class TargetGroupMember : Entity
{
    private TargetGroupMember()
    {
    }

    public Guid TargetGroupId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public string AddedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; private set; }

    public static TargetGroupMember Create(Guid targetGroupId, Guid targetServerId, string actorUserId, DateTimeOffset nowUtc)
    {
        if (targetGroupId == Guid.Empty)
        {
            throw new ArgumentException("Target group id is required.", nameof(targetGroupId));
        }

        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        return new TargetGroupMember
        {
            TargetGroupId = targetGroupId,
            TargetServerId = targetServerId,
            AddedByUserId = actorUserId.Trim(),
            AddedAtUtc = nowUtc,
        };
    }
}

public sealed class RuleDistributionJob : AuditableEntity
{
    private RuleDistributionJob()
    {
    }

    public Guid RuleRevisionId { get; private set; }
    public string OperatorUserId { get; private set; } = string.Empty;
    public RuleDistributionJobStatus Status { get; private set; } = RuleDistributionJobStatus.Queued;
    public int AttemptCount { get; private set; }
    public int MaxAttempts { get; private set; } = 5;
    public DateTimeOffset QueuedAtUtc { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public string Notes { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;

    public static RuleDistributionJob Queue(
        Guid ruleRevisionId,
        string operatorUserId,
        string actorUserId,
        DateTimeOffset queuedAtUtc,
        string? notes,
        int maxAttempts = 5)
    {
        if (ruleRevisionId == Guid.Empty)
        {
            throw new ArgumentException("Rule revision id is required.", nameof(ruleRevisionId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(operatorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (maxAttempts is < 1 or > 10)
        {
            throw new ArgumentOutOfRangeException(nameof(maxAttempts), "Max attempts must be between 1 and 10.");
        }

        var actor = actorUserId.Trim();
        var entity = new RuleDistributionJob
        {
            RuleRevisionId = ruleRevisionId,
            OperatorUserId = operatorUserId.Trim(),
            Status = RuleDistributionJobStatus.Queued,
            AttemptCount = 0,
            MaxAttempts = maxAttempts,
            QueuedAtUtc = queuedAtUtc,
            StartedAtUtc = null,
            CompletedAtUtc = null,
            NextAttemptAtUtc = queuedAtUtc,
            Notes = string.IsNullOrWhiteSpace(notes) ? string.Empty : notes.Trim(),
            Summary = string.Empty,
        };

        entity.StampCreation(actor, queuedAtUtc);
        return entity;
    }

    public void StartAttempt(int attemptNumber, string actorUserId, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (attemptNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Attempt number must be positive.");
        }

        if (Status == RuleDistributionJobStatus.Canceled)
        {
            throw new InvalidOperationException("Canceled jobs cannot be started.");
        }

        Status = RuleDistributionJobStatus.Running;
        StartedAtUtc ??= startedAtUtc;
        AttemptCount = Math.Max(AttemptCount, attemptNumber);
        NextAttemptAtUtc = null;
        CompletedAtUtc = null;
        Touch(actorUserId.Trim(), startedAtUtc);
    }

    public void Complete(
        RuleDistributionJobStatus terminalOrRetryStatus,
        string summary,
        string actorUserId,
        DateTimeOffset completedAtUtc,
        DateTimeOffset? nextAttemptAtUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (terminalOrRetryStatus is RuleDistributionJobStatus.Queued or RuleDistributionJobStatus.Running)
        {
            throw new ArgumentOutOfRangeException(nameof(terminalOrRetryStatus), "Completion requires a non-running status.");
        }

        Status = terminalOrRetryStatus;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        NextAttemptAtUtc = nextAttemptAtUtc;
        CompletedAtUtc = terminalOrRetryStatus is RuleDistributionJobStatus.Retrying
            ? null
            : completedAtUtc;
        Touch(actorUserId.Trim(), completedAtUtc);
    }

    public void QueueManualRetry(string actorUserId, DateTimeOffset nowUtc, string? summary = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (AttemptCount >= MaxAttempts)
        {
            throw new InvalidOperationException("Maximum attempts reached; job cannot be retried.");
        }

        if (Status == RuleDistributionJobStatus.Running)
        {
            throw new InvalidOperationException("Running jobs cannot be manually retried.");
        }

        Status = RuleDistributionJobStatus.Queued;
        NextAttemptAtUtc = nowUtc;
        CompletedAtUtc = null;
        if (!string.IsNullOrWhiteSpace(summary))
        {
            Summary = summary.Trim();
        }

        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class RuleDistributionAttempt : AuditableEntity
{
    private RuleDistributionAttempt()
    {
    }

    public Guid RuleDistributionJobId { get; private set; }
    public int AttemptNumber { get; private set; }
    public RuleDistributionAttemptStatus Status { get; private set; } = RuleDistributionAttemptStatus.Running;
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public int? BackoffSeconds { get; private set; }
    public string TriggeredByUserId { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;

    public static RuleDistributionAttempt Start(
        Guid ruleDistributionJobId,
        int attemptNumber,
        string triggeredByUserId,
        DateTimeOffset startedAtUtc)
    {
        if (ruleDistributionJobId == Guid.Empty)
        {
            throw new ArgumentException("Distribution job id is required.", nameof(ruleDistributionJobId));
        }

        if (attemptNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Attempt number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(triggeredByUserId);

        var actor = triggeredByUserId.Trim();
        var entity = new RuleDistributionAttempt
        {
            RuleDistributionJobId = ruleDistributionJobId,
            AttemptNumber = attemptNumber,
            Status = RuleDistributionAttemptStatus.Running,
            StartedAtUtc = startedAtUtc,
            CompletedAtUtc = null,
            BackoffSeconds = null,
            TriggeredByUserId = actor,
            Summary = string.Empty,
        };

        entity.StampCreation(actor, startedAtUtc);
        return entity;
    }

    public void Complete(
        RuleDistributionAttemptStatus status,
        string summary,
        int? backoffSeconds,
        string actorUserId,
        DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (status == RuleDistributionAttemptStatus.Running)
        {
            throw new ArgumentOutOfRangeException(nameof(status), "Attempt completion must use a terminal status.");
        }

        Status = status;
        Summary = string.IsNullOrWhiteSpace(summary) ? string.Empty : summary.Trim();
        BackoffSeconds = backoffSeconds;
        CompletedAtUtc = completedAtUtc;
        Touch(actorUserId.Trim(), completedAtUtc);
    }
}

public sealed class RuleDistributionTarget : AuditableEntity
{
    private RuleDistributionTarget()
    {
    }

    public Guid RuleDistributionJobId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public string TargetHostname { get; private set; } = string.Empty;
    public string TargetIpAddress { get; private set; } = string.Empty;
    public RuleDistributionTargetStatus Status { get; private set; } = RuleDistributionTargetStatus.Pending;
    public bool IsRetryable { get; private set; } = true;
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset? LastAttemptAtUtc { get; private set; }
    public DateTimeOffset? SucceededAtUtc { get; private set; }

    public static RuleDistributionTarget CreateSnapshot(
        Guid ruleDistributionJobId,
        Guid targetServerId,
        string targetHostname,
        string targetIpAddress,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (ruleDistributionJobId == Guid.Empty)
        {
            throw new ArgumentException("Distribution job id is required.", nameof(ruleDistributionJobId));
        }

        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var entity = new RuleDistributionTarget
        {
            RuleDistributionJobId = ruleDistributionJobId,
            TargetServerId = targetServerId,
            TargetHostname = string.IsNullOrWhiteSpace(targetHostname) ? string.Empty : targetHostname.Trim(),
            TargetIpAddress = string.IsNullOrWhiteSpace(targetIpAddress) ? string.Empty : targetIpAddress.Trim(),
            Status = RuleDistributionTargetStatus.Pending,
            IsRetryable = true,
            AttemptCount = 0,
            LastError = null,
            LastAttemptAtUtc = null,
            SucceededAtUtc = null,
        };

        entity.StampCreation(actorUserId.Trim(), nowUtc);
        return entity;
    }

    public bool CanDispatch()
    {
        if (Status == RuleDistributionTargetStatus.Success)
        {
            return false;
        }

        if (Status == RuleDistributionTargetStatus.ValidationFailed)
        {
            return false;
        }

        return Status == RuleDistributionTargetStatus.Pending || IsRetryable;
    }

    public void ResetForRetry(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status == RuleDistributionTargetStatus.Success)
        {
            return;
        }

        if (Status == RuleDistributionTargetStatus.ValidationFailed)
        {
            return;
        }

        Status = RuleDistributionTargetStatus.Pending;
        LastError = null;
        IsRetryable = true;
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void MarkResult(
        RuleDistributionTargetStatus status,
        bool isRetryable,
        string? errorMessage,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (status == RuleDistributionTargetStatus.Pending)
        {
            throw new ArgumentOutOfRangeException(nameof(status), "Result status cannot be pending.");
        }

        AttemptCount += 1;
        Status = status;
        LastAttemptAtUtc = nowUtc;
        IsRetryable = status switch
        {
            RuleDistributionTargetStatus.Success => false,
            RuleDistributionTargetStatus.ValidationFailed => false,
            _ => isRetryable,
        };
        LastError = string.IsNullOrWhiteSpace(errorMessage) ? null : errorMessage.Trim();
        SucceededAtUtc = status == RuleDistributionTargetStatus.Success ? nowUtc : SucceededAtUtc;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class RuleDistributionTargetAttempt : AuditableEntity
{
    private RuleDistributionTargetAttempt()
    {
    }

    public Guid RuleDistributionAttemptId { get; private set; }
    public Guid RuleDistributionTargetId { get; private set; }
    public RuleDistributionTargetStatus Status { get; private set; }
    public string Transport { get; private set; } = string.Empty;
    public string? RemoteCorrelationId { get; private set; }
    public string? Diagnostic { get; private set; }
    public bool IsRetryable { get; private set; }
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset CompletedAtUtc { get; private set; }

    public static RuleDistributionTargetAttempt Create(
        Guid ruleDistributionAttemptId,
        Guid ruleDistributionTargetId,
        RuleDistributionTargetStatus status,
        string transport,
        string? remoteCorrelationId,
        string? diagnostic,
        bool isRetryable,
        string actorUserId,
        DateTimeOffset startedAtUtc,
        DateTimeOffset completedAtUtc)
    {
        if (ruleDistributionAttemptId == Guid.Empty)
        {
            throw new ArgumentException("Distribution attempt id is required.", nameof(ruleDistributionAttemptId));
        }

        if (ruleDistributionTargetId == Guid.Empty)
        {
            throw new ArgumentException("Distribution target id is required.", nameof(ruleDistributionTargetId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(transport);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var actor = actorUserId.Trim();
        var entity = new RuleDistributionTargetAttempt
        {
            RuleDistributionAttemptId = ruleDistributionAttemptId,
            RuleDistributionTargetId = ruleDistributionTargetId,
            Status = status,
            Transport = transport.Trim(),
            RemoteCorrelationId = string.IsNullOrWhiteSpace(remoteCorrelationId) ? null : remoteCorrelationId.Trim(),
            Diagnostic = string.IsNullOrWhiteSpace(diagnostic) ? null : diagnostic.Trim(),
            IsRetryable = isRetryable,
            StartedAtUtc = startedAtUtc,
            CompletedAtUtc = completedAtUtc,
        };

        entity.StampCreation(actor, completedAtUtc);
        return entity;
    }
}

public sealed class RuleDistributionJobTargetGroup : Entity
{
    private RuleDistributionJobTargetGroup()
    {
    }

    public Guid RuleDistributionJobId { get; private set; }
    public Guid TargetGroupId { get; private set; }
    public string AddedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; private set; }

    public static RuleDistributionJobTargetGroup Create(
        Guid ruleDistributionJobId,
        Guid targetGroupId,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (ruleDistributionJobId == Guid.Empty)
        {
            throw new ArgumentException("Distribution job id is required.", nameof(ruleDistributionJobId));
        }

        if (targetGroupId == Guid.Empty)
        {
            throw new ArgumentException("Target group id is required.", nameof(targetGroupId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        return new RuleDistributionJobTargetGroup
        {
            RuleDistributionJobId = ruleDistributionJobId,
            TargetGroupId = targetGroupId,
            AddedByUserId = actorUserId.Trim(),
            AddedAtUtc = nowUtc,
        };
    }
}
