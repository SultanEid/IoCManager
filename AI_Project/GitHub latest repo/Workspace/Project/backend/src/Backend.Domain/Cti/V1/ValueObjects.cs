namespace Backend.Domain.Cti.V1;

public readonly record struct ScoreVector
{
    public ScoreVector(decimal threatScore, decimal impactScore, decimal exploitabilityScore)
    {
        ThreatScore = ValidateUnitInterval(threatScore, nameof(threatScore));
        ImpactScore = ValidateUnitInterval(impactScore, nameof(impactScore));
        ExploitabilityScore = ValidateUnitInterval(exploitabilityScore, nameof(exploitabilityScore));
    }

    public decimal ThreatScore { get; }
    public decimal ImpactScore { get; }
    public decimal ExploitabilityScore { get; }

    public decimal WeightedScore => Math.Clamp(
        (ThreatScore * 0.50m) + (ImpactScore * 0.30m) + (ExploitabilityScore * 0.20m),
        0m,
        1m);

    private static decimal ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }

        return value;
    }
}

public readonly record struct UncertaintyLevel
{
    public UncertaintyLevel(decimal value)
    {
        Value = value is < 0m or > 1m
            ? throw new ArgumentOutOfRangeException(nameof(value), "Value must be between 0 and 1.")
            : value;
    }

    public decimal Value { get; }
}

public readonly record struct BlastRadius
{
    public BlastRadius(decimal estimatedImpact)
    {
        EstimatedImpact = estimatedImpact is < 0m or > 1m
            ? throw new ArgumentOutOfRangeException(nameof(estimatedImpact), "Value must be between 0 and 1.")
            : estimatedImpact;
    }

    public decimal EstimatedImpact { get; }
}
