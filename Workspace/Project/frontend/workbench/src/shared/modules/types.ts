import type {
  CaseResponse,
  JobRunResponse,
} from "@/shared/api/schemas"
import type {
  CaseDetailVM,
  GraphRelationshipsVM,
  QueueItem,
  ReportsIngestionVM,
  SettingsAdminVM,
} from "@/shared/gateway/types"

export type QueuePosture = {
  awaitingApproval: number
  elevatedRisk: number
  canaryWatch: number
  highestRisk: number
}

export type QueueVM = {
  queue: QueueItem[]
  posture: QueuePosture
  isSimulated: boolean
}

export type CaseListVM = {
  cases: CaseResponse[]
  totalCases: number
  awaitingApproval: number
  criticalCases: number
}

export type InvestigationWorkspaceVM = {
  selectedCaseId: string
  caseCount: number
  graph: GraphRelationshipsVM
}

export type DetectionFamily = "YARA" | "Sigma" | "Snort" | "Suricata"
export type RuleLanguage = DetectionFamily
export type LifecycleState =
  | "Draft"
  | "Parsed"
  | "Validated"
  | "Needs Review"
  | "Approved"
  | "Shadow"
  | "Canary"
  | "Promoted"
  | "Disabled"
  | "Retired"
  | "Rejected"
export type ValidationState = "Passing" | "Warning" | "Failing"
export type DeploymentState = "Shadow" | "Canary" | "Promoted" | "Disabled" | "Rollback"
export type ValidationCheckStatus = "pass" | "warn" | "fail"
export type ReviewDecision = "Approve" | "Request Changes" | "Reject"
export type SimulationResult = "Pass" | "Watch" | "Fail"
export type DetectionStudioSubpageKey =
  | "catalog"
  | "review"
  | "simulation"
  | "canary-rollouts"
  | "rollback-history"
  | "feed-explorer"
export type DetectionPanelStatus = "ready" | "loading" | "error"

export type RuleTagBundle = {
  attack: string[]
  family: string[]
  campaign: string[]
  labels: string[]
}

export type RuleProvenance = {
  source: string
  importedAtUtc: string
  analyst: string
  confidence: "High" | "Medium" | "Low"
}

export type ValidationCheck = {
  key: string
  title: string
  status: ValidationCheckStatus
  detail: string
}

export type DuplicateSuggestion = {
  ruleId: string
  name: string
  relation: string
  confidence: number
}

export type OverlapRecord = {
  domain: "Telemetry" | "ATT&CK" | "Behavior"
  overlapPercent: number
  withRuleId: string
  withRuleName: string
}

export type RuleVersionSnapshot = {
  version: string
  author: string
  changedAtUtc: string
  summary: string
  code: string
}

export type RuleReviewNote = {
  id: string
  reviewer: string
  decision: ReviewDecision
  createdAtUtc: string
  note: string
}

export type RuleSimulationState = {
  state: "Not Run" | "Queued" | "Running" | "Passed" | "Needs Tuning" | "Failed"
  dataset: string
  result: SimulationResult
  truePositiveRate: number
  falsePositiveRate: number
  executedAtUtc: string
}

export type RuleRolloutStatus = {
  stage: "Shadow" | "Canary" | "Promoted" | "Disabled" | "Rolled Back"
  canaryPercent: number
  rollbackGuard: string
  owner: string
  updatedAtUtc: string
}

export type DetectionRuleItem = {
  id: string
  name: string
  family: DetectionFamily
  lifecycle: LifecycleState
  validation: ValidationState
  provenance: RuleProvenance
  linkedCase: string
  severity: "Critical" | "High" | "Medium"
  owner: string
  updatedAt: string
  tags: RuleTagBundle
  code: string
  previousCode: string
  validationChecks: ValidationCheck[]
  duplicateSuggestions: DuplicateSuggestion[]
  overlapAnalysis: OverlapRecord[]
  versions: RuleVersionSnapshot[]
  reviewNotes: RuleReviewNote[]
  simulationState: RuleSimulationState
  rolloutStatus: RuleRolloutStatus
}

export type DetectionReviewRow = {
  reviewId: string
  ruleId: string
  ruleName: string
  family: DetectionFamily
  reviewer: string
  decision: "Pending" | ReviewDecision
  dueAtUtc: string
  policyGate: string
}

export type DetectionSimulationRow = {
  runId: string
  ruleId: string
  dataset: string
  state: "Queued" | "Running" | "Completed" | "Failed"
  result: SimulationResult
  eventsScanned: number
  precision: number
  recall: number
  startedAtUtc: string
}

export type DetectionCanaryRow = {
  rolloutId: string
  ruleId: string
  stage: "Shadow" | "Canary" | "Promoted" | "Blocked"
  canaryPercent: number
  observedNoise: number
  acceptanceRate: number
  status: "Healthy" | "Watch" | "Rollback Ready"
  updatedAtUtc: string
}

export type DetectionRollbackRow = {
  rollbackId: string
  ruleId: string
  triggeredBy: string
  reason: string
  impact: string
  restoredVersion: string
  rolledBackAtUtc: string
}

export type DetectionFeedRow = {
  feedId: string
  source: string
  family: DetectionFamily
  ruleName: string
  provenance: string
  parseState: "Parsed" | "Needs Review" | "Rejected"
  duplicateRisk: "Low" | "Medium" | "High"
  importedAtUtc: string
}

export type DetectionSavedView = {
  id: string
  label: string
  description: string
  family: DetectionFamily | "All"
  lifecycle: LifecycleState | "All"
  query: string
}

export type DetectionQueuePosture = {
  needsReview: number
  canaryWatch: number
  highDuplicateRisk: number
  blockedRollouts: number
}

export type DetectionSubpageStatus = {
  status: DetectionPanelStatus
  detail: string
}

export type DetectionStudioVM = {
  rules: DetectionRuleItem[]
  families: DetectionFamily[]
  reviewQueue: DetectionReviewRow[]
  simulationRuns: DetectionSimulationRow[]
  canaryRollouts: DetectionCanaryRow[]
  rollbackHistory: DetectionRollbackRow[]
  feedExplorer: DetectionFeedRow[]
  savedViews: DetectionSavedView[]
  queuePosture: DetectionQueuePosture
  subpageStatus: Record<DetectionStudioSubpageKey, DetectionSubpageStatus>
  generatedAtUtc: string
}

export type AnalysisMode = "readiness" | "active"
export type ScopeType = "environment" | "subnet" | "server"
export type CoverageSubpageKey = "pain-analysis" | "telemetry" | "sources"
export type TierState = "Resilient" | "Moderate" | "Stressed" | "Critical"
export type ConfidenceLevel = "High" | "Medium" | "Low"
export type FreshnessState = "Fresh" | "Aging" | "Stale"
export type GapReason = "none" | "weak_logic" | "missing_telemetry"

export type FreshnessMetric = {
  ageMinutes: number
  label: string
  state: FreshnessState
}

export type TierSnapshot = {
  score: number
  state: TierState
  count: number
  trend: number
  confidence: ConfidenceLevel
  freshness: FreshnessMetric
}

export type ObservedItem = {
  item: string
  source: string
  lastSeen: string
  impact: string
}

export type Recommendation = {
  title: string
  owner: string
  eta: string
  expectedEffect: string
}

export type PainGapSummary = {
  painPotential: number
  readinessDepth: number
  dataCompleteness: number
  actionPriority: "Immediate" | "This Sprint" | "Planned"
}

export type LinkedCaseRef = {
  id: string
  title: string
  state: string
}

export type LinkedRuleRef = {
  id: string
  name: string
  language: RuleLanguage
  state: string
}

export type TierDefinition = {
  id: string
  label: string
  painWeight: number
  readiness: TierSnapshot
  active: TierSnapshot
  justification: string
  observedItems: ObservedItem[]
  weakCoverageGaps: string[]
  missingDataGaps: string[]
  recommendations: Recommendation[]
  linkedCases: LinkedCaseRef[]
  linkedRules: LinkedRuleRef[]
  summary: PainGapSummary
}

export type ScopeTarget = {
  id: string
  label: string
  type: ScopeType
  description: string
}

export type ScopeTypeOption = {
  key: ScopeType
  label: string
}

export type CoverageSubpageOption = {
  key: CoverageSubpageKey
  label: string
  href: string
}

export type CoverageTargetProfile = {
  targetId: string
  summary: PainGapSummary
  tiers: TierDefinition[]
  attackCoverage: AttackCoverageRow[]
  telemetryCoverage: TelemetryCoverageRow[]
  sourceAnalysis: SourceAnalysisRow[]
}

export type CoverageDefaults = {
  scopeType: ScopeType
  mode: AnalysisMode
  targetByScopeType: Record<ScopeType, string>
  compareTargetByScopeType: Record<ScopeType, string>
}

export type PainGapRollup = {
  averageScore: number
  confidenceIntegrity: number
  weakCoverageCount: number
  missingDataCount: number
}

export type TierCompareDelta = {
  score: number
  count: number
  trend: number
  freshnessMinutes: number
}

export type ComparedTier = {
  tier: TierDefinition
  delta: TierCompareDelta
}

export type AttackCoverageRow = {
  id: string
  tactic: string
  techniqueId: string
  technique: string
  coverageQuality: number
  confidence: ConfidenceLevel
  freshness: FreshnessMetric
  linkedDetections: number
  linkedCases: string[]
  gapReason: GapReason
}

export type TelemetryCoverageRow = {
  id: string
  domain: string
  source: string
  collectionHealth: number
  parseQuality: number
  detectionUtility: number
  freshness: FreshnessMetric
  status: "Collected" | "Not Collected" | "Collected Weak"
  gapReason: GapReason
}

export type SourceAnalysisRow = {
  id: string
  source: string
  trust: number
  reliability: number
  freshness: FreshnessMetric
  detectionContribution: number
  dependencyRisk: "Low" | "Medium" | "High"
  riskFlags: string[]
  recommendedAction: string
}

export type CoverageVM = {
  scopeTypes: ScopeTypeOption[]
  targetsByScopeType: Record<ScopeType, ScopeTarget[]>
  profilesByTargetId: Record<string, CoverageTargetProfile>
  subpages: CoverageSubpageOption[]
  defaults: CoverageDefaults
}

export type ThreatIntelIngestionRow = {
  source: string
  freshness: string
  quality: number
  notes: string
}

export type ThreatIntelVM = {
  healthInfo: ReportsIngestionVM["healthInfo"]
  recentJobs: JobRunResponse[]
  ingestionSummary: ThreatIntelIngestionRow[]
  isSimulated: boolean
}

export type OperationRolloutRow = {
  caseId: string
  rolloutPlanId: string
  proposalId: string
  currentStage: string
  canaryTrafficPercent: number
  predictedNoise: number
  observedNoise: number | null
  analystAcceptanceRate: number
  triggerConditionMet: boolean
  rollbackTriggered: boolean
  updatedAtUtc: string
}

export type OperationsVM = {
  rows: OperationRolloutRow[]
  activeCanaries: number
  rollbackReady: number
}

export type ServerHealthStatus = "Healthy" | "Degraded" | "Unreachable"
export type TelemetryStatus = "Healthy" | "Delayed" | "Missing"
export type ScannerCoverageStatus = "Full" | "Partial" | "None"
export type InfraDeploymentStatus = "Stable" | "Canary" | "Pending" | "Failed"
export type RiskSeverity = "Critical" | "High" | "Medium" | "Low"
export type ServerEnvironment = "Production" | "Staging" | "Development"
export type ServerCriticality = "Mission Critical" | "Business Critical" | "Standard"
export type SubnetZone = "DMZ" | "Core" | "Cloud Edge" | "OT"
export type ScannerHealthStatus = "Healthy" | "Degraded" | "Offline"
export type ScannerMode = "Scheduled" | "On-demand" | "Hybrid"
export type OperationsSubpageKey = "inventory" | "subnets" | "asset-groups" | "scanner-fleet"
export type ServerGroupBy = "subnet" | "environment" | "criticality"

export type OperationsLinkRef = {
  id: string
  title: string
}

export type ServerScannerAssignment = {
  scannerId: string
  scannerName: string
  lastScanAtUtc: string
  coveragePercent: number
}

export type Server = {
  id: string
  hostname: string
  ipv4: string
  os: string
  ownerTeam: string
  subnetId: string
  environment: ServerEnvironment
  criticality: ServerCriticality
  health: ServerHealthStatus
  telemetryStatus: TelemetryStatus
  scannerCoverage: ScannerCoverageStatus
  deploymentStatus: InfraDeploymentStatus
  riskSeverity: RiskSeverity
  linkedDetections: OperationsLinkRef[]
  linkedCases: OperationsLinkRef[]
  linkedRules: OperationsLinkRef[]
  scannerAssignments: ServerScannerAssignment[]
  lastHeartbeatUtc: string
  updatedAtUtc: string
}

export type Subnet = {
  id: string
  name: string
  cidr: string
  gateway: string
  zone: SubnetZone
  environment: ServerEnvironment
  capacity: number
  utilizationPercent: number
  scannerCoverage: ScannerCoverageStatus
  health: ServerHealthStatus
  notes: string
}

export type AssetGroup = {
  id: string
  name: string
  policyProfile: string
  ownerTeam: string
  environment: ServerEnvironment
  scannerCompliancePercent: number
  memberServerIds: string[]
  linkedDetections: OperationsLinkRef[]
  linkedCases: OperationsLinkRef[]
}

export type ScannerNode = {
  id: string
  name: string
  mode: ScannerMode
  health: ScannerHealthStatus
  assignedSubnetIds: string[]
  queueDepth: number
  uptimePercent: number
  coveragePercent: number
  lastHeartbeatUtc: string
  latestVersion: string
}

export type ServerTimelineEvent = {
  id: string
  title: string
  detail: string
  source: "Telemetry" | "Scanner" | "Deployment" | "Policy" | "Alert Link" | "Case Link"
  tone: "default" | "success" | "warning"
  whenUtc: string
}

export type ServerRiskSummary = {
  score: number
  severity: RiskSeverity
  drivers: Array<{
    label: string
    value: number
  }>
  recommendation: string
}

export type ScannerHistoryPoint = {
  id: string
  scannerName: string
  outcome: "Clean" | "Watch" | "Action Required"
  note: string
  whenUtc: string
}

export type ServerDetailVm = {
  serverId: string
  timeline: ServerTimelineEvent[]
  riskSummary: ServerRiskSummary
  deploymentSummary: {
    stage: InfraDeploymentStatus
    lastChangeUtc: string
    note: string
  }
  scannerHistory: ScannerHistoryPoint[]
}

export type ServerGroup = {
  key: string
  label: string
  servers: Server[]
}

export type SubnetRollup = {
  subnetId: string
  serverCount: number
  missionCriticalCount: number
  unhealthyCount: number
  telemetryMissingCount: number
}

export type ScannerCoverageRollup = {
  totalServers: number
  fullCoverageCount: number
  partialCoverageCount: number
  noCoverageCount: number
}

export type OperationsWorkspaceVm = {
  generatedAtUtc: string
  servers: Server[]
  subnets: Subnet[]
  assetGroups: AssetGroup[]
  scannerFleet: ScannerNode[]
  serverDetailsById: Record<string, ServerDetailVm>
  defaults: {
    groupBy: ServerGroupBy
  }
}

export type ReportBundleRow = {
  caseId: string
  caseTitle: string
  casePriority: string
  decisionState: string
  reportCount: number
  avgConfidence: number
  latestCollectedAtUtc: string
  topSource: string
}

export type ReportsVM = {
  rows: ReportBundleRow[]
  totalReports: number
  casesWithReports: number
}

export type AdminVM = {
  settings: SettingsAdminVM
  actionLocked: boolean
}

export type CaseDetailCollection = Array<CaseDetailVM>
