namespace IoCManager.Mvc.Entities;

public sealed class CustomizerState
{
    public int Id { get; set; }
    public string Style { get; set; } = "Mira";
    public string Base { get; set; } = "Radix UI";
    public string BaseColor { get; set; } = "Taupe";
    public string Theme { get; set; } = "Blue";
    public string IconLibrary { get; set; } = "Tabler Icons";
    public string Font { get; set; } = "Inter";
    public string Radius { get; set; } = "Small";
    public string MenuColor { get; set; } = "Default";
    public string MenuAccent { get; set; } = "Subtle";
}
