import type {
  CaseResponse,
} from "@/shared/api/schemas"
import type {
  CaseDetailVM,
  GraphRelationshipsVM,
  QueueItem,
  ReportsIngestionVM,
  SettingsAdminVM,
} from "@/shared/gateway/types"
import type {
  AdminVM,
  CaseDetailCollection,
  CaseListVM,
  CoverageVM,
  DetectionRuleItem,
  DetectionStudioVM,
  InvestigationWorkspaceVM,
  OperationRolloutRow,
  OperationsVM,
  QueueVM,
  ReportBundleRow,
  ReportsVM,
  ThreatIntelVM,
} from "@/shared/modules/types"
import { getCoverageVm as getCoverageVmFactory } from "@/shared/modules/coverage-foundation"

function sortUtcDesc<T extends { updatedAtUtc: string }>(rows: T[]) {
  return rows.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))
}

export function buildQueueVm(payload: { queue: QueueItem[]; isSimulated: boolean }): QueueVM {
  const queue = payload.queue
  return {
    queue,
    posture: {
      awaitingApproval: queue.filter((item) => item.decisionState.toLowerCase().includes("approval")).length,
      elevatedRisk: queue.filter((item) => item.policyRisk >= 70).length,
      canaryWatch: queue.filter((item) => item.rolloutState.toLowerCase().includes("canary")).length,
      highestRisk: queue[0]?.policyRisk ?? 0,
    },
    isSimulated: payload.isSimulated,
  }
}

export function buildCaseListVm(cases: CaseResponse[]): CaseListVM {
  return {
    cases,
    totalCases: cases.length,
    awaitingApproval: cases.filter((item) => item.status.toLowerCase().includes("approval")).length,
    criticalCases: cases.filter((item) => item.priority.toLowerCase() === "critical").length,
  }
}

export function buildInvestigationWorkspaceVm(
  selectedCaseId: string,
  caseCount: number,
  graph: GraphRelationshipsVM,
): InvestigationWorkspaceVM {
  return {
    selectedCaseId,
    caseCount,
    graph,
  }
}

export function buildThreatIntelVm(payload: ReportsIngestionVM): ThreatIntelVM {
  return {
    healthInfo: payload.healthInfo,
    recentJobs: payload.recentJobs,
    ingestionSummary: payload.ingestionSummary.map((item) => ({
      source: item.source,
      freshness: item.freshness,
      quality: item.quality,
      notes: item.notes,
    })),
    isSimulated: payload.isSimulated,
  }
}

export function buildOperationsVm(rows: OperationRolloutRow[]): OperationsVM {
  return {
    rows: sortUtcDesc(rows),
    activeCanaries: rows.filter((item) => item.currentStage.toLowerCase() === "canary").length,
    rollbackReady: rows.filter((item) => item.triggerConditionMet && !item.rollbackTriggered).length,
  }
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a"
}

function averageConfidencePercent(detail: CaseDetailVM) {
  if (detail.linkedReports.length === 0) {
    return 0
  }

  const average = detail.linkedReports.reduce((sum, item) => sum + item.confidence, 0) / detail.linkedReports.length
  return Math.round(average * 100)
}

export function buildReportsVm(details: CaseDetailCollection): ReportsVM {
  const rows: ReportBundleRow[] = details.map((detail) => {
    const latestCollectedAtUtc =
      detail.linkedReports
        .slice()
        .sort((left, right) => Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc))[0]?.collectedAtUtc ??
      detail.caseItem.updatedAtUtc

    return {
      caseId: detail.caseItem.id,
      caseTitle: detail.caseItem.title,
      casePriority: detail.caseItem.priority,
      decisionState: detail.decisionState,
      reportCount: detail.linkedReports.length,
      avgConfidence: averageConfidencePercent(detail),
      latestCollectedAtUtc,
      topSource: mostFrequent(detail.linkedReports.map((item) => item.sourceSystem)),
    }
  })

  return {
    rows: rows.sort((left, right) => Date.parse(right.latestCollectedAtUtc) - Date.parse(left.latestCollectedAtUtc)),
    totalReports: rows.reduce((sum, item) => sum + item.reportCount, 0),
    casesWithReports: rows.filter((item) => item.reportCount > 0).length,
  }
}

export function buildAdminVm(settings: SettingsAdminVM, isMockMode: boolean): AdminVM {
  return {
    settings,
    actionLocked: !isMockMode,
  }
}

function sanitizeDetectionStudioLabel(value: string) {
  return value
}

export const DETECTION_STUDIO_RULES: DetectionRuleItem[] = [
  {
    id: "YAR-8821",
    name: "Lumma Stealer Staging Buffer",
    family: "YARA",
    lifecycle: "Needs Review",
    validation: "Warning",
    provenance: {
      source: "Alert AL-4412 + TI report TR-89",
      importedAtUtc: "2026-03-14T01:08:00.000Z",
      analyst: "Analyst",
      confidence: "High",
    },
    linkedCase: "AL-4412",
    severity: "Critical",
    owner: "Analyst",
    updatedAt: "2026-03-14 01:24 UTC",
    tags: {
      attack: ["T1027", "T1059.001"],
      family: ["Lumma"],
      campaign: ["Steel Orchid"],
      labels: ["stealer", "staging", "packed"],
    },
    code: `rule lumma_staging_buffer
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4412"
    confidence = "high"
    reviewed_by = "pending"
  strings:
    $s1 = { 48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 8B D8 }
    $s2 = "Lumma" nocase
    $s3 = "settings.dat" ascii wide
  condition:
    uint16(0) == 0x5A4D and 2 of ($s*)
}`,
    previousCode: `rule lumma_staging_buffer
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4412"
    confidence = "medium"
  strings:
    $s1 = { 48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 8B D8 }
    $s2 = "settings.dat" ascii wide
  condition:
    uint16(0) == 0x5A4D and all of them
}`,
    validationChecks: [
      { key: "schema", title: "Rule schema", status: "pass", detail: "Required YARA sections detected." },
      { key: "meta", title: "Meta completeness", status: "warn", detail: "reviewed_by is still pending." },
      { key: "perf", title: "Runtime cost", status: "pass", detail: "Estimated scan cost within P95 budget." },
      { key: "fp", title: "False-positive profile", status: "warn", detail: "Replay run shows 0.28% near-policy threshold." },
    ],
    duplicateSuggestions: [
      { ruleId: "YAR-7712", name: "Vidar Config Pull", relation: "String overlap 74%", confidence: 0.87 },
      { ruleId: "YAR-8099", name: "Lumma Loader Beacon", relation: "Condition path shared", confidence: 0.81 },
    ],
    overlapAnalysis: [
      { domain: "Behavior", overlapPercent: 71, withRuleId: "SIG-2041", withRuleName: "PowerShell Credential Artifact Sweep" },
  { domain: "Telemetry", overlapPercent: 54, withRuleId: "SUR-7822", withRuleName: "Suricata JA3 Burst Detector" },
    ],
    versions: [
      {
        version: "v5",
        author: "Analyst",
        changedAtUtc: "2026-03-14T01:24:00.000Z",
        summary: "Added reviewed_by envelope and tightened string set.",
        code: `rule lumma_staging_buffer
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4412"
    confidence = "high"
    reviewed_by = "pending"
  strings:
    $s1 = { 48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 8B D8 }
    $s2 = "Lumma" nocase
    $s3 = "settings.dat" ascii wide
  condition:
    uint16(0) == 0x5A4D and 2 of ($s*)
}`,
      },
      {
        version: "v4",
        author: "Analyst",
        changedAtUtc: "2026-03-13T21:08:00.000Z",
        summary: "Initial alert-bound rule draft from evidence bundle.",
        code: `rule lumma_staging_buffer
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4412"
    confidence = "medium"
  strings:
    $s1 = { 48 8D 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 8B D8 }
    $s2 = "settings.dat" ascii wide
  condition:
    uint16(0) == 0x5A4D and all of them
}`,
      },
    ],
    reviewNotes: [
      {
        id: "RVW-10021",
        reviewer: "Lead Reviewer",
        decision: "Request Changes",
        createdAtUtc: "2026-03-14T02:31:00.000Z",
        note: "Add explicit reviewed_by owner and reduce noisy staging string match.",
      },
    ],
    simulationState: {
      state: "Needs Tuning",
      dataset: "Endpoint Replay RY-88",
      result: "Watch",
      truePositiveRate: 0.91,
      falsePositiveRate: 0.28,
      executedAtUtc: "2026-03-14T03:10:00.000Z",
    },
    rolloutStatus: {
      stage: "Shadow",
      canaryPercent: 0,
      rollbackGuard: "Trigger rollback when FP > 0.35% for 15m.",
      owner: "Analyst",
      updatedAtUtc: "2026-03-14T03:15:00.000Z",
    },
  },
  {
    id: "SIG-2041",
    name: "PowerShell Credential Artifact Sweep",
    family: "Sigma",
    lifecycle: "Approved",
    validation: "Passing",
    provenance: {
      source: "Hunt HH-114 + DFIR memo",
      importedAtUtc: "2026-03-13T15:38:00.000Z",
      analyst: "Lead Reviewer",
      confidence: "High",
    },
    linkedCase: "AL-4307",
    severity: "High",
    owner: "Lead Reviewer",
    updatedAt: "2026-03-13 17:02 UTC",
    tags: {
      attack: ["T1003", "T1555"],
      family: ["PowerShell"],
      campaign: ["Ivory Apex"],
      labels: ["powershell", "credential", "windows"],
    },
    code: `title: PowerShell Credential Artifact Sweep
id: 83c73f6d-d54d-4b9f-a9f4-0b1f91677771
status: stable
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    CommandLine|contains:
      - "Get-Credential"
      - "Export-Clixml"
      - "SecureString"
  condition: selection
level: high
tags:
  - attack.credential_access`,
    previousCode: `title: PowerShell Credential Artifact Sweep
status: test
logsource:
  product: windows
detection:
  selection:
    CommandLine|contains: "Get-Credential"
  condition: selection
level: medium`,
    validationChecks: [
      { key: "yaml", title: "YAML parse", status: "pass", detail: "Document parsed successfully." },
      { key: "sigma", title: "Sigma semantic lint", status: "pass", detail: "No unsupported operators detected." },
      { key: "coverage", title: "Coverage map", status: "pass", detail: "Mapped to ATT&CK credential access." },
      { key: "telemetry", title: "Telemetry availability", status: "warn", detail: "Sysmon source missing on 9% fleet." },
    ],
    duplicateSuggestions: [
      { ruleId: "SIG-1888", name: "Encoded PowerShell Dump", relation: "Logsource + token overlap", confidence: 0.79 },
      { ruleId: "SIG-1652", name: "Credential Material Export", relation: "Technique adjacency", confidence: 0.73 },
    ],
    overlapAnalysis: [
      { domain: "ATT&CK", overlapPercent: 84, withRuleId: "SIG-1652", withRuleName: "Credential Material Export" },
      { domain: "Telemetry", overlapPercent: 48, withRuleId: "YAR-8821", withRuleName: "Lumma Stealer Staging Buffer" },
    ],
    versions: [
      {
        version: "v7",
        author: "Lead Reviewer",
        changedAtUtc: "2026-03-13T17:02:00.000Z",
        summary: "Raised severity, added Export-Clixml and SecureString selectors.",
        code: `title: PowerShell Credential Artifact Sweep
id: 83c73f6d-d54d-4b9f-a9f4-0b1f91677771
status: stable
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    CommandLine|contains:
      - "Get-Credential"
      - "Export-Clixml"
      - "SecureString"
  condition: selection
level: high
tags:
  - attack.credential_access`,
      },
      {
        version: "v6",
        author: "Lead Reviewer",
        changedAtUtc: "2026-03-12T20:41:00.000Z",
        summary: "Early test candidate before full token coverage.",
        code: `title: PowerShell Credential Artifact Sweep
status: test
logsource:
  product: windows
detection:
  selection:
    CommandLine|contains: "Get-Credential"
  condition: selection
level: medium`,
      },
    ],
    reviewNotes: [
      {
        id: "RVW-10009",
        reviewer: "Detection Engineer",
        decision: "Approve",
        createdAtUtc: "2026-03-13T17:30:00.000Z",
        note: "Policy envelope complete and ATT&CK mapping validated.",
      },
    ],
    simulationState: {
      state: "Passed",
      dataset: "Windows Audit Replay RW-12",
      result: "Pass",
      truePositiveRate: 0.96,
      falsePositiveRate: 0.07,
      executedAtUtc: "2026-03-13T18:42:00.000Z",
    },
    rolloutStatus: {
      stage: "Canary",
      canaryPercent: 15,
      rollbackGuard: "Auto-disable if host impact exceeds 4ms/event.",
      owner: "Lead Reviewer",
      updatedAtUtc: "2026-03-13T19:02:00.000Z",
    },
  },
  {
    id: "SNO-6102",
    name: "TLS JA3 C2 Beacon Burst",
    family: "Snort",
    lifecycle: "Promoted",
    validation: "Passing",
    provenance: {
      source: "Network intel stream + AL-4012",
      importedAtUtc: "2026-03-12T08:44:00.000Z",
      analyst: "Detection Engineer",
      confidence: "High",
    },
    linkedCase: "AL-4012",
    severity: "Critical",
    owner: "Detection Engineer",
    updatedAt: "2026-03-12 09:47 UTC",
    tags: {
      attack: ["T1071.001", "T1571"],
      family: ["Beaconing"],
      campaign: ["Silent Reef"],
      labels: ["ja3", "beacon", "c2"],
    },
    code: `alert tcp any any -> $HOME_NET 443 (
  msg:"CTI TLS JA3 suspicious beacon";
  flow:to_server,established;
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  detection_filter:track by_src,count 5,seconds 120;
  classtype:trojan-activity;
  sid:6102001;
  rev:4;
)`,
    previousCode: `alert tcp any any -> $HOME_NET 443 (
  msg:"CTI TLS JA3 suspicious beacon";
  flow:to_server,established;
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  sid:6102001;
  rev:3;
)`,
    validationChecks: [
      { key: "syntax", title: "Snort syntax", status: "pass", detail: "Rule compiles with current engine profile." },
      { key: "perf", title: "Sensor overhead", status: "pass", detail: "Runtime impact below 2% on peak traffic." },
      { key: "coverage", title: "Coverage drift", status: "pass", detail: "Beacon cluster still within confidence bounds." },
    ],
    duplicateSuggestions: [
  { ruleId: "SUR-7822", name: "Suricata JA3 Burst", relation: "Signature sibling", confidence: 0.91 },
      { ruleId: "SNO-5440", name: "TLS Interval Beacon", relation: "Flow pattern overlap", confidence: 0.83 },
    ],
    overlapAnalysis: [
  { domain: "Behavior", overlapPercent: 89, withRuleId: "SUR-7822", withRuleName: "Suricata JA3 Burst Detector" },
      { domain: "Telemetry", overlapPercent: 66, withRuleId: "FDR-118", withRuleName: "JA3 Feed Candidate 118" },
    ],
    versions: [
      {
        version: "v4",
        author: "Detection Engineer",
        changedAtUtc: "2026-03-12T09:47:00.000Z",
        summary: "Added detection_filter and promoted after stable canary.",
        code: `alert tcp any any -> $HOME_NET 443 (
  msg:"CTI TLS JA3 suspicious beacon";
  flow:to_server,established;
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  detection_filter:track by_src,count 5,seconds 120;
  classtype:trojan-activity;
  sid:6102001;
  rev:4;
)`,
      },
      {
        version: "v3",
        author: "Detection Engineer",
        changedAtUtc: "2026-03-11T23:12:00.000Z",
        summary: "Pre-canary baseline without burst filter.",
        code: `alert tcp any any -> $HOME_NET 443 (
  msg:"CTI TLS JA3 suspicious beacon";
  flow:to_server,established;
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  sid:6102001;
  rev:3;
)`,
      },
    ],
    reviewNotes: [
      {
        id: "RVW-09984",
        reviewer: "Operations Reviewer",
        decision: "Approve",
        createdAtUtc: "2026-03-12T09:55:00.000Z",
        note: "Canary telemetry stable and latency budget respected.",
      },
    ],
    simulationState: {
      state: "Passed",
      dataset: "Net Replay RN-31",
      result: "Pass",
      truePositiveRate: 0.98,
      falsePositiveRate: 0.03,
      executedAtUtc: "2026-03-12T08:58:00.000Z",
    },
    rolloutStatus: {
      stage: "Promoted",
      canaryPercent: 100,
      rollbackGuard: "Rollback when IDS latency exceeds +15% for 10m.",
      owner: "Detection Engineer",
      updatedAtUtc: "2026-03-12T09:58:00.000Z",
    },
  },
  {
    id: "LOK-7822",
  name: "Suricata JA3 Burst Detector",
  family: "Suricata",
    lifecycle: "Validated",
    validation: "Failing",
    provenance: {
      source: "Rule suggestion from alert lineage AL-4012",
      importedAtUtc: "2026-03-14T01:40:00.000Z",
      analyst: "Operations Reviewer",
      confidence: "Medium",
    },
    linkedCase: "AL-4012",
    severity: "High",
    owner: "Operations Reviewer",
    updatedAt: "2026-03-14 02:10 UTC",
    tags: {
      attack: ["T1071.001"],
      family: ["Beaconing"],
      campaign: ["Silent Reef"],
  labels: ["ja3", "Suricata", "burst"],
    },
    code: `alert tls any any -> $HOME_NET any (
  msg:"CTI Suricata JA3 burst";
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  threshold:type both, track by_src, count 4, seconds 90;
  metadata: deployment canary;
  sid:7822001;
  rev:1;
)`,
    previousCode: `alert tls any any -> $HOME_NET any (
  msg:"CTI Suricata JA3 burst";
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  sid:7822001;
  rev:1;
)`,
    validationChecks: [
  { key: "syntax", title: "Suricata syntax", status: "fail", detail: "metadata key-value delimiter is invalid." },
      { key: "schema", title: "Policy envelope", status: "warn", detail: "Rollback context missing linked incident ID." },
      { key: "safety", title: "Deployment safety gate", status: "fail", detail: "Auto rollback threshold not configured." },
    ],
    duplicateSuggestions: [
      { ruleId: "SNO-6102", name: "TLS JA3 C2 Beacon Burst", relation: "Converted from Snort variant", confidence: 0.91 },
      { ruleId: "LOK-7010", name: "JA3 Burst (Legacy)", relation: "Historical pattern family", confidence: 0.68 },
    ],
    overlapAnalysis: [
      { domain: "Behavior", overlapPercent: 89, withRuleId: "SNO-6102", withRuleName: "TLS JA3 C2 Beacon Burst" },
      { domain: "Telemetry", overlapPercent: 42, withRuleId: "FDR-224", withRuleName: "Feed Candidate 224" },
    ],
    versions: [
      {
        version: "v1",
        author: "Operations Reviewer",
        changedAtUtc: "2026-03-14T02:10:00.000Z",
  summary: "First converted Suricata rule from promoted Snort sibling.",
        code: `alert tls any any -> $HOME_NET any (
  msg:"CTI Suricata JA3 burst";
  ja3.hash; content:"72a589da586844d7f0818ce684948eea";
  threshold:type both, track by_src, count 4, seconds 90;
  metadata: deployment canary;
  sid:7822001;
  rev:1;
)`,
      },
    ],
    reviewNotes: [
      {
        id: "RVW-10028",
        reviewer: "Analyst",
        decision: "Request Changes",
        createdAtUtc: "2026-03-14T02:29:00.000Z",
        note: "Fix metadata format and set rollback guard before canary promotion.",
      },
    ],
    simulationState: {
      state: "Failed",
      dataset: "Net Replay RN-31",
      result: "Fail",
      truePositiveRate: 0.76,
      falsePositiveRate: 0.51,
      executedAtUtc: "2026-03-14T03:02:00.000Z",
    },
    rolloutStatus: {
      stage: "Disabled",
      canaryPercent: 0,
      rollbackGuard: "Not configured",
      owner: "Operations Reviewer",
      updatedAtUtc: "2026-03-14T03:05:00.000Z",
    },
  },
  {
    id: "YAR-9014",
    name: "Packed Loader Mutex Cluster",
    family: "YARA",
    lifecycle: "Shadow",
    validation: "Passing",
    provenance: {
      source: "Threat feed Delta-17 + alert AL-4521",
      importedAtUtc: "2026-03-15T01:11:00.000Z",
      analyst: "Threat Analyst",
      confidence: "Medium",
    },
    linkedCase: "AL-4521",
    severity: "Medium",
    owner: "Threat Analyst",
    updatedAt: "2026-03-15 01:42 UTC",
    tags: {
      attack: ["T1055"],
  family: ["Suricata"],
      campaign: ["Night Ember"],
      labels: ["packed", "mutex", "loader"],
    },
    code: `rule packed_loader_mutex_cluster
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4521"
    confidence = "medium"
  strings:
    $m1 = "Global\\Mutex_Suricata_" wide ascii
    $m2 = { 48 89 5C 24 ?? 57 48 83 EC ?? 48 8B F9 }
  condition:
    uint16(0) == 0x5A4D and all of them
}`,
    previousCode: `rule packed_loader_mutex_cluster
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4521"
  strings:
    $m1 = "Global\\Mutex_Suricata_" wide ascii
  condition:
    uint16(0) == 0x5A4D and $m1
}`,
    validationChecks: [
      { key: "schema", title: "Rule schema", status: "pass", detail: "Schema envelope complete." },
      { key: "perf", title: "Runtime cost", status: "pass", detail: "Scan budget under threshold." },
      { key: "review", title: "Review assignment", status: "pass", detail: "Reviewer assignment confirmed." },
    ],
    duplicateSuggestions: [
  { ruleId: "YAR-7120", name: "Suricata Mutex Core", relation: "Mutex token overlap", confidence: 0.71 },
    ],
    overlapAnalysis: [
  { domain: "Behavior", overlapPercent: 47, withRuleId: "YAR-7120", withRuleName: "Suricata Mutex Core" },
      { domain: "ATT&CK", overlapPercent: 41, withRuleId: "SIG-2041", withRuleName: "PowerShell Credential Artifact Sweep" },
    ],
    versions: [
      {
        version: "v2",
        author: "Threat Analyst",
        changedAtUtc: "2026-03-15T01:42:00.000Z",
        summary: "Added packed loader byte sequence to reduce noise.",
        code: `rule packed_loader_mutex_cluster
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4521"
    confidence = "medium"
  strings:
    $m1 = "Global\\Mutex_Suricata_" wide ascii
    $m2 = { 48 89 5C 24 ?? 57 48 83 EC ?? 48 8B F9 }
  condition:
    uint16(0) == 0x5A4D and all of them
}`,
      },
      {
        version: "v1",
        author: "Threat Analyst",
        changedAtUtc: "2026-03-15T01:11:00.000Z",
        summary: "Initial shadow candidate from feed-to-alert mapping.",
        code: `rule packed_loader_mutex_cluster
{
  meta:
    author = "CTI Studio"
    case_id = "AL-4521"
  strings:
    $m1 = "Global\\Mutex_Suricata_" wide ascii
  condition:
    uint16(0) == 0x5A4D and $m1
}`,
      },
    ],
    reviewNotes: [
      {
        id: "RVW-10041",
        reviewer: "Lead Reviewer",
        decision: "Approve",
        createdAtUtc: "2026-03-15T02:02:00.000Z",
        note: "Good shadow candidate, proceed to 5% canary after one more replay.",
      },
    ],
    simulationState: {
      state: "Passed",
      dataset: "Malware Replay RM-14",
      result: "Pass",
      truePositiveRate: 0.93,
      falsePositiveRate: 0.11,
      executedAtUtc: "2026-03-15T02:21:00.000Z",
    },
    rolloutStatus: {
      stage: "Shadow",
      canaryPercent: 0,
      rollbackGuard: "Rollback when analyst reject rate > 8%.",
      owner: "Threat Analyst",
      updatedAtUtc: "2026-03-15T02:23:00.000Z",
    },
  },
]

const DETECTION_REVIEW_QUEUE: DetectionStudioVM["reviewQueue"] = [
  {
    reviewId: "RQ-9184",
    ruleId: "YAR-8821",
    ruleName: "Lumma Stealer Staging Buffer",
    family: "YARA",
    reviewer: "Lead Reviewer",
    decision: "Pending",
    dueAtUtc: "2026-03-15T11:30:00.000Z",
    policyGate: "FP ceiling <= 0.35%",
  },
  {
    reviewId: "RQ-9185",
    ruleId: "LOK-7822",
  ruleName: "Suricata JA3 Burst Detector",
  family: "Suricata",
    reviewer: "Analyst",
    decision: "Request Changes",
    dueAtUtc: "2026-03-15T10:20:00.000Z",
    policyGate: "Rollback guard configured",
  },
  {
    reviewId: "RQ-9186",
    ruleId: "YAR-9014",
    ruleName: "Packed Loader Mutex Cluster",
    family: "YARA",
    reviewer: "Lead Reviewer",
    decision: "Approve",
    dueAtUtc: "2026-03-15T13:40:00.000Z",
    policyGate: "Shadow replay complete",
  },
]

const DETECTION_SIMULATION_RUNS: DetectionStudioVM["simulationRuns"] = [
  {
    runId: "SIM-70012",
    ruleId: "YAR-8821",
    dataset: "Endpoint Replay RY-88",
    state: "Completed",
    result: "Watch",
    eventsScanned: 11200000,
    precision: 0.72,
    recall: 0.91,
    startedAtUtc: "2026-03-14T03:10:00.000Z",
  },
  {
    runId: "SIM-70013",
    ruleId: "SIG-2041",
    dataset: "Windows Audit Replay RW-12",
    state: "Completed",
    result: "Pass",
    eventsScanned: 9100000,
    precision: 0.93,
    recall: 0.96,
    startedAtUtc: "2026-03-13T18:42:00.000Z",
  },
  {
    runId: "SIM-70014",
    ruleId: "LOK-7822",
    dataset: "Net Replay RN-31",
    state: "Failed",
    result: "Fail",
    eventsScanned: 8200000,
    precision: 0.49,
    recall: 0.76,
    startedAtUtc: "2026-03-14T03:02:00.000Z",
  },
]

const DETECTION_CANARY_ROLLOUTS: DetectionStudioVM["canaryRollouts"] = [
  {
    rolloutId: "CAN-1201",
    ruleId: "SIG-2041",
    stage: "Canary",
    canaryPercent: 15,
    observedNoise: 0.09,
    acceptanceRate: 0.94,
    status: "Healthy",
    updatedAtUtc: "2026-03-14T23:40:00.000Z",
  },
  {
    rolloutId: "CAN-1202",
    ruleId: "YAR-9014",
    stage: "Shadow",
    canaryPercent: 0,
    observedNoise: 0.14,
    acceptanceRate: 0.88,
    status: "Watch",
    updatedAtUtc: "2026-03-15T02:24:00.000Z",
  },
  {
    rolloutId: "CAN-1203",
    ruleId: "LOK-7822",
    stage: "Blocked",
    canaryPercent: 0,
    observedNoise: 0.51,
    acceptanceRate: 0.42,
    status: "Rollback Ready",
    updatedAtUtc: "2026-03-14T03:05:00.000Z",
  },
]

const DETECTION_ROLLBACK_HISTORY: DetectionStudioVM["rollbackHistory"] = [
  {
    rollbackId: "RB-5508",
    ruleId: "LOK-7822",
    triggeredBy: "Auto Guard",
    reason: "Metadata parse fault and FP spike beyond policy ceiling.",
    impact: "Canary stream only; no broad deployment impact.",
    restoredVersion: "v0 baseline",
    rolledBackAtUtc: "2026-03-14T03:09:00.000Z",
  },
  {
    rollbackId: "RB-5501",
    ruleId: "YAR-7712",
    triggeredBy: "Review Lead",
    reason: "Overlap collision with promoted sibling caused duplicate alerting.",
    impact: "Regional SOC queue saturation for 11 minutes.",
    restoredVersion: "v12",
    rolledBackAtUtc: "2026-03-10T21:42:00.000Z",
  },
]

const DETECTION_FEED_EXPLORER: DetectionStudioVM["feedExplorer"] = [
  {
    feedId: "FDR-118",
    source: "MISP curated feed",
    family: "Snort",
    ruleName: "JA3 Burst Candidate",
    provenance: "Partner SOC + enrichment pipeline",
    parseState: "Parsed",
    duplicateRisk: "Medium",
    importedAtUtc: "2026-03-15T00:12:00.000Z",
  },
  {
    feedId: "FDR-224",
    source: "Internal graph suggestion",
  family: "Suricata",
    ruleName: "Beacon Interval Outlier",
    provenance: "Alert linkage AL-4012",
    parseState: "Needs Review",
    duplicateRisk: "High",
    importedAtUtc: "2026-03-14T22:01:00.000Z",
  },
  {
    feedId: "FDR-411",
    source: "Vendor intel stream",
    family: "Sigma",
    ruleName: "Suspicious Credential Export Chain",
    provenance: "Vendor feed v4.2",
    parseState: "Rejected",
    duplicateRisk: "Low",
    importedAtUtc: "2026-03-14T19:27:00.000Z",
  },
]

const DETECTION_SAVED_VIEWS: DetectionStudioVM["savedViews"] = [
  {
    id: "needs-review",
    label: "Needs Review",
    description: "Rules pending reviewer decision and policy gate sign-off.",
    family: "All",
    lifecycle: "Needs Review",
    query: "",
  },
  {
    id: "canary-watch",
    label: "Canary Watch",
    description: "Rules in shadow/canary stages that need rollout observation.",
    family: "All",
    lifecycle: "Canary",
    query: "",
  },
  {
    id: "high-dup-risk",
    label: "High Duplicate Risk",
    description: "Rules with elevated overlap and duplicate collision risk.",
    family: "All",
    lifecycle: "All",
    query: "overlap duplicate",
  },
]

const DETECTION_QUEUE_POSTURE: DetectionStudioVM["queuePosture"] = {
  needsReview: DETECTION_STUDIO_RULES.filter((rule) => rule.lifecycle === "Needs Review").length,
  canaryWatch: DETECTION_CANARY_ROLLOUTS.filter((row) => row.stage === "Canary" || row.stage === "Shadow").length,
  highDuplicateRisk: DETECTION_FEED_EXPLORER.filter((row) => row.duplicateRisk === "High").length,
  blockedRollouts: DETECTION_CANARY_ROLLOUTS.filter((row) => row.stage === "Blocked").length,
}

const DETECTION_SUBPAGE_STATUS: DetectionStudioVM["subpageStatus"] = {
  catalog: {
    status: "ready",
    detail: "Catalog index synchronized with alert-linked rule set.",
  },
  review: {
    status: "ready",
    detail: "Reviewer queue hydrated with policy and due-time constraints.",
  },
  simulation: {
    status: "ready",
    detail: "Replay runners available for deterministic simulation checks.",
  },
  "canary-rollouts": {
    status: "ready",
    detail: "Rollout telemetry stream healthy with rollback guards enabled.",
  },
  "rollback-history": {
    status: "ready",
    detail: "Rollback ledger is immutable and queryable for audits.",
  },
  "feed-explorer": {
    status: "ready",
    detail: "Inbound feed parser healthy; duplicate analysis scored.",
  },
}

export function getDetectionStudioVm(): DetectionStudioVM {
  return {
    rules: DETECTION_STUDIO_RULES.map((rule) => ({
      ...rule,
      provenance: {
        ...rule.provenance,
        analyst: sanitizeDetectionStudioLabel(rule.provenance.analyst),
      },
      owner: sanitizeDetectionStudioLabel(rule.owner),
      versions: rule.versions.map((version) => ({
        ...version,
        author: sanitizeDetectionStudioLabel(version.author),
      })),
      reviewNotes: rule.reviewNotes.map((note) => ({
        ...note,
        reviewer: sanitizeDetectionStudioLabel(note.reviewer),
      })),
      rolloutStatus: {
        ...rule.rolloutStatus,
        owner: sanitizeDetectionStudioLabel(rule.rolloutStatus.owner),
      },
    })),
  families: ["YARA", "Sigma", "Snort", "Suricata"],
    reviewQueue: DETECTION_REVIEW_QUEUE.map((item) => ({
      ...item,
      reviewer: sanitizeDetectionStudioLabel(item.reviewer),
    })),
    simulationRuns: DETECTION_SIMULATION_RUNS,
    canaryRollouts: DETECTION_CANARY_ROLLOUTS,
    rollbackHistory: DETECTION_ROLLBACK_HISTORY.map((item) => ({
      ...item,
      triggeredBy: sanitizeDetectionStudioLabel(item.triggeredBy),
    })),
    feedExplorer: DETECTION_FEED_EXPLORER,
    savedViews: DETECTION_SAVED_VIEWS,
    queuePosture: DETECTION_QUEUE_POSTURE,
    subpageStatus: DETECTION_SUBPAGE_STATUS,
    generatedAtUtc: "2026-03-15T09:00:00.000Z",
  }
}
export function getCoverageVm(): CoverageVM {
  return getCoverageVmFactory()
}




