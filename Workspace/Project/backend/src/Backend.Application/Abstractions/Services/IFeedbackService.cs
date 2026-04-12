using Backend.Contracts.Feedback;

namespace Backend.Application.Abstractions.Services;

public interface IFeedbackService
{
    Task<FeedbackResponse> SubmitAsync(SubmitFeedbackRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<FeedbackResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
