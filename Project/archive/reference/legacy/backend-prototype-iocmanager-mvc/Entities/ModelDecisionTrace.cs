namespace IoCManager.Mvc.Entities;

public sealed class ModelDecisionTrace
{
    public int Id { get; set; }
    public int ObservableId { get; set; }
    public string ObservableType { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = "manual";
    public string EventTimeUtc { get; set; } = string.Empty;
    public double RiskScore { get; set; }
    public string RiskTier { get; set; } = "unknown";
    public double Confidence { get; set; }
    public string UncertaintySetJson { get; set; } = "[]";
    public string TopEvidenceJson { get; set; } = "[]";
    public string RecommendedAction { get; set; } = "monitor";
    public int TtlHours { get; set; } = 24;
    public string ModelVersion { get; set; } = "unknown";
    public string DecisionTraceHash { get; set; } = string.Empty;
    public string? CaseId { get; set; }
    public string AsOfTimeUtc { get; set; } = string.Empty;
    public string DatasetVersion { get; set; } = "unknown";
    public string FeatureSnapshotHash { get; set; } = string.Empty;
    public string PolicyVersion { get; set; } = "cti-policy-v1";
    public string DecisionState { get; set; } = DecisionStates.Defer;
    public string MissingEvidenceHintsJson { get; set; } = "[]";
    public string TopContributingFeaturesJson { get; set; } = "[]";
    public string NeighborContextRefsJson { get; set; } = "[]";
    public string SimilarCaseRefsJson { get; set; } = "[]";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
