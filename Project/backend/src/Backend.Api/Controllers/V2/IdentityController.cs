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
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly IAuthSensitiveAuditService _auditService;

    public IdentityController(
        CtiDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IAuthSensitiveAuditService auditService)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _auditService = auditService;
    }

    [HttpGet("users")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<UserResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListUsers(CancellationToken cancellationToken)
    {
        var users = await _userManager.Users
            .OrderBy(x => x.UserName)
            .Select(x => new UserResponse(x.Id, x.UserName ?? string.Empty, x.Email, x.DisplayName))
            .ToArrayAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost("users")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            DisplayName = request.DisplayName.Trim(),
            EmailConfirmed = true,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(string.Join("; ", createResult.Errors.Select(x => x.Description)));
        }

        foreach (var roleName in request.Roles.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (await _roleManager.RoleExistsAsync(roleName))
            {
                var addRoleResult = await _userManager.AddToRoleAsync(user, roleName);
                if (!addRoleResult.Succeeded)
                {
                    return BadRequest(string.Join("; ", addRoleResult.Errors.Select(x => x.Description)));
                }
            }
        }

        await _auditService.TryWriteAsync(
            User,
            "identity.user.create",
            "identity_user",
            user.Id.ToString("N"),
            new
            {
                user.UserName,
                Roles = request.Roles,
            },
            cancellationToken);

        return CreatedAtAction(nameof(ListUsers), new { id = user.Id }, new UserResponse(user.Id, user.UserName ?? string.Empty, user.Email, user.DisplayName));
    }

    [HttpGet("roles")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RoleResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> ListRoles(CancellationToken cancellationToken)
    {
        var roles = await _roleManager.Roles
            .OrderBy(x => x.Name)
            .Select(x => new RoleResponse(x.Id, x.Name ?? string.Empty))
            .ToArrayAsync(cancellationToken);

        return Ok(roles);
    }

    [HttpPost("roles")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RoleResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleResponse>> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var role = new ApplicationRole { Name = request.Name.Trim() };
        var result = await _roleManager.CreateAsync(role);
        if (!result.Succeeded)
        {
            return BadRequest(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        await _auditService.TryWriteAsync(
            User,
            "identity.role.create",
            "identity_role",
            role.Id.ToString("N"),
            new { role.Name },
            cancellationToken);

        return CreatedAtAction(nameof(ListRoles), new { id = role.Id }, new RoleResponse(role.Id, role.Name ?? string.Empty));
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
    [ProducesResponseType<PermissionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
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
        var query = _dbContext.RolePermissions.AsQueryable();
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
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RolePermissionResponse>> AssignRolePermission(
        [FromBody] AssignRolePermissionRequest request,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.RolePermissions.AnyAsync(
            x => x.RoleId == request.RoleId && x.PermissionId == request.PermissionId,
            cancellationToken);

        if (exists)
        {
            return Conflict("Role permission already exists.");
        }

        var entity = RolePermission.Create(request.RoleId, request.PermissionId, request.ActorUserId, DateTimeOffset.UtcNow);
        _dbContext.RolePermissions.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "identity.role-permission.assign",
            "role_permission",
            $"{entity.RoleId:N}:{entity.PermissionId:N}",
            new
            {
                entity.RoleId,
                entity.PermissionId,
            },
            cancellationToken);

        return CreatedAtAction(nameof(AssignRolePermission), new { roleId = entity.RoleId, permissionId = entity.PermissionId }, entity.ToRolePermissionResponse());
    }
}
