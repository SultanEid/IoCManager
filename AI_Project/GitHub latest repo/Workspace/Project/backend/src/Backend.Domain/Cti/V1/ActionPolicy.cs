using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class ActionPolicy : AuditableEntity
{
    private ActionPolicy()
    {
    }

    public string PolicyName { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public decimal RecommendThreshold { get; private set; }
    public decimal EscalateThreshold { get; private set; }
    public decimal DeferThreshold { get; private set; }
    public decimal MaxUncertaintyForRecommend { get; private set; }
    public decimal EscalationUncertaintyThreshold { get; private set; }
    public decimal MaxConflictForRecommend { get; private set; }
    public decimal MinimumSourceTrust { get; private set; }
    public decimal HighBlastRadiusThreshold { get; private set; }
    public decimal SafeBlastRadiusThreshold { get; private set; }

    public static ActionPolicy Create(
        string policyName,
        string version,
        decimal recommendThreshold,
        decimal escalateThreshold,
        decimal deferThreshold,
        decimal maxUncertaintyForRecommend,
        decimal escalationUncertaintyThreshold,
        decimal maxConflictForRecommend,
        decimal minimumSourceTrust,
        decimal highBlastRadiusThreshold,
        decimal safeBlastRadiusThreshold,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(policyName);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        ValidateUnitInterval(recommendThreshold, nameof(recommendThreshold));
        ValidateUnitInterval(escalateThreshold, nameof(escalateThreshold));
        ValidateUnitInterval(deferThreshold, nameof(deferThreshold));
        ValidateUnitInterval(maxUncertaintyForRecommend, nameof(maxUncertaintyForRecommend));
        ValidateUnitInterval(escalationUncertaintyThreshold, nameof(escalationUncertaintyThreshold));
        ValidateUnitInterval(maxConflictForRecommend, nameof(maxConflictForRecommend));
        ValidateUnitInterval(minimumSourceTrust, nameof(minimumSourceTrust));
        ValidateUnitInterval(highBlastRadiusThreshold, nameof(highBlastRadiusThreshold));
        ValidateUnitInterval(safeBlastRadiusThreshold, nameof(safeBlastRadiusThreshold));

        if (escalateThreshold <= recommendThreshold)
        {
            throw new ArgumentOutOfRangeException(nameof(escalateThreshold), "Escalate threshold must exceed recommend threshold.");
        }

        if (safeBlastRadiusThreshold >= highBlastRadiusThreshold)
        {
            throw new ArgumentOutOfRangeException(nameof(safeBlastRadiusThreshold), "Safe blast threshold must be lower than high blast threshold.");
        }

        var policy = new ActionPolicy
        {
            PolicyName = policyName.Trim(),
            Version = version.Trim(),
            RecommendThreshold = recommendThreshold,
            EscalateThreshold = escalateThreshold,
            DeferThreshold = deferThreshold,
            MaxUncertaintyForRecommend = maxUncertaintyForRecommend,
            EscalationUncertaintyThreshold = escalationUncertaintyThreshold,
            MaxConflictForRecommend = maxConflictForRecommend,
            MinimumSourceTrust = minimumSourceTrust,
            HighBlastRadiusThreshold = highBlastRadiusThreshold,
            SafeBlastRadiusThreshold = safeBlastRadiusThreshold,
        };

        policy.StampCreation(actorUserId, nowUtc);
        return policy;
    }

    public static ActionPolicy CreateDefaultV1(string actorUserId, DateTimeOffset nowUtc) =>
        Create(
            policyName: "CTI Deterministic Policy",
            version: "v1",
            recommendThreshold: 0.68m,
            escalateThreshold: 0.82m,
            deferThreshold: 0.45m,
            maxUncertaintyForRecommend: 0.30m,
            escalationUncertaintyThreshold: 0.60m,
            maxConflictForRecommend: 0.40m,
            minimumSourceTrust: 0.55m,
            highBlastRadiusThreshold: 0.70m,
            safeBlastRadiusThreshold: 0.30m,
            actorUserId: actorUserId,
            nowUtc: nowUtc);

    private static void ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }
    }
}
