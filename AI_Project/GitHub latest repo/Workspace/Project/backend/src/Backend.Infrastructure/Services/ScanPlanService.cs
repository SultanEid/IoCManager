using Backend.Application.Abstractions.Services;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Services;

public sealed class ScanPlanService : IScanPlanService
{
    private readonly CtiDbContext _dbContext;

    public ScanPlanService(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ScanPlanResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _dbContext.ScanPlans
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ToListAsync(cancellationToken);

        var targetLinks = await _dbContext.ScanPlanTargetServers
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var ruleLinks = await _dbContext.ScanPlanRuleRevisions
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var targets = await _dbContext.TargetServers
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var rules = await _dbContext.RuleRevisionsV2
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var artifacts = await _dbContext.RuleArtifacts
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return plans.Select(plan =>
        {
            var linkedTargets = targetLinks
                .Where(x => x.ScanPlanId == plan.Id)
                .Join(
                    targets,
                    l => l.TargetServerId,
                    t => t.Id,
                    (l, t) => new ScanPlanTargetSummaryResponse(
                        t.Id,
                        t.Hostname,
                        t.IpAddress))
                .ToList();

            var linkedRules = ruleLinks
                .Where(x => x.ScanPlanId == plan.Id)
                .Join(
                    rules,
                    l => l.RuleRevisionId,
                    r => r.Id,
                    (l, r) => r)
                .Join(
                    artifacts,
                    r => r.RuleArtifactId,
                    a => a.Id,
                    (r, a) => new ScanPlanRuleSummaryResponse(
                        r.Id,
                        a.Id,
                        a.Name,
                        a.RuleFamily,
                        r.RevisionNumber,
                        r.VersionLabel))
                .ToList();

            return new ScanPlanResponse(
                plan.Id,
                plan.Name,
                plan.Description,
                plan.ScannerCapability.ToString(),
                plan.RuleSelectionMode.ToString(),
                plan.RuleScopeType?.ToString(),
                plan.RuleScopeValue,
                plan.CadenceType.ToString(),
                plan.IntervalMinutes,
                plan.RunAtHourUtc,
                plan.RunAtMinuteUtc,
                plan.WeeklyDayOfWeek,
                plan.OperatorNotes,
                plan.Status.ToString(),
                plan.NextRunAtUtc,
                plan.LastQueuedAtUtc,
                null,
                null,
                null,
                linkedTargets.Select(x => x.TargetServerId).ToList(),
                linkedRules.Select(x => x.RuleRevisionId).ToList(),
                linkedTargets,
                linkedRules,
                plan.CreatedAtUtc,
                plan.UpdatedAtUtc);
        }).ToList();
    }

    public async Task<ScanPlanResponse> CreateAsync(CreateScanPlanRequest request, CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTimeOffset.UtcNow;

        var plan = ScanPlan.Create(
            request.Name,
            request.Description,
            ParseScannerCapability(request.ScannerCapability),
            ParseRuleSelectionMode(request.RuleSelectionMode),
            ParseRuleScopeType(request.RuleScopeType),
            request.RuleScopeValue,
            ParseCadenceType(request.CadenceType),
            request.IntervalMinutes,
            request.RunAtHourUtc,
            request.RunAtMinuteUtc,
            request.WeeklyDayOfWeek,
            request.OperatorNotes,
            ParseScanPlanStatus(request.Status),
            request.ActorUserId,
            nowUtc);

        _dbContext.ScanPlans.Add(plan);

        foreach (var targetServerId in request.TargetServerIds.Distinct())
        {
            _dbContext.ScanPlanTargetServers.Add(
                ScanPlanTargetServer.Create(plan.Id, targetServerId, request.ActorUserId, nowUtc));
        }

        foreach (var ruleRevisionId in request.RuleRevisionIds.Distinct())
        {
            _dbContext.ScanPlanRuleRevisions.Add(
                ScanPlanRuleRevision.Create(plan.Id, ruleRevisionId, request.ActorUserId, nowUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return (await ListAsync(cancellationToken)).Single(x => x.Id == plan.Id);
    }

    public async Task<ScanJobResponse> RunAsync(Guid scanPlanId, RunScanPlanRequest request, CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTimeOffset.UtcNow;

        var plan = await _dbContext.ScanPlans.FirstOrDefaultAsync(x => x.Id == scanPlanId, cancellationToken);
        if (plan is null)
        {
            throw new InvalidOperationException("Scan plan not found.");
        }

        var targetServers = await _dbContext.ScanPlanTargetServers
            .Where(x => x.ScanPlanId == scanPlanId)
            .ToListAsync(cancellationToken);

        var job = ScanJob.Queue(
            plan.Id,
            string.IsNullOrWhiteSpace(request.TriggerSource) ? "Manual" : request.TriggerSource!,
            request.ActorUserId,
            nowUtc);

        _dbContext.ScanJobs.Add(job);

        foreach (var target in targetServers)
        {
            var server = await _dbContext.TargetServers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == target.TargetServerId, cancellationToken);

            if (server is null)
            {
                continue;
            }

            _dbContext.ScanJobTargetExecutions.Add(
                ScanJobTargetExecution.QueueSnapshot(
                    job.Id,
                    server.Id,
                    server.Hostname,
                    server.IpAddress,
                    request.ActorUserId,
                    nowUtc));
        }

        plan.MarkQueued(request.ActorUserId, nowUtc);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ScanJobResponse(
            job.Id,
            job.ScanPlanId,
            job.TriggerSource,
            job.Status.ToString(),
            job.QueuedAtUtc,
            job.StartedAtUtc,
            job.CompletedAtUtc,
            job.TriggeredByUserId,
            job.Summary,
            job.CancellationRequested,
            job.CancellationRequestedAtUtc,
            job.CancellationReason,
            targetServers.Count,
            0,
            0,
            0,
            0,
            job.CreatedAtUtc,
            job.UpdatedAtUtc);
    }

    private static ScannerCapability ParseScannerCapability(string value)
    {
        return Enum.Parse<ScannerCapability>(value, ignoreCase: true);
    }

    private static ScanRuleSelectionMode ParseRuleSelectionMode(string value)
    {
        return Enum.Parse<ScanRuleSelectionMode>(value, ignoreCase: true);
    }

    private static RuleScopeType? ParseRuleScopeType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Enum.Parse<RuleScopeType>(value, ignoreCase: true);
    }

    private static ScanCadenceType ParseCadenceType(string value)
    {
        return Enum.Parse<ScanCadenceType>(value, ignoreCase: true);
    }

    private static ScanPlanStatus ParseScanPlanStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return ScanPlanStatus.Draft;
        }

        return Enum.Parse<ScanPlanStatus>(value, ignoreCase: true);
    }
}