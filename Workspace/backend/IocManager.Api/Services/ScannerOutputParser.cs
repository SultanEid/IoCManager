using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using IocVmwareIngestion.Api.Contracts;

namespace IocVmwareIngestion.Api.Services;

internal static partial class ScannerOutputParser
{
    public static IReadOnlyCollection<ScannerEnvelope> ParseEnvelopes(string rawText, JsonSerializerOptions jsonOptions)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return [];
        }

        var sanitized = StripTerminalNoise(rawText);
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return [];
        }

        var jsonObjects = ExtractJsonObjects(sanitized);
        if (jsonObjects.Count == 0)
        {
            return [];
        }

        var envelopes = new List<ScannerEnvelope>(jsonObjects.Count);
        foreach (var json in jsonObjects)
        {
            var normalizedJson = NormalizeJson(json);
            var envelope = JsonSerializer.Deserialize<ScannerEnvelope>(normalizedJson, jsonOptions);
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

    private static IReadOnlyCollection<string> ExtractJsonObjects(string text)
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

    private static string NormalizeJson(string value) =>
        value
            .Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", string.Empty, StringComparison.Ordinal)
            .Trim();

    [GeneratedRegex(@"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])", RegexOptions.Compiled)]
    private static partial Regex AnsiEscapeRegex();
}
