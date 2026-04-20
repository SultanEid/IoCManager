using Backend.Domain.Common;

namespace Backend.Domain.Deployments;

public sealed class DeploymentRecord : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid RuleId { get; private set; }
    public string TargetEnvironment { get; private set; } = string.Empty;
    public DeploymentStatus Status { get; private set; } = DeploymentStatus.Proposed;
    public string RequestedByUserId { get; private set; } = string.Empty;
    public string? ApprovedByUserId { get; private set; }
    public DateTimeOffset? ApprovedAtUtc { get; private set; }
    public DateTimeOffset? DeployedAtUtc { get; private set; }

    private DeploymentRecord()
    {
    }

    public static DeploymentRecord Propose(
        Guid caseId,
        Guid ruleId,
        string targetEnvironment,
        string requestedByUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetEnvironment);
        ArgumentException.ThrowIfNullOrWhiteSpace(requestedByUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (ruleId == Guid.Empty)
        {
            throw new ArgumentException("Rule id is required.", nameof(ruleId));
        }

        var deployment = new DeploymentRecord
        {
            CaseId = caseId,
            RuleId = ruleId,
            TargetEnvironment = targetEnvironment.Trim(),
            RequestedByUserId = requestedByUserId.Trim(),
            Status = DeploymentStatus.Proposed,
        };

        deployment.StampCreation(requestedByUserId, nowUtc);
        return deployment;
    }

    public void Approve(string approverUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approverUserId);
        if (Status != DeploymentStatus.Proposed)
        {
            throw new InvalidOperationException("Only proposed deployments can be approved.");
        }

        Status = DeploymentStatus.Approved;
        ApprovedByUserId = approverUserId;
        ApprovedAtUtc = nowUtc;
        Touch(approverUserId, nowUtc);
    }

    public void Reject(string approverUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(approverUserId);
        if (Status != DeploymentStatus.Proposed)
        {
            throw new InvalidOperationException("Only proposed deployments can be rejected.");
        }

        Status = DeploymentStatus.Rejected;
        ApprovedByUserId = approverUserId;
        ApprovedAtUtc = nowUtc;
        Touch(approverUserId, nowUtc);
    }

    public void MarkScheduled(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status != DeploymentStatus.Approved)
        {
            throw new InvalidOperationException("Only approved deployments can be scheduled.");
        }

        Status = DeploymentStatus.Scheduled;
        Touch(actorUserId, nowUtc);
    }

    public void MarkDeployed(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status is not (DeploymentStatus.Approved or DeploymentStatus.Scheduled))
        {
            throw new InvalidOperationException("Only approved or scheduled deployments can be deployed.");
        }

        Status = DeploymentStatus.Deployed;
        DeployedAtUtc = nowUtc;
        Touch(actorUserId, nowUtc);
    }

    public void MarkRolledBack(string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (Status != DeploymentStatus.Deployed)
        {
            throw new InvalidOperationException("Only deployed rules can be rolled back.");
        }

        Status = DeploymentStatus.RolledBack;
        Touch(actorUserId, nowUtc);
    }
}
