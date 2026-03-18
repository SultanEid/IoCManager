namespace IocVmwareIngestion.Api.Contracts;

public sealed record RawScannerJsonPersistResponse(
    string Scanner,
    string TargetServer,
    string TargetOsType,
    int ExitCode,
    int StoredCount,
    IReadOnlyCollection<IocRecordResponse> Iocs);
