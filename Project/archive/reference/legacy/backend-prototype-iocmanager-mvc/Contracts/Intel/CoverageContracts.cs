namespace IoCManager.Mvc.Contracts.Intel;

public sealed class DetectionCoverageRowResponse
{
    public int ObservableId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public IReadOnlyDictionary<string, string> Families { get; set; } = new Dictionary<string, string>();
}

public sealed class DetectionCoverageGapResponse
{
    public int ObservableId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public string MissingFamilies { get; set; } = string.Empty;
}
