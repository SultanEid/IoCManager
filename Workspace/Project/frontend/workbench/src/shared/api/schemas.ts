import { z } from "zod"

export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresAtUtc: z.string().min(1),
  tokenType: z.string().min(1),
})

const safeString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : ""))
const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value : null))

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
  ownerDisplayName: safeString,
  ownerEmail: nullableString,
  approvalTierRequired: safeString,
  scannerFamily: safeString,
  targetId: z.string().nullable(),
  targetDisplay: safeString,
  ruleName: safeString,
  linkedIocCount: z.number().int(),
  firstDetectedAtUtc: z.string(),
  lastDetectedAtUtc: z.string(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})
export const alertProgressResponseSchema = z.object({
  totalIocs: z.number().int(),
  openCount: z.number().int(),
  inReviewCount: z.number().int(),
  completedCount: z.number().int(),
  percentComplete: z.number().int(),
})
export const v2AlertResponseWithProgressSchema = v2AlertResponseSchema.extend({
  progress: alertProgressResponseSchema,
})
export const alertListResponseSchema = z.object({
  items: z.array(v2AlertResponseWithProgressSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
export const alertOwnerResponseSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  email: z.string(),
})
export const alertEmailUpdateResponseSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  subject: z.string(),
  body: z.string(),
  toEmail: z.string(),
  ccEmails: z.array(z.string()),
  deliveryStatus: z.string(),
  failureDetail: z.string().nullable(),
  sentAtUtc: z.string().nullable(),
  createdByUserId: z.string(),
  createdAtUtc: z.string(),
})
export const v2AlertTargetSummarySchema = z.object({
  id: z.string().nullable(),
  display: safeString,
  hostname: z.string().nullable(),
  ipAddress: z.string().nullable(),
  status: z.string().nullable(),
  targetOsType: z.string().nullable(),
})
export const v2AlertLinkedIocYaraDetailSchema = z.object({
  filePath: z.string().nullable(),
  fileHash: z.string().nullable(),
})
export const v2AlertLinkedIocSigmaDetailSchema = z.object({
  logSource: z.string().nullable(),
  severity: z.string().nullable(),
  commandLine: z.string().nullable(),
})
export const v2AlertLinkedIocNetworkDetailSchema = z.object({
  sourceIp: z.string().nullable(),
  destIp: z.string().nullable(),
  protocol: z.string().nullable(),
  severity: z.string().nullable(),
  flowId: z.number().int().nullable(),
})
export const v2AlertLinkedIocSchema = z.object({
  iocId: z.string().uuid(),
  scannerFamily: safeString,
  ruleName: safeString,
  indicatorValue: safeString,
  indicatorKind: safeString,
  severity: safeString,
  status: safeString,
  statusUpdatedAtUtc: z.string(),
  statusUpdatedByUserId: safeString,
  timestampUtc: z.string(),
  rawPayload: z.string().nullable(),
  yaraDetail: v2AlertLinkedIocYaraDetailSchema.nullable(),
  sigmaDetail: v2AlertLinkedIocSigmaDetailSchema.nullable(),
  networkDetail: v2AlertLinkedIocNetworkDetailSchema.nullable(),
})
export const v2AlertLinkedScanResultSchema = z.object({
  resultId: z.string(),
  jobId: z.string().nullable(),
  status: safeString,
  findingsCount: z.number().int(),
  startedAtUtc: z.string().nullable(),
  finishedAtUtc: z.string().nullable(),
})
export const v2AlertDetailResponseSchema = v2AlertResponseWithProgressSchema.extend({
  target: v2AlertTargetSummarySchema.nullable(),
  linkedIocs: z.array(v2AlertLinkedIocSchema),
  linkedScanResults: z.array(v2AlertLinkedScanResultSchema),
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

export const ruleFamilySchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toLowerCase() : value),
  z.enum(["yara", "sigma", "snort", "suricata"]),
)

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

export const feedbackVerdictSchema = z.enum([
  "benign",
  "likely_benign",
  "suspicious",
  "likely_malicious",
  "malicious",
  "false_positive",
  "insufficient_evidence",
  "stale_or_revoked",
])

export const feedbackReviewPrioritySchema = z.enum(["low", "medium", "high", "critical"])

export const feedbackResponseSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  decisionId: z.string().uuid().nullable(),
  verdict: feedbackVerdictSchema,
  confidence: z.number().min(0).max(1),
  falsePositiveRisk: z.number().min(0).max(1),
  reviewPriority: feedbackReviewPrioritySchema,
  shouldPromoteToIndicator: z.boolean(),
  shouldSuppress: z.boolean(),
  shouldAllowlist: z.boolean(),
  shouldEscalate: z.boolean(),
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

export const aiModelStatisticsSchema = z.object({
  modelId: z.string(),
  modelVersion: z.string(),
  status: z.string(),
  datasetVersion: z.string(),
  scoringProfileVersion: z.string(),
  featureSchemaVersion: z.string(),
  createdAtUtc: z.string().nullable(),
  publishedAtUtc: z.string().nullable(),
  trainingWindowStartUtc: z.string().nullable(),
  trainingWindowEndUtc: z.string().nullable(),
  evaluationWindowStartUtc: z.string().nullable(),
  evaluationWindowEndUtc: z.string().nullable(),
  datasetManifestHash: z.string().nullable(),
  metrics: z.record(z.string(), z.number()),
  thresholds: z.record(z.string(), z.number()),
  datasetCounts: z.record(z.string(), z.number()),
  runtimeWarnings: z.array(z.string()),
  readinessStatus: z.string(),
  notes: z.string().nullable(),
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

export const permissionResponseSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  description: z.string(),
  createdAtUtc: z.string(),
})

export const rolePermissionResponseSchema = z.object({
  roleId: z.string().min(1),
  permissionId: z.string().min(1),
  grantedByUserId: z.string(),
  grantedAtUtc: z.string(),
})

export const retentionPolicyResponseSchema = z.object({
  id: z.string().uuid(),
  dataType: z.string(),
  retainDays: z.number().int(),
  archiveAfterDays: z.number().int(),
  isEnabled: z.boolean(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

export const archiveRecordResponseSchema = z.object({
  id: z.string().uuid(),
  retentionPolicyId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  archiveUri: z.string(),
  archivedAtUtc: z.string(),
  createdAtUtc: z.string(),
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
export const scanRuleSelectionModeSchema = z.enum(["RuleSet", "RuleScope", "LegacyPreset"])
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

export const scanAnalystPlannerModeSchema = z
  .enum(["local", "openai_refined", "openai_fallback", "openai_required", "bounded-local"])
  .catch("openai_required")
export const scanAnalystActionSchema = z.enum(["RecommendOnly", "CreatePlan", "CreateAndRun"])

export const scanAnalystTargetProposalResponseSchema = z.object({
  targetServerId: z.string().uuid(),
  hostname: z.string(),
  ipAddress: z.string(),
  operatingSystem: z.string(),
  environment: z.string(),
  status: z.string(),
  connectivityStatus: z.string(),
  scannerCapabilities: z.array(scannerCapabilitySchema),
  reason: z.string(),
})

export const scanAnalystRuleProposalResponseSchema = z.object({
  ruleRevisionId: z.string().uuid(),
  ruleArtifactId: z.string().uuid(),
  ruleName: z.string(),
  ruleFamily: ruleFamilySchema,
  revisionNumber: z.number().int(),
  versionLabel: z.string(),
  lifecycleStatus: z.string(),
  scopeType: z.string(),
  scopeValue: z.string().nullable(),
  reason: z.string(),
})

export const scanAnalystPlanProposalResponseSchema = z.object({
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
  targetServerIds: z.array(z.string().uuid()),
  ruleRevisionIds: z.array(z.string().uuid()),
  targets: z.array(scanAnalystTargetProposalResponseSchema),
  rules: z.array(scanAnalystRuleProposalResponseSchema),
})

export const scanAnalystContextSummaryResponseSchema = z.object({
  focusSubnetId: z.string().uuid().nullable(),
  focusSubnetName: z.string().nullable(),
  discoveryRunCount: z.number().int(),
  discoveredHostCount: z.number().int(),
  managedServerCount: z.number().int(),
  candidateRuleCount: z.number().int(),
  existingPlanCount: z.number().int(),
  recentJobCount: z.number().int(),
})

export const scanAnalystRunTargetExecutionResponseSchema = z.object({
  targetHostname: z.string(),
  targetIpAddress: z.string(),
  status: z.string(),
  summary: z.string(),
  errorMessage: z.string().nullable(),
})

export const scanAnalystRunDetectionResponseSchema = z.object({
  detectionId: z.string().uuid(),
  ruleName: z.string(),
  serverHostname: z.string(),
  disposition: z.string(),
  observedAtUtc: z.string(),
})

export const scanAnalystRunSummaryResponseSchema = z.object({
  scanJobId: z.string().uuid().nullable(),
  isSimulated: z.boolean(),
  narrativeSummary: z.string(),
  jobStatus: z.string(),
  totalTargets: z.number().int(),
  completedTargets: z.number().int(),
  failedTargets: z.number().int(),
  detectionCount: z.number().int(),
  generatedAtUtc: z.string(),
  targetExecutions: z.array(scanAnalystRunTargetExecutionResponseSchema),
  detections: z.array(scanAnalystRunDetectionResponseSchema),
})

export const scanAnalystResponseSchema = z.object({
  action: scanAnalystActionSchema,
  operatingMode: z.string(),
  summary: z.string(),
  plannerMode: scanAnalystPlannerModeSchema,
  observations: z.array(z.string()),
  reasoning: z.array(z.string()),
  validationWarnings: z.array(z.string()),
  recommendedScannerCapability: scannerCapabilitySchema,
  contextSummary: scanAnalystContextSummaryResponseSchema,
  proposedPlan: scanAnalystPlanProposalResponseSchema,
  createdPlan: scanPlanResponseSchema.nullable(),
  queuedJob: scanJobResponseSchema.nullable(),
  runSummary: scanAnalystRunSummaryResponseSchema.nullable(),
})

export const scanAnalystAgentMessageResponseSchema = z.object({
  role: z.string(),
  content: z.string(),
  timestampUtc: z.string(),
})

export const scanAnalystAutonomousActivityResponseSchema = z.object({
  summary: z.string(),
  trigger: z.string(),
  action: scanAnalystActionSchema,
  operatingMode: z.string(),
  occurredAtUtc: z.string(),
})

export const scanAnalystAgentParametersResponseSchema = z.object({
  enabled: z.boolean(),
  allowedSubnets: z.array(z.string()),
  allowedEnvironments: z.array(z.string()),
  maxTargetsPerRun: z.number().int(),
  preferredScannerFamily: z.string(),
  autoRun: z.boolean(),
  quietHours: z.string(),
  watchForNewHosts: z.boolean(),
  watchForFailedRecentJobs: z.boolean(),
  watchForRecentAlerts: z.boolean(),
  requireMatchingRuleFamily: z.boolean(),
})

export const scanAnalystRecentActionResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  occurredAtUtc: z.string(),
  status: z.string(),
})

export const scanAnalystCompletedPlanResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  scannerCapability: scannerCapabilitySchema,
  targetCount: z.number().int(),
  detectionCount: z.number().int(),
  outcome: z.string(),
  completedAtUtc: z.string(),
  rulePath: z.string().nullable().optional(),
})

export const scanAnalystAgentStatusResponseSchema = z.object({
  agentEnabled: z.boolean(),
  autonomyEnabled: z.boolean(),
  databaseAvailable: z.boolean(),
  operatingMode: z.string(),
  indicatorLabel: z.string(),
  degradedReason: z.string().nullable(),
  activeSessionCount: z.number().int(),
  availableMockConditions: z.array(z.string()),
  activeMockConditions: z.array(z.string()),
  parameters: scanAnalystAgentParametersResponseSchema,
  lastAutonomousActivity: scanAnalystAutonomousActivityResponseSchema.nullable(),
  personaName: z.string().optional(),
  currentActivity: z.string().optional(),
  latestActionSummary: z.string().optional(),
  recentActions: z.array(scanAnalystRecentActionResponseSchema).optional(),
  completedPlans: z.array(scanAnalystCompletedPlanResponseSchema).optional(),
})

export const scanAnalystChatResponseSchema = z.object({
  sessionId: z.string().uuid(),
  agentStatusLine: z.string(),
  operatingMode: z.string(),
  databaseAvailable: z.boolean(),
  activeMockConditions: z.array(z.string()),
  messages: z.array(scanAnalystAgentMessageResponseSchema),
  latestAnalysis: scanAnalystResponseSchema,
  latestRunSummary: scanAnalystRunSummaryResponseSchema.nullable(),
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

export const generatedReportTableColumnResponseSchema = z.object({
  key: z.string(),
  label: z.string(),
})

export const generatedReportTableRowResponseSchema = z.object({
  values: z.record(z.string(), z.string()),
})

export const generatedReportTableResponseSchema = z.object({
  title: z.string(),
  columns: z.array(generatedReportTableColumnResponseSchema),
  rows: z.array(generatedReportTableRowResponseSchema),
})

export const generatedReportSectionResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  metrics: z.array(generatedReportMetricResponseSchema),
  highlights: z.array(z.string()),
  narrative: z.string().nullable().optional().default(null),
  tables: z.array(generatedReportTableResponseSchema).optional().default([]),
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

export const reportMitigationCitationResponseSchema = z.object({
  sourceId: z.string(),
  sourceType: z.string(),
  snippet: z.string(),
  sourceUri: z.string().nullable(),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
  confidence: z.number(),
})

export const reportMitigationExtractedIocResponseSchema = z.object({
  iocType: z.string(),
  iocValue: z.string(),
  label: z.string(),
  confidence: z.number(),
  attackTechniques: z.array(z.string()),
  cveRefs: z.array(z.string()),
  citations: z.array(reportMitigationCitationResponseSchema),
})

export const reportMitigationClaimResponseSchema = z.object({
  claimId: z.string(),
  claimType: z.string(),
  statement: z.string(),
  snippet: z.string(),
  sourceStartOffset: z.number().int().nullable(),
  sourceEndOffset: z.number().int().nullable(),
  pageIndex: z.number().int().nullable(),
  extractionMethod: z.string(),
  confidence: z.number(),
  isPromptInjectionSuspected: z.boolean(),
  abstainReasonCodes: z.array(z.string()),
  citations: z.array(reportMitigationCitationResponseSchema),
})

export const reportMitigationActionResponseSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  priority: z.string(),
  ownerHint: z.string(),
  validation: z.string(),
  automationReadiness: z.string(),
})

export const reportMitigationPrimaryActionResponseSchema = z.object({
  rank: z.number().int(),
  title: z.string(),
  targetHint: z.string(),
  urgency: z.string(),
  reasoning: z.string(),
})

export const reportMitigationTimelineStepResponseSchema = z.object({
  stepId: z.string(),
  title: z.string(),
  linkedPrimaryActionRank: z.number().int().nullable(),
  targetHint: z.string(),
  lane: z.string(),
  startsIn: z.number().int(),
  duration: z.number().int(),
  unit: z.string(),
  rationale: z.string(),
})

export const reportMitigationScanRecommendationResponseSchema = z.object({
  scannerFamily: z.string(),
  targetHint: z.string(),
  ruleHint: z.string(),
  rationale: z.string(),
  priority: z.string(),
})

export const reportMitigationPlanResponseSchema = z.object({
  executiveSummary: z.string(),
  threatSummary: z.string(),
  severity: z.string(),
  confidence: z.string(),
  affectedAssetHypotheses: z.array(z.string()),
  primaryActions: z.array(reportMitigationPrimaryActionResponseSchema).optional().default([]),
  timeline: z.array(reportMitigationTimelineStepResponseSchema).optional().default([]),
  immediateActions: z.array(reportMitigationActionResponseSchema).optional().default([]),
  detectionActions: z.array(reportMitigationActionResponseSchema).optional().default([]),
  hardeningActions: z.array(reportMitigationActionResponseSchema).optional().default([]),
  validationSteps: z.array(z.string()),
  scanRecommendations: z.array(reportMitigationScanRecommendationResponseSchema),
  assumptions: z.array(z.string()),
  gaps: z.array(z.string()),
  requiresHumanReview: z.boolean(),
})

export const reportMitigationResponseSchema = z.object({
  reportId: z.string(),
  sourceType: z.string(),
  plannerModel: z.string(),
  extractedIocs: z.array(reportMitigationExtractedIocResponseSchema),
  claims: z.array(reportMitigationClaimResponseSchema),
  campaignHints: z.array(z.string()),
  malwareFamilyHints: z.array(z.string()),
  mitigationPlan: reportMitigationPlanResponseSchema,
  generatedAt: z.string(),
  sourceReportId: z.string().uuid().nullable(),
  persistedMitigationReport: reportResponseSchema.nullable(),
})

export const reportMitigationListItemResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sourceReportId: z.string().uuid().nullable(),
  sourceDocumentId: z.string().nullable().optional(),
  sourceScanJobIds: z.array(z.string().uuid()),
  severity: z.string(),
  confidence: z.string(),
  executiveSummary: z.string(),
  generatedAtUtc: z.string(),
  alertIds: z.array(z.string().uuid()),
})

export const reportMitigationListResponseSchema = z.object({
  items: z.array(reportMitigationListItemResponseSchema),
  totalCount: z.number().int(),
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
  embedToken: z.string().nullable().optional(),
  embedTokenExpiresAtUtc: z.string().nullable().optional(),
  tokenType: z.string().optional(),
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

export const detectionLinkedAlertCaseResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  severity: z.string(),
  updatedAtUtc: z.string(),
})

export const detectionDetailResponseSchema = z.object({
  id: z.string().uuid(),
  fingerprint: z.string(),
  scannerFamily: z.string(),
  serverId: z.string().uuid(),
  serverHostname: z.string().nullable(),
  scanJobId: z.string().uuid().nullable(),
  jobAttemptId: z.string().uuid().nullable(),
  targetExecutionId: z.string().uuid().nullable(),
  ruleRevisionId: z.string().uuid().nullable(),
  ruleName: z.string().nullable(),
  iocId: z.string().uuid().nullable(),
  iocType: z.string().nullable(),
  iocValue: z.string().nullable(),
  disposition: z.string(),
  confidence: z.number(),
  observedAtUtc: z.string(),
  firstObservedAtUtc: z.string(),
  lastObservedAtUtc: z.string(),
  occurrenceCount: z.number().int(),
  isExecutionArtifact: z.boolean(),
  evidenceJson: z.string(),
  rawPayloadHash: z.string(),
  source: z.string().nullable(),
  linkedAlerts: z.array(detectionLinkedAlertCaseResponseSchema),
  linkedCases: z.array(detectionLinkedAlertCaseResponseSchema),
})

const rawJsonObjectSchema = z.record(z.string(), z.unknown())

export const aiDecisionLinksResponseSchema = z.object({
  result: z.string(),
  explanation: z.string(),
  actionPlan: z.string(),
  similarDetections: z.string(),
  evidenceSources: z.string(),
  overrideClosure: z.string(),
})

export const submitAiDecisionAcceptedResponseSchema = z.object({
  decisionId: z.string().uuid(),
  status: z.string(),
  submittedAtUtc: z.string(),
  links: aiDecisionLinksResponseSchema,
})

export const aiDecisionProvenanceResponseSchema = z.object({
  source: z.string(),
  key: z.string(),
  value: z.string(),
  evidenceId: z.string().nullable(),
  citationRef: z.string().nullable(),
})

export const aiSafetyDiagnosticsResponseSchema = z.object({
  autoRemediationAllowed: z.boolean(),
  weakEvidence: z.boolean(),
  contradictoryEvidence: z.boolean(),
  contradictionScore: z.number(),
  missingCriticalFields: z.array(z.string()),
  partialEvidence: z.boolean(),
  enrichmentStatus: z.enum(["available", "degraded", "unavailable"]),
  falsePositiveRisk: z.number(),
  severityCapApplied: z.boolean(),
  maxRecommendationSeverity: z.enum(["review_only", "containment_allowed"]),
  degradationReasons: z.array(z.string()),
})

export const aiDecisionDecisionResponseSchema = z.object({
  verdict: z.string(),
  action: z.string(),
  confidence: z.number(),
  falsePositiveRisk: z.number(),
  reviewPriority: z.string(),
  shouldPromoteToIndicator: z.boolean(),
  shouldSuppress: z.boolean(),
  shouldAllowlist: z.boolean(),
  shouldEscalate: z.boolean(),
  reasons: z.array(z.string()),
  provenance: z.array(aiDecisionProvenanceResponseSchema),
  nextBestEvidence: z.array(z.string()),
  abstainReason: z.string().nullable(),
  scoredAtUtc: z.string(),
  safetyDiagnostics: aiSafetyDiagnosticsResponseSchema.nullable().optional().default(null),
  raw: rawJsonObjectSchema,
})

export const aiDecisionResultResponseSchema = z.object({
  decisionId: z.string().uuid(),
  status: z.string(),
  submittedAtUtc: z.string(),
  startedAtUtc: z.string().nullable(),
  completedAtUtc: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  modelVersion: z.string().nullable(),
  datasetVersion: z.string().nullable(),
  decision: aiDecisionDecisionResponseSchema.nullable(),
  explanationAvailable: z.boolean(),
  actionPlanAvailable: z.boolean(),
  similarDetectionsAvailable: z.boolean(),
  evidenceSourcesAvailable: z.boolean(),
})

export const iocLatestAiDecisionResponseSchema = z.object({
  iocId: z.string().uuid(),
  detectionId: z.string().uuid().nullable(),
  result: aiDecisionResultResponseSchema,
})

export const aiExplanationCitationResponseSchema = z.object({
  sourceId: z.string(),
  sourceType: z.string(),
  snippet: z.string(),
  sourceUri: z.string().nullable(),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
  confidence: z.number().nullable(),
})

export const aiPhrasingDiagnosticsResponseSchema = z.object({
  origin: z.enum(["deterministic", "llm_assist"]),
  status: z.string().nullable(),
  enabled: z.boolean().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  raw: rawJsonObjectSchema.nullable(),
})

export const aiDecisionExplanationResponseSchema = z.object({
  decisionId: z.string().uuid(),
  status: z.string(),
  summary: z.string().nullable(),
  decisionState: z.string().nullable(),
  recommendedAction: z.string().nullable(),
  rationale: z.array(z.string()),
  citations: z.array(aiExplanationCitationResponseSchema),
  nextBestEvidence: z.array(z.string()),
  policyVersion: z.string().nullable(),
  modelVersion: z.string().nullable(),
  datasetVersion: z.string().nullable(),
  generatedAtUtc: z.string().nullable(),
  raw: rawJsonObjectSchema.nullable(),
  phrasingDiagnostics: aiPhrasingDiagnosticsResponseSchema.nullable(),
})

export const aiRecommendedActionResponseSchema = z.object({
  action: z.string(),
  rank: z.number().int(),
  score: z.number(),
  rationale: z.string(),
  prerequisites: z.array(z.string()),
  cautions: z.array(z.string()),
  escalationTarget: z.string(),
  requiredReviewerRole: z.string(),
  requiresHumanApproval: z.boolean(),
  executionMode: z.string(),
})

export const aiDecisionActionPlanResponseSchema = z.object({
  decisionId: z.string().uuid(),
  status: z.string(),
  summary: z.string().nullable(),
  recommendedActions: z.array(aiRecommendedActionResponseSchema),
  prerequisites: z.array(z.string()),
  cautions: z.array(z.string()),
  neverAutoExecutes: z.boolean().nullable(),
  policyConstrained: z.boolean().nullable(),
  evidenceBased: z.boolean().nullable(),
  generatedAtUtc: z.string().nullable(),
  raw: rawJsonObjectSchema.nullable(),
  phrasingDiagnostics: aiPhrasingDiagnosticsResponseSchema.nullable(),
})

export const aiDecisionPendingResponseSchema = z.object({
  decisionId: z.string().uuid(),
  status: z.string(),
  message: z.string(),
})

export const aiDecisionExplanationOrPendingResponseSchema = z.union([
  aiDecisionExplanationResponseSchema,
  aiDecisionPendingResponseSchema,
])

export const aiDecisionActionPlanOrPendingResponseSchema = z.union([
  aiDecisionActionPlanResponseSchema,
  aiDecisionPendingResponseSchema,
])

export const aiSimilarDetectionResponseSchema = z.object({
  id: z.string().uuid(),
  detectionId: z.string(),
  ruleFamily: z.string(),
  ruleId: z.string(),
  relationType: z.string(),
  observedAtUtc: z.string(),
  confidence: z.number(),
  similarityScore: z.number(),
  similarityReasons: z.array(z.string()),
  priorVerdicts: z.array(z.string()),
  priorAcceptedActions: z.array(z.string()),
  priorOutcomes: z.array(z.string()),
  rank: z.number().int(),
})

export const aiSimilarDetectionsResponseSchema = z.object({
  decisionId: z.string().uuid(),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  items: z.array(aiSimilarDetectionResponseSchema),
})

export const aiEvidenceSourceResponseSchema = z.object({
  id: z.string().uuid(),
  channel: z.string(),
  source: z.string(),
  evidenceId: z.string().nullable(),
  reference: z.string().nullable(),
  category: z.string(),
  polarity: z.string(),
  confidence: z.number().nullable(),
  summary: z.string(),
  anchor: z.string(),
  rank: z.number().int(),
})

export const aiEvidenceSourcesResponseSchema = z.object({
  decisionId: z.string().uuid(),
  limit: z.number().int(),
  nextCursor: z.string().nullable(),
  items: z.array(aiEvidenceSourceResponseSchema),
})

export const aiOverrideOrClosureResponseSchema = z.object({
  decisionId: z.string().uuid(),
  overrideId: z.string().uuid(),
  actionType: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  reason: z.string(),
  notes: z.string().nullable(),
  overrideVerdict: z.string().nullable(),
  closureDisposition: z.string().nullable(),
  isFinal: z.boolean(),
  submittedByUserId: z.string(),
  submittedAtUtc: z.string(),
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
export type AlertProgressResponse = z.infer<typeof alertProgressResponseSchema>
export type V2AlertResponse = z.infer<typeof v2AlertResponseWithProgressSchema>
export type AlertListResponse = z.infer<typeof alertListResponseSchema>
export type AlertOwnerResponse = z.infer<typeof alertOwnerResponseSchema>
export type AlertEmailUpdateResponse = z.infer<typeof alertEmailUpdateResponseSchema>
export type V2AlertTargetSummary = z.infer<typeof v2AlertTargetSummarySchema>
export type V2AlertLinkedIocYaraDetail = z.infer<typeof v2AlertLinkedIocYaraDetailSchema>
export type V2AlertLinkedIocSigmaDetail = z.infer<typeof v2AlertLinkedIocSigmaDetailSchema>
export type V2AlertLinkedIocNetworkDetail = z.infer<typeof v2AlertLinkedIocNetworkDetailSchema>
export type V2AlertLinkedIoc = z.infer<typeof v2AlertLinkedIocSchema>
export type V2AlertLinkedScanResult = z.infer<typeof v2AlertLinkedScanResultSchema>
export type V2AlertDetailResponse = z.infer<typeof v2AlertDetailResponseSchema>
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
export type FeedbackVerdict = z.infer<typeof feedbackVerdictSchema>
export type FeedbackReviewPriority = z.infer<typeof feedbackReviewPrioritySchema>
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>
export type HealthInfo = z.infer<typeof healthInfoSchema>
export type HealthAdmin = z.infer<typeof healthAdminSchema>
export type HealthReady = z.infer<typeof healthReadySchema>
export type AiModelStatistics = z.infer<typeof aiModelStatisticsSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
export type RoleResponse = z.infer<typeof roleResponseSchema>
export type PermissionResponse = z.infer<typeof permissionResponseSchema>
export type RolePermissionResponse = z.infer<typeof rolePermissionResponseSchema>
export type RetentionPolicyResponse = z.infer<typeof retentionPolicyResponseSchema>
export type ArchiveRecordResponse = z.infer<typeof archiveRecordResponseSchema>
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
export type ScanAnalystPlannerMode = z.infer<typeof scanAnalystPlannerModeSchema>
export type ScanAnalystAction = z.infer<typeof scanAnalystActionSchema>
export type ScanAnalystTargetProposalResponse = z.infer<typeof scanAnalystTargetProposalResponseSchema>
export type ScanAnalystRuleProposalResponse = z.infer<typeof scanAnalystRuleProposalResponseSchema>
export type ScanAnalystPlanProposalResponse = z.infer<typeof scanAnalystPlanProposalResponseSchema>
export type ScanAnalystRunTargetExecutionResponse = z.infer<typeof scanAnalystRunTargetExecutionResponseSchema>
export type ScanAnalystRunDetectionResponse = z.infer<typeof scanAnalystRunDetectionResponseSchema>
export type ScanAnalystRunSummaryResponse = z.infer<typeof scanAnalystRunSummaryResponseSchema>
export type ScanAnalystContextSummaryResponse = z.infer<typeof scanAnalystContextSummaryResponseSchema>
export type ScanAnalystResponse = z.infer<typeof scanAnalystResponseSchema>
export type ScanAnalystAgentMessageResponse = z.infer<typeof scanAnalystAgentMessageResponseSchema>
export type ScanAnalystAutonomousActivityResponse = z.infer<typeof scanAnalystAutonomousActivityResponseSchema>
export type ScanAnalystAgentParametersResponse = z.infer<typeof scanAnalystAgentParametersResponseSchema>
export type ScanAnalystRecentActionResponse = z.infer<typeof scanAnalystRecentActionResponseSchema>
export type ScanAnalystCompletedPlanResponse = z.infer<typeof scanAnalystCompletedPlanResponseSchema>
export type ScanAnalystAgentStatusResponse = z.infer<typeof scanAnalystAgentStatusResponseSchema>
export type ScanAnalystChatResponse = z.infer<typeof scanAnalystChatResponseSchema>
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
export type GeneratedReportTableColumnResponse = z.infer<typeof generatedReportTableColumnResponseSchema>
export type GeneratedReportTableRowResponse = z.infer<typeof generatedReportTableRowResponseSchema>
export type GeneratedReportTableResponse = z.infer<typeof generatedReportTableResponseSchema>
export type GeneratedReportSectionResponse = z.infer<typeof generatedReportSectionResponseSchema>
export type GeneratedReportResponse = z.infer<typeof generatedReportResponseSchema>
export type ReportListResponse = z.infer<typeof reportListResponseSchema>
export type ReportMitigationExtractedIocResponse = z.infer<typeof reportMitigationExtractedIocResponseSchema>
export type ReportMitigationClaimResponse = z.infer<typeof reportMitigationClaimResponseSchema>
export type ReportMitigationActionResponse = z.infer<typeof reportMitigationActionResponseSchema>
export type ReportMitigationPrimaryActionResponse = z.infer<typeof reportMitigationPrimaryActionResponseSchema>
export type ReportMitigationTimelineStepResponse = z.infer<typeof reportMitigationTimelineStepResponseSchema>
export type ReportMitigationScanRecommendationResponse = z.infer<typeof reportMitigationScanRecommendationResponseSchema>
export type ReportMitigationPlanResponse = z.infer<typeof reportMitigationPlanResponseSchema>
export type ReportMitigationResponse = z.infer<typeof reportMitigationResponseSchema>
export type ReportMitigationListItemResponse = z.infer<typeof reportMitigationListItemResponseSchema>
export type ReportMitigationListResponse = z.infer<typeof reportMitigationListResponseSchema>
export type PowerBiWorkspaceResponse = z.infer<typeof powerBiWorkspaceResponseSchema>
export type PowerBiVisualizationResponse = z.infer<typeof powerBiVisualizationResponseSchema>
export type PowerBiVisualizationCatalogResponse = z.infer<typeof powerBiVisualizationCatalogResponseSchema>
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>
export type DetectionHistoryProvenanceResponse = z.infer<typeof detectionHistoryProvenanceResponseSchema>
export type DetectionHistoryItemResponse = z.infer<typeof detectionHistoryItemResponseSchema>
export type DetectionHistoryResponse = z.infer<typeof detectionHistoryResponseSchema>
export type DetectionLinkedAlertCaseResponse = z.infer<typeof detectionLinkedAlertCaseResponseSchema>
export type DetectionDetailResponse = z.infer<typeof detectionDetailResponseSchema>
export type AiDecisionLinksResponse = z.infer<typeof aiDecisionLinksResponseSchema>
export type SubmitAiDecisionAcceptedResponse = z.infer<typeof submitAiDecisionAcceptedResponseSchema>
export type AiDecisionProvenanceResponse = z.infer<typeof aiDecisionProvenanceResponseSchema>
export type AiSafetyDiagnosticsResponse = z.infer<typeof aiSafetyDiagnosticsResponseSchema>
export type AiDecisionDecisionResponse = z.infer<typeof aiDecisionDecisionResponseSchema>
export type AiDecisionResultResponse = z.infer<typeof aiDecisionResultResponseSchema>
export type IocLatestAiDecisionResponse = z.infer<typeof iocLatestAiDecisionResponseSchema>
export type AiExplanationCitationResponse = z.infer<typeof aiExplanationCitationResponseSchema>
export type AiPhrasingDiagnosticsResponse = z.infer<typeof aiPhrasingDiagnosticsResponseSchema>
export type AiDecisionExplanationResponse = z.infer<typeof aiDecisionExplanationResponseSchema>
export type AiRecommendedActionResponse = z.infer<typeof aiRecommendedActionResponseSchema>
export type AiDecisionActionPlanResponse = z.infer<typeof aiDecisionActionPlanResponseSchema>
export type AiDecisionPendingResponse = z.infer<typeof aiDecisionPendingResponseSchema>
export type AiDecisionExplanationOrPendingResponse = z.infer<typeof aiDecisionExplanationOrPendingResponseSchema>
export type AiDecisionActionPlanOrPendingResponse = z.infer<typeof aiDecisionActionPlanOrPendingResponseSchema>
export type AiSimilarDetectionResponse = z.infer<typeof aiSimilarDetectionResponseSchema>
export type AiSimilarDetectionsResponse = z.infer<typeof aiSimilarDetectionsResponseSchema>
export type AiEvidenceSourceResponse = z.infer<typeof aiEvidenceSourceResponseSchema>
export type AiEvidenceSourcesResponse = z.infer<typeof aiEvidenceSourcesResponseSchema>
export type AiOverrideOrClosureResponse = z.infer<typeof aiOverrideOrClosureResponseSchema>
export type DiscoveryRunResponse = z.infer<typeof discoveryRunResponseSchema>
export type DiscoveredHostResponse = z.infer<typeof discoveredHostResponseSchema>
export type PromoteDiscoveredHostResponse = z.infer<typeof promoteDiscoveredHostResponseSchema>
export type CoveragePainAnalysisResponse = z.infer<typeof coveragePainAnalysisResponseSchema>
export type JobRunResponse = z.infer<typeof jobRunResponseSchema>

