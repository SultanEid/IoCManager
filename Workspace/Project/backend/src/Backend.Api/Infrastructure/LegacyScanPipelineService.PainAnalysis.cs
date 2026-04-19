using Backend.Contracts.V2;

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

        var rows = await GetFilteredIocFindingRowsAsync(
            scannerFamily,
            targetId,
            severity,
            effectiveFrom.UtcDateTime.ToString("O"),
            effectiveTo.UtcDateTime.ToString("O"),
            null,
            null,
            cancellationToken);

        var totalCount = rows.Length;
        var orderedLevels = GetPainLevelDisplayOrder();
        var levels = orderedLevels
            .Select(level =>
            {
                var levelRows = rows
                    .Where(row => string.Equals(row.PainLevel, level, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(row => row.Ioc.TimestampUtc)
                    .ToArray();

                return new LegacyPipelinePainLevelResponse(
                    level,
                    GetPainLevelLabel(level),
                    levelRows.Length,
                    totalCount == 0 ? 0 : Math.Round(levelRows.Length / (double)totalCount, 4),
                    levelRows.Take(6).Select(ToIocFindingResponse).ToArray());
            })
            .ToArray();

        var bucketStart = new DateTimeOffset(effectiveFrom.UtcDateTime.Date, TimeSpan.Zero);
        var finalBucket = new DateTimeOffset(effectiveTo.UtcDateTime.Date, TimeSpan.Zero);
        var trend = new List<LegacyPipelinePainTrendPointResponse>();
        while (bucketStart <= finalBucket)
        {
            var nextBucket = bucketStart.AddDays(1);
            var bucketCounts = orderedLevels.ToDictionary(level => level, _ => 0);

            foreach (var row in rows.Where(row =>
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
