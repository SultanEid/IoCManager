using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.CoveragePain;
using Backend.Domain.Common;

namespace Backend.Application.Services;

public sealed class CoveragePainAnalysisService : ICoveragePainAnalysisService
{
    private static readonly Regex HashRegex = new(@"\b(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})\b", RegexOptions.Compiled);
    private static readonly Regex Ipv4Regex = new(@"\b(?:\d{1,3}\.){3}\d{1,3}\b", RegexOptions.Compiled);
    private static readonly Regex DomainRegex = new(@"\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b", RegexOptions.Compiled);
    private static readonly Regex AttackRegex = new(@"\bT\d{4}(?:\.\d{3})?\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly string[] Tiers = ["hash-values", "ip-addresses", "domain-names", "network-host-artifacts", "tools", "ttps"];

    private readonly ICoveragePainAnalysisQueryService _query;
    private readonly IDateTimeProvider _clock;

    public CoveragePainAnalysisService(ICoveragePainAnalysisQueryService query, IDateTimeProvider clock)
    {
        _query = query;
        _clock = clock;
    }

    public async Task<CoveragePainAnalysisResponse> GetAnalysisAsync(GetCoveragePainAnalysisRequest request, CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var scope = NormalizeScope(request.ScopeType, request.ScopeValue);
        var data = await _query.GetSnapshotAsync(cancellationToken);
        var featureCaseMap = data.FeatureSnapshots.ToDictionary(x => x.Id, x => x.CaseId);
        var scopedCases = ResolveScopedCases(scope, data);
        var buckets = Tiers.ToDictionary(x => x, _ => new Bucket());

        foreach (var rule in data.Rules.Where(r => scopedCases.Contains(r.CaseId)))
        {
            foreach (var tier in RuleTiers(rule))
            {
                var b = buckets[tier];
                b.Cases.Add(rule.CaseId);
                b.Rules.Add(rule.Id);
                b.RuleCoverage += rule.PredictedCoverage;
                b.RuleCoverageCount++;
                b.Detections += rule.Status is RuleStatus.Validated or RuleStatus.Approved or RuleStatus.Shadow or RuleStatus.Canary or RuleStatus.Promoted ? 1 : 0;
                if (rule.LastUsefulHitAtUtc.HasValue)
                {
                    b.Sightings++;
                    b.Activity.Add(rule.LastUsefulHitAtUtc.Value);
                }

                if (rule.LinkedAttackTechniques.Length > 0)
                {
                    b.Attack.UnionWith(rule.LinkedAttackTechniques.Select(x => x.Trim().ToUpperInvariant()));
                }

                b.LastObserved.Add(rule.LastUsefulHitAtUtc ?? rule.LastValidatedAtUtc ?? rule.LastDeploymentAtUtc ?? rule.UpdatedAtUtc);
            }
        }

        foreach (var ev in data.EvidenceItems.Where(x => scopedCases.Contains(x.CaseId)))
        {
            var parsed = ParseSignals($"{ev.EvidenceType}\n{ev.PayloadJson}", scope);
            if (!parsed.ScopeMatch) continue;
            foreach (var tier in parsed.Tiers)
            {
                var b = buckets[tier];
                b.Cases.Add(ev.CaseId);
                b.Indicators.UnionWith(parsed.Indicators.GetValueOrDefault(tier, []));
                b.Sightings++;
                b.Confidence.Add(ev.Confidence);
                b.Activity.Add(ev.CollectedAtUtc);
                b.LastObserved.Add(ev.CollectedAtUtc);
            }
        }

        foreach (var ea in data.EvidenceAssertions.Where(x => scopedCases.Contains(x.CaseId)))
        {
            var parsed = ParseSignals($"{ea.AssertionType}\n{ea.Statement}", scope);
            if (!parsed.ScopeMatch) continue;
            foreach (var tier in parsed.Tiers)
            {
                var b = buckets[tier];
                b.Cases.Add(ea.CaseId);
                b.Indicators.UnionWith(parsed.Indicators.GetValueOrDefault(tier, []));
                b.Sightings++;
                b.Confidence.Add(ea.Confidence);
                b.Activity.Add(ea.ObservedAtUtc);
                b.LastObserved.Add(ea.ObservedAtUtc);
            }
        }

        foreach (var fv in data.FeatureVectors)
        {
            if (!featureCaseMap.TryGetValue(fv.FeatureSnapshotId, out var caseId) || !scopedCases.Contains(caseId)) continue;
            if (!IsTelemetry(fv.FeatureName) || fv.NumericValue <= 0m) continue;
            foreach (var t in TelemetryTiers(fv.FeatureName))
            {
                buckets[t].Cases.Add(caseId);
                buckets[t].Telemetry++;
            }
        }

        foreach (var gf in data.GraphDerivedFeatures)
        {
            if (!featureCaseMap.TryGetValue(gf.FeatureSnapshotId, out var caseId) || !scopedCases.Contains(caseId)) continue;
            if (!IsTelemetry(gf.MetricName) || gf.MetricValue <= 0m) continue;
            foreach (var t in TelemetryTiers(gf.MetricName))
            {
                buckets[t].Cases.Add(caseId);
                buckets[t].Telemetry++;
            }
        }

        foreach (var trust in data.SourceTrustSnapshots)
        {
            if (!featureCaseMap.TryGetValue(trust.FeatureSnapshotId, out var caseId) || !scopedCases.Contains(caseId)) continue;
            var v = Clamp((trust.TrustScore + trust.HistoricalPrecision + trust.HistoricalRecall) / 3m);
            foreach (var t in Tiers) buckets[t].Confidence.Add(v);
        }

        var filteredCases = data.Cases.Where(c => scopedCases.Contains(c.Id)).ToArray();
        var tiers = Tiers.Select(t => BuildTier(t, buckets[t], filteredCases, now)).ToArray();
        var strongest = tiers.OrderByDescending(x => (x.ReadinessScore + x.IncidentActivityScore) / 2m).Take(2).Select(x => x.Tier).ToArray();
        var weakest = tiers.OrderBy(x => (x.ReadinessScore + x.IncidentActivityScore) / 2m).Take(2).Select(x => x.Tier).ToArray();
        var lowAvg = Round(tiers.Take(3).Average(x => x.ReadinessScore));
        var highAvg = Round(tiers.Skip(3).Average(x => x.ReadinessScore));

        return new CoveragePainAnalysisResponse(
            now,
            new CoveragePainScopeResponse(scope.Type, scope.Value),
            new CoveragePainScoreSemanticsResponse(0.40m, 0.25m, 0.20m, 0.15m, 0.35m, 0.30m, 0.20m, 0.15m, 7, 2, 30),
            tiers,
            new CoveragePainGapAnalysisResponse(
                strongest,
                weakest,
                lowAvg,
                highAvg,
                Round(Math.Abs(lowAvg - highAvg)),
                lowAvg >= highAvg
                    ? "Shift improvement toward high tiers (Tools/TTPs) with ATT&CK-linked detections and deeper telemetry."
                    : "Strengthen low tiers (Hashes/IPs/Domains) with faster IOC ingestion and refresh."));
    }

    private static CoveragePainTierAnalysisResponse BuildTier(string tier, Bucket b, IReadOnlyList<CoveragePainCaseSnapshot> cases, DateTimeOffset now)
    {
        var openCases = cases.Count(x => b.Cases.Contains(x.Id) && x.Status is CaseStatus.Open or CaseStatus.InReview or CaseStatus.AwaitingApproval);
        var caseCount = Math.Max(1, b.Cases.Count);
        var readiness = Round((Avg(b.RuleCoverage, b.RuleCoverageCount) * 0.40m) + (Ratio(b.Telemetry, caseCount * 2) * 0.25m) + (Ratio(b.Attack.Count, 8) * 0.20m) + (Freshness(b.LastObserved, now) * 0.15m));
        var incident = Round((Ratio(b.Sightings, caseCount * 3) * 0.35m) + (Ratio(b.Detections, caseCount) * 0.30m) + (Ratio(openCases, Math.Max(1, cases.Count)) * 0.20m) + (Freshness(b.LastObserved, now) * 0.15m));
        var confidence = b.Confidence.Count == 0 ? (b.Indicators.Count == 0 ? 0m : 0.35m) : Round(b.Confidence.Average());
        var trend = Trend(b.Activity, now);
        var missing = b.Rules.Count == 0 && b.Sightings == 0 && b.Telemetry == 0 ? "missing" : (b.Rules.Count > 0 && b.Sightings > 0 && b.Telemetry > 0 ? "complete" : "partial");
        var gaps = new List<string>();
        if (b.Telemetry == 0) gaps.Add("No telemetry signal coverage was observed for this tier.");
        if (b.Rules.Count == 0) gaps.Add("No mapped detections/rules are currently tied to this tier.");
        if (tier == "ttps" && b.Attack.Count == 0) gaps.Add("ATT&CK mappings are missing for TTP-level analysis.");
        if (Freshness(b.LastObserved, now) < 0.35m) gaps.Add("Signals are stale relative to the scoring freshness window.");
        if (confidence < 0.45m) gaps.Add("Signal confidence is low due to sparse or weakly trusted evidence.");
        var actions = new List<string>();
        if (b.Rules.Count == 0) actions.Add($"Author and validate new detections mapped to {tier} indicators.");
        if (b.Telemetry == 0) actions.Add("Enable/verify telemetry pipelines for this scope and tier-specific signal sources.");
        if ((tier == "tools" || tier == "ttps") && b.Attack.Count < 2) actions.Add("Expand ATT&CK-linked rule coverage and enforce technique mapping during rule review.");
        if (Freshness(b.LastObserved, now) < 0.40m) actions.Add("Shorten indicator refresh and enrichment cadence to improve freshness and trend sensitivity.");
        if (actions.Count == 0) actions.Add("Maintain current controls and monitor trend drift for early degradation signals.");

        return new CoveragePainTierAnalysisResponse(
            tier, readiness, incident, confidence, Freshness(b.LastObserved, now), b.Indicators.Count, trend, missing, gaps.Take(3).ToArray(), actions.Take(4).ToArray(),
            new CoveragePainTierSignalBreakdownResponse(b.Cases.Count, b.Detections, b.Rules.Count, b.Attack.Count, b.Telemetry, b.Sightings));
    }

    private static HashSet<Guid> ResolveScopedCases(Scope scope, CoveragePainDataSnapshot data)
    {
        if (scope.Type == "entire-environment")
        {
            var ids = new HashSet<Guid>(data.Cases.Select(x => x.Id));
            foreach (var id in data.Rules.Select(x => x.CaseId)) ids.Add(id);
            foreach (var id in data.EvidenceItems.Select(x => x.CaseId)) ids.Add(id);
            foreach (var id in data.EvidenceAssertions.Select(x => x.CaseId)) ids.Add(id);
            return ids;
        }

        var result = new HashSet<Guid>();
        foreach (var ev in data.EvidenceItems) if (ParseSignals($"{ev.EvidenceType}\n{ev.PayloadJson}", scope).ScopeMatch) result.Add(ev.CaseId);
        foreach (var ea in data.EvidenceAssertions) if (ParseSignals($"{ea.AssertionType}\n{ea.Statement}", scope).ScopeMatch) result.Add(ea.CaseId);
        foreach (var r in data.Rules) if (ParseSignals(r.RuleBody, scope).ScopeMatch) result.Add(r.CaseId);
        return result;
    }

    private static (HashSet<string> Tiers, Dictionary<string, HashSet<string>> Indicators, bool ScopeMatch) ParseSignals(string text, Scope scope)
    {
        var tiers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var indicators = Tiers.ToDictionary(x => x, _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase), StringComparer.OrdinalIgnoreCase);
        var ips = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var servers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Extract(text, tiers, indicators, ips, servers);
        if (text.TrimStart().StartsWith("{", StringComparison.Ordinal)) TryJson(text, tiers, indicators, ips, servers);
        var scopeMatch = scope.Type switch
        {
            "entire-environment" => true,
            "subnet" => ips.Any(ip => InCidr(ip, scope.Value!)),
            _ => servers.Any(x => string.Equals(x, scope.Value, StringComparison.OrdinalIgnoreCase)) || text.Contains(scope.Value ?? string.Empty, StringComparison.OrdinalIgnoreCase),
        };
        if (tiers.Count == 0) tiers.Add("network-host-artifacts");
        return (tiers, indicators, scopeMatch);
    }

    private static void TryJson(string text, HashSet<string> tiers, Dictionary<string, HashSet<string>> indicators, HashSet<string> ips, HashSet<string> servers)
    {
        try
        {
            using var doc = JsonDocument.Parse(text);
            Walk(doc.RootElement, null, tiers, indicators, ips, servers);
        }
        catch (JsonException) { }
    }

    private static void Walk(JsonElement e, string? key, HashSet<string> tiers, Dictionary<string, HashSet<string>> indicators, HashSet<string> ips, HashSet<string> servers)
    {
        if (e.ValueKind == JsonValueKind.Object) foreach (var p in e.EnumerateObject()) Walk(p.Value, p.Name, tiers, indicators, ips, servers);
        else if (e.ValueKind == JsonValueKind.Array) foreach (var c in e.EnumerateArray()) Walk(c, key, tiers, indicators, ips, servers);
        else if (e.ValueKind == JsonValueKind.String)
        {
            var v = e.GetString() ?? string.Empty;
            Extract(v, tiers, indicators, ips, servers);
            if (key is "server" or "hostname" or "host" or "device" or "asset" or "computer") servers.Add(v.Trim());
        }
    }

    private static void Extract(string text, HashSet<string> tiers, Dictionary<string, HashSet<string>> indicators, HashSet<string> ips, HashSet<string> servers)
    {
        foreach (Match m in HashRegex.Matches(text)) { indicators["hash-values"].Add(m.Value); tiers.Add("hash-values"); }
        foreach (Match m in Ipv4Regex.Matches(text)) if (IPAddress.TryParse(m.Value, out _)) { indicators["ip-addresses"].Add(m.Value); ips.Add(m.Value); tiers.Add("ip-addresses"); }
        foreach (Match m in DomainRegex.Matches(text)) { indicators["domain-names"].Add(m.Value.ToLowerInvariant()); tiers.Add("domain-names"); }
        foreach (Match m in AttackRegex.Matches(text)) { indicators["ttps"].Add(m.Value.ToUpperInvariant()); tiers.Add("ttps"); }
        if (ContainsAny(text, "mimikatz", "cobalt", "metasploit", "powershell", "cmd.exe", "wmic", "tool", "beacon")) tiers.Add("tools");
        if (ContainsAny(text, "host", "server", "artifact", "registry", "service", "process", "url", "path")) tiers.Add("network-host-artifacts");
        if (ContainsAny(text, "server", "hostname", "host", "device", "asset", "computer")) servers.Add(text.Trim());
    }

    private static bool IsTelemetry(string name) => ContainsAny(name, "telemetry", "sensor", "coverage", "visibility", "log");
    private static IReadOnlyList<string> TelemetryTiers(string name)
    {
        name = name.ToLowerInvariant();
        var tiers = new List<string>();
        if (name.Contains("hash")) tiers.Add("hash-values");
        if (name.Contains("ip") || name.Contains("network")) tiers.Add("ip-addresses");
        if (name.Contains("domain") || name.Contains("dns")) tiers.Add("domain-names");
        if (name.Contains("host") || name.Contains("artifact") || name.Contains("endpoint")) tiers.Add("network-host-artifacts");
        if (name.Contains("tool") || name.Contains("process")) tiers.Add("tools");
        if (name.Contains("attack") || name.Contains("technique") || name.Contains("ttp")) tiers.Add("ttps");
        return tiers.Count == 0 ? Tiers : tiers;
    }

    private static IReadOnlyList<string> RuleTiers(CoveragePainRuleSnapshot r)
    {
        var tiers = ParseSignals(r.RuleBody, new Scope("entire-environment", null)).Tiers;
        if (r.LinkedAttackTechniques.Length > 0) tiers.Add("ttps");
        return tiers.ToArray();
    }

    private static Scope NormalizeScope(string type, string? value)
    {
        var normalized = type.Trim().ToLowerInvariant();
        if (normalized is not ("entire-environment" or "subnet" or "single-server"))
            throw new ArgumentException("ScopeType must be one of: entire-environment, subnet, single-server.", nameof(type));
        if (normalized != "entire-environment" && string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("ScopeValue is required for subnet and single-server scopes.", nameof(value));
        return new Scope(normalized, string.IsNullOrWhiteSpace(value) ? null : value.Trim());
    }

    private static bool InCidr(string ipText, string cidr)
    {
        var parts = cidr.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var subnet) || !IPAddress.TryParse(ipText, out var ip) || !int.TryParse(parts[1], out var prefix)) return false;
        var sb = subnet.GetAddressBytes();
        var ib = ip.GetAddressBytes();
        if (sb.Length != 4 || ib.Length != 4 || prefix is < 0 or > 32) return false;
        uint s = ((uint)sb[0] << 24) | ((uint)sb[1] << 16) | ((uint)sb[2] << 8) | sb[3];
        uint i = ((uint)ib[0] << 24) | ((uint)ib[1] << 16) | ((uint)ib[2] << 8) | ib[3];
        var mask = prefix == 0 ? 0u : uint.MaxValue << (32 - prefix);
        return (s & mask) == (i & mask);
    }

    private static bool ContainsAny(string text, params string[] needles) => needles.Any(n => text.Contains(n, StringComparison.OrdinalIgnoreCase));
    private static decimal Clamp(decimal x) => Math.Min(1m, Math.Max(0m, x));
    private static decimal Round(decimal x) => decimal.Round(Clamp(x), 4, MidpointRounding.AwayFromZero);
    private static decimal Avg(decimal sum, int count) => count == 0 ? 0m : Clamp(sum / count);
    private static decimal Ratio(int n, int d) => d <= 0 ? 0m : Round(n / (decimal)d);
    private static decimal Freshness(IReadOnlyCollection<DateTimeOffset> times, DateTimeOffset now)
    {
        if (times.Count == 0) return 0m;
        var days = (decimal)Math.Max(0, (now - times.Max()).TotalDays);
        if (days <= 2m) return 1m;
        if (days >= 30m) return 0m;
        return Round((30m - days) / 28m);
    }

    private static string Trend(IReadOnlyCollection<DateTimeOffset> eventsUtc, DateTimeOffset now)
    {
        if (eventsUtc.Count == 0) return "insufficient-data";
        var currentStart = now.AddDays(-7);
        var previousStart = now.AddDays(-14);
        var current = eventsUtc.Count(x => x >= currentStart && x <= now);
        var previous = eventsUtc.Count(x => x >= previousStart && x < currentStart);
        if (current > previous) return "up";
        if (current < previous) return "down";
        return "stable";
    }

    private sealed record Scope(string Type, string? Value);
    private sealed class Bucket
    {
        public HashSet<Guid> Cases { get; } = [];
        public HashSet<Guid> Rules { get; } = [];
        public HashSet<string> Indicators { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Attack { get; } = new(StringComparer.OrdinalIgnoreCase);
        public List<decimal> Confidence { get; } = [];
        public List<DateTimeOffset> Activity { get; } = [];
        public List<DateTimeOffset> LastObserved { get; } = [];
        public decimal RuleCoverage { get; set; }
        public int RuleCoverageCount { get; set; }
        public int Detections { get; set; }
        public int Telemetry { get; set; }
        public int Sightings { get; set; }
    }
}
