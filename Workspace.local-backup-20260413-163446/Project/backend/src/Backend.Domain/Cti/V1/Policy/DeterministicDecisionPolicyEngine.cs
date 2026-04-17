namespace Backend.Domain.Cti.V1.Policy;

public sealed class DeterministicDecisionPolicyEngine
{
    private const decimal UncertaintyHighThreshold = 0.35m;
    private const decimal BlastRadiusHighThreshold = 0.70m;
    private const decimal EvidenceConflictHighThreshold = 0.50m;
    private const decimal MaliciousnessBlockMin = 0.85m;
    private const decimal DeployabilityCanaryMin = 0.60m;
    private const decimal ActionabilityMin = 0.55m;
    private const decimal DecayExpireThreshold = 0.90m;
    private const decimal LowMaliciousnessThreshold = 0.40m;
    private const decimal ModerateMaliciousnessThreshold = 0.45m;
    private const decimal HuntMaliciousnessThreshold = 0.65m;
    private const decimal HuntActionabilityThreshold = 0.45m;
    private const decimal HighPredictedNoiseThreshold = 0.70m;
    private const decimal MinimumSourceTrust = 0.55m;

    public PolicyEvaluationOutcome Evaluate(
        Guid caseId,
        ActionPolicy policy,
        DeterministicPolicyInput input,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentNullException.ThrowIfNull(policy);
        ArgumentNullException.ThrowIfNull(input);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var selected = DetermineAction(policy, input);
        var decisionState = DetermineDecisionState(selected.ActionType);
        var approvalTier = DetermineApprovalTier(selected.ActionType, input);
        var rolloutMode = DetermineRolloutMode(selected.ActionType);
        var rollbackRequirement = DetermineRollbackRequirement(selected.ActionType, rolloutMode, input);
        var nextBestEvidence = DetermineNextBestEvidence(selected.ActionType, policy, input);
        var expiryUtc = ComputeExpiry(nowUtc, selected.ActionType, input);
        var guardrailNotes = BuildGuardrailNotes(selected.ActionType, input);

        var recommendation = ActionRecommendation.Create(
            actionType: selected.ActionType,
            description: BuildActionDescription(selected.ActionType, selected.Reason, input),
            nextBestEvidence: nextBestEvidence);

        var rolloutPlan = RolloutPlan.Create(
            caseId,
            rolloutMode,
            blastRadiusLimit: BuildBlastRadiusLimit(selected.ActionType, input.BlastRadiusScore),
            strategy: BuildRolloutStrategy(rolloutMode, selected.ActionType),
            successCriteria: "No regression in key CTI precision/recall metrics during validation window.",
            actorUserId,
            nowUtc);

        var rollbackPlan = RollbackPlan.Create(
            caseId,
            rollbackRequirement,
            triggerCondition: BuildRollbackTriggerCondition(selected.ActionType),
            playbookReference: "cti-reasoning-rollback-v1",
            recoveryWindow: TimeSpan.FromHours(2),
            actorUserId,
            nowUtc);

        var snapshot = DecisionSnapshot.Create(
            caseId,
            input.ModelDecisionTrace.ScoreVector,
            input.ModelDecisionTrace.Uncertainty,
            input.BlastRadius,
            input.AssetCriticality,
            input.EvidenceFreshness,
            input.SourceTrust,
            input.EvidenceConflict,
            snapshotVersion: "v1",
            actorUserId,
            nowUtc);

        return PolicyEvaluationOutcome.Create(
            decisionState,
            recommendation,
            approvalTier,
            rolloutPlan,
            rollbackPlan,
            nextBestEvidence,
            snapshot,
            input.ModelDecisionTrace,
            input.FeatureSnapshot,
            policy.Version,
            expiryUtc,
            guardrailNotes);
    }

    private static PolicySelection DetermineAction(ActionPolicy policy, DeterministicPolicyInput input)
    {
        var conflictScore = input.EvidenceConflictScore;
        if (conflictScore >= EvidenceConflictHighThreshold)
        {
            return new PolicySelection(
                PolicyActionType.RequestMoreEvidence,
                "Evidence conflict exceeds deterministic policy threshold.");
        }

        if (input.EvidenceFreshness == EvidenceFreshness.Expired || input.DecayScore >= DecayExpireThreshold)
        {
            return new PolicySelection(
                PolicyActionType.ExpireCase,
                "Evidence is expired or decayed beyond policy threshold.");
        }

        if (input.UncertaintyScore >= UncertaintyHighThreshold && input.BlastRadiusScore >= BlastRadiusHighThreshold)
        {
            return new PolicySelection(
                PolicyActionType.Abstain,
                "High uncertainty and high blast radius trigger conservative abstention.");
        }

        if (input.UncertaintyScore >= UncertaintyHighThreshold)
        {
            return new PolicySelection(
                PolicyActionType.RequestMoreEvidence,
                "Uncertainty is above policy tolerance.");
        }

        if (input.BlastRadiusScore >= BlastRadiusHighThreshold || input.AssetCriticality == AssetCriticality.MissionCritical)
        {
            return new PolicySelection(
                PolicyActionType.Escalate,
                "Blast radius or mission-critical context requires escalation.");
        }

        if (input.CurrentRolloutStage == RolloutMode.Canary && MeetsStrongSafeSignals(policy, input))
        {
            return new PolicySelection(
                PolicyActionType.Promote,
                "Canary context and safe signals satisfy promotion guardrails.");
        }

        if (input.MaliciousnessScore >= MaliciousnessBlockMin &&
            input.UncertaintyScore < UncertaintyHighThreshold &&
            input.BlastRadiusScore < BlastRadiusHighThreshold)
        {
            return new PolicySelection(
                PolicyActionType.BlockCandidate,
                "High maliciousness with bounded uncertainty supports block candidacy.");
        }

        if (input.MaliciousnessScore < LowMaliciousnessThreshold &&
            input.PredictedNoiseScore >= HighPredictedNoiseThreshold)
        {
            return new PolicySelection(
                PolicyActionType.SuppressTemporarily,
                "Low maliciousness and high predicted noise support temporary suppression.");
        }

        if (input.ActionabilityScore >= ActionabilityMin &&
            input.DeployabilityScore >= DeployabilityCanaryMin &&
            input.BlastRadiusScore < BlastRadiusHighThreshold)
        {
            return new PolicySelection(
                PolicyActionType.DeployCanary,
                "Actionability and deployability meet canary deployment thresholds.");
        }

        if (input.ActionabilityScore >= ActionabilityMin &&
            input.DeployabilityScore < DeployabilityCanaryMin)
        {
            return new PolicySelection(
                PolicyActionType.DeployShadow,
                "Actionability is sufficient but deployability requires shadow validation.");
        }

        if (input.MaliciousnessScore >= HuntMaliciousnessThreshold &&
            input.ActionabilityScore >= HuntActionabilityThreshold)
        {
            return new PolicySelection(
                PolicyActionType.Hunt,
                "Signals support focused threat hunting.");
        }

        if (input.MaliciousnessScore >= ModerateMaliciousnessThreshold)
        {
            return new PolicySelection(
                PolicyActionType.ProposeRule,
                "Moderate maliciousness supports a policy-gated rule proposal.");
        }

        if (input.ActionabilityScore >= 0.30m && input.MissingEvidenceHintsCount == 0)
        {
            return new PolicySelection(
                PolicyActionType.Monitor,
                "Signal quality is limited but suitable for monitored tracking.");
        }

        return new PolicySelection(
            PolicyActionType.Abstain,
            "Signal quality is insufficient for policy-safe action.");
    }

    private static DecisionState DetermineDecisionState(PolicyActionType actionType) =>
        actionType switch
        {
            PolicyActionType.Escalate => DecisionState.Escalate,
            PolicyActionType.Abstain or PolicyActionType.ExpireCase => DecisionState.Abstain,
            PolicyActionType.RequestMoreEvidence or PolicyActionType.Monitor => DecisionState.Defer,
            _ => DecisionState.Recommend,
        };

    private static ApprovalTier DetermineApprovalTier(PolicyActionType actionType, DeterministicPolicyInput input)
    {
        var tier = input.AssetCriticality switch
        {
            AssetCriticality.MissionCritical => ApprovalTier.Admin,
            AssetCriticality.High => ApprovalTier.Lead,
            _ => ApprovalTier.Analyst,
        };

        if (actionType == PolicyActionType.Escalate)
        {
            tier = MaxTier(tier, ApprovalTier.Lead);
            if (input.AssetCriticality == AssetCriticality.MissionCritical || input.BlastRadiusScore >= 0.85m)
            {
                tier = ApprovalTier.Admin;
            }
        }

        if (actionType is PolicyActionType.BlockCandidate or PolicyActionType.SuppressTemporarily &&
            input.AssetCriticality >= AssetCriticality.High)
        {
            tier = MaxTier(tier, ApprovalTier.Lead);
            if (input.AssetCriticality == AssetCriticality.MissionCritical)
            {
                tier = ApprovalTier.Admin;
            }
        }

        if (actionType is PolicyActionType.DeployCanary or PolicyActionType.DeployShadow or PolicyActionType.Promote &&
            (input.BlastRadiusScore >= 0.45m || input.AssetCriticality >= AssetCriticality.High))
        {
            tier = MaxTier(tier, ApprovalTier.Lead);
        }

        if (input.BlastRadiusScore >= BlastRadiusHighThreshold)
        {
            tier = MaxTier(tier, ApprovalTier.Lead);
        }

        return tier;
    }

    private static ApprovalTier MaxTier(ApprovalTier current, ApprovalTier required) =>
        current >= required ? current : required;

    private static RolloutMode DetermineRolloutMode(PolicyActionType actionType) =>
        actionType switch
        {
            PolicyActionType.DeployShadow => RolloutMode.Shadow,
            PolicyActionType.DeployCanary => RolloutMode.Canary,
            PolicyActionType.Promote => RolloutMode.Promoted,
            _ => RolloutMode.None,
        };

    private static RollbackRequirement DetermineRollbackRequirement(
        PolicyActionType actionType,
        RolloutMode rolloutMode,
        DeterministicPolicyInput input)
    {
        if (actionType == PolicyActionType.BlockCandidate)
        {
            return RollbackRequirement.Required;
        }

        if (rolloutMode == RolloutMode.None)
        {
            return RollbackRequirement.NotRequired;
        }

        if (rolloutMode == RolloutMode.Promoted ||
            input.BlastRadiusScore >= 0.45m ||
            input.AssetCriticality >= AssetCriticality.High)
        {
            return RollbackRequirement.Required;
        }

        return RollbackRequirement.Recommended;
    }

    private static NextBestEvidence DetermineNextBestEvidence(
        PolicyActionType actionType,
        ActionPolicy policy,
        DeterministicPolicyInput input)
    {
        if (actionType == PolicyActionType.RequestMoreEvidence &&
            input.EvidenceConflictScore >= EvidenceConflictHighThreshold)
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.ConflictResolution,
                "Acquire packet capture and host process tree to resolve conflicting assertions.",
                "Conflicting evidence requires deterministic conflict resolution.");
        }

        if (actionType == PolicyActionType.ExpireCase ||
            input.EvidenceFreshness is EvidenceFreshness.Stale or EvidenceFreshness.Expired)
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.FreshTelemetry,
                "Collect fresh endpoint and identity telemetry for the last 30 minutes.",
                "Freshness is below deterministic policy threshold.");
        }

        if (input.SourceTrust < Math.Max(policy.MinimumSourceTrust, MinimumSourceTrust))
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.SourceCorroboration,
                "Obtain corroboration from a high-trust independent source.",
                "Current source trust is below deterministic policy minimum.");
        }

        if (input.UncertaintyScore >= UncertaintyHighThreshold)
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.UncertaintyReduction,
                "Run controlled detonation and behavior replay to reduce uncertainty.",
                "Model uncertainty exceeds deterministic safety bounds.");
        }

        if (actionType is PolicyActionType.DeployShadow or PolicyActionType.DeployCanary
            or PolicyActionType.Promote or PolicyActionType.BlockCandidate or PolicyActionType.SuppressTemporarily)
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.PostActionValidation,
                "Collect post-action validation telemetry and user impact signals.",
                "Deployment-oriented recommendations require strict post-action validation.");
        }

        if (actionType is PolicyActionType.Hunt or PolicyActionType.ProposeRule)
        {
            return NextBestEvidence.Create(
                NextBestEvidenceType.SourceCorroboration,
                "Corroborate suspicious behaviors across independent sensors before promotion.",
                "Analyst workflow actions require stronger cross-source grounding.");
        }

        return NextBestEvidence.Create(
            NextBestEvidenceType.PostActionValidation,
            "Collect additional telemetry for trend confirmation over the next evidence window.",
            "Default deterministic recommendation path requires continuing validation.");
    }

    private static IReadOnlyList<string> BuildGuardrailNotes(PolicyActionType actionType, DeterministicPolicyInput input)
    {
        var notes = new List<string>
        {
            "no_auto_publish: manual approval is required before deployment or suppression.",
            "suppress_permanently is disabled by policy and will never be recommended.",
        };

        if (input.AssetCriticality >= AssetCriticality.High)
        {
            notes.Add("critical_asset: approval tier is elevated for high-impact assets.");
        }

        if (input.UncertaintyScore >= UncertaintyHighThreshold)
        {
            notes.Add("high_uncertainty: irreversible actions are blocked until confidence improves.");
        }

        if (input.EvidenceConflictScore >= EvidenceConflictHighThreshold)
        {
            notes.Add("evidence_conflict: request_more_evidence is required before action.");
        }

        if (actionType is PolicyActionType.BlockCandidate or PolicyActionType.SuppressTemporarily)
        {
            notes.Add("critical suppression or blocking requires elevated human approval on critical assets.");
        }

        return notes;
    }

    private static decimal BuildBlastRadiusLimit(PolicyActionType actionType, decimal blastRadiusScore)
    {
        if (actionType == PolicyActionType.Promote)
        {
            return Math.Clamp(blastRadiusScore + 0.05m, 0m, 1m);
        }

        if (actionType == PolicyActionType.DeployCanary)
        {
            return Math.Clamp(blastRadiusScore + 0.10m, 0m, 1m);
        }

        if (actionType == PolicyActionType.DeployShadow)
        {
            return Math.Clamp(blastRadiusScore + 0.15m, 0m, 1m);
        }

        return Math.Clamp(blastRadiusScore, 0m, 1m);
    }

    private static string BuildRollbackTriggerCondition(PolicyActionType actionType) =>
        actionType switch
        {
            PolicyActionType.BlockCandidate => "Operator reports business impact or false-positive confirmation.",
            PolicyActionType.DeployCanary => "False-positive delta exceeds safety budget for 2 continuous hours.",
            PolicyActionType.Promote => "Precision drop > 5% or false-positive spike above policy budget.",
            _ => "Precision drop > 5% or false-positive spike above policy budget.",
        };

    private static string BuildActionDescription(
        PolicyActionType actionType,
        string reason,
        DeterministicPolicyInput input)
    {
        return FormattableString.Invariant(
            $"{actionType}: {reason} (maliciousness={input.MaliciousnessScore:F2}, actionability={input.ActionabilityScore:F2}, deployability={input.DeployabilityScore:F2}, uncertainty={input.UncertaintyScore:F2}, blast={input.BlastRadiusScore:F2}).");
    }

    private static string BuildRolloutStrategy(RolloutMode rolloutMode, PolicyActionType actionType) =>
        rolloutMode switch
        {
            RolloutMode.Shadow => "Run in shadow mode against mirrored traffic with explicit analyst verification.",
            RolloutMode.Canary => "Deploy to canary scope with strict rollback triggers and manual promotion gate.",
            RolloutMode.Promoted => "Recommend promotion with continuous monitoring and rollback readiness.",
            _ => actionType == PolicyActionType.Escalate
                ? "Escalate for human decision; rollout is blocked until approved."
                : "No rollout planned.",
        };

    private static DateTimeOffset ComputeExpiry(DateTimeOffset nowUtc, PolicyActionType actionType, DeterministicPolicyInput input)
    {
        if (actionType == PolicyActionType.ExpireCase)
        {
            return nowUtc;
        }

        var baseHours = input.EvidenceFreshness switch
        {
            EvidenceFreshness.Fresh => 24m,
            EvidenceFreshness.Aging => 12m,
            EvidenceFreshness.Stale => 4m,
            EvidenceFreshness.Expired => 0m,
            _ => 8m,
        };

        if (baseHours == 0m)
        {
            return nowUtc;
        }

        var scale = Math.Max(0.1m, 1m - input.DecayScore);
        var ttlHours = baseHours * scale;
        return nowUtc.AddHours((double)ttlHours);
    }

    private static bool MeetsStrongSafeSignals(ActionPolicy policy, DeterministicPolicyInput input)
    {
        var requiredTrust = Math.Max(policy.MinimumSourceTrust, MinimumSourceTrust);
        return input.ActionabilityScore >= ActionabilityMin &&
               input.DeployabilityScore >= DeployabilityCanaryMin &&
               input.UncertaintyScore < UncertaintyHighThreshold &&
               input.BlastRadiusScore < BlastRadiusHighThreshold &&
               input.EvidenceConflictScore < EvidenceConflictHighThreshold &&
               input.SourceTrust >= requiredTrust &&
               input.MissingEvidenceHintsCount == 0 &&
               input.EvidenceFreshness is EvidenceFreshness.Fresh or EvidenceFreshness.Aging;
    }

    private readonly record struct PolicySelection(PolicyActionType ActionType, string Reason);
}
