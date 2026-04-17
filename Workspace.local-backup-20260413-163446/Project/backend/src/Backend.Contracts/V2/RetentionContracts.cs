namespace Backend.Contracts.V2;

public sealed record CreateRetentionPolicyRequest(string DataType, int RetainDays, int ArchiveAfterDays, string ActorUserId);
public sealed record RetentionPolicyResponse(Guid Id, string DataType, int RetainDays, int ArchiveAfterDays, bool IsEnabled, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);

public sealed record ExecuteRetentionPolicyRequest(Guid RetentionPolicyId, string ActorUserId, string ArchiveUriPrefix);
public sealed record ArchiveRecordResponse(Guid Id, Guid RetentionPolicyId, string EntityType, string EntityId, string ArchiveUri, DateTimeOffset ArchivedAtUtc, DateTimeOffset CreatedAtUtc);
