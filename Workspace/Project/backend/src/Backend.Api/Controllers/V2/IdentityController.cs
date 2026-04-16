using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
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
    private readonly SqlUserTableDirectoryService _directoryService;
    private readonly IAuthSensitiveAuditService _auditService;

    public IdentityController(
        CtiDbContext dbContext,
        SqlUserTableDirectoryService directoryService,
        IAuthSensitiveAuditService auditService)
    {
        _dbContext = dbContext;
        _directoryService = directoryService;
        _auditService = auditService;
    }

    [HttpGet("users")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<UserResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListUsers(CancellationToken cancellationToken)
    {
        var users = await _directoryService.ListUsersAsync(cancellationToken);
        var response = users
            .Select(x => new UserResponse(x.UserId.ToString(), x.UserName, x.Email, x.UserName, x.Role))
            .ToArray();

        return Ok(response);
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

        SqlUserTableDirectoryRecord user;
        try
        {
            user = await _directoryService.CreateUserAsync(
                request.UserName,
                request.Email,
                request.Password,
                request.Roles[0],
                cancellationToken);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }

        await _auditService.TryWriteAsync(
            User,
            "identity.user.create",
            "identity_user",
            user.UserId.ToString(),
            new
            {
                user.UserName,
                Role = user.Role,
            },
            cancellationToken);

        return CreatedAtAction(
            nameof(ListUsers),
            new { id = user.UserId },
            new UserResponse(user.UserId.ToString(), user.UserName, user.Email, request.DisplayName.Trim(), user.Role));
    }

    [HttpGet("roles")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RoleResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> ListRoles(CancellationToken cancellationToken)
    {
        var roles = await _directoryService.ListRolesAsync(cancellationToken);
        var response = roles
            .Select(name => new RoleResponse(name, name))
            .ToArray();

        return Ok(response);
    }

    [HttpPost("roles")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleResponse>> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        await _auditService.TryWriteAsync(
            User,
            "identity.role.create",
            "identity_role",
            request.Name.Trim(),
            new { Name = request.Name.Trim() },
            cancellationToken);

        return BadRequest("Roles are derived from dbo.User records and cannot be provisioned separately.");
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
        await Task.CompletedTask;
        return Ok(Array.Empty<RolePermissionResponse>());
    }

    [HttpPost("role-permissions")]
    [Authorize(Policy = AuthorizationPolicies.AdminAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RolePermissionResponse>> AssignRolePermission(
        [FromBody] AssignRolePermissionRequest request,
        CancellationToken cancellationToken)
    {
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

        return BadRequest("Role-permission assignments are unavailable when dbo.User is the only active identity source.");
    }
}
