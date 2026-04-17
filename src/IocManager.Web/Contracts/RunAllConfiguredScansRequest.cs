namespace IocVmwareIngestion.Api.Contracts;

public sealed record RunAllConfiguredScansRequest(
    IReadOnlyCollection<string>? Scanners = null,
    IReadOnlyCollection<string>? TargetKeys = null,
    string? RulePath = null,
    int? MinutesBack = null,
    DateTime? Since = null);
