namespace IocVmwareIngestion.Api.Contracts;

public sealed record RunScanRequest(
    string Scanner,
    string TargetKey,
    string? ScanPath = null,
    string? RulePath = null,
    string? SigmaRule = null,
    string? SigmaCustomRule = null,
    int? MinutesBack = null,
    DateTime? Since = null,
    bool Recursive = false,
    bool ShowStrings = false,
    string? NetworkMode = null,
    string? FilePath = null);
