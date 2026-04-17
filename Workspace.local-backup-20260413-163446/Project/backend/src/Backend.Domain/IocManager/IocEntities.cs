using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class FeedSource : AuditableEntity
{
    private FeedSource() { }

    public string Name { get; private set; } = string.Empty;
    public FeedSourceType SourceType { get; private set; } = FeedSourceType.Manual;
    public string Endpoint { get; private set; } = string.Empty;
    public bool IsEnabled { get; private set; } = true;

    public static FeedSource Create(string name, FeedSourceType sourceType, string endpoint, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new FeedSource
        {
            Name = name.Trim(),
            SourceType = sourceType,
            Endpoint = endpoint.Trim(),
            IsEnabled = true,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class IocFile : AuditableEntity
{
    private IocFile() { }

    public Guid FeedSourceId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string StorageUri { get; private set; } = string.Empty;
    public string ContentHash { get; private set; } = string.Empty;
    public DateTimeOffset ImportedAtUtc { get; private set; }

    public static IocFile Create(
        Guid feedSourceId,
        string fileName,
        string storageUri,
        string contentHash,
        DateTimeOffset importedAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (feedSourceId == Guid.Empty)
        {
            throw new ArgumentException("Feed source id is required.", nameof(feedSourceId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(storageUri);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new IocFile
        {
            FeedSourceId = feedSourceId,
            FileName = fileName.Trim(),
            StorageUri = storageUri.Trim(),
            ContentHash = contentHash.Trim(),
            ImportedAtUtc = importedAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class Ioc : AuditableEntity
{
    private Ioc() { }

    public Guid FeedSourceId { get; private set; }
    public Guid? IocFileId { get; private set; }
    public IocType Type { get; private set; }
    public string Value { get; private set; } = string.Empty;
    public AlertSeverity Severity { get; private set; } = AlertSeverity.Medium;
    public decimal Confidence { get; private set; }
    public DateTimeOffset FirstSeenAtUtc { get; private set; }
    public DateTimeOffset LastSeenAtUtc { get; private set; }

    public static Ioc Create(
        Guid feedSourceId,
        Guid? iocFileId,
        IocType type,
        string value,
        AlertSeverity severity,
        decimal confidence,
        DateTimeOffset seenAtUtc,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        if (feedSourceId == Guid.Empty)
        {
            throw new ArgumentException("Feed source id is required.", nameof(feedSourceId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        if (confidence is < 0m or > 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0 and 1.");
        }

        var item = new Ioc
        {
            FeedSourceId = feedSourceId,
            IocFileId = iocFileId,
            Type = type,
            Value = value.Trim(),
            Severity = severity,
            Confidence = confidence,
            FirstSeenAtUtc = seenAtUtc,
            LastSeenAtUtc = seenAtUtc,
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }

    public void RecordSeen(DateTimeOffset seenAtUtc, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);
        if (seenAtUtc > LastSeenAtUtc)
        {
            LastSeenAtUtc = seenAtUtc;
        }

        Touch(actorUserId.Trim(), nowUtc);
    }
}
