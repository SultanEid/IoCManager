using System.Globalization;
using System.Text.Json;

namespace Backend.Api.Infrastructure;

public interface ILegacyScannerResultExtractor
{
    IReadOnlyList<ResultIngestionInputRow> ExtractRows(
        string scannerFamily,
        string rawOutput,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset fallbackObservedAtUtc);
}

public sealed class LegacyScannerResultExtractor : ILegacyScannerResultExtractor
{
    private const decimal DetectionConfidence = 0.85m;

    public IReadOnlyList<ResultIngestionInputRow> ExtractRows(
        string scannerFamily,
        string rawOutput,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset fallbackObservedAtUtc)
    {
        if (string.IsNullOrWhiteSpace(rawOutput)
            || !Backend.Domain.Common.RuleFamilyCatalog.TryNormalize(scannerFamily, out var normalizedFamily))
        {
            return Array.Empty<ResultIngestionInputRow>();
        }

        var envelopes = LegacyScannerEnvelopeParser.ParseEnvelopes(rawOutput);
        if (envelopes.Count == 0)
        {
            return Array.Empty<ResultIngestionInputRow>();
        }

        var rows = new List<ResultIngestionInputRow>();
        foreach (var envelope in envelopes)
        {
            var observedAtUtc = ParseTimestamp(envelope.Metadata.TimestampUtc) ?? fallbackObservedAtUtc;
            switch (normalizedFamily)
            {
                case "yara":
                    rows.AddRange(BuildYaraRows(envelope, normalizedFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc));
                    break;
                case "sigma":
                    rows.AddRange(BuildSigmaRows(envelope, normalizedFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc));
                    break;
                case "snort":
                    rows.AddRange(BuildSnortRows(envelope, normalizedFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc));
                    break;
                case "suricata":
                    rows.AddRange(BuildSuricataRows(envelope, normalizedFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc));
                    break;
            }
        }

        return rows;
    }

    private static IEnumerable<ResultIngestionInputRow> BuildYaraRows(
        LegacyScannerEnvelope envelope,
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc)
    {
        if (!TryGetProperty(envelope.RawScannerPayload, "matches", out var matches) || matches.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var match in matches.EnumerateArray())
        {
            var ruleName = GetFirstNonEmpty(match, "rule", "Rule", "rule_name") ?? "unknown";
            var filePath = GetFirstNonEmpty(match, "file", "path", "file_path");

            yield return new ResultIngestionInputRow(
                scannerFamily,
                JsonSerializer.SerializeToElement(new
                {
                    kind = "legacy_scanner_finding",
                    serverId,
                    scanJobId,
                    jobAttemptId,
                    targetExecutionId,
                    observedAtUtc,
                    disposition = Backend.Domain.IocManager.ScanResultDisposition.Detection.ToString(),
                    confidence = DetectionConfidence,
                    ruleName,
                    filePath,
                    evidence = new
                    {
                        kind = "legacy_yara_match",
                        metadata = envelope.Metadata,
                        match,
                    },
                }));
        }
    }

    private static IEnumerable<ResultIngestionInputRow> BuildSigmaRows(
        LegacyScannerEnvelope envelope,
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc)
    {
        if (!TryGetProperty(envelope.RawScannerPayload, "detections", out var detections))
        {
            yield break;
        }

        if (detections.ValueKind == JsonValueKind.Array)
        {
            foreach (var detection in detections.EnumerateArray())
            {
                yield return BuildSigmaRow(scannerFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc, envelope.Metadata, detection);
            }

            yield break;
        }

        yield return BuildSigmaRow(scannerFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc, envelope.Metadata, detections);
    }

    private static ResultIngestionInputRow BuildSigmaRow(
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc,
        LegacyScannerMetadata metadata,
        JsonElement detection)
    {
        var ruleName = GetFirstNonEmpty(detection, "title", "rule", "rule_name", "name") ?? "unknown";
        var commandLine = GetStringByPath(detection, "document", "data", "Event", "EventData", "CommandLine")
            ?? GetStringByPath(detection, "document", "data", "CommandLine")
            ?? GetFirstNonEmpty(detection, "CommandLine", "message");

        return new ResultIngestionInputRow(
            scannerFamily,
            JsonSerializer.SerializeToElement(new
            {
                kind = "legacy_scanner_finding",
                serverId,
                scanJobId,
                jobAttemptId,
                targetExecutionId,
                observedAtUtc = ParseTimestamp(GetFirstNonEmpty(detection, "timestamp") ?? metadata.TimestampUtc) ?? observedAtUtc,
                disposition = Backend.Domain.IocManager.ScanResultDisposition.Detection.ToString(),
                confidence = DetectionConfidence,
                ruleName,
                commandLine,
                evidence = new
                {
                    kind = "legacy_sigma_detection",
                    metadata,
                    detection,
                },
            }));
    }

    private static IEnumerable<ResultIngestionInputRow> BuildSuricataRows(
        LegacyScannerEnvelope envelope,
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc)
    {
        var payload = envelope.RawScannerPayload;
        var ruleName = GetFirstNonEmpty(payload, "RuleTitle", "Signature") ?? GetStringByPath(payload, "alert", "signature") ?? "unknown";

        yield return BuildNetworkRow(scannerFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc, envelope.Metadata, payload, ruleName);
    }

    private static IEnumerable<ResultIngestionInputRow> BuildSnortRows(
        LegacyScannerEnvelope envelope,
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc)
    {
        var payload = envelope.RawScannerPayload;
        var ruleName = GetFirstNonEmpty(payload, "RuleTitle", "Signature", "msg") ?? "unknown";

        yield return BuildNetworkRow(scannerFamily, serverId, scanJobId, jobAttemptId, targetExecutionId, observedAtUtc, envelope.Metadata, payload, ruleName);
    }

    private static ResultIngestionInputRow BuildNetworkRow(
        string scannerFamily,
        Guid serverId,
        Guid scanJobId,
        Guid jobAttemptId,
        Guid targetExecutionId,
        DateTimeOffset observedAtUtc,
        LegacyScannerMetadata metadata,
        JsonElement payload,
        string ruleName)
    {
        return new ResultIngestionInputRow(
            scannerFamily,
            JsonSerializer.SerializeToElement(new
            {
                kind = "legacy_scanner_finding",
                serverId,
                scanJobId,
                jobAttemptId,
                targetExecutionId,
                observedAtUtc = ParseTimestamp(GetFirstNonEmpty(payload, "Timestamp", "timestamp", "timestamp_utc") ?? metadata.TimestampUtc) ?? observedAtUtc,
                disposition = Backend.Domain.IocManager.ScanResultDisposition.Detection.ToString(),
                confidence = DetectionConfidence,
                ruleName,
                signature = ruleName,
                sourceIp = GetFirstNonEmpty(payload, "Source_IP", "src_ip", "src"),
                destinationIp = GetFirstNonEmpty(payload, "Dest_IP", "Destination_IP", "dest_ip", "dest"),
                protocol = GetFirstNonEmpty(payload, "Protocol", "proto"),
                evidence = new
                {
                    kind = "legacy_network_alert",
                    metadata,
                    alert = payload,
                },
            }));
    }

    private static DateTimeOffset? ParseTimestamp(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTimeOffset.TryParse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var timestamp)
            ? timestamp
            : null;
    }

    private static string? GetFirstNonEmpty(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            var value = GetString(element, propertyName);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        if (!TryGetProperty(element, propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.String => property.GetString(),
            JsonValueKind.Number => property.ToString(),
            JsonValueKind.True => bool.TrueString,
            JsonValueKind.False => bool.FalseString,
            _ => property.GetRawText(),
        };
    }

    private static string? GetStringByPath(JsonElement element, params string[] path)
    {
        var current = element;
        foreach (var segment in path)
        {
            if (!TryGetProperty(current, segment, out var property))
            {
                return null;
            }

            current = property;
        }

        return current.ValueKind switch
        {
            JsonValueKind.String => current.GetString(),
            JsonValueKind.Number => current.ToString(),
            JsonValueKind.True => bool.TrueString,
            JsonValueKind.False => bool.FalseString,
            _ => current.GetRawText(),
        };
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement property)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var candidate in element.EnumerateObject())
            {
                if (string.Equals(candidate.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    property = candidate.Value;
                    return true;
                }
            }
        }

        property = default;
        return false;
    }
}
