using IoCManager.Mvc.Data;
using IoCManager.Mvc.Contracts.Auth;
using IoCManager.Mvc.Entities;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Text;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private const string Issuer = "Detective";
    private readonly ApplicationDbContext _dbContext;
    private readonly IAntiforgery _antiforgery;
    private readonly ILogger<AuthController> _logger;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public AuthController(
        ApplicationDbContext dbContext,
        IAntiforgery antiforgery,
        ILogger<AuthController> logger,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _dbContext = dbContext;
        _antiforgery = antiforgery;
        _logger = logger;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult Csrf()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new
        {
            csrfToken = tokens.RequestToken
        });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public IActionResult Register()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = "Self-service registration is disabled. Contact your Detective administrator."
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<AuthEnvelopeResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var user = await _userManager.FindByNameAsync(request.Username.Trim());
        if (user is null)
        {
            await WriteAuditEventAsync("AUTH_FAILURE", "User", request.Username.Trim(), "Invalid username during login.");
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var signInResult = await _signInManager.PasswordSignInAsync(
            user,
            request.Password,
            request.RememberMe,
            lockoutOnFailure: true);

        if (signInResult.RequiresTwoFactor)
        {
            await WriteAuditEventAsync("AUTH_2FA_REQUIRED", "User", user.Id, "Password valid; two-factor challenge required.");
            return Ok(new AuthEnvelopeResponse
            {
                Authenticated = false,
                RequiresTwoFactor = true,
                AvailableFactors = ["authenticator", "recovery_code"]
            });
        }

        if (signInResult.IsLockedOut)
        {
            await WriteAuditEventAsync("AUTH_LOCKOUT", "User", user.Id, "User locked out due to repeated failed login attempts.");
            return StatusCode(StatusCodes.Status423Locked, new { message = "Account locked. Try again later." });
        }

        if (!signInResult.Succeeded)
        {
            await WriteAuditEventAsync("AUTH_FAILURE", "User", user.Id, "Invalid password during login.");
            return Unauthorized(new { message = "Invalid credentials." });
        }

        await WriteAuditEventAsync("AUTH_SUCCESS", "User", user.Id, "User authenticated with username and password.");
        return Ok(new AuthEnvelopeResponse
        {
            Authenticated = true,
            User = MapUser(user)
        });
    }

    [HttpPost("login/verify-2fa")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-2fa")]
    public async Task<ActionResult<AuthEnvelopeResponse>> VerifyTwoFactor([FromBody] VerifyTwoFactorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "A code is required." });
        }

        var twoFactorUser = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (twoFactorUser is null)
        {
            await WriteAuditEventAsync("AUTH_2FA_FAILURE", "Session", "unknown", "Two-factor verification attempted without an active two-factor session.");
            return Unauthorized(new { message = "Two-factor session expired. Start login again." });
        }

        Microsoft.AspNetCore.Identity.SignInResult signInResult;
        if (request.UseRecoveryCode)
        {
            signInResult = await _signInManager.TwoFactorRecoveryCodeSignInAsync(request.Code.Trim());
        }
        else
        {
            signInResult = await _signInManager.TwoFactorAuthenticatorSignInAsync(
                NormalizeAuthenticatorCode(request.Code),
                isPersistent: true,
                rememberClient: request.RememberDevice);
        }

        if (!signInResult.Succeeded)
        {
            await WriteAuditEventAsync("AUTH_2FA_FAILURE", "User", twoFactorUser.Id, "Invalid two-factor verification code.");
            return Unauthorized(new { message = "Invalid two-factor code." });
        }

        await WriteAuditEventAsync("AUTH_2FA_SUCCESS", "User", twoFactorUser.Id, request.UseRecoveryCode
            ? "User authenticated with recovery code."
            : "User authenticated with authenticator code.");
        return Ok(new AuthEnvelopeResponse
        {
            Authenticated = true,
            User = MapUser(twoFactorUser)
        });
    }

    [HttpGet("2fa/status")]
    [Authorize]
    public async Task<IActionResult> TwoFactorStatus()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        var key = await _userManager.GetAuthenticatorKeyAsync(user);
        var recoveryCodesLeft = await _userManager.CountRecoveryCodesAsync(user);

        return Ok(new
        {
            enabled = user.TwoFactorEnabled,
            hasAuthenticatorKey = !string.IsNullOrWhiteSpace(key),
            recoveryCodesLeft
        });
    }

    [HttpPost("2fa/setup/start")]
    [Authorize]
    [EnableRateLimiting("auth-2fa")]
    public async Task<IActionResult> StartTwoFactorSetup()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        var unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(unformattedKey))
        {
            await _userManager.ResetAuthenticatorKeyAsync(user);
            unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        }

        if (string.IsNullOrWhiteSpace(unformattedKey))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unable to create authenticator key." });
        }

        await WriteAuditEventAsync("AUTH_2FA_SETUP_START", "User", user.Id, "Two-factor setup initiated.");
        var accountLabel = user.UserName ?? user.Email ?? "detective-user";
        var otpauthUri = GenerateOtpAuthUri(accountLabel, unformattedKey);

        return Ok(new
        {
            sharedKey = FormatKey(unformattedKey),
            otpauthUri,
            qrCodePayload = otpauthUri
        });
    }

    [HttpPost("2fa/setup/confirm")]
    [Authorize]
    [EnableRateLimiting("auth-2fa")]
    public async Task<IActionResult> ConfirmTwoFactorSetup([FromBody] TwoFactorSetupConfirmRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "A code is required." });
        }

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            NormalizeAuthenticatorCode(request.Code));

        if (!isValid)
        {
            await WriteAuditEventAsync("AUTH_2FA_FAILURE", "User", user.Id, "Invalid authenticator setup code submitted.");
            return BadRequest(new { message = "Invalid authenticator code." });
        }

        await _userManager.SetTwoFactorEnabledAsync(user, true);
        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10) ?? [];
        await WriteAuditEventAsync("AUTH_2FA_ENABLED", "User", user.Id, $"Two-factor enabled. Recovery codes generated: {recoveryCodes.Count()}.");

        return Ok(new
        {
            enabled = true,
            recoveryCodes = recoveryCodes.ToArray()
        });
    }

    [HttpPost("2fa/recovery-codes/regenerate")]
    [Authorize]
    [EnableRateLimiting("auth-2fa")]
    public async Task<IActionResult> RegenerateRecoveryCodes()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        if (!user.TwoFactorEnabled)
        {
            return BadRequest(new { message = "Two-factor authentication must be enabled first." });
        }

        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10) ?? [];
        await WriteAuditEventAsync("AUTH_2FA_RECOVERY_REGENERATED", "User", user.Id, $"Recovery codes regenerated. Count: {recoveryCodes.Count()}.");
        return Ok(new
        {
            recoveryCodes = recoveryCodes.ToArray()
        });
    }

    [HttpPost("2fa/disable")]
    [Authorize]
    [EnableRateLimiting("auth-2fa")]
    public async Task<IActionResult> DisableTwoFactor()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        await _userManager.ResetAuthenticatorKeyAsync(user);
        await WriteAuditEventAsync("AUTH_2FA_DISABLED", "User", user.Id, "Two-factor authentication disabled.");

        return Ok(new { success = true });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = _userManager.GetUserId(User) ?? "unknown";
        await _signInManager.SignOutAsync();
        await WriteAuditEventAsync("AUTH_LOGOUT", "User", userId, "User signed out.");
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthEnvelopeResponse>> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new AuthEnvelopeResponse
            {
                Authenticated = false
            });
        }

        return Ok(new AuthEnvelopeResponse
        {
            Authenticated = true,
            User = MapUser(user)
        });
    }

    private static AuthUserResponse MapUser(ApplicationUser user)
    {
        return new AuthUserResponse
        {
            UserId = user.Id,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = string.IsNullOrWhiteSpace(user.DisplayName)
                ? user.UserName ?? user.Email ?? string.Empty
                : user.DisplayName
        };
    }

    private static string NormalizeAuthenticatorCode(string code)
    {
        return code.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim();
    }

    private static string GenerateOtpAuthUri(string accountName, string unformattedKey)
    {
        return $"otpauth://totp/{Uri.EscapeDataString(Issuer)}:{Uri.EscapeDataString(accountName)}?secret={unformattedKey}&issuer={Uri.EscapeDataString(Issuer)}&digits=6";
    }

    private static string FormatKey(string unformattedKey)
    {
        if (string.IsNullOrWhiteSpace(unformattedKey))
        {
            return string.Empty;
        }

        var result = new StringBuilder();
        var current = 0;
        while (current + 4 < unformattedKey.Length)
        {
            result.Append(unformattedKey.AsSpan(current, 4)).Append(' ');
            current += 4;
        }

        if (current < unformattedKey.Length)
        {
            result.Append(unformattedKey.AsSpan(current));
        }

        return result.ToString().ToLowerInvariant();
    }

    private async Task WriteAuditEventAsync(string action, string entityType, string entityId, string details)
    {
        try
        {
            var actor = _userManager.GetUserId(User)
                ?? User.Identity?.Name
                ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                ?? "system";

            _dbContext.AuditEvents.Add(new AuditEvent
            {
                ActorUserId = actor,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details,
                OccurredUtc = DateTime.UtcNow,
            });
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to persist audit event {Action} for {EntityType}:{EntityId}", action, entityType, entityId);
        }
    }
}
