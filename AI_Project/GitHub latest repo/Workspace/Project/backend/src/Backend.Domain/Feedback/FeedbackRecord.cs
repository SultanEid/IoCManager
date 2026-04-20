using Backend.Domain.Common;

namespace Backend.Domain.Feedback;

public sealed class FeedbackRecord : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public FeedbackVerdict Verdict { get; private set; } = FeedbackVerdict.NeedsMoreEvidence;
    public string Notes { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;

    private FeedbackRecord()
    {
    }

    public static FeedbackRecord Submit(
        Guid caseId,
        Guid? decisionId,
        FeedbackVerdict verdict,
        string notes,
        string submittedByUserId,
        DateTimeOffset submittedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);
        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var feedback = new FeedbackRecord
        {
            CaseId = caseId,
            DecisionId = decisionId,
            Verdict = verdict,
            Notes = notes.Trim(),
            SubmittedByUserId = submittedByUserId.Trim(),
        };

        feedback.StampCreation(submittedByUserId, submittedAtUtc);
        return feedback;
    }
}
