namespace Backend.Contracts.Deployments;

public sealed record CreateDeploymentRequest(
    Guid CaseId,
    Guid RuleId,
    string TargetEnvironment,
    string RequestedByUserId);

public sealed record UpdateDeploymentStatusRequest(string Status, string ActorUserId);

public sealed record DeploymentResponse(
    Guid Id,
    Guid CaseId,
    Guid RuleId,
    string TargetEnvironment,
    string Status,
    string RequestedByUserId,
    string? ApprovedByUserId,
    DateTimeOffset? ApprovedAtUtc,
    DateTimeOffset? DeployedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
