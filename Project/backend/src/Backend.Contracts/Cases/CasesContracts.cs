namespace Backend.Contracts.Cases;

public sealed record CreateCaseRequest(
    string Title,
    string Summary,
    string Priority,
    string OwnerUserId,
    string ApprovalTierRequired,
    string RequestedByUserId);

public sealed record UpdateCaseStatusRequest(string Status, string ActorUserId);

public sealed record CaseResponse(
    Guid Id,
    string Title,
    string Summary,
    string Priority,
    string Status,
    string OwnerUserId,
    string ApprovalTierRequired,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
