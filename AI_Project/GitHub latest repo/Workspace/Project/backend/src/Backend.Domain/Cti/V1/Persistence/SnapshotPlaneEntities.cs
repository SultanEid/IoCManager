using Backend.Domain.Common;

namespace Backend.Domain.Cti.V1.Persistence;

public sealed class CtiFeatureSnapshot : AuditableEntity
{
    private CtiFeatureSnapshot()
    {
    }

    public Guid CaseId { get; private set; }
    public string SnapshotHash { get; private set; } = string.Empty;
    public DateTimeOffset CapturedAtUtc { get; private set; }
    public DateTimeOffset FeatureWindowStartUtc { get; private set; }
    public DateTimeOffset FeatureWindowEndUtc { get; private set; }
    public string CapturedByPipeline { get; private set; } = string.Empty;

    public static CtiFeatureSnapshot Capture(
        Guid caseId,
        string snapshotHash,
        DateTimeOffset capturedAtUtc,
        DateTimeOffset featureWindowStartUtc,
        DateTimeOffset featureWindowEndUtc,
        string capturedByPipeline,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(snapshotHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(capturedByPipeline);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (caseId == Guid.Empty)
        {
            throw new ArgumentException("Case id is required.", nameof(caseId));
        }

        if (featureWindowEndUtc < featureWindowStartUtc)
        {
            throw new ArgumentOutOfRangeException(nameof(featureWindowEndUtc), "Feature window end must be greater than or equal to feature window start.");
        }

        if (capturedAtUtc < featureWindowEndUtc)
        {
            throw new ArgumentOutOfRangeException(nameof(capturedAtUtc), "Captured timestamp cannot be earlier than the feature window end.");
        }

        var item = new CtiFeatureSnapshot
        {
            CaseId = caseId,
            SnapshotHash = snapshotHash.Trim(),
            CapturedAtUtc = capturedAtUtc,
            FeatureWindowStartUtc = featureWindowStartUtc,
            FeatureWindowEndUtc = featureWindowEndUtc,
            CapturedByPipeline = capturedByPipeline.Trim(),
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
    }
}

public sealed class CtiFeatureVector : Entity
{
    private CtiFeatureVector()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public string FeatureName { get; private set; } = string.Empty;
    public decimal NumericValue { get; private set; }
    public string? Unit { get; private set; }
    public string Source { get; private set; } = string.Empty;

    public static CtiFeatureVector Create(
        Guid featureSnapshotId,
        string featureName,
        decimal numericValue,
        string? unit,
        string source)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(featureName);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        return new CtiFeatureVector
        {
            FeatureSnapshotId = featureSnapshotId,
            FeatureName = featureName.Trim(),
            NumericValue = numericValue,
            Unit = string.IsNullOrWhiteSpace(unit) ? null : unit.Trim(),
            Source = source.Trim(),
        };
    }
}

public sealed class CtiGraphDerivedFeature : Entity
{
    private CtiGraphDerivedFeature()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public Guid? GraphArtifactReferenceId { get; private set; }
    public string MetricName { get; private set; } = string.Empty;
    public decimal MetricValue { get; private set; }
    public string? MetricUnit { get; private set; }

    public static CtiGraphDerivedFeature Create(
        Guid featureSnapshotId,
        Guid? graphArtifactReferenceId,
        string metricName,
        decimal metricValue,
        string? metricUnit)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(metricName);

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        return new CtiGraphDerivedFeature
        {
            FeatureSnapshotId = featureSnapshotId,
            GraphArtifactReferenceId = graphArtifactReferenceId,
            MetricName = metricName.Trim(),
            MetricValue = metricValue,
            MetricUnit = string.IsNullOrWhiteSpace(metricUnit) ? null : metricUnit.Trim(),
        };
    }
}

public sealed class CtiAssetCriticalitySnapshotValue : Entity
{
    private CtiAssetCriticalitySnapshotValue()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public string AssetKey { get; private set; } = string.Empty;
    public AssetCriticality Criticality { get; private set; }
    public decimal CriticalityScore { get; private set; }

    public static CtiAssetCriticalitySnapshotValue Create(
        Guid featureSnapshotId,
        string assetKey,
        AssetCriticality criticality,
        decimal criticalityScore)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(assetKey);
        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        if (criticalityScore is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(criticalityScore), "Criticality score must be between 0 and 1.");
        }

        return new CtiAssetCriticalitySnapshotValue
        {
            FeatureSnapshotId = featureSnapshotId,
            AssetKey = assetKey.Trim(),
            Criticality = criticality,
            CriticalityScore = criticalityScore,
        };
    }
}

public sealed class CtiSourceTrustSnapshotValue : Entity
{
    private CtiSourceTrustSnapshotValue()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public string SourceSystem { get; private set; } = string.Empty;
    public decimal TrustScore { get; private set; }
    public decimal HistoricalPrecision { get; private set; }
    public decimal HistoricalRecall { get; private set; }

    public static CtiSourceTrustSnapshotValue Create(
        Guid featureSnapshotId,
        string sourceSystem,
        decimal trustScore,
        decimal historicalPrecision,
        decimal historicalRecall)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceSystem);
        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        return new CtiSourceTrustSnapshotValue
        {
            FeatureSnapshotId = featureSnapshotId,
            SourceSystem = sourceSystem.Trim(),
            TrustScore = ValidateUnitInterval(trustScore, nameof(trustScore)),
            HistoricalPrecision = ValidateUnitInterval(historicalPrecision, nameof(historicalPrecision)),
            HistoricalRecall = ValidateUnitInterval(historicalRecall, nameof(historicalRecall)),
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

public sealed class CtiPolicyVersionReference : Entity
{
    private CtiPolicyVersionReference()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public string PolicyVersion { get; private set; } = string.Empty;
    public string PolicyHash { get; private set; } = string.Empty;
    public DateTimeOffset PublishedAtUtc { get; private set; }

    public static CtiPolicyVersionReference Create(
        Guid featureSnapshotId,
        string policyVersion,
        string policyHash,
        DateTimeOffset publishedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(policyVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(policyHash);
        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        return new CtiPolicyVersionReference
        {
            FeatureSnapshotId = featureSnapshotId,
            PolicyVersion = policyVersion.Trim(),
            PolicyHash = policyHash.Trim(),
            PublishedAtUtc = publishedAtUtc,
        };
    }
}

public sealed class CtiModelVersionReference : Entity
{
    private CtiModelVersionReference()
    {
    }

    public Guid FeatureSnapshotId { get; private set; }
    public string ModelName { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public string ModelHash { get; private set; } = string.Empty;
    public DateTimeOffset TrainedAtUtc { get; private set; }

    public static CtiModelVersionReference Create(
        Guid featureSnapshotId,
        string modelName,
        string modelVersion,
        string modelHash,
        DateTimeOffset trainedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(modelName);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelHash);

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        return new CtiModelVersionReference
        {
            FeatureSnapshotId = featureSnapshotId,
            ModelName = modelName.Trim(),
            ModelVersion = modelVersion.Trim(),
            ModelHash = modelHash.Trim(),
            TrainedAtUtc = trainedAtUtc,
        };
    }
}

public sealed class CtiModelDecisionTrace : AuditableEntity
{
    private CtiModelDecisionTrace()
    {
    }

    public Guid DecisionId { get; private set; }
    public Guid FeatureSnapshotId { get; private set; }
    public string ModelName { get; private set; } = string.Empty;
    public string ModelVersion { get; private set; } = string.Empty;
    public decimal MaliciousnessScore { get; private set; }
    public decimal ActionabilityScore { get; private set; }
    public decimal DeployabilityScore { get; private set; }
    public decimal UncertaintyScore { get; private set; }
    public string ReasoningSummary { get; private set; } = string.Empty;
    public string RawOutputHash { get; private set; } = string.Empty;
    public DateTimeOffset TracedAtUtc { get; private set; }

    public static CtiModelDecisionTrace Create(
        Guid decisionId,
        Guid featureSnapshotId,
        string modelName,
        string modelVersion,
        decimal maliciousnessScore,
        decimal actionabilityScore,
        decimal deployabilityScore,
        decimal uncertaintyScore,
        string reasoningSummary,
        string rawOutputHash,
        DateTimeOffset tracedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(modelName);
        ArgumentException.ThrowIfNullOrWhiteSpace(modelVersion);
        ArgumentException.ThrowIfNullOrWhiteSpace(reasoningSummary);
        ArgumentException.ThrowIfNullOrWhiteSpace(rawOutputHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (featureSnapshotId == Guid.Empty)
        {
            throw new ArgumentException("Feature snapshot id is required.", nameof(featureSnapshotId));
        }

        var item = new CtiModelDecisionTrace
        {
            DecisionId = decisionId,
            FeatureSnapshotId = featureSnapshotId,
            ModelName = modelName.Trim(),
            ModelVersion = modelVersion.Trim(),
            MaliciousnessScore = ValidateUnitInterval(maliciousnessScore, nameof(maliciousnessScore)),
            ActionabilityScore = ValidateUnitInterval(actionabilityScore, nameof(actionabilityScore)),
            DeployabilityScore = ValidateUnitInterval(deployabilityScore, nameof(deployabilityScore)),
            UncertaintyScore = ValidateUnitInterval(uncertaintyScore, nameof(uncertaintyScore)),
            ReasoningSummary = reasoningSummary.Trim(),
            RawOutputHash = rawOutputHash.Trim(),
            TracedAtUtc = tracedAtUtc,
        };

        item.StampCreation(actorUserId, nowUtc);
        return item;
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
