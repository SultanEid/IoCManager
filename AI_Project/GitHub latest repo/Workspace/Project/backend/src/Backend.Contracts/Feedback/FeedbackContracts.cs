namespace Backend.Contracts.Feedback;

public sealed record SubmitFeedbackRequest(
    Guid CaseId,
    Guid? DecisionId,
    string Verdict,
    string Notes,
    string SubmittedByUserId);

public sealed record FeedbackResponse(
    Guid Id,
    Guid CaseId,
    Guid? DecisionId,
    string Verdict,
    string Notes,
    string SubmittedByUserId,
    DateTimeOffset SubmittedAtUtc);
