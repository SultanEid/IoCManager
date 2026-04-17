namespace IoCManager.Mvc.Contracts.Settings;

public sealed class PreferenceResponse
{
    public string ThemeMode { get; set; } = "dark";
    public string ThemeStyle { get; set; } = "default";
    public string BaseColor { get; set; } = "neutral";
    public string CustomPrimaryColor { get; set; } = "#ff2f6d";
    public string CustomSecondaryColor { get; set; } = "#3b82f6";
    public string ThemePreset { get; set; } = "neutral";
    public string ButtonStyle { get; set; } = "default";
    public string MotionPreference { get; set; } = "balanced";
    public string LayoutDensity { get; set; } = "comfortable";
}

public sealed class UpdatePreferenceRequest
{
    public string ThemeMode { get; set; } = "dark";
    public string ThemeStyle { get; set; } = "default";
    public string BaseColor { get; set; } = "neutral";
    public string CustomPrimaryColor { get; set; } = "#ff2f6d";
    public string CustomSecondaryColor { get; set; } = "#3b82f6";
    public string ThemePreset { get; set; } = "neutral";
    public string ButtonStyle { get; set; } = "default";
    public string MotionPreference { get; set; } = "balanced";
    public string LayoutDensity { get; set; } = "comfortable";
}
