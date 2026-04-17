namespace IoCManager.Mvc.Entities;

public sealed class UserPreference
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string ThemeMode { get; set; } = "dark";
    public string ThemeStyle { get; set; } = "default";
    public string BaseColor { get; set; } = "neutral";
    public string CustomPrimaryColor { get; set; } = "#ff2f6d";
    public string CustomSecondaryColor { get; set; } = "#3b82f6";
    public string ThemePreset { get; set; } = "neutral";
    public string ButtonStyle { get; set; } = "default";
    public string MotionPreference { get; set; } = "balanced";
    public string LayoutDensity { get; set; } = "comfortable";
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}
