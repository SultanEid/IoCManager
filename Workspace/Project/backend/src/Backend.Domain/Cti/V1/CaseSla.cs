namespace Backend.Domain.Cti.V1;

public sealed class CaseSla
{
    private CaseSla()
    {
    }

    public TimeSpan TriageTarget { get; private set; }
    public TimeSpan RecommendationTarget { get; private set; }
    public TimeSpan ApprovalTarget { get; private set; }

    public static CaseSla Create(TimeSpan triageTarget, TimeSpan recommendationTarget, TimeSpan approvalTarget)
    {
        if (triageTarget <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(triageTarget), "Triage target must be positive.");
        }

        if (recommendationTarget <= triageTarget)
        {
            throw new ArgumentOutOfRangeException(nameof(recommendationTarget), "Recommendation target must exceed triage target.");
        }

        if (approvalTarget <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(approvalTarget), "Approval target must be positive.");
        }

        return new CaseSla
        {
            TriageTarget = triageTarget,
            RecommendationTarget = recommendationTarget,
            ApprovalTarget = approvalTarget,
        };
    }
}
