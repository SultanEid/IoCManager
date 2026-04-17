namespace IoCManager.Mvc.Contracts.Intel;

public sealed class IocUpsertRequest
{
    public string Type { get; set; } = "domain";
    public string Value { get; set; } = string.Empty;
    public DateTime? ExpiresAtUtc { get; set; }
    public string Source { get; set; } = "manual";
    public Dictionary<string, string>? Evidence { get; set; }
}

public sealed class IocStatusUpdateRequest
{
    public string Status { get; set; } = "new";
}

public sealed class IocListResponse
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Confidence { get; set; }
    public int SourceCount { get; set; }
    public DateTime FirstSeenUtc { get; set; }
    public DateTime LastSeenUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public IReadOnlyDictionary<string, int> ConfidenceFactors { get; set; } = new Dictionary<string, int>();
}
