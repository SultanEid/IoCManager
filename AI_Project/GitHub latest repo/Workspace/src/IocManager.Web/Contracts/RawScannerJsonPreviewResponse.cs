using IocVmwareIngestion.Api.Entities;

namespace IocVmwareIngestion.Api.Contracts;

public sealed record RawScannerJsonPreviewResponse(
    string Scanner,
    string TargetServer,
    int ExitCode,
    int ExtractedCount,
    IReadOnlyCollection<IocRecordResponse> Iocs)
{
    public static RawScannerJsonPreviewResponse FromEnvelope(ScannerEnvelope envelope, IReadOnlyCollection<IocRecord> iocs) =>
        new(
            envelope.Metadata.ScannerType,
            envelope.Metadata.TargetServer,
            envelope.Metadata.ExitCode,
            iocs.Count,
            iocs.Select(IocRecordResponse.FromEntity).ToArray());
}
