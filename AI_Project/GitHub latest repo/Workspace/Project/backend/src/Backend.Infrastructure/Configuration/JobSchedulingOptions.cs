namespace Backend.Infrastructure.Configuration;

public sealed class JobSchedulingOptions
{
    public const string SectionName = "Jobs";

    public bool EnableModelRetraining { get; set; } = false;
    public int ModelRetrainingIntervalHours { get; set; } = 24;
    public string SystemActorUserId { get; set; } = "system-worker";
}
