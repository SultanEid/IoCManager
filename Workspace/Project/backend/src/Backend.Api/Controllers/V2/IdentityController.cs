using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminAccess)]
[Route("api/v2/identity")]
public sealed class IdentityController : ControllerBase
{
    private readonly CtiDbContext _dbContext;
    private readonly IAuthSensitiveAuditService _auditService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;

    public IdentityController(
        CtiDbContext dbContext,
        IAuthSensitiveAuditService auditService,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    [HttpGet("users")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<UserResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListUsers(CancellationToken cancellationToken)
    {
        var users = await _userManager.Users
            .AsNoTracking()
            .OrderBy(x => x.UserName)
            .ToArrayAsync(cancellationToken);

        var response = new List<UserResponse>(users.Length);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).FirstOrDefault() ?? string.Empty;
            response.Add(new UserResponse(
                user.Id.ToString(),
                user.UserName ?? string.Empty,
                user.Email,
                string.IsNullOrWhiteSpace(user.DisplayName) ? user.UserName ?? string.Empty : user.DisplayName,
                role));
        }

        return Ok(response.ToArray());
    }

    [HttpPost("users")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (request.Roles.Count == 0 || string.IsNullOrWhiteSpace(request.Roles[0]))
        {
            return BadRequest("A single role is required.");
        }

        var roleName = request.Roles[0].Trim();
        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            return BadRequest($"Role '{roleName}' was not found.");
        }

        if (await _userManager.FindByNameAsync(request.UserName.Trim()) is not null
            || await _userManager.FindByEmailAsync(request.Email.Trim()) is not null)
        {
            return Conflict("User name or email already exists.");
        }

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? request.UserName.Trim()
            : request.DisplayName.Trim();

        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            EmailConfirmed = true,
            DisplayName = displayName,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(string.Join("; ", createResult.Errors.Select(x => x.Description)));
        }

        var addRoleResult = await _userManager.AddToRoleAsync(user, roleName);
        if (!addRoleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return BadRequest(string.Join("; ", addRoleResult.Errors.Select(x => x.Description)));
        }

        await _auditService.TryWriteAsync(
            User,
            "identity.user.create",
            "identity_user",
            user.Id.ToString(),
            new
            {
                user.UserName,
                Role = roleName,
            },
            cancellationToken);

        return CreatedAtAction(
            nameof(ListUsers),
            new { id = user.Id },
            new UserResponse(user.Id.ToString(), user.UserName ?? string.Empty, user.Email, displayName, roleName));
    }

    [HttpGet("roles")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RoleResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> ListRoles(CancellationToken cancellationToken)
    {
        var roles = await _roleManager.Roles
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Where(x => x.Name != null)
            .Select(x => new RoleResponse(x.Id.ToString(), x.Name!))
            .ToArrayAsync(cancellationToken);
        return Ok(roles);
    }

    [HttpPost("roles")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleResponse>> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var normalizedName = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return BadRequest("Role name is required.");
        }

        if (await _roleManager.RoleExistsAsync(normalizedName))
        {
            return Conflict($"Role '{normalizedName}' already exists.");
        }

        var role = new ApplicationRole
        {
            Name = normalizedName,
            NormalizedName = normalizedName.ToUpperInvariant(),
        };

        var createResult = await _roleManager.CreateAsync(role);
        if (!createResult.Succeeded)
        {
            return BadRequest(string.Join("; ", createResult.Errors.Select(x => x.Description)));
        }

        await _auditService.TryWriteAsync(
            User,
            "identity.role.create",
            "identity_role",
            role.Id.ToString(),
            new { Name = normalizedName },
            cancellationToken);

        return Ok(new RoleResponse(role.Id.ToString(), normalizedName));
    }

    [HttpGet("permissions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<PermissionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PermissionResponse>>> ListPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _dbContext.Permissions
            .OrderBy(x => x.Key)
            .Select(x => x.ToPermissionResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(permissions);
    }

    [HttpPost("permissions")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PermissionResponse>> CreatePermission(
        [FromBody] CreatePermissionRequest request,
        CancellationToken cancellationToken)
    {
        var key = request.Key.Trim();
        var exists = await _dbContext.Permissions.AnyAsync(x => x.Key == key, cancellationToken);
        if (exists)
        {
            return Conflict($"Permission '{key}' already exists.");
        }

        var entity = Permission.Create(key, request.Description, request.ActorUserId, DateTimeOffset.UtcNow);
        _dbContext.Permissions.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "identity.permission.create",
            "permission",
            entity.Id.ToString("N"),
            new { entity.Key },
            cancellationToken);

        return CreatedAtAction(nameof(ListPermissions), new { id = entity.Id }, entity.ToPermissionResponse());
    }

    [HttpGet("role-permissions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RolePermissionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RolePermissionResponse>>> ListRolePermissions([FromQuery] Guid? roleId, CancellationToken cancellationToken)
    {
        var query = _dbContext.RolePermissions
            .AsNoTracking()
            .AsQueryable();

        if (roleId.HasValue)
        {
            query = query.Where(x => x.RoleId == roleId.Value);
        }

        var items = await query
            .OrderBy(x => x.RoleId)
            .ThenBy(x => x.PermissionId)
            .Select(x => x.ToRolePermissionResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("role-permissions")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RolePermissionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<RolePermissionResponse>(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RolePermissionResponse>> AssignRolePermission(
        [FromBody] AssignRolePermissionRequest request,
        CancellationToken cancellationToken)
    {
        var roleExists = await _roleManager.Roles.AnyAsync(x => x.Id == request.RoleId, cancellationToken);
        if (!roleExists)
        {
            return BadRequest($"Role '{request.RoleId}' was not found.");
        }

        var permissionExists = await _dbContext.Permissions.AnyAsync(x => x.Id == request.PermissionId, cancellationToken);
        if (!permissionExists)
        {
            return BadRequest($"Permission '{request.PermissionId}' was not found.");
        }

        var existing = await _dbContext.RolePermissions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.RoleId == request.RoleId && x.PermissionId == request.PermissionId,
                cancellationToken);

        if (existing is not null)
        {
            return Conflict(existing.ToRolePermissionResponse());
        }

        var entity = RolePermission.Create(
            request.RoleId,
            request.PermissionId,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.RolePermissions.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "identity.role-permission.assign",
            "role_permission",
            $"{request.RoleId:N}:{request.PermissionId:N}",
            new
            {
                request.RoleId,
                request.PermissionId,
            },
            cancellationToken);

        return CreatedAtAction(
            nameof(ListRolePermissions),
            new { roleId = request.RoleId },
            entity.ToRolePermissionResponse());
    }
}
