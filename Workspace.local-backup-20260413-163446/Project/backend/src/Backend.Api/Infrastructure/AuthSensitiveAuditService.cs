using System.Security.Claims;
using System.Text.Json;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public interface IAuthSensitiveAuditService
{
    Task TryWriteAsync(
        ClaimsPrincipal principal,
        string actionType,
        string entityType,
        string entityId,
        object? payload = null,
        CancellationToken cancellationToken = default);
}

public sealed class AuthSensitiveAuditService : IAuthSensitiveAuditService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly CtiDbContext _dbContext;
    private readonly ILogger<AuthSensitiveAuditService> _logger;
    private readonly AuthSensitiveAuditOptions _options;

    public AuthSensitiveAuditService(
        CtiDbContext dbContext,
        ILogger<AuthSensitiveAuditService> logger,
        IOptions<AuthSensitiveAuditOptions> options)
    {
        _dbContext = dbContext;
        _logger = logger;
        _options = options.Value;
    }

    public async Task TryWriteAsync(
        ClaimsPrincipal principal,
        string actionType,
        string entityType,
        string entityId,
        object? payload = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (_options.SimulateFailure)
            {
                throw new InvalidOperationException("Audit simulation failure is enabled.");
            }

            var actorUserId = ResolveActorUserId(principal);
            var payloadJson = payload is null ? "{}" : JsonSerializer.Serialize(payload, SerializerOptions);
            var item = AuditLog.Create(actorUserId, actionType, entityType, entityId, payloadJson, DateTimeOffset.UtcNow);
            _dbContext.AuditLogsV2.Add(item);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Auth-sensitive audit write failed for action {ActionType} on {EntityType}/{EntityId}.",
                actionType,
                entityType,
                entityId);
        }
    }

    private static string ResolveActorUserId(ClaimsPrincipal principal)
    {
        return principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub")
            ?? principal.FindFirstValue(ClaimTypes.Name)
            ?? "unknown";
    }
}
