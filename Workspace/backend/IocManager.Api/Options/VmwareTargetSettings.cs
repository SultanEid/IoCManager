namespace IocVmwareIngestion.Api.Options;

public sealed class VmwareTargetSettings
{
    public const string SectionName = "VmwareTargets";

    public Dictionary<string, VmwareTarget> Targets { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class VmwareTarget
{
    public string Address { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string KeyPath { get; set; } = string.Empty;
    public string RemoteOs { get; set; } = "windows";
    public string DefaultScanPath { get; set; } = "C:\\";
    public string? DefaultEvtxPath { get; set; }
}
