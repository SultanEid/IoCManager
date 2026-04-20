using Backend.Domain.Common;

namespace Backend.Domain.Feedback;

public sealed class FeedbackRecord : AuditableEntity
{
    public Guid CaseId { get; private set; }
    public Guid? DecisionId { get; private set; }
    public FeedbackVerdict Verdict { get; private set; } = FeedbackVerdict.InsufficientEvidence;
    public decimal Confidence { get; private set; }
    public decimal FalsePositiveRisk { get; private set; }
    public CasePriority ReviewPriority { get; private set; } = CasePriority.Medium;
    public bool ShouldPromoteToIndicator { get; private set; }
    public bool ShouldSuppress { get; private set; }
    public bool ShouldAllowlist { get; private set; }
    public bool ShouldEscalate { get; private set; }
    public string Notes { get; private set; } = string.Empty;
    public string SubmittedByUserId { get; private set; } = string.Empty;

    private FeedbackRecord()
    {
    }

    public static FeedbackRecord Submit(
        Guid caseId,
        Guid? decisionId,
        FeedbackVerdict verdict,
        FeedbackAuxiliaryOutputs auxiliaryOutputs,
        string notes,
        string submittedByUserId,
        DateTimeOffset submittedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId);
        ArgumentNullException.ThrowIfNull(auxiliaryOutputs);
        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        var feedback = new FeedbackRecord
        {
            CaseId = caseId,
            DecisionId = decisionId,
            Verdict = verdict,
            Confidence = auxiliaryOutputs.Confidence,
            FalsePositiveRisk = auxiliaryOutputs.FalsePositiveRisk,
            ReviewPriority = auxiliaryOutputs.ReviewPriority,
            ShouldPromoteToIndicator = auxiliaryOutputs.ShouldPromoteToIndicator,
            ShouldSuppress = auxiliaryOutputs.ShouldSuppress,
            ShouldAllowlist = auxiliaryOutputs.ShouldAllowlist,
            ShouldEscalate = auxiliaryOutputs.ShouldEscalate,
            Notes = notes.Trim(),
            SubmittedByUserId = submittedByUserId.Trim(),
        };

        feedback.StampCreation(submittedByUserId, submittedAtUtc);
        return feedback;
    }
}
