using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;

namespace Backend.Api.Infrastructure;

internal sealed record LegacyPipelineScanPlanConfig(
    string? ScannerFamily,
    string RuleInputMode,
    string? RulePath,
    Dictionary<string, string?> Options,
    List<string>? ScannerFamilies = null,
    Dictionary<string, string?>? RulePathsByFamily = null);

internal sealed record LegacyPipelineTargetScope(
    string SelectionMode,
    List<int> NetworkIds,
    List<int> TargetIds);

internal sealed record LegacyPipelineSchedule(
    string Type,
    Dictionary<string, string?> Values);

internal sealed record LegacyPipelineExecutionScope(
    string ScannerFamily,
    string RuleInputMode,
    string? RulePath,
    string? StagedRulePath,
    string? TempDirectory,
    List<int> NetworkIds,
    List<int> TargetIds,
    Dictionary<string, string?> Options);

internal sealed record LegacyPipelinePersistedIoc(
    Guid Id,
    DateTimeOffset TimestampUtc,
    string ScannerType,
    string TargetServer,
    string? TargetOsType,
    string RuleName,
    string RawPayload,
    LegacyPipelinePersistedYaraDetail? YaraDetail,
    LegacyPipelinePersistedSigmaDetail? SigmaDetail,
    LegacyPipelinePersistedNetworkDetail? NetworkDetail);

internal sealed record LegacyPipelinePersistedYaraDetail(string FilePath, string? FileHash);
internal sealed record LegacyPipelinePersistedSigmaDetail(string? LogSource, string? Severity, string? CommandLine);
internal sealed record LegacyPipelinePersistedNetworkDetail(string? SourceIp, string? DestIp, string? Protocol, string? Severity, long? FlowId);
internal sealed record LegacyPipelineTargetExecutionOutput(
    string Status,
    string Summary,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    IReadOnlyList<LegacyPipelinePersistedIoc> Iocs);

internal sealed record LegacyPipelineResolvedTargetOs(
    LegacyPipelineTargetEntity Target,
    string EffectiveOs,
    bool UsedOverride);

internal sealed record LegacyPipelineSigmaRuleValidationState(
    bool HasTitle,
    bool HasDetection,
    bool HasSelection,
    bool HasKeywords);

internal sealed record LegacyPipelineSnortQuarantineTargetCapture(
    int TargetId,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string StandardOutput,
    string? FailureSummary);

internal sealed record LegacyPipelineSnortQuarantineSessionDefinition(
    int JobId,
    string ScriptPath,
    string RulePath,
    int DurationMinutes,
    IReadOnlyList<LegacyPipelineTargetEntity> Targets);

internal sealed record LegacyPipelineSuricataQuarantineTargetCapture(
    int TargetId,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string StandardOutput,
    string? FailureSummary);

internal sealed record LegacyPipelineSuricataQuarantineSessionDefinition(
    int JobId,
    string ScriptPath,
    string RulePath,
    int DurationMinutes,
    IReadOnlyList<LegacyPipelineTargetEntity> Targets);

public sealed record LegacyPipelineDownloadResult(string ContentType, string FileName, string FilePath);

internal static class LegacyScanPipelineSerializer
{
    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static LegacyPipelineScanPlanConfig? DeserializePlanConfig(string? json)
        => string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<LegacyPipelineScanPlanConfig>(json, JsonOptions);

    public static LegacyPipelineTargetScope? DeserializeTargetScope(string? json)
        => string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<LegacyPipelineTargetScope>(json, JsonOptions);

    public static LegacyPipelineSchedule? DeserializeSchedule(string? json)
        => string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<LegacyPipelineSchedule>(json, JsonOptions);

    public static LegacyPipelineExecutionScope? DeserializeExecutionScope(string? json)
        => string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<LegacyPipelineExecutionScope>(json, JsonOptions);
}

internal static class LegacyScanPipelineHelpers
{
    private static readonly Regex SigmaTitleRegex = new(@"^\s*title\s*:\s*.+$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SigmaDetectionRegex = new(@"^\s*detection\s*:\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SigmaSelectionRegex = new(@"^\s*selection\s*:\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SigmaKeywordsRegex = new(@"^\s*keywords\s*:\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SnortRuleLineRegex = new(@"^\s*(alert|drop|reject)\s+\w+\s+.+\(\s*.*sid\s*:\s*\d+\s*;.*\)\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public const string TargetOsOverrideOptionPrefix = "__targetOsOverride:";
    public const string SnortModeOptionKey = "snortMode";
    public const string SuricataModeOptionKey = "suricataMode";
    public const string StagedPcapPathOptionKey = "__stagedPcapPath";
    public const string FamilyScopedOptionSeparator = ".";

    public static readonly string[] ExcludedTargetAddresses =
    [
        "172.165.50.128",
        "172.165.50.134",
    ];

    public static readonly IReadOnlyDictionary<string, string> HardcodedTargetDisplayNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["172.165.50.130"] = "WIN-SRV01",
            ["172.165.50.131"] = "WIN-SRV02",
            ["172.165.50.132"] = "LINUX-SRV01",
        };

    public static readonly IReadOnlySet<string> ExcludedTargetAddressSet = new HashSet<string>(ExcludedTargetAddresses, StringComparer.OrdinalIgnoreCase)
    {
    };

    public static readonly IReadOnlyDictionary<string, string[]> AllowedRuleExtensions =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["yara"] = [".yar", ".yara"],
            ["sigma"] = [".yml", ".yaml"],
            ["snort"] = [".rules"],
            ["suricata"] = [".rules", ".sur", ".suricata"],
        };

    public static readonly string[] AllowedPcapExtensions = [".pcap", ".pcapng"];

    public static string NormalizeScannerFamily(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "yara" or "sigma" or "snort" or "suricata" => normalized,
            _ => throw new ArgumentException($"Unsupported scanner family '{value}'."),
        };
    }

    public static string NormalizePlanStatus(string? value)
    {
        var normalized = (value ?? "Draft").Trim().ToLowerInvariant();
        return normalized switch
        {
            "draft" => "Draft",
            "active" => "Active",
            "paused" => "Paused",
            _ => throw new ArgumentException($"Unsupported plan status '{value}'."),
        };
    }

    public static string NormalizeScheduleType(string? value)
    {
        var normalized = (value ?? "Manual").Trim().ToLowerInvariant();
        return normalized switch
        {
            "manual" => "Manual",
            "interval" => "Interval",
            "daily" => "Daily",
            "weekly" => "Weekly",
            _ => throw new ArgumentException($"Unsupported schedule type '{value}'."),
        };
    }

    public static string NormalizeRuleInputMode(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "hostpath" => "hostPath",
            "upload" => "upload",
            _ => throw new ArgumentException("Rule input mode must be 'hostPath' or 'upload'."),
        };
    }

    public static string NormalizeSnortMode(string? value)
    {
        var normalized = (value ?? "hunt").Trim().ToLowerInvariant();
        return normalized switch
        {
            "hunt" => "hunt",
            "quarantine" => "quarantine",
            "pcap" => "pcap",
            _ => throw new ArgumentException("Snort mode must be 'hunt', 'quarantine', or 'pcap'."),
        };
    }

    public static string NormalizeSuricataMode(string? value)
    {
        var normalized = (value ?? "hunt").Trim().ToLowerInvariant();
        return normalized switch
        {
            "hunt" => "hunt",
            "quarantine" => "quarantine",
            "pcap" => "pcap",
            _ => throw new ArgumentException("Suricata mode must be 'hunt', 'quarantine', or 'pcap'."),
        };
    }

    public static string NormalizeReportType(string value)
    {
        var normalized = value.Trim();
        return normalized switch
        {
            "ExecutiveSummary" or "DetailedIocReport" or "TargetExposureSummary" or "ScanActivitySummary" => normalized,
            _ => throw new ArgumentException($"Unsupported report type '{value}'."),
        };
    }

    public static string GetReportTypeDisplayName(string value)
        => NormalizeReportType(value) switch
        {
            "ExecutiveSummary" => "Executive Summary",
            "DetailedIocReport" => "Detailed IOC Report",
            "TargetExposureSummary" => "Target Exposure Summary",
            "ScanActivitySummary" => "Scan Activity Summary",
            _ => value,
        };

    public static string? CleanOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static string BuildFamilyScopedOptionKey(string scannerFamily, string optionKey)
        => $"{NormalizeScannerFamily(scannerFamily)}{FamilyScopedOptionSeparator}{optionKey}";

    public static string? GetFamilyScopedOption(IReadOnlyDictionary<string, string?> options, string scannerFamily, string optionKey)
        => GetOption(options, BuildFamilyScopedOptionKey(scannerFamily, optionKey));

    public static int ParseRequiredIntId(string value, string name)
    {
        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            throw new ArgumentException($"'{name}' must be a numeric string id.");
        }

        return parsed;
    }

    public static int? ParseOptionalIntId(string? value, string name)
        => string.IsNullOrWhiteSpace(value) ? null : ParseRequiredIntId(value, name);

    public static DateTimeOffset? ParseOptionalDateTimeOffset(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : null;
    }

    public static DateTimeOffset? ToDateTimeOffset(DateTime? value)
        => value.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)) : null;

    public static string ResolvePath(string path)
        => Path.IsPathRooted(path)
            ? path
            : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", path));

    public static string EnsureDirectory(string? path)
    {
        var resolved = string.IsNullOrWhiteSpace(path)
            ? Path.Combine(Path.GetTempPath(), "ioc-manager-legacy-pipeline")
            : ResolvePath(path);
        Directory.CreateDirectory(resolved);
        return resolved;
    }

    public static void CleanupTempDirectory(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
        }
        catch
        {
        }
    }

    public static void TryDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
        }
    }

    public static async Task<string> ReadTextFileWithEncodingDetectionAsync(string path, CancellationToken cancellationToken)
    {
        var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
        {
            return Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);
        }

        if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
        {
            return Encoding.Unicode.GetString(bytes, 2, bytes.Length - 2);
        }

        if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
        {
            return Encoding.BigEndianUnicode.GetString(bytes, 2, bytes.Length - 2);
        }

        if (bytes.Any(value => value == 0))
        {
            return Encoding.Unicode.GetString(bytes);
        }

        return Encoding.UTF8.GetString(bytes);
    }

    public static string? NormalizeStoredTargetOs(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "windows" => "windows",
            "linux" => "linux",
            _ => null,
        };
    }

    public static string NormalizeTargetOs(string? value)
    {
        return NormalizeStoredTargetOs(value) ?? "auto";
    }

    public static string BuildTargetOsOverrideOptionKey(int targetId)
        => $"{TargetOsOverrideOptionPrefix}{targetId.ToString(CultureInfo.InvariantCulture)}";

    public static string? GetTargetOsOverride(IReadOnlyDictionary<string, string?>? options, int targetId)
    {
        if (options is null)
        {
            return null;
        }

        return GetOption(options, BuildTargetOsOverrideOptionKey(targetId));
    }

    public static string? InferTargetOsType(string? hostname, string? displayName, int? ttl)
    {
        return InferTargetOsTypeFromName(hostname)
            ?? InferTargetOsTypeFromName(displayName)
            ?? InferTargetOsTypeFromTtl(ttl);
    }

    public static string ResolveExecutionTargetOs(LegacyPipelineTargetEntity target, IReadOnlyDictionary<string, string?>? options = null)
    {
        return NormalizeStoredTargetOs(target.TargetOsType)
            ?? NormalizeStoredTargetOs(GetTargetOsOverride(options, target.TargetId))
            ?? InferTargetOsType(target.HostName, ResolveTargetDisplayName(target), null)
            ?? "auto";
    }

    public static bool IsWindowsAbsolutePath(string? value)
    {
        var normalized = CleanOrNull(value);
        return !string.IsNullOrWhiteSpace(normalized)
               && normalized.Length >= 3
               && char.IsLetter(normalized[0])
               && normalized[1] == ':'
               && (normalized[2] == '\\' || normalized[2] == '/');
    }

    public static bool IsPosixAbsolutePath(string? value)
        => CleanOrNull(value)?.StartsWith("/", StringComparison.Ordinal) == true;

    public static string ResolveYaraScanPath(IReadOnlyDictionary<string, string?> options, string effectiveTargetOs)
    {
        var normalizedOs = NormalizeStoredTargetOs(effectiveTargetOs)
            ?? throw new InvalidOperationException("YARA execution requires a resolved target OS.");
        var configuredPath = normalizedOs == "windows"
            ? GetOption(options, "windowsScanPath") ?? GetOption(options, "scanPath")
            : GetOption(options, "linuxScanPath") ?? GetOption(options, "scanPath");

        if (normalizedOs == "windows")
        {
            if (!IsWindowsAbsolutePath(configuredPath))
            {
                throw new InvalidOperationException("Windows YARA scans require an absolute Windows scan path like 'C:\\IOC\\'.");
            }
        }
        else if (!IsPosixAbsolutePath(configuredPath))
        {
            throw new InvalidOperationException("Linux YARA scans require a POSIX scan path like '/opt/ioc/'.");
        }

        return configuredPath!;
    }

    private static string? InferTargetOsTypeFromName(string? value)
    {
        var normalized = CleanOrNull(value)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        if (normalized.Contains("win", StringComparison.Ordinal) || normalized.Contains("windows", StringComparison.Ordinal))
        {
            return "windows";
        }

        if (normalized.Contains("linux", StringComparison.Ordinal)
            || normalized.Contains("ubuntu", StringComparison.Ordinal)
            || normalized.Contains("debian", StringComparison.Ordinal)
            || normalized.Contains("centos", StringComparison.Ordinal)
            || normalized.Contains("rhel", StringComparison.Ordinal)
            || normalized.Contains("rocky", StringComparison.Ordinal)
            || normalized.Contains("alma", StringComparison.Ordinal)
            || normalized.Contains("suse", StringComparison.Ordinal))
        {
            return "linux";
        }

        return null;
    }

    private static string? InferTargetOsTypeFromTtl(int? ttl)
    {
        if (!ttl.HasValue)
        {
            return null;
        }

        return ttl.Value switch
        {
            >= 100 => "windows",
            >= 45 and <= 80 => "linux",
            _ => null,
        };
    }

    public static string ResolveRulePath(string scannerFamily, string? rulePath, string? rulePathPreset)
    {
        if (!string.IsNullOrWhiteSpace(rulePath))
        {
            return ResolvePath(rulePath.Trim());
        }

        if (!string.IsNullOrWhiteSpace(rulePathPreset))
        {
            return ResolvePath(rulePathPreset.Trim());
        }

        throw new ArgumentException($"A rule path is required for {scannerFamily.ToUpperInvariant()}.");
    }

    public static Dictionary<string, string?> NormalizeOptions(Dictionary<string, string?>? options)
        => options is null
            ? new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string?>(options, StringComparer.OrdinalIgnoreCase);

    public static string? ResolveExecutionMode(string scannerFamily, IReadOnlyDictionary<string, string?>? options)
    {
        if (options is null)
        {
            return null;
        }

        return NormalizeScannerFamily(scannerFamily) switch
        {
            "snort" => NormalizeSnortMode(GetOption(options, SnortModeOptionKey)),
            "suricata" => NormalizeSuricataMode(GetOption(options, SuricataModeOptionKey)),
            _ => null,
        };
    }

    public static string? GetOption(IReadOnlyDictionary<string, string?> options, string key)
        => options.TryGetValue(key, out var value) ? CleanOrNull(value) : null;

    public static bool ReadBoolOption(IReadOnlyDictionary<string, string?> options, string key)
        => options.TryGetValue(key, out var value) && bool.TryParse(value, out var parsed) && parsed;

    public static string BuildReportScopeLabel(string? jobId, string? targetId, string? networkId)
    {
        if (!string.IsNullOrWhiteSpace(jobId))
        {
            return $"Job {jobId}";
        }

        if (!string.IsNullOrWhiteSpace(targetId))
        {
            return $"Target {targetId}";
        }

        if (!string.IsNullOrWhiteSpace(networkId))
        {
            return $"Subnet {networkId}";
        }

        return "Global";
    }

    public static string Slugify(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var ch in value.ToLowerInvariant())
        {
            builder.Append(char.IsLetterOrDigit(ch) ? ch : '-');
        }

        var slug = builder.ToString().Trim('-');
        while (slug.Contains("--", StringComparison.Ordinal))
        {
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        }

        return string.IsNullOrWhiteSpace(slug) ? "report" : slug;
    }

    public static string? ResolveTargetDisplayName(LegacyPipelineTargetEntity target)
    {
        if (HardcodedTargetDisplayNames.TryGetValue(target.IPAddress, out var hardcodedName))
        {
            return hardcodedName;
        }

        var explicitDisplayName = CleanOrNull(target.DisplayName);
        if (!string.IsNullOrWhiteSpace(explicitDisplayName))
        {
            return explicitDisplayName;
        }

        return null;
    }

    public static string ResolveTargetPrimaryLabel(LegacyPipelineTargetEntity target)
        => ResolveTargetDisplayName(target)
           ?? CleanOrNull(target.HostName)
           ?? "Unknown host";

    public static string BuildTargetDisplay(LegacyPipelineTargetEntity target)
        => $"{ResolveTargetPrimaryLabel(target)} ({target.IPAddress})";

    public static string NormalizeHistoricalTargetServer(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var trimmed = raw.Trim();
        var index = trimmed.LastIndexOf('@');
        return index >= 0 ? trimmed[(index + 1)..] : trimmed;
    }

    public static LegacyPipelineTargetResponse ToTargetResponse(LegacyPipelineTargetEntity target, LegacyPipelineNetworkEntity? network)
        => new(
            target.TargetId.ToString(CultureInfo.InvariantCulture),
            (target.NetworkId ?? 0).ToString(CultureInfo.InvariantCulture),
            network?.Name ?? "Unassigned",
            ResolveTargetDisplayName(target),
            CleanOrNull(target.HostName),
            target.IPAddress,
            target.Status ?? "Unknown",
            CleanOrNull(target.TargetOsType),
            ToDateTimeOffset(target.LastSweep));

    public static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement property)
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

    public static string? ReadJsonString(JsonElement element, string propertyName)
    {
        if (!TryGetProperty(element, propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.String => property.GetString(),
            JsonValueKind.Number => property.ToString(),
            _ => property.GetRawText(),
        };
    }

    public static string? ReadJsonPath(JsonElement element, params string[] path)
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
            _ => current.GetRawText(),
        };
    }

    public static DateTimeOffset ParseEnvelopeTimestamp(string? value)
        => DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : DateTimeOffset.UtcNow;

    public static string? NormalizeSeverityValue(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return normalized switch
        {
            "critical" => "critical",
            "high" => "high",
            "medium" => "medium",
            "low" => "low",
            "4" => "critical",
            "3" => "high",
            "2" => "medium",
            "1" => "low",
            _ => normalized,
        };
    }

    public static LegacyPipelineSigmaRuleValidationState AnalyzeSigmaRuleContent(string content)
        => new(
            SigmaTitleRegex.IsMatch(content),
            SigmaDetectionRegex.IsMatch(content),
            SigmaSelectionRegex.IsMatch(content),
            SigmaKeywordsRegex.IsMatch(content));

    public static bool IsPositiveInteger(string? value, out int parsed)
    {
        if (int.TryParse(CleanOrNull(value), NumberStyles.Integer, CultureInfo.InvariantCulture, out parsed) && parsed > 0)
        {
            return true;
        }

        parsed = 0;
        return false;
    }

    public static bool HasValidSnortRule(string content)
    {
        var normalized = content
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line) && !line.StartsWith('#'))
            .ToArray();

        if (normalized.Length == 0)
        {
            return false;
        }

        return normalized.Any(line => SnortRuleLineRegex.IsMatch(line));
    }

    public static bool HasValidSuricataRule(string content)
        => HasValidSnortRule(content);

    public static bool IsAllowedPcapPath(string? path)
    {
        var extension = Path.GetExtension(CleanOrNull(path) ?? string.Empty);
        return AllowedPcapExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase);
    }
}
