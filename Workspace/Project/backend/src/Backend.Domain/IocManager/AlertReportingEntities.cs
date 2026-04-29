using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class Alert : AuditableEntity
{
    private Alert() { }

    public string Title { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public AlertSeverity Severity { get; private set; } = AlertSeverity.Medium;
    public AlertStatus Status { get; private set; } = AlertStatus.Open;
    public string OwnerUserId { get; private set; } = string.Empty;
    public string ApprovalTierRequired { get; private set; } = "Analyst";
    public string ScannerFamily { get; private set; } = string.Empty;
    public int? TargetId { get; private set; }
    public string TargetDisplay { get; private set; } = string.Empty;
    public string RuleName { get; private set; } = string.Empty;
    public DateTimeOffset FirstDetectedAtUtc { get; private set; }
    public DateTimeOffset LastDetectedAtUtc { get; private set; }

    public static Alert Create(
        string title,
        string summary,
        AlertSeverity severity,
        string ownerUserId,
        string approvalTierRequired,
        string scannerFamily,
        int? targetId,
        string targetDisplay,
        string ruleName,
        DateTimeOffset detectedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(scannerFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(targetDisplay);
        ArgumentException.ThrowIfNullOrWhiteSpace(ruleName);

        var item = new Alert
        {
            Title = title.Trim(),
            Summary = summary.Trim(),
            Severity = severity,
            Status = AlertStatus.Open,
            OwnerUserId = ownerUserId.Trim(),
            ApprovalTierRequired = string.IsNullOrWhiteSpace(approvalTierRequired) ? "Analyst" : approvalTierRequired.Trim(),
            ScannerFamily = scannerFamily.Trim(),
            TargetId = targetId,
            TargetDisplay = targetDisplay.Trim(),
            RuleName = ruleName.Trim(),
            FirstDetectedAtUtc = detectedAtUtc,
            LastDetectedAtUtc = detectedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void RefreshDetection(
        string title,
        string summary,
        AlertSeverity severity,
        DateTimeOffset detectedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Title = title.Trim();
        Summary = summary.Trim();
        if (severity > Severity)
        {
            Severity = severity;
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (detectedAtUtc > LastDetectedAtUtc)
        {
            LastDetectedAtUtc = detectedAtUtc;
        }

        Touch(actorUserId.Trim(), nowUtc);
    }

    public void SetStatus(AlertStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = status;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class AlertScanResult : Entity
{
    private AlertScanResult() { }

    public Guid AlertId { get; private set; }
    public Guid ScanResultId { get; private set; }
    public DateTimeOffset LinkedAtUtc { get; private set; }

    public static AlertScanResult Create(Guid alertId, Guid scanResultId, DateTimeOffset linkedAtUtc)
    {
        if (alertId == Guid.Empty)
        {
            throw new ArgumentException("Alert id is required.", nameof(alertId));
        }

        if (scanResultId == Guid.Empty)
        {
            throw new ArgumentException("Scan result id is required.", nameof(scanResultId));
        }

        return new AlertScanResult
        {
            AlertId = alertId,
            ScanResultId = scanResultId,
            LinkedAtUtc = linkedAtUtc,
        };
    }
}

public sealed class AlertIoc : Entity
{
    private AlertIoc() { }

    public Guid AlertId { get; private set; }
    public Guid IocId { get; private set; }
    public DateTimeOffset LinkedAtUtc { get; private set; }
    public AlertIocStatus Status { get; private set; } = AlertIocStatus.Open;
    public DateTimeOffset StatusUpdatedAtUtc { get; private set; }
    public string StatusUpdatedByUserId { get; private set; } = "system";

    public static AlertIoc Create(
        Guid alertId,
        Guid iocId,
        DateTimeOffset linkedAtUtc,
        string statusUpdatedByUserId = "system")
    {
        if (alertId == Guid.Empty)
        {
            throw new ArgumentException("Alert id is required.", nameof(alertId));
        }

        if (iocId == Guid.Empty)
        {
            throw new ArgumentException("IOC id is required.", nameof(iocId));
        }

        return new AlertIoc
        {
            AlertId = alertId,
            IocId = iocId,
            LinkedAtUtc = linkedAtUtc,
            Status = AlertIocStatus.Open,
            StatusUpdatedAtUtc = linkedAtUtc,
            StatusUpdatedByUserId = string.IsNullOrWhiteSpace(statusUpdatedByUserId) ? "system" : statusUpdatedByUserId.Trim(),
        };
    }

    public void SetStatus(AlertIocStatus status, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = status;
        StatusUpdatedAtUtc = nowUtc;
        StatusUpdatedByUserId = actorUserId.Trim();
    }
}

public sealed class Report : AuditableEntity
{
    private Report() { }

    public string Title { get; private set; } = string.Empty;
    public ReportType ReportType { get; private set; } = ReportType.Operational;
    public string SummaryJson { get; private set; } = string.Empty;
    public DateTimeOffset GeneratedAtUtc { get; private set; }

    public static Report Create(
        string title,
        ReportType reportType,
        string summaryJson,
        string actorUserId,
        DateTimeOffset generatedAtUtc,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new Report
        {
            Title = title.Trim(),
            ReportType = reportType,
            SummaryJson = summaryJson,
            GeneratedAtUtc = generatedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class ReportAlert : Entity
{
    private ReportAlert() { }

    public Guid ReportId { get; private set; }
    public Guid AlertId { get; private set; }
    public DateTimeOffset LinkedAtUtc { get; private set; }

    public static ReportAlert Create(Guid reportId, Guid alertId, DateTimeOffset linkedAtUtc)
    {
        if (reportId == Guid.Empty)
        {
            throw new ArgumentException("Report id is required.", nameof(reportId));
        }

        if (alertId == Guid.Empty)
        {
            throw new ArgumentException("Alert id is required.", nameof(alertId));
        }

        return new ReportAlert
        {
            ReportId = reportId,
            AlertId = alertId,
            LinkedAtUtc = linkedAtUtc,
        };
    }
}

public sealed class AuditLog : Entity
{
    private AuditLog() { }

    public string ActorUserId { get; private set; } = string.Empty;
    public string ActionType { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public string EntityId { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; private set; }

    public static AuditLog Create(
        string actorUserId,
        string actionType,
        string entityType,
        string entityId,
        string payloadJson,
        DateTimeOffset occurredAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        ArgumentException.ThrowIfNullOrWhiteSpace(actionType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityId);

        return new AuditLog
        {
            ActorUserId = actorUserId.Trim(),
            ActionType = actionType.Trim(),
            EntityType = entityType.Trim(),
            EntityId = entityId.Trim(),
            PayloadJson = payloadJson,
            OccurredAtUtc = occurredAtUtc,
        };
    }
}

public sealed class RetentionPolicy : AuditableEntity
{
    private RetentionPolicy() { }

    public RetentionDataType DataType { get; private set; }
    public int RetainDays { get; private set; }
    public int ArchiveAfterDays { get; private set; }
    public bool IsEnabled { get; private set; } = true;

    public static RetentionPolicy Create(
        RetentionDataType dataType,
        int retainDays,
        int archiveAfterDays,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (retainDays <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(retainDays), "Retain days must be positive.");
        }

        if (archiveAfterDays <= 0 || archiveAfterDays > retainDays)
        {
            throw new ArgumentOutOfRangeException(nameof(archiveAfterDays), "Archive after days must be positive and <= retain days.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new RetentionPolicy
        {
            DataType = dataType,
            RetainDays = retainDays,
            ArchiveAfterDays = archiveAfterDays,
            IsEnabled = true,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class ArchiveRecord : AuditableEntity
{
    private ArchiveRecord() { }

    public Guid RetentionPolicyId { get; private set; }
    public string EntityType { get; private set; } = string.Empty;
    public string EntityId { get; private set; } = string.Empty;
    public string ArchiveUri { get; private set; } = string.Empty;
    public DateTimeOffset ArchivedAtUtc { get; private set; }

    public static ArchiveRecord Create(
        Guid retentionPolicyId,
        string entityType,
        string entityId,
        string archiveUri,
        string actorUserId,
        DateTimeOffset archivedAtUtc,
        DateTimeOffset nowUtc)
    {
        if (retentionPolicyId == Guid.Empty)
        {
            throw new ArgumentException("Retention policy id is required.", nameof(retentionPolicyId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityId);
        ArgumentException.ThrowIfNullOrWhiteSpace(archiveUri);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new ArchiveRecord
        {
            RetentionPolicyId = retentionPolicyId,
            EntityType = entityType.Trim(),
            EntityId = entityId.Trim(),
            ArchiveUri = archiveUri.Trim(),
            ArchivedAtUtc = archivedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}
