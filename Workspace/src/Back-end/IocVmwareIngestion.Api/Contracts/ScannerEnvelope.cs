using System.Text.Json;
using System.Text.Json.Serialization;

namespace IocVmwareIngestion.Api.Contracts;

public sealed class ScannerEnvelope
{
    [JsonPropertyName("metadata")]
    public ScannerMetadata Metadata { get; init; } = new();

    [JsonPropertyName("raw_scanner_payload")]
    public JsonElement RawScannerPayload { get; init; }
}

public sealed class ScannerMetadata
{
    [JsonPropertyName("target_server")]
    public string TargetServer { get; init; } = string.Empty;

    [JsonPropertyName("os_type")]
    public string OsType { get; init; } = string.Empty;

    [JsonPropertyName("timestamp_utc")]
    public string TimestampUtc { get; init; } = string.Empty;

    [JsonPropertyName("scanner_type")]
    public string ScannerType { get; init; } = string.Empty;

    [JsonPropertyName("command_line")]
    public string CommandLine { get; init; } = string.Empty;

    [JsonPropertyName("exit_code")]
    public int ExitCode { get; init; }
}
