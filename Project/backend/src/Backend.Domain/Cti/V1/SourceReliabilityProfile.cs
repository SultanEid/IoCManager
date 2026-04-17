namespace Backend.Domain.Cti.V1;

public sealed class SourceReliabilityProfile
{
    private SourceReliabilityProfile()
    {
    }

    public string SourceSystem { get; private set; } = string.Empty;
    public decimal HistoricalPrecision { get; private set; }
    public decimal HistoricalRecall { get; private set; }
    public decimal TrustScore { get; private set; }
    public DateTimeOffset EvaluatedAtUtc { get; private set; }

    public static SourceReliabilityProfile Create(
        string sourceSystem,
        decimal historicalPrecision,
        decimal historicalRecall,
        DateTimeOffset evaluatedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceSystem);

        var precision = ValidateUnitInterval(historicalPrecision, nameof(historicalPrecision));
        var recall = ValidateUnitInterval(historicalRecall, nameof(historicalRecall));

        return new SourceReliabilityProfile
        {
            SourceSystem = sourceSystem.Trim(),
            HistoricalPrecision = precision,
            HistoricalRecall = recall,
            TrustScore = Math.Clamp((precision * 0.65m) + (recall * 0.35m), 0m, 1m),
            EvaluatedAtUtc = evaluatedAtUtc,
        };
    }

    private static decimal ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }

        return value;
    }
}
