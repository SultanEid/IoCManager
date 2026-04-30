using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminAccess)]
[Route("api/v2/settings/notifications")]
public sealed class NotificationSettingsController : ControllerBase
{
    private readonly IOptionsMonitor<SmtpNotificationOptions> _smtpOptions;

    public NotificationSettingsController(IOptionsMonitor<SmtpNotificationOptions> smtpOptions)
    {
        _smtpOptions = smtpOptions;
    }

    [HttpGet("smtp")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<SmtpNotificationStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<SmtpNotificationStatusResponse> GetSmtpStatus()
    {
        var options = _smtpOptions.CurrentValue;
        var missingRequirements = GetMissingRequirements(options);
        var configured = options.IsConfigured();

        return Ok(new SmtpNotificationStatusResponse(
            options.Enabled,
            configured,
            configured,
            options.Host.Trim(),
            options.Port,
            options.UseSsl,
            !string.IsNullOrWhiteSpace(options.UserName),
            options.FromEmail.Trim(),
            options.FromDisplayName.Trim(),
            missingRequirements));
    }

    private static string[] GetMissingRequirements(SmtpNotificationOptions options)
    {
        var missing = new List<string>();
        if (!options.Enabled)
        {
            missing.Add("Set Notifications:Smtp:Enabled to true.");
        }

        if (string.IsNullOrWhiteSpace(options.Host))
        {
            missing.Add("Set Notifications:Smtp:Host to your SMTP server.");
        }

        if (options.Port <= 0)
        {
            missing.Add("Set Notifications:Smtp:Port to a positive SMTP port.");
        }

        if (string.IsNullOrWhiteSpace(options.FromEmail))
        {
            missing.Add("Set Notifications:Smtp:FromEmail to the sender mailbox.");
        }

        return missing.ToArray();
    }
}
