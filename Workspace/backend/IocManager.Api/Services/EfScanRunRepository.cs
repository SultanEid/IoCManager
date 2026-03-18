using System.Net;
using IocVmwareIngestion.Api.Data;
using IocVmwareIngestion.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IocVmwareIngestion.Api.Services;

public sealed class EfScanRunRepository(IocDbContext dbContext) : IScanRunRepository
{
    private readonly IocDbContext _dbContext = dbContext;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
        if (!canConnect)
        {
            throw new InvalidOperationException("Unable to connect to Azure SQL with the configured EF Core connection.");
        }
    }

    public async Task SaveAsync(ScanRun scanRun, CancellationToken cancellationToken)
    {
        var targetId = await ResolveTargetIdAsync(scanRun, cancellationToken);
        var scanResult = new ScanResultEntity
        {
            NoOfFindings = scanRun.IocRecords.Count,
            JobId = null,
            TargetId = targetId,
            ScannerType = scanRun.ScannerType.ToUpperInvariant(),
            Status = string.IsNullOrWhiteSpace(scanRun.Status) ? null : scanRun.Status,
            StartedAt = scanRun.StartedUtc,
            FinishedAt = scanRun.CompletedUtc ?? scanRun.StartedUtc
        };

        _dbContext.ScanResults.Add(scanResult);
        await _dbContext.SaveChangesAsync(cancellationToken);

        scanRun.ResultId = scanResult.ResultId;

        var entities = new List<IocEntity>(scanRun.IocRecords.Count);

        foreach (var ioc in scanRun.IocRecords)
        {
            var databaseId = Guid.NewGuid();
            var entity = new IocEntity
            {
                Id = databaseId,
                TimestampUtc = ioc.ObservedUtc ?? scanRun.CompletedUtc ?? scanRun.StartedUtc,
                ScannerType = scanRun.ScannerType.ToUpperInvariant(),
                TargetServer = scanRun.TargetServer,
                TargetOsType = scanRun.TargetOsType,
                RuleName = string.IsNullOrWhiteSpace(ioc.RuleName) ? "unknown" : ioc.RuleName,
                RawPayload = ioc.RawPayloadJson,
                FileId = null,
                ResultId = scanResult.ResultId
            };

            if (string.Equals(scanRun.ScannerType, "yara", StringComparison.OrdinalIgnoreCase))
            {
                entity.YaraDetail = new YaraDetailEntity
                {
                    Id = databaseId,
                    FilePath = ioc.IndicatorValue,
                    FileHash = ioc.FileHash
                };
            }
            else if (string.Equals(scanRun.ScannerType, "sigma", StringComparison.OrdinalIgnoreCase))
            {
                entity.SigmaDetail = new SigmaDetailEntity
                {
                    Id = databaseId,
                    LogSource = ioc.LogSource,
                    Severity = ioc.Severity,
                    CommandLine = ioc.CommandLine
                };
            }
            else if (string.Equals(scanRun.ScannerType, "snort", StringComparison.OrdinalIgnoreCase)
                || string.Equals(scanRun.ScannerType, "suricata", StringComparison.OrdinalIgnoreCase))
            {
                entity.NetworkDetail = new NetworkDetailEntity
                {
                    Id = databaseId,
                    SourceIP = ioc.SourceIp,
                    DestIP = ioc.DestinationIp,
                    Protocol = ioc.Protocol,
                    Severity = ioc.Severity,
                    FlowId = long.TryParse(ioc.FlowId, out var flowId) ? flowId : null
                };
            }

            entities.Add(entity);
            ioc.DatabaseId = databaseId;
        }

        if (entities.Count == 0)
        {
            return;
        }

        _dbContext.Iocs.AddRange(entities);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<int?> ResolveTargetIdAsync(ScanRun scanRun, CancellationToken cancellationToken)
    {
        var targetIdentifier = ExtractTargetIdentifier(scanRun);
        if (string.IsNullOrWhiteSpace(targetIdentifier))
        {
            return null;
        }

        return await _dbContext.Targets
            .AsNoTracking()
            .Where(target => target.IPAddress == targetIdentifier)
            .Select(target => (int?)target.TargetId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string? ExtractTargetIdentifier(ScanRun scanRun)
    {
        var candidates = new[]
        {
            scanRun.TargetAddress,
            scanRun.TargetServer,
            scanRun.TargetKey
        };

        foreach (var candidate in candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var trimmed = candidate.Trim();
            var atIndex = trimmed.LastIndexOf('@');
            if (atIndex >= 0 && atIndex < trimmed.Length - 1)
            {
                trimmed = trimmed[(atIndex + 1)..];
            }

            if (IPAddress.TryParse(trimmed, out _))
            {
                return trimmed;
            }
        }

        return null;
    }

    public Task<ScanRun?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        return Task.FromResult<ScanRun?>(null);
    }
}
