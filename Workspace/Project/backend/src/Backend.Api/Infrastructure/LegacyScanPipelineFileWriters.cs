using System.Globalization;
using System.Text;
using Backend.Contracts.V2;

namespace Backend.Api.Infrastructure;

internal static class LegacyScanPipelineFileWriters
{
    public static void WriteSimpleCsv(string path, IReadOnlyList<LegacyPipelineReportSectionResponse> sections)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Section,Metric,Value,Detail");
        foreach (var section in sections)
        {
            foreach (var metric in section.Metrics)
            {
                builder.Append(EscapeCsv(section.Title));
                builder.Append(',');
                builder.Append(EscapeCsv(metric.Label));
                builder.Append(',');
                builder.Append(EscapeCsv(metric.Value));
                builder.Append(',');
                builder.AppendLine(EscapeCsv(metric.Detail));
            }
        }

        File.WriteAllText(path, builder.ToString());
    }

    public static void WriteSimplePdf(
        string path,
        string title,
        string reportType,
        string scope,
        IReadOnlyList<LegacyPipelineReportSectionResponse> sections)
    {
        var lines = new List<string>
        {
            title,
            $"{reportType} | {scope}",
            string.Empty,
        };

        foreach (var section in sections)
        {
            lines.Add(section.Title);
            lines.Add(section.Summary);
            foreach (var metric in section.Metrics)
            {
                lines.Add($"- {metric.Label}: {metric.Value} ({metric.Detail})");
            }

            foreach (var highlight in section.Highlights)
            {
                lines.Add($"* {highlight}");
            }

            lines.Add(string.Empty);
        }

        var escapedLines = lines.Select(line =>
            line
                .Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("(", "\\(", StringComparison.Ordinal)
                .Replace(")", "\\)", StringComparison.Ordinal))
            .ToArray();

        var content = new StringBuilder();
        content.AppendLine("BT");
        content.AppendLine("/F1 11 Tf");
        content.AppendLine("50 780 Td");
        var first = true;
        foreach (var line in escapedLines)
        {
            if (!first)
            {
                content.AppendLine("0 -14 Td");
            }

            content.Append('(').Append(line).AppendLine(") Tj");
            first = false;
        }

        content.AppendLine("ET");
        var streamContent = content.ToString();

        using var memory = new MemoryStream();
        using var writer = new StreamWriter(memory, new UTF8Encoding(false), leaveOpen: true);
        var offsets = new List<long>();

        void WriteObject(int number, string body)
        {
            writer.Flush();
            offsets.Add(memory.Position);
            writer.Write(number);
            writer.WriteLine(" 0 obj");
            writer.Write(body);
            writer.WriteLine();
            writer.WriteLine("endobj");
        }

        writer.WriteLine("%PDF-1.4");
        WriteObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
        WriteObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        WriteObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
        WriteObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        WriteObject(5, $"<< /Length {Encoding.ASCII.GetByteCount(streamContent)} >>\nstream\n{streamContent}endstream");

        writer.Flush();
        var xrefStart = memory.Position;
        writer.WriteLine("xref");
        writer.WriteLine($"0 {offsets.Count + 1}");
        writer.WriteLine("0000000000 65535 f ");
        foreach (var offset in offsets)
        {
            writer.WriteLine($"{offset:0000000000} 00000 n ");
        }

        writer.WriteLine("trailer");
        writer.WriteLine($"<< /Size {offsets.Count + 1} /Root 1 0 R >>");
        writer.WriteLine("startxref");
        writer.WriteLine(xrefStart.ToString(CultureInfo.InvariantCulture));
        writer.WriteLine("%%EOF");
        writer.Flush();

        File.WriteAllBytes(path, memory.ToArray());
    }

    private static string EscapeCsv(string? value)
    {
        var safe = value ?? string.Empty;
        return $"\"{safe.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}
