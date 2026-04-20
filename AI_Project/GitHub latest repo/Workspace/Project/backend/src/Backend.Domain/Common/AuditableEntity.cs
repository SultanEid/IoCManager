namespace Backend.Domain.Common;

public abstract class AuditableEntity : Entity
{
    public DateTimeOffset CreatedAtUtc { get; protected set; }
    public DateTimeOffset UpdatedAtUtc { get; protected set; }
    public string CreatedByUserId { get; protected set; } = string.Empty;
    public string UpdatedByUserId { get; protected set; } = string.Empty;

    protected void StampCreation(string actorUserId, DateTimeOffset createdAtUtc)
    {
        CreatedByUserId = actorUserId;
        UpdatedByUserId = actorUserId;
        CreatedAtUtc = createdAtUtc;
        UpdatedAtUtc = createdAtUtc;
    }

    protected void Touch(string actorUserId, DateTimeOffset updatedAtUtc)
    {
        UpdatedByUserId = actorUserId;
        UpdatedAtUtc = updatedAtUtc;
    }
}
