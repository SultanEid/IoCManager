using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1;

public sealed class ModelDecisionTrace : AuditableEntity
{
    private ModelDecisionTrace()
    {
    }

    public string ModelName { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public ScoreVector ScoreVector { get; private set; }
    public UncertaintyLevel Uncertainty { get; private set; }
    public string ReasoningSummary { get; private set; } = string.Empty;
    public string RawOutputHash { get; private set; } = string.Empty;

    public static ModelDecisionTrace Create(
        string modelName,
        string modelVersion,
        ScoreVector scoreVector,
        UncertaintyLevel uncertainty,
        string reasoningSummary,
        string rawOutputHash,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(modelName);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(reasoningSummary);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawOutputHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var trace = new ModelDecisionTrace
        {
            ModelName = modelName.Trim(),
            ModelVersion = modelVersion.Trim(),
            ScoreVector = scoreVector,
            Uncertainty = uncertainty,
            ReasoningSummary = reasoningSummary.Trim(),
            RawOutputHash = rawOutputHash.Trim(),
        };

        trace.StampCreation(actorUserId, nowUtc);
        return trace;
    }
}
