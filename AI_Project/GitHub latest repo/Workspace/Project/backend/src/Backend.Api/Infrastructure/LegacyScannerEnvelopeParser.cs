using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Backend.Api.Infrastructure;

public sealed class LegacyScannerEnvelope
{
    [JsonPropertyName("metadata")]
    public LegacyScannerMetadata Metadata { get; init; } = new();

    [JsonPropertyName("raw_scanner_payload")]
    public JsonElement RawScannerPayload { get; init; }
}

public sealed class LegacyScannerMetadata
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

public static partial class LegacyScannerEnvelopeParser
{
    public static IReadOnlyList<LegacyScannerEnvelope> ParseEnvelopes(
        string rawText,
        JsonSerializerOptions? jsonOptions = null)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return Array.Empty<LegacyScannerEnvelope>();
        }

        var sanitized = StripTerminalNoise(rawText);
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return Array.Empty<LegacyScannerEnvelope>();
        }

        var jsonObjects = ExtractJsonObjects(sanitized);
        if (jsonObjects.Count == 0)
        {
            return Array.Empty<LegacyScannerEnvelope>();
        }

        var options = jsonOptions ?? new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var envelopes = new List<LegacyScannerEnvelope>(jsonObjects.Count);

        foreach (var json in jsonObjects)
        {
            var normalizedJson = NormalizeJson(json);
            var envelope = JsonSerializer.Deserialize<LegacyScannerEnvelope>(normalizedJson, options);
            if (envelope is not null)
            {
                envelopes.Add(envelope);
            }
        }

        return envelopes;
    }

    private static string StripTerminalNoise(string value)
    {
        var withoutAnsi = AnsiEscapeRegex().Replace(value, string.Empty);
        var builder = new StringBuilder(withoutAnsi.Length);

        foreach (var ch in withoutAnsi)
        {
            if (ch == '\r' || ch == '\n' || ch == '\t' || !char.IsControl(ch))
            {
                builder.Append(ch);
            }
        }

        return builder.ToString();
    }

    private static IReadOnlyList<string> ExtractJsonObjects(string text)
    {
        var results = new List<string>();
        var depth = 0;
        var startIndex = -1;
        var inString = false;
        var escaping = false;

        for (var i = 0; i < text.Length; i++)
        {
            var current = text[i];

            if (startIndex < 0)
            {
                if (current == '{')
                {
                    startIndex = i;
                    depth = 1;
                    inString = false;
                    escaping = false;
                }

                continue;
            }

            if (escaping)
            {
                escaping = false;
                continue;
            }

            if (current == '\\')
            {
                if (inString)
                {
                    escaping = true;
                }

                continue;
            }

            if (current == '"')
            {
                inString = !inString;
                continue;
            }

            if (inString)
            {
                continue;
            }

            if (current == '{')
            {
                depth++;
            }
            else if (current == '}')
            {
                depth--;
                if (depth == 0)
                {
                    results.Add(text[startIndex..(i + 1)]);
                    startIndex = -1;
                }
            }
        }

        return results;
    }

    private static string NormalizeJson(string value)
    {
        return value
            .Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", string.Empty, StringComparison.Ordinal)
            .Trim();
    }

    [GeneratedRegex(@"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])", RegexOptions.Compiled)]
    private static partial Regex AnsiEscapeRegex();
}
