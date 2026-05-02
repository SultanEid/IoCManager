using System.Collections.Concurrent;
using Backend.Contracts.V2;

namespace Backend.Api.Features.ScanAnalystPoc;

public sealed class ScanAnalystPocOptions
{
    public const string SectionName = "ScanAnalystPoc";

    public bool Enabled { get; init; } = true;
    public bool StrictLiveLlmMode { get; init; } = false;
    public bool AllowMockFallbackWithoutDatabase { get; init; } = true;
    public bool AutonomyEnabled { get; init; } = true;
    public int AutonomyIntervalSeconds { get; init; } = 45;
    public int AutonomyCooldownMinutes { get; init; } = 15;
    public string SystemActorUserId { get; init; } = "system-scan-analyst-agent";
    public string[] AllowedSubnets { get; init; } = [];
    public string[] AllowedEnvironments { get; init; } = ["lab", "staging", "LegacyPipeline"];
    public int MaxTargetsPerRun { get; init; } = 5;
    public string PreferredScannerFamily { get; init; } = "Auto";
    public bool AutoRun { get; init; } = true;
    public bool AllowLocalPlannerWhenOpenAiMissing { get; init; }
    public string QuietHours { get; init; } = "01:00-05:00 UTC";
    public bool WatchForNewHosts { get; init; } = true;
    public bool WatchForFailedRecentJobs { get; init; } = true;
    public bool WatchForRecentAlerts { get; init; } = true;
    public int RecentAlertWindowMinutes { get; init; } = 30;
    public bool RequireMatchingRuleFamily { get; init; } = true;
}

public sealed class ScanAnalystPocRuntimeState
{
    private string _operatingMode = ScanAnalystPocModes.LiveData;
    private bool _databaseAvailable = true;
    private string? _degradedReason;
    private int _activeSessionCount;
    private IReadOnlyList<string> _activeMockConditions = Array.Empty<string>();
    private ScanAnalystAutonomousActivityDto? _lastAutonomousActivity;
    private ScanAnalystResponseDto? _lastAutonomousAnalysis;
    private ScanAnalystAgentParametersDto? _postureOverride;
    private readonly Dictionary<string, string> _legacyTargetStatuses = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _syncRoot = new();

    public string OperatingMode => _operatingMode;
    public bool DatabaseAvailable => _databaseAvailable;
    public string? DegradedReason => _degradedReason;
    public int ActiveSessionCount => _activeSessionCount;
    public IReadOnlyList<string> ActiveMockConditions => _activeMockConditions;
    public ScanAnalystAutonomousActivityDto? LastAutonomousActivity => _lastAutonomousActivity;
    public ScanAnalystResponseDto? LastAutonomousAnalysis => _lastAutonomousAnalysis;

    public ScanAnalystAgentParametersDto GetEffectiveParameters(ScanAnalystPocOptions options)
    {
        lock (_syncRoot)
        {
            return _postureOverride ?? BuildDefaultParameters(options);
        }
    }

    public ScanAnalystAgentParametersDto UpdatePosture(
        ScanAnalystPocOptions options,
        UpdateScanAnalystPostureRequestDto request,
        string preferredScannerFamily,
        string quietHours)
    {
        var parameters = new ScanAnalystAgentParametersDto(
            request.AutonomyEnabled,
            options.AllowedSubnets.ToArray(),
            options.AllowedEnvironments.ToArray(),
            request.MaxTargetsPerRun,
            preferredScannerFamily,
            request.AutoRun,
            quietHours,
            request.WatchForNewHosts,
            request.WatchForFailedRecentJobs,
            request.WatchForRecentAlerts,
            request.RequireMatchingRuleFamily);

        lock (_syncRoot)
        {
            _postureOverride = parameters;
        }

        return parameters;
    }

    private static ScanAnalystAgentParametersDto BuildDefaultParameters(ScanAnalystPocOptions options)
    {
        return new ScanAnalystAgentParametersDto(
            options.AutonomyEnabled,
            options.AllowedSubnets.ToArray(),
            options.AllowedEnvironments.ToArray(),
            options.MaxTargetsPerRun,
            options.PreferredScannerFamily,
            options.AutoRun,
            options.QuietHours,
            options.WatchForNewHosts,
            options.WatchForFailedRecentJobs,
            options.WatchForRecentAlerts,
            options.RequireMatchingRuleFamily);
    }

    public void MarkDatabaseAvailable()
    {
        lock (_syncRoot)
        {
            _databaseAvailable = true;
            _operatingMode = ScanAnalystPocModes.LiveData;
            _degradedReason = null;
        }
    }

    public void MarkDatabaseUnavailable(string reason)
    {
        lock (_syncRoot)
        {
            _databaseAvailable = false;
            _operatingMode = ScanAnalystPocModes.MockFallback;
            _degradedReason = string.IsNullOrWhiteSpace(reason) ? "Database unavailable for scan analyst POC." : reason.Trim();
        }
    }

    public void SetActiveSessionCount(int count)
    {
        lock (_syncRoot)
        {
            _activeSessionCount = Math.Max(0, count);
        }
    }

    public void SetActiveMockConditions(IReadOnlyList<string> conditions)
    {
        lock (_syncRoot)
        {
            _activeMockConditions = conditions.Count == 0 ? Array.Empty<string>() : conditions.ToArray();
        }
    }

    public void RecordAutonomousActivity(ScanAnalystAutonomousActivityDto activity, ScanAnalystResponseDto analysis)
    {
        lock (_syncRoot)
        {
            _lastAutonomousActivity = activity;
            _lastAutonomousAnalysis = analysis;
        }
    }

    public bool ObserveLegacyTargetStatus(string targetId, string status)
    {
        if (string.IsNullOrWhiteSpace(targetId))
        {
            return false;
        }

        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "Unknown" : status.Trim();
        lock (_syncRoot)
        {
            var hadPreviousStatus = _legacyTargetStatuses.TryGetValue(targetId, out var previousStatus);
            _legacyTargetStatuses[targetId] = normalizedStatus;
            return hadPreviousStatus && !IsOnline(previousStatus) && IsOnline(normalizedStatus);
        }
    }

    private static bool IsOnline(string? status)
    {
        return status?.Equals("Online", StringComparison.OrdinalIgnoreCase) == true;
    }
}

public static class ScanAnalystPocModes
{
    public const string LiveData = "LiveData";
    public const string MockFallback = "MockFallback";
}

public static class ScanAnalystPocMockConditions
{
    public const string NewHostsFound = "new_hosts_found";
    public const string FailedRecentJob = "failed_recent_job";
    public const string StaleCoverage = "stale_coverage";
    public const string RecentAlertDetected = "recent_alert_detected";

    public static readonly string[] All =
    [
        NewHostsFound,
        FailedRecentJob,
        StaleCoverage,
        RecentAlertDetected,
    ];
}

public sealed class ScanAnalystPocSessionStore
{
    private readonly ConcurrentDictionary<Guid, SessionState> _sessions = new();
    private readonly ConcurrentDictionary<Guid, ScanAnalystRunSummaryDto> _mockRunSummaries = new();
    private readonly ScanAnalystPocRuntimeState _runtimeState;

    public ScanAnalystPocSessionStore(ScanAnalystPocRuntimeState runtimeState)
    {
        _runtimeState = runtimeState;
    }

    public SessionSnapshot GetOrCreate(Guid? sessionId)
    {
        var effectiveSessionId = sessionId.GetValueOrDefault();
        if (effectiveSessionId == Guid.Empty)
        {
            effectiveSessionId = Guid.NewGuid();
        }

        var state = _sessions.GetOrAdd(effectiveSessionId, _ => new SessionState());
        _runtimeState.SetActiveSessionCount(_sessions.Count);
        lock (state.SyncRoot)
        {
            return new SessionSnapshot(
                effectiveSessionId,
                state.Messages.ToArray(),
                state.LatestAnalysis,
                state.LatestRunSummary,
                state.ActiveMockConditions.ToArray());
        }
    }

    public SessionSnapshot Update(
        Guid sessionId,
        ScanAnalystAgentMessageDto userMessage,
        ScanAnalystAgentMessageDto agentMessage,
        ScanAnalystResponseDto latestAnalysis,
        ScanAnalystRunSummaryDto? latestRunSummary,
        IReadOnlyList<string> activeMockConditions)
    {
        var state = _sessions.GetOrAdd(sessionId, _ => new SessionState());
        lock (state.SyncRoot)
        {
            state.Messages.Add(userMessage);
            state.Messages.Add(agentMessage);
            while (state.Messages.Count > 24)
            {
                state.Messages.RemoveAt(0);
            }

            state.LatestAnalysis = latestAnalysis;
            state.LatestRunSummary = latestRunSummary;
            state.ActiveMockConditions = activeMockConditions.Count == 0
                ? Array.Empty<string>()
                : activeMockConditions.ToArray();

            if (latestRunSummary is { IsSimulated: true, ScanJobId: { } runId })
            {
                _mockRunSummaries[runId] = latestRunSummary;
            }

            _runtimeState.SetActiveSessionCount(_sessions.Count);
            _runtimeState.SetActiveMockConditions(state.ActiveMockConditions);

            return new SessionSnapshot(
                sessionId,
                state.Messages.ToArray(),
                state.LatestAnalysis,
                state.LatestRunSummary,
                state.ActiveMockConditions.ToArray());
        }
    }

    public bool TryGetMockRunSummary(Guid scanJobId, out ScanAnalystRunSummaryDto summary)
    {
        return _mockRunSummaries.TryGetValue(scanJobId, out summary!);
    }

    private sealed class SessionState
    {
        public object SyncRoot { get; } = new();
        public List<ScanAnalystAgentMessageDto> Messages { get; } = [];
        public ScanAnalystResponseDto? LatestAnalysis { get; set; }
        public ScanAnalystRunSummaryDto? LatestRunSummary { get; set; }
        public IReadOnlyList<string> ActiveMockConditions { get; set; } = Array.Empty<string>();
    }
}

public sealed record SessionSnapshot(
    Guid SessionId,
    IReadOnlyList<ScanAnalystAgentMessageDto> Messages,
    ScanAnalystResponseDto? LatestAnalysis,
    ScanAnalystRunSummaryDto? LatestRunSummary,
    IReadOnlyList<string> ActiveMockConditions);
