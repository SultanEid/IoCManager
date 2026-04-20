using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class RuleArtifact : AuditableEntity
{
    private RuleArtifact() { }

    public string Name { get; private set; } = string.Empty;
    public string RuleFamily { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Source { get; private set; } = "manual";
    public string[] Tags { get; private set; } = [];
    public string Severity { get; private set; } = "medium";
    public string LifecycleStatus { get; private set; } = "draft";
    public RuleScopeType ScopeType { get; private set; } = RuleScopeType.Global;
    public string? ScopeValue { get; private set; }
    public int CurrentRevisionNumber { get; private set; }
    public string CurrentVersionLabel { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAtUtc { get; private set; }
    public string? DeletedByUserId { get; private set; }

    public static RuleArtifact Create(string name, string ruleFamily, string description, string actorUserId, DateTimeOffset nowUtc)
    {
        return CreateRepository(
            name,
            ruleFamily,
            source: "manual",
            description,
            tags: [],
            severity: "medium",
            lifecycleStatus: "draft",
            scopeType: RuleScopeType.Global,
            scopeValue: null,
            actorUserId,
            nowUtc);
    }

    public static RuleArtifact CreateRepository(
        string name,
        string ruleFamily,
        string source,
        string description,
        string[] tags,
        string severity,
        string lifecycleStatus,
        RuleScopeType scopeType,
        string? scopeValue,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new RuleArtifact
        {
            Name = name.Trim(),
            RuleFamily = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily)),
            Source = source.Trim(),
            Description = description.Trim(),
            Tags = NormalizeTags(tags),
            Severity = NormalizeToken(severity, "medium"),
            LifecycleStatus = NormalizeToken(lifecycleStatus, "draft"),
            ScopeType = scopeType,
            ScopeValue = NormalizeScopeValue(scopeType, scopeValue),
            CurrentRevisionNumber = 0,
            CurrentVersionLabel = string.Empty,
            IsActive = true,
            IsDeleted = false,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void UpdateRepositoryMetadata(
        string name,
        string ruleFamily,
        string source,
        string description,
        string[] tags,
        string severity,
        string lifecycleStatus,
        RuleScopeType scopeType,
        string? scopeValue,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        Name = name.Trim();
        RuleFamily = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily));
        Source = source.Trim();
        Description = description.Trim();
        Tags = NormalizeTags(tags);
        Severity = NormalizeToken(severity, "medium");
        LifecycleStatus = NormalizeToken(lifecycleStatus, "draft");
        ScopeType = scopeType;
        ScopeValue = NormalizeScopeValue(scopeType, scopeValue);

        Touch(actorUserId.Trim(), nowUtc);
    }

    public int ReserveNextRevision(string versionLabel, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(versionLabel);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        CurrentRevisionNumber += 1;
        CurrentVersionLabel = versionLabel.Trim();
        Touch(actorUserId.Trim(), nowUtc);
        return CurrentRevisionNumber;
    }

    public void Archive(string actorUserId, DateTimeOffset nowUtc, string lifecycleStatus = "retired")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        IsDeleted = true;
        IsActive = false;
        DeletedAtUtc = nowUtc;
        DeletedByUserId = actorUserId.Trim();
        LifecycleStatus = NormalizeToken(lifecycleStatus, "retired");
        Touch(actorUserId.Trim(), nowUtc);
    }

    public void Restore(string actorUserId, DateTimeOffset nowUtc, string lifecycleStatus = "draft")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        IsDeleted = false;
        IsActive = true;
        DeletedAtUtc = null;
        DeletedByUserId = null;
        LifecycleStatus = NormalizeToken(lifecycleStatus, "draft");
        Touch(actorUserId.Trim(), nowUtc);
    }

    private static string[] NormalizeTags(string[]? tags)
    {
        if (tags is null || tags.Length == 0)
        {
            return [];
        }

        return tags
            .Select(x => x.Trim().ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string NormalizeToken(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        return value.Trim().ToLowerInvariant();
    }

    private static string? NormalizeScopeValue(RuleScopeType scopeType, string? scopeValue)
    {
        if (scopeType == RuleScopeType.Global)
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(scopeValue) ? null : scopeValue.Trim();
    }
}

public sealed class RuleRevision : AuditableEntity
{
    private RuleRevision() { }

    public Guid RuleArtifactId { get; private set; }
    public int RevisionNumber { get; private set; }
    public string RuleBody { get; private set; } = string.Empty;
    public RuleRevisionStatus Status { get; private set; } = RuleRevisionStatus.Draft;
    public string VersionLabel { get; private set; } = "v1";
    public string OriginalContent { get; private set; } = string.Empty;
    public string MetadataJson { get; private set; } = "{}";
    public string ChangeType { get; private set; } = "created";
    public string? ChangeReason { get; private set; }
    public string LifecycleStatus { get; private set; } = "draft";
    public string ValidationResultJson { get; private set; } = "{}";
    public bool CanPersistValidation { get; private set; }
    public bool IsDeploymentReady { get; private set; }
    public DateTimeOffset? ValidatedAtUtc { get; private set; }
    public Guid? RuleImportAttemptId { get; private set; }

    public static RuleRevision Create(
        Guid ruleArtifactId,
        int revisionNumber,
        string ruleBody,
        RuleRevisionStatus status,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (ruleArtifactId == Guid.Empty)
        {
            throw new ArgumentException("Rule artifact id is required.", nameof(ruleArtifactId));
        }

        if (revisionNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revisionNumber), "Revision number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(ruleBody);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = CreateRepository(
            ruleArtifactId,
            revisionNumber,
            versionLabel: $"v{revisionNumber}",
            originalContent: ruleBody,
            metadataJson: "{}",
            changeType: "legacy",
            changeReason: null,
            lifecycleStatus: "draft",
            validationResultJson: "{}",
            canPersistValidation: false,
            isDeploymentReady: false,
            validatedAtUtc: null,
            actorUserId,
            nowUtc,
            status,
            importAttemptId: null);

        item.RuleBody = ruleBody;
        return item;
    }

    public static RuleRevision CreateRepository(
        Guid ruleArtifactId,
        int revisionNumber,
        string versionLabel,
        string originalContent,
        string metadataJson,
        string changeType,
        string? changeReason,
        string lifecycleStatus,
        string validationResultJson,
        bool canPersistValidation,
        bool isDeploymentReady,
        DateTimeOffset? validatedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc,
        RuleRevisionStatus? status = null,
        Guid? importAttemptId = null)
    {
        if (ruleArtifactId == Guid.Empty)
        {
            throw new ArgumentException("Rule artifact id is required.", nameof(ruleArtifactId));
        }

        if (revisionNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revisionNumber), "Revision number must be positive.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(versionLabel);
        ArgumentException.ThrowIfNullOrWhiteSpace(originalContent);
        ArgumentException.ThrowIfNullOrWhiteSpace(metadataJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(changeType);
        ArgumentException.ThrowIfNullOrWhiteSpace(validationResultJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var normalizedLifecycleStatus = lifecycleStatus.Trim().ToLowerInvariant();

        var item = new RuleRevision
        {
            RuleArtifactId = ruleArtifactId,
            RevisionNumber = revisionNumber,
            VersionLabel = versionLabel.Trim(),
            RuleBody = originalContent,
            OriginalContent = originalContent,
            MetadataJson = metadataJson,
            ChangeType = changeType.Trim().ToLowerInvariant(),
            ChangeReason = string.IsNullOrWhiteSpace(changeReason) ? null : changeReason.Trim(),
            LifecycleStatus = normalizedLifecycleStatus,
            ValidationResultJson = validationResultJson,
            CanPersistValidation = canPersistValidation,
            IsDeploymentReady = isDeploymentReady,
            ValidatedAtUtc = validatedAtUtc,
            Status = status ?? MapLifecycleStatusToLegacy(normalizedLifecycleStatus),
            RuleImportAttemptId = importAttemptId,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    private static RuleRevisionStatus MapLifecycleStatusToLegacy(string lifecycleStatus)
    {
        return lifecycleStatus switch
        {
            "published" or "approved" or "shadow" or "canary" or "promoted" => RuleRevisionStatus.Published,
            "retired" or "disabled" or "rejected" => RuleRevisionStatus.Deprecated,
            "validated" => RuleRevisionStatus.Validated,
            _ => RuleRevisionStatus.Draft,
        };
    }
}

public sealed class RuleImportAttempt : AuditableEntity
{
    private RuleImportAttempt() { }

    public string FileName { get; private set; } = string.Empty;
    public string FileHash { get; private set; } = string.Empty;
    public string DeclaredRuleFamily { get; private set; } = string.Empty;
    public string SourceMetadataJson { get; private set; } = "{}";
    public string ParsedMetadataJson { get; private set; } = "{}";
    public string DiagnosticsJson { get; private set; } = "[]";
    public string ValidationResultJson { get; private set; } = "{}";
    public bool WasSuccessful { get; private set; }
    public string? FailureReason { get; private set; }
    public Guid? RuleArtifactId { get; private set; }
    public Guid? RuleRevisionId { get; private set; }

    public static RuleImportAttempt Create(
        string fileName,
        string fileHash,
        string declaredRuleFamily,
        string sourceMetadataJson,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(declaredRuleFamily);
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceMetadataJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new RuleImportAttempt
        {
            FileName = fileName.Trim(),
            FileHash = fileHash.Trim(),
            DeclaredRuleFamily = declaredRuleFamily.Trim().ToLowerInvariant(),
            SourceMetadataJson = sourceMetadataJson,
            ParsedMetadataJson = "{}",
            DiagnosticsJson = "[]",
            ValidationResultJson = "{}",
            WasSuccessful = false,
            FailureReason = null,
            RuleArtifactId = null,
            RuleRevisionId = null,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void Complete(
        bool wasSuccessful,
        string diagnosticsJson,
        string validationResultJson,
        string parsedMetadataJson,
        string? failureReason,
        Guid? ruleArtifactId,
        Guid? ruleRevisionId,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosticsJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(validationResultJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(parsedMetadataJson);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        WasSuccessful = wasSuccessful;
        DiagnosticsJson = diagnosticsJson;
        ValidationResultJson = validationResultJson;
        ParsedMetadataJson = parsedMetadataJson;
        FailureReason = string.IsNullOrWhiteSpace(failureReason) ? null : failureReason.Trim();
        RuleArtifactId = ruleArtifactId;
        RuleRevisionId = ruleRevisionId;
        Touch(actorUserId.Trim(), nowUtc);
    }
}

public sealed class RuleDistribution : AuditableEntity
{
    private RuleDistribution() { }

    public Guid RuleRevisionId { get; private set; }
    public Guid TargetServerId { get; private set; }
    public RuleDistributionStatus Status { get; private set; } = RuleDistributionStatus.Pending;
    public string? Notes { get; private set; }
    public DateTimeOffset DistributedAtUtc { get; private set; }

    public static RuleDistribution Create(
        Guid ruleRevisionId,
        Guid targetServerId,
        string actorUserId,
        DateTimeOffset distributedAtUtc,
        string? notes = null)
    {
        if (ruleRevisionId == Guid.Empty)
        {
            throw new ArgumentException("Rule revision id is required.", nameof(ruleRevisionId));
        }

        if (targetServerId == Guid.Empty)
        {
            throw new ArgumentException("Target server id is required.", nameof(targetServerId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new RuleDistribution
        {
            RuleRevisionId = ruleRevisionId,
            TargetServerId = targetServerId,
            Status = RuleDistributionStatus.Pending,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            DistributedAtUtc = distributedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), distributedAtUtc);
        return item;
    }

    public void MarkStatus(RuleDistributionStatus status, string? notes, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        Status = status;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        Touch(actorUserId.Trim(), nowUtc);
    }
}
