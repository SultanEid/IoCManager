using System.ComponentModel.DataAnnotations;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public sealed class AlertOwnerOptions
{
    public const string SectionName = "Alerts";

    public List<AlertOwnerDefinition> Owners { get; set; } = [];
}

public sealed class AlertOwnerDefinition
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public sealed record ResolvedAlertOwner(string Key, string DisplayName, string? Email);
public sealed record AlertOwnerDirectoryItem(
    string Key,
    string DisplayName,
    string Email,
    bool IsEnabled,
    string Source,
    DateTimeOffset? CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    string? CreatedByUserId,
    string? UpdatedByUserId);

public interface IAlertOwnerResolver
{
    Task<IReadOnlyList<AlertOwnerDefinition>> ListAssignableOwnersAsync(CancellationToken cancellationToken);
    Task<ResolvedAlertOwner?> ResolveAsync(string ownerUserId, CancellationToken cancellationToken);
}

public interface IAlertOwnerDirectoryService : IAlertOwnerResolver
{
    IReadOnlyList<AlertOwnerDefinition> ListConfiguredOwners();
    Task<IReadOnlyList<AlertOwnerDirectoryItem>> ListDirectoryAsync(CancellationToken cancellationToken);
    Task<AlertOwnerDirectoryItem> CreateAsync(
        string key,
        string displayName,
        string email,
        bool isEnabled,
        string actorUserId,
        CancellationToken cancellationToken);
    Task<AlertOwnerDirectoryItem?> UpdateAsync(
        string key,
        string displayName,
        string email,
        bool isEnabled,
        string actorUserId,
        CancellationToken cancellationToken);
}

public sealed class AlertOwnerDirectoryService : IAlertOwnerDirectoryService
{
    public const string UnassignedOwnerKey = "unassigned";

    private const string DatabaseSource = "database";
    private const string ConfigurationSource = "configuration";
    private static readonly EmailAddressAttribute EmailValidator = new();

    private readonly CtiDbContext _dbContext;
    private readonly IReadOnlyList<AlertOwnerDefinition> _owners;

    public AlertOwnerDirectoryService(CtiDbContext dbContext, IOptions<AlertOwnerOptions> options)
    {
        _dbContext = dbContext;
        _owners = options.Value.Owners
            .Where(owner =>
                !string.IsNullOrWhiteSpace(owner.Key)
                && !string.IsNullOrWhiteSpace(owner.DisplayName)
                && !string.IsNullOrWhiteSpace(owner.Email)
                && new EmailAddressAttribute().IsValid(owner.Email.Trim()))
            .Select(owner => new AlertOwnerDefinition
            {
                Key = NormalizeConfigKey(owner.Key),
                DisplayName = owner.DisplayName.Trim(),
                Email = owner.Email.Trim(),
            })
            .GroupBy(owner => owner.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(owner => owner.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public IReadOnlyList<AlertOwnerDefinition> ListConfiguredOwners() => _owners;

    public async Task<IReadOnlyList<AlertOwnerDefinition>> ListAssignableOwnersAsync(CancellationToken cancellationToken)
    {
        var dbOwners = await _dbContext.AlertOwnerDirectoryEntries
            .AsNoTracking()
            .OrderBy(owner => owner.DisplayName)
            .ToArrayAsync(cancellationToken);

        if (dbOwners.Length > 0)
        {
            return dbOwners
                .Where(owner => owner.IsEnabled)
                .Select(owner => new AlertOwnerDefinition
                {
                    Key = owner.Key,
                    DisplayName = owner.DisplayName,
                    Email = owner.Email,
                })
                .ToArray();
        }

        return _owners;
    }

    public async Task<ResolvedAlertOwner?> ResolveAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        if (string.Equals(ownerUserId?.Trim(), UnassignedOwnerKey, StringComparison.OrdinalIgnoreCase))
        {
            return new ResolvedAlertOwner(UnassignedOwnerKey, string.Empty, null);
        }

        var requestedKey = NormalizeRequestedKey(ownerUserId);
        if (requestedKey is null)
        {
            return null;
        }

        var hasDbOwners = await _dbContext.AlertOwnerDirectoryEntries
            .AsNoTracking()
            .AnyAsync(cancellationToken);
        if (hasDbOwners)
        {
            var dbOwner = await _dbContext.AlertOwnerDirectoryEntries
                .AsNoTracking()
                .FirstOrDefaultAsync(owner => owner.Key == requestedKey && owner.IsEnabled, cancellationToken);
            return dbOwner is null
                ? null
                : new ResolvedAlertOwner(dbOwner.Key, dbOwner.DisplayName, dbOwner.Email);
        }

        var configured = _owners.FirstOrDefault(item => string.Equals(item.Key, requestedKey, StringComparison.OrdinalIgnoreCase));
        return configured is null
            ? null
            : new ResolvedAlertOwner(configured.Key, configured.DisplayName, configured.Email);
    }

    public async Task<IReadOnlyList<AlertOwnerDirectoryItem>> ListDirectoryAsync(CancellationToken cancellationToken)
    {
        var dbOwners = await _dbContext.AlertOwnerDirectoryEntries
            .AsNoTracking()
            .OrderBy(owner => owner.DisplayName)
            .ToArrayAsync(cancellationToken);

        if (dbOwners.Length > 0)
        {
            return dbOwners.Select(ToDirectoryItem).ToArray();
        }

        return _owners
            .Select(owner => new AlertOwnerDirectoryItem(
                owner.Key,
                owner.DisplayName,
                owner.Email,
                true,
                ConfigurationSource,
                null,
                null,
                null,
                null))
            .ToArray();
    }

    public async Task<AlertOwnerDirectoryItem> CreateAsync(
        string key,
        string displayName,
        string email,
        bool isEnabled,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        ValidateOwnerFields(displayName, email, actorUserId);
        var normalizedKey = AlertOwnerDirectoryEntry.NormalizeKey(key);
        if (string.Equals(normalizedKey, UnassignedOwnerKey, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("'unassigned' is reserved and cannot be created as an alert owner.");
        }

        await SeedConfiguredOwnersIfEmptyAsync(actorUserId, cancellationToken);

        if (await _dbContext.AlertOwnerDirectoryEntries.AnyAsync(owner => owner.Key == normalizedKey, cancellationToken))
        {
            throw new InvalidOperationException($"Alert owner key '{normalizedKey}' already exists.");
        }

        var entity = AlertOwnerDirectoryEntry.Create(normalizedKey, displayName, email, isEnabled, actorUserId, DateTimeOffset.UtcNow);
        _dbContext.AlertOwnerDirectoryEntries.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDirectoryItem(entity);
    }

    public async Task<AlertOwnerDirectoryItem?> UpdateAsync(
        string key,
        string displayName,
        string email,
        bool isEnabled,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        ValidateOwnerFields(displayName, email, actorUserId);
        var normalizedKey = AlertOwnerDirectoryEntry.NormalizeKey(key);
        if (string.Equals(normalizedKey, UnassignedOwnerKey, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("'unassigned' is reserved and cannot be updated as an alert owner.");
        }

        await SeedConfiguredOwnersIfEmptyAsync(actorUserId, cancellationToken);

        var entity = await _dbContext.AlertOwnerDirectoryEntries
            .FirstOrDefaultAsync(owner => owner.Key == normalizedKey, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Update(displayName, email, isEnabled, actorUserId, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDirectoryItem(entity);
    }

    private static AlertOwnerDirectoryItem ToDirectoryItem(AlertOwnerDirectoryEntry owner)
    {
        return new AlertOwnerDirectoryItem(
            owner.Key,
            owner.DisplayName,
            owner.Email,
            owner.IsEnabled,
            DatabaseSource,
            owner.CreatedAtUtc,
            owner.UpdatedAtUtc,
            owner.CreatedByUserId,
            owner.UpdatedByUserId);
    }

    private static string NormalizeConfigKey(string key)
    {
        try
        {
            return AlertOwnerDirectoryEntry.NormalizeKey(key);
        }
        catch (ArgumentException)
        {
            return key.Trim().ToLowerInvariant();
        }
    }

    private async Task SeedConfiguredOwnersIfEmptyAsync(string actorUserId, CancellationToken cancellationToken)
    {
        if (_owners.Count == 0 || await _dbContext.AlertOwnerDirectoryEntries.AnyAsync(cancellationToken))
        {
            return;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        foreach (var owner in _owners)
        {
            _dbContext.AlertOwnerDirectoryEntries.Add(AlertOwnerDirectoryEntry.Create(
                owner.Key,
                owner.DisplayName,
                owner.Email,
                true,
                actorUserId,
                nowUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string? NormalizeRequestedKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        try
        {
            return AlertOwnerDirectoryEntry.NormalizeKey(key);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static void ValidateOwnerFields(string displayName, string email, string actorUserId)
    {
        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            throw new ArgumentException("Actor user id is required.", nameof(actorUserId));
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ArgumentException("Display name is required.", nameof(displayName));
        }

        if (displayName.Trim().Length > 200)
        {
            throw new ArgumentException("Display name must be 200 characters or fewer.", nameof(displayName));
        }

        if (string.IsNullOrWhiteSpace(email) || email.Trim().Length > 320 || !EmailValidator.IsValid(email.Trim()))
        {
            throw new ArgumentException("A valid owner email is required.", nameof(email));
        }
    }
}
