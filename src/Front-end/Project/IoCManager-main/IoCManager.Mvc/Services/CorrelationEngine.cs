using System.Diagnostics;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Services;

public sealed class CorrelationEngine : ICorrelationEngine
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IObservableLifecycleService _observableLifecycleService;
    private static readonly SemaphoreSlim RunLock = new(1, 1);

    public CorrelationEngine(ApplicationDbContext dbContext, IObservableLifecycleService observableLifecycleService)
    {
        _dbContext = dbContext;
        _observableLifecycleService = observableLifecycleService;
    }

    public async Task<CorrelationRunResult> RunAsync(string triggerSource, CancellationToken cancellationToken = default)
    {
        await RunLock.WaitAsync(cancellationToken);
        try
        {
            var startedUtc = DateTime.UtcNow;
            var stopwatch = Stopwatch.StartNew();
            var observables = await _dbContext.Observables
                .Where(x => x.Status != "revoked")
                .ToListAsync(cancellationToken);

            var evidences = await _dbContext.ObservableEvidences.ToListAsync(cancellationToken);
            var sightings = await _dbContext.ObservableSightings.ToListAsync(cancellationToken);
            var candidates = new Dictionary<string, RelationCandidate>(StringComparer.Ordinal);

            BuildSharedDomainCandidates(observables, candidates);
            BuildSharedEvidenceCandidates(evidences, "asn", 20, "Shared ASN", candidates);
            BuildSharedEvidenceCandidates(evidences, "tls", 25, "Shared TLS fingerprint", candidates);
            BuildSharedEvidenceCandidates(evidences, "campaign", 30, "Shared campaign attribution", candidates);
            BuildSharedEvidenceCandidates(evidences, "malware_family", 28, "Shared malware family attribution", candidates);
            BuildCoSightingCandidates(sightings, candidates);

            _dbContext.ObservableRelationships.RemoveRange(_dbContext.ObservableRelationships);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var now = DateTime.UtcNow;
            foreach (var candidate in candidates.Values)
            {
                _dbContext.ObservableRelationships.Add(new ObservableRelationship
                {
                    FromObservableId = candidate.LeftId,
                    ToObservableId = candidate.RightId,
                    RelationshipType = "correlated",
                    Confidence = Math.Clamp(candidate.Weight, 0, 100),
                    EvidenceCount = candidate.Reasons.Count,
                    FirstSeenUtc = now,
                    LastSeenUtc = now
                });
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await _observableLifecycleService.RecomputeAllConfidenceAsync(cancellationToken);

            _dbContext.CorrelationStories.RemoveRange(_dbContext.CorrelationStories);
            _dbContext.CorrelationClusters.RemoveRange(_dbContext.CorrelationClusters);
            _dbContext.ClusterMemberships.RemoveRange(_dbContext.ClusterMemberships);
            _dbContext.DetectionCoverages.RemoveRange(_dbContext.DetectionCoverages);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var clusterCount = await BuildClustersAsync(cancellationToken);
            await BuildStoriesAsync(observables, candidates, cancellationToken);
            await BuildDetectionCoverageAsync(observables, cancellationToken);

            stopwatch.Stop();

            var result = new CorrelationRunResult
            {
                StartedUtc = startedUtc,
                FinishedUtc = DateTime.UtcNow,
                DurationMs = (int)stopwatch.ElapsedMilliseconds,
                RulesFiredCount = candidates.Values.Sum(x => x.Reasons.Count),
                ClustersProduced = clusterCount
            };

            _dbContext.CorrelationRunLogs.Add(new CorrelationRunLog
            {
                StartedUtc = result.StartedUtc,
                FinishedUtc = result.FinishedUtc,
                DurationMs = result.DurationMs,
                RulesFiredCount = result.RulesFiredCount,
                ClustersProduced = result.ClustersProduced,
                TriggerSource = string.IsNullOrWhiteSpace(triggerSource) ? "scheduled" : triggerSource
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
            return result;
        }
        finally
        {
            RunLock.Release();
        }
    }

    private static void BuildSharedDomainCandidates(
        IReadOnlyCollection<ObservableRecord> observables,
        IDictionary<string, RelationCandidate> candidates)
    {
        var byRoot = observables
            .Where(x => x.Type is "domain" or "host" or "url")
            .Select(x => new { x.Id, Root = ExtractRoot(x) })
            .Where(x => !string.IsNullOrWhiteSpace(x.Root))
            .GroupBy(x => x.Root!, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1);

        foreach (var group in byRoot)
        {
            AddPairs(
                group.Select(x => x.Id).Distinct().ToArray(),
                35,
                $"Shared domain root {group.Key}",
                candidates);
        }
    }

    private static void BuildSharedEvidenceCandidates(
        IReadOnlyCollection<ObservableEvidence> evidences,
        string evidenceType,
        int weight,
        string reasonPrefix,
        IDictionary<string, RelationCandidate> candidates)
    {
        var groups = evidences
            .Where(x => x.EvidenceType.Contains(evidenceType, StringComparison.OrdinalIgnoreCase))
            .Where(x => !string.IsNullOrWhiteSpace(x.EvidenceValue))
            .GroupBy(x => x.EvidenceValue.Trim(), StringComparer.OrdinalIgnoreCase)
            .Where(x => x.Count() > 1);

        foreach (var group in groups)
        {
            AddPairs(
                group.Select(x => x.ObservableId).Distinct().ToArray(),
                weight,
                $"{reasonPrefix} {group.Key}",
                candidates);
        }
    }

    private static void BuildCoSightingCandidates(
        IReadOnlyCollection<ObservableSighting> sightings,
        IDictionary<string, RelationCandidate> candidates)
    {
        foreach (var sensorGroup in sightings.GroupBy(x => x.SensorName, StringComparer.OrdinalIgnoreCase))
        {
            var ordered = sensorGroup
                .OrderBy(x => x.SeenUtc)
                .ToArray();

            for (var i = 0; i < ordered.Length; i++)
            {
                for (var j = i + 1; j < ordered.Length; j++)
                {
                    if (ordered[i].ObservableId == ordered[j].ObservableId)
                    {
                        continue;
                    }

                    var delta = (ordered[j].SeenUtc - ordered[i].SeenUtc).Duration();
                    if (delta > TimeSpan.FromHours(72))
                    {
                        break;
                    }

                    if (delta <= TimeSpan.FromHours(24))
                    {
                        AddPair(ordered[i].ObservableId, ordered[j].ObservableId, 18, $"Co-sighted within 24h on {sensorGroup.Key}", candidates);
                    }
                    else
                    {
                        AddPair(ordered[i].ObservableId, ordered[j].ObservableId, 10, $"Co-sighted within 72h on {sensorGroup.Key}", candidates);
                    }
                }
            }
        }
    }

    private async Task<int> BuildClustersAsync(CancellationToken cancellationToken)
    {
        var edges = await _dbContext.ObservableRelationships
            .Where(x => x.Confidence >= 55)
            .ToListAsync(cancellationToken);

        var adjacency = new Dictionary<int, HashSet<int>>();
        foreach (var edge in edges)
        {
            EnsureNode(adjacency, edge.FromObservableId).Add(edge.ToObservableId);
            EnsureNode(adjacency, edge.ToObservableId).Add(edge.FromObservableId);
        }

        var observableConfidence = await _dbContext.Observables
            .ToDictionaryAsync(x => x.Id, x => x.Confidence, cancellationToken);

        var visited = new HashSet<int>();
        var clusterCount = 0;

        foreach (var node in adjacency.Keys)
        {
            if (visited.Contains(node))
            {
                continue;
            }

            var component = Traverse(node, adjacency, visited);
            if (component.Count < 3)
            {
                continue;
            }

            clusterCount += 1;
            var averageConfidence = (int)Math.Round(component
                .Where(observableConfidence.ContainsKey)
                .DefaultIfEmpty(node)
                .Average(id => observableConfidence.GetValueOrDefault(id, 40)));

            var cluster = new CorrelationCluster
            {
                Name = $"Cluster-{DateTime.UtcNow:yyyyMMdd}-{clusterCount:000}",
                RiskLevel = ResolveRiskLevel(averageConfidence),
                AverageConfidence = averageConfidence,
                ObservableCount = component.Count,
                ComputedUtc = DateTime.UtcNow
            };
            _dbContext.CorrelationClusters.Add(cluster);
            await _dbContext.SaveChangesAsync(cancellationToken);

            foreach (var member in component)
            {
                _dbContext.ClusterMemberships.Add(new ClusterMembership
                {
                    ClusterId = cluster.Id,
                    ObservableId = member,
                    Weight = averageConfidence
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return clusterCount;
    }

    private async Task BuildStoriesAsync(
        IReadOnlyCollection<ObservableRecord> observables,
        IReadOnlyDictionary<string, RelationCandidate> candidates,
        CancellationToken cancellationToken)
    {
        foreach (var observable in observables)
        {
            var related = candidates.Values
                .Where(x => x.LeftId == observable.Id || x.RightId == observable.Id)
                .ToArray();

            if (related.Length == 0)
            {
                continue;
            }

            var reasons = related
                .SelectMany(x => x.Reasons)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(3)
                .ToArray();

            var summary = $"Linked with {related.Length} related observables. {string.Join("; ", reasons)}.";
            _dbContext.CorrelationStories.Add(new CorrelationStory
            {
                ObservableId = observable.Id,
                Summary = summary,
                EvidenceCount = related.Sum(x => x.Reasons.Count),
                RuleHits = related.Sum(x => x.Reasons.Count),
                ComputedUtc = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task BuildDetectionCoverageAsync(
        IReadOnlyCollection<ObservableRecord> observables,
        CancellationToken cancellationToken)
    {
        var sightingsByObservable = await _dbContext.ObservableSightings
            .GroupBy(x => x.ObservableId)
            .Select(group => new { ObservableId = group.Key, Hits = group.Sum(x => x.HitCount) })
            .ToDictionaryAsync(x => x.ObservableId, x => x.Hits, cancellationToken);

        // Materialize relationship endpoints first. SQLite/EF cannot translate SelectMany(new[] { ... }) here.
        var relationshipEndpoints = await _dbContext.ObservableRelationships
            .Where(x => x.Confidence >= 55)
            .Select(x => new { x.FromObservableId, x.ToObservableId })
            .ToListAsync(cancellationToken);

        var correlationByObservable = relationshipEndpoints
            .SelectMany(x => new[] { x.FromObservableId, x.ToObservableId })
            .GroupBy(x => x)
            .ToDictionary(group => group.Key, group => group.Count());

        foreach (var observable in observables)
        {
            var expectedFamilies = ResolveExpectedFamilies(observable.Type);
            var hits = sightingsByObservable.GetValueOrDefault(observable.Id, 0);
            var links = correlationByObservable.GetValueOrDefault(observable.Id, 0);

            foreach (var family in expectedFamilies)
            {
                var status = ResolveCoverageStatus(observable.Confidence, hits, links);
                _dbContext.DetectionCoverages.Add(new DetectionCoverage
                {
                    ObservableId = observable.Id,
                    RuleFamily = family,
                    CoverageStatus = status,
                    UpdatedUtc = DateTime.UtcNow
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string ResolveCoverageStatus(int confidence, int hits, int links)
    {
        if (hits >= 5 || links >= 3)
        {
            return "full";
        }

        if (hits > 0 || links > 0 || confidence >= 65)
        {
            return "partial";
        }

        return "none";
    }

    private static string[] ResolveExpectedFamilies(string observableType)
    {
        return observableType switch
        {
            "hash" => ["sigma", "yara"],
            "ip" or "domain" or "url" or "host" => ["sigma", "snort"],
            _ => ["sigma"]
        };
    }

    private static string ResolveRiskLevel(int averageConfidence)
    {
        if (averageConfidence >= 85)
        {
            return "critical";
        }

        if (averageConfidence >= 70)
        {
            return "high";
        }

        if (averageConfidence >= 55)
        {
            return "medium";
        }

        return "low";
    }

    private static string? ExtractRoot(ObservableRecord observable)
    {
        var source = observable.ValueCanonical;
        if (observable.Type == "url" && Uri.TryCreate(source, UriKind.Absolute, out var uri))
        {
            source = uri.Host;
        }

        if (string.IsNullOrWhiteSpace(source))
        {
            return null;
        }

        var labels = source.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (labels.Length < 2)
        {
            return source;
        }

        return $"{labels[^2]}.{labels[^1]}";
    }

    private static void AddPairs(
        IReadOnlyList<int> ids,
        int weight,
        string reason,
        IDictionary<string, RelationCandidate> candidates)
    {
        for (var i = 0; i < ids.Count; i++)
        {
            for (var j = i + 1; j < ids.Count; j++)
            {
                AddPair(ids[i], ids[j], weight, reason, candidates);
            }
        }
    }

    private static void AddPair(
        int leftId,
        int rightId,
        int weight,
        string reason,
        IDictionary<string, RelationCandidate> candidates)
    {
        var pair = NormalizePair(leftId, rightId);
        if (!candidates.TryGetValue(pair.Key, out var candidate))
        {
            candidate = new RelationCandidate(pair.LeftId, pair.RightId);
            candidates[pair.Key] = candidate;
        }

        candidate.Weight += weight;
        candidate.Reasons.Add(reason);
    }

    private static (string Key, int LeftId, int RightId) NormalizePair(int left, int right)
    {
        if (left <= right)
        {
            return ($"{left}:{right}", left, right);
        }

        return ($"{right}:{left}", right, left);
    }

    private static HashSet<int> EnsureNode(IDictionary<int, HashSet<int>> adjacency, int node)
    {
        if (!adjacency.TryGetValue(node, out var neighbors))
        {
            neighbors = [];
            adjacency[node] = neighbors;
        }

        return neighbors;
    }

    private static HashSet<int> Traverse(int start, IDictionary<int, HashSet<int>> adjacency, ISet<int> visited)
    {
        var result = new HashSet<int>();
        var stack = new Stack<int>();
        stack.Push(start);
        visited.Add(start);

        while (stack.Count > 0)
        {
            var current = stack.Pop();
            result.Add(current);
            if (!adjacency.TryGetValue(current, out var neighbors))
            {
                continue;
            }

            foreach (var neighbor in neighbors)
            {
                if (visited.Add(neighbor))
                {
                    stack.Push(neighbor);
                }
            }
        }

        return result;
    }

    private sealed class RelationCandidate
    {
        public RelationCandidate(int leftId, int rightId)
        {
            LeftId = leftId;
            RightId = rightId;
        }

        public int LeftId { get; }
        public int RightId { get; }
        public int Weight { get; set; }
        public HashSet<string> Reasons { get; } = [];
    }
}
