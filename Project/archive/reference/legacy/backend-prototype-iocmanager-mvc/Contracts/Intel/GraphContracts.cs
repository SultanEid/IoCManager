namespace IoCManager.Mvc.Contracts.Intel;

public sealed class GraphNodeResponse
{
    public int Id { get; set; }
    public string NodeType { get; set; } = "observable";
    public string ObservableType { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Confidence { get; set; }
}

public sealed class GraphEdgeResponse
{
    public int Id { get; set; }
    public int Source { get; set; }
    public int Target { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public int EvidenceCount { get; set; }
}
