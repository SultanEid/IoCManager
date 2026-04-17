using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.RuleLifecycle;
using Backend.Domain.Cases;
using Backend.Domain.Common;
using Backend.Domain.RuleLifecycle;

namespace Backend.Application.Services;

public sealed class RuleWorkflowService : IRuleWorkflowService
{
    private const decimal HighRiskThreshold = 0.75m;
    private const decimal RollbackThresholdMargin = 0.07m;

    private readonly ICasesRepository _casesRepository;
    private readonly IRuleWorkflowRepository _ruleWorkflowRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public RuleWorkflowService(
        ICasesRepository casesRepository,
        IRuleWorkflowRepository ruleWorkflowRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _ruleWorkflowRepository = ruleWorkflowRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<RuleProposalResponse> CreateProposalAsync(CreateRuleProposalRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await GetCaseOrThrowAsync(request.CaseId, cancellationToken);
        var nowUtc = _dateTimeProvider.UtcNow;
        var riskScore = request.PolicyRiskScore ?? EstimateRiskScore(caseRecord.Priority, request.RuleBody, request.RuleFamily);

        var proposal = RuleProposal.Create(
            request.CaseId,
            request.ProposalName,
            request.RuleFamily,
            request.RuleBody,
            request.ProposedVersion,
            request.ProposedByUserId,
            request.Rationale,
            riskScore,
            nowUtc);

        await _ruleWorkflowRepository.AddProposalAsync(proposal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(proposal);
    }

    public async Task<RuleProposalResponse?> ReviewProposalAsync(
        Guid proposalId,
        ReviewRuleProposalRequest request,
        CancellationToken cancellationToken)
    {
        var proposal = await _ruleWorkflowRepository.GetProposalByIdAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return null;
        }

        var decision = request.Decision.Trim().ToLowerInvariant();
        var nowUtc = _dateTimeProvider.UtcNow;

        switch (decision)
        {
            case "accept":
                proposal.Accept(request.ReviewerUserId, request.ReviewReason, request.OverrideReason, HighRiskThreshold, nowUtc);
                break;
            case "reject":
                proposal.Reject(request.ReviewerUserId, request.ReviewReason, nowUtc);
                break;
            default:
                throw new ArgumentException("Decision must be either 'accept' or 'reject'.", nameof(request.Decision));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(proposal);
    }

    public async Task<RuleSimulationResultResponse?> SimulateProposalAsync(
        Guid proposalId,
        SimulateRuleProposalRequest request,
        CancellationToken cancellationToken)
    {
        var proposal = await _ruleWorkflowRepository.GetProposalByIdAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return null;
        }

        if (proposal.Status == RuleProposalStatus.Rejected)
        {
            throw new InvalidOperationException("Rejected proposals cannot be simulated.");
        }

        var caseRecord = await GetCaseOrThrowAsync(proposal.CaseId, cancellationToken);
        var proposalsByCase = await _ruleWorkflowRepository.ListProposalsByCaseAsync(proposal.CaseId, cancellationToken);
        var analystAcceptanceRate = CalculateAcceptanceRate(proposalsByCase);
        var nowUtc = _dateTimeProvider.UtcNow;
        var simulation = BuildSimulation(caseRecord, proposal, request.Notes);

        var recommendation = await _ruleWorkflowRepository.GetRecommendationByProposalIdAsync(proposal.Id, cancellationToken);
        if (recommendation is null)
        {
            recommendation = DeploymentRecommendation.Create(
                proposal.CaseId,
                proposal.Id,
                request.TargetEnvironment,
                RolloutStage.Shadow,
                proposal.PolicyRiskScore,
                simulation.PredictedNoise,
                simulation.BaselineNoise,
                analystAcceptanceRate,
                requiresHumanApproval: true,
                request.ActorUserId,
                simulation.Rationale,
                nowUtc);

            await _ruleWorkflowRepository.AddRecommendationAsync(recommendation, cancellationToken);
        }
        else
        {
            recommendation.RefreshSimulation(
                proposal.PolicyRiskScore,
                simulation.PredictedNoise,
                simulation.BaselineNoise,
                analystAcceptanceRate,
                requiresHumanApproval: true,
                request.ActorUserId,
                simulation.Rationale,
                nowUtc);
        }

        var rolloutPlan = await _ruleWorkflowRepository.GetRolloutPlanByRecommendationIdAsync(recommendation.Id, cancellationToken);
        if (rolloutPlan is null)
        {
            rolloutPlan = RolloutPlan.Create(
                proposal.CaseId,
                proposal.Id,
                recommendation.Id,
                recommendation.PredictedNoise,
                analystAcceptanceRate,
                request.ActorUserId,
                nowUtc);

            await _ruleWorkflowRepository.AddRolloutPlanAsync(rolloutPlan, cancellationToken);
        }
        else
        {
            rolloutPlan.RefreshSimulationSnapshot(recommendation.PredictedNoise, analystAcceptanceRate, request.ActorUserId, nowUtc);
        }

        var rollbackPlan = await _ruleWorkflowRepository.GetRollbackPlanByRolloutPlanIdAsync(rolloutPlan.Id, cancellationToken);
        var rollbackThreshold = ClampUnitInterval(recommendation.PredictedNoise + RollbackThresholdMargin);
        if (rollbackPlan is null)
        {
            rollbackPlan = RollbackPlan.Create(
                proposal.CaseId,
                proposal.Id,
                rolloutPlan.Id,
                "Observed noise exceeds predicted threshold.",
                "cti-playbook://rollback/v1",
                rollbackThreshold,
                request.ActorUserId,
                nowUtc);

            await _ruleWorkflowRepository.AddRollbackPlanAsync(rollbackPlan, cancellationToken);
        }
        else
        {
            rollbackPlan.RefreshThreshold(rollbackThreshold, request.ActorUserId, nowUtc);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new RuleSimulationResultResponse(
            ToResponse(proposal),
            ToResponse(recommendation, analystAcceptanceRate),
            ToResponse(rolloutPlan, analystAcceptanceRate),
            ToResponse(rollbackPlan));
    }

    public async Task<RolloutPlanResponse?> AdvanceRolloutStageAsync(
        Guid rolloutPlanId,
        AdvanceRolloutStageRequest request,
        CancellationToken cancellationToken)
    {
        var rolloutPlan = await _ruleWorkflowRepository.GetRolloutPlanByIdAsync(rolloutPlanId, cancellationToken);
        if (rolloutPlan is null)
        {
            return null;
        }

        var recommendation = await _ruleWorkflowRepository.GetRecommendationByIdAsync(rolloutPlan.DeploymentRecommendationId, cancellationToken);
        if (recommendation is null)
        {
            throw new NotFoundException($"Deployment recommendation {rolloutPlan.DeploymentRecommendationId} was not found.");
        }

        var stage = EnumParser.Parse<RolloutStage>(request.Stage, nameof(request.Stage));
        var nowUtc = _dateTimeProvider.UtcNow;
        var isHighRisk = recommendation.RiskScore >= HighRiskThreshold;

        rolloutPlan.AdvanceTo(stage, request.ActorUserId, request.Reason, request.OverrideReason, isHighRisk, nowUtc);

        var rollbackPlan = await _ruleWorkflowRepository.GetRollbackPlanByRolloutPlanIdAsync(rolloutPlan.Id, cancellationToken);
        if (stage == RolloutStage.Rollback && rollbackPlan is not null && !rollbackPlan.IsTriggered)
        {
            rollbackPlan.Trigger(request.ActorUserId, request.Reason, rolloutPlan.ObservedNoise, nowUtc);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var acceptanceRate = await GetCaseAcceptanceRateAsync(rolloutPlan.CaseId, cancellationToken);
        return ToResponse(rolloutPlan, acceptanceRate);
    }

    public async Task<RolloutPlanResponse?> RecordCanaryObservationAsync(
        Guid rolloutPlanId,
        RecordCanaryObservationRequest request,
        CancellationToken cancellationToken)
    {
        var rolloutPlan = await _ruleWorkflowRepository.GetRolloutPlanByIdAsync(rolloutPlanId, cancellationToken);
        if (rolloutPlan is null)
        {
            return null;
        }

        var nowUtc = _dateTimeProvider.UtcNow;
        rolloutPlan.RecordCanaryObservation(
            request.ObservedNoise,
            request.AnalystAcceptedCount,
            request.AnalystReviewedCount,
            request.ActorUserId,
            nowUtc);

        var rollbackPlan = await _ruleWorkflowRepository.GetRollbackPlanByRolloutPlanIdAsync(rolloutPlan.Id, cancellationToken);
        rollbackPlan?.RecordObservation(request.ObservedNoise, request.ActorUserId, nowUtc);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(rolloutPlan, rolloutPlan.AnalystAcceptanceRate);
    }

    public async Task<RollbackPlanResponse?> TriggerRollbackAsync(
        Guid rollbackPlanId,
        TriggerRollbackRequest request,
        CancellationToken cancellationToken)
    {
        var rollbackPlan = await _ruleWorkflowRepository.GetRollbackPlanByIdAsync(rollbackPlanId, cancellationToken);
        if (rollbackPlan is null)
        {
            return null;
        }

        var nowUtc = _dateTimeProvider.UtcNow;
        rollbackPlan.Trigger(request.ActorUserId, request.Reason, request.ObservedNoise, nowUtc);

        var rolloutPlan = await _ruleWorkflowRepository.GetRolloutPlanByIdAsync(rollbackPlan.RolloutPlanId, cancellationToken);
        if (rolloutPlan is not null && rolloutPlan.CurrentStage != RolloutStage.Rollback)
        {
            rolloutPlan.AdvanceTo(
                RolloutStage.Rollback,
                request.ActorUserId,
                request.Reason,
                request.Reason,
                highRisk: true,
                nowUtc);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(rollbackPlan);
    }

    public async Task<CaseRuleWorkflowResponse> GetCaseWorkflowAsync(Guid caseId, CancellationToken cancellationToken)
    {
        await GetCaseOrThrowAsync(caseId, cancellationToken);

        var proposals = await _ruleWorkflowRepository.ListProposalsByCaseAsync(caseId, cancellationToken);
        var recommendations = await _ruleWorkflowRepository.ListRecommendationsByCaseAsync(caseId, cancellationToken);
        var rolloutPlans = await _ruleWorkflowRepository.ListRolloutPlansByCaseAsync(caseId, cancellationToken);
        var rollbackPlans = await _ruleWorkflowRepository.ListRollbackPlansByCaseAsync(caseId, cancellationToken);

        var analystAcceptanceRate = CalculateAcceptanceRate(proposals);

        return new CaseRuleWorkflowResponse(
            caseId,
            proposals.Select(ToResponse).ToArray(),
            recommendations.Select(x => ToResponse(x, analystAcceptanceRate)).ToArray(),
            rolloutPlans.Select(x => ToResponse(x, analystAcceptanceRate)).ToArray(),
            rollbackPlans.Select(ToResponse).ToArray(),
            analystAcceptanceRate);
    }

    private async Task<CaseRecord> GetCaseOrThrowAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(caseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {caseId} was not found.");
        }

        return caseRecord;
    }

    private static decimal EstimateRiskScore(CasePriority priority, string ruleBody, string ruleFamily)
    {
        var normalizedFamily = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily));
        var priorityFactor = priority switch
        {
            CasePriority.Low => 0.10m,
            CasePriority.Medium => 0.20m,
            CasePriority.High => 0.32m,
            CasePriority.Critical => 0.45m,
            _ => 0.20m,
        };

        var normalizedBodyLength = Math.Min(ruleBody.Trim().Length, 16_000);
        var complexityFactor = decimal.Round(normalizedBodyLength / 25_000m, 4, MidpointRounding.AwayFromZero);
        var familyFactor = normalizedFamily switch
        {
            "yara" => 0.04m,
            "sigma" => 0.08m,
            "snort" => 0.08m,
            "suricata" => 0.08m,
            _ => 0.04m,
        };

        return ClampUnitInterval(0.20m + priorityFactor + complexityFactor + familyFactor);
    }

    private static SimulationMetrics BuildSimulation(CaseRecord caseRecord, RuleProposal proposal, string? notes)
    {
        var priorityBaseline = caseRecord.Priority switch
        {
            CasePriority.Low => 0.26m,
            CasePriority.Medium => 0.34m,
            CasePriority.High => 0.44m,
            CasePriority.Critical => 0.54m,
            _ => 0.34m,
        };

        var complexityPenalty = Math.Min(0.16m, proposal.RuleBody.Length / 20_000m);
        var blanketBaseline = ClampUnitInterval(priorityBaseline + complexityPenalty);
        var projectedImprovement = 0.07m + ((1m - proposal.PolicyRiskScore) * 0.06m);
        var predictedNoise = ClampUnitInterval(blanketBaseline - projectedImprovement);
        var noiseDelta = predictedNoise - blanketBaseline;

        var rationale = FormattableString.Invariant(
            $"Predicted noise {predictedNoise:F3} vs blanket baseline {blanketBaseline:F3} (delta {noiseDelta:F3}).");

        if (!string.IsNullOrWhiteSpace(notes))
        {
            rationale = FormattableString.Invariant($"{rationale} Analyst note: {notes.Trim()}");
        }

        return new SimulationMetrics(predictedNoise, blanketBaseline, rationale);
    }

    private async Task<decimal> GetCaseAcceptanceRateAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var proposals = await _ruleWorkflowRepository.ListProposalsByCaseAsync(caseId, cancellationToken);
        return CalculateAcceptanceRate(proposals);
    }

    private static decimal CalculateAcceptanceRate(IReadOnlyList<RuleProposal> proposals)
    {
        var reviewed = proposals.Count(x => x.Status is RuleProposalStatus.Accepted or RuleProposalStatus.Rejected);
        if (reviewed == 0)
        {
            return 0m;
        }

        var accepted = proposals.Count(x => x.Status == RuleProposalStatus.Accepted);
        return decimal.Round((decimal)accepted / reviewed, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal ClampUnitInterval(decimal value)
    {
        if (value < 0m)
        {
            return 0m;
        }

        if (value > 1m)
        {
            return 1m;
        }

        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static RuleProposalResponse ToResponse(RuleProposal proposal)
    {
        return new RuleProposalResponse(
            proposal.Id,
            proposal.CaseId,
            proposal.ProposalName,
            proposal.RuleFamily,
            proposal.RuleBody,
            proposal.ProposedVersion,
            proposal.ProposedByUserId,
            proposal.Rationale,
            proposal.PolicyRiskScore,
            proposal.Status.ToString(),
            proposal.ReviewedByUserId,
            proposal.ReviewedAtUtc,
            proposal.ReviewReason,
            proposal.OverrideReason,
            proposal.CreatedAtUtc,
            proposal.UpdatedAtUtc);
    }

    private static DeploymentRecommendationResponse ToResponse(
        DeploymentRecommendation recommendation,
        decimal analystAcceptanceRate)
    {
        return new DeploymentRecommendationResponse(
            recommendation.Id,
            recommendation.CaseId,
            recommendation.RuleProposalId,
            recommendation.TargetEnvironment,
            recommendation.RecommendedStage.ToString().ToLowerInvariant(),
            recommendation.RiskScore,
            recommendation.PredictedNoise,
            recommendation.BaselineNoise,
            recommendation.PredictedNoiseDelta,
            analystAcceptanceRate,
            recommendation.RequiresHumanApproval,
            recommendation.AutoPublishEnabled,
            recommendation.RequestedByUserId,
            recommendation.Rationale,
            recommendation.RecommendedAtUtc,
            recommendation.CreatedAtUtc,
            recommendation.UpdatedAtUtc);
    }

    private static RolloutPlanResponse ToResponse(RolloutPlan rolloutPlan, decimal analystAcceptanceRate)
    {
        return new RolloutPlanResponse(
            rolloutPlan.Id,
            rolloutPlan.CaseId,
            rolloutPlan.RuleProposalId,
            rolloutPlan.DeploymentRecommendationId,
            rolloutPlan.CurrentStage.ToString().ToLowerInvariant(),
            rolloutPlan.CanaryTrafficPercent,
            rolloutPlan.PredictedNoise,
            rolloutPlan.ObservedNoise,
            rolloutPlan.ObservedNoiseDelta,
            analystAcceptanceRate,
            rolloutPlan.RequiresManualPromotion,
            rolloutPlan.ShadowStartedAtUtc,
            rolloutPlan.CanaryStartedAtUtc,
            rolloutPlan.PromotedAtUtc,
            rolloutPlan.RolledBackAtUtc,
            rolloutPlan.LastStageReason,
            rolloutPlan.LastOverrideReason,
            rolloutPlan.CreatedAtUtc,
            rolloutPlan.UpdatedAtUtc);
    }

    private static RollbackPlanResponse ToResponse(RollbackPlan rollbackPlan)
    {
        return new RollbackPlanResponse(
            rollbackPlan.Id,
            rollbackPlan.CaseId,
            rollbackPlan.RuleProposalId,
            rollbackPlan.RolloutPlanId,
            rollbackPlan.TriggerCondition,
            rollbackPlan.RecoveryPlaybook,
            rollbackPlan.PredictedNoiseThreshold,
            rollbackPlan.LastObservedNoise,
            rollbackPlan.TriggerConditionMet,
            rollbackPlan.IsTriggered,
            rollbackPlan.TriggeredByUserId,
            rollbackPlan.TriggeredAtUtc,
            rollbackPlan.TriggerReason,
            rollbackPlan.CreatedAtUtc,
            rollbackPlan.UpdatedAtUtc);
    }

    private sealed record SimulationMetrics(decimal PredictedNoise, decimal BaselineNoise, string Rationale);
}
