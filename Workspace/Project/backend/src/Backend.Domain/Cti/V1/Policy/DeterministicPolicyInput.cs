namespace Backend.Domain.Cti.V1.Policy;

public sealed class DeterministicPolicyInput
{
    private const decimal MinimumSourceTrust = 0.55m;

    private DeterministicPolicyInput()
    {
    }

    public ModelDecisionTrace ModelDecisionTrace { get; private set; } = null!;
    public PointInTimeFeatureSnapshot FeatureSnapshot { get; private set; } = null!;
    public BlastRadius BlastRadius { get; private set; }
    public AssetCriticality AssetCriticality { get; private set; }
    public EvidenceFreshness EvidenceFreshness { get; private set; }
    public decimal SourceTrust { get; private set; }
    public EvidenceConflictLevel EvidenceConflict { get; private set; }
    public decimal MaliciousnessScore { get; private set; }
    public decimal ActionabilityScore { get; private set; }
    public decimal DeployabilityScore { get; private set; }
    public decimal DecayScore { get; private set; }
    public decimal UncertaintyScore { get; private set; }
    public decimal BlastRadiusScore { get; private set; }
    public RolloutMode CurrentRolloutStage { get; private set; }
    public decimal EvidenceConflictScore { get; private set; }
    public decimal StrategicValueScore { get; private set; }
    public decimal PredictedNoiseScore { get; private set; }
    public int MissingEvidenceHintsCount { get; private set; }

    public static DeterministicPolicyInput Create(
        ModelDecisionTrace modelDecisionTrace,
        PointInTimeFeatureSnapshot featureSnapshot,
        BlastRadius blastRadius,
        AssetCriticality assetCriticality,
        EvidenceFreshness evidenceFreshness,
        decimal sourceTrust,
        EvidenceConflictLevel evidenceConflict)
    {
        ArgumentNullException.ThrowIfNull(modelDecisionTrace);
        ArgumentNullException.ThrowIfNull(featureSnapshot);

        if (sourceTrust is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceTrust), "Source trust must be between 0 and 1.");
        }

        var decayScore = DeriveDecayScore(evidenceFreshness);
        var conflictScore = ToConflictScore(evidenceConflict);
        var missingEvidenceHintsCount = DeriveMissingEvidenceHintsCount(evidenceFreshness, sourceTrust, conflictScore, decayScore);

        return new DeterministicPolicyInput
        {
            ModelDecisionTrace = modelDecisionTrace,
            FeatureSnapshot = featureSnapshot,
            BlastRadius = blastRadius,
            AssetCriticality = assetCriticality,
            EvidenceFreshness = evidenceFreshness,
            SourceTrust = sourceTrust,
            EvidenceConflict = evidenceConflict,
            MaliciousnessScore = modelDecisionTrace.ScoreVector.ThreatScore,
            ActionabilityScore = modelDecisionTrace.ScoreVector.ImpactScore,
            DeployabilityScore = modelDecisionTrace.ScoreVector.ExploitabilityScore,
            DecayScore = decayScore,
            UncertaintyScore = modelDecisionTrace.Uncertainty.Value,
            BlastRadiusScore = blastRadius.EstimatedImpact,
            CurrentRolloutStage = RolloutMode.None,
            EvidenceConflictScore = conflictScore,
            StrategicValueScore = modelDecisionTrace.ScoreVector.ImpactScore,
            PredictedNoiseScore = decimal.Round(1m - modelDecisionTrace.ScoreVector.ImpactScore, 4, MidpointRounding.AwayFromZero),
            MissingEvidenceHintsCount = missingEvidenceHintsCount,
        };
    }

    public static DeterministicPolicyInput Create(
        ModelDecisionTrace modelDecisionTrace,
        PointInTimeFeatureSnapshot featureSnapshot,
        decimal maliciousnessScore,
        decimal actionabilityScore,
        decimal deployabilityScore,
        decimal decayScore,
        decimal uncertaintyScore,
        decimal blastRadiusScore,
        AssetCriticality assetCriticality,
        EvidenceFreshness evidenceFreshness,
        decimal sourceTrust,
        EvidenceConflictLevel evidenceConflict,
        RolloutMode currentRolloutStage)
    {
        ArgumentNullException.ThrowIfNull(modelDecisionTrace);
        ArgumentNullException.ThrowIfNull(featureSnapshot);

        ValidateUnitInterval(maliciousnessScore, nameof(maliciousnessScore));
        ValidateUnitInterval(actionabilityScore, nameof(actionabilityScore));
        ValidateUnitInterval(deployabilityScore, nameof(deployabilityScore));
        ValidateUnitInterval(decayScore, nameof(decayScore));
        ValidateUnitInterval(uncertaintyScore, nameof(uncertaintyScore));
        ValidateUnitInterval(blastRadiusScore, nameof(blastRadiusScore));
        ValidateUnitInterval(sourceTrust, nameof(sourceTrust));

        var conflictScore = ToConflictScore(evidenceConflict);
        var missingEvidenceHintsCount = DeriveMissingEvidenceHintsCount(evidenceFreshness, sourceTrust, conflictScore, decayScore);

        return new DeterministicPolicyInput
        {
            ModelDecisionTrace = modelDecisionTrace,
            FeatureSnapshot = featureSnapshot,
            BlastRadius = new BlastRadius(blastRadiusScore),
            AssetCriticality = assetCriticality,
            EvidenceFreshness = evidenceFreshness,
            SourceTrust = sourceTrust,
            EvidenceConflict = evidenceConflict,
            MaliciousnessScore = maliciousnessScore,
            ActionabilityScore = actionabilityScore,
            DeployabilityScore = deployabilityScore,
            DecayScore = decayScore,
            UncertaintyScore = uncertaintyScore,
            BlastRadiusScore = blastRadiusScore,
            CurrentRolloutStage = currentRolloutStage,
            EvidenceConflictScore = conflictScore,
            StrategicValueScore = actionabilityScore,
            PredictedNoiseScore = decimal.Round(1m - actionabilityScore, 4, MidpointRounding.AwayFromZero),
            MissingEvidenceHintsCount = missingEvidenceHintsCount,
        };
    }

    private static void ValidateUnitInterval(decimal value, string paramName)
    {
        if (value is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(paramName, "Value must be between 0 and 1.");
        }
    }

    private static decimal DeriveDecayScore(EvidenceFreshness freshness) =>
        freshness switch
        {
            EvidenceFreshness.Fresh => 0.10m,
            EvidenceFreshness.Aging => 0.45m,
            EvidenceFreshness.Stale => 0.80m,
            EvidenceFreshness.Expired => 1.00m,
            _ => 0.50m,
        };

    private static decimal ToConflictScore(EvidenceConflictLevel conflictLevel) =>
        conflictLevel switch
        {
            EvidenceConflictLevel.None => 0.00m,
            EvidenceConflictLevel.Low => 0.25m,
            EvidenceConflictLevel.Medium => 0.50m,
            EvidenceConflictLevel.High => 0.75m,
            _ => 1m,
        };

    private static int DeriveMissingEvidenceHintsCount(
        EvidenceFreshness evidenceFreshness,
        decimal sourceTrust,
        decimal evidenceConflictScore,
        decimal decayScore)
    {
        var count = 0;

        if (evidenceFreshness is EvidenceFreshness.Stale or EvidenceFreshness.Expired)
        {
            count++;
        }

        if (sourceTrust < MinimumSourceTrust)
        {
            count++;
        }

        if (evidenceConflictScore >= 0.50m)
        {
            count++;
        }

        if (decayScore >= 0.75m)
        {
            count++;
        }

        return count;
    }
}
