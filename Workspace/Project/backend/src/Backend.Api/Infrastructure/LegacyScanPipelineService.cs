using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Backend.Contracts.V2;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Infrastructure;

public interface ILegacyScanPipelineService
{
    Task<IReadOnlyList<LegacyPipelineNetworkResponse>> ListNetworksAsync(CancellationToken cancellationToken);
    Task<LegacyPipelineNetworkResponse> CreateNetworkAsync(CreateLegacyPipelineNetworkRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineNetworkResponse?> UpdateNetworkAsync(string networkId, UpdateLegacyPipelineNetworkRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineNetworkDeletionResponse?> DeleteNetworkAsync(string networkId, bool force, CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineTargetResponse>> ListTargetsAsync(string? networkId, CancellationToken cancellationToken);
    Task<LegacyPipelineTargetResponse?> UpdateTargetAsync(string targetId, UpdateLegacyPipelineTargetRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineDiscoveryResponse> DiscoverNetworkAsync(string networkId, LegacyPipelineDiscoveryRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineRulePresetResponse>> ListRulePresetsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineScanPlanResponse>> ListPlansAsync(CancellationToken cancellationToken);
    Task<LegacyPipelineScanPlanResponse> CreatePlanAsync(LegacyPipelineScanPlanRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineScanPlanResponse?> UpdatePlanAsync(string planId, LegacyPipelineScanPlanRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineScanPlanResponse?> ClonePlanAsync(string planId, CancellationToken cancellationToken);
    Task<LegacyPipelineScanPlanDeletionResponse?> DeletePlanAsync(string planId, CancellationToken cancellationToken);
    Task<LegacyPipelineScanPlanRunResponse?> RunPlanAsync(string planId, LegacyPipelineScanPlanRunRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineCustomScanResponse> CreateCustomScanAsync(LegacyPipelineCustomScanRequest request, IReadOnlyList<IFormFile> files, IFormFile? pcapFile, CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineScanJobResponse>> ListJobsAsync(CancellationToken cancellationToken);
    Task<LegacyPipelineScanJobResponse?> StopJobAsync(string jobId, CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineScanResultResponse>> ListResultsAsync(
        string? jobId,
        string? targetId,
        int? limit,
        string? scannerFamily,
        string? status,
        bool includeOrphaned,
        CancellationToken cancellationToken);
    Task<LegacyPipelineIocFindingListResponse> ListIocFindingsAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        string? q,
        string? painLevel,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken);
    Task<LegacyPipelineIocFindingDetailResponse?> GetIocFindingDetailAsync(string iocId, CancellationToken cancellationToken);
    Task<LegacyPipelinePainAnalysisResponse> GetPainAnalysisAsync(
        string? scannerFamily,
        string? targetId,
        string? severity,
        string? fromUtc,
        string? toUtc,
        CancellationToken cancellationToken);
    Task<LegacyPipelineOverviewSummaryResponse> GetOverviewSummaryAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<LegacyPipelineReportRecordResponse>> ListReportsAsync(CancellationToken cancellationToken);
    Task<LegacyPipelineReportDetailResponse?> GetReportDetailAsync(string reportId, CancellationToken cancellationToken);
    Task<LegacyPipelineGeneratedReportResponse> GenerateReportAsync(LegacyPipelineGenerateReportRequest request, CancellationToken cancellationToken);
    Task<LegacyPipelineDownloadResult?> ResolveReportDownloadAsync(string reportId, string? format, CancellationToken cancellationToken);
    Task<LegacyPipelineReportDeletionResponse?> DeleteReportAsync(string reportId, CancellationToken cancellationToken);
    Task<int> EnqueueDuePlansAsync(CancellationToken cancellationToken);
    Task<int> ProcessQueuedJobsAsync(CancellationToken cancellationToken);
}

internal sealed record LegacyPipelineResolvedResultRow(
    LegacyPipelineScanResultEntity Result,
    LegacyPipelineTargetEntity? ResolvedTarget,
    int? EffectiveTargetId,
    bool IsOrphaned,
    bool IsResolved,
    string TargetDisplay);

internal sealed record LegacyPipelineResolvedIocFindingRow(
    LegacyPipelineIocEntity Ioc,
    LegacyPipelineTargetEntity? ResolvedTarget,
    int? EffectiveTargetId,
    LegacyPipelineScanResultEntity? ScanResult,
    LegacyPipelineScanJobEntity? ScanJob,
    string TargetDisplay,
    string IndicatorValue,
    string IndicatorKind,
    string PainLevel,
    string Severity);

internal sealed class LegacyPipelineNetworkDeletionBlockedException : InvalidOperationException
{
    public LegacyPipelineNetworkDeletionBlockedException(LegacyPipelineNetworkDeletionBlockedResponse response)
        : base(response.Detail)
    {
        Response = response;
    }

    public LegacyPipelineNetworkDeletionBlockedResponse Response { get; }
}

public sealed partial class LegacyScanPipelineService : ILegacyScanPipelineService
{
    private readonly CtiDbContext _ctiDbContext;
    private readonly LegacyScanPipelineDbContext _dbContext;
    private readonly DiscoveryTargetRangeParser _targetRangeParser;
    private readonly IDiscoveryObservationProvider _discoveryObservationProvider;
    private readonly SqlUserTableDirectoryService _directoryService;
    private readonly LegacyNetworkSshPasswordProtector _sshPasswordProtector;
    private readonly LegacySnortQuarantineSessionManager _snortQuarantineSessionManager;
    private readonly LegacySuricataQuarantineSessionManager _suricataQuarantineSessionManager;
    private readonly IOptionsMonitor<ScanExecutionOptions> _scanExecutionOptions;
    private readonly IOptionsMonitor<LegacyScanPipelineOptions> _pipelineOptions;
    private readonly ILogger<LegacyScanPipelineService> _logger;

    public LegacyScanPipelineService(
        CtiDbContext ctiDbContext,
        LegacyScanPipelineDbContext dbContext,
        DiscoveryTargetRangeParser targetRangeParser,
        IDiscoveryObservationProvider discoveryObservationProvider,
        SqlUserTableDirectoryService directoryService,
        LegacyNetworkSshPasswordProtector sshPasswordProtector,
        LegacySnortQuarantineSessionManager snortQuarantineSessionManager,
        LegacySuricataQuarantineSessionManager suricataQuarantineSessionManager,
        IOptionsMonitor<ScanExecutionOptions> scanExecutionOptions,
        IOptionsMonitor<LegacyScanPipelineOptions> pipelineOptions,
        ILogger<LegacyScanPipelineService> logger)
    {
        _ctiDbContext = ctiDbContext;
        _dbContext = dbContext;
        _targetRangeParser = targetRangeParser;
        _discoveryObservationProvider = discoveryObservationProvider;
        _directoryService = directoryService;
        _sshPasswordProtector = sshPasswordProtector;
        _snortQuarantineSessionManager = snortQuarantineSessionManager;
        _suricataQuarantineSessionManager = suricataQuarantineSessionManager;
        _scanExecutionOptions = scanExecutionOptions;
        _pipelineOptions = pipelineOptions;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LegacyPipelineNetworkResponse>> ListNetworksAsync(CancellationToken cancellationToken)
    {
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var items = await _dbContext.Networks
            .AsNoTracking()
            .Select(network => new
            {
                Network = network,
                TotalTargets = _dbContext.Targets.Count(target => target.NetworkId == network.NetworkId && !excludedAddresses.Contains(target.IPAddress)),
                OnlineTargets = _dbContext.Targets.Count(target => target.NetworkId == network.NetworkId && target.Status == "Online" && !excludedAddresses.Contains(target.IPAddress)),
                LastSweep = _dbContext.Targets.Where(target => target.NetworkId == network.NetworkId && !excludedAddresses.Contains(target.IPAddress)).Max(target => target.LastSweep),
            })
            .OrderBy(item => item.Network.Name)
            .ToArrayAsync(cancellationToken);

        return items
            .Select(item => ToNetworkResponse(item.Network, item.TotalTargets, item.OnlineTargets, item.LastSweep))
            .ToArray();
    }

    public async Task<LegacyPipelineNetworkResponse> CreateNetworkAsync(CreateLegacyPipelineNetworkRequest request, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Name);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.CidrBlock);
        _targetRangeParser.Parse(request.CidrBlock, null, null);
        ValidatePasswordUpdate(request.SshPassword, request.ClearSshPassword);

        var exists = await _dbContext.Networks.AnyAsync(
            network => network.Name == request.Name.Trim() || network.SubNet == request.CidrBlock.Trim(),
            cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("A network with the same name or CIDR already exists.");
        }

        var entity = new LegacyPipelineNetworkEntity
        {
            Name = request.Name.Trim(),
            SubNet = request.CidrBlock.Trim(),
            SshUser = LegacyScanPipelineHelpers.CleanOrNull(request.SshUser),
            SshKeyPath = LegacyScanPipelineHelpers.CleanOrNull(request.SshKeyPath),
            SshPasswordProtected = ProtectPasswordOrNull(request.SshPassword),
            Notes = LegacyScanPipelineHelpers.CleanOrNull(request.Notes),
        };

        _dbContext.Networks.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToNetworkResponse(entity, 0, 0, null);
    }

    public async Task<LegacyPipelineNetworkResponse?> UpdateNetworkAsync(string networkId, UpdateLegacyPipelineNetworkRequest request, CancellationToken cancellationToken)
    {
        var parsedNetworkId = LegacyScanPipelineHelpers.ParseRequiredIntId(networkId, nameof(networkId));
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Name);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.CidrBlock);
        _targetRangeParser.Parse(request.CidrBlock, null, null);
        ValidatePasswordUpdate(request.SshPassword, request.ClearSshPassword);

        var entity = await _dbContext.Networks.FirstOrDefaultAsync(item => item.NetworkId == parsedNetworkId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var duplicateExists = await _dbContext.Networks.AnyAsync(
            network => network.NetworkId != parsedNetworkId
                && (network.Name == request.Name.Trim() || network.SubNet == request.CidrBlock.Trim()),
            cancellationToken);
        if (duplicateExists)
        {
            throw new InvalidOperationException("A network with the same name or CIDR already exists.");
        }

        entity.Name = request.Name.Trim();
        entity.SubNet = request.CidrBlock.Trim();
        entity.SshUser = LegacyScanPipelineHelpers.CleanOrNull(request.SshUser);
        entity.SshKeyPath = LegacyScanPipelineHelpers.CleanOrNull(request.SshKeyPath);
        entity.Notes = LegacyScanPipelineHelpers.CleanOrNull(request.Notes);
        if (request.ClearSshPassword)
        {
            entity.SshPasswordProtected = null;
        }
        else if (!string.IsNullOrWhiteSpace(request.SshPassword))
        {
            entity.SshPasswordProtected = ProtectPasswordOrNull(request.SshPassword);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var counts = await _dbContext.Targets
            .Where(target => target.NetworkId == parsedNetworkId && !excludedAddresses.Contains(target.IPAddress))
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalTargets = group.Count(),
                OnlineTargets = group.Count(target => target.Status == "Online"),
                LastSweep = group.Max(target => target.LastSweep),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return ToNetworkResponse(entity, counts?.TotalTargets ?? 0, counts?.OnlineTargets ?? 0, counts?.LastSweep);
    }

    private LegacyPipelineNetworkResponse ToNetworkResponse(LegacyPipelineNetworkEntity entity, int totalTargets, int onlineTargets, DateTime? lastSweep)
        => new(
            entity.NetworkId.ToString(CultureInfo.InvariantCulture),
            entity.Name,
            entity.SubNet,
            entity.SshUser,
            entity.SshKeyPath,
            !string.IsNullOrWhiteSpace(entity.SshPasswordProtected),
            entity.Notes,
            totalTargets,
            onlineTargets,
            LegacyScanPipelineHelpers.ToDateTimeOffset(lastSweep));

    private string? ProtectPasswordOrNull(string? password)
    {
        var cleaned = LegacyScanPipelineHelpers.CleanOrNull(password);
        return string.IsNullOrWhiteSpace(cleaned) ? null : _sshPasswordProtector.Protect(cleaned);
    }

    private static void ValidatePasswordUpdate(string? sshPassword, bool clearSshPassword)
    {
        if (!string.IsNullOrWhiteSpace(sshPassword) && clearSshPassword)
        {
            throw new ArgumentException("Provide either sshPassword or clearSshPassword, not both.");
        }
    }

    public async Task<LegacyPipelineNetworkDeletionResponse?> DeleteNetworkAsync(string networkId, bool force, CancellationToken cancellationToken)
    {
        var parsedNetworkId = LegacyScanPipelineHelpers.ParseRequiredIntId(networkId, nameof(networkId));
        var network = await _dbContext.Networks.FirstOrDefaultAsync(item => item.NetworkId == parsedNetworkId, cancellationToken);
        if (network is null)
        {
            return null;
        }

        var targets = await _dbContext.Targets
            .Where(item => item.NetworkId == parsedNetworkId)
            .ToArrayAsync(cancellationToken);
        var targetIds = targets.Select(item => item.TargetId).Distinct().ToArray();

        var scanPlans = await _dbContext.ScanPlans.ToArrayAsync(cancellationToken);
        var dependentPlans = scanPlans
            .Where(plan =>
            {
                var scope = LegacyScanPipelineSerializer.DeserializeTargetScope(plan.TargetScopeJson);
                return ScopeReferencesNetworkOrTargets(scope?.NetworkIds, scope?.TargetIds, parsedNetworkId, targetIds);
            })
            .ToArray();
        var dependentPlanIds = dependentPlans.Select(item => item.PlanId).ToHashSet();

        var scanJobs = await _dbContext.ScanJobs.ToArrayAsync(cancellationToken);
        var dependentJobs = scanJobs
            .Where(job =>
            {
                if (job.PlanId.HasValue && dependentPlanIds.Contains(job.PlanId.Value))
                {
                    return true;
                }

                var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson);
                return ScopeReferencesNetworkOrTargets(scope?.NetworkIds, scope?.TargetIds, parsedNetworkId, targetIds);
            })
            .ToArray();
        var dependentJobIds = dependentJobs.Select(item => item.JobId).ToHashSet();
        var dependentJobIdValues = dependentJobIds.ToArray();

        var reportsCount = await _dbContext.Reports.AsNoTracking()
            .CountAsync(item => item.NetworkId == parsedNetworkId, cancellationToken);

        var resultHistoryCount = targetIds.Length == 0
            ? 0
            : await _dbContext.ScanResults.AsNoTracking()
                .CountAsync(item => item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value), cancellationToken);

        var reportTargetHistoryCount = targetIds.Length == 0
            ? 0
            : await _dbContext.Reports.AsNoTracking()
                .CountAsync(item => item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value), cancellationToken);

        var blockers = BuildDeletionBlockers(dependentPlans.Length, dependentJobs.Length, reportsCount, resultHistoryCount + reportTargetHistoryCount);
        if (blockers.Count > 0)
        {
            if (!force)
            {
                throw new LegacyPipelineNetworkDeletionBlockedException(
                    new LegacyPipelineNetworkDeletionBlockedResponse(
                        "Subnet deletion blocked",
                        $"'{network.Name}' cannot be deleted because stored pipeline data still depends on it.",
                        StatusCodes.Status409Conflict,
                        network.NetworkId.ToString(CultureInfo.InvariantCulture),
                        network.Name,
                    targets.Length,
                    blockers));
            }

            var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
            var detachedResults = 0;
            var detachedReports = 0;

            await executionStrategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

                var resultsToDetach = dependentJobIdValues.Length == 0 && targetIds.Length == 0
                    ? Array.Empty<LegacyPipelineScanResultEntity>()
                    : await _dbContext.ScanResults
                        .Where(item =>
                            (item.JobId.HasValue && dependentJobIdValues.Contains(item.JobId.Value)) ||
                            (item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value)))
                        .ToArrayAsync(cancellationToken);
                detachedResults = 0;
                foreach (var result in resultsToDetach)
                {
                    var changed = false;
                    if (result.TargetId.HasValue && targetIds.Contains(result.TargetId.Value))
                    {
                        result.TargetId = null;
                        changed = true;
                    }

                    if (result.JobId.HasValue && dependentJobIds.Contains(result.JobId.Value))
                    {
                        result.JobId = null;
                        changed = true;
                    }

                    if (changed)
                    {
                        detachedResults++;
                    }
                }

                var reportsToDetach = await _dbContext.Reports
                    .Where(item =>
                        item.NetworkId == parsedNetworkId ||
                        (item.TargetId.HasValue && targetIds.Contains(item.TargetId.Value)) ||
                        (item.JobId.HasValue && dependentJobIdValues.Contains(item.JobId.Value)))
                    .ToArrayAsync(cancellationToken);
                detachedReports = 0;
                foreach (var report in reportsToDetach)
                {
                    var changed = false;
                    if (report.NetworkId == parsedNetworkId)
                    {
                        report.NetworkId = null;
                        changed = true;
                    }

                    if (report.TargetId.HasValue && targetIds.Contains(report.TargetId.Value))
                    {
                        report.TargetId = null;
                        changed = true;
                    }

                    if (report.JobId.HasValue && dependentJobIds.Contains(report.JobId.Value))
                    {
                        report.JobId = null;
                        changed = true;
                    }

                    if (changed)
                    {
                        detachedReports++;
                    }
                }

                await _dbContext.SaveChangesAsync(cancellationToken);

                if (dependentJobs.Length > 0)
                {
                    _dbContext.ScanJobs.RemoveRange(dependentJobs);
                }

                if (dependentPlans.Length > 0)
                {
                    _dbContext.ScanPlans.RemoveRange(dependentPlans);
                }

                if (targets.Length > 0)
                {
                    _dbContext.Targets.RemoveRange(targets);
                }

                _dbContext.Networks.Remove(network);
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });

            return new LegacyPipelineNetworkDeletionResponse(
                network.NetworkId.ToString(CultureInfo.InvariantCulture),
                network.Name,
                targets.Length,
                true,
                dependentPlans.Length,
                dependentJobs.Length,
                detachedResults,
                detachedReports);
        }

        if (targets.Length > 0)
        {
            _dbContext.Targets.RemoveRange(targets);
        }

        _dbContext.Networks.Remove(network);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LegacyPipelineNetworkDeletionResponse(
            network.NetworkId.ToString(CultureInfo.InvariantCulture),
            network.Name,
            targets.Length,
            false,
            0,
            0,
            0,
            0);
    }

    public async Task<IReadOnlyList<LegacyPipelineTargetResponse>> ListTargetsAsync(string? networkId, CancellationToken cancellationToken)
    {
        var parsedNetworkId = LegacyScanPipelineHelpers.ParseOptionalIntId(networkId, nameof(networkId));
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var query =
            from target in _dbContext.Targets.AsNoTracking()
            join network in _dbContext.Networks.AsNoTracking() on target.NetworkId equals network.NetworkId into networkJoin
            from network in networkJoin.DefaultIfEmpty()
            where !excludedAddresses.Contains(target.IPAddress)
            select new { Target = target, Network = network };

        if (parsedNetworkId.HasValue)
        {
            query = query.Where(item => item.Target.NetworkId == parsedNetworkId.Value);
        }

        var items = await query
            .OrderBy(item => item.Network == null ? string.Empty : item.Network.Name)
            .ThenBy(item => item.Target.IPAddress)
            .ToArrayAsync(cancellationToken);

        return items.Select(item => LegacyScanPipelineHelpers.ToTargetResponse(item.Target, item.Network)).ToArray();
    }

    public async Task<LegacyPipelineTargetResponse?> UpdateTargetAsync(string targetId, UpdateLegacyPipelineTargetRequest request, CancellationToken cancellationToken)
    {
        var parsedTargetId = LegacyScanPipelineHelpers.ParseRequiredIntId(targetId, nameof(targetId));
        var excludedAddresses = LegacyScanPipelineHelpers.ExcludedTargetAddresses;
        var target = await _dbContext.Targets
            .Include(item => item.Network)
            .FirstOrDefaultAsync(item => item.TargetId == parsedTargetId && !excludedAddresses.Contains(item.IPAddress), cancellationToken);
        if (target is null)
        {
            return null;
        }

        target.DisplayName = LegacyScanPipelineHelpers.CleanOrNull(request.DisplayName);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return LegacyScanPipelineHelpers.ToTargetResponse(target, target.Network);
    }

    public async Task<LegacyPipelineDiscoveryResponse> DiscoverNetworkAsync(string networkId, LegacyPipelineDiscoveryRequest request, CancellationToken cancellationToken)
    {
        var parsedNetworkId = LegacyScanPipelineHelpers.ParseRequiredIntId(networkId, nameof(networkId));
        var network = await _dbContext.Networks.FirstOrDefaultAsync(x => x.NetworkId == parsedNetworkId, cancellationToken)
            ?? throw new KeyNotFoundException("Network was not found.");

        var range = _targetRangeParser.Parse(network.SubNet, request.RangeStartIp, request.RangeEndIp);
        var observations = await _discoveryObservationProvider.ObserveAsync(range, cancellationToken);
        var nowUtc = DateTimeOffset.UtcNow;
        var excludedAddresses = new HashSet<string>(
            range.ExcludedTargets.Select(ip => ip.ToString()).Concat(LegacyScanPipelineHelpers.ExcludedTargetAddresses),
            StringComparer.OrdinalIgnoreCase);

        var existingTargetsByAddress = await _dbContext.Targets
            .Where(target => !excludedAddresses.Contains(target.IPAddress))
            .ToDictionaryAsync(target => target.IPAddress, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var existingNetworkTargets = existingTargetsByAddress.Values
            .Where(target => target.NetworkId == parsedNetworkId)
            .ToDictionary(target => target.IPAddress, StringComparer.OrdinalIgnoreCase);
        var requestedTargetAddresses = range.Targets
            .Select(ip => ip.ToString())
            .Where(ip => !excludedAddresses.Contains(ip))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var reachableObservations = observations
            .Where(observation =>
                observation.Reachability == Backend.Domain.IocManager.DiscoveredHostReachability.Reachable
                && !excludedAddresses.Contains(observation.IpAddress))
            .ToArray();

        var seenAddresses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var observation in reachableObservations)
        {
            // Discovery providers can emit duplicate observations for the same IP in one run.
            if (!seenAddresses.Add(observation.IpAddress))
            {
                continue;
            }

            if (existingTargetsByAddress.TryGetValue(observation.IpAddress, out var target))
            {
                if (target.NetworkId != parsedNetworkId)
                {
                    _logger.LogWarning(
                        "Discovery skipped IP {IpAddress} for network {NetworkId} because the target already belongs to network {ExistingNetworkId}.",
                        observation.IpAddress,
                        parsedNetworkId,
                        target.NetworkId);
                    continue;
                }

                target.HostName = LegacyScanPipelineHelpers.CleanOrNull(observation.Hostname);
                target.TargetOsType = LegacyScanPipelineHelpers.NormalizeStoredTargetOs(observation.TargetOsType) ?? target.TargetOsType;
                target.Status = "Online";
                target.LastSweep = nowUtc.UtcDateTime;
                existingNetworkTargets[target.IPAddress] = target;
                continue;
            }

            var createdTarget = new LegacyPipelineTargetEntity
            {
                HostName = LegacyScanPipelineHelpers.CleanOrNull(observation.Hostname),
                IPAddress = observation.IpAddress,
                Status = "Online",
                TargetOsType = LegacyScanPipelineHelpers.NormalizeStoredTargetOs(observation.TargetOsType),
                NetworkId = parsedNetworkId,
                LastSweep = nowUtc.UtcDateTime,
            };

            _dbContext.Targets.Add(createdTarget);
            existingTargetsByAddress[createdTarget.IPAddress] = createdTarget;
            existingNetworkTargets[createdTarget.IPAddress] = createdTarget;
        }

        if (reachableObservations.Length == 0 && range.Targets.Count == 1)
        {
            var requestedAddress = range.Targets[0].ToString();
            if (!excludedAddresses.Contains(requestedAddress))
            {
                if (existingTargetsByAddress.TryGetValue(requestedAddress, out var target))
                {
                    if (target.NetworkId == parsedNetworkId)
                    {
                        target.Status = "Offline";
                        target.LastSweep = nowUtc.UtcDateTime;
                        existingNetworkTargets[target.IPAddress] = target;
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Discovery skipped unresolved IP {IpAddress} for network {NetworkId} because the target already belongs to network {ExistingNetworkId}.",
                            requestedAddress,
                            parsedNetworkId,
                            target.NetworkId);
                    }
                }
                else
                {
                    var createdUnreachableTarget = new LegacyPipelineTargetEntity
                    {
                        IPAddress = requestedAddress,
                        Status = "Offline",
                        NetworkId = parsedNetworkId,
                        LastSweep = nowUtc.UtcDateTime,
                    };

                    _dbContext.Targets.Add(createdUnreachableTarget);
                    existingTargetsByAddress[createdUnreachableTarget.IPAddress] = createdUnreachableTarget;
                    existingNetworkTargets[createdUnreachableTarget.IPAddress] = createdUnreachableTarget;
                }
            }
        }

        var offlineCount = 0;
        foreach (var existing in existingNetworkTargets.Values)
        {
            if (requestedTargetAddresses.Contains(existing.IPAddress) && !seenAddresses.Contains(existing.IPAddress))
            {
                existing.Status = "Offline";
                existing.LastSweep = nowUtc.UtcDateTime;
                offlineCount++;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var totalHosts = range.Targets.Count(ip => !excludedAddresses.Contains(ip.ToString()));

        return new LegacyPipelineDiscoveryResponse(
            network.NetworkId.ToString(CultureInfo.InvariantCulture),
            network.Name,
            range.RequestedCidr,
            totalHosts,
            reachableObservations.Length,
            offlineCount,
            nowUtc);
    }

    public Task<IReadOnlyList<LegacyPipelineRulePresetResponse>> ListRulePresetsAsync(CancellationToken cancellationToken)
    {
        var presets = _pipelineOptions.CurrentValue.RulePathPresets
            .OrderBy(item => item.Key)
            .Select(item => new LegacyPipelineRulePresetResponse(item.Key, item.Value.ToArray()))
            .ToArray();
        return Task.FromResult<IReadOnlyList<LegacyPipelineRulePresetResponse>>(presets);
    }

    public async Task<IReadOnlyList<LegacyPipelineScanPlanResponse>> ListPlansAsync(CancellationToken cancellationToken)
    {
        var plans = await _dbContext.ScanPlans.AsNoTracking().OrderBy(plan => plan.Name).ToArrayAsync(cancellationToken);
        var networkLookup = await _dbContext.Networks.AsNoTracking().ToDictionaryAsync(item => item.NetworkId, cancellationToken);
        var targetLookup = await _dbContext.Targets.AsNoTracking().ToDictionaryAsync(item => item.TargetId, cancellationToken);
        return plans.Select(plan => ToPlanResponse(plan, networkLookup, targetLookup)).ToArray();
    }

    public async Task<LegacyPipelineScanPlanResponse> CreatePlanAsync(LegacyPipelineScanPlanRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = await ResolveActorUserIdAsync(request.ActorUserId, cancellationToken);
        var targetScope = await BuildTargetScopeAsync(request.NetworkIds, request.TargetIds, cancellationToken);
        var resolvedTargets = await ResolveTargetsForScopeAsync(targetScope.NetworkIds, targetScope.TargetIds, cancellationToken);
        ValidateTargetCount(resolvedTargets.Count);
        var nowUtc = DateTimeOffset.UtcNow;
        var status = LegacyScanPipelineHelpers.NormalizePlanStatus(request.Status);
        var scheduleType = LegacyScanPipelineHelpers.NormalizeScheduleType(request.ScheduleType);
        var scheduleValues = NormalizeScheduleValues(scheduleType, request.Schedule);

        var options = LegacyScanPipelineHelpers.NormalizeOptions(request.Options);
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            options["notes"] = request.Notes.Trim();
        }
        var validatedPlan = await ValidateAndNormalizePlanDefinitionAsync(
            request.ScannerFamilies,
            request.RulePathsByFamily,
            options,
            resolvedTargets,
            cancellationToken);

        var entity = new LegacyPipelineScanPlanEntity
        {
            Name = request.Name.Trim(),
            ScannerConfigJson = JsonSerializer.Serialize(
                BuildStoredPlanConfig(validatedPlan.ScannerFamilies, validatedPlan.RulePathsByFamily, validatedPlan.Options),
                LegacyScanPipelineSerializer.JsonOptions),
            CreatedAt = nowUtc.UtcDateTime,
            CreatedByUserId = actorUserId,
            TargetScopeJson = JsonSerializer.Serialize(targetScope, LegacyScanPipelineSerializer.JsonOptions),
            Status = status,
            ScheduleType = scheduleType,
            ScheduleJson = JsonSerializer.Serialize(new LegacyPipelineSchedule(scheduleType, scheduleValues), LegacyScanPipelineSerializer.JsonOptions),
            NextRunAt = status == "Active" ? ComputeNextRunUtc(nowUtc, scheduleType, scheduleValues)?.UtcDateTime : null,
            UpdatedAt = nowUtc.UtcDateTime,
        };

        _dbContext.ScanPlans.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return (await GetPlanResponseAsync(entity.PlanId, cancellationToken))!;
    }

    public async Task<LegacyPipelineScanPlanResponse?> UpdatePlanAsync(string planId, LegacyPipelineScanPlanRequest request, CancellationToken cancellationToken)
    {
        var parsedPlanId = LegacyScanPipelineHelpers.ParseRequiredIntId(planId, nameof(planId));
        var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(item => item.PlanId == parsedPlanId, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        var targetScope = await BuildTargetScopeAsync(request.NetworkIds, request.TargetIds, cancellationToken);
        var resolvedTargets = await ResolveTargetsForScopeAsync(targetScope.NetworkIds, targetScope.TargetIds, cancellationToken);
        ValidateTargetCount(resolvedTargets.Count);
        var nowUtc = DateTimeOffset.UtcNow;
        var status = LegacyScanPipelineHelpers.NormalizePlanStatus(request.Status);
        var scheduleType = LegacyScanPipelineHelpers.NormalizeScheduleType(request.ScheduleType);
        var scheduleValues = NormalizeScheduleValues(scheduleType, request.Schedule);
        var options = LegacyScanPipelineHelpers.NormalizeOptions(request.Options);
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            options["notes"] = request.Notes.Trim();
        }
        var validatedPlan = await ValidateAndNormalizePlanDefinitionAsync(
            request.ScannerFamilies,
            request.RulePathsByFamily,
            options,
            resolvedTargets,
            cancellationToken);

        plan.Name = request.Name.Trim();
        plan.ScannerConfigJson = JsonSerializer.Serialize(
            BuildStoredPlanConfig(validatedPlan.ScannerFamilies, validatedPlan.RulePathsByFamily, validatedPlan.Options),
            LegacyScanPipelineSerializer.JsonOptions);
        plan.TargetScopeJson = JsonSerializer.Serialize(targetScope, LegacyScanPipelineSerializer.JsonOptions);
        plan.Status = status;
        plan.ScheduleType = scheduleType;
        plan.ScheduleJson = JsonSerializer.Serialize(new LegacyPipelineSchedule(scheduleType, scheduleValues), LegacyScanPipelineSerializer.JsonOptions);
        plan.NextRunAt = status == "Active" ? ComputeNextRunUtc(nowUtc, scheduleType, scheduleValues)?.UtcDateTime : null;
        plan.UpdatedAt = nowUtc.UtcDateTime;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetPlanResponseAsync(parsedPlanId, cancellationToken);
    }

    public async Task<LegacyPipelineScanPlanResponse?> ClonePlanAsync(string planId, CancellationToken cancellationToken)
    {
        var parsedPlanId = LegacyScanPipelineHelpers.ParseRequiredIntId(planId, nameof(planId));
        var plan = await _dbContext.ScanPlans.AsNoTracking().FirstOrDefaultAsync(item => item.PlanId == parsedPlanId, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var clone = new LegacyPipelineScanPlanEntity
        {
            Name = $"{plan.Name ?? "Unnamed Plan"} (Copy)",
            ScannerConfigJson = plan.ScannerConfigJson,
            CreatedAt = nowUtc.UtcDateTime,
            CreatedByUserId = plan.CreatedByUserId,
            TargetScopeJson = plan.TargetScopeJson,
            Status = "Draft",
            ScheduleType = plan.ScheduleType,
            ScheduleJson = plan.ScheduleJson,
            NextRunAt = null,
            LastRunAt = null,
            UpdatedAt = nowUtc.UtcDateTime,
        };

        _dbContext.ScanPlans.Add(clone);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetPlanResponseAsync(clone.PlanId, cancellationToken);
    }

    public async Task<LegacyPipelineScanPlanDeletionResponse?> DeletePlanAsync(string planId, CancellationToken cancellationToken)
    {
        var parsedPlanId = LegacyScanPipelineHelpers.ParseRequiredIntId(planId, nameof(planId));
        var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(item => item.PlanId == parsedPlanId, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        var linkedJobs = await _dbContext.ScanJobs.Where(item => item.PlanId == parsedPlanId).ToArrayAsync(cancellationToken);
        foreach (var job in linkedJobs)
        {
            job.PlanId = null;
        }

        _dbContext.ScanPlans.Remove(plan);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new LegacyPipelineScanPlanDeletionResponse(
            parsedPlanId.ToString(CultureInfo.InvariantCulture),
            plan.Name ?? "Unnamed Plan",
            linkedJobs.Length);
    }

    public async Task<LegacyPipelineScanPlanRunResponse?> RunPlanAsync(string planId, LegacyPipelineScanPlanRunRequest request, CancellationToken cancellationToken)
    {
        var parsedPlanId = LegacyScanPipelineHelpers.ParseRequiredIntId(planId, nameof(planId));
        var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(item => item.PlanId == parsedPlanId, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        var actorUserId = await ResolveActorUserIdAsync(request.ActorUserId, cancellationToken);
        var jobs = await QueuePlanJobsAsync(plan, actorUserId, "PlanManualRun", DateTimeOffset.UtcNow, cancellationToken);
        return new LegacyPipelineScanPlanRunResponse(
            jobs[0].BatchId?.ToString("D") ?? Guid.Empty.ToString("D"),
            plan.PlanId.ToString(CultureInfo.InvariantCulture),
            jobs.Select(job =>
            {
                var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson);
                return ToJobResponse(job, scope?.TargetIds ?? [], []);
            }).ToArray());
    }

    public async Task<LegacyPipelineCustomScanResponse> CreateCustomScanAsync(LegacyPipelineCustomScanRequest request, IReadOnlyList<IFormFile> files, IFormFile? pcapFile, CancellationToken cancellationToken)
    {
        var actorUserId = await ResolveActorUserIdAsync(request.ActorUserId, cancellationToken);
        var normalizedFamilies = request.ScannerFamilies.Select(LegacyScanPipelineHelpers.NormalizeScannerFamily).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (normalizedFamilies.Length == 0)
        {
            throw new ArgumentException("At least one scanner family is required.");
        }

        if (normalizedFamilies.Contains("snort", StringComparer.OrdinalIgnoreCase)
            && normalizedFamilies.Contains("suricata", StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Choose either Snort or Suricata for a network scan run, not both.");
        }

        var options = LegacyScanPipelineHelpers.NormalizeOptions(request.Options);
        var snortMode = normalizedFamilies.Contains("snort", StringComparer.OrdinalIgnoreCase)
            ? LegacyScanPipelineHelpers.NormalizeSnortMode(LegacyScanPipelineHelpers.GetOption(options, LegacyScanPipelineHelpers.SnortModeOptionKey))
            : null;
        var suricataMode = normalizedFamilies.Contains("suricata", StringComparer.OrdinalIgnoreCase)
            ? LegacyScanPipelineHelpers.NormalizeSuricataMode(LegacyScanPipelineHelpers.GetOption(options, LegacyScanPipelineHelpers.SuricataModeOptionKey))
            : null;
        if (snortMode is not null && snortMode != "hunt" && normalizedFamilies.Length > 1)
        {
            throw new ArgumentException("Snort Quarantine and PCAP modes must be queued on their own in v1.");
        }

        if (suricataMode is not null && suricataMode != "hunt" && normalizedFamilies.Length > 1)
        {
            throw new ArgumentException("Suricata Quarantine and PCAP modes must be queued on their own in v1.");
        }

        var targetScope = await BuildTargetScopeAsync(request.NetworkIds, request.TargetIds, cancellationToken);
        var resolvedTargets = await ResolveTargetsForScopeAsync(targetScope.NetworkIds, targetScope.TargetIds, cancellationToken);
        ValidateTargetCount(resolvedTargets.Count);
        var ruleInputMode = LegacyScanPipelineHelpers.NormalizeRuleInputMode(request.RuleInputMode);
        var normalizedTargetOsOverrides = NormalizeTargetOsOverrides(request.TargetOsOverrides);
        var requestedRulePathsByFamily = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        if (request.RulePathsByFamily is not null)
        {
            foreach (var pair in request.RulePathsByFamily)
            {
                var normalizedFamily = LegacyScanPipelineHelpers.NormalizeScannerFamily(pair.Key);
                requestedRulePathsByFamily[normalizedFamily] = LegacyScanPipelineHelpers.CleanOrNull(pair.Value);
            }
        }

        Dictionary<string, string?> stagedPathsByFamily;
        Dictionary<string, string[]> stagedRuleFilesByFamily;
        string? tempDirectory = null;
        string? stagedPcapPath = null;
        if (string.Equals(ruleInputMode, "hostPath", StringComparison.OrdinalIgnoreCase))
        {
            stagedPathsByFamily = normalizedFamilies.ToDictionary(
                family => family,
                family =>
                {
                    requestedRulePathsByFamily.TryGetValue(family, out var familyRulePath);
                    return (string?)LegacyScanPipelineHelpers.ResolveRulePath(family, familyRulePath ?? request.RulePath, null);
                },
                StringComparer.OrdinalIgnoreCase);
            stagedRuleFilesByFamily = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            var stageResult = await StageUploadedRulesAsync(normalizedFamilies, files, cancellationToken);
            tempDirectory = stageResult.TempDirectory;
            stagedPathsByFamily = stageResult.RulePathsByFamily;
            stagedRuleFilesByFamily = stageResult.RuleFilesByFamily;
            stagedPcapPath = ResolveUploadedPcapPath(stageResult.ExtractedFiles);
        }

        if (pcapFile is not null)
        {
            if (!LegacyScanPipelineHelpers.IsAllowedPcapPath(pcapFile.FileName))
            {
                throw new ArgumentException("Network PCAP uploads must use a .pcap or .pcapng extension.");
            }

            tempDirectory ??= Path.Combine(LegacyScanPipelineHelpers.EnsureDirectory(_pipelineOptions.CurrentValue.TempRuleRootDirectory), Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDirectory);
            stagedPcapPath = Path.Combine(tempDirectory, $"{Guid.NewGuid():N}{Path.GetExtension(pcapFile.FileName)}");
            await using var pcapOutput = File.Create(stagedPcapPath);
            await pcapFile.CopyToAsync(pcapOutput, cancellationToken);
        }

        foreach (var family in normalizedFamilies)
        {
            options = await NormalizeCustomScanOptionsAsync(
                family,
                resolvedTargets,
                options,
                normalizedTargetOsOverrides,
                stagedPathsByFamily[family],
                stagedRuleFilesByFamily.TryGetValue(family, out var stagedRuleFiles) ? stagedRuleFiles : null,
                stagedPcapPath,
                cancellationToken);
        }
        var nowUtc = DateTimeOffset.UtcNow;
        var batchId = Guid.NewGuid();
        var jobs = new List<LegacyPipelineScanJobResponse>(normalizedFamilies.Length);
        foreach (var family in normalizedFamilies)
        {
            var scope = new LegacyPipelineExecutionScope(
                family,
                ruleInputMode,
                ruleInputMode == "hostPath" ? stagedPathsByFamily[family] : null,
                ruleInputMode == "hostPath" ? null : stagedPathsByFamily[family],
                tempDirectory,
                targetScope.NetworkIds,
                targetScope.TargetIds,
                options);

            var job = new LegacyPipelineScanJobEntity
            {
                Status = "Queued",
                TriggeredByUserId = actorUserId,
                ExecutionScopeJson = JsonSerializer.Serialize(scope, LegacyScanPipelineSerializer.JsonOptions),
                QueuedAt = nowUtc.UtcDateTime,
                TriggerType = "Manual",
                BatchId = batchId,
                Summary = $"Queued custom {family.ToUpperInvariant()} scan across {resolvedTargets.Count} targets.",
            };

            _dbContext.ScanJobs.Add(job);
            await _dbContext.SaveChangesAsync(cancellationToken);
            jobs.Add(ToJobResponse(job, resolvedTargets.Select(item => item.TargetId).ToArray(), []));
        }

        return new LegacyPipelineCustomScanResponse(batchId.ToString("D"), jobs);
    }

    public async Task<IReadOnlyList<LegacyPipelineScanJobResponse>> ListJobsAsync(CancellationToken cancellationToken)
    {
        var jobs = await _dbContext.ScanJobs
            .AsNoTracking()
            .OrderByDescending(job => job.QueuedAt)
            .Take(100)
            .ToArrayAsync(cancellationToken);

        var resultsByJob = await _dbContext.ScanResults.AsNoTracking()
            .Where(result => result.JobId.HasValue)
            .GroupBy(result => result.JobId!.Value)
            .ToDictionaryAsync(group => group.Key, group => group.ToArray(), cancellationToken);

        return jobs.Select(job =>
        {
            var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson);
            return ToJobResponse(job, scope?.TargetIds ?? [], resultsByJob.TryGetValue(job.JobId, out var results) ? results : []);
        }).ToArray();
    }

    public async Task<LegacyPipelineScanJobResponse?> StopJobAsync(string jobId, CancellationToken cancellationToken)
    {
        var parsedJobId = LegacyScanPipelineHelpers.ParseRequiredIntId(jobId, nameof(jobId));
        var job = await _dbContext.ScanJobs.FirstOrDefaultAsync(item => item.JobId == parsedJobId, cancellationToken);
        if (job is null)
        {
            return null;
        }

        var scope = LegacyScanPipelineSerializer.DeserializeExecutionScope(job.ExecutionScopeJson);
        if (scope is null
            || !(string.Equals(scope.ScannerFamily, "snort", StringComparison.OrdinalIgnoreCase)
                || string.Equals(scope.ScannerFamily, "suricata", StringComparison.OrdinalIgnoreCase))
            || !string.Equals(LegacyScanPipelineHelpers.ResolveExecutionMode(scope.ScannerFamily, scope.Options), "quarantine", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Only running Snort or Suricata Quarantine jobs can be stopped.");
        }

        if (!string.Equals(job.Status, "Running", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This job is not currently running.");
        }

        if (string.Equals(scope.ScannerFamily, "suricata", StringComparison.OrdinalIgnoreCase))
        {
            await _suricataQuarantineSessionManager.StopAsync(parsedJobId, cancellationToken);
        }
        else
        {
            await _snortQuarantineSessionManager.StopAsync(parsedJobId, cancellationToken);
        }

        var refreshedJob = await _dbContext.ScanJobs.AsNoTracking().FirstOrDefaultAsync(item => item.JobId == parsedJobId, cancellationToken)
            ?? throw new InvalidOperationException("Stopped job could not be reloaded.");
        var jobResults = await _dbContext.ScanResults.AsNoTracking().Where(item => item.JobId == parsedJobId).ToArrayAsync(cancellationToken);
        return ToJobResponse(refreshedJob, scope.TargetIds, jobResults);
    }

    public async Task<IReadOnlyList<LegacyPipelineScanResultResponse>> ListResultsAsync(
        string? jobId,
        string? targetId,
        int? limit,
        string? scannerFamily,
        string? status,
        bool includeOrphaned,
        CancellationToken cancellationToken)
    {
        var parsedJobId = LegacyScanPipelineHelpers.ParseOptionalIntId(jobId, nameof(jobId));
        var parsedTargetId = LegacyScanPipelineHelpers.ParseOptionalIntId(targetId, nameof(targetId));
        var parsedLimit = limit is null
            ? (int?)null
            : limit.Value > 0
                ? limit.Value
                : throw new ArgumentException("'limit' must be greater than zero.");
        var normalizedFamily = string.IsNullOrWhiteSpace(scannerFamily)
            ? null
            : LegacyScanPipelineHelpers.NormalizeScannerFamily(scannerFamily).ToUpperInvariant();
        var normalizedStatus = LegacyScanPipelineHelpers.CleanOrNull(status);
        var query = _dbContext.ScanResults.AsNoTracking().AsQueryable();
        if (parsedJobId.HasValue)
        {
            query = query.Where(item => item.JobId == parsedJobId.Value);
        }

        var results = await query
            .OrderByDescending(item => item.FinishedAt ?? item.StartedAt)
            .Take(250)
            .ToArrayAsync(cancellationToken);

        if (results.Length == 0)
        {
            return [];
        }

        var targetIds = results.Where(item => item.TargetId.HasValue).Select(item => item.TargetId!.Value).Distinct().ToArray();
        var targetLookup = await _dbContext.Targets.AsNoTracking()
            .Where(item => targetIds.Contains(item.TargetId))
            .ToDictionaryAsync(item => item.TargetId, cancellationToken);

        var resultIdsNeedingResolution = results
            .Where(item => !item.TargetId.HasValue)
            .Select(item => item.ResultId)
            .Distinct()
            .ToArray();
        var iocsByResultId = resultIdsNeedingResolution.Length == 0
            ? new Dictionary<int, LegacyPipelineIocEntity[]>()
            : await _dbContext.Iocs.AsNoTracking()
                .Where(item => item.ResultId.HasValue && resultIdsNeedingResolution.Contains(item.ResultId.Value))
                .GroupBy(item => item.ResultId!.Value)
                .ToDictionaryAsync(group => group.Key, group => group.ToArray(), cancellationToken);

        var targetsByIp = await _dbContext.Targets.AsNoTracking()
            .Where(item => !LegacyScanPipelineHelpers.ExcludedTargetAddresses.Contains(item.IPAddress))
            .ToDictionaryAsync(item => item.IPAddress, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var resolvedRows = results
            .Select(result => ResolveResultRow(result, targetLookup, iocsByResultId, targetsByIp))
            .Where(row => includeOrphaned || row.IsResolved)
            .Where(row => normalizedFamily is null || string.Equals(row.Result.ScannerType, normalizedFamily, StringComparison.OrdinalIgnoreCase))
            .Where(row => normalizedStatus is null || string.Equals(row.Result.Status, normalizedStatus, StringComparison.OrdinalIgnoreCase))
            .Where(row => !parsedTargetId.HasValue || row.EffectiveTargetId == parsedTargetId.Value)
            .OrderByDescending(row => row.IsResolved)
            .ThenByDescending(row => row.Result.FinishedAt ?? row.Result.StartedAt)
            .ToArray();

        if (parsedLimit.HasValue)
        {
            resolvedRows = resolvedRows.Take(parsedLimit.Value).ToArray();
        }

        return resolvedRows
            .Select(row => new LegacyPipelineScanResultResponse(
                row.Result.ResultId.ToString(CultureInfo.InvariantCulture),
                row.Result.JobId?.ToString(CultureInfo.InvariantCulture),
                row.EffectiveTargetId?.ToString(CultureInfo.InvariantCulture),
                row.TargetDisplay,
                (row.Result.ScannerType ?? string.Empty).ToUpperInvariant(),
                row.Result.Status ?? "Unknown",
                row.Result.NoOfFindings ?? 0,
                LegacyScanPipelineHelpers.ToDateTimeOffset(row.Result.StartedAt),
                LegacyScanPipelineHelpers.ToDateTimeOffset(row.Result.FinishedAt)))
            .ToArray();
    }

    public async Task<IReadOnlyList<LegacyPipelineReportRecordResponse>> ListReportsAsync(CancellationToken cancellationToken)
    {
        var items = await _dbContext.Reports
            .AsNoTracking()
            .OrderByDescending(report => report.CreatedAt)
            .Take(100)
            .ToArrayAsync(cancellationToken);
        return items.Select(ToReportRecordResponse).ToArray();
    }

    public async Task<LegacyPipelineReportDetailResponse?> GetReportDetailAsync(string reportId, CancellationToken cancellationToken)
    {
        var parsedReportId = LegacyScanPipelineHelpers.ParseRequiredIntId(reportId, nameof(reportId));
        var report = await _dbContext.Reports
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.ReportId == parsedReportId, cancellationToken);
        if (report is null)
        {
            return null;
        }

        return ToReportDetailResponse(report);
    }

    public async Task<LegacyPipelineGeneratedReportResponse> GenerateReportAsync(LegacyPipelineGenerateReportRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = await ResolveActorUserIdAsync(request.ActorUserId, cancellationToken);
        var reportType = LegacyScanPipelineHelpers.NormalizeReportType(request.ReportType);
        var reportTypeDisplayName = LegacyScanPipelineHelpers.GetReportTypeDisplayName(reportType);
        var title = string.IsNullOrWhiteSpace(request.Title)
            ? (reportTypeDisplayName.EndsWith("Report", StringComparison.OrdinalIgnoreCase) ? reportTypeDisplayName : $"{reportTypeDisplayName} Report")
            : request.Title.Trim();
        var scope = LegacyScanPipelineHelpers.BuildReportScopeLabel(request.JobId, request.TargetId, request.NetworkId);
        var generatedAtUtc = DateTimeOffset.UtcNow;
        var sections = await BuildReportSectionsAsync(request, cancellationToken);
        var query = ToReportQueryResponse(request);

        LegacyPipelineReportRecordResponse? persisted = null;
        if (request.Persist)
        {
            var reportDirectory = LegacyScanPipelineHelpers.EnsureDirectory(_pipelineOptions.CurrentValue.ReportsDirectory);
            var slug = LegacyScanPipelineHelpers.Slugify(title);
            var timestamp = generatedAtUtc.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
            var htmlPath = Path.Combine(reportDirectory, $"{slug}_{timestamp}.html");
            LegacyScanPipelineFileWriters.WriteSimpleHtml(htmlPath, title, reportTypeDisplayName, scope, generatedAtUtc, query, sections);

            var entity = new LegacyPipelineReportEntity
            {
                Title = title.Length > 100 ? title[..100] : title,
                CreatedAt = generatedAtUtc.UtcDateTime,
                ReportType = reportType,
                GeneratedByUserId = actorUserId,
                ParametersJson = JsonSerializer.Serialize(request, LegacyScanPipelineSerializer.JsonOptions),
                JobId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.JobId, nameof(request.JobId)),
                TargetId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.TargetId, nameof(request.TargetId)),
                NetworkId = LegacyScanPipelineHelpers.ParseOptionalIntId(request.NetworkId, nameof(request.NetworkId)),
                FileExtension = "html",
                FilePath = htmlPath,
                ContentJson = JsonSerializer.Serialize(sections, LegacyScanPipelineSerializer.JsonOptions),
            };

            _dbContext.Reports.Add(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);
            persisted = ToReportRecordResponse(entity);
        }

        return new LegacyPipelineGeneratedReportResponse(title, reportType, scope, generatedAtUtc, query, sections, persisted);
    }

    public async Task<LegacyPipelineDownloadResult?> ResolveReportDownloadAsync(string reportId, string? format, CancellationToken cancellationToken)
    {
        var parsedReportId = LegacyScanPipelineHelpers.ParseRequiredIntId(reportId, nameof(reportId));
        var report = await _dbContext.Reports.AsNoTracking().FirstOrDefaultAsync(item => item.ReportId == parsedReportId, cancellationToken);
        if (report is null)
        {
            return null;
        }

        var normalizedFormat = LegacyScanPipelineHelpers.CleanOrNull(format)?.ToLowerInvariant();
        if (normalizedFormat is not null && normalizedFormat is not "html")
        {
            throw new ArgumentException("Report download format must be 'html'.");
        }

        var requestedPath = report.FilePath;

        if (string.IsNullOrWhiteSpace(requestedPath) || !File.Exists(requestedPath))
        {
            return null;
        }

        return new LegacyPipelineDownloadResult("text/html; charset=utf-8", Path.GetFileName(requestedPath), requestedPath);
    }

    public async Task<LegacyPipelineReportDeletionResponse?> DeleteReportAsync(string reportId, CancellationToken cancellationToken)
    {
        var parsedReportId = LegacyScanPipelineHelpers.ParseRequiredIntId(reportId, nameof(reportId));
        var report = await _dbContext.Reports.FirstOrDefaultAsync(item => item.ReportId == parsedReportId, cancellationToken);
        if (report is null)
        {
            return null;
        }

        var deletedFiles = 0;
        deletedFiles += TryDeleteReportArtifact(report.FilePath) ? 1 : 0;

        _dbContext.Reports.Remove(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LegacyPipelineReportDeletionResponse(
            report.ReportId.ToString(CultureInfo.InvariantCulture),
            report.Title ?? "Untitled Report",
            deletedFiles);
    }

    public async Task<int> EnqueueDuePlansAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var plans = await _dbContext.ScanPlans
            .Where(plan => plan.Status == "Active"
                && plan.ScheduleType != "Manual"
                && plan.NextRunAt.HasValue
                && plan.NextRunAt.Value <= nowUtc.UtcDateTime)
            .OrderBy(plan => plan.NextRunAt)
            .Take(10)
            .ToArrayAsync(cancellationToken);

        var queued = 0;
        foreach (var plan in plans)
        {
            var actorUserId = plan.CreatedByUserId ?? await ResolveActorUserIdAsync("don", cancellationToken);
            var jobs = await QueuePlanJobsAsync(plan, actorUserId, "PlanScheduled", nowUtc, cancellationToken);
            var schedule = LegacyScanPipelineSerializer.DeserializeSchedule(plan.ScheduleJson) ?? new LegacyPipelineSchedule("Manual", new());
            plan.LastRunAt = nowUtc.UtcDateTime;
            plan.NextRunAt = ComputeNextRunUtc(nowUtc, plan.ScheduleType ?? schedule.Type, schedule.Values)?.UtcDateTime;
            plan.UpdatedAt = nowUtc.UtcDateTime;
            queued += jobs.Count;
        }

        if (queued > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return queued;
    }

    public async Task<int> ProcessQueuedJobsAsync(CancellationToken cancellationToken)
    {
        var jobs = await _dbContext.ScanJobs
            .Where(job => job.Status == "Queued")
            .OrderBy(job => job.QueuedAt)
            .Take(3)
            .ToArrayAsync(cancellationToken);

        var processed = 0;
        foreach (var job in jobs)
        {
            await ProcessJobAsync(job.JobId, cancellationToken);
            processed++;
        }

        return processed;
    }

    private static bool ScopeReferencesNetworkOrTargets(
        IReadOnlyList<int>? networkIds,
        IReadOnlyList<int>? targetIdsInScope,
        int networkId,
        IReadOnlyCollection<int> targetIds)
    {
        if (networkIds is not null && networkIds.Contains(networkId))
        {
            return true;
        }

        if (targetIds.Count == 0 || targetIdsInScope is null || targetIdsInScope.Count == 0)
        {
            return false;
        }

        return targetIdsInScope.Any(targetIds.Contains);
    }

    private static List<LegacyPipelineNetworkDeletionBlockerResponse> BuildDeletionBlockers(
        int scanPlanCount,
        int scanJobCount,
        int reportsCount,
        int targetHistoryCount)
    {
        var blockers = new List<LegacyPipelineNetworkDeletionBlockerResponse>();
        if (scanPlanCount > 0)
        {
            blockers.Add(new LegacyPipelineNetworkDeletionBlockerResponse("scanPlans", scanPlanCount, "One or more stored scan plans still target this subnet."));
        }

        if (scanJobCount > 0)
        {
            blockers.Add(new LegacyPipelineNetworkDeletionBlockerResponse("scanJobs", scanJobCount, "Stored scan jobs still reference this subnet or its targets."));
        }

        if (reportsCount > 0)
        {
            blockers.Add(new LegacyPipelineNetworkDeletionBlockerResponse("reports", reportsCount, "Stored reports are scoped directly to this subnet."));
        }

        if (targetHistoryCount > 0)
        {
            blockers.Add(new LegacyPipelineNetworkDeletionBlockerResponse("targetHistory", targetHistoryCount, "Stored results or reports still reference targets inside this subnet."));
        }

        return blockers;
    }

    private static LegacyPipelineResolvedResultRow ResolveResultRow(
        LegacyPipelineScanResultEntity result,
        IReadOnlyDictionary<int, LegacyPipelineTargetEntity> targetLookup,
        IReadOnlyDictionary<int, LegacyPipelineIocEntity[]> iocsByResultId,
        IReadOnlyDictionary<string, LegacyPipelineTargetEntity> targetsByIp)
    {
        if (result.TargetId.HasValue && targetLookup.TryGetValue(result.TargetId.Value, out var linkedTarget))
        {
            return new LegacyPipelineResolvedResultRow(
                result,
                linkedTarget,
                linkedTarget.TargetId,
                false,
                true,
                LegacyScanPipelineHelpers.BuildTargetDisplay(linkedTarget));
        }

        if (!iocsByResultId.TryGetValue(result.ResultId, out var iocs) || iocs.Length == 0)
        {
            return new LegacyPipelineResolvedResultRow(
                result,
                null,
                null,
                true,
                false,
                "Unknown legacy target");
        }

        var matchedTargets = iocs
            .Select(item => LegacyScanPipelineHelpers.NormalizeHistoricalTargetServer(item.TargetServer))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(ip => targetsByIp.TryGetValue(ip, out var target) ? target : null)
            .Where(target => target is not null)
            .DistinctBy(target => target!.TargetId)
            .Cast<LegacyPipelineTargetEntity>()
            .ToArray();

        if (matchedTargets.Length == 1)
        {
            var matchedTarget = matchedTargets[0];
            return new LegacyPipelineResolvedResultRow(
                result,
                matchedTarget,
                matchedTarget.TargetId,
                true,
                true,
                LegacyScanPipelineHelpers.BuildTargetDisplay(matchedTarget));
        }

        return new LegacyPipelineResolvedResultRow(
            result,
            null,
            null,
            true,
            false,
            "Unknown legacy target");
    }
}
