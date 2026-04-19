using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private static readonly string[] SeverityOrder = ["Low", "Medium", "High", "Critical", "Unknown"];
    private static readonly string[] PainLevelDisplayOrder = ["Ttp", "Tool", "HostArtifact", "Domain", "IP", "Hash"];
    private static readonly Regex HashRegex = new(@"\b(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})\b", RegexOptions.Compiled);
    private static readonly Regex DomainRegex = new(@"\b(?=.{4,253}\b)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}\b", RegexOptions.Compiled);
    private static readonly string[] ToolKeywords =
    [
        "mimikatz",
        "cobalt strike",
        "metasploit",
        "psexec",
        "wmic",
        "powershell",
        "pwsh",
        "rundll32",
        "regsvr32",
        "mshta",
        "bitsadmin",
        "certutil",
        "netcat",
        "nc.exe",
        "curl",
        "wget",
        "empire",
        "bloodhound",
        "sharphound",
        "adfind",
        "nmap",
        "socat"
    ];
    private static readonly string[] TtpKeywords =
    [
        "credential access",
        "defense evasion",
        "lateral movement",
        "persistence",
        "execution",
        "discovery",
        "reconnaissance",
        "collection",
        "exfiltration",
        "command and control",
        "c2",
        "technique",
        "tactic",
        "suspicious",
        "encodedcommand",
        "encoded command",
        "wmi",
        "shadow copy",
        "shadowcopy",
        "scheduled task",
        "service creation",
        "remote thread",
        "registry run key",
        "startup folder",
        "injection"
    ];

    public async Task<LegacyPipelineIocFindingListResponse> ListIocFindingsAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        string? q,
        string? painLevel,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken)
    {
        var boundedPage = Math.Max(page ?? 1, 1);
        var boundedPageSize = Math.Clamp(pageSize ?? 100, 25, 250);
        var filteredRows = await GetFilteredIocFindingRowsAsync(scannerFamily, targetId, severity, fromUtc, toUtc, q, painLevel, cancellationToken);

        var totalCount = filteredRows.Length;
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)boundedPageSize));
        var effectivePage = Math.Min(boundedPage, totalPages);
        var availableSeverities = SeverityOrder
            .Where(severityValue => filteredRows.Any(row => string.Equals(row.Severity, severityValue, StringComparison.OrdinalIgnoreCase)))
            .ToArray();
        var pageItems = filteredRows
            .Skip((effectivePage - 1) * boundedPageSize)
            .Take(boundedPageSize)
            .Select(ToIocFindingResponse)
            .ToArray();

        return new LegacyPipelineIocFindingListResponse(
            pageItems,
            totalCount,
            effectivePage,
            boundedPageSize,
            availableSeverities);
    }

    public async Task<LegacyPipelineIocFindingDetailResponse?> GetIocFindingDetailAsync(string iocId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(iocId, out var parsedIocId))
        {
            throw new ArgumentException($"'{nameof(iocId)}' must be a valid guid.", nameof(iocId));
        }

        var ioc = await _dbContext.Iocs
            .AsNoTracking()
            .Include(item => item.ScanResult)
            .Include(item => item.YaraDetail)
            .Include(item => item.SigmaDetail)
            .Include(item => item.NetworkDetail)
            .FirstOrDefaultAsync(item => item.Id == parsedIocId, cancellationToken);

        if (ioc is null)
        {
            return null;
        }

        var resolvedRow = (await ResolveIocFindingRowsAsync([ioc], cancellationToken)).First();
        return ToIocFindingDetailResponse(resolvedRow);
    }

    private async Task<IReadOnlyList<LegacyPipelineResolvedIocFindingRow>> ResolveIocFindingRowsAsync(
        IReadOnlyCollection<LegacyPipelineIocEntity> iocRows,
        CancellationToken cancellationToken)
    {
        if (iocRows.Count == 0)
        {
            return [];
        }

        var targetIds = iocRows
            .Select(item => item.ScanResult?.TargetId)
            .Where(value => value.HasValue)
            .Select(value => value!.Value)
            .Distinct()
            .ToArray();
        var historicalIps = iocRows
            .Select(item => LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(item.TargetServer))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var jobIds = iocRows
            .Select(item => item.ScanResult?.JobId)
            .Where(value => value.HasValue)
            .Select(value => value!.Value)
            .Distinct()
            .ToArray();

        var targetsById = targetIds.Length == 0
            ? new Dictionary<int, LegacyPipelineTargetEntity>()
            : await _dbContext.Targets.AsNoTracking()
                .Where(item => targetIds.Contains(item.TargetId))
                .ToDictionaryAsync(item => item.TargetId, cancellationToken);
        var targetsByIp = historicalIps.Length == 0
            ? new Dictionary<string, LegacyPipelineTargetEntity>(StringComparer.OrdinalIgnoreCase)
            : await _dbContext.Targets.AsNoTracking()
                .Where(item => historicalIps.Contains(item.IPAddress) && !LegacyScanPipelineHelpers.ExcludedTargetAddresses.Contains(item.IPAddress))
                .ToDictionaryAsync(item => item.IPAddress, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var jobsById = jobIds.Length == 0
            ? new Dictionary<int, LegacyPipelineScanJobEntity>()
            : await _dbContext.ScanJobs.AsNoTracking()
                .Where(item => jobIds.Contains(item.JobId))
                .ToDictionaryAsync(item => item.JobId, cancellationToken);

        return iocRows
            .Select(ioc =>
            {
                var result = ioc.ScanResult;
                LegacyPipelineTargetEntity? resolvedTarget = null;

                if (result?.TargetId is int linkedTargetId && targetsById.TryGetValue(linkedTargetId, out var target))
                {
                    resolvedTarget = target;
                }
                else
                {
                    var historicalIp = LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(ioc.TargetServer);
                    if (!string.IsNullOrWhiteSpace(historicalIp) && targetsByIp.TryGetValue(historicalIp, out var fallbackTarget))
                    {
                        resolvedTarget = fallbackTarget;
                    }
                }

                var job = result?.JobId is int jobId && jobsById.TryGetValue(jobId, out var scanJob)
                    ? scanJob
                    : null;
                var (indicatorValue, indicatorKind) = ResolveIndicator(ioc);
                var targetDisplay = resolvedTarget is not null
                    ? LegacyScanPipelineHelpers.BuildTargetDisplay(resolvedTarget)
                    : ResolveHistoricalTargetDisplay(ioc.TargetServer);

                return new LegacyPipelineResolvedIocFindingRow(
                    ioc,
                    resolvedTarget,
                    resolvedTarget?.TargetId,
                    result,
                    job,
                    targetDisplay,
                    indicatorValue,
                    indicatorKind,
                    ResolvePainLevel(ioc, indicatorValue, indicatorKind),
                    ResolveSeverity(ioc));
            })
            .ToArray();
    }

    private static LegacyPipelineIocFindingResponse ToIocFindingResponse(LegacyPipelineResolvedIocFindingRow row)
        => new(
            row.Ioc.Id.ToString(),
            row.Ioc.ScannerType,
            row.EffectiveTargetId?.ToString(CultureInfo.InvariantCulture),
            row.TargetDisplay,
            row.ResolvedTarget?.IPAddress ?? LegacyScanPipelineHelpers.CleanOrNull(LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(row.Ioc.TargetServer)),
            LegacyScanPipelineHelpers.CleanOrNull(row.ResolvedTarget?.TargetOsType ?? row.Ioc.TargetOsType),
            row.ScanResult?.JobId?.ToString(CultureInfo.InvariantCulture),
            row.ScanJob?.PlanId?.ToString(CultureInfo.InvariantCulture),
            row.Ioc.RuleName,
            row.IndicatorValue,
            row.IndicatorKind,
            row.PainLevel,
            row.Severity,
            new DateTimeOffset(DateTime.SpecifyKind(row.Ioc.TimestampUtc, DateTimeKind.Utc)),
            row.Ioc.RawPayload,
            row.ScanResult?.Status ?? "Unknown");

    private LegacyPipelineIocFindingDetailResponse ToIocFindingDetailResponse(LegacyPipelineResolvedIocFindingRow row)
    {
        var scope = row.ScanJob is null
            ? null
            : LegacyScanPipelineSerializer.DeserializeExecutionScope(row.ScanJob.ExecutionScopeJson);
        var executionMode = row.ScanJob is null
            ? null
            : LegacyScanPipelineHelpers.ResolveExecutionMode(row.Ioc.ScannerType, scope?.Options);

        return new LegacyPipelineIocFindingDetailResponse(
            row.Ioc.Id.ToString(),
            row.Ioc.ScannerType,
            row.EffectiveTargetId?.ToString(CultureInfo.InvariantCulture),
            row.TargetDisplay,
            row.ResolvedTarget?.IPAddress ?? LegacyScanPipelineHelpers.CleanOrNull(LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(row.Ioc.TargetServer)),
            LegacyScanPipelineHelpers.CleanOrNull(row.ResolvedTarget?.TargetOsType ?? row.Ioc.TargetOsType),
            row.ScanResult?.JobId?.ToString(CultureInfo.InvariantCulture),
            row.ScanJob?.PlanId?.ToString(CultureInfo.InvariantCulture),
            row.Ioc.RuleName,
            row.IndicatorValue,
            row.IndicatorKind,
            row.PainLevel,
            row.Severity,
            new DateTimeOffset(DateTime.SpecifyKind(row.Ioc.TimestampUtc, DateTimeKind.Utc)),
            row.Ioc.RawPayload,
            row.ScanResult?.Status ?? "Unknown",
            row.ResolvedTarget is null
                ? null
                : new LegacyPipelineIocFindingTargetResponse(
                    row.ResolvedTarget.TargetId.ToString(CultureInfo.InvariantCulture),
                    row.TargetDisplay,
                    LegacyScanPipelineHelpers.CleanOrNull(row.ResolvedTarget.HostName),
                    row.ResolvedTarget.IPAddress,
                    LegacyScanPipelineHelpers.CleanOrNull(row.ResolvedTarget.Status),
                    LegacyScanPipelineHelpers.CleanOrNull(row.ResolvedTarget.TargetOsType)),
            row.ScanJob is null
                ? null
                : new LegacyPipelineIocFindingScanResponse(
                    row.ScanJob.JobId.ToString(CultureInfo.InvariantCulture),
                    row.ScanJob.PlanId?.ToString(CultureInfo.InvariantCulture),
                    row.Ioc.ScannerType,
                    executionMode,
                    LegacyScanPipelineHelpers.CleanOrNull(row.ScanJob.TriggerType),
                    row.ScanJob.Status ?? row.ScanResult?.Status ?? "Unknown",
                    LegacyScanPipelineHelpers.ToDateTimeOffset(row.ScanJob.QueuedAt),
                    row.ScanResult is not null
                        ? LegacyScanPipelineHelpers.ToDateTimeOffset(row.ScanResult.StartedAt)
                        : LegacyScanPipelineHelpers.ToDateTimeOffset(row.ScanJob.StartedAt),
                    row.ScanResult is not null
                        ? LegacyScanPipelineHelpers.ToDateTimeOffset(row.ScanResult.FinishedAt)
                        : LegacyScanPipelineHelpers.ToDateTimeOffset(row.ScanJob.FinishedAt)),
            row.Ioc.YaraDetail is null
                ? null
                : new LegacyPipelineIocFindingYaraDetailResponse(row.Ioc.YaraDetail.FilePath, row.Ioc.YaraDetail.FileHash),
            row.Ioc.SigmaDetail is null
                ? null
                : new LegacyPipelineIocFindingSigmaDetailResponse(
                    row.Ioc.SigmaDetail.LogSource,
                    NormalizeFindingSeverity(row.Ioc.SigmaDetail.Severity),
                    row.Ioc.SigmaDetail.CommandLine),
            row.Ioc.NetworkDetail is null
                ? null
                : new LegacyPipelineIocFindingNetworkDetailResponse(
                    row.Ioc.NetworkDetail.SourceIP,
                    row.Ioc.NetworkDetail.DestIP,
                    row.Ioc.NetworkDetail.Protocol,
                    NormalizeFindingSeverity(row.Ioc.NetworkDetail.Severity),
                    row.Ioc.NetworkDetail.FlowId));
    }

    private static (string Value, string Kind) ResolveIndicator(LegacyPipelineIocEntity ioc)
    {
        if (string.Equals(ioc.ScannerType, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return (ioc.YaraDetail?.FilePath ?? ioc.RawPayload ?? ioc.RuleName, "file");
        }

        if (string.Equals(ioc.ScannerType, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            return (ioc.SigmaDetail?.CommandLine ?? ioc.RawPayload ?? ioc.RuleName, "event");
        }

        if (ioc.NetworkDetail is not null)
        {
            var sourceIp = LegacyScanPipelineHelpers.CleanOrNull(ioc.NetworkDetail.SourceIP);
            var destIp = LegacyScanPipelineHelpers.CleanOrNull(ioc.NetworkDetail.DestIP);
            if (sourceIp is not null || destIp is not null)
            {
                return ($"{sourceIp ?? "?"} -> {destIp ?? "?"}", "network");
            }
        }

        return (ioc.RawPayload ?? ioc.RuleName, "payload");
    }

    private static string ResolveSeverity(LegacyPipelineIocEntity ioc)
        => NormalizeFindingSeverity(ioc.SigmaDetail?.Severity)
            ?? NormalizeFindingSeverity(ioc.NetworkDetail?.Severity)
            ?? "Unknown";

    private async Task<LegacyPipelineResolvedIocFindingRow[]> GetFilteredIocFindingRowsAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        string? q,
        string? painLevel,
        CancellationToken cancellationToken)
    {
        var parsedTargetId = LegacyScanPipelineHelpers.ParseOptionalIntId(targetId, nameof(targetId));
        var fromDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(fromUtc);
        var toDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(toUtc);
        var normalizedFamily = string.IsNullOrWhiteSpace(scannerFamily)
            ? null
            : LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily).ToUpperInvariant();
        var normalizedSeverity = NormalizeFindingSeverity(LegacyScanPipelineHelpers.CleanOrNull(severity));
        var normalizedPainLevel = NormalizePainLevel(painLevel);
        var normalizedQuery = LegacyScanPipelineHelpers.CleanOrNull(q);

        if (fromDate.HasValue && toDate.HasValue && fromDate > toDate)
        {
            throw new ArgumentException("'fromUtc' must be less than or equal to 'toUtc'.");
        }

        var query = _dbContext.Iocs
            .AsNoTracking()
            .Include(item => item.ScanResult)
            .Include(item => item.YaraDetail)
            .Include(item => item.SigmaDetail)
            .Include(item => item.NetworkDetail)
            .AsQueryable();

        if (normalizedFamily is not null)
        {
            query = query.Where(item => item.ScannerType == normalizedFamily);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(item => item.TimestampUtc >= fromDate.Value.UtcDateTime);
        }

        if (toDate.HasValue)
        {
            query = query.Where(item => item.TimestampUtc <= toDate.Value.UtcDateTime);
        }

        if (normalizedQuery is not null)
        {
            var pattern = $"%{normalizedQuery}%";
            query = query.Where(item =>
                EF.Functions.Like(item.RuleName, pattern)
                || (item.RawPayload != null && EF.Functions.Like(item.RawPayload, pattern))
                || EF.Functions.Like(item.TargetServer, pattern)
                || (item.YaraDetail != null && EF.Functions.Like(item.YaraDetail.FilePath, pattern))
                || (item.YaraDetail != null && item.YaraDetail.FileHash != null && EF.Functions.Like(item.YaraDetail.FileHash, pattern))
                || (item.SigmaDetail != null && (
                    (item.SigmaDetail.CommandLine != null && EF.Functions.Like(item.SigmaDetail.CommandLine, pattern))
                    || (item.SigmaDetail.LogSource != null && EF.Functions.Like(item.SigmaDetail.LogSource, pattern))))
                || (item.NetworkDetail != null && (
                    (item.NetworkDetail.SourceIP != null && EF.Functions.Like(item.NetworkDetail.SourceIP, pattern))
                    || (item.NetworkDetail.DestIP != null && EF.Functions.Like(item.NetworkDetail.DestIP, pattern))
                    || (item.NetworkDetail.Protocol != null && EF.Functions.Like(item.NetworkDetail.Protocol, pattern)))));
        }

        var iocRows = await query
            .OrderByDescending(item => item.TimestampUtc)
            .ToArrayAsync(cancellationToken);

        var resolvedRows = await ResolveIocFindingRowsAsync(iocRows, cancellationToken);

        return resolvedRows
            .Where(row => !parsedTargetId.HasValue || row.EffectiveTargetId == parsedTargetId.Value)
            .Where(row => normalizedSeverity is null || string.Equals(row.Severity, normalizedSeverity, StringComparison.OrdinalIgnoreCase))
            .Where(row => normalizedPainLevel is null || string.Equals(row.PainLevel, normalizedPainLevel, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(row => row.Ioc.TimestampUtc)
            .ToArray();
    }

    internal static string[] GetPainLevelDisplayOrder()
        => PainLevelDisplayOrder;

    internal static string GetPainLevelLabel(string painLevel)
        => painLevel switch
        {
            "HostArtifact" => "Host / Network Artifact",
            "Ttp" => "TTP",
            _ => painLevel
        };

    private static string ResolvePainLevel(LegacyPipelineIocEntity ioc, string indicatorValue, string indicatorKind)
    {
        var corpus = BuildClassificationCorpus(ioc, indicatorValue);

        if (ShouldClassifyAsTtp(ioc, corpus, indicatorKind))
        {
            return "Ttp";
        }

        if (ContainsKeyword(corpus, ToolKeywords))
        {
            return "Tool";
        }

        if (ShouldClassifyAsHostArtifact(ioc, corpus, indicatorKind))
        {
            return "HostArtifact";
        }

        if (ContainsDomain(corpus))
        {
            return "Domain";
        }

        if (ShouldClassifyAsIp(ioc, corpus))
        {
            return "IP";
        }

        if (ContainsHash(corpus))
        {
            return "Hash";
        }

        return "HostArtifact";
    }

    private static string? NormalizePainLevel(string? value)
    {
        var cleaned = LegacyScanPipelineHelpers.CleanOrNull(value);
        if (cleaned is null)
        {
            return null;
        }

        return cleaned.Trim().ToLowerInvariant().Replace(" ", string.Empty).Replace("-", string.Empty).Replace("_", string.Empty) switch
        {
            "hash" => "Hash",
            "ip" => "IP",
            "domain" => "Domain",
            "hostartifact" => "HostArtifact",
            "hostnetworkartifact" => "HostArtifact",
            "artifact" => "HostArtifact",
            "tool" => "Tool",
            "ttp" => "Ttp",
            _ => throw new ArgumentException($"Unsupported painLevel '{value}'.", nameof(value))
        };
    }

    private static string? NormalizeFindingSeverity(string? value)
    {
        var cleaned = LegacyScanPipelineHelpers.CleanOrNull(value);
        if (cleaned is null)
        {
            return null;
        }

        return cleaned.Trim().ToLowerInvariant() switch
        {
            "1" => "Critical",
            "2" => "High",
            "3" => "Medium",
            "4" => "Low",
            "critical" => "Critical",
            "severe" => "Critical",
            "veryhigh" => "Critical",
            "very high" => "Critical",
            "high" => "High",
            "major" => "High",
            "medium" => "Medium",
            "meduim" => "Medium",
            "moderate" => "Medium",
            "warning" => "Medium",
            "warn" => "Medium",
            "low" => "Low",
            "minor" => "Low",
            "informational" => "Low",
            "info" => "Low",
            "unknown" => "Unknown",
            _ => ToTitleCaseSeverity(cleaned)
        };
    }

    private static string ToTitleCaseSeverity(string value)
    {
        var lowered = value.ToLowerInvariant();
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(lowered);
    }

    private static string BuildClassificationCorpus(LegacyPipelineIocEntity ioc, string indicatorValue)
        => string.Join(
            "\n",
            new[]
            {
                ioc.RuleName,
                indicatorValue,
                ioc.RawPayload,
                ioc.YaraDetail?.FilePath,
                ioc.YaraDetail?.FileHash,
                ioc.SigmaDetail?.CommandLine,
                ioc.SigmaDetail?.LogSource,
                ioc.NetworkDetail?.SourceIP,
                ioc.NetworkDetail?.DestIP,
                ioc.NetworkDetail?.Protocol,
            }.Where(value => !string.IsNullOrWhiteSpace(value)))
            .ToLowerInvariant();

    private static bool ShouldClassifyAsTtp(LegacyPipelineIocEntity ioc, string corpus, string indicatorKind)
        => string.Equals(ioc.ScannerType, "SIGMA", StringComparison.OrdinalIgnoreCase)
            || ContainsKeyword(corpus, TtpKeywords)
            || (string.Equals(indicatorKind, "event", StringComparison.OrdinalIgnoreCase) && corpus.Contains("process", StringComparison.Ordinal));

    private static bool ShouldClassifyAsHostArtifact(LegacyPipelineIocEntity ioc, string corpus, string indicatorKind)
        => string.Equals(indicatorKind, "file", StringComparison.OrdinalIgnoreCase)
            || string.Equals(indicatorKind, "event", StringComparison.OrdinalIgnoreCase)
            || corpus.Contains(@":\", StringComparison.Ordinal)
            || corpus.Contains("/", StringComparison.Ordinal)
            || (ioc.NetworkDetail?.Protocol is not null)
            || (ioc.SigmaDetail?.CommandLine is not null)
            || (ioc.YaraDetail?.FilePath is not null);

    private static bool ShouldClassifyAsIp(LegacyPipelineIocEntity ioc, string corpus)
    {
        if (HasIpAddress(ioc.NetworkDetail?.SourceIP) || HasIpAddress(ioc.NetworkDetail?.DestIP))
        {
            return true;
        }

        return ExtractTokens(corpus).Any(HasIpAddress);
    }

    private static bool ContainsHash(string corpus)
        => HashRegex.IsMatch(corpus);

    private static bool ContainsDomain(string corpus)
        => ExtractTokens(corpus)
            .Where(token => !HasIpAddress(token))
            .Any(token => DomainRegex.IsMatch(token) && !token.EndsWith(".log", StringComparison.OrdinalIgnoreCase));

    private static bool ContainsKeyword(string corpus, IReadOnlyList<string> keywords)
        => keywords.Any(keyword => corpus.Contains(keyword, StringComparison.Ordinal));

    private static bool HasIpAddress(string? value)
        => !string.IsNullOrWhiteSpace(value) && IPAddress.TryParse(value, out _);

    private static IEnumerable<string> ExtractTokens(string corpus)
        => corpus
            .Split([' ', '\r', '\n', '\t', ',', ';', '(', ')', '[', ']', '{', '}', '"', '\''], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => token.Trim('.', ':', '/', '\\'));

    private static string ResolveHistoricalTargetDisplay(string? rawTargetServer)
    {
        var normalized = LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(rawTargetServer);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "Unknown legacy target";
        }

        if (LegacyScanPipelineHelpers.HardcodedTargetDisplayNames.TryGetValue(normalized, out var displayName))
        {
            return $"{displayName} ({normalized})";
        }

        return normalized;
    }
}
