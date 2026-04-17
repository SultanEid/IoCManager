using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Entities;

namespace IoCManager.Mvc.Services;

public interface IIocDecisionTraceService
{
    Task RecordScoreAsync(
        ObservableRecord observable,
        ScoreIocRequest scoreRequest,
        ScoreResponse scoreResponse,
        CancellationToken cancellationToken = default);

    Task RecordFeedbackAsync(
        FeedbackRequest request,
        string analystUserId,
        CancellationToken cancellationToken = default);
}
