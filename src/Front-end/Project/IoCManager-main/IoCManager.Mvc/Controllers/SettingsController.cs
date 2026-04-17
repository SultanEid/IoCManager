using IoCManager.Mvc.Contracts.Settings;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    private static readonly HashSet<string> ThemeModes = ["dark", "light", "gray"];
    private static readonly HashSet<string> ThemeStyles =
    [
        "default",
        "new-york",
        "vega",
        "nova",
        "maia",
        "lyra",
        "mira"
    ];
    private static readonly HashSet<string> BaseColors =
    [
        "neutral",
        "rose",
        "cyan",
        "blue",
        "violet",
        "amber",
        "emerald",
        "indigo",
        "orange",
        "teal",
        "red",
        "pink",
        "purple",
        "sky",
        "lime",
        "green",
        "yellow",
        "custom"
    ];
    private static readonly HashSet<string> ThemePresets =
    [
        "neutral",
        "stone",
        "zinc",
        "mauve",
        "olive",
        "mist",
        "taupe",
        "slate"
    ];
    private static readonly HashSet<string> ButtonStyles = ["default", "soft", "outline", "ghost", "pill"];
    private static readonly HashSet<string> MotionPreferences = ["balanced", "reduced", "enhanced"];
    private static readonly HashSet<string> LayoutDensities = ["comfortable", "compact"];

    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;

    public SettingsController(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager)
    {
        _dbContext = dbContext;
        _userManager = userManager;
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<PreferenceResponse>> GetPreferences()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var existing = await _dbContext.UserPreferences.FirstOrDefaultAsync(x => x.UserId == user.Id);
        if (existing is null)
        {
            return Ok(DefaultPreferenceResponse());
        }

        return Ok(MapPreference(existing));
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<PreferenceResponse>> UpsertPreferences([FromBody] UpdatePreferenceRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var sanitized = SanitizeRequest(request);
        var existing = await _dbContext.UserPreferences.FirstOrDefaultAsync(x => x.UserId == user.Id);
        if (existing is null)
        {
            existing = new UserPreference
            {
                UserId = user.Id
            };
            _dbContext.UserPreferences.Add(existing);
        }

        existing.ThemeMode = sanitized.ThemeMode;
        existing.ThemeStyle = sanitized.ThemeStyle;
        existing.BaseColor = sanitized.BaseColor;
        existing.CustomPrimaryColor = sanitized.CustomPrimaryColor;
        existing.CustomSecondaryColor = sanitized.CustomSecondaryColor;
        existing.ThemePreset = sanitized.ThemePreset;
        existing.ButtonStyle = sanitized.ButtonStyle;
        existing.MotionPreference = sanitized.MotionPreference;
        existing.LayoutDensity = sanitized.LayoutDensity;
        existing.UpdatedUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(MapPreference(existing));
    }

    private static UpdatePreferenceRequest SanitizeRequest(UpdatePreferenceRequest request)
    {
        return new UpdatePreferenceRequest
        {
            ThemeMode = Coerce(request.ThemeMode, ThemeModes, "dark"),
            ThemeStyle = Coerce(request.ThemeStyle, ThemeStyles, "default"),
            BaseColor = Coerce(request.BaseColor, BaseColors, "neutral"),
            CustomPrimaryColor = CoerceHex(request.CustomPrimaryColor, "#ff2f6d"),
            CustomSecondaryColor = CoerceHex(request.CustomSecondaryColor, "#3b82f6"),
            ThemePreset = Coerce(request.ThemePreset, ThemePresets, "neutral"),
            ButtonStyle = Coerce(request.ButtonStyle, ButtonStyles, "default"),
            MotionPreference = Coerce(request.MotionPreference, MotionPreferences, "balanced"),
            LayoutDensity = Coerce(request.LayoutDensity, LayoutDensities, "comfortable")
        };
    }

    private static PreferenceResponse MapPreference(UserPreference entity)
    {
        return new PreferenceResponse
        {
            ThemeMode = entity.ThemeMode,
            ThemeStyle = entity.ThemeStyle,
            BaseColor = entity.BaseColor,
            CustomPrimaryColor = CoerceHex(entity.CustomPrimaryColor, "#ff2f6d"),
            CustomSecondaryColor = CoerceHex(entity.CustomSecondaryColor, "#3b82f6"),
            ThemePreset = entity.ThemePreset,
            ButtonStyle = entity.ButtonStyle,
            MotionPreference = entity.MotionPreference,
            LayoutDensity = entity.LayoutDensity
        };
    }

    private static PreferenceResponse DefaultPreferenceResponse()
    {
        return new PreferenceResponse
        {
            ThemeMode = "dark",
            ThemeStyle = "default",
            BaseColor = "neutral",
            CustomPrimaryColor = "#ff2f6d",
            CustomSecondaryColor = "#3b82f6",
            ThemePreset = "neutral",
            ButtonStyle = "default",
            MotionPreference = "balanced",
            LayoutDensity = "comfortable"
        };
    }

    private static string Coerce(string? incoming, HashSet<string> allowed, string fallback)
    {
        if (string.IsNullOrWhiteSpace(incoming))
        {
            return fallback;
        }

        var normalized = incoming.Trim().ToLowerInvariant();
        return allowed.Contains(normalized) ? normalized : fallback;
    }

    private static string CoerceHex(string? incoming, string fallback)
    {
        if (string.IsNullOrWhiteSpace(incoming))
        {
            return fallback;
        }

        var normalized = incoming.Trim().ToLowerInvariant();
        return Regex.IsMatch(normalized, "^#[0-9a-f]{6}$") ? normalized : fallback;
    }
}
