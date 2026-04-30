using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminAccess)]
[Route("api/v2/settings/alert-owners")]
public sealed class AlertOwnerSettingsController : ControllerBase
{
    private readonly IAlertOwnerDirectoryService _ownerDirectory;
    private readonly IAuthSensitiveAuditService _auditService;

    public AlertOwnerSettingsController(
        IAlertOwnerDirectoryService ownerDirectory,
        IAuthSensitiveAuditService auditService)
    {
        _ownerDirectory = ownerDirectory;
        _auditService = auditService;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<AlertOwnerDirectoryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AlertOwnerDirectoryResponse>>> List(CancellationToken cancellationToken)
    {
        var owners = await _ownerDirectory.ListDirectoryAsync(cancellationToken);
        return Ok(owners.Select(ToResponse).ToArray());
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertOwnerDirectoryResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AlertOwnerDirectoryResponse>> Create(
        [FromBody] CreateAlertOwnerDirectoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var owner = await _ownerDirectory.CreateAsync(
                request.Key,
                request.DisplayName,
                request.Email,
                request.IsEnabled,
                request.ActorUserId,
                cancellationToken);

            await _auditService.TryWriteAsync(
                User,
                "settings.alert_owner.create",
                "alert_owner_directory",
                owner.Key,
                new
                {
                    owner.Key,
                    owner.DisplayName,
                    owner.Email,
                    owner.IsEnabled,
                },
                cancellationToken);

            return CreatedAtAction(nameof(List), new { key = owner.Key }, ToResponse(owner));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }
    }

    [HttpPatch("{key}")]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<AlertOwnerDirectoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AlertOwnerDirectoryResponse>> Update(
        string key,
        [FromBody] UpdateAlertOwnerDirectoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var owner = await _ownerDirectory.UpdateAsync(
                key,
                request.DisplayName,
                request.Email,
                request.IsEnabled,
                request.ActorUserId,
                cancellationToken);
            if (owner is null)
            {
                return NotFound();
            }

            await _auditService.TryWriteAsync(
                User,
                "settings.alert_owner.update",
                "alert_owner_directory",
                owner.Key,
                new
                {
                    owner.Key,
                    owner.DisplayName,
                    owner.Email,
                    owner.IsEnabled,
                },
                cancellationToken);

            return Ok(ToResponse(owner));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }
    }

    private static AlertOwnerDirectoryResponse ToResponse(AlertOwnerDirectoryItem owner)
    {
        return new AlertOwnerDirectoryResponse(
            owner.Key,
            owner.DisplayName,
            owner.Email,
            owner.IsEnabled,
            owner.Source,
            owner.CreatedAtUtc,
            owner.UpdatedAtUtc,
            owner.CreatedByUserId,
            owner.UpdatedByUserId);
    }
}
