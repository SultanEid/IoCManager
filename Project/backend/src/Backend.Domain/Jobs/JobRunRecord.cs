using Backend.Domain.Common;

namespace Backend.Domain.Jobs;

public sealed class JobRunRecord : AuditableEntity
{
    public JobType JobType { get; private set; }
    public JobRunStatus Status { get; private set; }
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public string TriggeredBy { get; private set; } = string.Empty;
    public string Details { get; private set; } = string.Empty;

    private JobRunRecord()
    {
    }

    public static JobRunRecord Start(JobType jobType, string triggeredBy, DateTimeOffset startedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(triggeredBy);

        var record = new JobRunRecord
        {
            JobType = jobType,
            Status = JobRunStatus.Succeeded,
            StartedAtUtc = startedAtUtc,
            TriggeredBy = triggeredBy.Trim(),
            Details = string.Empty,
        };

        record.StampCreation(triggeredBy, startedAtUtc);
        return record;
    }

    public void CompleteSuccess(string details, string actorUserId, DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = JobRunStatus.Succeeded;
        Details = details.Trim();
        CompletedAtUtc = completedAtUtc;
        Touch(actorUserId, completedAtUtc);
    }

    public void CompleteFailure(string details, string actorUserId, DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = JobRunStatus.Failed;
        Details = details.Trim();
        CompletedAtUtc = completedAtUtc;
        Touch(actorUserId, completedAtUtc);
    }
}
