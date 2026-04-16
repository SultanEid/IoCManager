import { z } from "zod"

export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresAtUtc: z.string().min(1),
  tokenType: z.string().min(1),
})

const safeString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : ""))

export const caseResponseSchema = z.object({
  id: z.string().uuid(),
  title: safeString,
  summary: safeString,
  priority: safeString,
  status: safeString,
  ownerUserId: safeString,
  approvalTierRequired: safeString,
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})
export const alertResponseSchema = caseResponseSchema
export const v2AlertResponseSchema = z.object({
  id: z.string().uuid(),
  title: safeString,
  summary: safeString,
  severity: safeString,
  status: safeString,
  ownerUserId: safeString,
  approvalTierRequired: safeString,
  firstDetectedAtUtc: z.string(),
  lastDetectedAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})
export const alertListResponseSchema = z.object({
  items: z.array(v2AlertResponseSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const evidenceResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  evidenceType: z.string(),
  sourceSystem: z.string(),
  contentHash: z.string(),
  confidence: z.number(),
  collectedAtUtc: z.string(),
  createdAtUtc: z.string(),
})

export const decisionResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  state: z.string(),
  recommendedAction: z.string(),
  approvalTierRequired: z.string(),
  policyVersion: z.string(),
  modelVersion: z.string(),
  reasoning: z.string(),
  approvedByUserId: z.string().nullable(),
  approvedAtUtc: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleFamilySchema = z.enum(["yara", "sigma", "snort", "suricata"])

export const ruleResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  name: z.string(),
  ruleFamily: ruleFamilySchema,
  ruleBody: z.string(),
  version: z.string(),
  status: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleScopeTypeSchema = z.enum(["global", "environment", "subnet", "server", "scanner"])
export const ruleValidationSeveritySchema = z.enum(["error", "warning", "note"])
export const ruleValidationStageSchema = z.enum(["syntax", "metadata", "deployment_readiness"])
export const ruleValidationCapabilityDepthSchema = z.enum(["full_engine", "heuristic", "not_available"])

export const ruleValidationDiagnosticSchema = z.object({
  code: z.string(),
  severity: ruleValidationSeveritySchema,
  message: z.string(),
  line: z.number().int().nullable(),
  column: z.number().int().nullable(),
})

export const ruleValidationStageResultSchema = z.object({
  stage: ruleValidationStageSchema,
  passed: z.boolean(),
  capabilityDepth: ruleValidationCapabilityDepthSchema,
  limitation: z.string().nullable(),
  diagnostics: z.array(ruleValidationDiagnosticSchema),
})

export const ruleValidationResultSchema = z.object({
  canPersist: z.boolean(),
  isDeploymentReady: z.boolean(),
  evaluatedAtUtc: z.string(),
  stages: z.array(ruleValidationStageResultSchema),
})

export const ruleImportAttemptSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  fileHash: z.string(),
  declaredRuleFamily: z.string(),
  wasSuccessful: z.boolean(),
  failureReason: z.string().nullable(),
  sourceMetadataJson: z.string(),
  parsedMetadataJson: z.string(),
  diagnostics: z.array(ruleValidationDiagnosticSchema),
  validation: ruleValidationResultSchema,
  ruleArtifactId: z.string().uuid().nullable(),
  ruleRevisionId: z.string().uuid().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  createdByUserId: z.string(),
})

export const ruleListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ruleFamily: ruleFamilySchema,
  source: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  severity: z.string(),
  status: z.string(),
  scopeType: ruleScopeTypeSchema,
  scopeValue: z.string().nullable(),
  currentRevisionNumber: z.number().int(),
  currentVersionLabel: z.string(),
  isDeleted: z.boolean(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  createdByUserId: z.string(),
  updatedByUserId: z.string(),
})

export const ruleRevisionItemSchema = z.object({
  id: z.string().uuid(),
  ruleArtifactId: z.string().uuid(),
  revisionNumber: z.number().int(),
  versionLabel: z.string(),
  originalContent: z.string(),
  metadataJson: z.string(),
  changeType: z.string(),
  changeReason: z.string().nullable(),
  status: z.string(),
  validation: ruleValidationResultSchema,
  ruleImportAttemptId: z.string().uuid().nullable(),
  createdAtUtc: z.string(),
  createdByUserId: z.string(),
})

export const ruleDetailSchema = z.object({
  rule: ruleListItemSchema,
  currentRevision: ruleRevisionItemSchema,
  revisions: z.array(ruleRevisionItemSchema),
  importAttempts: z.array(ruleImportAttemptSchema),
})

export const ruleListResponseSchema = z.object({
  items: z.array(ruleListItemSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const deploymentResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  ruleId: z.string().uuid(),
  targetEnvironment: z.string(),
  status: z.string(),
  requestedByUserId: z.string(),
  approvedByUserId: z.string().nullable(),
  approvedAtUtc: z.string().nullable(),
  deployedAtUtc: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleProposalResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  proposalName: z.string(),
  ruleFamily: ruleFamilySchema,
  ruleBody: z.string(),
  proposedVersion: z.string(),
  proposedByUserId: z.string(),
  rationale: z.string(),
  policyRiskScore: z.number(),
  status: z.string(),
  reviewedByUserId: z.string().nullable(),
  reviewedAtUtc: z.string().nullable(),
  reviewReason: z.string().nullable(),
  overrideReason: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const deploymentRecommendationResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  ruleProposalId: z.string().uuid(),
  targetEnvironment: z.string(),
  recommendedStage: z.string(),
  riskScore: z.number(),
  predictedNoise: z.number(),
  baselineNoise: z.number(),
  predictedNoiseDelta: z.number(),
  analystAcceptanceRate: z.number(),
  requiresHumanApproval: z.boolean(),
  autoPublishEnabled: z.boolean(),
  requestedByUserId: z.string(),
  rationale: z.string(),
  recommendedAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const rolloutPlanResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  ruleProposalId: z.string().uuid(),
  deploymentRecommendationId: z.string().uuid(),
  currentStage: z.string(),
  canaryTrafficPercent: z.number(),
  predictedNoise: z.number(),
  observedNoise: z.number().nullable(),
  observedNoiseDelta: z.number().nullable(),
  analystAcceptanceRate: z.number(),
  requiresManualPromotion: z.boolean(),
  shadowStartedAtUtc: z.string(),
  canaryStartedAtUtc: z.string().nullable(),
  promotedAtUtc: z.string().nullable(),
  rolledBackAtUtc: z.string().nullable(),
  lastStageReason: z.string().nullable(),
  lastOverrideReason: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const rollbackPlanResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  ruleProposalId: z.string().uuid(),
  rolloutPlanId: z.string().uuid(),
  triggerCondition: z.string(),
  recoveryPlaybook: z.string(),
  predictedNoiseThreshold: z.number(),
  lastObservedNoise: z.number().nullable(),
  triggerConditionMet: z.boolean(),
  isTriggered: z.boolean(),
  triggeredByUserId: z.string().nullable(),
  triggeredAtUtc: z.string().nullable(),
  triggerReason: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleSimulationResultResponseSchema = z.object({
  proposal: ruleProposalResponseSchema,
  recommendation: deploymentRecommendationResponseSchema,
  rolloutPlan: rolloutPlanResponseSchema,
  rollbackPlan: rollbackPlanResponseSchema,
})

export const caseRuleWorkflowResponseSchema = z.object({
  caseId: z.string().uuid(),
  proposals: z.array(ruleProposalResponseSchema),
  recommendations: z.array(deploymentRecommendationResponseSchema),
  rolloutPlans: z.array(rolloutPlanResponseSchema),
  rollbackPlans: z.array(rollbackPlanResponseSchema),
  analystAcceptanceRate: z.number(),
})
export const alertRuleWorkflowResponseSchema = caseRuleWorkflowResponseSchema

export const feedbackResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  decisionId: z.string().uuid().nullable(),
  verdict: z.string(),
  notes: z.string(),
  submittedByUserId: z.string(),
  submittedAtUtc: z.string(),
})

export const healthInfoSchema = z.object({
  service: z.string(),
  environment: z.string(),
  utcNow: z.string(),
})

export const healthAdminSchema = z.object({
  runtime: z.string(),
  machineName: z.string(),
  processId: z.number(),
})

export const healthReadyComponentSchema = z.object({
  name: z.string(),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  required: z.boolean(),
  message: z.string(),
})

export const healthReadySchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  components: z.array(healthReadyComponentSchema),
})

export const userResponseSchema = z.object({
  id: z.string(),
  userName: z.string(),
  email: z.string().nullable(),
  displayName: z.string(),
  role: z.string(),
})

export const roleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const subnetResponseSchema = z.object({
  id: z.string().uuid(),
  networkId: z.string().uuid(),
  name: z.string(),
  cidrBlock: z.string(),
  gateway: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const targetServerResponseSchema = z.object({
  id: z.string().uuid(),
  subnetId: z.string().uuid(),
  hostname: safeString,
  ipAddress: safeString,
  operatingSystem: safeString,
  environment: safeString,
  status: safeString,
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const targetGroupResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean(),
  memberCount: z.number().int(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const targetGroupMemberResponseSchema = z.object({
  targetGroupId: z.string().uuid(),
  targetServerId: z.string().uuid(),
  hostname: z.string(),
  ipAddress: z.string(),
  addedByUserId: z.string(),
  addedAtUtc: z.string(),
})

export const ruleDistributionJobResponseSchema = z.object({
  id: z.string().uuid(),
  ruleRevisionId: z.string().uuid(),
  ruleFamily: z.string(),
  revisionNumber: z.number().int(),
  versionLabel: z.string(),
  status: z.string(),
  operatorUserId: z.string(),
  attemptCount: z.number().int(),
  maxAttempts: z.number().int(),
  totalTargets: z.number().int(),
  successfulTargets: z.number().int(),
  failedTargets: z.number().int(),
  unreachableTargets: z.number().int(),
  validationFailedTargets: z.number().int(),
  partiallyAppliedTargets: z.number().int(),
  queuedAtUtc: z.string(),
  startedAtUtc: z.string().nullable(),
  completedAtUtc: z.string().nullable(),
  nextAttemptAtUtc: z.string().nullable(),
  summary: z.string(),
  notes: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleDistributionAttemptResponseSchema = z.object({
  id: z.string().uuid(),
  ruleDistributionJobId: z.string().uuid(),
  attemptNumber: z.number().int(),
  status: z.string(),
  startedAtUtc: z.string(),
  completedAtUtc: z.string().nullable(),
  backoffSeconds: z.number().int().nullable(),
  triggeredByUserId: z.string(),
  summary: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleDistributionTargetAttemptResponseSchema = z.object({
  id: z.string().uuid(),
  ruleDistributionAttemptId: z.string().uuid(),
  ruleDistributionTargetId: z.string().uuid(),
  status: z.string(),
  transport: z.string(),
  remoteCorrelationId: z.string().nullable(),
  diagnostic: z.string().nullable(),
  isRetryable: z.boolean(),
  startedAtUtc: z.string(),
  completedAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const ruleDistributionTargetResponseSchema = z.object({
  id: z.string().uuid(),
  ruleDistributionJobId: z.string().uuid(),
  targetServerId: z.string().uuid(),
  targetHostname: z.string(),
  targetIpAddress: z.string(),
  status: z.string(),
  isRetryable: z.boolean(),
  attemptCount: z.number().int(),
  lastError: z.string().nullable(),
  lastAttemptAtUtc: z.string().nullable(),
  succeededAtUtc: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  attempts: z.array(ruleDistributionTargetAttemptResponseSchema),
})

export const scannerCapabilitySchema = z.enum(["Yara", "Sigma", "Snort", "Suricata"])
export const scanRuleSelectionModeSchema = z.enum(["RuleSet", "RuleScope"])
export const scanCadenceTypeSchema = z.enum(["Manual", "Interval", "Daily", "Weekly"])
export const scanPlanTargetSummaryResponseSchema = z.object({
  targetServerId: z.string().uuid(),
  hostname: z.string(),
  ipAddress: z.string(),
})
export const scanPlanRuleSummaryResponseSchema = z.object({
  ruleRevisionId: z.string().uuid(),
  ruleArtifactId: z.string().uuid(),
  ruleName: z.string(),
  ruleFamily: ruleFamilySchema,
  revisionNumber: z.number().int(),
  versionLabel: z.string(),
})

export const scanPlanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  scannerCapability: scannerCapabilitySchema,
  ruleSelectionMode: scanRuleSelectionModeSchema,
  ruleScopeType: z.string().nullable(),
  ruleScopeValue: z.string().nullable(),
  cadenceType: scanCadenceTypeSchema,
  intervalMinutes: z.number().int().nullable(),
  runAtHourUtc: z.number().int().nullable(),
  runAtMinuteUtc: z.number().int().nullable(),
  weeklyDayOfWeek: z.number().int().nullable(),
  operatorNotes: z.string(),
  status: z.string(),
  nextRunAtUtc: z.string().nullable(),
  lastQueuedAtUtc: z.string().nullable(),
  lastCompletedAtUtc: z.string().nullable(),
  lastResultStatus: z.string().nullable(),
  lastResultSummary: z.string().nullable(),
  targetServerIds: z.array(z.string().uuid()),
  ruleRevisionIds: z.array(z.string().uuid()),
  targetServers: z.array(scanPlanTargetSummaryResponseSchema),
  rules: z.array(scanPlanRuleSummaryResponseSchema),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const scanJobResponseSchema = z.object({
  id: z.string().uuid(),
  scanPlanId: z.string().uuid().nullable(),
  triggerSource: z.string(),
  status: z.string(),
  queuedAtUtc: z.string(),
  startedAtUtc: z.string().nullable(),
  completedAtUtc: z.string().nullable(),
  triggeredByUserId: z.string(),
  summary: z.string(),
  cancellationRequested: z.boolean(),
  cancellationRequestedAtUtc: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  totalTargets: z.number().int(),
  completedTargets: z.number().int(),
  failedTargets: z.number().int(),
  cancelledTargets: z.number().int(),
  partiallyCompletedTargets: z.number().int(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const scanJobTargetExecutionResponseSchema = z.object({
  id: z.string().uuid(),
  scanJobId: z.string().uuid(),
  targetServerId: z.string().uuid(),
  targetHostname: z.string(),
  targetIpAddress: z.string(),
  scannerId: z.string().uuid().nullable(),
  scannerName: z.string(),
  status: z.string(),
  startedAtUtc: z.string().nullable(),
  completedAtUtc: z.string().nullable(),
  summary: z.string(),
  errorMessage: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const scannerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  engineType: z.string(),
  version: z.string(),
  healthStatus: z.string(),
  lastHeartbeatUtc: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  capabilities: z.array(scannerCapabilitySchema),
})

export const managedServerScannerAssignmentResponseSchema = z.object({
  targetServerId: z.string().uuid(),
  scannerId: z.string().uuid(),
  scannerName: z.string(),
  connectivityStatus: z.string(),
  lastHeartbeatUtc: z.string().nullable(),
  lastContactUtc: z.string().nullable(),
  isEnabled: z.boolean(),
  capabilities: z.array(scannerCapabilitySchema),
  updatedAtUtc: z.string(),
})

export const managedServerResponseSchema = z.object({
  id: z.string().uuid(),
  subnetId: z.string().uuid(),
  hostname: z.string(),
  ipAddress: z.string(),
  operatingSystem: z.string(),
  environment: z.string(),
  status: z.string(),
  connectivityStatus: z.string(),
  lastHeartbeatUtc: z.string().nullable(),
  lastContactUtc: z.string().nullable(),
  connectionProtocol: z.string().nullable(),
  connectionHost: z.string().nullable(),
  connectionPort: z.number().int().nullable(),
  connectionAuthMode: z.string().nullable(),
  connectionUsername: z.string().nullable(),
  hasConnectionSecret: z.boolean(),
  connectionSecretUpdatedAtUtc: z.string().nullable(),
  scannerAssignments: z.array(managedServerScannerAssignmentResponseSchema),
  scannerCapabilities: z.array(scannerCapabilitySchema),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const managedServerInventoryResponseSchema = z.object({
  servers: z.array(managedServerResponseSchema),
  totalServers: z.number().int(),
  unhealthyServers: z.number().int(),
  unreachableServers: z.number().int(),
  staleContactServers: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const feedSourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourceType: z.string(),
  endpoint: z.string(),
  isEnabled: z.boolean(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const iocResponseSchema = z.object({
  id: z.string().uuid(),
  feedSourceId: z.string().uuid(),
  iocFileId: z.string().uuid().nullable(),
  type: z.string(),
  value: z.string(),
  severity: z.string(),
  confidence: z.number(),
  firstSeenAtUtc: z.string(),
  lastSeenAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  feedSourceName: z.string().nullable().optional(),
  feedSourceType: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
})

export const iocListResponseSchema = z.object({
  items: z.array(iocResponseSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const reportResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  reportType: z.string(),
  summaryJson: z.string(),
  generatedAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  alertIds: z.array(z.string().uuid()),
})

export const generatedReportMetricResponseSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
})

export const generatedReportSectionResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  metrics: z.array(generatedReportMetricResponseSchema),
  highlights: z.array(z.string()),
})

export const generatedReportResponseSchema = z.object({
  requestedReportType: z.string(),
  title: z.string(),
  status: z.string(),
  generatedAtUtc: z.string(),
  sections: z.array(generatedReportSectionResponseSchema),
  alertIds: z.array(z.string().uuid()),
  persistedReport: reportResponseSchema.nullable(),
})

export const reportListResponseSchema = z.object({
  items: z.array(reportResponseSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const powerBiWorkspaceResponseSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  description: z.string(),
  workspaceId: z.string(),
})

export const powerBiVisualizationResponseSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  workspaceKey: z.string(),
  workspaceName: z.string(),
  workspaceId: z.string(),
  reportId: z.string(),
  embedUrl: z.string(),
  status: z.string(),
  requiresUserSignIn: z.boolean(),
  isConfigured: z.boolean(),
  isDefault: z.boolean(),
  embedHeightPx: z.number().int(),
  tags: z.array(z.string()),
})

export const powerBiVisualizationCatalogResponseSchema = z.object({
  status: z.string(),
  defaultVisualizationKey: z.string().nullable(),
  message: z.string(),
  workspaces: z.array(powerBiWorkspaceResponseSchema),
  visualizations: z.array(powerBiVisualizationResponseSchema),
})

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string(),
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payloadJson: z.string(),
  occurredAtUtc: z.string(),
})

export const auditLogListResponseSchema = z.object({
  items: z.array(auditLogResponseSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const detectionHistoryProvenanceResponseSchema = z.object({
  id: z.string().uuid(),
  ingestionRunId: z.string().uuid(),
  rowIndex: z.number().int(),
  isDuplicate: z.boolean(),
  observedAtUtc: z.string(),
  rawPayloadHash: z.string(),
  rawSampleJson: z.string(),
  correlationMetadataJson: z.string(),
  scanJobId: z.string().uuid().nullable(),
  jobAttemptId: z.string().uuid().nullable(),
  targetExecutionId: z.string().uuid().nullable(),
  createdAtUtc: z.string(),
})

export const detectionHistoryItemResponseSchema = z.object({
  id: z.string().uuid(),
  fingerprint: z.string(),
  scannerFamily: z.string(),
  serverId: z.string().uuid(),
  scanJobId: z.string().uuid().nullable(),
  jobAttemptId: z.string().uuid().nullable(),
  targetExecutionId: z.string().uuid().nullable(),
  ruleRevisionId: z.string().uuid().nullable(),
  iocId: z.string().uuid().nullable(),
  disposition: z.string(),
  confidence: z.number(),
  observedAtUtc: z.string(),
  firstObservedAtUtc: z.string(),
  lastObservedAtUtc: z.string(),
  occurrenceCount: z.number().int(),
  isExecutionArtifact: z.boolean(),
  evidenceJson: z.string(),
  rawPayloadHash: z.string(),
  provenanceCount: z.number().int(),
  provenance: z.array(detectionHistoryProvenanceResponseSchema),
  serverHostname: z.string().nullable().optional(),
  iocValue: z.string().nullable().optional(),
  ruleName: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
})

export const detectionHistoryResponseSchema = z.object({
  total: z.number().int(),
  take: z.number().int(),
  skip: z.number().int(),
  items: z.array(detectionHistoryItemResponseSchema),
})

export const managedServerConnectionSecretMetadataResponseSchema = z.object({
  targetServerId: z.string().uuid(),
  hasConnectionSecret: z.boolean(),
  connectionSecretUpdatedAtUtc: z.string().nullable(),
})

export const discoveryRunResponseSchema = z.object({
  id: z.string().uuid(),
  subnetId: z.string().uuid(),
  requestedCidr: z.string(),
  rangeStartIp: z.string().nullable(),
  rangeEndIp: z.string().nullable(),
  status: z.string(),
  queuedAtUtc: z.string(),
  startedAtUtc: z.string().nullable(),
  completedAtUtc: z.string().nullable(),
  totalHosts: z.number(),
  reachableHosts: z.number(),
  unreachableHosts: z.number(),
  summary: z.string(),
})

export const discoveredHostResponseSchema = z.object({
  id: z.string().uuid(),
  subnetId: z.string().uuid(),
  ipAddress: z.string(),
  hostname: z.string(),
  reachability: z.string(),
  firstDiscoveredAtUtc: z.string(),
  lastCheckedAtUtc: z.string(),
  lastSeenAtUtc: z.string().nullable(),
  lastDiscoveryRunId: z.string().uuid(),
  promotedTargetServerId: z.string().uuid().nullable(),
  promotedAtUtc: z.string().nullable(),
})

export const promoteDiscoveredHostResponseSchema = z.object({
  discoveredHostId: z.string().uuid(),
  targetServerId: z.string().uuid(),
  alreadyPromoted: z.boolean(),
  promotedAtUtc: z.string(),
})

export const coveragePainScopeSchema = z.object({
  scopeType: z.string(),
  scopeValue: z.string().nullable(),
})

export const coveragePainScoreSemanticsSchema = z.object({
  readinessRuleWeight: z.number(),
  readinessTelemetryWeight: z.number(),
  readinessAttackCoverageWeight: z.number(),
  readinessFreshnessWeight: z.number(),
  incidentSightingsWeight: z.number(),
  incidentDetectionsWeight: z.number(),
  incidentCasePressureWeight: z.number(),
  incidentRecencyWeight: z.number(),
  trendWindowDays: z.number(),
  freshnessFullCreditDays: z.number(),
  freshnessZeroCreditDays: z.number(),
})

export const coveragePainTierSignalBreakdownSchema = z.object({
  caseCount: z.number(),
  detectionCount: z.number(),
  ruleCount: z.number(),
  attackMappingCount: z.number(),
  telemetrySignalCount: z.number(),
  sightingsCount: z.number(),
})

export const coveragePainTierAnalysisSchema = z.object({
  tier: z.string(),
  readinessScore: z.number(),
  incidentActivityScore: z.number(),
  confidence: z.number(),
  freshness: z.number(),
  indicatorCount: z.number(),
  trend: z.string(),
  missingDataStatus: z.string(),
  topGaps: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  signalBreakdown: coveragePainTierSignalBreakdownSchema,
})

export const coveragePainGapAnalysisSchema = z.object({
  strongestTiers: z.array(z.string()),
  weakestTiers: z.array(z.string()),
  lowTierAverageReadiness: z.number(),
  highTierAverageReadiness: z.number(),
  lowVsHighTierImbalance: z.number(),
  suggestedImprovementDirection: z.string(),
})

export const coveragePainAnalysisResponseSchema = z.object({
  generatedAtUtc: z.string(),
  scope: coveragePainScopeSchema,
  scoreSemantics: coveragePainScoreSemanticsSchema,
  tiers: z.array(coveragePainTierAnalysisSchema),
  painGapAnalysis: coveragePainGapAnalysisSchema,
})

export const jobRunResponseSchema = z.object({
  id: z.string().uuid(),
  jobType: z.string(),
  status: z.string(),
  triggeredBy: z.string(),
  details: z.string(),
  startedAtUtc: z.string(),
  completedAtUtc: z.string().nullable(),
})

export type TokenResponse = z.infer<typeof tokenResponseSchema>
export type AlertResponse = z.infer<typeof alertResponseSchema>
export type V2AlertResponse = z.infer<typeof v2AlertResponseSchema>
export type AlertListResponse = z.infer<typeof alertListResponseSchema>
export type CaseResponse = AlertResponse
export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>
export type DecisionResponse = z.infer<typeof decisionResponseSchema>
export type RuleFamily = z.infer<typeof ruleFamilySchema>
export type RuleResponse = z.infer<typeof ruleResponseSchema>
export type RuleScopeType = z.infer<typeof ruleScopeTypeSchema>
export type RuleValidationSeverity = z.infer<typeof ruleValidationSeveritySchema>
export type RuleValidationDiagnostic = z.infer<typeof ruleValidationDiagnosticSchema>
export type RuleValidationStageResult = z.infer<typeof ruleValidationStageResultSchema>
export type RuleValidationResult = z.infer<typeof ruleValidationResultSchema>
export type RuleImportAttempt = z.infer<typeof ruleImportAttemptSchema>
export type RuleListItem = z.infer<typeof ruleListItemSchema>
export type RuleRevisionItem = z.infer<typeof ruleRevisionItemSchema>
export type RuleDetail = z.infer<typeof ruleDetailSchema>
export type RuleListResponse = z.infer<typeof ruleListResponseSchema>
export type DeploymentResponse = z.infer<typeof deploymentResponseSchema>
export type RuleProposalResponse = z.infer<typeof ruleProposalResponseSchema>
export type DeploymentRecommendationResponse = z.infer<typeof deploymentRecommendationResponseSchema>
export type RolloutPlanResponse = z.infer<typeof rolloutPlanResponseSchema>
export type RollbackPlanResponse = z.infer<typeof rollbackPlanResponseSchema>
export type RuleSimulationResultResponse = z.infer<typeof ruleSimulationResultResponseSchema>
export type AlertRuleWorkflowResponse = z.infer<typeof alertRuleWorkflowResponseSchema>
export type CaseRuleWorkflowResponse = AlertRuleWorkflowResponse
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>
export type HealthInfo = z.infer<typeof healthInfoSchema>
export type HealthAdmin = z.infer<typeof healthAdminSchema>
export type HealthReady = z.infer<typeof healthReadySchema>
export type UserResponse = z.infer<typeof userResponseSchema>
export type RoleResponse = z.infer<typeof roleResponseSchema>
export type SubnetResponse = z.infer<typeof subnetResponseSchema>
export type TargetServerResponse = z.infer<typeof targetServerResponseSchema>
export type TargetGroupResponse = z.infer<typeof targetGroupResponseSchema>
export type TargetGroupMemberResponse = z.infer<typeof targetGroupMemberResponseSchema>
export type RuleDistributionJobResponse = z.infer<typeof ruleDistributionJobResponseSchema>
export type RuleDistributionAttemptResponse = z.infer<typeof ruleDistributionAttemptResponseSchema>
export type RuleDistributionTargetAttemptResponse = z.infer<typeof ruleDistributionTargetAttemptResponseSchema>
export type RuleDistributionTargetResponse = z.infer<typeof ruleDistributionTargetResponseSchema>
export type ScannerCapability = z.infer<typeof scannerCapabilitySchema>
export type ScanRuleSelectionMode = z.infer<typeof scanRuleSelectionModeSchema>
export type ScanCadenceType = z.infer<typeof scanCadenceTypeSchema>
export type ScanPlanTargetSummaryResponse = z.infer<typeof scanPlanTargetSummaryResponseSchema>
export type ScanPlanRuleSummaryResponse = z.infer<typeof scanPlanRuleSummaryResponseSchema>
export type ScanPlanResponse = z.infer<typeof scanPlanResponseSchema>
export type ScanJobResponse = z.infer<typeof scanJobResponseSchema>
export type ScanJobTargetExecutionResponse = z.infer<typeof scanJobTargetExecutionResponseSchema>
export type ScannerResponse = z.infer<typeof scannerResponseSchema>
export type ManagedServerScannerAssignmentResponse = z.infer<typeof managedServerScannerAssignmentResponseSchema>
export type ManagedServerResponse = z.infer<typeof managedServerResponseSchema>
export type ManagedServerInventoryResponse = z.infer<typeof managedServerInventoryResponseSchema>
export type ManagedServerConnectionSecretMetadataResponse = z.infer<typeof managedServerConnectionSecretMetadataResponseSchema>
export type FeedSourceResponse = z.infer<typeof feedSourceResponseSchema>
export type IocResponse = z.infer<typeof iocResponseSchema>
export type IocListResponse = z.infer<typeof iocListResponseSchema>
export type ReportResponse = z.infer<typeof reportResponseSchema>
export type GeneratedReportMetricResponse = z.infer<typeof generatedReportMetricResponseSchema>
export type GeneratedReportSectionResponse = z.infer<typeof generatedReportSectionResponseSchema>
export type GeneratedReportResponse = z.infer<typeof generatedReportResponseSchema>
export type ReportListResponse = z.infer<typeof reportListResponseSchema>
export type PowerBiWorkspaceResponse = z.infer<typeof powerBiWorkspaceResponseSchema>
export type PowerBiVisualizationResponse = z.infer<typeof powerBiVisualizationResponseSchema>
export type PowerBiVisualizationCatalogResponse = z.infer<typeof powerBiVisualizationCatalogResponseSchema>
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>
export type DetectionHistoryProvenanceResponse = z.infer<typeof detectionHistoryProvenanceResponseSchema>
export type DetectionHistoryItemResponse = z.infer<typeof detectionHistoryItemResponseSchema>
export type DetectionHistoryResponse = z.infer<typeof detectionHistoryResponseSchema>
export type DiscoveryRunResponse = z.infer<typeof discoveryRunResponseSchema>
export type DiscoveredHostResponse = z.infer<typeof discoveredHostResponseSchema>
export type PromoteDiscoveredHostResponse = z.infer<typeof promoteDiscoveredHostResponseSchema>
export type CoveragePainAnalysisResponse = z.infer<typeof coveragePainAnalysisResponseSchema>
export type JobRunResponse = z.infer<typeof jobRunResponseSchema>
