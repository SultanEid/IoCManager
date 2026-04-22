import type {
  AlertResponse,
  AiAdjudicationActionPlanOrPendingResponse,
  AiAdjudicationExplanationOrPendingResponse,
  AiAdjudicationResultResponse,
  AiEvidenceSourcesResponse,
  IocLatestAiDecisionResponse,
  AiOverrideOrClosureResponse,
  AiSimilarDetectionsResponse,
  AlertListResponse,
  V2AlertDetailResponse,
  AlertRuleWorkflowResponse,
  AuditLogListResponse,
  ArchiveRecordResponse,
  CaseRuleWorkflowResponse,
  CaseResponse,
  CoveragePainAnalysisResponse,
  DetectionDetailResponse,
  DetectionHistoryResponse,
  FeedSourceResponse,
  IocListResponse,
  ManagedServerConnectionSecretMetadataResponse,
  ManagedServerInventoryResponse,
  ManagedServerResponse,
  PowerBiVisualizationCatalogResponse,
  GeneratedReportResponse,
  ReportListResponse,
  RuleDistributionAttemptResponse,
  RuleDistributionJobResponse,
  RuleDistributionTargetResponse,
  RuleFamily,
  ScanCadenceType,
  ScanJobResponse,
  ScanJobTargetExecutionResponse,
  ScanPlanResponse,
  ScanRuleSelectionMode,
  ScannerCapability,
  ScannerResponse,
  DiscoveredHostResponse,
  DiscoveryRunResponse,
  DecisionResponse,
  DeploymentResponse,
  EvidenceResponse,
  FeedbackResponse,
  HealthAdmin,
  HealthInfo,
  HealthReady,
  JobRunResponse,
  PermissionResponse,
  PromoteDiscoveredHostResponse,
  RetentionPolicyResponse,
  RoleResponse,
  RolePermissionResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleDetail,
  RuleImportAttempt,
  RuleListResponse,
  RuleRevisionItem,
  RuleScopeType,
  SubnetResponse,
  TargetGroupMemberResponse,
  TargetGroupResponse,
  TargetServerResponse,
  SubmitAiAdjudicationAcceptedResponse,
  RuleProposalResponse,
  RuleResponse,
  RuleSimulationResultResponse,
  TokenResponse,
  UserResponse,
} from "@/shared/api/schemas"

export type ScoreAxis = {
  axis: string
  value: number
  max: number
}

export type EvidenceInsight = {
  id: string
  evidenceType: string
  sourceSystem: string
  confidence: number
  collectedAtUtc: string
  summary: string
}

export type GraphNeighbor = {
  id: string
  label: string
  relationship: string
  confidence: number
}

export type GraphEntityType =
  | "case"
  | "identity"
  | "host"
  | "domain"
  | "ip"
  | "malware"
  | "tool"
  | "artifact"

export type GraphEdgeType =
  | "observed-on"
  | "resolves-to"
  | "authenticates-to"
  | "indicates"
  | "delivers"
  | "related-case"
  | "uses"
  | "communicates-with"

export type GraphSighting = {
  source: string
  firstSeenUtc: string
  lastSeenUtc: string
  count: number
}

export type GraphLinkedCase = {
  caseId: string
  title: string
  status: string
}

export type GraphRelatedRule = {
  id: string
  name: string
  status: string
}

export type GraphNodeVM = {
  id: string
  label: string
  entityType: GraphEntityType
  confidence: number
  metadata: Record<string, string>
  provenance: string[]
  sightings: GraphSighting[]
  linkedCases: GraphLinkedCase[]
  relatedRules: GraphRelatedRule[]
}

export type GraphEdgeVM = {
  id: string
  source: string
  target: string
  edgeType: GraphEdgeType
  semantic: string
  confidence: number
  firstSeenUtc: string
  lastSeenUtc: string
}

export type GraphPathHintVM = {
  id: string
  title: string
  description: string
  nodeIds: string[]
  edgeIds: string[]
  relevanceScore: number
}

export type SimilarHistoricalCase = {
  caseId: string
  title: string
  outcome: string
  similarity: number
}

export type NextBestEvidenceHint = {
  id: string
  label: string
  reason: string
  sourceHint: string
}

export type TimelineEventVM = {
  id: string
  title: string
  detail: string
  when: string
  tone: "default" | "success" | "warning"
  source: "decision" | "deployment" | "feedback"
}

export type LinkedRuleVM = {
  id: string
  name: string
  family: RuleFamily
  version: string
  status: string
  provenance: string
  updatedAtUtc: string
}

export type LinkedReportVM = {
  id: string
  title: string
  sourceSystem: string
  summary: string
  confidence: number
  collectedAtUtc: string
  contentHash: string
  feedbackSignal: string
}

export type PolicyGuardrailVM = {
  id: string
  label: string
  status: "enforced" | "warning" | "info"
  rationale: string
  owner: string
}

export type CaseDetailVM = {
  caseItem: CaseResponse
  latestDecision: DecisionResponse | null
  latestDeployment: DeploymentResponse | null
  scoreAxes: ScoreAxis[]
  recommendedAction: string
  decisionState: string
  approvalTier: string
  rolloutPlan: string
  rollbackPlan: string
  topEvidence: EvidenceInsight[]
  graphNeighbors: GraphNeighbor[]
  similarHistoricalCases: SimilarHistoricalCase[]
  nextBestEvidence: NextBestEvidenceHint[]
  activityTimeline: TimelineEventVM[]
  linkedRules: LinkedRuleVM[]
  linkedReports: LinkedReportVM[]
  policyGuardrails: PolicyGuardrailVM[]
  isSimulated: boolean
}

export type OverviewCard = {
  key: string
  title: string
  value: string
  subtitle: string
  trend: string
}

export type QueueItem = {
  caseId: string
  title: string
  priority: string
  status: string
  decisionState: string
  recommendedAction: string
  uncertainty: number
  evidenceConflict: number
  novelty: number
  actionability: number
  blastRadius: number
  strategicValue: number
  slaPressure: number
  missingEvidence: string[]
  relatedGraphSummary: string
  expiresAtUtc: string
  triageScore: number
  policyRisk: number
  approvalTier: string
  rolloutState: string
  reason: string
  isSimulated: boolean
}

export type ReportsIngestionVM = {
  healthInfo: HealthInfo
  recentJobs: JobRunResponse[]
  ingestionSummary: Array<{ source: string; freshness: string; quality: number; notes: string }>
  isSimulated: boolean
}

export type GraphRelationshipsVM = {
  focalCaseId: string
  nodes: GraphNodeVM[]
  edges: GraphEdgeVM[]
  pathHints: GraphPathHintVM[]
  timeBounds: {
    startUtc: string
    endUtc: string
  }
  isSimulated: boolean
}

export type SettingsAdminVM = {
  healthInfo: HealthInfo
  healthAdmin: HealthAdmin | null
  recentJobs: JobRunResponse[]
}

export type CreateRuleProposalInput = {
  alertId?: string
  // Legacy compatibility field retained for one release cycle.
  caseId?: string
  proposalName: string
  ruleFamily: RuleFamily
  ruleBody: string
  proposedVersion: string
  proposedByUserId: string
  rationale: string
  policyRiskScore?: number
}

export type ReviewRuleProposalInput = {
  decision: "accept" | "reject"
  reviewerUserId: string
  reviewReason: string
  overrideReason?: string
}

export type SimulateRuleProposalInput = {
  targetEnvironment: string
  actorUserId: string
  notes?: string
}

export type AdvanceRolloutStageInput = {
  stage: "shadow" | "canary" | "promote" | "rollback"
  actorUserId: string
  reason: string
  overrideReason?: string
}

export type RecordCanaryObservationInput = {
  observedNoise: number
  analystAcceptedCount: number
  analystReviewedCount: number
  actorUserId: string
}

export type TriggerRollbackInput = {
  actorUserId: string
  reason: string
  observedNoise?: number
}

export type CoveragePainAnalysisScopeInput = {
  scopeType: "entire-environment" | "subnet" | "single-server"
  scopeValue?: string
}

export type CreateWorkbenchUserInput = {
  userName: string
  email: string
  displayName: string
  password: string
  roles: string[]
}

export type CreateWorkbenchRoleInput = {
  name: string
}

export type CreateWorkbenchPermissionInput = {
  key: string
  description: string
  actorUserId: string
}

export type AssignWorkbenchRolePermissionInput = {
  roleId: string
  permissionId: string
  actorUserId: string
}

export type CreateRetentionPolicyInput = {
  dataType: string
  retainDays: number
  archiveAfterDays: number
  actorUserId: string
}

export type ExecuteRetentionPolicyInput = {
  retentionPolicyId: string
  archiveUriPrefix: string
  actorUserId: string
}

export type CreateScannerInput = {
  name: string
  engineType: string
  version: string
  actorUserId: string
  capabilities?: string[]
}

export type UpdateScannerCapabilitiesInput = {
  capabilities: string[]
  actorUserId: string
}

export type QueueDiscoveryRunInput = {
  subnetId: string
  actorUserId: string
  rangeStartIp?: string
  rangeEndIp?: string
}

export type PromoteDiscoveredHostInput = {
  hostname: string
  operatingSystem: string
  environment: string
  actorUserId: string
}

export type ManagedServerInventoryStatusFilter = "Unknown" | "Online" | "Degraded" | "Offline"

export type ManagedServerInventoryLastContactFilter = "24h" | "72h" | "7d" | "30d" | "stale" | "never"

export type ManagedServerInventoryFilters = {
  q?: string
  status?: ManagedServerInventoryStatusFilter
  scannerCapability?: ScannerCapability
  subnetId?: string
  lastContact?: ManagedServerInventoryLastContactFilter
  environment?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export type ManagedConnectionProtocol = "Ssh" | "WinRm" | "Agent"
export type ManagedConnectionAuthMode = "Password" | "Key" | "Token"

export type CreateManagedServerInput = {
  subnetId: string
  hostname: string
  ipAddress: string
  operatingSystem: string
  environment: string
  actorUserId: string
  status?: string
  connectivityStatus?: ManagedServerInventoryStatusFilter
  connectionProtocol?: ManagedConnectionProtocol
  connectionHost?: string
  connectionPort?: number
  connectionAuthMode?: ManagedConnectionAuthMode
  connectionUsername?: string
}

export type UpdateManagedServerInput = {
  hostname: string
  ipAddress: string
  operatingSystem: string
  environment: string
  actorUserId: string
  status?: string
  connectivityStatus?: ManagedServerInventoryStatusFilter
  connectionProtocol?: ManagedConnectionProtocol
  connectionHost?: string
  connectionPort?: number
  connectionAuthMode?: ManagedConnectionAuthMode
  connectionUsername?: string
}

export type RotateManagedServerConnectionSecretInput = {
  secretPayload: string
  actorUserId: string
}

export type UpsertManagedServerScannerAssignmentInput = {
  connectivityStatus: ManagedServerInventoryStatusFilter
  lastHeartbeatUtc?: string
  lastContactUtc?: string
  isEnabled: boolean
  actorUserId: string
}

export type RuleRepositoryListQuery = {
  q?: string
  includeContent?: boolean
  family?: RuleFamily
  severity?: string
  status?: string
  scopeType?: RuleScopeType
  source?: string
  tags?: string[]
  includeDeleted?: boolean
  fromUtc?: string
  toUtc?: string
  updatedFromUtc?: string
  updatedToUtc?: string
  actor?: string
  version?: string
  sort?: "updated_desc" | "updated_asc" | "name_asc" | "name_desc" | "created_desc" | "created_asc"
  page?: number
  pageSize?: number
}

export type CreateRuleRepositoryInput = {
  name: string
  ruleFamily: RuleFamily
  source: string
  description: string
  tags: string[]
  severity: string
  status: string
  scopeType: RuleScopeType
  scopeValue?: string
  versionLabel: string
  originalContent: string
  actorUserId: string
  changeReason?: string
}

export type UpdateRuleRepositoryInput = CreateRuleRepositoryInput

export type ImportRuleFileInput = {
  file: File
  declaredRuleFamily: RuleFamily
  name?: string
  source?: string
  description?: string
  tags?: string[]
  severity?: string
  status?: string
  scopeType?: RuleScopeType
  scopeValue?: string
  versionLabel?: string
  actorUserId: string
  changeReason?: string
}

export type ArchiveRuleInput = {
  actorUserId: string
  changeReason?: string
}

export type RestoreRuleInput = {
  actorUserId: string
  changeReason?: string
  restoredStatus?: string
}

export type DistributionJobFilters = {
  status?: string
  operatorUserId?: string
  ruleRevisionId?: string
  ruleFamily?: string
  targetServerId?: string
  targetGroupId?: string
  queuedFromUtc?: string
  queuedToUtc?: string
  take?: number
}

export type CreateDistributionJobInput = {
  ruleRevisionId: string
  targetServerIds: string[]
  targetGroupIds: string[]
  operatorUserId: string
  notes?: string
  maxAttempts?: number
}

export type ScanPlanStatus = "Draft" | "Active" | "Paused" | "Retired"
export type ScanRuleScopeType = "Global" | "Environment" | "Subnet" | "Server" | "Scanner"

export type CreateScanPlanInput = {
  name: string
  description: string
  scannerCapability: ScannerCapability
  ruleSelectionMode: ScanRuleSelectionMode
  ruleScopeType?: ScanRuleScopeType
  ruleScopeValue?: string
  cadenceType: ScanCadenceType
  intervalMinutes?: number
  runAtHourUtc?: number
  runAtMinuteUtc?: number
  weeklyDayOfWeek?: number
  operatorNotes?: string
  status?: ScanPlanStatus
  actorUserId: string
  targetServerIds: string[]
  ruleRevisionIds: string[]
}

export type UpdateScanPlanInput = {
  name: string
  description: string
  scannerCapability: ScannerCapability
  ruleSelectionMode: ScanRuleSelectionMode
  ruleScopeType?: ScanRuleScopeType
  ruleScopeValue?: string
  cadenceType: ScanCadenceType
  intervalMinutes?: number
  runAtHourUtc?: number
  runAtMinuteUtc?: number
  weeklyDayOfWeek?: number
  operatorNotes?: string
  status: ScanPlanStatus
  actorUserId: string
  targetServerIds: string[]
  ruleRevisionIds: string[]
}

export type ScanJobFilters = {
  scanPlanId?: string
  status?: string
  queuedFromUtc?: string
  queuedToUtc?: string
  take?: number
}

export type AlertListQuery = {
  q?: string
  status?: string
  severity?: string
  family?: RuleFamily
  targetId?: string
  serverId?: string
  ownerUserId?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export type ReportListQuery = {
  q?: string
  reportType?: string
  severity?: string
  status?: string
  family?: RuleFamily
  serverId?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export type ReportGenerationType =
  | "ExecutiveSummary"
  | "DetailedIocReport"
  | "TargetExposureSummary"
  | "ScanActivitySummary"

export type GenerateReportInput = {
  reportType: ReportGenerationType
  title?: string
  fromUtc?: string
  toUtc?: string
  targetServerId?: string
  scannerFamily?: RuleFamily
  severity?: string
  status?: string
  iocType?: string
  source?: string
  persist?: boolean
  actorUserId: string
}

export type AuditLogListQuery = {
  q?: string
  actorUserId?: string
  actionType?: string
  entityType?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export type IocListQuery = {
  q?: string
  severity?: string
  type?: string
  source?: string
  feedSourceId?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export type DetectionListQuery = {
  q?: string
  family?: RuleFamily
  status?: string
  source?: string
  serverId?: string
  iocId?: string
  ruleRevisionId?: string
  scanJobId?: string
  fromUtc?: string
  toUtc?: string
  includeProvenance?: boolean
  page?: number
  pageSize?: number
  sort?: string
}

export type SubmitAiAdjudicationInput = {
  caseId: string
  detectionId: string
  iocType: string
  iocValue: string
  observedAtUtc: string
  detectionPackage: Record<string, unknown>
  submittedByUserId: string
}

export type GenerateAiDecisionForIocInput = {
  submittedByUserId: string
}

export type AiAdjudicationCursorQuery = {
  limit?: number
  cursor?: string
}

export type SubmitAiAdjudicationOverrideOrClosureInput = {
  actionType: "Override" | "Close"
  reason: string
  notes?: string
  overrideVerdict?: string
  closureDisposition?: string
  isFinal?: boolean
  submittedByUserId: string
}

export type RetryDistributionJobInput = {
  actorUserId: string
  notes?: string
}

export interface Gateway {
  login(username: string, password: string): Promise<TokenResponse>
  listAlertRegistry(query?: AlertListQuery, signal?: AbortSignal): Promise<AlertListResponse>
  getAlertDetail(alertId: string, signal?: AbortSignal): Promise<V2AlertDetailResponse>
  updateAlertStatus(alertId: string, status: string, actorUserId: string): Promise<V2AlertDetailResponse>
  listReports(query?: ReportListQuery, signal?: AbortSignal): Promise<ReportListResponse>
  generateReport(input: GenerateReportInput): Promise<GeneratedReportResponse>
  getPowerBiVisualizationCatalog(signal?: AbortSignal): Promise<PowerBiVisualizationCatalogResponse>
  listAuditLogs(query?: AuditLogListQuery, signal?: AbortSignal): Promise<AuditLogListResponse>
  listFeedSources(signal?: AbortSignal): Promise<FeedSourceResponse[]>
  listIocs(query?: IocListQuery, signal?: AbortSignal): Promise<IocListResponse>
  listDetections(query?: DetectionListQuery, signal?: AbortSignal): Promise<DetectionHistoryResponse>
  getDetectionDetail(detectionId: string, signal?: AbortSignal): Promise<DetectionDetailResponse>
  getLatestAiDecisionForIoc(iocId: string, signal?: AbortSignal): Promise<IocLatestAiDecisionResponse>
  generateAiDecisionForIoc(iocId: string, input: GenerateAiDecisionForIocInput): Promise<SubmitAiAdjudicationAcceptedResponse>
  getLatestAiDecisionForDetection(detectionId: string, signal?: AbortSignal): Promise<AiAdjudicationResultResponse>
  submitAiAdjudication(input: SubmitAiAdjudicationInput): Promise<SubmitAiAdjudicationAcceptedResponse>
  getAiAdjudicationResult(adjudicationId: string, signal?: AbortSignal): Promise<AiAdjudicationResultResponse>
  getAiAdjudicationExplanation(
    adjudicationId: string,
    signal?: AbortSignal,
  ): Promise<AiAdjudicationExplanationOrPendingResponse>
  getAiAdjudicationActionPlan(
    adjudicationId: string,
    signal?: AbortSignal,
  ): Promise<AiAdjudicationActionPlanOrPendingResponse>
  listAiAdjudicationEvidenceSources(
    adjudicationId: string,
    query?: AiAdjudicationCursorQuery,
    signal?: AbortSignal,
  ): Promise<AiEvidenceSourcesResponse>
  listAiAdjudicationSimilarDetections(
    adjudicationId: string,
    query?: AiAdjudicationCursorQuery,
    signal?: AbortSignal,
  ): Promise<AiSimilarDetectionsResponse>
  submitAiAdjudicationOverrideOrClosure(
    adjudicationId: string,
    input: SubmitAiAdjudicationOverrideOrClosureInput,
  ): Promise<AiOverrideOrClosureResponse>
  listAlerts(signal?: AbortSignal): Promise<AlertResponse[]>
  getAlert(alertId: string, signal?: AbortSignal): Promise<AlertResponse>
  listCases(signal?: AbortSignal): Promise<CaseResponse[]>
  getCase(caseId: string, signal?: AbortSignal): Promise<CaseResponse>
  listEvidence(caseId: string, signal?: AbortSignal): Promise<EvidenceResponse[]>
  listDecisions(caseId: string, signal?: AbortSignal): Promise<DecisionResponse[]>
  listRules(caseId: string, signal?: AbortSignal): Promise<RuleResponse[]>
  listDeployments(caseId: string, signal?: AbortSignal): Promise<DeploymentResponse[]>
  listAllDeployments(signal?: AbortSignal): Promise<DeploymentResponse[]>
  listFeedback(caseId: string, signal?: AbortSignal): Promise<FeedbackResponse[]>
  listJobRuns(signal?: AbortSignal): Promise<JobRunResponse[]>
  listUsers(signal?: AbortSignal): Promise<UserResponse[]>
  listRoles(signal?: AbortSignal): Promise<RoleResponse[]>
  listPermissions(signal?: AbortSignal): Promise<PermissionResponse[]>
  listRolePermissions(roleId?: string, signal?: AbortSignal): Promise<RolePermissionResponse[]>
  createUser(input: CreateWorkbenchUserInput): Promise<UserResponse>
  createRole(input: CreateWorkbenchRoleInput): Promise<RoleResponse>
  createPermission(input: CreateWorkbenchPermissionInput): Promise<PermissionResponse>
  assignRolePermission(input: AssignWorkbenchRolePermissionInput): Promise<RolePermissionResponse>
  listRetentionPolicies(signal?: AbortSignal): Promise<RetentionPolicyResponse[]>
  createRetentionPolicy(input: CreateRetentionPolicyInput): Promise<RetentionPolicyResponse>
  listArchiveRecords(retentionPolicyId?: string, signal?: AbortSignal): Promise<ArchiveRecordResponse[]>
  executeRetentionPolicy(input: ExecuteRetentionPolicyInput): Promise<ArchiveRecordResponse[]>
  listSubnets(signal?: AbortSignal): Promise<SubnetResponse[]>
  listTargetServers(subnetId?: string, signal?: AbortSignal): Promise<TargetServerResponse[]>
  listTargetGroups(signal?: AbortSignal): Promise<TargetGroupResponse[]>
  listTargetGroupMembers(targetGroupId: string, signal?: AbortSignal): Promise<TargetGroupMemberResponse[]>
  listDistributionJobs(filters?: DistributionJobFilters, signal?: AbortSignal): Promise<RuleDistributionJobResponse[]>
  getDistributionJob(jobId: string, signal?: AbortSignal): Promise<RuleDistributionJobResponse>
  listDistributionJobAttempts(jobId: string, signal?: AbortSignal): Promise<RuleDistributionAttemptResponse[]>
  listDistributionJobTargets(jobId: string, signal?: AbortSignal): Promise<RuleDistributionTargetResponse[]>
  createDistributionJob(input: CreateDistributionJobInput): Promise<RuleDistributionJobResponse>
  retryDistributionJob(jobId: string, input: RetryDistributionJobInput): Promise<RuleDistributionJobResponse>
  listScanPlans(signal?: AbortSignal): Promise<ScanPlanResponse[]>
  getScanPlan(scanPlanId: string, signal?: AbortSignal): Promise<ScanPlanResponse>
  createScanPlan(input: CreateScanPlanInput): Promise<ScanPlanResponse>
  updateScanPlan(scanPlanId: string, input: UpdateScanPlanInput): Promise<ScanPlanResponse>
  runScanPlan(scanPlanId: string, actorUserId: string, triggerSource?: string): Promise<ScanJobResponse>
  listScanJobs(filters?: ScanJobFilters, signal?: AbortSignal): Promise<ScanJobResponse[]>
  getScanJob(scanJobId: string, signal?: AbortSignal): Promise<ScanJobResponse>
  listScanJobTargets(scanJobId: string, signal?: AbortSignal): Promise<ScanJobTargetExecutionResponse[]>
  cancelScanJob(scanJobId: string, actorUserId: string, reason?: string): Promise<ScanJobResponse>
  listManagedServers(filters?: ManagedServerInventoryFilters, signal?: AbortSignal): Promise<ManagedServerInventoryResponse>
  getManagedServer(targetServerId: string, signal?: AbortSignal): Promise<ManagedServerResponse>
  createManagedServer(input: CreateManagedServerInput): Promise<void>
  updateManagedServer(targetServerId: string, input: UpdateManagedServerInput): Promise<void>
  rotateManagedServerConnectionSecret(
    targetServerId: string,
    input: RotateManagedServerConnectionSecretInput,
  ): Promise<ManagedServerConnectionSecretMetadataResponse>
  upsertManagedServerScannerAssignment(
    targetServerId: string,
    scannerId: string,
    input: UpsertManagedServerScannerAssignmentInput,
  ): Promise<void>
  removeManagedServerScannerAssignment(targetServerId: string, scannerId: string): Promise<void>
  listScanners(signal?: AbortSignal): Promise<ScannerResponse[]>
  createScanner(input: CreateScannerInput): Promise<ScannerResponse>
  updateScannerCapabilities(scannerId: string, input: UpdateScannerCapabilitiesInput): Promise<ScannerResponse>
  queueDiscoveryRun(input: QueueDiscoveryRunInput): Promise<DiscoveryRunResponse>
  listDiscoveryRuns(subnetId?: string, signal?: AbortSignal): Promise<DiscoveryRunResponse[]>
  listDiscoveredHosts(subnetId?: string, signal?: AbortSignal): Promise<DiscoveredHostResponse[]>
  promoteDiscoveredHost(
    discoveredHostId: string,
    input: PromoteDiscoveredHostInput,
  ): Promise<PromoteDiscoveredHostResponse>
  getHealthInfo(signal?: AbortSignal): Promise<HealthInfo>
  getHealthReady(signal?: AbortSignal): Promise<HealthReady>
  getHealthAdmin(signal?: AbortSignal): Promise<HealthAdmin | null>
  getAlertRuleWorkflow(alertId: string, signal?: AbortSignal): Promise<AlertRuleWorkflowResponse>
  getCaseRuleWorkflow(caseId: string, signal?: AbortSignal): Promise<CaseRuleWorkflowResponse>
  createRuleProposal(input: CreateRuleProposalInput): Promise<RuleProposalResponse>
  reviewRuleProposal(proposalId: string, input: ReviewRuleProposalInput): Promise<RuleProposalResponse>
  simulateRuleProposal(proposalId: string, input: SimulateRuleProposalInput): Promise<RuleSimulationResultResponse>
  advanceRolloutStage(rolloutPlanId: string, input: AdvanceRolloutStageInput): Promise<RolloutPlanResponse>
  recordCanaryObservation(rolloutPlanId: string, input: RecordCanaryObservationInput): Promise<RolloutPlanResponse>
  triggerRollback(rollbackPlanId: string, input: TriggerRollbackInput): Promise<RollbackPlanResponse>
  getCoveragePainAnalysis(input?: CoveragePainAnalysisScopeInput, signal?: AbortSignal): Promise<CoveragePainAnalysisResponse>
  listRuleRepository(query?: RuleRepositoryListQuery, signal?: AbortSignal): Promise<RuleListResponse>
  getRuleDetail(ruleId: string, signal?: AbortSignal): Promise<RuleDetail>
  createRule(input: CreateRuleRepositoryInput): Promise<RuleDetail>
  importRuleFile(input: ImportRuleFileInput): Promise<RuleImportAttempt>
  updateRule(ruleId: string, input: UpdateRuleRepositoryInput): Promise<RuleDetail>
  listRuleRevisions(ruleId: string, signal?: AbortSignal): Promise<RuleRevisionItem[]>
  listRuleImportAttempts(ruleId: string, signal?: AbortSignal): Promise<RuleImportAttempt[]>
  archiveRule(ruleId: string, input: ArchiveRuleInput): Promise<void>
  restoreRule(ruleId: string, input: RestoreRuleInput): Promise<RuleDetail>
  getSettingsAdmin(signal?: AbortSignal): Promise<SettingsAdminVM>
  runModelRetraining(triggeredByUserId: string): Promise<JobRunResponse>
}
