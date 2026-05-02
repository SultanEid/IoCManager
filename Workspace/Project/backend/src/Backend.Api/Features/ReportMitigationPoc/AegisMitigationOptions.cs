namespace Backend.Api.Features.ReportMitigationPoc;

public sealed class AegisMitigationOptions
{
    public const string SectionName = "AegisMitigation";

    public bool StrictLiveLlmMode { get; set; } = false;
    public bool AutonomyEnabled { get; set; } = true;
    public int AutonomyIntervalSeconds { get; set; } = 180;
    public int SevereAlertLookbackHours { get; set; } = 24;
    public int MaxAlertsPerPass { get; set; } = 3;
    public string SystemActorUserId { get; set; } = "aegis-autonomy";
}
