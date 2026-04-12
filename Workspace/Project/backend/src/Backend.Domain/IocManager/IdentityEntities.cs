using Backend.Domain.Common;

namespace Backend.Domain.IocManager;

public sealed class Permission : AuditableEntity
{
    private Permission() { }

    public string Key { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public static Permission Create(string key, string description, string actorUserId, DateTimeOffset nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorUserId);

        var item = new Permission
        {
            Key = key.Trim(),
            Description = description.Trim(),
        };

        item.StampCreation(actorUserId.Trim(), nowUtc);
        return item;
    }
}

public sealed class RolePermission : Entity
{
    private RolePermission() { }

    public Guid RoleId { get; private set; }
    public Guid PermissionId { get; private set; }
    public string GrantedByUserId { get; private set; } = string.Empty;
    public DateTimeOffset GrantedAtUtc { get; private set; }

    public static RolePermission Create(Guid roleId, Guid permissionId, string grantedByUserId, DateTimeOffset grantedAtUtc)
    {
        if (roleId == Guid.Empty)
        {
            throw new ArgumentException("Role id is required.", nameof(roleId));
        }

        if (permissionId == Guid.Empty)
        {
            throw new ArgumentException("Permission id is required.", nameof(permissionId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(grantedByUserId);

        return new RolePermission
        {
            RoleId = roleId,
            PermissionId = permissionId,
            GrantedByUserId = grantedByUserId.Trim(),
            GrantedAtUtc = grantedAtUtc,
        };
    }
}
