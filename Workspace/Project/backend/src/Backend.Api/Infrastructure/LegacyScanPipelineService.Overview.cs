using Backend.Contracts.V2;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public sealed partial class LegacyScanPipelineService
{
    public async Task<LegacyPipelineOverviewSummaryResponse> GetOverviewSummaryAsync(CancellationToken cancellationToken)
    {
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;

        var targetCount = await _dbContext.Targets
            .AsNoTracking()
            .CountAsync(target => !excludedAddresses.Contains(target.IPAddress), cancellationToken);
        var iocCount = await _dbContext.Iocs
            .AsNoTracking()
            .CountAsync(cancellationToken);
        var reportCount = await _dbContext.Reports
            .AsNoTracking()
            .CountAsync(cancellationToken);
        var alertCount = await _ctiDbContext.AlertsV2
            .AsNoTracking()
            .CountAsync(cancellationToken);

        return new LegacyPipelineOverviewSummaryResponse(
            targetCount,
            iocCount,
            reportCount,
            alertCount);
    }
}
