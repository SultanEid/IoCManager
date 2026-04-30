using System.ComponentModel.DataAnnotations;

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

public interface IAlertOwnerResolver
{
    IReadOnlyList<AlertOwnerDefinition> ListConfiguredOwners();
    bool TryResolve(string ownerUserId, out ResolvedAlertOwner owner);
}

public sealed class AlertOwnerResolver : IAlertOwnerResolver
{
    public const string UnassignedOwnerKey = "unassigned";

    private readonly IReadOnlyList<AlertOwnerDefinition> _owners;

    public AlertOwnerResolver(Microsoft.Extensions.Options.IOptions<AlertOwnerOptions> options)
    {
        _owners = options.Value.Owners
            .Where(owner =>
                !string.IsNullOrWhiteSpace(owner.Key)
                && !string.IsNullOrWhiteSpace(owner.DisplayName)
                && !string.IsNullOrWhiteSpace(owner.Email)
                && new EmailAddressAttribute().IsValid(owner.Email.Trim()))
            .Select(owner => new AlertOwnerDefinition
            {
                Key = owner.Key.Trim(),
                DisplayName = owner.DisplayName.Trim(),
                Email = owner.Email.Trim(),
            })
            .GroupBy(owner => owner.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(owner => owner.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public IReadOnlyList<AlertOwnerDefinition> ListConfiguredOwners() => _owners;

    public bool TryResolve(string ownerUserId, out ResolvedAlertOwner owner)
    {
        if (string.Equals(ownerUserId?.Trim(), UnassignedOwnerKey, StringComparison.OrdinalIgnoreCase))
        {
            owner = new ResolvedAlertOwner(UnassignedOwnerKey, string.Empty, null);
            return true;
        }

        var configured = _owners.FirstOrDefault(item => string.Equals(item.Key, ownerUserId?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (configured is null)
        {
            owner = new ResolvedAlertOwner(string.Empty, string.Empty, null);
            return false;
        }

        owner = new ResolvedAlertOwner(configured.Key, configured.DisplayName, configured.Email);
        return true;
    }
}
