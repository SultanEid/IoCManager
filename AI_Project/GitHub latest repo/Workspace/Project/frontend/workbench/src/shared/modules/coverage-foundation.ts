import type {
  AnalysisMode,
  ComparedTier,
  ConfidenceLevel,
  CoverageTargetProfile,
  CoverageVM,
  FreshnessMetric,
  FreshnessState,
  GapReason,
  PainGapRollup,
  ScopeTarget,
  ScopeType,
  TierCompareDelta,
  TierDefinition,
  TierSnapshot,
  TierState,
} from "@/shared/modules/types"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatFreshnessLabel(ageMinutes: number) {
  if (ageMinutes < 60) {
    return `${ageMinutes}m`
  }

  const hours = Math.floor(ageMinutes / 60)
  const minutes = ageMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

export function freshnessStateFromMinutes(ageMinutes: number): FreshnessState {
  if (ageMinutes <= 90) {
    return "Fresh"
  }

  if (ageMinutes <= 300) {
    return "Aging"
  }

  return "Stale"
}

export function createFreshnessMetric(ageMinutes: number): FreshnessMetric {
  return {
    ageMinutes,
    label: formatFreshnessLabel(ageMinutes),
    state: freshnessStateFromMinutes(ageMinutes),
  }
}

const COVERAGE_SUBPAGES: CoverageVM["subpages"] = [
  { key: "pain-analysis", label: "Registry Overview", href: "/ioc-registry" },
  { key: "telemetry", label: "Telemetry Coverage", href: "/ioc-registry/telemetry" },
  { key: "sources", label: "Source Analysis", href: "/ioc-registry/sources" },
]

const SCOPE_TYPES: CoverageVM["scopeTypes"] = [
  { key: "environment", label: "Environment" },
  { key: "subnet", label: "Subnet" },
  { key: "server", label: "Server" },
]

const TARGETS_BY_SCOPE_TYPE: Record<ScopeType, ScopeTarget[]> = {
  environment: [
    {
      id: "env-global-prod",
      type: "environment",
      label: "Global Production",
      description: "Cross-region production controls, detections, and analyst workflows.",
    },
    {
      id: "env-corp-it",
      type: "environment",
      label: "Corporate IT",
      description: "Workstation and collaboration environment with high user-activity variance.",
    },
    {
      id: "env-payment-cloud",
      type: "environment",
      label: "Payment Cloud",
      description: "Treasury and payment services with strict uptime and fraud response gates.",
    },
  ],
  subnet: [
    {
      id: "subnet-dmz-egress",
      type: "subnet",
      label: "DMZ Egress Subnet",
      description: "Internet-facing egress zone with high scan pressure and beacon monitoring.",
    },
    {
      id: "subnet-payments-east",
      type: "subnet",
      label: "Payments East Subnet",
      description: "East region payment traffic and service-to-service security boundaries.",
    },
    {
      id: "subnet-identity-core",
      type: "subnet",
      label: "Identity Core Subnet",
      description: "Authentication and federation traffic with privileged control-plane activity.",
    },
  ],
  server: [
    {
      id: "srv-idp-01",
      type: "server",
      label: "IDP-01 Federation",
      description: "Identity provider node handling authentication and token issuance.",
    },
    {
      id: "srv-payments-api-07",
      type: "server",
      label: "PAY-API-07",
      description: "Payment API host handling transaction orchestration and partner callbacks.",
    },
    {
      id: "srv-dc-gateway-03",
      type: "server",
      label: "DC-GW-03",
      description: "Datacenter gateway host for perimeter telemetry and network controls.",
    },
  ],
}

const BASE_TIERS: TierDefinition[] = [
  {
    id: "ttps",
    label: "TTPs",
    painWeight: 100,
    readiness: { score: 68, state: "Moderate", count: 41, trend: 5, confidence: "High", freshness: createFreshnessMetric(62) },
    active: { score: 61, state: "Stressed", count: 19, trend: -4, confidence: "Medium", freshness: createFreshnessMetric(126) },
    justification:
      "Behavioral detections exist for core intrusion chains, but adaptation speed is still outpacing rule hardening for credential and cloud pivots.",
    observedItems: [
      { item: "T1110 + T1078 chained spray", source: "Identity telemetry", lastSeen: "1h ago", impact: "Credential foothold attempts across 3 tenants" },
      { item: "T1021 lateral movement probes", source: "East-west network analytics", lastSeen: "3h ago", impact: "Cross-zone movement attempts rose 11%" },
    ],
    weakCoverageGaps: [
      "Behavioral correlation misses low-and-slow cloud session abuse patterns.",
      "Replay depth for mixed Windows/Linux privilege paths is uneven.",
    ],
    missingDataGaps: [
      "Endpoint command telemetry unavailable for 12% of contractor fleet.",
      "Cloud control-plane event lag exceeds SLA in one region.",
    ],
    recommendations: [
      { title: "Expand identity + cloud behavior fusion", owner: "Detection Engineering", eta: "5 days", expectedEffect: "+8 readiness on TTP tier" },
      { title: "Gate promotions on telemetry health", owner: "SOC Platform", eta: "3 days", expectedEffect: "Reduce blind spots under active pressure" },
    ],
    linkedCases: [
      { id: "AL-5824", title: "Credential spray with cloud pivot", state: "Investigating" },
      { id: "AL-5798", title: "Post-auth lateral movement", state: "Awaiting Approval" },
    ],
    linkedRules: [
      { id: "SIG-2041", name: "PowerShell Credential Artifact Sweep", language: "Sigma", state: "Canary" },
      { id: "YAR-8821", name: "Lumma Stealer Staging Buffer", language: "YARA", state: "Review" },
    ],
    summary: { painPotential: 86, readinessDepth: 68, dataCompleteness: 72, actionPriority: "Immediate" },
  },
  {
    id: "tools",
    label: "Tools",
    painWeight: 84,
    readiness: { score: 74, state: "Moderate", count: 57, trend: 7, confidence: "High", freshness: createFreshnessMetric(54) },
    active: { score: 69, state: "Moderate", count: 28, trend: 2, confidence: "Medium", freshness: createFreshnessMetric(115) },
    justification:
      "Tool-family detections are broad, but confidence drops when adversaries move into dual-use administration utilities.",
    observedItems: [
      { item: "Remote admin utility cluster", source: "Endpoint process graph", lastSeen: "2h ago", impact: "High overlap with legitimate admin behavior" },
      { item: "Credential dump utility variant", source: "Memory + registry watch", lastSeen: "6h ago", impact: "Two near misses in replay" },
    ],
    weakCoverageGaps: [
      "Intent scoring for dual-use tools is underweighted.",
      "Toolchain sequence scoring does not account for host criticality.",
    ],
    missingDataGaps: ["Process parent lineage missing on legacy host pool."],
    recommendations: [
      { title: "Add role-aware tool intent scoring", owner: "CTI Analytics", eta: "1 week", expectedEffect: "Lower active false positives" },
      { title: "Backfill process ancestry collection", owner: "Endpoint Team", eta: "4 days", expectedEffect: "+10 data completeness" },
    ],
    linkedCases: [
      { id: "AL-5772", title: "Dual-use utility abuse", state: "Investigating" },
      { id: "AL-5711", title: "Credential material staging", state: "In Review" },
    ],
    linkedRules: [
  { id: "SUR-7822", name: "Suricata JA3 Burst Detector", language: "Suricata", state: "Draft" },
      { id: "SNO-6102", name: "TLS JA3 C2 Beacon Burst", language: "Snort", state: "Live" },
    ],
    summary: { painPotential: 76, readinessDepth: 74, dataCompleteness: 78, actionPriority: "This Sprint" },
  },
  {
    id: "artifacts",
    label: "Network/Host Artifacts",
    painWeight: 65,
    readiness: { score: 80, state: "Resilient", count: 122, trend: 4, confidence: "High", freshness: createFreshnessMetric(41) },
    active: { score: 76, state: "Moderate", count: 43, trend: 1, confidence: "High", freshness: createFreshnessMetric(93) },
    justification:
      "Artifact signatures remain dependable and replay-stable; risk comes from uneven sensor quality in satellite zones.",
    observedItems: [
      { item: "Suspicious mutex family", source: "Host telemetry", lastSeen: "44m ago", impact: "Contained by existing suppression policy" },
      { item: "Beacon interval artifact", source: "Netflow analytics", lastSeen: "2h ago", impact: "Alert precision remains high" },
    ],
    weakCoverageGaps: ["Coverage drifts during encrypted traffic spikes where metadata is sparse."],
    missingDataGaps: ["No DNS response visibility for two branch resolvers."],
    recommendations: [
      { title: "Route branch DNS logs into central stream", owner: "Infrastructure", eta: "2 days", expectedEffect: "Close DNS blind spot" },
    ],
    linkedCases: [
      { id: "AL-5644", title: "Beaconing with host artifacts", state: "Mitigated" },
      { id: "AL-5662", title: "Suspicious resolver pivots", state: "Investigating" },
    ],
    linkedRules: [
      { id: "SNO-6102", name: "TLS JA3 C2 Beacon Burst", language: "Snort", state: "Live" },
      { id: "SIG-1888", name: "Encoded PowerShell Dump", language: "Sigma", state: "Approved" },
    ],
    summary: { painPotential: 65, readinessDepth: 80, dataCompleteness: 85, actionPriority: "This Sprint" },
  },
  {
    id: "domains",
    label: "Domain Names",
    painWeight: 48,
    readiness: { score: 84, state: "Resilient", count: 214, trend: 3, confidence: "High", freshness: createFreshnessMetric(58) },
    active: { score: 79, state: "Moderate", count: 57, trend: -2, confidence: "Medium", freshness: createFreshnessMetric(141) },
    justification:
      "Domain controls are mature, but incident-mode quality drops when newly registered domains arrive after cluster activation.",
    observedItems: [
      { item: "Fast-flux domain pair", source: "Passive DNS", lastSeen: "2h ago", impact: "Escalated to active alert" },
      { item: "Look-alike login domain", source: "Brand monitoring", lastSeen: "5h ago", impact: "Blocked at secure gateway" },
    ],
    weakCoverageGaps: ["Domain similarity model is not retrained on latest cluster corpus."],
    missingDataGaps: ["Registrar enrichment missing for 21% of newly seen domains in first hour."],
    recommendations: [
      { title: "Increase registrar enrichment cadence", owner: "Feed Operations", eta: "48 hours", expectedEffect: "Faster domain confidence updates" },
    ],
    linkedCases: [
      { id: "AL-5621", title: "Brand phishing cluster", state: "Investigating" },
      { id: "AL-5604", title: "Fast-flux redirect chain", state: "In Review" },
    ],
    linkedRules: [
      { id: "SIG-1652", name: "Credential Material Export", language: "Sigma", state: "Approved" },
      { id: "YAR-7712", name: "Vidar Config Pull", language: "YARA", state: "Live" },
    ],
    summary: { painPotential: 49, readinessDepth: 84, dataCompleteness: 80, actionPriority: "Planned" },
  },
  {
    id: "ips",
    label: "IP Addresses",
    painWeight: 31,
    readiness: { score: 87, state: "Resilient", count: 433, trend: 2, confidence: "Medium", freshness: createFreshnessMetric(84) },
    active: { score: 72, state: "Moderate", count: 132, trend: -7, confidence: "Low", freshness: createFreshnessMetric(244) },
    justification:
      "IP coverage is broad but volatile; cloud-hosted attacker infrastructure churn rapidly erodes active confidence.",
    observedItems: [
      { item: "Short-lived VPS beacon hosts", source: "External reputation feed", lastSeen: "36m ago", impact: "High list churn across controls" },
      { item: "Known scanner cluster", source: "Perimeter IDS", lastSeen: "1h ago", impact: "Automatically mitigated" },
    ],
    weakCoverageGaps: ["Static reputation weighting over-penalizes stale indicators."],
    missingDataGaps: [
      "ASN enrichment delays exceed SLA during peak windows.",
      "Geolocation feed has regional dropouts.",
    ],
    recommendations: [
      { title: "Switch to recency-weighted IP scoring", owner: "Scoring Engine", eta: "6 days", expectedEffect: "Improve active precision" },
      { title: "Add ASN enrichment failover feed", owner: "Platform", eta: "4 days", expectedEffect: "Stabilize data completeness" },
    ],
    linkedCases: [
      { id: "AL-5530", title: "Transient C2 infrastructure", state: "Investigating" },
      { id: "AL-5559", title: "Scanner burst cluster", state: "Mitigated" },
    ],
    linkedRules: [
      { id: "SNO-5440", name: "TLS Interval Beacon", language: "Snort", state: "Canary" },
  { id: "SUR-7010", name: "JA3 Burst (Legacy)", language: "Suricata", state: "Review" },
    ],
    summary: { painPotential: 36, readinessDepth: 87, dataCompleteness: 68, actionPriority: "Immediate" },
  },
  {
    id: "hashes",
    label: "Hash Values",
    painWeight: 18,
    readiness: { score: 90, state: "Resilient", count: 702, trend: 1, confidence: "Medium", freshness: createFreshnessMetric(97) },
    active: { score: 69, state: "Stressed", count: 205, trend: -8, confidence: "Low", freshness: createFreshnessMetric(332) },
    justification:
      "Hash detections are high-volume and useful for containment, but provide limited strategic pain under active adaptation.",
    observedItems: [
      { item: "Commodity loader hash set", source: "Malware sandbox", lastSeen: "25m ago", impact: "Containment completed quickly" },
      { item: "Packed stealer hash family", source: "Email detonation", lastSeen: "1h ago", impact: "Low long-term utility" },
    ],
    weakCoverageGaps: ["Hash-only detections are not consistently pivoted to behavioral controls."],
    missingDataGaps: ["Sample exchange latency from two regional sandboxes."],
    recommendations: [
      { title: "Force hash-to-behavior pivot in triage", owner: "SOC Operations", eta: "3 days", expectedEffect: "Shift analysis toward high-pain controls" },
    ],
    linkedCases: [
      { id: "AL-5494", title: "Commodity loader outbreak", state: "Mitigated" },
      { id: "AL-5471", title: "Stealer family refresh", state: "Investigating" },
    ],
    linkedRules: [
      { id: "YAR-8099", name: "Lumma Loader Beacon", language: "YARA", state: "Live" },
      { id: "SIG-2203", name: "Binary Hash Burst", language: "Sigma", state: "Canary" },
    ],
    summary: { painPotential: 23, readinessDepth: 90, dataCompleteness: 74, actionPriority: "This Sprint" },
  },
]

const BASE_ATTACK_COVERAGE: CoverageTargetProfile["attackCoverage"] = [
  { id: "at-1", tactic: "Initial Access", techniqueId: "T1566", technique: "Phishing", coverageQuality: 78, confidence: "High", freshness: createFreshnessMetric(49), linkedDetections: 7, linkedCases: ["AL-5621", "AL-5604"], gapReason: "none" },
  { id: "at-2", tactic: "Execution", techniqueId: "T1059", technique: "Command and Scripting Interpreter", coverageQuality: 71, confidence: "Medium", freshness: createFreshnessMetric(102), linkedDetections: 5, linkedCases: ["AL-5824"], gapReason: "weak_logic" },
  { id: "at-3", tactic: "Persistence", techniqueId: "T1547", technique: "Boot or Logon Autostart", coverageQuality: 66, confidence: "Medium", freshness: createFreshnessMetric(138), linkedDetections: 3, linkedCases: ["AL-5711"], gapReason: "weak_logic" },
  { id: "at-4", tactic: "Privilege Escalation", techniqueId: "T1068", technique: "Exploitation for Privilege Escalation", coverageQuality: 58, confidence: "Low", freshness: createFreshnessMetric(281), linkedDetections: 2, linkedCases: ["AL-5798"], gapReason: "missing_telemetry" },
  { id: "at-5", tactic: "Credential Access", techniqueId: "T1003", technique: "OS Credential Dumping", coverageQuality: 73, confidence: "High", freshness: createFreshnessMetric(74), linkedDetections: 6, linkedCases: ["AL-5772", "AL-5824"], gapReason: "none" },
  { id: "at-6", tactic: "Lateral Movement", techniqueId: "T1021", technique: "Remote Services", coverageQuality: 63, confidence: "Medium", freshness: createFreshnessMetric(172), linkedDetections: 3, linkedCases: ["AL-5798"], gapReason: "missing_telemetry" },
  { id: "at-7", tactic: "Command and Control", techniqueId: "T1071", technique: "Application Layer Protocol", coverageQuality: 75, confidence: "High", freshness: createFreshnessMetric(81), linkedDetections: 4, linkedCases: ["AL-5530"], gapReason: "none" },
]

const BASE_TELEMETRY_COVERAGE: CoverageTargetProfile["telemetryCoverage"] = [
  { id: "tel-1", domain: "Endpoint", source: "EDR Process Lineage", collectionHealth: 86, parseQuality: 82, detectionUtility: 79, freshness: createFreshnessMetric(43), status: "Collected", gapReason: "none" },
  { id: "tel-2", domain: "Endpoint", source: "Script Block Logging", collectionHealth: 71, parseQuality: 63, detectionUtility: 72, freshness: createFreshnessMetric(119), status: "Collected Weak", gapReason: "weak_logic" },
  { id: "tel-3", domain: "Network", source: "NetFlow East-West", collectionHealth: 83, parseQuality: 76, detectionUtility: 77, freshness: createFreshnessMetric(96), status: "Collected", gapReason: "none" },
  { id: "tel-4", domain: "Network", source: "DNS Resolver Replies", collectionHealth: 58, parseQuality: 61, detectionUtility: 52, freshness: createFreshnessMetric(214), status: "Collected Weak", gapReason: "missing_telemetry" },
  { id: "tel-5", domain: "Identity", source: "Federation Audit Logs", collectionHealth: 79, parseQuality: 84, detectionUtility: 81, freshness: createFreshnessMetric(58), status: "Collected", gapReason: "none" },
  { id: "tel-6", domain: "Cloud", source: "Control Plane Events", collectionHealth: 62, parseQuality: 67, detectionUtility: 59, freshness: createFreshnessMetric(267), status: "Collected Weak", gapReason: "missing_telemetry" },
  { id: "tel-7", domain: "Email", source: "Detonation Sandbox", collectionHealth: 65, parseQuality: 0, detectionUtility: 38, freshness: createFreshnessMetric(423), status: "Not Collected", gapReason: "missing_telemetry" },
]

const BASE_SOURCE_ANALYSIS: CoverageTargetProfile["sourceAnalysis"] = [
  { id: "src-1", source: "Internal EDR", trust: 88, reliability: 84, freshness: createFreshnessMetric(32), detectionContribution: 27, dependencyRisk: "Medium", riskFlags: ["collector drift"], recommendedAction: "Pin collector v3.2 rollout to all high-value hosts." },
  { id: "src-2", source: "Passive DNS Feed", trust: 78, reliability: 76, freshness: createFreshnessMetric(79), detectionContribution: 19, dependencyRisk: "Low", riskFlags: ["enrichment lag"], recommendedAction: "Increase first-hour enrichment polling cadence." },
  { id: "src-3", source: "Cloud Audit Stream", trust: 81, reliability: 61, freshness: createFreshnessMetric(193), detectionContribution: 15, dependencyRisk: "High", riskFlags: ["regional lag", "schema drift"], recommendedAction: "Enable schema guardrail and regional failover source." },
  { id: "src-4", source: "External Reputation Feed", trust: 63, reliability: 58, freshness: createFreshnessMetric(235), detectionContribution: 11, dependencyRisk: "High", riskFlags: ["stale indicators"], recommendedAction: "Switch to recency-weighted scoring profile." },
  { id: "src-5", source: "Email Malware Sandbox", trust: 74, reliability: 52, freshness: createFreshnessMetric(414), detectionContribution: 8, dependencyRisk: "High", riskFlags: ["sample queue latency"], recommendedAction: "Add secondary sandbox lane for suspicious payload bursts." },
]

type TargetModifier = {
  readinessScore: number
  activeScore: number
  countScale: number
  trend: number
  freshnessMinutes: number
  attackQuality: number
  telemetryQuality: number
  sourceReliability: number
  confidencePenalty: number
}

const TARGET_MODIFIERS: Record<string, TargetModifier> = {
  "env-global-prod": { readinessScore: 0, activeScore: 0, countScale: 1, trend: 0, freshnessMinutes: 0, attackQuality: 0, telemetryQuality: 0, sourceReliability: 0, confidencePenalty: 0 },
  "env-corp-it": { readinessScore: -5, activeScore: -7, countScale: 1.08, trend: -1, freshnessMinutes: 38, attackQuality: -6, telemetryQuality: -7, sourceReliability: -5, confidencePenalty: 1 },
  "env-payment-cloud": { readinessScore: -2, activeScore: -3, countScale: 0.84, trend: 1, freshnessMinutes: 22, attackQuality: -2, telemetryQuality: -3, sourceReliability: -1, confidencePenalty: 0 },
  "subnet-dmz-egress": { readinessScore: -1, activeScore: -6, countScale: 0.72, trend: -2, freshnessMinutes: 56, attackQuality: -4, telemetryQuality: -6, sourceReliability: -4, confidencePenalty: 1 },
  "subnet-payments-east": { readinessScore: -4, activeScore: -5, countScale: 0.67, trend: -1, freshnessMinutes: 31, attackQuality: -5, telemetryQuality: -4, sourceReliability: -2, confidencePenalty: 1 },
  "subnet-identity-core": { readinessScore: 3, activeScore: -1, countScale: 0.61, trend: 1, freshnessMinutes: 12, attackQuality: 2, telemetryQuality: 1, sourceReliability: 3, confidencePenalty: 0 },
  "srv-idp-01": { readinessScore: 4, activeScore: 2, countScale: 0.28, trend: 1, freshnessMinutes: -8, attackQuality: 3, telemetryQuality: 2, sourceReliability: 2, confidencePenalty: 0 },
  "srv-payments-api-07": { readinessScore: -6, activeScore: -8, countScale: 0.24, trend: -2, freshnessMinutes: 74, attackQuality: -7, telemetryQuality: -8, sourceReliability: -6, confidencePenalty: 1 },
  "srv-dc-gateway-03": { readinessScore: -2, activeScore: -4, countScale: 0.31, trend: -1, freshnessMinutes: 45, attackQuality: -3, telemetryQuality: -4, sourceReliability: -3, confidencePenalty: 1 },
}

function shiftConfidence(confidence: ConfidenceLevel, penalty: number): ConfidenceLevel {
  if (penalty <= 0) {
    return confidence
  }

  if (confidence === "High") {
    return penalty >= 2 ? "Low" : "Medium"
  }

  if (confidence === "Medium") {
    return "Low"
  }

  return "Low"
}

function scoreToState(score: number): TierState {
  if (score >= 80) {
    return "Resilient"
  }

  if (score >= 67) {
    return "Moderate"
  }

  if (score >= 55) {
    return "Stressed"
  }

  return "Critical"
}

function adjustSnapshot(snapshot: TierSnapshot, modifier: TargetModifier, mode: AnalysisMode): TierSnapshot {
  const scoreShift = mode === "readiness" ? modifier.readinessScore : modifier.activeScore
  const score = clamp(snapshot.score + scoreShift, 36, 96)
  const trend = clamp(snapshot.trend + modifier.trend, -15, 15)
  const count = Math.max(1, Math.round(snapshot.count * modifier.countScale))
  const freshnessMinutes = Math.max(6, snapshot.freshness.ageMinutes + modifier.freshnessMinutes)
  return {
    score,
    state: scoreToState(score),
    trend,
    count,
    confidence: shiftConfidence(snapshot.confidence, modifier.confidencePenalty),
    freshness: createFreshnessMetric(freshnessMinutes),
  }
}

function adjustTier(tier: TierDefinition, modifier: TargetModifier): TierDefinition {
  const readiness = adjustSnapshot(tier.readiness, modifier, "readiness")
  const active = adjustSnapshot(tier.active, modifier, "active")
  const missingDataGaps = tier.missingDataGaps.slice()
  const weakCoverageGaps = tier.weakCoverageGaps.slice()

  if (modifier.freshnessMinutes > 40) {
    missingDataGaps.push("Freshness lag exceeds tolerance for this target during peak windows.")
  }

  if (modifier.attackQuality < -5) {
    weakCoverageGaps.push("Technique mappings lag behind observed adversary workflow variations.")
  }

  return {
    ...tier,
    readiness,
    active,
    weakCoverageGaps,
    missingDataGaps,
    summary: {
      painPotential: clamp(tier.summary.painPotential + Math.round((70 - active.score) / 5), 18, 96),
      readinessDepth: readiness.score,
      dataCompleteness: clamp(tier.summary.dataCompleteness - (missingDataGaps.length - tier.missingDataGaps.length) * 8, 41, 97),
      actionPriority: active.score < 62 || missingDataGaps.length > 2 ? "Immediate" : tier.summary.actionPriority,
    },
  }
}

function adjustGapReason(reason: GapReason, modifier: TargetModifier): GapReason {
  if (reason === "none" && modifier.telemetryQuality < -5) {
    return "missing_telemetry"
  }

  if (reason === "none" && modifier.attackQuality < -4) {
    return "weak_logic"
  }

  return reason
}

function buildProfile(target: ScopeTarget): CoverageTargetProfile {
  const modifier = TARGET_MODIFIERS[target.id]
  const tiers = BASE_TIERS.map((tier) => adjustTier(tier, modifier))
  const rollup = buildPainGapRollup(tiers, "readiness")

  return {
    targetId: target.id,
    summary: {
      painPotential: clamp(
        Math.round(tiers.reduce((sum, tier) => sum + tier.summary.painPotential, 0) / tiers.length),
        20,
        96,
      ),
      readinessDepth: rollup.averageScore,
      dataCompleteness: clamp(100 - rollup.missingDataCount * 5 - Math.round((100 - rollup.confidenceIntegrity) * 0.2), 38, 96),
      actionPriority: rollup.missingDataCount >= 8 || rollup.averageScore < 65 ? "Immediate" : rollup.averageScore < 76 ? "This Sprint" : "Planned",
    },
    tiers,
    attackCoverage: BASE_ATTACK_COVERAGE.map((row) => ({
      ...row,
      coverageQuality: clamp(row.coverageQuality + modifier.attackQuality, 25, 95),
      confidence: shiftConfidence(row.confidence, modifier.confidencePenalty),
      freshness: createFreshnessMetric(Math.max(8, row.freshness.ageMinutes + modifier.freshnessMinutes)),
      linkedDetections: Math.max(0, row.linkedDetections + Math.round(modifier.countScale * 2) - 2),
      gapReason: adjustGapReason(row.gapReason, modifier),
    })),
    telemetryCoverage: BASE_TELEMETRY_COVERAGE.map((row) => ({
      ...row,
      collectionHealth: clamp(row.collectionHealth + modifier.telemetryQuality, 0, 98),
      parseQuality: clamp(row.parseQuality + modifier.telemetryQuality, 0, 98),
      detectionUtility: clamp(row.detectionUtility + modifier.attackQuality, 0, 98),
      freshness: createFreshnessMetric(Math.max(8, row.freshness.ageMinutes + modifier.freshnessMinutes)),
      gapReason: adjustGapReason(row.gapReason, modifier),
      status:
        row.status === "Not Collected" || (row.collectionHealth + modifier.telemetryQuality < 18)
          ? "Not Collected"
          : row.collectionHealth + modifier.telemetryQuality < 68
            ? "Collected Weak"
            : "Collected",
    })),
    sourceAnalysis: BASE_SOURCE_ANALYSIS.map((row) => ({
      ...row,
      trust: clamp(row.trust + Math.round(modifier.sourceReliability * 0.7), 24, 97),
      reliability: clamp(row.reliability + modifier.sourceReliability, 18, 97),
      freshness: createFreshnessMetric(Math.max(8, row.freshness.ageMinutes + modifier.freshnessMinutes)),
      detectionContribution: clamp(row.detectionContribution + Math.round(modifier.countScale * 3) - 2, 2, 44),
      dependencyRisk:
        row.dependencyRisk === "High" || modifier.sourceReliability < -4
          ? "High"
          : row.dependencyRisk === "Medium" || modifier.sourceReliability < -1
            ? "Medium"
            : "Low",
    })),
  }
}

export function calculateTierDelta(base: TierSnapshot, compare: TierSnapshot): TierCompareDelta {
  return {
    score: base.score - compare.score,
    count: base.count - compare.count,
    trend: base.trend - compare.trend,
    freshnessMinutes: base.freshness.ageMinutes - compare.freshness.ageMinutes,
  }
}

export function buildComparedTiers(
  baseline: TierDefinition[],
  comparison: TierDefinition[],
  mode: AnalysisMode,
): ComparedTier[] {
  const byId = new Map(comparison.map((tier) => [tier.id, tier]))
  return baseline.map((tier) => {
    const compareTier = byId.get(tier.id) ?? tier
    const baseSnapshot = mode === "readiness" ? tier.readiness : tier.active
    const compareSnapshot = mode === "readiness" ? compareTier.readiness : compareTier.active
    return {
      tier,
      delta: calculateTierDelta(baseSnapshot, compareSnapshot),
    }
  })
}

export function buildPainGapRollup(tiers: TierDefinition[], mode: AnalysisMode): PainGapRollup {
  const snapshots = tiers.map((tier) => (mode === "readiness" ? tier.readiness : tier.active))
  const totalScore = snapshots.reduce((sum, snapshot) => sum + snapshot.score, 0)
  const confidenceScore = snapshots.reduce((sum, snapshot) => {
    if (snapshot.confidence === "High") {
      return sum + 1
    }

    if (snapshot.confidence === "Medium") {
      return sum + 0.65
    }

    return sum + 0.35
  }, 0)

  return {
    averageScore: Math.round(totalScore / Math.max(1, snapshots.length)),
    confidenceIntegrity: Math.round((confidenceScore / Math.max(1, snapshots.length)) * 100),
    weakCoverageCount: tiers.reduce((sum, tier) => sum + tier.weakCoverageGaps.length, 0),
    missingDataCount: tiers.reduce((sum, tier) => sum + tier.missingDataGaps.length, 0),
  }
}

export function getCoverageVm(): CoverageVM {
  const allTargets = Object.values(TARGETS_BY_SCOPE_TYPE).flat()
  const profilesByTargetId = Object.fromEntries(allTargets.map((target) => [target.id, buildProfile(target)]))

  return {
    scopeTypes: SCOPE_TYPES,
    targetsByScopeType: TARGETS_BY_SCOPE_TYPE,
    profilesByTargetId,
    subpages: COVERAGE_SUBPAGES,
    defaults: {
      scopeType: "environment",
      mode: "readiness",
      targetByScopeType: {
        environment: "env-global-prod",
        subnet: "subnet-dmz-egress",
        server: "srv-idp-01",
      },
      compareTargetByScopeType: {
        environment: "env-corp-it",
        subnet: "subnet-payments-east",
        server: "srv-payments-api-07",
      },
    },
  }
}



