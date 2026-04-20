using System.Globalization;
using System.Text.Json;
using IocVmwareIngestion.Api.Contracts;
using IocVmwareIngestion.Api.Entities;

namespace IocVmwareIngestion.Api.Services;

public sealed class IocExtractionService
{
    public IReadOnlyCollection<IocRecord> Extract(ScannerEnvelope envelope)
    {
        var scannerType = envelope.Metadata.ScannerType.Trim().ToUpperInvariant();

        return scannerType switch
        {
            "YARA" => ExtractYara(envelope),
            "SIGMA" => ExtractSigma(envelope),
            "SURICATA" => ExtractSuricata(envelope),
            "SNORT" => ExtractSnort(envelope),
            _ => []
        };
    }

    private static IReadOnlyCollection<IocRecord> ExtractYara(ScannerEnvelope envelope)
    {
        if (!TryGetProperty(envelope.RawScannerPayload, "matches", out var matches) || matches.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var observedUtc = ParseTimestamp(envelope.Metadata.TimestampUtc);
        var iocs = new List<IocRecord>();

        foreach (var match in matches.EnumerateArray())
        {
            var filePath = GetString(match, "file");
            if (string.IsNullOrWhiteSpace(filePath))
            {
                continue;
            }

            iocs.Add(new IocRecord
            {
                IndicatorType = "file",
                IndicatorValue = filePath,
                RuleName = GetString(match, "rule"),
                FileHash = GetFirstNonEmpty(match, "file_hash", "hash", "sha256", "md5"),
                ObservedUtc = observedUtc,
                RawPayloadJson = match.GetRawText()
            });
        }

        return iocs;
    }

    private static IReadOnlyCollection<IocRecord> ExtractSigma(ScannerEnvelope envelope)
    {
        if (!TryGetProperty(envelope.RawScannerPayload, "detections", out var detections))
        {
            return [];
        }

        var observedUtc = ParseTimestamp(envelope.Metadata.TimestampUtc);
        var iocs = new List<IocRecord>();

        if (detections.ValueKind == JsonValueKind.Array)
        {
            foreach (var detection in detections.EnumerateArray())
            {
                iocs.Add(BuildSigmaIoc(detection, observedUtc));
            }
        }
        else
        {
            iocs.Add(BuildSigmaIoc(detections, observedUtc));
        }

        return iocs;
    }

    private static IReadOnlyCollection<IocRecord> ExtractSuricata(ScannerEnvelope envelope)
    {
        var payload = envelope.RawScannerPayload;
        var indicatorValue = GetFirstNonEmpty(payload, "RuleTitle", "Description")
            ?? GetStringByPath(payload, "alert", "signature");
        if (string.IsNullOrWhiteSpace(indicatorValue))
        {
            indicatorValue = payload.GetRawText();
        }

        return
        [
            new IocRecord
            {
                IndicatorType = "network-alert",
                IndicatorValue = indicatorValue,
                RuleName = GetFirstNonEmpty(payload, "RuleTitle", "Signature")
                    ?? GetStringByPath(payload, "alert", "signature"),
                Severity = GetFirstNonEmpty(payload, "Severity", "Priority")
                    ?? GetStringByPath(payload, "alert", "severity"),
                SourceIp = GetFirstNonEmpty(payload, "Source_IP", "src_ip", "src"),
                DestinationIp = GetFirstNonEmpty(payload, "Dest_IP", "Destination_IP", "dest_ip", "dest"),
                Protocol = GetFirstNonEmpty(payload, "Protocol", "proto"),
                FlowId = GetFirstNonEmpty(payload, "flow_id", "FlowId"),
                ObservedUtc = ParseTimestamp(GetFirstNonEmpty(payload, "Timestamp", "timestamp", "timestamp_utc") ?? envelope.Metadata.TimestampUtc),
                RawPayloadJson = payload.GetRawText()
            }
        ];
    }

    private static IReadOnlyCollection<IocRecord> ExtractSnort(ScannerEnvelope envelope)
    {
        var payload = envelope.RawScannerPayload;
        var indicatorValue = GetFirstNonEmpty(payload, "RuleTitle", "Description", "msg", "Message");
        if (string.IsNullOrWhiteSpace(indicatorValue))
        {
            indicatorValue = payload.GetRawText();
        }

        return
        [
            new IocRecord
            {
                IndicatorType = "network-alert",
                IndicatorValue = indicatorValue,
                RuleName = GetFirstNonEmpty(payload, "RuleTitle", "Signature", "msg"),
                Severity = GetFirstNonEmpty(payload, "Severity", "Priority"),
                SourceIp = GetFirstNonEmpty(payload, "Source_IP", "src_ip", "src"),
                DestinationIp = GetFirstNonEmpty(payload, "Dest_IP", "Destination_IP", "dest_ip", "dest"),
                Protocol = GetFirstNonEmpty(payload, "Protocol", "proto"),
                FlowId = GetFirstNonEmpty(payload, "FlowId", "flow_id"),
                ObservedUtc = ParseTimestamp(GetFirstNonEmpty(payload, "Timestamp", "timestamp", "timestamp_utc") ?? envelope.Metadata.TimestampUtc),
                RawPayloadJson = payload.GetRawText()
            }
        ];
    }

    private static IocRecord BuildSigmaIoc(JsonElement detection, DateTime? observedUtc)
    {
        var sigmaCommandLine = GetBestSigmaCommandLine(detection);
        var indicatorValue = GetBestDetectionValue(detection, sigmaCommandLine);
        if (string.IsNullOrWhiteSpace(indicatorValue))
        {
            indicatorValue = detection.GetRawText();
        }

        return new IocRecord
        {
            IndicatorType = "event",
            IndicatorValue = indicatorValue,
            RuleName = GetFirstNonEmpty(detection, "title", "rule", "rule_name", "name"),
            Severity = GetFirstNonEmpty(detection, "level", "severity"),
            CommandLine = sigmaCommandLine,
            LogSource = BuildSigmaLogSource(detection),
            ObservedUtc = ParseTimestamp(GetFirstNonEmpty(detection, "timestamp") ?? observedUtc?.ToString("O", CultureInfo.InvariantCulture)),
            RawPayloadJson = detection.GetRawText()
        };
    }

    private static string? BuildSigmaLogSource(JsonElement detection)
    {
        var category = GetStringByPath(detection, "logsource", "category");
        var product = GetStringByPath(detection, "logsource", "product");
        var service = GetStringByPath(detection, "logsource", "service");
        var parts = new[] { category, product, service }
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToArray();

        if (parts.Length > 0)
        {
            return string.Join("/", parts);
        }

        return GetFirstNonEmpty(detection, "source", "channel");
    }

    private static DateTime? ParseTimestamp(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var timestamp))
        {
            return timestamp;
        }

        return null;
    }

    private static string GetBestDetectionValue(JsonElement detection, string? sigmaCommandLine) =>
        sigmaCommandLine
        ?? GetStringByPath(detection, "document", "data", "Event", "EventData", "CommandLine")
        ?? GetStringByPath(detection, "document", "data", "Event", "EventData", "Image")
        ?? GetStringByPath(detection, "document", "data", "Event", "EventData", "TargetFilename")
        ?? GetStringByPath(detection, "document", "path")
        ?? GetFirstNonEmpty(detection, "title", "message", "event_id", "Image", "CommandLine", "TargetFilename")
        ?? string.Empty;

    private static string? GetBestSigmaCommandLine(JsonElement detection)
    {
        var directValue = GetStringByPath(detection, "document", "data", "Event", "EventData", "CommandLine")
            ?? GetStringByPath(detection, "document", "data", "Event", "EventData", "ParentCommandLine")
            ?? GetStringByPath(detection, "document", "data", "CommandLine")
            ?? GetStringByPath(detection, "CommandLine");

        return NormalizeSigmaCommandLine(directValue);
    }

    private static string? NormalizeSigmaCommandLine(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        const string commandLinePrefix = "CommandLine\">";
        var commandLineStart = value.IndexOf(commandLinePrefix, StringComparison.OrdinalIgnoreCase);
        if (commandLineStart >= 0)
        {
            commandLineStart += commandLinePrefix.Length;
            var commandLineEnd = value.IndexOf("</Data>", commandLineStart, StringComparison.OrdinalIgnoreCase);
            if (commandLineEnd > commandLineStart)
            {
                return value[commandLineStart..commandLineEnd].Trim();
            }
        }

        var syslogSeparator = value.IndexOf("]: ", StringComparison.Ordinal);
        if (syslogSeparator >= 0 && syslogSeparator + 3 < value.Length)
        {
            return value[(syslogSeparator + 3)..].Trim();
        }

        return value.Trim();
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
            _ => property.GetRawText()
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
            _ => current.GetRawText()
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
