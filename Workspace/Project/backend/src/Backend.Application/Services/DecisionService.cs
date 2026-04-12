using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Decisions;
using Backend.Domain.Common;
using Backend.Domain.Decisions;

namespace Backend.Application.Services;

public sealed class DecisionService : IDecisionService
{
    private readonly ICasesRepository _casesRepository;
    private readonly IDecisionsRepository _decisionsRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public DecisionService(
        ICasesRepository casesRepository,
        IDecisionsRepository decisionsRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _decisionsRepository = decisionsRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<DecisionResponse> CreateAsync(CreateDecisionRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(request.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {request.CaseId} was not found.");
        }

        var approvalTier = EnumParser.Parse<ApprovalTier>(request.ApprovalTierRequired, nameof(request.ApprovalTierRequired));
        var nowUtc = _dateTimeProvider.UtcNow;

        var decision = DecisionRecord.Propose(
            request.CaseId,
            request.RecommendedAction,
            approvalTier,
            request.PolicyVersion,
            request.ModelVersion,
            request.Reasoning,
            request.ActorUserId,
            nowUtc);

        await _decisionsRepository.AddAsync(decision, cancellationToken);

        if (caseRecord.Status == CaseStatus.Open)
        {
            caseRecord.TransitionTo(CaseStatus.InReview, request.ActorUserId, nowUtc);
        }

        if (caseRecord.Status == CaseStatus.InReview)
        {
            caseRecord.TransitionTo(CaseStatus.AwaitingApproval, request.ActorUserId, nowUtc);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(decision);
    }

    public async Task<DecisionResponse?> FinalizeAsync(Guid decisionId, FinalizeDecisionRequest request, CancellationToken cancellationToken)
    {
        var decision = await _decisionsRepository.GetByIdAsync(decisionId, cancellationToken);
        if (decision is null)
        {
            return null;
        }

        var caseRecord = await _casesRepository.GetByIdAsync(decision.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {decision.CaseId} linked to decision {decisionId} was not found.");
        }

        var outcome = EnumParser.Parse<DecisionState>(request.Outcome, nameof(request.Outcome));
        var nowUtc = _dateTimeProvider.UtcNow;

        switch (outcome)
        {
            case DecisionState.Approved:
                decision.Approve(request.ActorUserId, nowUtc);
                if (caseRecord.Status == CaseStatus.AwaitingApproval)
                {
                    caseRecord.TransitionTo(CaseStatus.Approved, request.ActorUserId, nowUtc);
                }
                break;
            case DecisionState.Rejected:
                decision.Reject(request.ActorUserId, nowUtc);
                if (caseRecord.Status is CaseStatus.AwaitingApproval or CaseStatus.Approved)
                {
                    caseRecord.TransitionTo(CaseStatus.Rejected, request.ActorUserId, nowUtc);
                }
                break;
            case DecisionState.Deferred:
                decision.Defer(request.ActorUserId, nowUtc);
                break;
            default:
                throw new ArgumentException("Outcome must be Approved, Rejected, or Deferred.", nameof(request.Outcome));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(decision);
    }

    public async Task<IReadOnlyList<DecisionResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _decisionsRepository.ListByCaseAsync(caseId, cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    private static DecisionResponse ToResponse(DecisionRecord item)
    {
        return new DecisionResponse(
            item.Id,
            item.CaseId,
            item.State.ToString(),
            item.RecommendedAction,
            item.ApprovalTierRequired.ToString(),
            item.PolicyVersion,
            item.ModelVersion,
            item.Reasoning,
            item.ApprovedByUserId,
            item.ApprovedAtUtc,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }
}
