namespace Backend.Domain.Common;

public static class RuleFamilyCatalog
{
    private static readonly string[] SupportedFamiliesInternal = ["yara", "sigma", "snort", "suricata"];
    private static readonly HashSet<string> SupportedSet = SupportedFamiliesInternal.ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyList<string> SupportedFamilies => SupportedFamiliesInternal;

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var candidate = value.Trim().ToLowerInvariant();
        if (!SupportedSet.Contains(candidate))
        {
            return false;
        }

        normalized = candidate;
        return true;
    }

    public static bool IsSupported(string? value)
    {
        return TryNormalize(value, out _);
    }

    public static string NormalizeOrThrow(string value, string paramName)
    {
        if (TryNormalize(value, out var normalized))
        {
            return normalized;
        }

        throw new ArgumentException($"RuleFamily must be one of: {string.Join(", ", SupportedFamiliesInternal)}.", paramName);
    }
}
