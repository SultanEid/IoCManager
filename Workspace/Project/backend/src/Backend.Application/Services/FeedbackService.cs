using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Feedback;
using Backend.Domain.Common;
using Backend.Domain.Feedback;

namespace Backend.Application.Services;

public sealed class FeedbackService : IFeedbackService
{
    private readonly ICasesRepository _casesRepository;
    private readonly IDecisionsRepository _decisionsRepository;
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public FeedbackService(
        ICasesRepository casesRepository,
        IDecisionsRepository decisionsRepository,
        IFeedbackRepository feedbackRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _decisionsRepository = decisionsRepository;
        _feedbackRepository = feedbackRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<FeedbackResponse> SubmitAsync(SubmitFeedbackRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(request.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {request.CaseId} was not found.");
        }

        if (request.DecisionId is { } decisionId)
        {
            var decision = await _decisionsRepository.GetByIdAsync(decisionId, cancellationToken);
            if (decision is null || decision.CaseId != request.CaseId)
            {
                throw new NotFoundException($"Decision {decisionId} was not found for case {request.CaseId}.");
            }
        }

        var verdict = FeedbackTaxonomy.ParseVerdictOrThrow(request.Verdict, nameof(request.Verdict));
        CasePriority? reviewPriority = request.ReviewPriority is null
            ? null
            : FeedbackTaxonomy.ParsePriorityOrThrow(request.ReviewPriority, nameof(request.ReviewPriority));
        var auxiliaryOutputs = FeedbackAuxiliaryOutputs.Resolve(
            verdict,
            request.Confidence,
            request.FalsePositiveRisk,
            reviewPriority,
            request.ShouldPromoteToIndicator,
            request.ShouldSuppress,
            request.ShouldAllowlist,
            request.ShouldEscalate);
        var feedback = FeedbackRecord.Submit(
            request.CaseId,
            request.DecisionId,
            verdict,
            auxiliaryOutputs,
            request.Notes,
            request.SubmittedByUserId,
            _dateTimeProvider.UtcNow);

        await _feedbackRepository.AddAsync(feedback, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(feedback);
    }

    public async Task<IReadOnlyList<FeedbackResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _feedbackRepository.ListByCaseAsync(caseId, cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    private static FeedbackResponse ToResponse(FeedbackRecord item)
    {
        return new FeedbackResponse(
            item.Id,
            item.CaseId,
            item.DecisionId,
            FeedbackTaxonomy.ToWireValue(item.Verdict),
            item.Confidence,
            item.FalsePositiveRisk,
            FeedbackTaxonomy.ToWireValue(item.ReviewPriority),
            item.ShouldPromoteToIndicator,
            item.ShouldSuppress,
            item.ShouldAllowlist,
            item.ShouldEscalate,
            item.Notes,
            item.SubmittedByUserId,
            item.CreatedAtUtc);
    }
}
