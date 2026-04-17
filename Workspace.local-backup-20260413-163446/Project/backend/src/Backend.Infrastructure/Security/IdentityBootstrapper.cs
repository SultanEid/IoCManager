using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Security;

public sealed class IdentityBootstrapper
{
    private static readonly string[] DefaultRoles = { "Analyst", "Lead", "Admin" };
    private static readonly string[] PermissionCatalog =
    [
        "identity.users.read",
        "identity.roles.read",
        "identity.permissions.manage",
        "infrastructure.networks.manage",
        "infrastructure.subnets.manage",
        "infrastructure.target-servers.manage",
        "infrastructure.scanners.manage",
        "ioc.feed-sources.manage",
        "ioc.files.manage",
        "ioc.items.manage",
        "rules.artifacts.manage",
        "rules.revisions.manage",
        "rules.distribution.manage",
        "scanning.plans.manage",
        "scanning.jobs.manage",
        "scanning.results.read",
        "alerts.manage",
        "reports.manage",
        "audit.read",
        "retention.manage",
    ];

    private readonly CtiDbContext _dbContext;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly BootstrapAdminOptions _options;
    private readonly ILogger<IdentityBootstrapper> _logger;

    public IdentityBootstrapper(
        CtiDbContext dbContext,
        RoleManager<ApplicationRole> roleManager,
        UserManager<ApplicationUser> userManager,
        IOptions<BootstrapAdminOptions> options,
        ILogger<IdentityBootstrapper> logger)
    {
        _dbContext = dbContext;
        _roleManager = roleManager;
        _userManager = userManager;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        foreach (var role in DefaultRoles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                var roleResult = await _roleManager.CreateAsync(new ApplicationRole { Name = role });
                if (!roleResult.Succeeded)
                {
                    var reason = string.Join("; ", roleResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException($"Failed to create role '{role}': {reason}");
                }
            }
        }

        await SeedPermissionsAsync(cancellationToken);

        if (!_options.Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.UserName) ||
            string.IsNullOrWhiteSpace(_options.Email) ||
            string.IsNullOrWhiteSpace(_options.Password))
        {
            _logger.LogWarning(
                "Bootstrap admin is enabled but required values are missing. Set Auth:BootstrapAdmin UserName, Email, and Password.");
            return;
        }

        var existingUser = await _userManager.FindByNameAsync(_options.UserName);
        if (existingUser is null)
        {
            var user = new ApplicationUser
            {
                UserName = _options.UserName,
                Email = _options.Email,
                EmailConfirmed = true,
                DisplayName = _options.UserName,
            };

            var createResult = await _userManager.CreateAsync(user, _options.Password);
            if (!createResult.Succeeded)
            {
                var reason = string.Join("; ", createResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException($"Failed to create bootstrap admin user: {reason}");
            }

            existingUser = user;
        }

        var targetRole = string.IsNullOrWhiteSpace(_options.Role) ? "Admin" : _options.Role;
        if (!await _roleManager.RoleExistsAsync(targetRole))
        {
            var result = await _roleManager.CreateAsync(new ApplicationRole { Name = targetRole });
            if (!result.Succeeded)
            {
                var reason = string.Join("; ", result.Errors.Select(x => x.Description));
                throw new InvalidOperationException($"Failed to create bootstrap role '{targetRole}': {reason}");
            }
        }

        if (!await _userManager.IsInRoleAsync(existingUser, targetRole))
        {
            var addRoleResult = await _userManager.AddToRoleAsync(existingUser, targetRole);
            if (!addRoleResult.Succeeded)
            {
                var reason = string.Join("; ", addRoleResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException($"Failed adding bootstrap user to role '{targetRole}': {reason}");
            }
        }

        _logger.LogInformation("Identity bootstrap completed for user {UserName} in role {Role}.", existingUser.UserName, targetRole);
    }

    private async Task SeedPermissionsAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        const string systemActor = "system";

        var existingPermissions = await _dbContext.Permissions
            .AsNoTracking()
            .ToDictionaryAsync(x => x.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var permissionKey in PermissionCatalog)
        {
            if (existingPermissions.ContainsKey(permissionKey))
            {
                continue;
            }

            _dbContext.Permissions.Add(Permission.Create(
                permissionKey,
                $"Permission '{permissionKey}'",
                systemActor,
                nowUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var permissions = await _dbContext.Permissions
            .AsNoTracking()
            .ToDictionaryAsync(x => x.Key, x => x.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var roleIdsByName = await _roleManager.Roles
            .ToDictionaryAsync(x => x.Name ?? string.Empty, x => x.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var grantsByRole = new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["Analyst"] =
            [
                "identity.users.read",
                "identity.roles.read",
                "infrastructure.networks.manage",
                "infrastructure.subnets.manage",
                "infrastructure.target-servers.manage",
                "infrastructure.scanners.manage",
                "ioc.feed-sources.manage",
                "ioc.files.manage",
                "ioc.items.manage",
                "rules.artifacts.manage",
                "rules.revisions.manage",
                "rules.distribution.manage",
                "scanning.plans.manage",
                "scanning.jobs.manage",
                "scanning.results.read",
                "alerts.manage",
                "reports.manage",
                "audit.read",
            ],
            ["Lead"] =
            [
                "identity.users.read",
                "identity.roles.read",
                "identity.permissions.manage",
                "infrastructure.networks.manage",
                "infrastructure.subnets.manage",
                "infrastructure.target-servers.manage",
                "infrastructure.scanners.manage",
                "ioc.feed-sources.manage",
                "ioc.files.manage",
                "ioc.items.manage",
                "rules.artifacts.manage",
                "rules.revisions.manage",
                "rules.distribution.manage",
                "scanning.plans.manage",
                "scanning.jobs.manage",
                "scanning.results.read",
                "alerts.manage",
                "reports.manage",
                "audit.read",
                "retention.manage",
            ],
            ["Admin"] = PermissionCatalog,
        };

        var existingRolePermissions = await _dbContext.RolePermissions
            .AsNoTracking()
            .Select(x => new { x.RoleId, x.PermissionId })
            .ToListAsync(cancellationToken);

        var existingPairs = existingRolePermissions
            .Select(x => $"{x.RoleId:N}:{x.PermissionId:N}")
            .ToHashSet(StringComparer.Ordinal);

        foreach (var (roleName, permissionKeys) in grantsByRole)
        {
            if (!roleIdsByName.TryGetValue(roleName, out var roleId))
            {
                continue;
            }

            foreach (var permissionKey in permissionKeys)
            {
                if (!permissions.TryGetValue(permissionKey, out var permissionId))
                {
                    continue;
                }

                var pairKey = $"{roleId:N}:{permissionId:N}";
                if (existingPairs.Contains(pairKey))
                {
                    continue;
                }

                _dbContext.RolePermissions.Add(RolePermission.Create(roleId, permissionId, systemActor, nowUtc));
                existingPairs.Add(pairKey);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
