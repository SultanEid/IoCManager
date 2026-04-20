namespace Backend.Contracts.Admin;

public sealed record RunJobRequest(string TriggeredByUserId);

public sealed record JobRunResponse(
    Guid Id,
    string JobType,
    string Status,
    string TriggeredBy,
    string Details,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? CompletedAtUtc);
