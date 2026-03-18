using IocVmwareIngestion.Api.Entities;

namespace IocVmwareIngestion.Api.Contracts;

public sealed record TargetSummaryResponse(
    string Key,
    string Address,
    string RemoteOs,
    string DefaultScanPath,
    string? DefaultEvtxPath);

public sealed record ScanRunResponse(
    Guid ScanRunId,
    string Scanner,
    string TargetKey,
    string TargetAddress,
    string Status,
    int FindingsCount,
    int ExitCode,
    DateTime StartedUtc,
    DateTime? CompletedUtc,
    string? ErrorMessage)
{
    public static ScanRunResponse FromEntity(ScanRun entity) =>
        new(
            entity.Id,
            entity.ScannerType,
            entity.TargetKey,
            entity.TargetAddress,
            entity.Status,
            entity.FindingsCount,
            entity.ExitCode,
            entity.StartedUtc,
            entity.CompletedUtc,
            entity.ErrorMessage);
}

public sealed record ScanRunDetailsResponse(
    Guid ScanRunId,
    string Scanner,
    string TargetKey,
    string TargetAddress,
    string Status,
    int FindingsCount,
    int ExitCode,
    string CommandLine,
    DateTime StartedUtc,
    DateTime? CompletedUtc,
    string? ErrorMessage,
    string? RawStdOut,
    string? RawStdErr,
    IReadOnlyCollection<IocRecordResponse> Iocs)
{
    public static ScanRunDetailsResponse FromEntity(ScanRun entity) =>
        new(
            entity.Id,
            entity.ScannerType,
            entity.TargetKey,
            entity.TargetAddress,
            entity.Status,
            entity.FindingsCount,
            entity.ExitCode,
            entity.CommandLine,
            entity.StartedUtc,
            entity.CompletedUtc,
            entity.ErrorMessage,
            entity.RawStdOut,
            entity.RawStdErr,
            entity.IocRecords.Select(IocRecordResponse.FromEntity).ToArray());
}

public sealed record IocRecordResponse(
    Guid? DatabaseId,
    string IndicatorType,
    string IndicatorValue,
    string? RuleName,
    string? Severity,
    string? SourceIp,
    string? DestinationIp,
    DateTime? ObservedUtc,
    DateTime CreatedUtc)
{
    public static IocRecordResponse FromEntity(IocRecord entity) =>
        new(
            entity.DatabaseId,
            entity.IndicatorType,
            entity.IndicatorValue,
            entity.RuleName,
            entity.Severity,
            entity.SourceIp,
            entity.DestinationIp,
            entity.ObservedUtc,
            entity.CreatedUtc);
}
