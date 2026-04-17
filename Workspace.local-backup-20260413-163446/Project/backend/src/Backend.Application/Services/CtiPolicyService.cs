using System.Text.Json;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.CtiPolicy;
using Backend.Domain.Cti.V1;
using Backend.Domain.Cti.V1.Policy;

namespace Backend.Application.Services;

public sealed class CtiPolicyService : ICtiPolicyService
{
    private readonly IDateTimeProvider _dateTimeProvider;

    public CtiPolicyService(IDateTimeProvider dateTimeProvider)
    {
        _dateTimeProvider = dateTimeProvider;
    }

    public Task<CtiPolicyEvaluationResponse> EvaluateAsync(
        EvaluateCtiPolicyRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var nowUtc = _dateTimeProvider.UtcNow;
        var assetCriticality = EnumParser.Parse<AssetCriticality>(request.AssetCriticality, nameof(request.AssetCriticality));
        var evidenceFreshness = EnumParser.Parse<EvidenceFreshness>(request.EvidenceFreshness, nameof(request.EvidenceFreshness));
        var evidenceConflict = EnumParser.Parse<EvidenceConflictLevel>(request.EvidenceConflict, nameof(request.EvidenceConflict));
        var currentRolloutStage = EnumParser.Parse<RolloutMode>(request.CurrentRolloutStage, nameof(request.CurrentRolloutStage));

        var scoreVector = new ScoreVector(
            request.MaliciousnessScore,
            request.ActionabilityScore,
            request.DeployabilityScore);

        var modelDecisionTrace = ModelDecisionTrace.Create(
            modelName: "cti-stateless-policy-input",
            modelVersion: "v1",
            scoreVector: scoreVector,
            uncertainty: new UncertaintyLevel(request.UncertaintyScore),
            reasoningSummary: "Deterministic policy evaluation from API scores.",
            rawOutputHash: BuildDeterministicHash(request),
            actorUserId: request.ActorUserId,
            nowUtc: nowUtc);

        var featureSnapshot = PointInTimeFeatureSnapshot.Capture(
            capturedAtUtc: nowUtc,
            featureSetHash: BuildFeatureSnapshotHash(request),
            featuresPayloadJson: BuildFeaturesPayloadJson(request),
            dataWindowReference: "api:cti/policy/evaluate",
            actorUserId: request.ActorUserId,
            nowUtc: nowUtc);

        var input = DeterministicPolicyInput.Create(
            modelDecisionTrace,
            featureSnapshot,
            request.MaliciousnessScore,
            request.ActionabilityScore,
            request.DeployabilityScore,
            request.DecayScore,
            request.UncertaintyScore,
            request.BlastRadiusScore,
            assetCriticality,
            evidenceFreshness,
            request.SourceTrust,
            evidenceConflict,
            currentRolloutStage);

        var policy = ActionPolicy.CreateDefaultV1(request.ActorUserId, nowUtc);
        var policyEngine = new DeterministicDecisionPolicyEngine();
        var outcome = policyEngine.Evaluate(request.CaseId, policy, input, request.ActorUserId, nowUtc);

        return Task.FromResult(new CtiPolicyEvaluationResponse(
            outcome.DecisionState.ToString(),
            outcome.RecommendedAction.ActionCode,
            outcome.ApprovalTierRequired.ToString(),
            outcome.RolloutPlan.Mode.ToString(),
            outcome.RollbackPlan.Requirement.ToString(),
            outcome.RollbackPlan.TriggerCondition,
            outcome.RollbackPlan.PlaybookReference,
            (int)outcome.RollbackPlan.RecoveryWindow.TotalMinutes,
            outcome.NextBestEvidence.Type.ToString(),
            outcome.NextBestEvidence.Request,
            outcome.NextBestEvidence.Rationale,
            outcome.ExpiryUtc,
            outcome.GuardrailNotes,
            outcome.PolicyVersion,
            outcome.RecommendedAction.Description));
    }

    private static string BuildDeterministicHash(EvaluateCtiPolicyRequest request)
    {
        var payload = FormattableString.Invariant(
            $"{request.CaseId:N}|{request.MaliciousnessScore:F4}|{request.ActionabilityScore:F4}|{request.DeployabilityScore:F4}|{request.DecayScore:F4}|{request.UncertaintyScore:F4}|{request.BlastRadiusScore:F4}|{request.AssetCriticality.Trim().ToLowerInvariant()}|{request.EvidenceFreshness.Trim().ToLowerInvariant()}|{request.SourceTrust:F4}|{request.EvidenceConflict.Trim().ToLowerInvariant()}|{request.CurrentRolloutStage.Trim().ToLowerInvariant()}");

        return Convert.ToHexString(System.Text.Encoding.UTF8.GetBytes(payload));
    }

    private static string BuildFeatureSnapshotHash(EvaluateCtiPolicyRequest request) =>
        FormattableString.Invariant(
            $"cti-policy-{request.CaseId:N}-{request.MaliciousnessScore:F3}-{request.ActionabilityScore:F3}-{request.DeployabilityScore:F3}");

    private static string BuildFeaturesPayloadJson(EvaluateCtiPolicyRequest request)
    {
        var payload = new
        {
            request.MaliciousnessScore,
            request.ActionabilityScore,
            request.DeployabilityScore,
            request.DecayScore,
            request.UncertaintyScore,
            request.BlastRadiusScore,
            request.AssetCriticality,
            request.EvidenceFreshness,
            request.SourceTrust,
            request.EvidenceConflict,
            request.CurrentRolloutStage,
        };

        return JsonSerializer.Serialize(payload);
    }
}
