using System.Data.Common;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Backend.Api.Infrastructure;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Abstractions.Services;
using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Features.ScanAnalystPoc;

public sealed class ScanAnalystPocService
{
    private const int DefaultMaxTargetCount = 5;
    private const int MaxAllowedTargetCount = 25;
    private static readonly Regex NumberRegex = new(@"\b(?<value>\d{1,2})\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly CtiDbContext _dbContext;
    private readonly IScanAnalystPocAgentAdapter _agentAdapter;
    private readonly IScanPlanService _scanPlanService;
    private readonly IScanJobQueue _scanJobQueue;
    private readonly ScanAnalystPocSessionStore _sessionStore;
    private readonly ScanAnalystPocRuntimeState _runtimeState;
    private readonly ScanAnalystPocOptions _options;
    private readonly ILogger<ScanAnalystPocService> _logger;

    public ScanAnalystPocService(
        CtiDbContext dbContext,
        IScanAnalystPocAgentAdapter agentAdapter,
        IScanPlanService scanPlanService,
        IScanJobQueue scanJobQueue,
        ScanAnalystPocSessionStore sessionStore,
        ScanAnalystPocRuntimeState runtimeState,
        IOptions<ScanAnalystPocOptions> options,
        ILogger<ScanAnalystPocService> logger)
    {
        _dbContext = dbContext;
        _agentAdapter = agentAdapter;
        _scanPlanService = scanPlanService;
        _scanJobQueue = scanJobQueue;
        _sessionStore = sessionStore;
        _runtimeState = runtimeState;
        _options = options.Value;
        _logger = logger;
    }

    public ScanAnalystAgentStatusDto GetStatus()
    {
        return new ScanAnalystAgentStatusDto(
            AgentEnabled: _options.Enabled,
            AutonomyEnabled: _options.AutonomyEnabled,
            DatabaseAvailable: _runtimeState.DatabaseAvailable,
            OperatingMode: _runtimeState.OperatingMode,
            IndicatorLabel: _runtimeState.DatabaseAvailable ? "Agent live" : "Agent demo",
            DegradedReason: _runtimeState.DegradedReason,
            ActiveSessionCount: _runtimeState.ActiveSessionCount,
            AvailableMockConditions: ScanAnalystPocMockConditions.All,
            ActiveMockConditions: _runtimeState.ActiveMockConditions,
            Parameters: new ScanAnalystAgentParametersDto(
                _options.AutonomyEnabled,
                _options.AllowedSubnets,
                _options.AllowedEnvironments,
                _options.MaxTargetsPerRun,
                _options.PreferredScannerFamily,
                _options.AutoRun,
                _options.QuietHours,
                _options.WatchForNewHosts,
                _options.WatchForFailedRecentJobs,
                _options.RequireMatchingRuleFamily),
            LastAutonomousActivity: _runtimeState.LastAutonomousActivity);
    }

    public async Task<ScanAnalystResponseDto> AnalyzeAsync(
        ScanAnalystRequestDto request,
        CancellationToken cancellationToken)
    {
        ValidateRequest(request.Objective, request.ActorUserId, request.Action, request.MaxTargetCount);

        var result = await ExecuteTurnCoreAsync(
            request.Objective.Trim(),
            request.ActorUserId.Trim(),
            request.Action.Trim(),
            request.SubnetId,
            request.PreferredScannerCapability,
            request.MaxTargetCount,
            editedPlan: null,
            sessionMessages: Array.Empty<ScanAnalystAgentMessageDto>(),
            simulatedConditions: Array.Empty<string>(),
            cancellationToken);

        return result.Analysis;
    }

    public async Task<ScanAnalystChatResponseDto> ChatAsync(
        ScanAnalystChatRequestDto request,
        CancellationToken cancellationToken)
    {
        ValidateRequest(request.Message, request.ActorUserId, request.Action, request.MaxTargetCount);

        var snapshot = _sessionStore.GetOrCreate(request.SessionId);
        var userMessage = new ScanAnalystAgentMessageDto("user", request.Message.Trim(), DateTimeOffset.UtcNow);
        var execution = await ExecuteTurnCoreAsync(
            request.Message.Trim(),
            request.ActorUserId.Trim(),
            request.Action.Trim(),
            request.SubnetId,
            request.PreferredScannerCapability,
            request.MaxTargetCount,
            request.EditedPlan ?? snapshot.LatestAnalysis?.ProposedPlan,
            snapshot.Messages,
            NormalizeSimulatedConditions(request.SimulatedConditions),
            cancellationToken);

        var agentMessage = new ScanAnalystAgentMessageDto(
            "agent",
            BuildAgentMessage(execution.Analysis, execution.RunSummary),
            DateTimeOffset.UtcNow);

        var updated = _sessionStore.Update(
            snapshot.SessionId,
            userMessage,
            agentMessage,
            execution.Analysis,
            execution.RunSummary,
            execution.ActiveMockConditions);

        return new ScanAnalystChatResponseDto(
            updated.SessionId,
            execution.AgentStatusLine,
            execution.Analysis.OperatingMode,
            _runtimeState.DatabaseAvailable,
            updated.ActiveMockConditions,
            updated.Messages,
            execution.Analysis,
            execution.RunSummary);
    }

    public async Task<ScanAnalystRunSummaryDto?> GetRunSummaryAsync(Guid scanJobId, CancellationToken cancellationToken)
    {
        if (scanJobId == Guid.Empty)
        {
            return null;
        }

        if (_sessionStore.TryGetMockRunSummary(scanJobId, out var mockSummary))
        {
            return mockSummary;
        }

        return await BuildLiveRunSummaryAsync(scanJobId, cancellationToken);
    }

    public async Task<ScanAnalystChatResponseDto?> RunAutonomousPassAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled || !_options.AutonomyEnabled)
        {
            return null;
        }

        var cooldown = TimeSpan.FromMinutes(Math.Max(1, _options.AutonomyCooldownMinutes));
        var lastActivity = _runtimeState.LastAutonomousActivity;
        if (lastActivity is not null && DateTimeOffset.UtcNow - lastActivity.OccurredAtUtc < cooldown)
        {
            return null;
        }

        var simulatedConditions = new List<string>();
        if (!_runtimeState.DatabaseAvailable)
        {
            if (_options.WatchForNewHosts)
            {
                simulatedConditions.Add(ScanAnalystPocMockConditions.NewHostsFound);
            }

            if (_options.WatchForFailedRecentJobs)
            {
                simulatedConditions.Add(ScanAnalystPocMockConditions.FailedRecentJob);
            }

            simulatedConditions.Add(ScanAnalystPocMockConditions.StaleCoverage);
        }

        var triggerParts = new List<string>();
        if (_options.WatchForNewHosts)
        {
            triggerParts.Add("new hosts");
        }

        if (_options.WatchForFailedRecentJobs)
        {
            triggerParts.Add("failed recent jobs");
        }

        if (triggerParts.Count == 0)
        {
            triggerParts.Add("coverage drift");
        }

        var objective =
            $"Autonomously review {string.Join(" and ", triggerParts)} in the allowed environments and prepare a targeted follow-up scan plan. " +
            $"Prefer {_options.PreferredScannerFamily} when it aligns with the available rules and keep the scope within {_options.MaxTargetsPerRun} targets.";

        var response = await ChatAsync(
            new ScanAnalystChatRequestDto(
                SessionId: null,
                ActorUserId: _options.SystemActorUserId,
                Message: objective,
                Action: _options.AutoRun ? "CreateAndRun" : "CreatePlan",
                SubnetId: null,
                PreferredScannerCapability: NormalizePreferredCapability(_options.PreferredScannerFamily),
                MaxTargetCount: _options.MaxTargetsPerRun,
                EditedPlan: null,
                SimulatedConditions: simulatedConditions),
            cancellationToken);

        _runtimeState.RecordAutonomousActivity(
            new ScanAnalystAutonomousActivityDto(
                Summary: response.LatestAnalysis.Summary,
                Trigger: string.Join(", ", triggerParts),
                Action: response.LatestAnalysis.Action,
                OperatingMode: response.OperatingMode,
                OccurredAtUtc: DateTimeOffset.UtcNow));

        return response;
    }

    private async Task<TurnExecutionResult> ExecuteTurnCoreAsync(
        string message,
        string actorUserId,
        string action,
        Guid? subnetId,
        string? preferredScannerCapability,
        int? maxTargetCount,
        ScanAnalystPlanProposalDto? editedPlan,
        IReadOnlyList<ScanAnalystAgentMessageDto> sessionMessages,
        IReadOnlyList<string> simulatedConditions,
        CancellationToken cancellationToken)
    {
        var effectiveMaxTargetCount = maxTargetCount ?? DefaultMaxTargetCount;
        var effectivePreferredCapability = ResolvePreferredCapability(preferredScannerCapability, message);
        var context = await GetContextSnapshotAsync(subnetId, simulatedConditions, cancellationToken);
        var objective = BuildConversationObjective(message, sessionMessages);
        var aiRequest = CreateAgentRequest(context, objective, action, effectivePreferredCapability, effectiveMaxTargetCount);
        var recommendation = await _agentAdapter.RecommendAsync(aiRequest, cancellationToken);
        var proposal = MergeWithEdits(MapProposal(recommendation.Proposal), editedPlan);
        proposal = ApplyMessageAdjustments(proposal, message, effectivePreferredCapability, effectiveMaxTargetCount);

        var validationWarnings = recommendation.ValidationWarnings.ToList();
        if (proposal.TargetServerIds.Count == 0)
        {
            validationWarnings.Add("The proposal does not contain any managed targets, so nothing can be created or run yet.");
        }

        if (proposal.RuleSelectionMode.Equals("RuleSet", StringComparison.OrdinalIgnoreCase) && proposal.RuleRevisionIds.Count == 0)
        {
            validationWarnings.Add("The proposal does not include any rule revisions, so the plan remains recommendation-only.");
        }

        MaterializationResult materialized;
        if (context.OperatingMode == ScanAnalystPocModes.MockFallback)
        {
            materialized = CreateMockMaterialization(proposal, action, context);
        }
        else
        {
            materialized = await MaterializeLiveAsync(proposal, actorUserId, action, cancellationToken);
        }

        var analysis = new ScanAnalystResponseDto(
            Action: action,
            OperatingMode: context.OperatingMode,
            Summary: recommendation.Summary,
            Observations: recommendation.Observations,
            Reasoning: recommendation.Reasoning,
            ValidationWarnings: validationWarnings,
            RecommendedScannerCapability: recommendation.RecommendedScannerCapability,
            ContextSummary: new ScanAnalystContextSummaryDto(
                context.FocusSubnet?.SubnetId,
                context.FocusSubnet?.Name,
                context.DiscoveryRuns.Count,
                context.DiscoveredHosts.Count,
                context.ManagedServers.Count,
                context.CandidateRules.Count,
                context.ExistingPlans.Count,
                context.RecentJobs.Count),
            ProposedPlan: proposal,
            CreatedPlan: materialized.CreatedPlan,
            QueuedJob: materialized.QueuedJob,
            RunSummary: materialized.RunSummary);

        return new TurnExecutionResult(
            analysis,
            materialized.RunSummary,
            context.ActiveMockConditions,
            context.OperatingMode == ScanAnalystPocModes.LiveData
                ? "Agent live on real discovery and scan state."
                : "Agent is active in demo mode because live SQL data is unavailable.");
    }

    private async Task<ScanAnalystPocContextSnapshot> GetContextSnapshotAsync(
        Guid? subnetId,
        IReadOnlyList<string> simulatedConditions,
        CancellationToken cancellationToken)
    {
        if (_runtimeState.DatabaseAvailable)
        {
            try
            {
                var live = await BuildLiveContextAsync(subnetId, cancellationToken);
                _runtimeState.MarkDatabaseAvailable();
                _runtimeState.SetActiveMockConditions(Array.Empty<string>());
                return live;
            }
            catch (Exception ex) when (_options.AllowMockFallbackWithoutDatabase && IsDatabaseFailure(ex))
            {
                _logger.LogWarning(ex, "Falling back to mock scan analyst context because live database access failed.");
                _runtimeState.MarkDatabaseUnavailable(ex.Message);
            }
        }

        var fallbackConditions = simulatedConditions.Count == 0
            ? Array.Empty<string>()
            : NormalizeSimulatedConditions(simulatedConditions);
        _runtimeState.SetActiveMockConditions(fallbackConditions);
        return BuildMockContext(subnetId, fallbackConditions);
    }

    private async Task<ScanAnalystPocContextSnapshot> BuildLiveContextAsync(Guid? subnetId, CancellationToken cancellationToken)
    {
        var subnet = subnetId.HasValue
            ? await _dbContext.Subnets
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == subnetId.Value, cancellationToken)
            : null;

        if (subnetId.HasValue && subnet is null)
        {
            throw new ArgumentException("The selected subnet could not be found.", nameof(subnetId));
        }

        var discoveryRuns = await _dbContext.DiscoveryRuns
            .AsNoTracking()
            .Where(x => !subnetId.HasValue || x.SubnetId == subnetId.Value)
            .OrderByDescending(x => x.QueuedAtUtc)
            .Take(8)
            .Select(x => new AiScanAnalystDiscoveryRunContext(
                x.Id,
                x.SubnetId,
                x.RequestedCidr,
                x.Status.ToString(),
                x.TotalHosts,
                x.ReachableHosts,
                x.UnreachableHosts,
                x.Summary,
                x.QueuedAtUtc,
                x.CompletedAtUtc))
            .ToListAsync(cancellationToken);

        var discoveredHosts = await _dbContext.DiscoveredHosts
            .AsNoTracking()
            .Where(x => !subnetId.HasValue || x.SubnetId == subnetId.Value)
            .OrderByDescending(x => x.LastCheckedAtUtc)
            .Take(40)
            .Select(x => new AiScanAnalystDiscoveredHostContext(
                x.Id,
                x.SubnetId,
                x.IpAddress,
                x.Hostname,
                x.Reachability.ToString(),
                x.PromotedTargetServerId.HasValue,
                x.LastCheckedAtUtc))
            .ToListAsync(cancellationToken);

        var targetServers = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => !subnetId.HasValue || x.SubnetId == subnetId.Value)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        var targetServerIds = targetServers.Select(x => x.Id).ToArray();
        var scannerIds = await _dbContext.TargetServerScannerAssignments
            .AsNoTracking()
            .Where(x => targetServerIds.Contains(x.TargetServerId) && x.IsEnabled)
            .Select(x => x.ScannerId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var capabilityBindings = scannerIds.Count == 0
            ? new List<ScannerCapabilityBinding>()
            : await _dbContext.ScannerCapabilityBindings
                .AsNoTracking()
                .Where(x => scannerIds.Contains(x.ScannerId))
                .ToListAsync(cancellationToken);

        var assignments = targetServerIds.Length == 0
            ? new List<TargetServerScannerAssignment>()
            : await _dbContext.TargetServerScannerAssignments
                .AsNoTracking()
                .Where(x => targetServerIds.Contains(x.TargetServerId) && x.IsEnabled)
                .ToListAsync(cancellationToken);

        var capabilitiesByScannerId = capabilityBindings
            .GroupBy(x => x.ScannerId)
            .ToDictionary(
                x => x.Key,
                x => x.Select(y => y.Capability.ToString()).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(y => y).ToArray());

        var managedServers = targetServers
            .Select(x => new AiScanAnalystManagedServerContext(
                x.Id,
                x.SubnetId,
                x.Hostname,
                x.IpAddress,
                x.OperatingSystem,
                x.Environment,
                x.Status.ToString(),
                x.ConnectivityStatus.ToString(),
                assignments
                    .Where(y => y.TargetServerId == x.Id)
                    .SelectMany(y => capabilitiesByScannerId.TryGetValue(y.ScannerId, out var capabilities) ? capabilities : Array.Empty<string>())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(y => y)
                    .ToArray(),
                x.LastContactUtc))
            .ToList();

        var scanPlanIds = await _dbContext.ScanPlans
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Select(x => x.Id)
            .Take(12)
            .ToListAsync(cancellationToken);

        var planTargetLinks = scanPlanIds.Count == 0
            ? new List<ScanPlanTargetServer>()
            : await _dbContext.ScanPlanTargetServers
                .AsNoTracking()
                .Where(x => scanPlanIds.Contains(x.ScanPlanId))
                .ToListAsync(cancellationToken);

        if (subnetId.HasValue)
        {
            var filteredPlanIds = planTargetLinks
                .Where(x => targetServerIds.Contains(x.TargetServerId))
                .Select(x => x.ScanPlanId)
                .Distinct()
                .ToHashSet();

            scanPlanIds = scanPlanIds.Where(filteredPlanIds.Contains).ToList();
            planTargetLinks = planTargetLinks.Where(x => filteredPlanIds.Contains(x.ScanPlanId)).ToList();
        }

        var scanPlans = scanPlanIds.Count == 0
            ? new List<ScanPlan>()
            : await _dbContext.ScanPlans
                .AsNoTracking()
                .Where(x => scanPlanIds.Contains(x.Id))
                .OrderByDescending(x => x.UpdatedAtUtc)
                .ToListAsync(cancellationToken);

        var planRuleLinks = scanPlanIds.Count == 0
            ? new List<ScanPlanRuleRevision>()
            : await _dbContext.ScanPlanRuleRevisions
                .AsNoTracking()
                .Where(x => scanPlanIds.Contains(x.ScanPlanId))
                .ToListAsync(cancellationToken);

        var recentJobs = await _dbContext.ScanJobs
            .AsNoTracking()
            .Where(x =>
                !subnetId.HasValue
                || (x.ScanPlanId.HasValue && scanPlanIds.Contains(x.ScanPlanId.Value))
                || _dbContext.ScanJobTargetExecutions.Any(t => t.ScanJobId == x.Id && targetServerIds.Contains(t.TargetServerId)))
            .OrderByDescending(x => x.QueuedAtUtc)
            .Take(12)
            .ToListAsync(cancellationToken);

        var recentJobIds = recentJobs.Select(x => x.Id).ToArray();
        var detectionCounts = recentJobIds.Length == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.ScanResults
                .AsNoTracking()
                .Where(x => x.ScanJobId.HasValue && recentJobIds.Contains(x.ScanJobId.Value))
                .GroupBy(x => x.ScanJobId!.Value)
                .Select(x => new { ScanJobId = x.Key, Count = x.Count(y => !y.IsExecutionArtifact) })
                .ToDictionaryAsync(x => x.ScanJobId, x => x.Count, cancellationToken);

        var executionCounts = recentJobIds.Length == 0
            ? new Dictionary<Guid, (int Total, int Completed, int Failed)>()
            : await _dbContext.ScanJobTargetExecutions
                .AsNoTracking()
                .Where(x => recentJobIds.Contains(x.ScanJobId))
                .GroupBy(x => x.ScanJobId)
                .Select(x => new
                {
                    ScanJobId = x.Key,
                    Total = x.Count(),
                    Completed = x.Count(y => y.Status == ScanJobTargetExecutionStatus.Completed),
                    Failed = x.Count(y => y.Status == ScanJobTargetExecutionStatus.Failed),
                })
                .ToDictionaryAsync(x => x.ScanJobId, x => (x.Total, x.Completed, x.Failed), cancellationToken);

        var rules = await _dbContext.RuleRevisionsV2
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(80)
            .ToListAsync(cancellationToken);

        var ruleArtifactIds = rules.Select(x => x.RuleArtifactId).Distinct().ToArray();
        var artifacts = ruleArtifactIds.Length == 0
            ? new List<RuleArtifact>()
            : await _dbContext.RuleArtifacts
                .AsNoTracking()
                .Where(x => ruleArtifactIds.Contains(x.Id) && x.IsActive && !x.IsDeleted)
                .ToListAsync(cancellationToken);
        var artifactById = artifacts.ToDictionary(x => x.Id);

        return new ScanAnalystPocContextSnapshot(
            OperatingMode: ScanAnalystPocModes.LiveData,
            ActiveMockConditions: Array.Empty<string>(),
            FocusSubnet: subnet is null ? null : new AiScanAnalystFocusSubnetContext(subnet.Id, subnet.Name, subnet.CidrBlock),
            DiscoveryRuns: discoveryRuns,
            DiscoveredHosts: discoveredHosts,
            ManagedServers: managedServers,
            CandidateRules: rules
                .Where(x => artifactById.ContainsKey(x.RuleArtifactId))
                .Select(x =>
                {
                    var artifact = artifactById[x.RuleArtifactId];
                    return new AiScanAnalystRuleContext(
                        x.Id,
                        artifact.Id,
                        artifact.Name,
                        artifact.RuleFamily,
                        x.RevisionNumber,
                        x.VersionLabel,
                        x.LifecycleStatus,
                        artifact.ScopeType.ToString(),
                        artifact.ScopeValue,
                        artifact.Description);
                })
                .ToList(),
            ExistingPlans: scanPlans
                .Select(x => new AiScanAnalystPlanContext(
                    x.Id,
                    x.Name,
                    x.ScannerCapability.ToString(),
                    x.Status.ToString(),
                    x.RuleSelectionMode.ToString(),
                    planTargetLinks.Count(y => y.ScanPlanId == x.Id),
                    planRuleLinks.Count(y => y.ScanPlanId == x.Id),
                    null,
                    x.UpdatedAtUtc))
                .ToList(),
            RecentJobs: recentJobs
                .Select(x =>
                {
                    var counts = executionCounts.TryGetValue(x.Id, out var value)
                        ? value
                        : (0, 0, 0);
                    return new AiScanAnalystJobContext(
                        x.Id,
                        x.ScanPlanId,
                        x.TriggerSource,
                        x.Status.ToString(),
                        counts.Item1,
                        counts.Item2,
                        counts.Item3,
                        detectionCounts.TryGetValue(x.Id, out var detectionCount) ? detectionCount : 0,
                        x.Summary,
                        x.QueuedAtUtc,
                        x.CompletedAtUtc);
                })
                .ToList());
    }

    private ScanAnalystPocContextSnapshot BuildMockContext(Guid? subnetId, IReadOnlyList<string> activeConditions)
    {
        var subnetA = new AiScanAnalystFocusSubnetContext(
            Guid.Parse("11111111-1111-4111-8111-111111111111"),
            "Lab East",
            "10.42.10.0/24");
        var subnetB = new AiScanAnalystFocusSubnetContext(
            Guid.Parse("22222222-2222-4222-8222-222222222222"),
            "Lab West",
            "10.42.20.0/24");
        var focusSubnet = subnetId == subnetB.SubnetId ? subnetB : subnetA;
        var conditions = activeConditions.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var discoveryRuns = new List<AiScanAnalystDiscoveryRunContext>
        {
            new(
                Guid.Parse("30000000-0000-4000-8000-000000000001"),
                focusSubnet.SubnetId,
                focusSubnet.CidrBlock,
                "Success",
                18,
                14,
                4,
                "Routine discovery completed with a small set of newly reachable hosts.",
                DateTimeOffset.UtcNow.AddHours(-4),
                DateTimeOffset.UtcNow.AddHours(-4).AddMinutes(7)),
        };

        var discoveredHosts = new List<AiScanAnalystDiscoveredHostContext>
        {
            new(
                Guid.Parse("40000000-0000-4000-8000-000000000001"),
                focusSubnet.SubnetId,
                "10.42.10.21",
                "lab-win-21",
                "Reachable",
                false,
                DateTimeOffset.UtcNow.AddMinutes(-45)),
            new(
                Guid.Parse("40000000-0000-4000-8000-000000000002"),
                focusSubnet.SubnetId,
                "10.42.10.22",
                "lab-lnx-22",
                "Reachable",
                true,
                DateTimeOffset.UtcNow.AddHours(-2)),
        };

        if (conditions.Contains(ScanAnalystPocMockConditions.NewHostsFound))
        {
            discoveredHosts.Add(
                new AiScanAnalystDiscoveredHostContext(
                    Guid.Parse("40000000-0000-4000-8000-000000000003"),
                    focusSubnet.SubnetId,
                    "10.42.10.29",
                    "lab-new-29",
                    "Reachable",
                    false,
                    DateTimeOffset.UtcNow.AddMinutes(-10)));
        }

        var managedServers = new List<AiScanAnalystManagedServerContext>
        {
            new(
                Guid.Parse("50000000-0000-4000-8000-000000000001"),
                focusSubnet.SubnetId,
                "lab-win-21",
                "10.42.10.21",
                "Windows Server 2022",
                "lab",
                "Active",
                "Online",
                ["Sigma", "Yara"],
                DateTimeOffset.UtcNow.AddMinutes(-8)),
            new(
                Guid.Parse("50000000-0000-4000-8000-000000000002"),
                focusSubnet.SubnetId,
                "lab-lnx-22",
                "10.42.10.22",
                "Ubuntu 22.04",
                "lab",
                "Active",
                "Online",
                ["Yara", "Suricata"],
                DateTimeOffset.UtcNow.AddMinutes(-11)),
            new(
                Guid.Parse("50000000-0000-4000-8000-000000000003"),
                focusSubnet.SubnetId,
                "lab-sensor-23",
                "10.42.10.23",
                "Rocky Linux 9",
                "lab",
                "Active",
                conditions.Contains(ScanAnalystPocMockConditions.StaleCoverage) ? "Degraded" : "Online",
                conditions.Contains(ScanAnalystPocMockConditions.StaleCoverage) ? ["Snort"] : ["Snort", "Suricata"],
                DateTimeOffset.UtcNow.AddMinutes(-35)),
        };

        if (conditions.Contains(ScanAnalystPocMockConditions.NewHostsFound))
        {
            managedServers.Add(
                new AiScanAnalystManagedServerContext(
                    Guid.Parse("50000000-0000-4000-8000-000000000004"),
                    focusSubnet.SubnetId,
                    "lab-new-29",
                    "10.42.10.29",
                    "Windows 11",
                    "lab",
                    "Discovered",
                    "Online",
                    ["Sigma"],
                    DateTimeOffset.UtcNow.AddMinutes(-5)));
        }

        var rules = new List<AiScanAnalystRuleContext>
        {
            new(Guid.Parse("60000000-0000-4000-8000-000000000001"), Guid.Parse("70000000-0000-4000-8000-000000000001"), "Suspicious PowerShell Blocks", "sigma", 8, "v8", "validated", "Global", null, "Windows PowerShell log hunting."),
            new(Guid.Parse("60000000-0000-4000-8000-000000000002"), Guid.Parse("70000000-0000-4000-8000-000000000002"), "Unsigned Service Binary", "yara", 4, "v4", "validated", "Global", null, "File-based service binary detection."),
            new(Guid.Parse("60000000-0000-4000-8000-000000000003"), Guid.Parse("70000000-0000-4000-8000-000000000003"), "Beaconing HTTP Pattern", "suricata", 3, "v3", "validated", "Environment", "lab", "HTTP beaconing behavior."),
            new(Guid.Parse("60000000-0000-4000-8000-000000000004"), Guid.Parse("70000000-0000-4000-8000-000000000004"), "Lateral Tool Drop", "yara", 6, "v6", "published", "Subnet", focusSubnet.SubnetId.ToString("D"), "Tool-drop artifacts in the focused subnet."),
        };

        var existingPlans = new List<AiScanAnalystPlanContext>
        {
            new(Guid.Parse("80000000-0000-4000-8000-000000000001"), "lab-yara-baseline", "Yara", "Active", "RuleSet", 2, 3, "Completed", DateTimeOffset.UtcNow.AddHours(-12)),
            new(Guid.Parse("80000000-0000-4000-8000-000000000002"), "lab-sigma-followup", "Sigma", "Draft", "RuleSet", 1, 1, null, DateTimeOffset.UtcNow.AddHours(-2)),
        };

        var recentJobs = new List<AiScanAnalystJobContext>
        {
            new(Guid.Parse("90000000-0000-4000-8000-000000000001"), existingPlans[0].ScanPlanId, "Scheduled", "Completed", 2, 2, 0, 1, "Baseline finished cleanly with one informational detection.", DateTimeOffset.UtcNow.AddHours(-6), DateTimeOffset.UtcNow.AddHours(-6).AddMinutes(3)),
        };

        if (conditions.Contains(ScanAnalystPocMockConditions.FailedRecentJob))
        {
            recentJobs.Insert(
                0,
                new AiScanAnalystJobContext(
                    Guid.Parse("90000000-0000-4000-8000-000000000002"),
                    existingPlans[0].ScanPlanId,
                    "Manual",
                    "Failed",
                    3,
                    1,
                    2,
                    0,
                    "Recent follow-up scan failed on one degraded sensor path.",
                    DateTimeOffset.UtcNow.AddMinutes(-70),
                    DateTimeOffset.UtcNow.AddMinutes(-63)));
        }

        return new ScanAnalystPocContextSnapshot(
            OperatingMode: ScanAnalystPocModes.MockFallback,
            ActiveMockConditions: activeConditions,
            FocusSubnet: focusSubnet,
            DiscoveryRuns: discoveryRuns,
            DiscoveredHosts: discoveredHosts,
            ManagedServers: managedServers,
            CandidateRules: rules,
            ExistingPlans: existingPlans,
            RecentJobs: recentJobs);
    }

    private static AiScanAnalystContextRequest CreateAgentRequest(
        ScanAnalystPocContextSnapshot context,
        string objective,
        string action,
        string? preferredScannerCapability,
        int maxTargetCount)
    {
        return new AiScanAnalystContextRequest(
            objective,
            action,
            preferredScannerCapability,
            maxTargetCount,
            context.FocusSubnet,
            context.DiscoveryRuns,
            context.DiscoveredHosts,
            context.ManagedServers,
            context.CandidateRules,
            context.ExistingPlans,
            context.RecentJobs);
    }

    private async Task<MaterializationResult> MaterializeLiveAsync(
        ScanAnalystPlanProposalDto proposal,
        string actorUserId,
        string action,
        CancellationToken cancellationToken)
    {
        ScanPlanResponse? createdPlan = null;
        ScanJobResponse? queuedJob = null;
        ScanAnalystRunSummaryDto? runSummary = null;

        var canMaterializePlan =
            proposal.TargetServerIds.Count > 0 &&
            (proposal.RuleSelectionMode.Equals("RuleScope", StringComparison.OrdinalIgnoreCase) || proposal.RuleRevisionIds.Count > 0);

        if (!canMaterializePlan || action == "RecommendOnly")
        {
            return new MaterializationResult(createdPlan, queuedJob, runSummary);
        }

        createdPlan = await _scanPlanService.CreateAsync(
            new CreateScanPlanRequest(
                proposal.Name,
                proposal.Description,
                proposal.ScannerCapability,
                proposal.RuleSelectionMode,
                proposal.RuleScopeType,
                proposal.RuleScopeValue,
                proposal.CadenceType,
                proposal.IntervalMinutes,
                proposal.RunAtHourUtc,
                proposal.RunAtMinuteUtc,
                proposal.WeeklyDayOfWeek,
                proposal.OperatorNotes,
                proposal.Status,
                actorUserId,
                proposal.TargetServerIds,
                proposal.RuleRevisionIds),
            cancellationToken);

        if (action == "CreateAndRun")
        {
            queuedJob = await _scanPlanService.RunAsync(
                createdPlan.Id,
                new RunScanPlanRequest(actorUserId, "AiScanAnalystPoc"),
                cancellationToken);

            await _scanJobQueue.EnqueueAsync(queuedJob.Id, cancellationToken);
            runSummary = await BuildLiveRunSummaryAsync(queuedJob.Id, cancellationToken);
        }

        return new MaterializationResult(createdPlan, queuedJob, runSummary);
    }

    private MaterializationResult CreateMockMaterialization(
        ScanAnalystPlanProposalDto proposal,
        string action,
        ScanAnalystPocContextSnapshot context)
    {
        if (action == "RecommendOnly")
        {
            return new MaterializationResult(null, null, null);
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var planId = Guid.NewGuid();
        var createdPlan = new ScanPlanResponse(
            Id: planId,
            Name: proposal.Name,
            Description: proposal.Description,
            ScannerCapability: proposal.ScannerCapability,
            RuleSelectionMode: proposal.RuleSelectionMode,
            RuleScopeType: proposal.RuleScopeType,
            RuleScopeValue: proposal.RuleScopeValue,
            CadenceType: proposal.CadenceType,
            IntervalMinutes: proposal.IntervalMinutes,
            RunAtHourUtc: proposal.RunAtHourUtc,
            RunAtMinuteUtc: proposal.RunAtMinuteUtc,
            WeeklyDayOfWeek: proposal.WeeklyDayOfWeek,
            OperatorNotes: proposal.OperatorNotes,
            Status: proposal.Status,
            NextRunAtUtc: null,
            LastQueuedAtUtc: action == "CreateAndRun" ? nowUtc : null,
            LastCompletedAtUtc: action == "CreateAndRun" ? nowUtc.AddMinutes(2) : null,
            LastResultStatus: action == "CreateAndRun" ? "Completed" : null,
            LastResultSummary: action == "CreateAndRun" ? "Simulated POC execution completed." : null,
            TargetServerIds: proposal.TargetServerIds,
            RuleRevisionIds: proposal.RuleRevisionIds,
            TargetServers: proposal.Targets.Select(x => new ScanPlanTargetSummaryResponse(x.TargetServerId, x.Hostname, x.IpAddress)).ToList(),
            Rules: proposal.Rules.Select(x => new ScanPlanRuleSummaryResponse(x.RuleRevisionId, x.RuleArtifactId, x.RuleName, x.RuleFamily, x.RevisionNumber, x.VersionLabel)).ToList(),
            CreatedAtUtc: nowUtc,
            UpdatedAtUtc: nowUtc);

        if (action != "CreateAndRun")
        {
            return new MaterializationResult(createdPlan, null, null);
        }

        var targetRows = proposal.Targets.Select((target, index) =>
        {
            var shouldFail = context.ActiveMockConditions.Contains(ScanAnalystPocMockConditions.FailedRecentJob, StringComparer.OrdinalIgnoreCase) && index == proposal.Targets.Count - 1;
            return new ScanAnalystRunTargetExecutionDto(
                target.Hostname,
                target.IpAddress,
                shouldFail ? "Failed" : "Completed",
                shouldFail ? "Connector fallback exhausted while collecting evidence." : "Simulated execution captured relevant telemetry.",
                shouldFail ? "POC simulated a degraded execution path." : null);
        }).ToList();

        var detections = proposal.Rules.Take(2).Select((rule, index) => new ScanAnalystRunDetectionDto(
            DetectionId: Guid.NewGuid(),
            RuleName: rule.RuleName,
            ServerHostname: proposal.Targets.ElementAtOrDefault(index)?.Hostname ?? proposal.Targets[0].Hostname,
            Disposition: index == 0 ? "Detection" : "Informational",
            ObservedAtUtc: nowUtc.AddMinutes(index))).ToList();

        var queuedJob = new ScanJobResponse(
            Id: Guid.NewGuid(),
            ScanPlanId: planId,
            TriggerSource: "AiScanAnalystPoc",
            Status: targetRows.Any(x => x.Status == "Failed") ? "PartiallyCompleted" : "Completed",
            QueuedAtUtc: nowUtc,
            StartedAtUtc: nowUtc.AddSeconds(10),
            CompletedAtUtc: nowUtc.AddMinutes(2),
            TriggeredByUserId: "system-scan-analyst-agent",
            Summary: "Simulated POC run completed in demo mode.",
            CancellationRequested: false,
            CancellationRequestedAtUtc: null,
            CancellationReason: null,
            TotalTargets: targetRows.Count,
            CompletedTargets: targetRows.Count(x => x.Status == "Completed"),
            FailedTargets: targetRows.Count(x => x.Status == "Failed"),
            CancelledTargets: 0,
            PartiallyCompletedTargets: 0,
            CreatedAtUtc: nowUtc,
            UpdatedAtUtc: nowUtc.AddMinutes(2));

        var runSummary = new ScanAnalystRunSummaryDto(
            ScanJobId: queuedJob.Id,
            IsSimulated: true,
            NarrativeSummary: BuildNarrativeSummary(
                proposal.ScannerCapability,
                queuedJob.Status,
                targetRows.Count,
                detections.Count,
                context.ActiveMockConditions),
            JobStatus: queuedJob.Status,
            TotalTargets: queuedJob.TotalTargets,
            CompletedTargets: queuedJob.CompletedTargets,
            FailedTargets: queuedJob.FailedTargets,
            DetectionCount: detections.Count,
            GeneratedAtUtc: nowUtc.AddMinutes(2),
            TargetExecutions: targetRows,
            Detections: detections);

        return new MaterializationResult(createdPlan, queuedJob, runSummary);
    }

    private async Task<ScanAnalystRunSummaryDto?> BuildLiveRunSummaryAsync(Guid scanJobId, CancellationToken cancellationToken)
    {
        var scanJob = await _dbContext.ScanJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == scanJobId, cancellationToken);

        if (scanJob is null)
        {
            return null;
        }

        var targetExecutions = await _dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .Where(x => x.ScanJobId == scanJobId)
            .OrderBy(x => x.TargetHostname)
            .Select(x => new ScanAnalystRunTargetExecutionDto(
                x.TargetHostname,
                x.TargetIpAddress,
                x.Status.ToString(),
                x.Summary,
                x.ErrorMessage))
            .ToListAsync(cancellationToken);

        var detections = await (
            from result in _dbContext.ScanResults.AsNoTracking()
            join server in _dbContext.TargetServers.AsNoTracking() on result.TargetServerId equals server.Id
            join revision in _dbContext.RuleRevisionsV2.AsNoTracking() on result.RuleRevisionId equals revision.Id into revisionJoin
            from revision in revisionJoin.DefaultIfEmpty()
            join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id into artifactJoin
            from artifact in artifactJoin.DefaultIfEmpty()
            where result.ScanJobId == scanJobId && !result.IsExecutionArtifact
            orderby result.ObservedAtUtc descending
            select new ScanAnalystRunDetectionDto(
                result.Id,
                artifact != null ? artifact.Name : result.ScannerFamily,
                server.Hostname,
                result.Disposition.ToString(),
                result.ObservedAtUtc)
        ).Take(25).ToListAsync(cancellationToken);

        var totalTargets = targetExecutions.Count;
        var completedTargets = targetExecutions.Count(x => x.Status == ScanJobTargetExecutionStatus.Completed.ToString());
        var failedTargets = targetExecutions.Count(x => x.Status == ScanJobTargetExecutionStatus.Failed.ToString());

        return new ScanAnalystRunSummaryDto(
            ScanJobId: scanJob.Id,
            IsSimulated: false,
            NarrativeSummary: BuildNarrativeSummary(
                null,
                scanJob.Status.ToString(),
                totalTargets,
                detections.Count,
                Array.Empty<string>()),
            JobStatus: scanJob.Status.ToString(),
            TotalTargets: totalTargets,
            CompletedTargets: completedTargets,
            FailedTargets: failedTargets,
            DetectionCount: detections.Count,
            GeneratedAtUtc: DateTimeOffset.UtcNow,
            TargetExecutions: targetExecutions,
            Detections: detections);
    }

    private static string BuildNarrativeSummary(
        string? scannerCapability,
        string jobStatus,
        int totalTargets,
        int detectionCount,
        IReadOnlyList<string> activeMockConditions)
    {
        var lead = scannerCapability is null
            ? "The analyst agent reviewed the most recent execution output."
            : $"The analyst agent used {scannerCapability} to drive the current run.";

        var conditionText = activeMockConditions.Count == 0
            ? "The run reflects the current operating context."
            : $"The demo scenario included {string.Join(", ", activeMockConditions)}.";

        return
            $"{lead} Job status is {jobStatus} across {totalTargets} target{(totalTargets == 1 ? string.Empty : "s")}, " +
            $"with {detectionCount} surfaced detection{(detectionCount == 1 ? string.Empty : "s")}. {conditionText}";
    }

    private static ScanAnalystPlanProposalDto MapProposal(AiScanAnalystPlanProposal proposal)
    {
        return new ScanAnalystPlanProposalDto(
            proposal.Name,
            proposal.Description,
            proposal.ScannerCapability,
            proposal.RuleSelectionMode,
            proposal.RuleScopeType,
            proposal.RuleScopeValue,
            proposal.CadenceType,
            proposal.IntervalMinutes,
            proposal.RunAtHourUtc,
            proposal.RunAtMinuteUtc,
            proposal.WeeklyDayOfWeek,
            proposal.OperatorNotes,
            proposal.Status,
            proposal.TargetServerIds,
            proposal.RuleRevisionIds,
            proposal.Targets.Select(x => new ScanAnalystTargetProposalDto(
                x.TargetServerId,
                x.Hostname,
                x.IpAddress,
                x.OperatingSystem,
                x.Environment,
                x.Status,
                x.ConnectivityStatus,
                x.ScannerCapabilities,
                x.Reason)).ToList(),
            proposal.Rules.Select(x => new ScanAnalystRuleProposalDto(
                x.RuleRevisionId,
                x.RuleArtifactId,
                x.RuleName,
                x.RuleFamily,
                x.RevisionNumber,
                x.VersionLabel,
                x.LifecycleStatus,
                x.ScopeType,
                x.ScopeValue,
                x.Reason)).ToList());
    }

    private static ScanAnalystPlanProposalDto MergeWithEdits(
        ScanAnalystPlanProposalDto generatedPlan,
        ScanAnalystPlanProposalDto? editedPlan)
    {
        return editedPlan ?? generatedPlan;
    }

    private static ScanAnalystPlanProposalDto ApplyMessageAdjustments(
        ScanAnalystPlanProposalDto proposal,
        string message,
        string? preferredScannerCapability,
        int effectiveMaxTargetCount)
    {
        var workingTargets = proposal.Targets.ToList();
        var workingRules = proposal.Rules.ToList();
        var normalizedMessage = message.Trim().ToLowerInvariant();

        if (normalizedMessage.Contains("windows only") || normalizedMessage.Contains("focus on windows"))
        {
            workingTargets = workingTargets.Where(x => x.OperatingSystem.Contains("windows", StringComparison.OrdinalIgnoreCase)).ToList();
        }
        else if (normalizedMessage.Contains("linux only") || normalizedMessage.Contains("focus on linux"))
        {
            workingTargets = workingTargets.Where(x => x.OperatingSystem.Contains("linux", StringComparison.OrdinalIgnoreCase)).ToList();
        }
        else if (normalizedMessage.Contains("remove linux"))
        {
            workingTargets = workingTargets.Where(x => !x.OperatingSystem.Contains("linux", StringComparison.OrdinalIgnoreCase)).ToList();
        }
        else if (normalizedMessage.Contains("remove windows"))
        {
            workingTargets = workingTargets.Where(x => !x.OperatingSystem.Contains("windows", StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(preferredScannerCapability))
        {
            workingRules = workingRules
                .Where(x => x.RuleFamily.Equals(preferredScannerCapability, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var targetLimit = ResolveTargetLimitFromMessage(normalizedMessage, effectiveMaxTargetCount);
        workingTargets = workingTargets.Take(targetLimit).ToList();

        return proposal with
        {
            ScannerCapability = preferredScannerCapability ?? proposal.ScannerCapability,
            TargetServerIds = workingTargets.Select(x => x.TargetServerId).ToList(),
            Targets = workingTargets,
            RuleRevisionIds = workingRules.Select(x => x.RuleRevisionId).ToList(),
            Rules = workingRules,
        };
    }

    private static int ResolveTargetLimitFromMessage(string message, int fallback)
    {
        if (!message.Contains("target", StringComparison.OrdinalIgnoreCase) && !message.Contains("host", StringComparison.OrdinalIgnoreCase))
        {
            return fallback;
        }

        var match = NumberRegex.Match(message);
        if (!match.Success || !int.TryParse(match.Groups["value"].Value, out var parsed))
        {
            return fallback;
        }

        return Math.Clamp(parsed, 1, MaxAllowedTargetCount);
    }

    private static string BuildConversationObjective(string message, IReadOnlyList<ScanAnalystAgentMessageDto> sessionMessages)
    {
        var historicalUserNotes = sessionMessages
            .Where(x => x.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            .TakeLast(4)
            .Select(x => x.Content.Trim())
            .Where(x => x.Length > 0)
            .ToList();
        historicalUserNotes.Add(message.Trim());
        return string.Join(" | ", historicalUserNotes.Distinct(StringComparer.OrdinalIgnoreCase));
    }

    private static string BuildAgentMessage(ScanAnalystResponseDto analysis, ScanAnalystRunSummaryDto? runSummary)
    {
        if (runSummary is not null)
        {
            return $"{analysis.Summary} {runSummary.NarrativeSummary}";
        }

        return $"{analysis.Summary} Recommended scanner: {analysis.RecommendedScannerCapability}.";
    }

    private static string? ResolvePreferredCapability(string? requestedCapability, string message)
    {
        if (!string.IsNullOrWhiteSpace(requestedCapability))
        {
            return requestedCapability.Trim();
        }

        return NormalizePreferredCapability(message);
    }

    private static string? NormalizePreferredCapability(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "auto" => null,
            var text when text.Contains("sigma") => "Sigma",
            var text when text.Contains("suricata") => "Suricata",
            var text when text.Contains("snort") => "Snort",
            var text when text.Contains("yara") => "Yara",
            _ => null,
        };
    }

    private static IReadOnlyList<string> NormalizeSimulatedConditions(IReadOnlyList<string>? conditions)
    {
        if (conditions is null || conditions.Count == 0)
        {
            return Array.Empty<string>();
        }

        return conditions
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Where(ScanAnalystPocMockConditions.All.Contains)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static void ValidateRequest(string message, string actorUserId, string action, int? maxTargetCount)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("A scan analyst objective or message is required.");
        }

        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            throw new ArgumentException("ActorUserId is required.");
        }

        if (maxTargetCount is <= 0 or > MaxAllowedTargetCount)
        {
            throw new ArgumentException($"MaxTargetCount must be between 1 and {MaxAllowedTargetCount}.");
        }

        if (action is not ("RecommendOnly" or "CreatePlan" or "CreateAndRun"))
        {
            throw new ArgumentException("Action must be RecommendOnly, CreatePlan, or CreateAndRun.");
        }
    }

    private static bool IsDatabaseFailure(Exception exception)
    {
        return FindException<SqlException>(exception) is not null
            || FindException<DbException>(exception) is not null
            || FindException<SocketException>(exception) is not null
            || FindException<TimeoutException>(exception) is not null;
    }

    private static TException? FindException<TException>(Exception exception)
        where TException : Exception
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is TException typed)
            {
                return typed;
            }
        }

        return null;
    }

    private sealed record ScanAnalystPocContextSnapshot(
        string OperatingMode,
        IReadOnlyList<string> ActiveMockConditions,
        AiScanAnalystFocusSubnetContext? FocusSubnet,
        IReadOnlyList<AiScanAnalystDiscoveryRunContext> DiscoveryRuns,
        IReadOnlyList<AiScanAnalystDiscoveredHostContext> DiscoveredHosts,
        IReadOnlyList<AiScanAnalystManagedServerContext> ManagedServers,
        IReadOnlyList<AiScanAnalystRuleContext> CandidateRules,
        IReadOnlyList<AiScanAnalystPlanContext> ExistingPlans,
        IReadOnlyList<AiScanAnalystJobContext> RecentJobs);

    private sealed record MaterializationResult(
        ScanPlanResponse? CreatedPlan,
        ScanJobResponse? QueuedJob,
        ScanAnalystRunSummaryDto? RunSummary);

    private sealed record TurnExecutionResult(
        ScanAnalystResponseDto Analysis,
        ScanAnalystRunSummaryDto? RunSummary,
        IReadOnlyList<string> ActiveMockConditions,
        string AgentStatusLine);
}
