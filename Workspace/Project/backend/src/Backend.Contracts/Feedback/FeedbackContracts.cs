namespace Backend.Contracts.Feedback;

public sealed record SubmitFeedbackRequest(
    Guid CaseId,
    Guid? DecisionId,
    string Verdict,
    decimal? Confidence,
    decimal? FalsePositiveRisk,
    string? ReviewPriority,
    bool? ShouldPromoteToIndicator,
    bool? ShouldSuppress,
    bool? ShouldAllowlist,
    bool? ShouldEscalate,
    string Notes,
    string SubmittedByUserId);

public sealed record FeedbackResponse(
    Guid Id,
    Guid CaseId,
    Guid? DecisionId,
    string Verdict,
    decimal Confidence,
    decimal FalsePositiveRisk,
    string ReviewPriority,
    bool ShouldPromoteToIndicator,
    bool ShouldSuppress,
    bool ShouldAllowlist,
    bool ShouldEscalate,
    string Notes,
    string SubmittedByUserId,
    DateTimeOffset SubmittedAtUtc);
