using System.Globalization;
using System.Net;
using System.Text;
using Backend.Contracts.V2;

namespace Backend.Api.Infrastructure;

internal static class LegacyScanPipelineFileWriters
{
    private const float PageWidth = 612f;
    private const float PageHeight = 792f;
    private const float MarginLeft = 52f;
    private const float MarginRight = 52f;
    private const float MarginTop = 54f;
    private const float MarginBottom = 48f;

    public static void WriteSimpleHtml(
        string path,
        string title,
        string reportType,
        string scope,
        DateTimeOffset generatedAtUtc,
        LegacyPipelineReportQueryResponse query,
        IReadOnlyList<LegacyPipelineReportSectionResponse> sections)
    {
        var builder = new StringBuilder();
        builder.AppendLine("<!doctype html>");
        builder.AppendLine("<html lang=\"en\">");
        builder.AppendLine("<head>");
        builder.AppendLine("  <meta charset=\"utf-8\">");
        builder.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
        builder.Append("  <title>").Append(Html(title)).AppendLine("</title>");
        builder.AppendLine("  <style>");
        builder.AppendLine("    :root{--ink:#172033;--muted:#5f6b7a;--line:#dbe3ee;--panel:#f7f9fc;--accent:#0f6b8f;--accent-soft:#e5f3f8}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:var(--ink);font:14px/1.55 Arial,Helvetica,sans-serif}main{max-width:1120px;margin:0 auto;padding:32px 24px 48px}header,.section{border:1px solid var(--line);background:#fff;border-radius:18px;box-shadow:0 18px 48px rgba(23,32,51,.08)}header{padding:28px}.section{margin-top:22px;padding:22px;break-inside:avoid}.kicker{margin:0 0 10px;color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}h1{margin:0;font-size:30px;line-height:1.15}h2{margin:0 0 8px;font-size:20px}p{margin:0}.summary{color:var(--muted)}.meta,.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:18px}.meta div,.metric,.highlight{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:12px}.label{display:block;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.value{display:block;margin-top:4px;font-weight:700}.metric strong{display:block;margin-top:4px;font-size:18px}.metric small{display:block;margin-top:4px;color:var(--muted)}.highlights{display:grid;gap:8px;margin-top:16px}@media print{body{background:#fff}main{max-width:none;padding:0}header,.section{box-shadow:none;break-inside:avoid}}");
        builder.AppendLine("  </style>");
        builder.AppendLine("</head>");
        builder.AppendLine("<body><main>");
        builder.AppendLine("  <header>");
        builder.AppendLine("    <p class=\"kicker\">IOC Manager Report</p>");
        builder.Append("    <h1>").Append(Html(title)).AppendLine("</h1>");
        builder.Append("    <p class=\"summary\">").Append(Html(reportType)).Append(" | ").Append(Html(scope)).AppendLine("</p>");
        builder.AppendLine("    <div class=\"meta\">");
        AppendHtmlMeta(builder, "Generated UTC", generatedAtUtc.ToString("u", CultureInfo.InvariantCulture));
        AppendHtmlMeta(builder, "Job Filter", query.JobId ?? "All");
        AppendHtmlMeta(builder, "Target Filter", query.TargetId ?? "All");
        AppendHtmlMeta(builder, "Subnet Filter", query.NetworkId ?? "All");
        AppendHtmlMeta(builder, "Scanner Filter", query.ScannerFamily ?? "All");
        AppendHtmlMeta(builder, "Severity Filter", query.Severity ?? "All");
        AppendHtmlMeta(builder, "Status Filter", query.Status ?? "All");
        AppendHtmlMeta(builder, "From UTC", query.FromUtc ?? "Not set");
        AppendHtmlMeta(builder, "To UTC", query.ToUtc ?? "Not set");
        builder.AppendLine("    </div>");
        builder.AppendLine("  </header>");

        foreach (var section in sections)
        {
            builder.AppendLine("  <section class=\"section\">");
            builder.Append("    <h2>").Append(Html(section.Title)).AppendLine("</h2>");
            builder.Append("    <p class=\"summary\">").Append(Html(section.Summary)).AppendLine("</p>");
            if (section.Metrics.Count > 0)
            {
                builder.AppendLine("    <div class=\"metrics\">");
                foreach (var metric in section.Metrics)
                {
                    builder.AppendLine("      <div class=\"metric\">");
                    builder.Append("        <span class=\"label\">").Append(Html(metric.Label)).AppendLine("</span>");
                    builder.Append("        <strong>").Append(Html(metric.Value)).AppendLine("</strong>");
                    builder.Append("        <small>").Append(Html(metric.Detail)).AppendLine("</small>");
                    builder.AppendLine("      </div>");
                }

                builder.AppendLine("    </div>");
            }

            if (section.Highlights.Count > 0)
            {
                builder.AppendLine("    <div class=\"highlights\">");
                foreach (var highlight in section.Highlights)
                {
                    builder.Append("      <p class=\"highlight\">").Append(Html(highlight)).AppendLine("</p>");
                }

                builder.AppendLine("    </div>");
            }

            builder.AppendLine("  </section>");
        }

        builder.AppendLine("</main></body></html>");
        File.WriteAllText(path, builder.ToString(), new UTF8Encoding(false));
    }

    public static void WriteSimpleCsv(
        string path,
        string title,
        string reportType,
        string scope,
        DateTimeOffset generatedAtUtc,
        LegacyPipelineReportQueryResponse query,
        IReadOnlyList<LegacyPipelineReportSectionResponse> sections)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Metadata,Value");
        AppendCsvRow(builder, "Title", title);
        AppendCsvRow(builder, "Report Type", reportType);
        AppendCsvRow(builder, "Scope", scope);
        AppendCsvRow(builder, "Generated At UTC", generatedAtUtc.ToString("O", CultureInfo.InvariantCulture));
        AppendCsvRow(builder, "Job Filter", query.JobId ?? "All");
        AppendCsvRow(builder, "Target Filter", query.TargetId ?? "All");
        AppendCsvRow(builder, "Subnet Filter", query.NetworkId ?? "All");
        AppendCsvRow(builder, "Scanner Filter", query.ScannerFamily ?? "All");
        AppendCsvRow(builder, "Severity Filter", query.Severity ?? "All");
        AppendCsvRow(builder, "Status Filter", query.Status ?? "All");
        AppendCsvRow(builder, "From UTC", query.FromUtc ?? "Not set");
        AppendCsvRow(builder, "To UTC", query.ToUtc ?? "Not set");
        builder.AppendLine();

        builder.AppendLine("Sections");
        builder.AppendLine("Section,Summary");
        foreach (var section in sections)
        {
            builder.Append(EscapeCsv(section.Title));
            builder.Append(',');
            builder.AppendLine(EscapeCsv(section.Summary));
        }

        builder.AppendLine();
        builder.AppendLine("Section Metrics");
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

        builder.AppendLine();
        builder.AppendLine("Section Highlights");
        builder.AppendLine("Section,Highlight");
        foreach (var section in sections)
        {
            foreach (var highlight in section.Highlights)
            {
                builder.Append(EscapeCsv(section.Title));
                builder.Append(',');
                builder.AppendLine(EscapeCsv(highlight));
            }
        }

        File.WriteAllText(path, builder.ToString(), new UTF8Encoding(false));
    }

    public static void WriteSimplePdf(
        string path,
        string title,
        string reportType,
        string scope,
        DateTimeOffset generatedAtUtc,
        LegacyPipelineReportQueryResponse query,
        IReadOnlyList<LegacyPipelineReportSectionResponse> sections)
    {
        var layout = new PdfLayout();
        layout.AddHero(title, reportType, scope, generatedAtUtc);
        layout.AddMetadataPanel(query);

        foreach (var section in sections)
        {
            layout.AddSection(section);
        }

        File.WriteAllBytes(path, BuildPdf(layout.BuildPages(title)));
    }

    private static void AppendCsvRow(StringBuilder builder, string label, string value)
    {
        builder.Append(EscapeCsv(label));
        builder.Append(',');
        builder.AppendLine(EscapeCsv(value));
    }

    private static void AppendHtmlMeta(StringBuilder builder, string label, string value)
    {
        builder.AppendLine("      <div>");
        builder.Append("        <span class=\"label\">").Append(Html(label)).AppendLine("</span>");
        builder.Append("        <span class=\"value\">").Append(Html(value)).AppendLine("</span>");
        builder.AppendLine("      </div>");
    }

    private static string Html(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    private static string EscapeCsv(string? value)
    {
        var safe = value ?? string.Empty;
        return $"\"{safe.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }

    private static byte[] BuildPdf(IReadOnlyList<PdfPageContent> pages)
    {
        using var memory = new MemoryStream();
        using var writer = new StreamWriter(memory, new UTF8Encoding(false), leaveOpen: true);
        var offsets = new List<long>();
        var pageCount = Math.Max(1, pages.Count);
        var fontRegularObject = 3 + pageCount;
        var fontBoldObject = fontRegularObject + 1;
        var firstContentObject = fontBoldObject + 1;

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
        var kidRefs = string.Join(' ', Enumerable.Range(0, pageCount).Select(index => $"{3 + index} 0 R"));
        WriteObject(2, $"<< /Type /Pages /Kids [{kidRefs}] /Count {pageCount} >>");

        for (var index = 0; index < pageCount; index++)
        {
            var contentObject = firstContentObject + index;
            WriteObject(
                3 + index,
                $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PageWidth.ToString(CultureInfo.InvariantCulture)} {PageHeight.ToString(CultureInfo.InvariantCulture)}] /Resources << /Font << /F1 {fontRegularObject} 0 R /F2 {fontBoldObject} 0 R >> >> /Contents {contentObject} 0 R >>");
        }

        WriteObject(fontRegularObject, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        WriteObject(fontBoldObject, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

        for (var index = 0; index < pageCount; index++)
        {
            var streamContent = pages[index].BuildContentStream();
            WriteObject(firstContentObject + index, $"<< /Length {Encoding.ASCII.GetByteCount(streamContent)} >>\nstream\n{streamContent}endstream");
        }

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

        return memory.ToArray();
    }

    private sealed class PdfLayout
    {
        private static readonly PdfColor Surface = new(0.09f, 0.11f, 0.16f);
        private static readonly PdfColor SurfaceAlt = new(0.13f, 0.16f, 0.22f);
        private static readonly PdfColor SurfaceMuted = new(0.17f, 0.20f, 0.27f);
        private static readonly PdfColor Accent = new(0.30f, 0.65f, 0.93f);
        private static readonly PdfColor AccentWarm = new(0.86f, 0.67f, 0.22f);
        private static readonly PdfColor TextStrong = new(0.96f, 0.97f, 0.99f);
        private static readonly PdfColor TextMuted = new(0.76f, 0.81f, 0.88f);
        private static readonly PdfColor InkStrong = new(0.12f, 0.15f, 0.21f);
        private static readonly PdfColor InkMuted = new(0.36f, 0.40f, 0.47f);
        private static readonly PdfColor Border = new(0.28f, 0.35f, 0.47f);

        private readonly List<PdfPageContent> _pages = [];
        private PdfPageContent _currentPage = new();
        private float _currentY = PageHeight - MarginTop;

        public IReadOnlyList<PdfPageContent> BuildPages(string title)
        {
            if (_pages.Count == 0)
            {
                _pages.Add(_currentPage);
            }

            for (var index = 0; index < _pages.Count; index++)
            {
                _pages[index].AddLine(MarginLeft, MarginBottom - 6f, PageWidth - MarginLeft - MarginRight, 0.75f, Border);
                _pages[index].AddText(MarginLeft, MarginBottom - 20f, "F1", 9f, TextMuted, title);
                _pages[index].AddText(PageWidth - MarginRight - 68f, MarginBottom - 20f, "F1", 9f, TextMuted, $"Page {index + 1} of {_pages.Count}");
            }

            return _pages;
        }

        public void AddHero(string title, string reportType, string scope, DateTimeOffset generatedAtUtc)
        {
            const float blockHeight = 114f;
            EnsureSpace(blockHeight + 12f);

            var yBottom = _currentY - blockHeight;
            var width = PageWidth - MarginLeft - MarginRight;
            _currentPage.AddRect(MarginLeft, yBottom, width, blockHeight, Surface, Border, 1f);
            _currentPage.AddRect(MarginLeft, yBottom, 10f, blockHeight, Accent, null, 0f);
            _currentPage.AddRect(MarginLeft + 18f, yBottom + blockHeight - 30f, 104f, 18f, SurfaceMuted, null, 0f);
            _currentPage.AddText(MarginLeft + 24f, yBottom + blockHeight - 18f, "F2", 9f, TextMuted, "BRIEFING SNAPSHOT");
            AddWrappedText(title, "F2", 21f, 24f, MarginLeft + 22f, _currentY - 38f, width - 150f, TextStrong);
            AddWrappedText($"{reportType} | {scope}", "F1", 11f, 15f, MarginLeft + 22f, yBottom + 34f, width - 160f, TextMuted);
            AddWrappedText($"Generated {generatedAtUtc.ToString("u", CultureInfo.InvariantCulture)}", "F1", 10f, 14f, MarginLeft + 22f, yBottom + 16f, width - 160f, TextMuted);
            _currentPage.AddRect(PageWidth - MarginRight - 108f, yBottom + 18f, 88f, 62f, SurfaceAlt, AccentWarm, 1f);
            _currentPage.AddText(PageWidth - MarginRight - 92f, yBottom + 56f, "F2", 10f, TextMuted, "SCOPE");
            AddWrappedText(scope, "F2", 14f, 17f, PageWidth - MarginRight - 92f, yBottom + 37f, 72f, TextStrong);

            _currentY = yBottom - 12f;
        }

        public void AddMetadataPanel(LegacyPipelineReportQueryResponse query)
        {
            var entries = new (string Label, string Value)[]
            {
                ("Job Filter", query.JobId ?? "All"),
                ("Target Filter", query.TargetId ?? "All"),
                ("Subnet Filter", query.NetworkId ?? "All"),
                ("Scanner Filter", query.ScannerFamily ?? "All"),
                ("Severity Filter", query.Severity ?? "All"),
                ("Status Filter", query.Status ?? "All"),
                ("From UTC", query.FromUtc ?? "Not set"),
                ("To UTC", query.ToUtc ?? "Not set"),
            };

            AddSectionBand("Scope and Methodology");

            const float gap = 10f;
            var tileWidth = (PageWidth - MarginLeft - MarginRight - gap) / 2f;
            for (var index = 0; index < entries.Length; index += 2)
            {
                var row = entries.Skip(index).Take(2).ToArray();
                var cardHeight = row
                    .Select(item => Math.Max(42f, 24f + MeasureWrappedHeight(item.Value, 9.8f, 12.5f, tileWidth - 18f)))
                    .Max() + 10f;

                EnsureSpace(cardHeight + 8f);
                var yBottom = _currentY - cardHeight;
                for (var column = 0; column < row.Length; column++)
                {
                    var x = MarginLeft + column * (tileWidth + gap);
                    _currentPage.AddRect(x, yBottom, tileWidth, cardHeight, SurfaceAlt, Border, 0.85f);
                    _currentPage.AddText(x + 9f, yBottom + cardHeight - 15f, "F2", 8.5f, TextMuted, row[column].Label.ToUpperInvariant());
                    AddWrappedText(row[column].Value, "F1", 9.8f, 12.5f, x + 9f, yBottom + cardHeight - 29f, tileWidth - 18f, TextStrong);
                }

                _currentY = yBottom - 8f;
            }
        }

        public void AddSection(LegacyPipelineReportSectionResponse section)
        {
            AddSectionBand(section.Title);

            AddWrappedParagraph(section.Summary, 10.6f, 15f, InkMuted);
            AddBlankLine(6f);

            if (section.Metrics.Count > 0)
            {
                AddSubheading("Key Metrics");
                AddMetricCards(section.Metrics);
                AddBlankLine(6f);
            }

            if (section.Highlights.Count > 0)
            {
                AddSubheading("Highlights");
                AddHighlightCards(section.Highlights);
                AddBlankLine(6f);
            }
        }

        private void AddSectionBand(string title)
        {
            EnsureSpace(30f);
            var yBottom = _currentY - 24f;
            _currentPage.AddRect(MarginLeft, yBottom, PageWidth - MarginLeft - MarginRight, 24f, SurfaceAlt, Accent, 0.9f);
            _currentPage.AddText(MarginLeft + 12f, yBottom + 8f, "F2", 12f, TextStrong, title);
            _currentY = yBottom - 10f;
        }

        private void AddSubheading(string text)
        {
            EnsureSpace(18f);
            _currentPage.AddText(MarginLeft, _currentY, "F2", 10.5f, AccentWarm, text.ToUpperInvariant());
            _currentY -= 16f;
        }

        private void AddMetricCards(IReadOnlyList<LegacyPipelineReportSectionMetricResponse> metrics)
        {
            const float gap = 10f;
            var cardWidth = (PageWidth - MarginLeft - MarginRight - gap) / 2f;
            foreach (var pair in metrics.Chunk(2))
            {
                var heights = pair.Select(metric =>
                    {
                        var valueFontSize = ResolveMetricValueFontSize(metric.Value);
                        var valueLineHeight = valueFontSize + 2f;
                        var valueHeight = MeasureWrappedHeight(metric.Value, valueFontSize, valueLineHeight, cardWidth - 18f);
                        var detailHeight = MeasureWrappedHeight(metric.Detail, 8.8f, 11.5f, cardWidth - 18f);
                        return 32f + valueHeight + detailHeight;
                    })
                    .ToArray();
                var cardHeight = Math.Max(58f, heights.Max() + 14f);

                EnsureSpace(cardHeight + 8f);
                var yBottom = _currentY - cardHeight;
                for (var index = 0; index < pair.Length; index++)
                {
                    var card = pair[index];
                    var x = MarginLeft + index * (cardWidth + gap);
                    _currentPage.AddRect(x, yBottom, cardWidth, cardHeight, Surface, Border, 0.85f);
                    _currentPage.AddRect(x, yBottom + cardHeight - 16f, cardWidth, 16f, SurfaceMuted, null, 0f);
                    _currentPage.AddText(x + 9f, yBottom + cardHeight - 12f, "F2", 8.2f, TextMuted, card.Label.ToUpperInvariant());
                    var valueFontSize = ResolveMetricValueFontSize(card.Value);
                    var valueLineHeight = valueFontSize + 2f;
                    var valueTopY = yBottom + cardHeight - 33f;
                    AddWrappedText(card.Value, "F2", valueFontSize, valueLineHeight, x + 9f, valueTopY, cardWidth - 18f, TextStrong);
                    var detailTopY = valueTopY - MeasureWrappedHeight(card.Value, valueFontSize, valueLineHeight, cardWidth - 18f) - 2f;
                    AddWrappedText(card.Detail, "F1", 8.8f, 11.5f, x + 9f, detailTopY, cardWidth - 18f, TextMuted);
                }

                _currentY = yBottom - 8f;
            }
        }

        private void AddHighlightCards(IReadOnlyList<string> highlights)
        {
            foreach (var highlight in highlights)
            {
                var lineHeight = 12.5f;
                var textHeight = MeasureWrappedHeight(highlight, 9.3f, lineHeight, PageWidth - MarginLeft - MarginRight - 34f);
                var blockHeight = Math.Max(30f, textHeight + 12f);
                EnsureSpace(blockHeight + 6f);

                var yBottom = _currentY - blockHeight;
                _currentPage.AddRect(MarginLeft, yBottom, PageWidth - MarginLeft - MarginRight, blockHeight, SurfaceAlt, Border, 0.75f);
                _currentPage.AddRect(MarginLeft + 10f, yBottom + blockHeight - 18f, 8f, 8f, AccentWarm, null, 0f);
                AddWrappedText(highlight, "F1", 9.3f, lineHeight, MarginLeft + 24f, yBottom + blockHeight - 12f, PageWidth - MarginLeft - MarginRight - 34f, TextStrong);
                _currentY = yBottom - 6f;
            }
        }

        private void AddWrappedParagraph(string text, float fontSize, float lineHeight, PdfColor color)
        {
            AddWrappedText(text, "F1", fontSize, lineHeight, MarginLeft, _currentY, PageWidth - MarginLeft - MarginRight, color);
        }

        private void AddBlankLine(float height)
        {
            EnsureSpace(height);
            _currentY -= height;
        }

        private void AddWrappedText(string text, string font, float fontSize, float lineHeight, float x, float topY, float maxWidth, PdfColor color)
        {
            var lines = WrapText(text, fontSize, maxWidth);
            var y = topY;
            foreach (var line in lines)
            {
                EnsureSpace(lineHeight);
                _currentPage.AddText(x, y, font, fontSize, color, line);
                y -= lineHeight;
                _currentY = Math.Min(_currentY, y);
            }
        }

        private void EnsureSpace(float requiredHeight)
        {
            if (_currentY - requiredHeight < MarginBottom + 18f)
            {
                _pages.Add(_currentPage);
                _currentPage = new PdfPageContent();
                _currentY = PageHeight - MarginTop;
            }
        }

        private static float MeasureWrappedHeight(string? text, float fontSize, float lineHeight, float maxWidth)
            => WrapText(text, fontSize, maxWidth).Count * lineHeight;

        private static float ResolveMetricValueFontSize(string value)
            => value.Length switch
            {
                > 42 => 9.4f,
                > 28 => 11.2f,
                > 18 => 13.2f,
                _ => 16f,
            };

        private static IReadOnlyList<string> WrapText(string? text, float fontSize, float maxWidth)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return [string.Empty];
            }

            var paragraphs = text.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
            var lines = new List<string>();
            foreach (var paragraph in paragraphs)
            {
                if (string.IsNullOrWhiteSpace(paragraph))
                {
                    lines.Add(string.Empty);
                    continue;
                }

                var words = paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var current = new StringBuilder();
                foreach (var word in words)
                {
                    var candidate = current.Length == 0 ? word : $"{current} {word}";
                    if (EstimateWidth(candidate, fontSize) <= maxWidth)
                    {
                        current.Clear();
                        current.Append(candidate);
                        continue;
                    }

                    if (current.Length > 0)
                    {
                        lines.Add(current.ToString());
                    }

                    if (EstimateWidth(word, fontSize) <= maxWidth)
                    {
                        current.Clear();
                        current.Append(word);
                        continue;
                    }

                    foreach (var chunk in SplitLongWord(word, fontSize, maxWidth))
                    {
                        if (EstimateWidth(chunk, fontSize) <= maxWidth)
                        {
                            lines.Add(chunk);
                        }
                    }

                    current.Clear();
                }

                if (current.Length > 0)
                {
                    lines.Add(current.ToString());
                }
            }

            return lines.Count == 0 ? [string.Empty] : lines;
        }

        private static IEnumerable<string> SplitLongWord(string word, float fontSize, float maxWidth)
        {
            var start = 0;
            while (start < word.Length)
            {
                var length = 1;
                while (start + length <= word.Length && EstimateWidth(word.Substring(start, length), fontSize) <= maxWidth)
                {
                    length++;
                }

                var safeLength = Math.Max(1, length - 1);
                yield return word.Substring(start, safeLength);
                start += safeLength;
            }
        }

        private static float EstimateWidth(string text, float fontSize)
            => text.Length * fontSize * 0.5f;
    }

    private readonly record struct PdfColor(float R, float G, float B)
    {
        public string ToFillCommand()
            => string.Create(CultureInfo.InvariantCulture, $"{R:0.###} {G:0.###} {B:0.###} rg");

        public string ToStrokeCommand()
            => string.Create(CultureInfo.InvariantCulture, $"{R:0.###} {G:0.###} {B:0.###} RG");
    }

    private sealed class PdfPageContent
    {
        private readonly List<string> _commands = [];

        public void AddRect(float x, float y, float width, float height, PdfColor fill, PdfColor? stroke, float lineWidth)
        {
            var builder = new StringBuilder("q ");
            builder.Append(fill.ToFillCommand());
            builder.Append(' ');
            if (stroke is not null)
            {
                builder.Append(stroke.Value.ToStrokeCommand());
                builder.Append(' ');
                builder.Append(lineWidth.ToString("0.###", CultureInfo.InvariantCulture));
                builder.Append(" w ");
            }

            builder.Append(x.ToString("0.###", CultureInfo.InvariantCulture));
            builder.Append(' ');
            builder.Append(y.ToString("0.###", CultureInfo.InvariantCulture));
            builder.Append(' ');
            builder.Append(width.ToString("0.###", CultureInfo.InvariantCulture));
            builder.Append(' ');
            builder.Append(height.ToString("0.###", CultureInfo.InvariantCulture));
            builder.Append(" re ");
            builder.Append(stroke is null ? "f" : "B");
            builder.Append(" Q");
            _commands.Add(builder.ToString());
        }

        public void AddLine(float x, float y, float width, float lineWidth, PdfColor stroke)
        {
            _commands.Add(string.Create(
                CultureInfo.InvariantCulture,
                $"q {stroke.ToStrokeCommand()} {lineWidth:0.###} w {x:0.###} {y:0.###} m {(x + width):0.###} {y:0.###} l S Q"));
        }

        public void AddText(float x, float y, string font, float fontSize, PdfColor color, string text)
        {
            var escaped = text
                .Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("(", "\\(", StringComparison.Ordinal)
                .Replace(")", "\\)", StringComparison.Ordinal);

            _commands.Add(string.Create(
                CultureInfo.InvariantCulture,
                $"BT {color.ToFillCommand()} /{font} {fontSize:0.##} Tf {x:0.##} {y:0.##} Td ({escaped}) Tj ET"));
        }

        public string BuildContentStream()
            => string.Join(Environment.NewLine, _commands) + Environment.NewLine;
    }
}
