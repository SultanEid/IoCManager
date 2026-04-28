using System.Globalization;
using System.Net;
using System.Text.Json;
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
    private static readonly Regex MitreTechniqueRegex = new(@"\bT\d{4}(?:\.\d{3})?\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex UrlRegex = new(@"\b[a-z][a-z0-9+.-]*://\S+", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex WindowsPathRegex = new(@"(?:^|[\s""'])(?:[A-Za-z]:\\|\\\\)[^\s""']+", RegexOptions.Compiled);
    private static readonly Regex UnixPathRegex = new(@"(?:^|[\s""'])/(?:bin|boot|dev|etc|home|lib|opt|proc|root|sbin|tmp|usr|var)/[^\s""']+", RegexOptions.Compiled);
    private static readonly Regex RegistryPathRegex = new(@"\b(?:HKLM|HKCU|HKCR|HKU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER)\\[^\s""']+", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private const int ClassificationTextLimit = 8192;
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

        if (LegacyScanPipelineHelpers.CleanOrNull(painLevel) is null)
        {
            return await ListIocFindingsPageAsync(
                scannerFamily,
                targetId,
                severity,
                fromUtc,
                toUtc,
                q,
                boundedPage,
                boundedPageSize,
                cancellationToken);
        }

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

    private async Task<LegacyPipelineIocFindingListResponse> ListIocFindingsPageAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        string? q,
        int boundedPage,
        int boundedPageSize,
        CancellationToken cancellationToken)
    {
        var parsedTargetId = LegacyScanPipelineHelpers.ParseOptionalIntId(targetId, nameof(targetId));
        var fromDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(fromUtc);
        var toDate = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(toUtc);
        var normalizedFamily = string.IsNullOrWhiteSpace(scannerFamily)
            ? null
            : LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily).ToUpperInvariant();
        var normalizedSeverity = NormalizeFindingSeverity(LegacyScanPipelineHelpers.CleanOrNull(severity));
        var normalizedQuery = LegacyScanPipelineHelpers.CleanOrNull(q);

        if (fromDate.HasValue && toDate.HasValue && fromDate > toDate)
        {
            throw new ArgumentException("'fromUtc' must be less than or equal to 'toUtc'.");
        }

        var query = BuildIocFindingBaseQuery(normalizedFamily, fromDate, toDate, normalizedQuery);

        if (parsedTargetId.HasValue)
        {
            var targetIp = await _dbContext.Targets.AsNoTracking()
                .Where(item => item.TargetId == parsedTargetId.Value)
                .Select(item => item.IPAddress)
                .FirstOrDefaultAsync(cancellationToken);

            query = ApplyTargetFilter(query, parsedTargetId.Value, targetIp);
        }

        query = ApplySeverityFilter(query, normalizedSeverity);

        var totalCount = await query.CountAsync(cancellationToken);
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)boundedPageSize));
        var effectivePage = Math.Min(boundedPage, totalPages);
        var availableSeverities = await GetAvailableSeveritiesAsync(query, cancellationToken);

        var pageRows = await query
            .Include(item => item.ScanResult)
            .Include(item => item.YaraDetail)
            .Include(item => item.SigmaDetail)
            .Include(item => item.NetworkDetail)
            .OrderByDescending(item => item.TimestampUtc)
            .Skip((effectivePage - 1) * boundedPageSize)
            .Take(boundedPageSize)
            .ToArrayAsync(cancellationToken);

        var resolvedRows = await ResolveIocFindingRowsAsync(pageRows, cancellationToken);
        var pageItems = resolvedRows
            .OrderByDescending(row => row.Ioc.TimestampUtc)
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
            ToYaraDetailResponse(row.Ioc),
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

    private static LegacyPipelineIocFindingYaraDetailResponse? ToYaraDetailResponse(LegacyPipelineIocEntity ioc)
    {
        if (ioc.YaraDetail is null)
        {
            return null;
        }

        var fileHash = LegacyScanPipelineHelpers.CleanOrNull(ioc.YaraDetail.FileHash)
            ?? ExtractYaraFileHash(ioc.RawPayload);

        return new LegacyPipelineIocFindingYaraDetailResponse(ioc.YaraDetail.FilePath, fileHash);
    }

    internal static string? ExtractYaraFileHash(string? rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(rawPayload);
            var root = document.RootElement;
            return LegacyScanPipelineHelpers.CleanOrNull(
                LegacyScanPipelineHelpers.ReadJsonString(root, "file_hash")
                ?? LegacyScanPipelineHelpers.ReadJsonString(root, "fileHash")
                ?? LegacyScanPipelineHelpers.ReadJsonString(root, "sha256")
                ?? LegacyScanPipelineHelpers.ReadJsonString(root, "sha1")
                ?? LegacyScanPipelineHelpers.ReadJsonString(root, "md5")
                ?? LegacyScanPipelineHelpers.ReadJsonString(root, "hash"));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    internal static (string Value, string Kind) ResolveIndicator(LegacyPipelineIocEntity ioc)
    {
        if (string.Equals(ioc.ScannerType, "YARA", StringComparison.OrdinalIgnoreCase))
        {
            return (ioc.YaraDetail?.FilePath ?? ioc.RawPayload ?? ioc.RuleName, "file");
        }

        if (string.Equals(ioc.ScannerType, "SIGMA", StringComparison.OrdinalIgnoreCase))
        {
            if (LegacyScanPipelineHelpers.CleanOrNull(ioc.SigmaDetail?.CommandLine) is string commandLine)
            {
                return (commandLine, "event");
            }

            return (ioc.RawPayload ?? ioc.RuleName, "payload");
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

    private IQueryable<LegacyPipelineIocEntity> BuildIocFindingBaseQuery(
        string? normalizedFamily,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        string? normalizedQuery)
    {
        var query = _dbContext.Iocs
            .AsNoTracking()
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

        return query;
    }

    private static IQueryable<LegacyPipelineIocEntity> ApplyTargetFilter(
        IQueryable<LegacyPipelineIocEntity> query,
        int targetId,
        string? targetIp)
    {
        if (string.IsNullOrWhiteSpace(targetIp))
        {
            return query.Where(item => item.ScanResult != null && item.ScanResult.TargetId == targetId);
        }

        var historicalTargetSuffix = $"%@{targetIp}";
        return query.Where(item =>
            (item.ScanResult != null && item.ScanResult.TargetId == targetId)
            || item.TargetServer == targetIp
            || EF.Functions.Like(item.TargetServer, historicalTargetSuffix));
    }

    private static IQueryable<LegacyPipelineIocEntity> ApplySeverityFilter(
        IQueryable<LegacyPipelineIocEntity> query,
        string? normalizedSeverity)
    {
        if (normalizedSeverity is null)
        {
            return query;
        }

        return normalizedSeverity switch
        {
            "Critical" => ApplyKnownSeverityFilter(query, ["1", "critical", "severe", "veryhigh", "very high"]),
            "High" => ApplyKnownSeverityFilter(query, ["2", "high", "major"]),
            "Medium" => ApplyKnownSeverityFilter(query, ["3", "medium", "meduim", "moderate", "warning", "warn"]),
            "Low" => ApplyKnownSeverityFilter(query, ["4", "low", "minor", "informational", "info"]),
            "Unknown" => query.Where(item =>
                (item.SigmaDetail == null || item.SigmaDetail.Severity == null || item.SigmaDetail.Severity.Trim() == "" || item.SigmaDetail.Severity.Trim().ToLower() == "unknown")
                && (item.NetworkDetail == null || item.NetworkDetail.Severity == null || item.NetworkDetail.Severity.Trim() == "" || item.NetworkDetail.Severity.Trim().ToLower() == "unknown")),
            _ => query.Where(item =>
                (item.SigmaDetail != null && item.SigmaDetail.Severity != null && item.SigmaDetail.Severity.Trim().ToLower() == normalizedSeverity.ToLowerInvariant())
                || (item.NetworkDetail != null && item.NetworkDetail.Severity != null && item.NetworkDetail.Severity.Trim().ToLower() == normalizedSeverity.ToLowerInvariant()))
        };
    }

    private static IQueryable<LegacyPipelineIocEntity> ApplyKnownSeverityFilter(
        IQueryable<LegacyPipelineIocEntity> query,
        string[] rawSeverities)
        => query.Where(item =>
            (item.SigmaDetail != null && item.SigmaDetail.Severity != null && rawSeverities.Contains(item.SigmaDetail.Severity.Trim().ToLower()))
            || (item.NetworkDetail != null && item.NetworkDetail.Severity != null && rawSeverities.Contains(item.NetworkDetail.Severity.Trim().ToLower())));

    private async Task<string[]> GetAvailableSeveritiesAsync(
        IQueryable<LegacyPipelineIocEntity> query,
        CancellationToken cancellationToken)
    {
        var severityRows = await query
            .Select(item => new
            {
                SigmaSeverity = item.SigmaDetail == null ? null : item.SigmaDetail.Severity,
                NetworkSeverity = item.NetworkDetail == null ? null : item.NetworkDetail.Severity
            })
            .Distinct()
            .ToArrayAsync(cancellationToken);

        var severities = severityRows
            .Select(item => NormalizeFindingSeverity(item.SigmaSeverity) ?? NormalizeFindingSeverity(item.NetworkSeverity) ?? "Unknown")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return SeverityOrder
            .Where(severityValue => severities.Contains(severityValue, StringComparer.OrdinalIgnoreCase))
            .Concat(severities.Where(severityValue => !SeverityOrder.Contains(severityValue, StringComparer.OrdinalIgnoreCase)).Order(StringComparer.OrdinalIgnoreCase))
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

    internal static string ResolvePainLevel(LegacyPipelineIocEntity ioc, string indicatorValue, string indicatorKind)
    {
        var corpus = BuildClassificationCorpus(ioc, indicatorValue);

        if (HasExplicitHashIndicator(ioc, indicatorValue))
        {
            return "Hash";
        }

        if (HasExplicitIpIndicator(ioc, indicatorValue))
        {
            return "IP";
        }

        if (ShouldClassifyAsHostArtifact(ioc, corpus, indicatorValue, indicatorKind))
        {
            return "HostArtifact";
        }

        if (HasBareDomainIndicator(ioc, indicatorValue))
        {
            return "Domain";
        }

        if (ContainsKeyword(corpus, ToolKeywords))
        {
            return "Tool";
        }

        if (ShouldClassifyAsTtp(corpus))
        {
            return "Ttp";
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
                LimitClassificationText(ioc.RuleName),
                LimitClassificationText(indicatorValue),
                LimitClassificationText(ioc.RawPayload),
                LimitClassificationText(ioc.YaraDetail?.FilePath),
                LimitClassificationText(ioc.YaraDetail?.FileHash),
                LimitClassificationText(ioc.SigmaDetail?.CommandLine),
                LimitClassificationText(ioc.SigmaDetail?.LogSource),
                LimitClassificationText(ioc.NetworkDetail?.SourceIP),
                LimitClassificationText(ioc.NetworkDetail?.DestIP),
                LimitClassificationText(ioc.NetworkDetail?.Protocol),
            }.Where(value => !string.IsNullOrWhiteSpace(value)))
            .ToLowerInvariant();

    private static bool ShouldClassifyAsTtp(string corpus)
        => ContainsKeyword(corpus, TtpKeywords) || MitreTechniqueRegex.IsMatch(corpus);

    private static bool ShouldClassifyAsHostArtifact(
        LegacyPipelineIocEntity ioc,
        string corpus,
        string indicatorValue,
        string indicatorKind)
        => string.Equals(indicatorKind, "file", StringComparison.OrdinalIgnoreCase)
            || string.Equals(indicatorKind, "event", StringComparison.OrdinalIgnoreCase)
            || ContainsUrl(indicatorValue)
            || ContainsPathLikeArtifact(indicatorValue)
            || ContainsPathLikeArtifact(corpus)
            || (ioc.NetworkDetail?.Protocol is not null)
            || (ioc.SigmaDetail?.CommandLine is not null)
            || (ioc.YaraDetail?.FilePath is not null);

    private static bool HasExplicitHashIndicator(LegacyPipelineIocEntity ioc, string indicatorValue)
        => ContainsHash(ioc.YaraDetail?.FileHash)
            || IsStandaloneHash(indicatorValue)
            || IsStandaloneHash(LimitClassificationText(ioc.RawPayload));

    private static bool HasExplicitIpIndicator(LegacyPipelineIocEntity ioc, string indicatorValue)
        => HasIpAddress(ioc.NetworkDetail?.SourceIP)
            || HasIpAddress(ioc.NetworkDetail?.DestIP)
            || IsStandaloneIp(indicatorValue)
            || IsStandaloneIp(LimitClassificationText(ioc.RawPayload));

    private static bool HasBareDomainIndicator(LegacyPipelineIocEntity ioc, string indicatorValue)
        => ContainsBareDomain(indicatorValue) || ContainsBareDomain(LimitClassificationText(ioc.RawPayload));

    private static string? LimitClassificationText(string? value)
        => string.IsNullOrEmpty(value) || value.Length <= ClassificationTextLimit
            ? value
            : value[..ClassificationTextLimit];

    private static bool ContainsHash(string? value)
        => !string.IsNullOrWhiteSpace(value) && HashRegex.IsMatch(value);

    private static bool ContainsBareDomain(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || ContainsUrl(value) || ContainsPathLikeArtifact(value))
        {
            return false;
        }

        return ExtractTokens(value.ToLowerInvariant())
            .Where(token => !HasIpAddress(token))
            .Any(IsBareDomainToken);
    }

    private static bool IsBareDomainToken(string token)
        => DomainRegex.IsMatch(token)
            && !IsLikelyFileName(token)
            && !token.Contains("..", StringComparison.Ordinal);

    private static bool IsLikelyFileName(string token)
        => token.EndsWith(".log", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".ps1", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".bat", StringComparison.OrdinalIgnoreCase)
            || token.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase);

    private static bool IsStandaloneHash(string? value)
        => !string.IsNullOrWhiteSpace(value) && HashRegex.Match(value.Trim()) is { Success: true } match && match.Value.Length == value.Trim().Length;

    private static bool IsStandaloneIp(string? value)
        => !string.IsNullOrWhiteSpace(value) && HasIpAddress(value.Trim());

    private static bool ContainsUrl(string value)
        => UrlRegex.IsMatch(value);

    private static bool ContainsPathLikeArtifact(string value)
        => WindowsPathRegex.IsMatch(value)
            || UnixPathRegex.IsMatch(value)
            || RegistryPathRegex.IsMatch(value);

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
