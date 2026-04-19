using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    private async Task<LegacyPipelineScanPlanResponse?> GetPlanResponseAsync(int planId, CancellationToken cancellationToken)
    {
        var plan = await _dbContext.ScanPlans.AsNoTracking().FirstOrDefaultAsync(item => item.PlanId == planId, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        var networkLookup = await _dbContext.Networks.AsNoTracking().ToDictionaryAsync(item => item.NetworkId, cancellationToken);
        var targetLookup = await _dbContext.Targets.AsNoTracking().ToDictionaryAsync(item => item.TargetId, cancellationToken);
        return ToPlanResponse(plan, networkLookup, targetLookup);
    }

    private LegacyPipelineScanPlanResponse ToPlanResponse(
        LegacyPipelineScanPlanEntity plan,
        IReadOnlyDictionary<int, LegacyPipelineNetworkEntity> networkLookup,
        IReadOnlyDictionary<int, LegacyPipelineTargetEntity> targetLookup)
    {
        var config = LegacyScanPipelineSerializer.DeserializePlanConfig(plan.ScannerConfigJson) ?? new LegacyPipelineScanPlanConfig("yara", "hostPath", null, new());
        var scannerFamilies = NormalizePlanScannerFamilies(config);
        var rulePathsByFamily = NormalizePlanRulePathsByFamily(config, scannerFamilies);
        var scope = LegacyScanPipelineSerializer.DeserializeTargetScope(plan.TargetScopeJson) ?? new LegacyPipelineTargetScope("explicitTargets", [], []);
        var schedule = LegacyScanPipelineSerializer.DeserializeSchedule(plan.ScheduleJson) ?? new LegacyPipelineSchedule("Manual", new());
        return new LegacyPipelineScanPlanResponse(
            plan.PlanId.ToString(CultureInfo.InvariantCulture),
            plan.Name ?? "Unnamed Plan",
            scannerFamilies,
            plan.Status ?? "Draft",
            plan.ScheduleType ?? schedule.Type,
            rulePathsByFamily,
            config.Options.TryGetValue("notes", out var notes) ? notes : null,
            scope.NetworkIds.Select(item => item.ToString(CultureInfo.InvariantCulture)).ToArray(),
            scope.TargetIds.Select(item => item.ToString(CultureInfo.InvariantCulture)).ToArray(),
            scope.NetworkIds.Select(id => networkLookup.TryGetValue(id, out var network) ? network.Name : $"Network {id}").ToArray(),
            scope.TargetIds.Select(id =>
            {
                if (!targetLookup.TryGetValue(id, out var target))
                {
                    return $"Target {id}";
                }

                return string.IsNullOrWhiteSpace(target.HostName)
                    ? target.IPAddress
                    : $"{target.HostName} ({target.IPAddress})";
            }).ToArray(),
            schedule.Values,
            config.Options,
            LegacyScanPipelineHelpers.ToDateTimeOffset(plan.NextRunAt),
            LegacyScanPipelineHelpers.ToDateTimeOffset(plan.LastRunAt),
            LegacyScanPipelineHelpers.ToDateTimeOffset(plan.CreatedAt) ?? DateTimeOffset.UtcNow,
            LegacyScanPipelineHelpers.ToDateTimeOffset(plan.UpdatedAt) ?? LegacyScanPipelineHelpers.ToDateTimeOffset(plan.CreatedAt) ?? DateTimeOffset.UtcNow);
    }

    private LegacyPipelineScanJobResponse ToJobResponse(
        LegacyPipelineScanJobEntity job,
        IReadOnlyList<int> targetIds,
        IReadOnlyList<LegacyPipelineScanResultEntity> results)
    {
        var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson);
        return new LegacyPipelineScanJobResponse(
            job.JobId.ToString(CultureInfo.InvariantCulture),
            job.PlanId?.ToString(CultureInfo.InvariantCulture),
            scope?.ScannerFamily ?? "unknown",
            scope is null ? null : LegacyScanPipelineHelpers.ResolveExecutionMode(scope.ScannerFamily, scope.Options),
            job.TriggerType ?? "Manual",
            job.Status ?? "Queued",
            job.Summary ?? string.Empty,
            LegacyScanPipelineHelpers.ToDateTimeOffset(job.QueuedAt) ?? DateTimeOffset.UtcNow,
            LegacyScanPipelineHelpers.ToDateTimeOffset(job.StartedAt),
            LegacyScanPipelineHelpers.ToDateTimeOffset(job.FinishedAt),
            job.BatchId?.ToString("D"),
            targetIds.Count,
            results.Count(result => result.Status is "Succeeded" or "NoFindings"),
            results.Count(result => result.Status == "Failed"),
            results.Count(result => result.Status == "NoFindings"));
    }

    private LegacyPipelineReportRecordResponse ToReportRecordResponse(LegacyPipelineReportEntity report)
    {
        var parameters = DeserializeReportParameters(report.ParametersJson);
        var normalizedReportType = LegacyScanPipelineHelpers.NormalizeReportType(report.ReportType ?? "ExecutiveSummary");
        var reportTypeDisplayName = LegacyScanPipelineHelpers.GetReportTypeDisplayName(normalizedReportType);
        var scope = LegacyScanPipelineHelpers.BuildReportScopeLabel(
            report.JobId?.ToString(CultureInfo.InvariantCulture) ?? parameters?.JobId,
            report.TargetId?.ToString(CultureInfo.InvariantCulture) ?? parameters?.TargetId,
            report.NetworkId?.ToString(CultureInfo.InvariantCulture) ?? parameters?.NetworkId);
        var pdfExists = !string.IsNullOrWhiteSpace(report.FilePath) && File.Exists(report.FilePath);
        var csvPath = ResolveCsvArtifactPath(report);
        var csvExists = !string.IsNullOrWhiteSpace(csvPath) && File.Exists(csvPath);
        return new LegacyPipelineReportRecordResponse(
            report.ReportId.ToString(CultureInfo.InvariantCulture),
            NormalizeReportTitle(report.Title, normalizedReportType, reportTypeDisplayName),
            normalizedReportType,
            scope,
            LegacyScanPipelineHelpers.ToDateTimeOffset(report.CreatedAt) ?? DateTimeOffset.UtcNow,
            pdfExists ? $"/api/v2/legacy-pipeline/reports/{report.ReportId}/download" : null,
            csvExists ? $"/api/v2/legacy-pipeline/reports/{report.ReportId}/download?format=csv" : null,
            pdfExists || csvExists ? "Ready" : "Missing");
    }

    private LegacyPipelineReportDetailResponse ToReportDetailResponse(LegacyPipelineReportEntity report)
    {
        var record = ToReportRecordResponse(report);
        var parameters = DeserializeReportParameters(report.ParametersJson);
        var query = ToReportQueryResponse(parameters);
        var sections = DeserializeReportSections(report.ContentJson);

        return new LegacyPipelineReportDetailResponse(
            record.Id,
            record.Title,
            record.ReportType,
            record.Scope,
            record.CreatedAtUtc,
            query,
            sections,
            record.PdfDownloadPath,
            record.CsvDownloadPath,
            record.Status);
    }

    private static IReadOnlyList<LegacyPipelineReportSectionResponse> DeserializeReportSections(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        return JsonSerializer.Deserialize<List<LegacyPipelineReportSectionResponse>>(json, LegacyScanPipelineSerializer.JsonOptions) ?? [];
    }

    private static LegacyPipelineGenerateReportRequest? DeserializeReportParameters(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        return JsonSerializer.Deserialize<LegacyPipelineGenerateReportRequest>(json, LegacyScanPipelineSerializer.JsonOptions);
    }

    private static LegacyPipelineReportQueryResponse ToReportQueryResponse(LegacyPipelineGenerateReportRequest? request)
        => new(
            LegacyScanPipelineHelpers.CleanOrNull(request?.JobId),
            LegacyScanPipelineHelpers.CleanOrNull(request?.TargetId),
            LegacyScanPipelineHelpers.CleanOrNull(request?.NetworkId),
            LegacyScanPipelineHelpers.CleanOrNull(request?.ScannerFamily),
            LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(request?.FromUtc)?.ToString("O", CultureInfo.InvariantCulture),
            LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(request?.ToUtc)?.ToString("O", CultureInfo.InvariantCulture),
            LegacyScanPipelineHelpers.CleanOrNull(request?.Severity),
            LegacyScanPipelineHelpers.CleanOrNull(request?.Status));

    private static string? ResolveCsvArtifactPath(LegacyPipelineReportEntity report)
    {
        if (string.IsNullOrWhiteSpace(report.FilePath))
        {
            return null;
        }

        return Path.ChangeExtension(report.FilePath, ".csv");
    }

    private static string NormalizeReportTitle(string? title, string normalizedReportType, string reportTypeDisplayName)
    {
        var cleaned = LegacyScanPipelineHelpers.CleanOrNull(title);
        if (cleaned is null)
        {
            return $"{reportTypeDisplayName} Report";
        }

        if (string.Equals(cleaned, normalizedReportType, StringComparison.OrdinalIgnoreCase)
            || string.Equals(cleaned, reportTypeDisplayName, StringComparison.OrdinalIgnoreCase)
            || string.Equals(cleaned, $"{normalizedReportType} Report", StringComparison.OrdinalIgnoreCase)
            || string.Equals(cleaned, $"{reportTypeDisplayName} Report", StringComparison.OrdinalIgnoreCase))
        {
            return $"{reportTypeDisplayName} Report";
        }

        return cleaned;
    }

    private bool TryDeleteReportArtifact(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return false;
        }

        try
        {
            File.Delete(path);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete legacy report artifact at {ArtifactPath}", path);
            return false;
        }
    }

    private async Task<int> ResolveActorUserIdAsync(string actorUserId, CancellationToken cancellationToken)
    {
        if (int.TryParse(actorUserId, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        var record = await _directoryService.FindByLookupAsync(actorUserId, cancellationToken);
        if (record is not null)
        {
            return record.UserId;
        }

        var users = await _directoryService.ListUsersAsync(cancellationToken);
        var fallback = users.FirstOrDefault();
        if (fallback is not null)
        {
            return fallback.UserId;
        }

        throw new InvalidOperationException("No dbo.User record is available for pipeline writes.");
    }

    private async Task<LegacyPipelineTargetScope> BuildTargetScopeAsync(
        IReadOnlyList<string> networkIds,
        IReadOnlyList<string> targetIds,
        CancellationToken cancellationToken)
    {
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var parsedNetworkIds = networkIds.Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => LegacyScanPipelineHelpers.ParseRequiredIntId(value, nameof(networkIds)))
            .Distinct()
            .ToList();
        var parsedTargetIds = targetIds.Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => LegacyScanPipelineHelpers.ParseRequiredIntId(value, nameof(targetIds)))
            .Distinct()
            .ToList();

        if (parsedNetworkIds.Count == 0 && parsedTargetIds.Count == 0)
        {
            throw new ArgumentException("At least one subnet or target must be selected.");
        }

        if (parsedNetworkIds.Count > 0)
        {
            var knownNetworks = await _dbContext.Networks.AsNoTracking()
                .Where(item => parsedNetworkIds.Contains(item.NetworkId))
                .Select(item => item.NetworkId)
                .ToArrayAsync(cancellationToken);
            if (knownNetworks.Length != parsedNetworkIds.Count)
            {
                throw new ArgumentException("One or more selected subnet ids were not found.");
            }
        }

        if (parsedTargetIds.Count > 0)
        {
            var knownTargets = await _dbContext.Targets.AsNoTracking()
                .Where(item => parsedTargetIds.Contains(item.TargetId) && !excludedAddresses.Contains(item.IPAddress))
                .Select(item => item.TargetId)
                .ToArrayAsync(cancellationToken);
            if (knownTargets.Length != parsedTargetIds.Count)
            {
                throw new ArgumentException("One or more selected target ids were not found or are reserved infrastructure targets.");
            }
        }

        var selectionMode = parsedNetworkIds.Count > 0 && parsedTargetIds.Count > 0
            ? "mixed"
            : parsedNetworkIds.Count > 0 ? "subnet" : "explicitTargets";
        return new LegacyPipelineTargetScope(selectionMode, parsedNetworkIds, parsedTargetIds);
    }

    private async Task<List<LegacyPipelineTargetEntity>> ResolveTargetsForScopeAsync(
        IReadOnlyList<int> networkIds,
        IReadOnlyList<int> targetIds,
        CancellationToken cancellationToken)
    {
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var ids = new HashSet<int>(targetIds);
        if (networkIds.Count > 0)
        {
            var fromNetworks = await _dbContext.Targets.AsNoTracking()
                .Where(item => item.NetworkId.HasValue
                    && networkIds.Contains(item.NetworkId.Value)
                    && !excludedAddresses.Contains(item.IPAddress))
                .Select(item => item.TargetId)
                .ToArrayAsync(cancellationToken);
            foreach (var id in fromNetworks)
            {
                ids.Add(id);
            }
        }

        if (ids.Count == 0)
        {
            throw new ArgumentException("No targets were resolved from the selected scope.");
        }

        return await _dbContext.Targets.AsNoTracking()
            .Where(item => ids.Contains(item.TargetId) && !excludedAddresses.Contains(item.IPAddress))
            .OrderBy(item => item.IPAddress)
            .ToListAsync(cancellationToken);
    }

    private void ValidateTargetCount(int count)
    {
        var limit = Math.Max(1, _pipelineOptions.CurrentValue.MaxTargetsPerExecution);
        if (count <= 0)
        {
            throw new ArgumentException("At least one target must be selected.");
        }

        if (count > limit)
        {
            throw new ArgumentException($"Selected scope resolves to {count} targets, exceeding the v1 limit of {limit}.");
        }
    }

    private async Task<(string TempDirectory, Dictionary<string, string?> RulePathsByFamily, Dictionary<string, string[]> RuleFilesByFamily, string[] ExtractedFiles)> StageUploadedRulesAsync(
        IReadOnlyList<string> scannerFamilies,
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0)
        {
            throw new ArgumentException("Uploaded custom scans require at least one rule file.");
        }

        var tempRoot = LegacyScanPipelineHelpers.EnsureDirectory(_pipelineOptions.CurrentValue.TempRuleRootDirectory);
        var tempDirectory = Path.Combine(tempRoot, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDirectory);
        var extractedFiles = new List<string>();

        foreach (var file in files)
        {
            if (Path.GetExtension(file.FileName).Equals(".zip", StringComparison.OrdinalIgnoreCase))
            {
                var zipPath = Path.Combine(tempDirectory, $"{Guid.NewGuid():N}.zip");
                await using (var stream = File.Create(zipPath))
                {
                    await file.CopyToAsync(stream, cancellationToken);
                }

                using var archive = ZipFile.OpenRead(zipPath);
                foreach (var entry in archive.Entries)
                {
                    if (string.IsNullOrWhiteSpace(entry.Name))
                    {
                        continue;
                    }

                    var destination = Path.Combine(tempDirectory, $"{Guid.NewGuid():N}{Path.GetExtension(entry.Name)}");
                    entry.ExtractToFile(destination, true);
                    extractedFiles.Add(destination);
                }

                LegacyScanPipelineHelpers.TryDeleteFile(zipPath);
                continue;
            }

            var outputPath = Path.Combine(tempDirectory, $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}");
            await using var output = File.Create(outputPath);
            await file.CopyToAsync(output, cancellationToken);
            extractedFiles.Add(outputPath);
        }

        var bundledFiles = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var ruleFilesByFamily = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        foreach (var family in scannerFamilies)
        {
            var allowedExtensions = LegacyScanPipelineHelpers.AllowedRuleExtensions[family];
            var familyFiles = extractedFiles
                .Where(path => allowedExtensions.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase))
                .ToArray();
            if (familyFiles.Length == 0)
            {
                LegacyScanPipelineHelpers.CleanupTempDirectory(tempDirectory);
                throw new ArgumentException($"No valid uploaded rule files were found for {family.ToUpperInvariant()}.");
            }

            ruleFilesByFamily[family] = familyFiles;

            var bundleExtension = family switch
            {
                "sigma" => ".yml",
                "yara" => ".yar",
                _ => ".rules",
            };

            var bundlePath = Path.Combine(tempDirectory, $"{family}_{Guid.NewGuid():N}{bundleExtension}");
            var builder = new StringBuilder();
            foreach (var path in familyFiles)
            {
                builder.AppendLine(await LegacyScanPipelineHelpers.ReadTextFileWithEncodingDetectionAsync(path, cancellationToken));
                builder.AppendLine();
            }

            await File.WriteAllTextAsync(bundlePath, builder.ToString(), new UTF8Encoding(false), cancellationToken);
            bundledFiles[family] = bundlePath;
        }

        return (tempDirectory, bundledFiles, ruleFilesByFamily, extractedFiles.ToArray());
    }

    private static Dictionary<int, string> NormalizeTargetOsOverrides(Dictionary<string, string>? rawOverrides)
    {
        var normalized = new Dictionary<int, string>();
        if (rawOverrides is null)
        {
            return normalized;
        }

        foreach (var pair in rawOverrides)
        {
            var targetId = LegacyScanPipelineHelpers.ParseRequiredIntId(pair.Key, nameof(rawOverrides));
            var os = LegacyScanPipelineHelpers.NormalizeStoredTargetOs(pair.Value);
            if (os is null)
            {
                throw new ArgumentException($"Target OS override for '{pair.Key}' must be 'windows' or 'linux'.");
            }

            normalized[targetId] = os;
        }

        return normalized;
    }

    private static IReadOnlyList<LegacyPipelineResolvedTargetOs> ResolveYaraTargetOsSelections(
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        Dictionary<int, string> normalizedOverrides)
    {
        var selections = new List<LegacyPipelineResolvedTargetOs>(resolvedTargets.Count);
        foreach (var target in resolvedTargets)
        {
            var storedOs = LegacyScanPipelineHelpers.NormalizeStoredTargetOs(target.TargetOsType);
            var hasOverride = normalizedOverrides.TryGetValue(target.TargetId, out var overrideOs);

            if (storedOs is not null)
            {
                if (hasOverride)
                {
                    throw new ArgumentException($"Manual OS override is only allowed for targets whose OS is currently unknown. Target '{LegacyScanPipelineHelpers.BuildTargetDisplay(target)}' is already '{storedOs}'.");
                }

                selections.Add(new LegacyPipelineResolvedTargetOs(target, storedOs, false));
                continue;
            }

            if (!hasOverride)
            {
                throw new ArgumentException($"YARA requires a known target OS. '{LegacyScanPipelineHelpers.BuildTargetDisplay(target)}' still has an unknown OS.");
            }

            selections.Add(new LegacyPipelineResolvedTargetOs(target, overrideOs!, true));
        }

        return selections;
    }

    private static IReadOnlyList<LegacyPipelineResolvedTargetOs> ResolveSigmaTargetOsSelections(
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        Dictionary<int, string> normalizedOverrides)
    {
        if (normalizedOverrides.Count > 0)
        {
            throw new ArgumentException("Sigma target OS overrides are not supported. Sigma uses discovered target OS values only.");
        }

        var selections = new List<LegacyPipelineResolvedTargetOs>(resolvedTargets.Count);
        foreach (var target in resolvedTargets)
        {
            var storedOs = LegacyScanPipelineHelpers.NormalizeStoredTargetOs(target.TargetOsType);
            if (storedOs is null)
            {
                throw new ArgumentException($"Sigma requires a known target OS. '{LegacyScanPipelineHelpers.BuildTargetDisplay(target)}' still has an unknown OS.");
            }

            selections.Add(new LegacyPipelineResolvedTargetOs(target, storedOs, false));
        }

        return selections;
    }

    private static void ApplyTargetOsOverrides(Dictionary<string, string?> options, IReadOnlyList<LegacyPipelineResolvedTargetOs> targets)
    {
        foreach (var target in targets.Where(item => item.UsedOverride))
        {
            options[LegacyScanPipelineHelpers.BuildTargetOsOverrideOptionKey(target.Target.TargetId)] = target.EffectiveOs;
        }
    }

    private static void ValidateYaraPlanTargets(IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets)
    {
        var knownOs = resolvedTargets
            .Select(target => LegacyScanPipelineHelpers.NormalizeStoredTargetOs(target.TargetOsType))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (knownOs.Any(os => os is null))
        {
            throw new ArgumentException("YARA scan plans require every selected target to have a discovered OS before the plan can be saved.");
        }

        if (knownOs.Length > 1)
        {
            throw new ArgumentException("YARA scan plans are single-OS only in v1. Select only Windows targets or only Linux targets.");
        }
    }

    private static string[] NormalizePlanScannerFamilies(LegacyPipelineScanPlanConfig config)
    {
        if (config.ScannerFamilies is { Count: > 0 })
        {
            return config.ScannerFamilies
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(LegacyScanPipelineHelpers.NormalizeScannerFamily)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        if (!string.IsNullOrWhiteSpace(config.ScannerFamily))
        {
            return [LegacyScanPipelineHelpers.NormalizeScannerFamily(config.ScannerFamily)];
        }

        throw new InvalidOperationException("Stored scan plan configuration does not contain any scanner families.");
    }

    private static Dictionary<string, string?> NormalizePlanRulePathsByFamily(
        LegacyPipelineScanPlanConfig config,
        IReadOnlyList<string> scannerFamilies)
    {
        var rulePaths = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        if (config.RulePathsByFamily is { Count: > 0 })
        {
            foreach (var pair in config.RulePathsByFamily)
            {
                if (string.IsNullOrWhiteSpace(pair.Key))
                {
                    continue;
                }

                rulePaths[LegacyScanPipelineHelpers.NormalizeScannerFamily(pair.Key)] = LegacyScanPipelineHelpers.CleanOrNull(pair.Value);
            }
        }

        if (rulePaths.Count == 0
            && scannerFamilies.Count == 1
            && !string.IsNullOrWhiteSpace(config.RulePath))
        {
            rulePaths[scannerFamilies[0]] = LegacyScanPipelineHelpers.CleanOrNull(config.RulePath);
        }

        foreach (var family in scannerFamilies)
        {
            rulePaths.TryAdd(family, null);
        }

        return rulePaths;
    }

    private static LegacyPipelineScanPlanConfig BuildStoredPlanConfig(
        IReadOnlyList<string> scannerFamilies,
        IReadOnlyDictionary<string, string?> rulePathsByFamily,
        IReadOnlyDictionary<string, string?> options)
    {
        var normalizedFamilies = scannerFamilies
            .Select(LegacyScanPipelineHelpers.NormalizeScannerFamily)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var normalizedRulePaths = normalizedFamilies.ToDictionary(
            family => family,
            family => rulePathsByFamily.TryGetValue(family, out var value) ? LegacyScanPipelineHelpers.CleanOrNull(value) : null,
            StringComparer.OrdinalIgnoreCase);
        var primaryFamily = normalizedFamilies[0];
        return new LegacyPipelineScanPlanConfig(
            primaryFamily,
            "hostPath",
            normalizedRulePaths[primaryFamily],
            new Dictionary<string, string?>(options, StringComparer.OrdinalIgnoreCase),
            normalizedFamilies.ToList(),
            normalizedRulePaths);
    }

    private static Dictionary<string, string?> BuildPlanExecutionOptionsForFamily(
        string scannerFamily,
        IReadOnlyDictionary<string, string?> planOptions)
    {
        var normalizedFamily = LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily);
        var options = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(LegacyScanPipelineHelpers.GetOption(planOptions, "notes")))
        {
            options["notes"] = LegacyScanPipelineHelpers.GetOption(planOptions, "notes");
        }

        switch (normalizedFamily)
        {
            case "yara":
                options["windowsScanPath"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "windowsScanPath");
                options["linuxScanPath"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "linuxScanPath");
                break;
            case "sigma":
                options["minutesBack"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "minutesBack");
                break;
            case "snort":
                options[LegacyScanPipelineHelpers.SnortModeOptionKey] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, LegacyScanPipelineHelpers.SnortModeOptionKey);
                options["minutesBack"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "minutesBack");
                options["pcapPath"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "pcapPath");
                break;
            case "suricata":
                options[LegacyScanPipelineHelpers.SuricataModeOptionKey] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, LegacyScanPipelineHelpers.SuricataModeOptionKey);
                options["minutesBack"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "minutesBack");
                options["pcapPath"] = LegacyScanPipelineHelpers.GetFamilyScopedOption(planOptions, normalizedFamily, "pcapPath");
                break;
        }

        return options;
    }

    private async Task<Dictionary<string, string?>> NormalizePlanOptionsForFamilyAsync(
        string scannerFamily,
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        IReadOnlyDictionary<string, string?> planOptions,
        string? effectiveRulePath,
        CancellationToken cancellationToken)
    {
        var executionOptions = BuildPlanExecutionOptionsForFamily(scannerFamily, planOptions);

        if (string.Equals(scannerFamily, "snort", StringComparison.OrdinalIgnoreCase))
        {
            var snortMode = LegacyScanPipelineHelpers.NormalizeSnortMode(LegacyScanPipelineHelpers.GetOption(executionOptions, LegacyScanPipelineHelpers.SnortModeOptionKey));
            if (string.Equals(snortMode, "quarantine", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Snort scan plans support Hunt and PCAP only.");
            }
        }

        if (string.Equals(scannerFamily, "suricata", StringComparison.OrdinalIgnoreCase))
        {
            var suricataMode = LegacyScanPipelineHelpers.NormalizeSuricataMode(LegacyScanPipelineHelpers.GetOption(executionOptions, LegacyScanPipelineHelpers.SuricataModeOptionKey));
            if (string.Equals(suricataMode, "quarantine", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Suricata scan plans support Hunt and PCAP only.");
            }
        }

        return await NormalizeCustomScanOptionsAsync(
            scannerFamily,
            resolvedTargets,
            executionOptions,
            new Dictionary<int, string>(),
            effectiveRulePath,
            null,
            null,
            cancellationToken);
    }

    private async Task<(string[] ScannerFamilies, Dictionary<string, string?> RulePathsByFamily, Dictionary<string, string?> Options)> ValidateAndNormalizePlanDefinitionAsync(
        IReadOnlyList<string> scannerFamilies,
        IReadOnlyDictionary<string, string?> rulePathsByFamily,
        Dictionary<string, string?> options,
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        CancellationToken cancellationToken)
    {
        var normalizedFamilies = scannerFamilies
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(LegacyScanPipelineHelpers.NormalizeScannerFamily)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (normalizedFamilies.Length == 0)
        {
            throw new ArgumentException("At least one scanner family is required.");
        }

        if (normalizedFamilies.Contains("snort", StringComparer.OrdinalIgnoreCase)
            && normalizedFamilies.Contains("suricata", StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Choose either Snort or Suricata for a network scan run, not both.");
        }

        var normalizedRulePaths = normalizedFamilies.ToDictionary(
            family => family,
            family =>
            {
                if (!rulePathsByFamily.TryGetValue(family, out var rulePath))
                {
                    throw new ArgumentException($"{family.ToUpperInvariant()} requires a host rule path.");
                }

                return (string?)LegacyScanPipelineHelpers.ResolveRulePath(family, rulePath, null);
            },
            StringComparer.OrdinalIgnoreCase);

        foreach (var family in normalizedFamilies)
        {
            await NormalizePlanOptionsForFamilyAsync(
                family,
                resolvedTargets,
                options,
                normalizedRulePaths[family],
                cancellationToken);
        }

        return (normalizedFamilies, normalizedRulePaths, options);
    }

    private static Dictionary<string, string?> NormalizeCustomScanOptions(
        string scannerFamily,
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        Dictionary<string, string?> options,
        Dictionary<int, string> normalizedTargetOsOverrides)
    {
        if (!string.Equals(scannerFamily, "yara", StringComparison.OrdinalIgnoreCase))
        {
            return options;
        }

        var yaraTargets = ResolveYaraTargetOsSelections(resolvedTargets, normalizedTargetOsOverrides);
        ApplyTargetOsOverrides(options, yaraTargets);
        var distinctTargetOs = yaraTargets
            .Select(item => item.EffectiveOs)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var legacyPath = LegacyScanPipelineHelpers.GetOption(options, "scanPath");
        var windowsScanPath = LegacyScanPipelineHelpers.GetOption(options, "windowsScanPath");
        var linuxScanPath = LegacyScanPipelineHelpers.GetOption(options, "linuxScanPath");
        if (distinctTargetOs.Length == 1)
        {
            if (string.Equals(distinctTargetOs[0], "windows", StringComparison.OrdinalIgnoreCase))
            {
                var effectiveWindowsPath = windowsScanPath ?? legacyPath;
                if (!LegacyScanPipelineHelpers.IsWindowsAbsolutePath(effectiveWindowsPath))
                {
                    throw new ArgumentException("Windows YARA scans require an absolute Windows scan path like 'C:\\IOC\\'.");
                }

                options["windowsScanPath"] = effectiveWindowsPath;
            }
            else
            {
                var effectiveLinuxPath = linuxScanPath ?? legacyPath;
                if (!LegacyScanPipelineHelpers.IsPosixAbsolutePath(effectiveLinuxPath))
                {
                    throw new ArgumentException("Linux YARA scans require a POSIX scan path like '/opt/ioc/'.");
                }

                options["linuxScanPath"] = effectiveLinuxPath;
            }

            return options;
        }

        if (!string.IsNullOrWhiteSpace(legacyPath))
        {
            throw new ArgumentException("Mixed-OS YARA scans require separate Windows and Linux scan paths.");
        }

        if (!LegacyScanPipelineHelpers.IsWindowsAbsolutePath(windowsScanPath))
        {
            throw new ArgumentException("Mixed-OS YARA scans require a Windows scan path like 'C:\\IOC\\'.");
        }

        if (!LegacyScanPipelineHelpers.IsPosixAbsolutePath(linuxScanPath))
        {
            throw new ArgumentException("Mixed-OS YARA scans require a Linux scan path like '/opt/ioc/'.");
        }

        options["windowsScanPath"] = windowsScanPath;
        options["linuxScanPath"] = linuxScanPath;
        return options;
    }

    private static IReadOnlyList<string> ResolveSigmaRuleFilesForValidation(string? effectiveRulePath, IReadOnlyList<string>? uploadedRuleFiles)
    {
        if (uploadedRuleFiles is { Count: > 0 })
        {
            return uploadedRuleFiles;
        }

        if (string.IsNullOrWhiteSpace(effectiveRulePath))
        {
            throw new ArgumentException("A Sigma rule source is required.");
        }

        if (Directory.Exists(effectiveRulePath))
        {
            return Directory.EnumerateFiles(effectiveRulePath, "*.*", SearchOption.AllDirectories)
                .Where(path => LegacyScanPipelineHelpers.AllowedRuleExtensions["sigma"].Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase))
                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        return [effectiveRulePath];
    }

    private static IReadOnlyList<string> ResolveSnortRuleFilesForValidation(string? effectiveRulePath, IReadOnlyList<string>? uploadedRuleFiles)
    {
        if (uploadedRuleFiles is { Count: > 0 })
        {
            return uploadedRuleFiles;
        }

        if (string.IsNullOrWhiteSpace(effectiveRulePath))
        {
            throw new ArgumentException("A Snort rule source is required.");
        }

        if (Directory.Exists(effectiveRulePath))
        {
            throw new ArgumentException("Snort custom scans require a .rules file, not a directory.");
        }

        return [effectiveRulePath];
    }

    private static IReadOnlyList<string> ResolveSuricataRuleFilesForValidation(string? effectiveRulePath, IReadOnlyList<string>? uploadedRuleFiles)
    {
        if (uploadedRuleFiles is { Count: > 0 })
        {
            return uploadedRuleFiles;
        }

        if (string.IsNullOrWhiteSpace(effectiveRulePath))
        {
            throw new ArgumentException("A Suricata rule source is required.");
        }

        if (Directory.Exists(effectiveRulePath))
        {
            throw new ArgumentException("Suricata custom scans require a rule file, not a directory.");
        }

        return [effectiveRulePath];
    }

    private static async Task ValidateSigmaRuleFilesAsync(
        IReadOnlyList<string> ruleFiles,
        bool requireLinuxCompatible,
        CancellationToken cancellationToken)
    {
        if (ruleFiles.Count == 0)
        {
            throw new ArgumentException("No Sigma YAML rule files were resolved from the selected rule source.");
        }

        foreach (var ruleFile in ruleFiles)
        {
            var extension = Path.GetExtension(ruleFile);
            if (!LegacyScanPipelineHelpers.AllowedRuleExtensions["sigma"].Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Sigma rule '{Path.GetFileName(ruleFile)}' must use a .yml or .yaml extension.");
            }

            var content = await LegacyScanPipelineHelpers.ReadTextFileWithEncodingDetectionAsync(ruleFile, cancellationToken);
            var state = LegacyScanPipelineHelpers.AnalyzeSigmaRuleContent(content);
            if (!state.HasTitle)
            {
                throw new ArgumentException($"Sigma rule '{Path.GetFileName(ruleFile)}' must include a title.");
            }

            if (!state.HasDetection)
            {
                throw new ArgumentException($"Sigma rule '{Path.GetFileName(ruleFile)}' must include detection logic.");
            }

            if (requireLinuxCompatible && (!state.HasSelection || !state.HasKeywords))
            {
                throw new ArgumentException($"Sigma rule '{Path.GetFileName(ruleFile)}' is not Linux-compatible. Linux Sigma currently requires detection.selection.keywords.");
            }
        }
    }

    private static async Task ValidateSnortRuleFilesAsync(
        IReadOnlyList<string> ruleFiles,
        CancellationToken cancellationToken)
    {
        if (ruleFiles.Count == 0)
        {
            throw new ArgumentException("No Snort rule files were resolved from the selected rule source.");
        }

        foreach (var ruleFile in ruleFiles)
        {
            if (!File.Exists(ruleFile))
            {
                throw new ArgumentException($"Snort rule file '{ruleFile}' was not found.");
            }

            var extension = Path.GetExtension(ruleFile);
            if (!LegacyScanPipelineHelpers.AllowedRuleExtensions["snort"].Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Snort rule '{Path.GetFileName(ruleFile)}' must use a .rules extension.");
            }

            var content = await LegacyScanPipelineHelpers.ReadTextFileWithEncodingDetectionAsync(ruleFile, cancellationToken);
            if (!LegacyScanPipelineHelpers.HasValidSnortRule(content))
            {
                throw new ArgumentException($"Snort rule '{Path.GetFileName(ruleFile)}' must contain at least one valid alert/drop/reject rule with a sid.");
            }
        }
    }

    private static async Task ValidateSuricataRuleFilesAsync(
        IReadOnlyList<string> ruleFiles,
        CancellationToken cancellationToken)
    {
        if (ruleFiles.Count == 0)
        {
            throw new ArgumentException("No Suricata rule files were resolved from the selected rule source.");
        }

        foreach (var ruleFile in ruleFiles)
        {
            if (!File.Exists(ruleFile))
            {
                throw new ArgumentException($"Suricata rule file '{ruleFile}' was not found.");
            }

            var extension = Path.GetExtension(ruleFile);
            if (!LegacyScanPipelineHelpers.AllowedRuleExtensions["suricata"].Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Suricata rule '{Path.GetFileName(ruleFile)}' must use .rules, .sur, or .suricata.");
            }

            var content = await LegacyScanPipelineHelpers.ReadTextFileWithEncodingDetectionAsync(ruleFile, cancellationToken);
            if (!LegacyScanPipelineHelpers.HasValidSuricataRule(content))
            {
                throw new ArgumentException($"Suricata rule '{Path.GetFileName(ruleFile)}' must contain at least one valid alert/drop/reject rule with a sid.");
            }
        }
    }

    private static string? ResolveUploadedPcapPath(IEnumerable<string>? extractedFiles)
    {
        if (extractedFiles is null)
        {
            return null;
        }

        var pcapFiles = extractedFiles
            .Where(LegacyScanPipelineHelpers.IsAllowedPcapPath)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return pcapFiles.Length switch
        {
            0 => null,
            1 => pcapFiles[0],
            _ => throw new ArgumentException("Snort PCAP mode accepts exactly one uploaded PCAP source."),
        };
    }

    private async Task<Dictionary<string, string?>> NormalizeCustomScanOptionsAsync(
        string scannerFamily,
        IReadOnlyList<LegacyPipelineTargetEntity> resolvedTargets,
        Dictionary<string, string?> options,
        Dictionary<int, string> normalizedTargetOsOverrides,
        string? effectiveRulePath,
        IReadOnlyList<string>? uploadedRuleFiles,
        string? stagedPcapPath,
        CancellationToken cancellationToken)
    {
        if (string.Equals(scannerFamily, "snort", StringComparison.OrdinalIgnoreCase)
            || string.Equals(scannerFamily, "suricata", StringComparison.OrdinalIgnoreCase))
        {
            var isSuricata = string.Equals(scannerFamily, "suricata", StringComparison.OrdinalIgnoreCase);
            var productName = isSuricata ? "Suricata" : "Snort";
            var ruleFiles = isSuricata
                ? ResolveSuricataRuleFilesForValidation(effectiveRulePath, uploadedRuleFiles)
                : ResolveSnortRuleFilesForValidation(effectiveRulePath, uploadedRuleFiles);
            if (isSuricata)
            {
                await ValidateSuricataRuleFilesAsync(ruleFiles, cancellationToken);
            }
            else
            {
                await ValidateSnortRuleFilesAsync(ruleFiles, cancellationToken);
            }

            var modeOptionKey = isSuricata
                ? LegacyScanPipelineHelpers.SuricataModeOptionKey
                : LegacyScanPipelineHelpers.SnortModeOptionKey;
            var networkMode = isSuricata
                ? LegacyScanPipelineHelpers.NormalizeSuricataMode(LegacyScanPipelineHelpers.GetOption(options, modeOptionKey))
                : LegacyScanPipelineHelpers.NormalizeSnortMode(LegacyScanPipelineHelpers.GetOption(options, modeOptionKey));
            options[modeOptionKey] = networkMode;

            switch (networkMode)
            {
                case "hunt":
                    if (!string.IsNullOrWhiteSpace(stagedPcapPath) || !string.IsNullOrWhiteSpace(LegacyScanPipelineHelpers.GetOption(options, "pcapPath")))
                    {
                        throw new ArgumentException($"{productName} Hunt mode does not accept a PCAP source.");
                    }

                    if (!LegacyScanPipelineHelpers.IsPositiveInteger(LegacyScanPipelineHelpers.GetOption(options, "minutesBack"), out var _))
                    {
                        throw new ArgumentException($"{productName} Hunt mode requires minutesBack to be a positive integer.");
                    }

                    break;
                case "quarantine":
                    if (!string.IsNullOrWhiteSpace(stagedPcapPath) || !string.IsNullOrWhiteSpace(LegacyScanPipelineHelpers.GetOption(options, "pcapPath")))
                    {
                        throw new ArgumentException($"{productName} Quarantine mode does not accept a PCAP source.");
                    }

                    if (!LegacyScanPipelineHelpers.IsPositiveInteger(LegacyScanPipelineHelpers.GetOption(options, "quarantineDurationMinutes"), out var quarantineDurationMinutes))
                    {
                        throw new ArgumentException($"{productName} Quarantine mode requires quarantineDurationMinutes to be a positive integer.");
                    }

                    if (quarantineDurationMinutes > 120)
                    {
                        throw new ArgumentException($"{productName} Quarantine mode duration must be 120 minutes or less.");
                    }

                    break;
                case "pcap":
                {
                    var configuredPcapPath = LegacyScanPipelineHelpers.GetOption(options, "pcapPath");
                    var resolvedPcapSources = new[]
                    {
                        !string.IsNullOrWhiteSpace(configuredPcapPath) ? configuredPcapPath : null,
                        !string.IsNullOrWhiteSpace(stagedPcapPath) ? stagedPcapPath : null,
                    }.Where(value => !string.IsNullOrWhiteSpace(value)).Cast<string>().ToArray();

                    if (resolvedPcapSources.Length != 1)
                    {
                        throw new ArgumentException($"{productName} PCAP mode requires exactly one PCAP source via upload or IOC_MGR host path.");
                    }

                    var pcapPath = resolvedPcapSources[0];
                    if (!LegacyScanPipelineHelpers.IsAllowedPcapPath(pcapPath))
                    {
                        throw new ArgumentException($"{productName} PCAP mode requires a .pcap or .pcapng source.");
                    }

                    if (!File.Exists(pcapPath))
                    {
                        throw new ArgumentException($"{productName} PCAP source '{pcapPath}' was not found.");
                    }

                    options["pcapPath"] = configuredPcapPath;
                    options[LegacyScanPipelineHelpers.StagedPcapPathOptionKey] = stagedPcapPath;
                    break;
                }
            }

            return options;
        }

        if (!string.Equals(scannerFamily, "sigma", StringComparison.OrdinalIgnoreCase))
        {
            return NormalizeCustomScanOptions(scannerFamily, resolvedTargets, options, normalizedTargetOsOverrides);
        }

        var sigmaTargets = ResolveSigmaTargetOsSelections(resolvedTargets, normalizedTargetOsOverrides);
        var requiresLinuxCompatibleRules = sigmaTargets.Any(item => string.Equals(item.EffectiveOs, "linux", StringComparison.OrdinalIgnoreCase));
        var sigmaRuleFiles = ResolveSigmaRuleFilesForValidation(effectiveRulePath, uploadedRuleFiles);
        await ValidateSigmaRuleFilesAsync(sigmaRuleFiles, requiresLinuxCompatibleRules, cancellationToken);
        if (!LegacyScanPipelineHelpers.IsPositiveInteger(LegacyScanPipelineHelpers.GetOption(options, "minutesBack"), out var _))
        {
            throw new ArgumentException("Sigma requires minutesBack to be a positive integer.");
        }

        return options;
    }

    private static Dictionary<string, string?> NormalizeScheduleValues(string scheduleType, Dictionary<string, string?>? values)
    {
        var normalized = values is null
            ? new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string?>(values, StringComparer.OrdinalIgnoreCase);

        switch (scheduleType)
        {
            case "Interval":
                if (!normalized.TryGetValue("intervalMinutes", out var intervalValue)
                    || !int.TryParse(intervalValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var intervalMinutes)
                    || intervalMinutes <= 0)
                {
                    throw new ArgumentException("Interval schedules require a positive intervalMinutes value.");
                }

                normalized["intervalMinutes"] = intervalMinutes.ToString(CultureInfo.InvariantCulture);
                break;
            case "Daily":
                normalized["hourUtc"] = NormalizeHourValue(normalized, "hourUtc");
                normalized["minuteUtc"] = NormalizeMinuteValue(normalized, "minuteUtc");
                break;
            case "Weekly":
                normalized["hourUtc"] = NormalizeHourValue(normalized, "hourUtc");
                normalized["minuteUtc"] = NormalizeMinuteValue(normalized, "minuteUtc");
                if (!normalized.TryGetValue("dayOfWeek", out var dayOfWeek) || string.IsNullOrWhiteSpace(dayOfWeek))
                {
                    throw new ArgumentException("Weekly schedules require dayOfWeek.");
                }

                normalized["dayOfWeek"] = dayOfWeek.Trim();
                break;
        }

        return normalized;
    }

    private static string NormalizeHourValue(IReadOnlyDictionary<string, string?> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || !int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) || parsed is < 0 or > 23)
        {
            throw new ArgumentException($"{key} must be between 0 and 23.");
        }

        return parsed.ToString(CultureInfo.InvariantCulture);
    }

    private static string NormalizeMinuteValue(IReadOnlyDictionary<string, string?> values, string key)
    {
        if (!values.TryGetValue(key, out var raw) || !int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) || parsed is < 0 or > 59)
        {
            throw new ArgumentException($"{key} must be between 0 and 59.");
        }

        return parsed.ToString(CultureInfo.InvariantCulture);
    }

    private static DateTimeOffset? ComputeNextRunUtc(DateTimeOffset fromUtc, string scheduleType, IReadOnlyDictionary<string, string?> values)
    {
        return scheduleType switch
        {
            "Manual" => null,
            "Interval" => fromUtc.AddMinutes(int.Parse(values["intervalMinutes"]!, CultureInfo.InvariantCulture)),
            "Daily" => ComputeDailyRun(fromUtc, values),
            "Weekly" => ComputeWeeklyRun(fromUtc, values),
            _ => null,
        };
    }

    private static DateTimeOffset ComputeDailyRun(DateTimeOffset fromUtc, IReadOnlyDictionary<string, string?> values)
    {
        var hour = int.Parse(values["hourUtc"]!, CultureInfo.InvariantCulture);
        var minute = int.Parse(values["minuteUtc"]!, CultureInfo.InvariantCulture);
        var candidate = new DateTimeOffset(fromUtc.Year, fromUtc.Month, fromUtc.Day, hour, minute, 0, TimeSpan.Zero);
        return candidate > fromUtc ? candidate : candidate.AddDays(1);
    }

    private static DateTimeOffset ComputeWeeklyRun(DateTimeOffset fromUtc, IReadOnlyDictionary<string, string?> values)
    {
        var hour = int.Parse(values["hourUtc"]!, CultureInfo.InvariantCulture);
        var minute = int.Parse(values["minuteUtc"]!, CultureInfo.InvariantCulture);
        if (!Enum.TryParse<DayOfWeek>(values["dayOfWeek"], true, out var targetDay))
        {
            throw new ArgumentException($"Unsupported weekly day '{values["dayOfWeek"]}'.");
        }

        var candidate = new DateTimeOffset(fromUtc.Year, fromUtc.Month, fromUtc.Day, hour, minute, 0, TimeSpan.Zero);
        var daysUntil = ((int)targetDay - (int)candidate.DayOfWeek + 7) % 7;
        candidate = candidate.AddDays(daysUntil);
        return candidate > fromUtc ? candidate : candidate.AddDays(7);
    }
}
