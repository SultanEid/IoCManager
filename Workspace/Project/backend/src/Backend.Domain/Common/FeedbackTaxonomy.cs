namespace Backend.Domain.Common;

public static class FeedbackTaxonomy
{
    public const string Benign = "benign";
    public const string LikelyBenign = "likely_benign";
    public const string Suspicious = "suspicious";
    public const string LikelyMalicious = "likely_malicious";
    public const string Malicious = "malicious";
    public const string FalsePositive = "false_positive";
    public const string InsufficientEvidence = "insufficient_evidence";
    public const string StaleOrRevoked = "stale_or_revoked";

    private static readonly IReadOnlyDictionary<FeedbackVerdict, string> VerdictToWire =
        new Dictionary<FeedbackVerdict, string>
        {
            [FeedbackVerdict.Benign] = Benign,
            [FeedbackVerdict.LikelyBenign] = LikelyBenign,
            [FeedbackVerdict.Suspicious] = Suspicious,
            [FeedbackVerdict.LikelyMalicious] = LikelyMalicious,
            [FeedbackVerdict.Malicious] = Malicious,
            [FeedbackVerdict.FalsePositive] = FalsePositive,
            [FeedbackVerdict.InsufficientEvidence] = InsufficientEvidence,
            [FeedbackVerdict.StaleOrRevoked] = StaleOrRevoked,
        };

    private static readonly IReadOnlyDictionary<string, FeedbackVerdict> VerdictAliases =
        new Dictionary<string, FeedbackVerdict>(StringComparer.OrdinalIgnoreCase)
        {
            [Benign] = FeedbackVerdict.Benign,
            [LikelyBenign] = FeedbackVerdict.LikelyBenign,
            [Suspicious] = FeedbackVerdict.Suspicious,
            [LikelyMalicious] = FeedbackVerdict.LikelyMalicious,
            [Malicious] = FeedbackVerdict.Malicious,
            [FalsePositive] = FeedbackVerdict.FalsePositive,
            [InsufficientEvidence] = FeedbackVerdict.InsufficientEvidence,
            [StaleOrRevoked] = FeedbackVerdict.StaleOrRevoked,
            // Legacy compatibility aliases.
            ["ConfirmedThreat"] = FeedbackVerdict.Malicious,
            ["confirmed_malicious"] = FeedbackVerdict.Malicious,
            ["true_positive"] = FeedbackVerdict.Malicious,
            ["escalated"] = FeedbackVerdict.Malicious,
            ["NeedsMoreEvidence"] = FeedbackVerdict.InsufficientEvidence,
        };

    private static readonly IReadOnlyDictionary<CasePriority, string> PriorityToWire =
        new Dictionary<CasePriority, string>
        {
            [CasePriority.Low] = "low",
            [CasePriority.Medium] = "medium",
            [CasePriority.High] = "high",
            [CasePriority.Critical] = "critical",
        };

    private static readonly IReadOnlyDictionary<string, CasePriority> PriorityAliases =
        new Dictionary<string, CasePriority>(StringComparer.OrdinalIgnoreCase)
        {
            ["low"] = CasePriority.Low,
            ["medium"] = CasePriority.Medium,
            ["high"] = CasePriority.High,
            ["critical"] = CasePriority.Critical,
        };

    public static IReadOnlyCollection<string> SupportedVerdictWireValues => VerdictToWire.Values.ToArray();

    public static string ToWireValue(FeedbackVerdict verdict)
    {
        if (!VerdictToWire.TryGetValue(verdict, out var value))
        {
            throw new ArgumentOutOfRangeException(nameof(verdict), verdict, "Unsupported feedback verdict.");
        }

        return value;
    }

    public static bool TryParseVerdict(string? value, out FeedbackVerdict verdict)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            verdict = default;
            return false;
        }

        return VerdictAliases.TryGetValue(value.Trim(), out verdict);
    }

    public static FeedbackVerdict ParseVerdictOrThrow(string value, string paramName)
    {
        if (!TryParseVerdict(value, out var verdict))
        {
            throw new ArgumentException($"Invalid feedback verdict '{value}'.", paramName);
        }

        return verdict;
    }

    public static string ToWireValue(CasePriority priority)
    {
        if (!PriorityToWire.TryGetValue(priority, out var value))
        {
            throw new ArgumentOutOfRangeException(nameof(priority), priority, "Unsupported review priority.");
        }

        return value;
    }

    public static bool TryParsePriority(string? value, out CasePriority priority)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            priority = default;
            return false;
        }

        return PriorityAliases.TryGetValue(value.Trim(), out priority);
    }

    public static CasePriority ParsePriorityOrThrow(string value, string paramName)
    {
        if (!TryParsePriority(value, out var priority))
        {
            throw new ArgumentException($"Invalid review priority '{value}'.", paramName);
        }

        return priority;
    }
}
