namespace Backend.Domain.Cti.V1;

public sealed class RiskBudget
{
    private RiskBudget()
    {
    }

    public decimal MaxBlastRadius { get; private set; }
    public decimal MaxUncertainty { get; private set; }
    public decimal MinSourceTrust { get; private set; }

    public static RiskBudget Create(decimal maxBlastRadius, decimal maxUncertainty, decimal minSourceTrust)
    {
        ValidateUnitInterval(maxBlastRadius, nameof(maxBlastRadius));
        ValidateUnitInterval(maxUncertainty, nameof(maxUncertainty));
        ValidateUnitInterval(minSourceTrust, nameof(minSourceTrust));

        return new RiskBudget
        {
            MaxBlastRadius = maxBlastRadius,
            MaxUncertainty = maxUncertainty,
            MinSourceTrust = minSourceTrust,
        };
    }

    public bool IsWithinBudget(BlastRadius blastRadius, UncertaintyLevel uncertainty, decimal sourceTrust) =>
        blastRadius.EstimatedImpact <= MaxBlastRadius &&
        uncertainty.Value <= MaxUncertainty &&
        sourceTrust >= MinSourceTrust;

    private static void ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }
    }
}
