using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    public async Task<LegacyPipelinePainAnalysisResponse> GetPainAnalysisAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        CancellationToken cancellationToken)
    {
        var effectiveTo = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(toUtc) ?? DateTimeOffset.UtcNow;
        var effectiveFrom = LegacyScanPipelineHelpers.ParseOptionalDateTimeOffset(fromUtc) ?? effectiveTo.AddDays(-7);
        if (effectiveFrom > effectiveTo)
        {
            throw new ArgumentException("'fromUtc' must be less than or equal to 'toUtc'.");
        }

        var parsedTargetId = LegacyScanPipelineHelpers.ParseOptionalIntId(targetId, nameof(targetId));
        var normalizedFamily = string.IsNullOrWhiteSpace(scannerFamily)
            ? null
            : LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily).ToUpperInvariant();
        var normalizedSeverity = NormalizeFindingSeverity(LegacyScanPipelineHelpers.CleanOrNull(severity));
        var query = BuildIocFindingBaseQuery(normalizedFamily, effectiveFrom, effectiveTo, null);
        if (parsedTargetId.HasValue)
        {
            var targetIp = await _dbContext.Targets.AsNoTracking()
                .Where(item => item.TargetId == parsedTargetId.Value)
                .Select(item => item.IPAddress)
                .FirstOrDefaultAsync(cancellationToken);

            query = ApplyTargetFilter(query, parsedTargetId.Value, targetIp);
        }

        query = ApplySeverityFilter(query, normalizedSeverity);

        var iocs = await query
            .Include(item => item.ScanResult)
            .Include(item => item.YaraDetail)
            .Include(item => item.SigmaDetail)
            .Include(item => item.NetworkDetail)
            .OrderByDescending(item => item.TimestampUtc)
            .ToArrayAsync(cancellationToken);

        var classifiedRows = iocs
            .Select(ioc =>
            {
                var (indicatorValue, indicatorKind) = ResolveIndicator(ioc);
                return new
                {
                    Ioc = ioc,
                    PainLevel = ResolvePainLevel(ioc, indicatorValue, indicatorKind),
                };
            })
            .ToArray();

        var totalCount = classifiedRows.Length;
        var orderedLevels = GetPainLevelDisplayOrder();
        var previewIocsByLevel = classifiedRows
            .GroupBy(row => row.PainLevel, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyCollection<LegacyPipelineIocEntity>)group
                    .OrderByDescending(row => row.Ioc.TimestampUtc)
                    .Take(6)
                    .Select(row => row.Ioc)
                    .ToArray(),
                StringComparer.OrdinalIgnoreCase);

        var previewRowsByLevel = new Dictionary<string, IReadOnlyList<LegacyPipelineResolvedIocFindingRow>>(StringComparer.OrdinalIgnoreCase);
        foreach (var (level, previewIocs) in previewIocsByLevel)
        {
            previewRowsByLevel[level] = await ResolveIocFindingRowsAsync(previewIocs, cancellationToken);
        }

        var levels = orderedLevels.Select(level =>
        {
            var levelCount = classifiedRows.Count(row => string.Equals(row.PainLevel, level, StringComparison.OrdinalIgnoreCase));
            previewRowsByLevel.TryGetValue(level, out var previewRows);

            return new LegacyPipelinePainLevelResponse(
                level,
                GetPainLevelLabel(level),
                levelCount,
                totalCount == 0 ? 0 : Math.Round(levelCount / (double)totalCount, 4),
                (previewRows ?? []).OrderByDescending(row => row.Ioc.TimestampUtc).Select(ToIocFindingResponse).ToArray());
        }).ToArray();

        var bucketStart = new DateTimeOffset(effectiveFrom.UtcDateTime.Date, TimeSpan.Zero);
        var finalBucket = new DateTimeOffset(effectiveTo.UtcDateTime.Date, TimeSpan.Zero);
        var trend = new List<LegacyPipelinePainTrendPointResponse>();
        while (bucketStart <= finalBucket)
        {
            var nextBucket = bucketStart.AddDays(1);
            var bucketCounts = orderedLevels.ToDictionary(level => level, _ => 0);

            foreach (var row in classifiedRows.Where(row =>
                         row.Ioc.TimestampUtc >= bucketStart.UtcDateTime
                         && row.Ioc.TimestampUtc < nextBucket.UtcDateTime))
            {
                bucketCounts[row.PainLevel] = bucketCounts.GetValueOrDefault(row.PainLevel) + 1;
            }

            trend.Add(new LegacyPipelinePainTrendPointResponse(bucketStart, bucketCounts));
            bucketStart = nextBucket;
        }

        return new LegacyPipelinePainAnalysisResponse(
            effectiveFrom,
            effectiveTo,
            totalCount,
            levels,
            trend);
    }
}
