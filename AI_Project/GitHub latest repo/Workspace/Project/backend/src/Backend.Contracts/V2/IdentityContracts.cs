namespace Backend.Contracts.V2;

public sealed record UserResponse(Guid Id, string UserName, string? Email, string DisplayName);
public sealed record RoleResponse(Guid Id, string Name);

public sealed record CreateRoleRequest(string Name);
public sealed record CreateUserRequest(string UserName, string Email, string DisplayName, string Password, IReadOnlyList<string> Roles);

public sealed record CreatePermissionRequest(string Key, string Description, string ActorUserId);

public sealed record PermissionResponse(Guid Id, string Key, string Description, DateTimeOffset CreatedAtUtc);

public sealed record AssignRolePermissionRequest(Guid RoleId, Guid PermissionId, string ActorUserId);

public sealed record RolePermissionResponse(Guid RoleId, Guid PermissionId, string GrantedByUserId, DateTimeOffset GrantedAtUtc);
