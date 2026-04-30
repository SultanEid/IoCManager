import type {
  AlertListResponse,
  AlertEmailUpdateResponse,
  AlertOwnerDirectoryResponse,
  AlertOwnerResponse,
  AiDecisionActionPlanOrPendingResponse,
  AiDecisionExplanationOrPendingResponse,
  AiDecisionResultResponse,
  AiEvidenceSourcesResponse,
  AiOverrideOrClosureResponse,
  AiSimilarDetectionsResponse,
  V2AlertDetailResponse,
  AuditLogListResponse,
  ArchiveRecordResponse,
  CaseRuleWorkflowResponse,
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
  ReportResponse,
  ReportMitigationListResponse,
  ReportMitigationResponse,
  ScanJobResponse,
  ScanJobTargetExecutionResponse,
  ScanAnalystAgentStatusResponse,
  ScanAnalystChatResponse,
  ScanAnalystPlanProposalResponse,
  ScanAnalystRunSummaryResponse,
  ScanPlanResponse,
  RuleDistributionAttemptResponse,
  RuleDistributionJobResponse,
  RuleDistributionTargetResponse,
  ScannerResponse,
  DiscoveredHostResponse,
  DiscoveryRunResponse,
  PromoteDiscoveredHostResponse,
  PermissionResponse,
  RetentionPolicyResponse,
  RoleResponse,
  RolePermissionResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleDetail,
  RuleImportAttempt,
  RuleListResponse,
  RuleRevisionItem,
  SubnetResponse,
  SmtpNotificationStatusResponse,
  TargetGroupMemberResponse,
  TargetGroupResponse,
  TargetServerResponse,
  RuleProposalResponse,
  RuleSimulationResultResponse,
  SubmitAiDecisionAcceptedResponse,
  TokenResponse,
  UserResponse,
} from "@/shared/api/schemas"
import type {
  AdvanceRolloutStageInput,
  AiDecisionCursorQuery,
  AlertListQuery,
  ArchiveRuleInput,
  AuditLogListQuery,
  CaseDetailVM,
  CreateRetentionPolicyInput,
  CreateAlertOwnerDirectoryInput,
  CreateDistributionJobInput,
  CreateScanPlanInput,
  CoveragePainAnalysisScopeInput,
  CreateRuleRepositoryInput,
  CreateManagedServerInput,
  CreateScannerInput,
  CreateWorkbenchPermissionInput,
  CreateWorkbenchRoleInput,
  CreateWorkbenchUserInput,
  CreateRuleProposalInput,
  DetectionListQuery,
  Gateway,
  GenerateReportInput,
  GenerateReportMitigationInput,
  GenerateReportMitigationFromAlertInput,
  GenerateReportMitigationFromScanJobInput,
  GraphRelationshipsVM,
  IocListQuery,
  ManagedServerInventoryFilters,
  DistributionJobFilters,
  ScanJobFilters,
  OverviewCard,
  PromoteDiscoveredHostInput,
  QueueItem,
  QueueDiscoveryRunInput,
  ExecuteRetentionPolicyInput,
  RecordCanaryObservationInput,
  ReportListQuery,
  RestoreRuleInput,
  RuleRepositoryListQuery,
  RotateManagedServerConnectionSecretInput,
  ReportsIngestionVM,
  ReviewRuleProposalInput,
  SettingsAdminVM,
  SimulateRuleProposalInput,
  SubmitAiDecisionInput,
  SubmitAiDecisionOverrideOrClosureInput,
  TriggerRollbackInput,
  AssignWorkbenchRolePermissionInput,
  RetryDistributionJobInput,
  SendAlertEmailUpdateInput,
  SendScanAnalystChatTurnInput,
  UpdateScanAnalystPostureInput,
  ImportRuleFileInput,
  UpdateScannerCapabilitiesInput,
  UpdateRuleRepositoryInput,
  UpdateScanPlanInput,
  UpdateAlertOwnerInput,
  UpdateAlertOwnerDirectoryInput,
  UpdateManagedServerInput,
  UpsertManagedServerScannerAssignmentInput,
} from "@/shared/gateway/types"
import { issuePersonaToken, listMockPersonas } from "@/shared/mock/personas"
import {
  selectAllDeployments,
  selectCase,
  selectCaseDetail,
  selectCaseRuleWorkflow,
  selectCases,
  selectDecisions,
  selectDeployments,
  selectEvidence,
  selectFeedback,
  selectGraphRelationships,
  selectJobRuns,
  selectOverview,
  selectProblematicQueue,
  selectReportsIngestion,
  selectRules,
  selectSettingsAdmin,
} from "@/shared/mock/selectors"
import { getMockState, withMockState } from "@/shared/mock/store"
import {
  advanceRolloutStage,
  createRuleProposal,
  recordCanaryObservation,
  reviewRuleProposal,
  runModelRetraining,
  simulateRuleProposal,
  triggerRollback,
} from "@/shared/mock/workflow"
import { deepCopy } from "@/shared/mock/utils"

function copy<T>(value: T): T {
  return deepCopy(value)
}

function consume(...args: unknown[]) {
  void args.length
}

const mockAlertOwners: AlertOwnerDirectoryResponse[] = [
  {
    key: "it-security",
    displayName: "IT Security",
    email: "it-security@local.test",
    isEnabled: true,
    source: "database",
    createdAtUtc: "2026-04-01T00:00:00Z",
    updatedAtUtc: "2026-04-01T00:00:00Z",
    createdByUserId: "system",
    updatedByUserId: "system",
  },
  {
    key: "soc",
    displayName: "Security Operations Center",
    email: "soc@local.test",
    isEnabled: true,
    source: "database",
    createdAtUtc: "2026-04-01T00:00:00Z",
    updatedAtUtc: "2026-04-01T00:00:00Z",
    createdByUserId: "system",
    updatedByUserId: "system",
  },
  {
    key: "forensics",
    displayName: "Digital Forensics",
    email: "forensics@local.test",
    isEnabled: true,
    source: "database",
    createdAtUtc: "2026-04-01T00:00:00Z",
    updatedAtUtc: "2026-04-01T00:00:00Z",
    createdByUserId: "system",
    updatedByUserId: "system",
  },
]

const mockAlertEmailUpdates = new Map<string, AlertEmailUpdateResponse[]>()
const mockAlertOwnerAssignments = new Map<string, string>()

function resolveMockOwner(ownerUserId: string) {
  return mockAlertOwners.find((owner) => owner.key === ownerUserId && owner.isEnabled)
}

function enrichMockAlertOwner(ownerUserId: string) {
  const owner = resolveMockOwner(ownerUserId)
  return {
    ownerDisplayName: owner?.displayName ?? "",
    ownerEmail: owner?.email ?? null,
  }
}

function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const boundedPage = Number.isFinite(page) && page > 0 ? page : 1
  const boundedSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20
  const start = (boundedPage - 1) * boundedSize
  return {
    page: boundedPage,
    pageSize: boundedSize,
    items: items.slice(start, start + boundedSize),
  }
}

function personaForUsername(username: string) {
  const normalized = username.trim().toLowerCase()
  return listMockPersonas().find((item) => item.username.toLowerCase() === normalized || item.id.toLowerCase() === normalized)
}

function nextUserId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  const suffix = Math.floor(Math.random() * 1_000_000_000_000)
    .toString()
    .padStart(12, "0")
  return `00000000-0000-4000-8000-${suffix}`
}

const MOCK_ROLES: RoleResponse[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Analyst" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Lead" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Admin" },
]

const MOCK_PERMISSIONS: PermissionResponse[] = [
  {
    id: "44444444-4444-4444-8444-444444444441",
    key: "audit.read",
    description: "Read audit trail entries.",
    createdAtUtc: "2026-04-01T00:00:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444442",
    key: "retention.manage",
    description: "Manage retention policies.",
    createdAtUtc: "2026-04-01T00:00:00Z",
  },
]

const MOCK_RULE_BY_CAPABILITY = {
  Yara: { family: "yara", name: "Suspicious Archive Loader" },
  Sigma: { family: "sigma", name: "Encoded PowerShell Child Process" },
  Snort: { family: "snort", name: "Suspicious TCP Egress Pattern" },
  Suricata: { family: "suricata", name: "Suspicious TLS Egress Pattern" },
} as const

function formatScannerCapabilityForNarrative(capability: ScanAnalystPlanProposalResponse["scannerCapability"]) {
  return capability === "Yara" ? "YARA" : capability
}

function inferScannerCapability(message: string): ScanAnalystPlanProposalResponse["scannerCapability"] {
  const normalized = message.toLowerCase()
  if (normalized.includes("yara")) {
    return "Yara"
  }
  if (normalized.includes("snort")) {
    return "Snort"
  }
  if (normalized.includes("suricata")) {
    return "Suricata"
  }
  return "Sigma"
}

function buildMockScanAnalystPlan(capability: ScanAnalystPlanProposalResponse["scannerCapability"]): ScanAnalystPlanProposalResponse {
  const rule = MOCK_RULE_BY_CAPABILITY[capability]
  const targetId = nextUserId()
  const ruleRevisionId = nextUserId()

  return {
    name: `zira-${capability.toLowerCase()}-follow-up`,
    description: `Focused ${capability} follow-up for the current demo context.`,
    scannerCapability: capability,
    ruleSelectionMode: "RuleSet",
    ruleScopeType: null,
    ruleScopeValue: null,
    cadenceType: "Manual",
    intervalMinutes: null,
    runAtHourUtc: null,
    runAtMinuteUtc: null,
    weeklyDayOfWeek: null,
    operatorNotes: "Demo recommendation. Human approval remains required before operational use.",
    status: "Draft",
    targetServerIds: [targetId],
    ruleRevisionIds: [ruleRevisionId],
    targets: [
      {
        targetServerId: targetId,
        hostname: "demo-host-01",
        ipAddress: "10.0.10.21",
        operatingSystem: "Windows",
        environment: "Lab",
        status: "Online",
        connectivityStatus: "Reachable",
        scannerCapabilities: [capability],
        reason: "Selected because it has matching scanner coverage and recent demo context.",
      },
    ],
    rules: [
      {
        ruleRevisionId,
        ruleArtifactId: nextUserId(),
        ruleName: rule.name,
        ruleFamily: rule.family,
        revisionNumber: 1,
        versionLabel: "v1",
        lifecycleStatus: "Approved",
        scopeType: "global",
        scopeValue: null,
        reason: "Rule family matches the requested scan capability.",
      },
    ],
  }
}

function buildCreatedScanPlan(plan: ScanAnalystPlanProposalResponse): ScanPlanResponse {
  const now = new Date().toISOString()
  return {
    id: nextUserId(),
    name: plan.name,
    description: plan.description,
    scannerCapability: plan.scannerCapability,
    ruleSelectionMode: plan.ruleSelectionMode,
    ruleScopeType: plan.ruleScopeType,
    ruleScopeValue: plan.ruleScopeValue,
    cadenceType: plan.cadenceType,
    intervalMinutes: plan.intervalMinutes,
    runAtHourUtc: plan.runAtHourUtc,
    runAtMinuteUtc: plan.runAtMinuteUtc,
    weeklyDayOfWeek: plan.weeklyDayOfWeek,
    operatorNotes: plan.operatorNotes,
    status: "Draft",
    nextRunAtUtc: null,
    lastQueuedAtUtc: null,
    lastCompletedAtUtc: null,
    lastResultStatus: null,
    lastResultSummary: null,
    targetServerIds: plan.targetServerIds,
    ruleRevisionIds: plan.ruleRevisionIds,
    targetServers: plan.targets.map((target) => ({
      targetServerId: target.targetServerId,
      hostname: target.hostname,
      ipAddress: target.ipAddress,
    })),
    rules: plan.rules.map((rule) => ({
      ruleRevisionId: rule.ruleRevisionId,
      ruleArtifactId: rule.ruleArtifactId,
      ruleName: rule.ruleName,
      ruleFamily: rule.ruleFamily,
      revisionNumber: rule.revisionNumber,
      versionLabel: rule.versionLabel,
    })),
    createdAtUtc: now,
    updatedAtUtc: now,
  }
}

function buildQueuedScanJob(scanPlanId: string, actorUserId: string): ScanJobResponse {
  const now = new Date().toISOString()
  return {
    id: nextUserId(),
    scanPlanId,
    triggerSource: "ScanAnalystDemo",
    status: "Completed",
    queuedAtUtc: now,
    startedAtUtc: now,
    completedAtUtc: now,
    triggeredByUserId: actorUserId,
    summary: "Demo scan job completed.",
    cancellationRequested: false,
    cancellationRequestedAtUtc: null,
    cancellationReason: null,
    totalTargets: 1,
    completedTargets: 1,
    failedTargets: 0,
    cancelledTargets: 0,
    partiallyCompletedTargets: 0,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
}

function buildMockRunSummary(scanJobId: string, plan: ScanAnalystPlanProposalResponse): ScanAnalystRunSummaryResponse {
  const observedAtUtc = new Date().toISOString()
  const target = plan.targets[0]
  const rule = plan.rules[0]
  return {
    scanJobId,
    isSimulated: true,
    narrativeSummary: `The simulated ${formatScannerCapabilityForNarrative(plan.scannerCapability)} run completed with one demo detection.`,
    jobStatus: "Completed",
    totalTargets: plan.targets.length,
    completedTargets: plan.targets.length,
    failedTargets: 0,
    detectionCount: 1,
    generatedAtUtc: observedAtUtc,
    targetExecutions: [
      {
        targetHostname: target?.hostname ?? "demo-host",
        targetIpAddress: target?.ipAddress ?? "10.0.10.21",
        status: "Completed",
        summary: "Demo target scan completed.",
        errorMessage: null,
      },
    ],
    detections: [
      {
        detectionId: nextUserId(),
        ruleName: rule?.ruleName ?? "Demo Rule",
        serverHostname: target?.hostname ?? "demo-host",
        disposition: "Suspicious",
        observedAtUtc,
      },
    ],
  }
}

function buildMockAgentMessage(
  action: SendScanAnalystChatTurnInput["action"],
  capability: ScanAnalystPlanProposalResponse["scannerCapability"],
  runSummary: ScanAnalystRunSummaryResponse | null,
) {
  if (action === "RecommendOnly") {
    return `Prepared a ${capability} recommendation for review.`
  }

  if (action === "CreatePlan") {
    return `Created a draft ${capability} scan plan in demo mode.`
  }

  return `Created and ran a simulated ${capability} scan plan. ${runSummary?.narrativeSummary ?? ""}`.trim()
}

export class MockGateway implements Gateway {
  private users: UserResponse[] = listMockPersonas().map((persona, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    userName: persona.username,
    email: `${persona.username}@demo.local`,
    displayName: persona.displayName,
    role: persona.roles[0] ?? "Analyst",
  }))
  private roles: RoleResponse[] = copy(MOCK_ROLES)
  private permissions: PermissionResponse[] = copy(MOCK_PERMISSIONS)
  private rolePermissions: RolePermissionResponse[] = [
    {
      roleId: MOCK_ROLES[2].id,
      permissionId: MOCK_PERMISSIONS[0].id,
      grantedByUserId: "system",
      grantedAtUtc: "2026-04-01T00:00:00Z",
    },
    {
      roleId: MOCK_ROLES[2].id,
      permissionId: MOCK_PERMISSIONS[1].id,
      grantedByUserId: "system",
      grantedAtUtc: "2026-04-01T00:00:00Z",
    },
  ]
  private retentionPolicies: RetentionPolicyResponse[] = [
    {
      id: "55555555-5555-4555-8555-555555555551",
      dataType: "ScanResult",
      retainDays: 30,
      archiveAfterDays: 14,
      isEnabled: true,
      createdAtUtc: "2026-04-01T00:00:00Z",
      updatedAtUtc: "2026-04-01T00:00:00Z",
    },
  ]
  private archiveRecords: ArchiveRecordResponse[] = []
  private scanners: ScannerResponse[] = [
    {
      id: "66666666-6666-4666-8666-666666666661",
      name: "demo-yara-1",
      engineType: "Yara",
      version: "4.5.0",
      healthStatus: "Healthy",
      lastHeartbeatUtc: "2026-04-20T08:00:00Z",
      createdAtUtc: "2026-04-01T00:00:00Z",
      updatedAtUtc: "2026-04-20T08:00:00Z",
      capabilities: ["Yara"],
    },
    {
      id: "66666666-6666-4666-8666-666666666662",
      name: "demo-sigma-1",
      engineType: "Sigma",
      version: "1.0.0",
      healthStatus: "Degraded",
      lastHeartbeatUtc: "2026-04-20T07:30:00Z",
      createdAtUtc: "2026-04-01T00:00:00Z",
      updatedAtUtc: "2026-04-20T07:30:00Z",
      capabilities: ["Sigma"],
    },
  ]
  private generatedReports: ReportListResponse["items"] = []
  private scanAnalystSessions = new Map<string, ScanAnalystChatResponse>()
  private scanAnalystRunSummaries = new Map<string, ScanAnalystRunSummaryResponse>()
  private scanAnalystPosture: ScanAnalystAgentStatusResponse["parameters"] = {
    enabled: true,
    allowedSubnets: ["demo-lab"],
    allowedEnvironments: ["Lab"],
    maxTargetsPerRun: 5,
    preferredScannerFamily: "Auto",
    autoRun: true,
    quietHours: "none",
    watchForNewHosts: true,
    watchForFailedRecentJobs: true,
    watchForRecentAlerts: true,
    requireMatchingRuleFamily: true,
  }

  async login(username: string, _password: string): Promise<TokenResponse> {
    consume(_password)
    const persona = personaForUsername(username)
    if (!persona) {
      throw new Error("Unknown design/demo profile. Use one of the listed demo accounts.")
    }
    return issuePersonaToken(persona)
  }

  async listAlertRegistry(query: AlertListQuery = {}, _signal?: AbortSignal): Promise<AlertListResponse> {
    consume(_signal)
    const filtered = selectCases(getMockState()).filter((item) => {
      const matchesQ =
        !query.q ||
        [item.title, item.summary, item.ownerUserId, item.approvalTierRequired]
          .some((value) => value.toLowerCase().includes(query.q!.toLowerCase()))
      const matchesStatus = !query.status || item.status.toLowerCase() === query.status.toLowerCase()
      const matchesSeverity = !query.severity || item.priority.toLowerCase() === query.severity.toLowerCase()
      const matchesOwner = !query.ownerUserId || item.ownerUserId.toLowerCase().includes(query.ownerUserId.toLowerCase())
      const updatedAt = Date.parse(item.updatedAtUtc)
      const matchesFrom = !query.fromUtc || updatedAt >= Date.parse(query.fromUtc)
      const matchesTo = !query.toUtc || updatedAt <= Date.parse(query.toUtc)
      return matchesQ && matchesStatus && matchesSeverity && matchesOwner && matchesFrom && matchesTo
    })

    const page = paginate(filtered, query.page, query.pageSize)
    return {
      items: page.items.map((item) => {
        const ownerUserId = mockAlertOwnerAssignments.get(item.id) ?? item.ownerUserId
        return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        severity: item.priority,
        status: item.status,
        ownerUserId,
        ...enrichMockAlertOwner(ownerUserId),
        approvalTierRequired: item.approvalTierRequired,
        scannerFamily: "sigma",
        targetId: null,
        targetDisplay: "Demo target",
        ruleName: item.title,
        linkedIocCount: 0,
        progress: {
          totalIocs: 0,
          openCount: 0,
          inReviewCount: 0,
          completedCount: 0,
          percentComplete: 0,
        },
        firstDetectedAtUtc: item.createdAtUtc,
        lastDetectedAtUtc: item.updatedAtUtc,
        createdAtUtc: item.createdAtUtc,
        updatedAtUtc: item.updatedAtUtc,
        }
      }),
      totalCount: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
    }
  }

  async listAlertOwners(_signal?: AbortSignal): Promise<AlertOwnerResponse[]> {
    consume(_signal)
    return copy(
      mockAlertOwners
        .filter((owner) => owner.isEnabled)
        .map((owner) => ({
          key: owner.key,
          displayName: owner.displayName,
          email: owner.email,
        })),
    )
  }

  async listSettingsAlertOwners(_signal?: AbortSignal): Promise<AlertOwnerDirectoryResponse[]> {
    consume(_signal)
    return copy(mockAlertOwners)
  }

  async getSmtpNotificationStatus(_signal?: AbortSignal): Promise<SmtpNotificationStatusResponse> {
    consume(_signal)
    return {
      enabled: false,
      configured: false,
      willSendEmail: false,
      host: "",
      port: 25,
      useSsl: false,
      userNameConfigured: false,
      fromEmail: "",
      fromDisplayName: "IOC Manager",
      missingRequirements: [
        "Set Notifications:Smtp:Enabled to true.",
        "Set Notifications:Smtp:Host to your SMTP server.",
        "Set Notifications:Smtp:FromEmail to the sender mailbox.",
      ],
    }
  }

  async createSettingsAlertOwner(input: CreateAlertOwnerDirectoryInput): Promise<AlertOwnerDirectoryResponse> {
    const key = input.key.trim().toLowerCase()
    if (mockAlertOwners.some((owner) => owner.key.toLowerCase() === key)) {
      throw new Error("Alert owner key already exists.")
    }

    const now = new Date().toISOString()
    const created: AlertOwnerDirectoryResponse = {
      key,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      isEnabled: input.isEnabled,
      source: "database",
      createdAtUtc: now,
      updatedAtUtc: now,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    }
    mockAlertOwners.push(created)
    return copy(created)
  }

  async updateSettingsAlertOwner(key: string, input: UpdateAlertOwnerDirectoryInput): Promise<AlertOwnerDirectoryResponse> {
    const normalizedKey = key.trim().toLowerCase()
    const existing = mockAlertOwners.find((owner) => owner.key.toLowerCase() === normalizedKey)
    if (!existing) {
      throw new Error("Alert owner was not found.")
    }

    const updated: AlertOwnerDirectoryResponse = {
      ...existing,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      isEnabled: input.isEnabled,
      source: "database",
      updatedAtUtc: new Date().toISOString(),
      updatedByUserId: input.actorUserId,
    }
    const index = mockAlertOwners.indexOf(existing)
    mockAlertOwners[index] = updated
    return copy(updated)
  }

  async listAlerts(_signal?: AbortSignal) {
    consume(_signal)
    return copy(
      selectCases(getMockState()).map((item) => ({
        ...item,
        ownerUserId: mockAlertOwnerAssignments.get(item.id) ?? item.ownerUserId,
      })),
    )
  }

  async getAlert(alertId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectCase(getMockState(), alertId))
  }

  async getAlertDetail(alertId: string, _signal?: AbortSignal): Promise<V2AlertDetailResponse> {
    consume(_signal)
    const item = selectCase(getMockState(), alertId)
    const ownerUserId = mockAlertOwnerAssignments.get(alertId) ?? item.ownerUserId
    return {
      id: item.id,
      title: item.title,
      summary: item.summary,
      severity: item.priority,
      status: item.status,
      ownerUserId,
      ...enrichMockAlertOwner(ownerUserId),
      approvalTierRequired: item.approvalTierRequired,
      scannerFamily: "sigma",
      targetId: null,
      targetDisplay: "Demo target",
      ruleName: item.title,
      linkedIocCount: 0,
      progress: {
        totalIocs: 0,
        openCount: 0,
        inReviewCount: 0,
        completedCount: 0,
        percentComplete: 0,
      },
      firstDetectedAtUtc: item.createdAtUtc,
      lastDetectedAtUtc: item.updatedAtUtc,
      createdAtUtc: item.createdAtUtc,
      updatedAtUtc: item.updatedAtUtc,
      target: null,
      linkedIocs: [],
      linkedScanResults: [],
    }
  }

  async updateAlertStatus(alertId: string, status: string, _actorUserId: string): Promise<V2AlertDetailResponse> {
    consume(_actorUserId)
    return this.getAlertDetail(alertId).then((detail) => ({ ...detail, status }))
  }

  async updateAlertIocStatus(alertId: string, iocId: string, status: string, _actorUserId: string): Promise<V2AlertDetailResponse> {
    consume(iocId, status, _actorUserId)
    return this.getAlertDetail(alertId)
  }

  async updateAlertOwner(alertId: string, input: UpdateAlertOwnerInput): Promise<V2AlertDetailResponse> {
    consume(input.actorUserId)
    const owner = resolveMockOwner(input.ownerUserId)
    mockAlertOwnerAssignments.set(alertId, owner?.key ?? "unassigned")
    return this.getAlertDetail(alertId).then((detail) => ({
      ...detail,
      ownerUserId: owner?.key ?? "unassigned",
      ownerDisplayName: owner?.displayName ?? "",
      ownerEmail: owner?.email ?? null,
    }))
  }

  async listAlertEmailUpdates(alertId: string, _signal?: AbortSignal): Promise<AlertEmailUpdateResponse[]> {
    consume(_signal)
    return copy(mockAlertEmailUpdates.get(alertId) ?? [])
  }

  async sendAlertEmailUpdate(alertId: string, input: SendAlertEmailUpdateInput): Promise<AlertEmailUpdateResponse> {
    const detail = await this.getAlertDetail(alertId)
    if (!detail.ownerEmail) {
      throw new Error("Alert owner email is required before sending an email update.")
    }

    const update: AlertEmailUpdateResponse = {
      id: crypto.randomUUID(),
      alertId,
      subject: input.subject,
      body: input.body,
      toEmail: detail.ownerEmail,
      ccEmails: input.ccEmails ?? [],
      deliveryStatus: "NotConfigured",
      failureDetail: "SMTP is not configured in mock mode.",
      sentAtUtc: null,
      createdByUserId: input.actorUserId,
      createdAtUtc: new Date().toISOString(),
    }
    const existing = mockAlertEmailUpdates.get(alertId) ?? []
    mockAlertEmailUpdates.set(alertId, [update, ...existing])
    return copy(update)
  }

  async listCases(_signal?: AbortSignal) {
    return this.listAlerts(_signal)
  }

  async getCase(caseId: string, _signal?: AbortSignal) {
    return this.getAlert(caseId, _signal)
  }

  async listEvidence(caseId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectEvidence(getMockState(), caseId))
  }

  async listDecisions(caseId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectDecisions(getMockState(), caseId))
  }

  async listRules(caseId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectRules(getMockState(), caseId))
  }

  async listRuleRepository(_query?: RuleRepositoryListQuery, _signal?: AbortSignal): Promise<RuleListResponse> {
    consume(_query, _signal)
    return {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
    }
  }

  async getRuleDetail(_ruleId: string, _signal?: AbortSignal): Promise<RuleDetail> {
    consume(_ruleId, _signal)
    throw new Error("Rule repository detail is not available in mock gateway.")
  }

  async createRule(_input: CreateRuleRepositoryInput): Promise<RuleDetail> {
    consume(_input)
    throw new Error("Rule repository create is not available in mock gateway.")
  }

  async importRuleFile(_input: ImportRuleFileInput): Promise<RuleImportAttempt> {
    consume(_input)
    throw new Error("Rule repository import is not available in mock gateway.")
  }

  async updateRule(_ruleId: string, _input: UpdateRuleRepositoryInput): Promise<RuleDetail> {
    consume(_ruleId, _input)
    throw new Error("Rule repository update is not available in mock gateway.")
  }

  async listRuleRevisions(_ruleId: string, _signal?: AbortSignal): Promise<RuleRevisionItem[]> {
    consume(_ruleId, _signal)
    return []
  }

  async listRuleImportAttempts(_ruleId: string, _signal?: AbortSignal): Promise<RuleImportAttempt[]> {
    consume(_ruleId, _signal)
    return []
  }

  async archiveRule(_ruleId: string, _input: ArchiveRuleInput): Promise<void> {
    consume(_ruleId, _input)
    throw new Error("Rule repository archive is not available in mock gateway.")
  }

  async restoreRule(_ruleId: string, _input: RestoreRuleInput): Promise<RuleDetail> {
    consume(_ruleId, _input)
    throw new Error("Rule repository restore is not available in mock gateway.")
  }

  async listDeployments(caseId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectDeployments(getMockState(), caseId))
  }

  async listAllDeployments(_signal?: AbortSignal) {
    consume(_signal)
    return copy(selectAllDeployments(getMockState()))
  }

  async listFeedback(caseId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectFeedback(getMockState(), caseId))
  }

  async listReports(query: ReportListQuery = {}, _signal?: AbortSignal): Promise<ReportListResponse> {
    consume(_signal)
    const normalizedQ = query.q?.trim().toLowerCase()
    const filtered = this.generatedReports.filter((item) => {
      const matchesQ =
        !normalizedQ
        || item.title.toLowerCase().includes(normalizedQ)
        || item.summaryJson.toLowerCase().includes(normalizedQ)
      const matchesType = !query.reportType || item.reportType === query.reportType
      return matchesQ && matchesType
    })

    const page = paginate(filtered, query.page, query.pageSize)
    return {
      items: page.items,
      totalCount: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
    }
  }

  async getReport(reportId: string, _signal?: AbortSignal): Promise<ReportResponse> {
    consume(_signal)
    const report = this.generatedReports.find((item) => item.id === reportId)
    if (!report) {
      throw new Error("Report not found.")
    }

    return copy(report)
  }

  async generateReport(input: GenerateReportInput): Promise<GeneratedReportResponse> {
    const generatedAtUtc = new Date().toISOString()
    const title = input.title?.trim() || `${input.reportType} preview`
    const preview: GeneratedReportResponse = {
      requestedReportType: input.reportType,
      title,
      status: input.persist ? "persisted" : "preview_ready",
      generatedAtUtc,
      sections: [
        {
          title: "Design/Demo Preview",
          summary: "Mock mode returns a lightweight preview so the report workflow can still be exercised.",
          metrics: [
            { label: "Report type", value: input.reportType, detail: "Current template selection." },
            { label: "Target filter", value: input.targetServerId ?? "All targets", detail: "Preview scope only." },
            { label: "Scanner family", value: input.scannerFamily ?? "All scanners", detail: "Preview scope only." },
          ],
          highlights: ["Switch to ASP.NET mode for persisted summaries backed by stored data."],
          narrative: "Demo mode shows the report shell only. ASP.NET mode returns the full intelligence report with tables and recommendations.",
          tables: [],
        },
      ],
      alertIds: [],
      persistedReport: null,
    }

    if (input.persist) {
      const persistedReport = {
        id: crypto.randomUUID(),
        title,
        reportType: input.reportType,
        summaryJson: JSON.stringify({
          requestedReportType: input.reportType,
          generatedAtUtc,
          filters: {
            fromUtc: input.fromUtc ?? null,
            toUtc: input.toUtc ?? null,
            targetServerId: input.targetServerId ?? null,
            scannerFamily: input.scannerFamily ?? null,
            severity: input.severity ?? null,
            status: input.status ?? null,
            iocType: input.iocType ?? null,
            source: input.source ?? null,
          },
          sections: preview.sections,
        }),
        generatedAtUtc,
        createdAtUtc: generatedAtUtc,
        updatedAtUtc: generatedAtUtc,
        alertIds: [],
      }

      this.generatedReports = [persistedReport, ...this.generatedReports]
      preview.persistedReport = persistedReport
    }

    return copy(preview)
  }

  async generateReportMitigation(input: GenerateReportMitigationInput): Promise<ReportMitigationResponse> {
    const generatedAt = new Date().toISOString()
    const title = `Aegis mitigation: ${input.sourceName || "demo report"}`
    const mitigationPlan = {
      executiveSummary: "Aegis reviewed the supplied report content and produced a read-only mitigation plan.",
      threatSummary: "Demo mode does not call the LLM, but it preserves the same output shape used by the live Aegis endpoint.",
      severity: "medium",
      confidence: "medium",
      affectedAssetHypotheses: ["Review affected hosts and linked alerts before taking action."],
      primaryActions: [
        {
          rank: 1,
          title: "Triage linked alerts",
          targetHint: "Affected hosts linked to the report",
          urgency: "now",
          reasoning: "Confirm whether the reported indicators match active detections before broader containment work starts.",
        },
        {
          rank: 2,
          title: "Run targeted validation scan",
          targetHint: "Targets linked to the report",
          urgency: "hours",
          reasoning: "Use focused follow-up scanning to verify the scope and persistence of the reported activity.",
        },
        {
          rank: 3,
          title: "Harden the impacted environment",
          targetHint: "Impacted network segment or host group",
          urgency: "same_day",
          reasoning: "Reduce recurrence risk after the immediate evidence has been reviewed and validated.",
        },
      ],
      timeline: [
        {
          stepId: "containment-1",
          title: "Review linked alerts and evidence",
          linkedPrimaryActionRank: 1,
          targetHint: "Affected hosts linked to the report",
          lane: "containment",
          startsIn: 0,
          duration: 2,
          unit: "hours",
          rationale: "This should happen immediately so the team can confirm the case before expanding response scope.",
        },
        {
          stepId: "validation-1",
          title: "Validate with focused follow-up scan",
          linkedPrimaryActionRank: 2,
          targetHint: "Targets linked to the report",
          lane: "validation",
          startsIn: 2,
          duration: 4,
          unit: "hours",
          rationale: "Shortly after triage, targeted scanning helps confirm the scope and current exposure level.",
        },
        {
          stepId: "recovery-1",
          title: "Apply hardening and verify closure",
          linkedPrimaryActionRank: 3,
          targetHint: "Impacted network segment or host group",
          lane: "recovery",
          startsIn: 1,
          duration: 1,
          unit: "days",
          rationale: "Follow-up hardening is best scheduled after the first response pass and validation steps complete.",
        },
      ],
      immediateActions: [
        {
          title: "Triage linked alerts",
          rationale: "Confirm whether the report indicators match active detections.",
          priority: "medium",
          ownerHint: "SOC analyst",
          validation: "Alert state and linked evidence are reviewed.",
          automationReadiness: "manual_review",
        },
      ],
      detectionActions: [],
      hardeningActions: [],
      validationSteps: ["Validate the indicators against current scan results."],
      scanRecommendations: [
        {
          scannerFamily: "Yara",
          targetHint: "Targets linked to the report",
          ruleHint: "Relevant malware or suspicious artifact rules",
          rationale: "Aegis can suggest scanning, but Zira remains responsible for scan-plan decisions.",
          priority: "medium",
        },
      ],
      assumptions: ["Demo mode response."],
      gaps: ["Switch to ASP.NET mode with OpenAI configured for live mitigation planning."],
      requiresHumanReview: true,
    }
    const persistedMitigationReport = {
      id: crypto.randomUUID(),
      title,
      reportType: "Operational",
      summaryJson: JSON.stringify({
        aegisMitigationPlanVersion: 1,
        sourceReportId: input.existingReportId ?? null,
        result: { mitigationPlan },
      }),
      generatedAtUtc: generatedAt,
      createdAtUtc: generatedAt,
      updatedAtUtc: generatedAt,
      alertIds: [],
    }
    this.generatedReports = [persistedMitigationReport, ...this.generatedReports]

    return copy({
      reportId: input.documentId ?? persistedMitigationReport.id,
      sourceType: input.sourceType,
      plannerModel: "demo",
      extractedIocs: [],
      claims: [],
      campaignHints: [],
      malwareFamilyHints: [],
      mitigationPlan,
      generatedAt,
      sourceReportId: input.existingReportId ?? null,
      persistedMitigationReport,
    })
  }

  async generateReportMitigationFromAlert(_alertId: string, input: GenerateReportMitigationFromAlertInput): Promise<ReportMitigationResponse> {
    return this.generateReportMitigation({
      sourceName: "Aegis alert review",
      sourceType: "bulletin",
      includeWorkspaceContext: input.includeWorkspaceContext,
      actorUserId: input.actorUserId,
      regenerate: input.regenerate,
    })
  }

  async generateReportMitigationFromScanJob(_scanJobId: string, input: GenerateReportMitigationFromScanJobInput): Promise<ReportMitigationResponse> {
    return this.generateReportMitigation({
      sourceName: "Aegis scan review",
      sourceType: "bulletin",
      includeWorkspaceContext: input.includeWorkspaceContext,
      actorUserId: input.actorUserId,
      regenerate: input.regenerate,
    })
  }

  async listReportMitigationPlans(_signal?: AbortSignal): Promise<ReportMitigationListResponse> {
    consume(_signal)
    const items = this.generatedReports
      .filter((item) => item.summaryJson.includes("aegisMitigationPlanVersion"))
      .map((item) => {
        let severity = "unknown"
        let confidence = "unknown"
        let executiveSummary = item.title
        let sourceReportId: string | null = null
        try {
          const parsed = JSON.parse(item.summaryJson) as {
            sourceReportId?: string | null
            result?: { mitigationPlan?: { severity?: string; confidence?: string; executiveSummary?: string } }
          }
          severity = parsed.result?.mitigationPlan?.severity ?? severity
          confidence = parsed.result?.mitigationPlan?.confidence ?? confidence
          executiveSummary = parsed.result?.mitigationPlan?.executiveSummary ?? executiveSummary
          sourceReportId = parsed.sourceReportId ?? null
        } catch {
          // Keep the fallback fields above.
        }

        return {
          id: item.id,
          title: item.title,
          sourceReportId,
          sourceScanJobIds: [],
          severity,
          confidence,
          executiveSummary,
          generatedAtUtc: item.generatedAtUtc,
          alertIds: item.alertIds,
        }
      })

    return { items, totalCount: items.length }
  }

  async deleteReport(reportId: string): Promise<void> {
    this.generatedReports = this.generatedReports.filter((item) => item.id !== reportId)
  }

  async getPowerBiVisualizationCatalog(_signal?: AbortSignal): Promise<PowerBiVisualizationCatalogResponse> {
    consume(_signal)
    return {
      status: "development_placeholder",
      defaultVisualizationKey: "security-overview",
      message: "Design/demo mode exposes placeholder Power BI metadata only. Configure the ASP.NET backend for live embeds.",
      workspaces: [
        {
          key: "security-ops",
          displayName: "Security Operations",
          description: "Placeholder workspace for development shells.",
          workspaceId: "",
        },
      ],
      visualizations: [
        {
          key: "security-overview",
          title: "Security Overview",
          description: "Executive posture, alert pressure, and detection volume.",
          workspaceKey: "security-ops",
          workspaceName: "Security Operations",
          workspaceId: "",
          reportId: "",
          embedUrl: "",
          status: "placeholder",
          requiresUserSignIn: true,
          isConfigured: false,
          isDefault: true,
          embedHeightPx: 760,
          tags: ["Executive", "Threat", "Operations"],
          embedToken: null,
          embedTokenExpiresAtUtc: null,
          tokenType: "Iframe",
        },
      ],
    }
  }

  async listAuditLogs(query: AuditLogListQuery = {}, _signal?: AbortSignal): Promise<AuditLogListResponse> {
    consume(query, _signal)
    return {
      items: [],
      totalCount: 0,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  async listJobRuns(_signal?: AbortSignal) {
    consume(_signal)
    return copy(selectJobRuns(getMockState()))
  }

  async listUsers(_signal?: AbortSignal): Promise<UserResponse[]> {
    consume(_signal)
    return copy(this.users)
  }

  async listRoles(_signal?: AbortSignal): Promise<RoleResponse[]> {
    consume(_signal)
    return copy(this.roles)
  }

  async listPermissions(_signal?: AbortSignal): Promise<PermissionResponse[]> {
    consume(_signal)
    return copy(this.permissions)
  }

  async listRolePermissions(roleId?: string, _signal?: AbortSignal): Promise<RolePermissionResponse[]> {
    consume(_signal)
    const items = roleId ? this.rolePermissions.filter((item) => item.roleId === roleId) : this.rolePermissions
    return copy(items)
  }

  async createUser(input: CreateWorkbenchUserInput): Promise<UserResponse> {
    const created: UserResponse = {
      id: nextUserId(),
      userName: input.userName.trim(),
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.roles[0] ?? "Analyst",
    }

    this.users = [created, ...this.users]
    return copy(created)
  }

  async createRole(input: CreateWorkbenchRoleInput): Promise<RoleResponse> {
    const created: RoleResponse = {
      id: nextUserId(),
      name: input.name.trim(),
    }

    this.roles = [created, ...this.roles]
    return copy(created)
  }

  async createPermission(input: CreateWorkbenchPermissionInput): Promise<PermissionResponse> {
    const created: PermissionResponse = {
      id: nextUserId(),
      key: input.key.trim(),
      description: input.description.trim(),
      createdAtUtc: new Date().toISOString(),
    }

    this.permissions = [created, ...this.permissions]
    return copy(created)
  }

  async assignRolePermission(input: AssignWorkbenchRolePermissionInput): Promise<RolePermissionResponse> {
    const created: RolePermissionResponse = {
      roleId: input.roleId,
      permissionId: input.permissionId,
      grantedByUserId: input.actorUserId,
      grantedAtUtc: new Date().toISOString(),
    }

    this.rolePermissions = [
      ...this.rolePermissions.filter(
        (item) => !(item.roleId === created.roleId && item.permissionId === created.permissionId),
      ),
      created,
    ]
    return copy(created)
  }

  async listRetentionPolicies(_signal?: AbortSignal): Promise<RetentionPolicyResponse[]> {
    consume(_signal)
    return copy(this.retentionPolicies)
  }

  async createRetentionPolicy(input: CreateRetentionPolicyInput): Promise<RetentionPolicyResponse> {
    const nowUtc = new Date().toISOString()
    const created: RetentionPolicyResponse = {
      id: nextUserId(),
      dataType: input.dataType,
      retainDays: input.retainDays,
      archiveAfterDays: input.archiveAfterDays,
      isEnabled: true,
      createdAtUtc: nowUtc,
      updatedAtUtc: nowUtc,
    }

    this.retentionPolicies = [created, ...this.retentionPolicies]
    return copy(created)
  }

  async listArchiveRecords(retentionPolicyId?: string, _signal?: AbortSignal): Promise<ArchiveRecordResponse[]> {
    consume(_signal)
    const items = retentionPolicyId
      ? this.archiveRecords.filter((item) => item.retentionPolicyId === retentionPolicyId)
      : this.archiveRecords
    return copy(items)
  }

  async executeRetentionPolicy(input: ExecuteRetentionPolicyInput): Promise<ArchiveRecordResponse[]> {
    const created: ArchiveRecordResponse = {
      id: nextUserId(),
      retentionPolicyId: input.retentionPolicyId,
      entityType: "scan_result",
      entityId: nextUserId(),
      archiveUri: `${input.archiveUriPrefix.replace(/\/$/, "")}/scan_result/demo.json`,
      archivedAtUtc: new Date().toISOString(),
      createdAtUtc: new Date().toISOString(),
    }

    this.archiveRecords = [created, ...this.archiveRecords]
    return [copy(created)]
  }

  async listSubnets(_signal?: AbortSignal): Promise<SubnetResponse[]> {
    consume(_signal)
    return []
  }

  async listFeedSources(_signal?: AbortSignal): Promise<FeedSourceResponse[]> {
    consume(_signal)
    return []
  }

  async listIocs(query: IocListQuery = {}, _signal?: AbortSignal): Promise<IocListResponse> {
    consume(query, _signal)
    return {
      items: [],
      totalCount: 0,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  async listTargetServers(_subnetId?: string, _signal?: AbortSignal): Promise<TargetServerResponse[]> {
    consume(_subnetId, _signal)
    return []
  }

  async listTargetGroups(_signal?: AbortSignal): Promise<TargetGroupResponse[]> {
    consume(_signal)
    return []
  }

  async listTargetGroupMembers(_targetGroupId: string, _signal?: AbortSignal): Promise<TargetGroupMemberResponse[]> {
    consume(_targetGroupId, _signal)
    return []
  }

  async listDistributionJobs(_filters?: DistributionJobFilters, _signal?: AbortSignal): Promise<RuleDistributionJobResponse[]> {
    consume(_filters, _signal)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async getDistributionJob(_jobId: string, _signal?: AbortSignal): Promise<RuleDistributionJobResponse> {
    consume(_jobId, _signal)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async listDistributionJobAttempts(_jobId: string, _signal?: AbortSignal): Promise<RuleDistributionAttemptResponse[]> {
    consume(_jobId, _signal)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async listDistributionJobTargets(_jobId: string, _signal?: AbortSignal): Promise<RuleDistributionTargetResponse[]> {
    consume(_jobId, _signal)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async createDistributionJob(_input: CreateDistributionJobInput): Promise<RuleDistributionJobResponse> {
    consume(_input)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async retryDistributionJob(_jobId: string, _input: RetryDistributionJobInput): Promise<RuleDistributionJobResponse> {
    consume(_jobId, _input)
    throw new Error("Rule distribution jobs are not available in mock gateway.")
  }

  async listScanPlans(_signal?: AbortSignal): Promise<ScanPlanResponse[]> {
    consume(_signal)
    return []
  }

  async getScanPlan(_scanPlanId: string, _signal?: AbortSignal): Promise<ScanPlanResponse> {
    consume(_scanPlanId, _signal)
    throw new Error("Scan plans are not available in mock gateway.")
  }

  async createScanPlan(_input: CreateScanPlanInput): Promise<ScanPlanResponse> {
    consume(_input)
    throw new Error("Scan plans are not available in mock gateway.")
  }

  async updateScanPlan(_scanPlanId: string, _input: UpdateScanPlanInput): Promise<ScanPlanResponse> {
    consume(_scanPlanId, _input)
    throw new Error("Scan plans are not available in mock gateway.")
  }

  async runScanPlan(_scanPlanId: string, _actorUserId: string, _triggerSource?: string): Promise<ScanJobResponse> {
    consume(_scanPlanId, _actorUserId, _triggerSource)
    throw new Error("Scan execution is not available in mock gateway.")
  }

  async listScanJobs(_filters?: ScanJobFilters, _signal?: AbortSignal): Promise<ScanJobResponse[]> {
    consume(_filters, _signal)
    return []
  }

  async getScanJob(_scanJobId: string, _signal?: AbortSignal): Promise<ScanJobResponse> {
    consume(_scanJobId, _signal)
    throw new Error("Scan jobs are not available in mock gateway.")
  }

  async listScanJobTargets(_scanJobId: string, _signal?: AbortSignal): Promise<ScanJobTargetExecutionResponse[]> {
    consume(_scanJobId, _signal)
    return []
  }

  async cancelScanJob(_scanJobId: string, _actorUserId: string, _reason?: string): Promise<ScanJobResponse> {
    consume(_scanJobId, _actorUserId, _reason)
    throw new Error("Scan execution is not available in mock gateway.")
  }

  async getScanAnalystStatus(_signal?: AbortSignal): Promise<ScanAnalystAgentStatusResponse> {
    consume(_signal)
    const now = new Date()

    return {
      agentEnabled: true,
      autonomyEnabled: this.scanAnalystPosture.enabled,
      databaseAvailable: false,
      operatingMode: "MockFallback",
      indicatorLabel: "Demo mode",
      degradedReason: "Live SQL data is unavailable for the demo scan-plan assistant.",
      activeSessionCount: this.scanAnalystSessions.size,
      availableMockConditions: ["new_hosts_found", "failed_recent_job", "stale_coverage", "recent_alert_detected"],
      activeMockConditions: ["new_hosts_found"],
      parameters: this.scanAnalystPosture,
      personaName: "Zira",
      currentActivity: "Monitoring demo scan coverage and ready to draft a focused plan.",
      latestActionSummary: "Zira prepared a safe first-pass recommendation for newly observed hosts.",
      recentActions: [
        {
          id: "mock-recent-action",
          title: "Prepared new-host follow-up",
          summary: "Scoped a compact demo scan plan for new hosts.",
          occurredAtUtc: new Date(now.getTime() - 3 * 60_000).toISOString(),
          status: "Completed",
        },
      ],
      completedPlans: [
        {
          id: "mock-completed-plan",
          name: "zira-demo-follow-up",
          scannerCapability: "Sigma",
          targetCount: 3,
          detectionCount: 1,
          outcome: "Completed",
          completedAtUtc: new Date(now.getTime() - 8 * 60_000).toISOString(),
        },
      ],
      lastAutonomousActivity: {
        summary: "Zira noticed new hosts and prepared a follow-up scan automatically.",
        trigger: "new hosts",
        action: "CreateAndRun",
        operatingMode: "MockFallback",
        occurredAtUtc: new Date(now.getTime() - 4 * 60_000).toISOString(),
      },
    }
  }

  async getAiModelStatistics(_signal?: AbortSignal) {
    consume(_signal)
    return {
      modelId: "cti-v1-baseline",
      modelVersion: "mock-v1",
      status: "active",
      datasetVersion: "mock-dataset-v1",
      scoringProfileVersion: "heuristic-v1",
      featureSchemaVersion: "cti-feature-schema-v1",
      createdAtUtc: "2026-04-26T06:02:15.209852Z",
      publishedAtUtc: "2026-04-26T06:02:44.547760Z",
      trainingWindowStartUtc: "2025-12-08T16:58:48Z",
      trainingWindowEndUtc: "2026-04-26T06:01:19.498829Z",
      evaluationWindowStartUtc: "2025-12-13T01:16:25Z",
      evaluationWindowEndUtc: "2026-04-26T06:01:19.498829Z",
      datasetManifestHash: "mock-manifest-hash",
      metrics: {
        precision: 1,
        recall: 0.996,
        prAuc: 0.999,
        calibrationError: 0.001,
        abstainRate: 0.483,
        coverage: 0.517,
        validationSampleSize: 518,
      },
      thresholds: {
        recommend: 0.8,
        escalate: 0.95,
        abstain: 0.55,
      },
      datasetCounts: {
        observables: 5178,
        detections: 5178,
        outcomes: 5178,
        sourceTrust: 13,
      },
      runtimeWarnings: [],
      readinessStatus: "ready",
      notes: "Mock baseline model statistics.",
    }
  }

  async updateScanAnalystPosture(input: UpdateScanAnalystPostureInput): Promise<ScanAnalystAgentStatusResponse> {
    this.scanAnalystPosture = {
      ...this.scanAnalystPosture,
      enabled: input.autonomyEnabled,
      maxTargetsPerRun: input.maxTargetsPerRun,
      preferredScannerFamily: input.preferredScannerFamily,
      autoRun: input.autoRun,
      quietHours: input.quietHours,
      watchForNewHosts: input.watchForNewHosts,
      watchForFailedRecentJobs: input.watchForFailedRecentJobs,
      watchForRecentAlerts: input.watchForRecentAlerts,
      requireMatchingRuleFamily: input.requireMatchingRuleFamily,
    }

    return this.getScanAnalystStatus()
  }

  async sendScanAnalystChatTurn(input: SendScanAnalystChatTurnInput): Promise<ScanAnalystChatResponse> {
    const sessionId = input.sessionId ?? nextUserId()
    const previous = this.scanAnalystSessions.get(sessionId)
    const capability = input.preferredScannerCapability ?? input.editedPlan?.scannerCapability ?? inferScannerCapability(input.message)
    const proposedPlan = input.editedPlan ?? buildMockScanAnalystPlan(capability)
    const createdPlan = input.action === "RecommendOnly" ? null : buildCreatedScanPlan(proposedPlan)
    const queuedJob = input.action === "CreateAndRun" && createdPlan ? buildQueuedScanJob(createdPlan.id, input.actorUserId) : null
    const runSummary = queuedJob ? buildMockRunSummary(queuedJob.id, proposedPlan) : null

    if (queuedJob && runSummary) {
      this.scanAnalystRunSummaries.set(queuedJob.id, runSummary)
    }

    const response: ScanAnalystChatResponse = {
      sessionId,
      agentStatusLine: "Zira is running in demo mode.",
      operatingMode: "MockFallback",
      databaseAvailable: false,
      activeMockConditions: input.simulatedConditions ?? ["new_hosts_found"],
      messages: [
        ...(previous?.messages ?? []),
        {
          role: "user",
          content: input.message,
          timestampUtc: new Date().toISOString(),
        },
        {
          role: "agent",
          content: buildMockAgentMessage(input.action, capability, runSummary),
          timestampUtc: new Date().toISOString(),
        },
      ],
      latestAnalysis: {
        action: input.action,
        operatingMode: "MockFallback",
        summary: buildMockAgentMessage(input.action, capability, runSummary),
        plannerMode: "local",
        observations: ["Demo context is available.", `${capability} coverage is suitable for this request.`],
        reasoning: ["The selected scanner family matches the requested follow-up and available demo evidence."],
        validationWarnings: [],
        recommendedScannerCapability: capability,
        contextSummary: {
          focusSubnetId: input.subnetId ?? null,
          focusSubnetName: input.subnetId ? "Selected subnet" : null,
          discoveryRunCount: 1,
          discoveredHostCount: 3,
          managedServerCount: proposedPlan.targets.length,
          candidateRuleCount: proposedPlan.rules.length,
          existingPlanCount: 0,
          recentJobCount: queuedJob ? 1 : 0,
        },
        proposedPlan,
        createdPlan,
        queuedJob,
        runSummary,
      },
      latestRunSummary: runSummary,
    }

    this.scanAnalystSessions.set(sessionId, response)
    return copy(response)
  }

  async getScanAnalystRunSummary(scanJobId: string, _signal?: AbortSignal): Promise<ScanAnalystRunSummaryResponse> {
    consume(_signal)
    const summary = this.scanAnalystRunSummaries.get(scanJobId)
    if (!summary) {
      throw new Error("Scan analyst run summary was not found.")
    }

    return copy(summary)
  }

  async listManagedServers(
    _filters?: ManagedServerInventoryFilters,
    _signal?: AbortSignal,
  ): Promise<ManagedServerInventoryResponse> {
    consume(_filters, _signal)
    return {
      servers: [],
      totalServers: 0,
      unhealthyServers: 0,
      unreachableServers: 0,
      staleContactServers: 0,
      page: _filters?.page ?? 1,
      pageSize: _filters?.pageSize ?? 20,
    }
  }

  async getManagedServer(_targetServerId: string, _signal?: AbortSignal): Promise<ManagedServerResponse> {
    consume(_targetServerId, _signal)
    throw new Error("Managed server detail is not available in mock gateway.")
  }

  async createManagedServer(_input: CreateManagedServerInput): Promise<void> {
    consume(_input)
    throw new Error("Managed server registration is not available in mock gateway.")
  }

  async updateManagedServer(_targetServerId: string, _input: UpdateManagedServerInput): Promise<void> {
    consume(_targetServerId, _input)
    throw new Error("Managed server update is not available in mock gateway.")
  }

  async rotateManagedServerConnectionSecret(
    _targetServerId: string,
    _input: RotateManagedServerConnectionSecretInput,
  ): Promise<ManagedServerConnectionSecretMetadataResponse> {
    consume(_targetServerId, _input)
    throw new Error("Managed server secret rotation is not available in mock gateway.")
  }

  async upsertManagedServerScannerAssignment(
    _targetServerId: string,
    _scannerId: string,
    _input: UpsertManagedServerScannerAssignmentInput,
  ): Promise<void> {
    consume(_targetServerId, _scannerId, _input)
    throw new Error("Scanner assignment is not available in mock gateway.")
  }

  async removeManagedServerScannerAssignment(_targetServerId: string, _scannerId: string): Promise<void> {
    consume(_targetServerId, _scannerId)
    throw new Error("Scanner assignment is not available in mock gateway.")
  }

  async listScanners(_signal?: AbortSignal): Promise<ScannerResponse[]> {
    consume(_signal)
    return copy(this.scanners)
  }

  async createScanner(input: CreateScannerInput): Promise<ScannerResponse> {
    const nowUtc = new Date().toISOString()
    const capabilities = (input.capabilities?.length ? input.capabilities : [input.engineType]).filter(
      (item): item is ScannerResponse["capabilities"][number] =>
        item === "Yara" || item === "Sigma" || item === "Snort" || item === "Suricata",
    )
    const created: ScannerResponse = {
      id: nextUserId(),
      name: input.name.trim(),
      engineType: input.engineType.trim(),
      version: input.version.trim(),
      healthStatus: "Healthy",
      lastHeartbeatUtc: null,
      createdAtUtc: nowUtc,
      updatedAtUtc: nowUtc,
      capabilities,
    }

    this.scanners = [created, ...this.scanners]
    return copy(created)
  }

  async updateScannerCapabilities(scannerId: string, input: UpdateScannerCapabilitiesInput): Promise<ScannerResponse> {
    const scanner = this.scanners.find((item) => item.id === scannerId)
    if (!scanner) {
      throw new Error("Scanner not found.")
    }

    const capabilities = input.capabilities.filter(
      (item): item is ScannerResponse["capabilities"][number] =>
        item === "Yara" || item === "Sigma" || item === "Snort" || item === "Suricata",
    )

    const updated: ScannerResponse = {
      ...scanner,
      capabilities,
      updatedAtUtc: new Date().toISOString(),
    }

    this.scanners = this.scanners.map((item) => (item.id === scannerId ? updated : item))
    return copy(updated)
  }

  async queueDiscoveryRun(_input: QueueDiscoveryRunInput): Promise<DiscoveryRunResponse> {
    consume(_input)
    throw new Error("Discovery queue is not available in mock gateway.")
  }

  async listDiscoveryRuns(_subnetId?: string, _signal?: AbortSignal): Promise<DiscoveryRunResponse[]> {
    consume(_subnetId, _signal)
    return []
  }

  async listDiscoveredHosts(_subnetId?: string, _signal?: AbortSignal): Promise<DiscoveredHostResponse[]> {
    consume(_subnetId, _signal)
    return []
  }

  async listDetections(query: DetectionListQuery = {}, _signal?: AbortSignal): Promise<DetectionHistoryResponse> {
    consume(query, _signal)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    return {
      total: 0,
      take: pageSize,
      skip: (Math.max(1, page) - 1) * pageSize,
      items: [],
    }
  }

  async getDetectionDetail(detectionId: string, _signal?: AbortSignal): Promise<DetectionDetailResponse> {
    consume(_signal)
    const now = new Date().toISOString()
    return {
      id: detectionId,
      fingerprint: `mock-${detectionId.slice(0, 12)}`,
      scannerFamily: "yara",
      serverId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      serverHostname: "srv-mock-01",
      scanJobId: null,
      jobAttemptId: null,
      targetExecutionId: null,
      ruleRevisionId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      ruleName: "mock_rule",
      iocId: null,
      iocType: "domain",
      iocValue: "mock.example",
      disposition: "Detection",
      confidence: 0.73,
      observedAtUtc: now,
      firstObservedAtUtc: now,
      lastObservedAtUtc: now,
      occurrenceCount: 1,
      isExecutionArtifact: false,
      evidenceJson: "{\"mock\":true}",
      rawPayloadHash: "mock-hash",
      source: "mock-gateway",
      linkedAlerts: [],
      linkedCases: [
        {
          id: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
          title: "Mock linked case",
          status: "Open",
          severity: "High",
          updatedAtUtc: now,
        },
      ],
    }
  }

  async submitAiDecision(input: SubmitAiDecisionInput): Promise<SubmitAiDecisionAcceptedResponse> {
    consume(input)
    const decisionId = nextUserId()
    const submittedAtUtc = new Date().toISOString()
    return {
      decisionId,
      status: "Queued",
      submittedAtUtc,
      links: {
        result: `/api/v2/ai/decisions/${decisionId}`,
        explanation: `/api/v2/ai/decisions/${decisionId}/explanation`,
        actionPlan: `/api/v2/ai/decisions/${decisionId}/action-plan`,
        similarDetections: `/api/v2/ai/decisions/${decisionId}/similar-detections`,
        evidenceSources: `/api/v2/ai/decisions/${decisionId}/evidence-sources`,
        overrideClosure: `/api/v2/ai/decisions/${decisionId}/override-closure`,
      },
    }
  }

  async getAiDecisionResult(decisionId: string, _signal?: AbortSignal): Promise<AiDecisionResultResponse> {
    consume(_signal)
    const now = new Date().toISOString()
    return {
      decisionId,
      status: "Completed",
      submittedAtUtc: now,
      startedAtUtc: now,
      completedAtUtc: now,
      failureCode: null,
      failureMessage: null,
      modelVersion: "v1-unified-supervised-v1-cv5-20260426060214",
      datasetVersion: "unified-supervised-v1",
      decision: {
        verdict: "likely_malicious",
        action: "monitor",
        confidence: 0.32,
        falsePositiveRisk: 0.38,
        reviewPriority: "high",
        shouldPromoteToIndicator: true,
        shouldSuppress: false,
        shouldAllowlist: false,
        shouldEscalate: false,
        reasons: [
          "The IOC has suspicious scanner evidence, but the model cannot corroborate it strongly enough for automatic escalation.",
          "verdict=likely_malicious calibrated_signal=0.32 uncertainty=0.68 conflict=0.26",
        ],
        provenance: [],
        nextBestEvidence: ["collect_host_telemetry", "run_reputation_enrichment", "review_prior_analyst_outcomes"],
        abstainReason: null,
        scoredAtUtc: now,
        safetyDiagnostics: {
          autoRemediationAllowed: false,
          weakEvidence: true,
          contradictoryEvidence: true,
          contradictionScore: 0.26,
          missingCriticalFields: ["source_reputation", "analyst_history", "enrichment_summary"],
          partialEvidence: true,
          enrichmentStatus: "degraded",
          falsePositiveRisk: 0.38,
          severityCapApplied: false,
          maxRecommendationSeverity: "containment_allowed",
          degradationReasons: ["weak_enrichment", "missing_scan_evidence", "conflicting_evidence"],
        },
        raw: {},
      },
      explanationAvailable: true,
      actionPlanAvailable: true,
      similarDetectionsAvailable: false,
      evidenceSourcesAvailable: true,
    }
  }

  async getLatestAiDecisionForDetection(detectionId: string, _signal?: AbortSignal): Promise<AiDecisionResultResponse> {
    return this.getAiDecisionResult(detectionId, _signal)
  }

  async getLatestAiDecisionForIoc(iocId: string, _signal?: AbortSignal) {
    return {
      iocId,
      detectionId: iocId,
      result: await this.getAiDecisionResult(iocId, _signal),
    }
  }

  async generateAiDecisionForIoc(
    _iocId: string,
    input: { submittedByUserId: string },
  ): Promise<SubmitAiDecisionAcceptedResponse> {
    return this.submitAiDecision({
      caseId: _iocId,
      detectionId: `legacy-ioc:${_iocId}`,
      iocType: "artifact",
      iocValue: _iocId,
      observedAtUtc: new Date().toISOString(),
      detectionPackage: { legacyIocId: _iocId },
      submittedByUserId: input.submittedByUserId,
    })
  }

  async getAiDecisionExplanation(
    decisionId: string,
    _signal?: AbortSignal,
  ): Promise<AiDecisionExplanationOrPendingResponse> {
    consume(_signal)
    const now = new Date().toISOString()
    return {
      decisionId,
      status: "Completed",
      summary: "Mock deterministic explanation for decision review.",
      decisionState: "monitor",
      recommendedAction: "monitor",
      rationale: ["Evidence supports monitoring while collecting corroboration."],
      citations: [],
      nextBestEvidence: ["collect_host_telemetry"],
      policyVersion: "mock-policy",
      modelVersion: "mock-model",
      datasetVersion: "mock-dataset",
      generatedAtUtc: now,
      raw: {},
      phrasingDiagnostics: {
        origin: "deterministic",
        status: "disabled",
        enabled: false,
        provider: null,
        model: null,
        raw: { status: "disabled" },
      },
    }
  }

  async getAiDecisionActionPlan(
    decisionId: string,
    _signal?: AbortSignal,
  ): Promise<AiDecisionActionPlanOrPendingResponse> {
    consume(_signal)
    const now = new Date().toISOString()
    return {
      decisionId,
      status: "Completed",
      summary: "Manual-only recommendations derived from deterministic policy gates.",
      recommendedActions: [
        {
          action: "search_fleet",
          rank: 1,
          score: 0.74,
          rationale: "Assess spread prior to irreversible containment.",
          prerequisites: ["Scope by asset group."],
          cautions: ["Large searches may increase query load."],
          escalationTarget: "analyst_queue",
          requiredReviewerRole: "tier1_analyst",
          requiresHumanApproval: true,
          executionMode: "manual_only",
        },
      ],
      prerequisites: ["Scope by asset group."],
      cautions: ["Large searches may increase query load."],
      neverAutoExecutes: true,
      policyConstrained: true,
      evidenceBased: true,
      generatedAtUtc: now,
      raw: {},
      phrasingDiagnostics: {
        origin: "deterministic",
        status: "disabled",
        enabled: false,
        provider: null,
        model: null,
        raw: { status: "disabled" },
      },
    }
  }

  async listAiDecisionEvidenceSources(
    decisionId: string,
    query: AiDecisionCursorQuery = {},
    _signal?: AbortSignal,
  ): Promise<AiEvidenceSourcesResponse> {
    consume(_signal, query)
    return {
      decisionId,
      limit: query.limit ?? 20,
      nextCursor: null,
      items: [
        {
          id: "7afdfb88-f5c2-40ef-87ff-872e0e7248c1",
          channel: "telemetry",
          source: "mock-edr",
          evidenceId: "ev-1",
          reference: "ref-1",
          category: "process_lineage",
          polarity: "positive",
          confidence: 0.78,
          summary: "Parent-child process chain matched known pattern.",
          anchor: "process_tree",
          rank: 1,
        },
      ],
    }
  }

  async listAiDecisionSimilarDetections(
    decisionId: string,
    query: AiDecisionCursorQuery = {},
    _signal?: AbortSignal,
  ): Promise<AiSimilarDetectionsResponse> {
    consume(_signal, query)
    return {
      decisionId,
      limit: query.limit ?? 20,
      nextCursor: null,
      items: [
        {
          id: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
          detectionId: "mock-detection-1",
          ruleFamily: "yara",
          ruleId: "mock-rule",
          relationType: "similar_pattern",
          observedAtUtc: new Date().toISOString(),
          confidence: 0.7,
          similarityScore: 0.82,
          similarityReasons: ["shared_ioc_pattern"],
          priorVerdicts: ["likely_malicious"],
          priorAcceptedActions: ["search_fleet"],
          priorOutcomes: ["success"],
          rank: 1,
        },
      ],
    }
  }

  async submitAiDecisionOverrideOrClosure(
    decisionId: string,
    input: SubmitAiDecisionOverrideOrClosureInput,
  ): Promise<AiOverrideOrClosureResponse> {
    const submittedAtUtc = new Date().toISOString()
    return {
      decisionId,
      overrideId: nextUserId(),
      actionType: input.actionType,
      previousStatus: "Completed",
      newStatus: input.actionType === "Override" ? "Overridden" : "Closed",
      reason: input.reason,
      notes: input.notes ?? null,
      overrideVerdict: input.overrideVerdict ?? null,
      closureDisposition: input.closureDisposition ?? null,
      isFinal: input.isFinal ?? input.actionType === "Close",
      submittedByUserId: input.submittedByUserId,
      submittedAtUtc,
    }
  }

  async promoteDiscoveredHost(
    _discoveredHostId: string,
    _input: PromoteDiscoveredHostInput,
  ): Promise<PromoteDiscoveredHostResponse> {
    consume(_discoveredHostId, _input)
    throw new Error("Discovery promotion is not available in mock gateway.")
  }

  async getHealthInfo(_signal?: AbortSignal) {
    consume(_signal)
    const state = getMockState()
    return {
      service: "IoC Manager Mock Gateway",
      environment: "frontend-prototype",
      utcNow: state.meta.referenceUtc,
    }
  }

  async getHealthReady(_signal?: AbortSignal) {
    consume(_signal)
    return {
      status: "ready" as const,
      components: [
        {
          name: "database",
          status: "healthy" as const,
          required: true,
          message: "Database reachable.",
        },
        {
          name: "ai_sidecar",
          status: "healthy" as const,
          required: false,
          message: "AI sidecar reachable.",
        },
      ],
    }
  }

  async getHealthAdmin(_signal?: AbortSignal) {
    consume(_signal)
    return {
      runtime: "nextjs",
      machineName: "frontend-prototype-node",
      processId: 1,
    }
  }

  async getAlertRuleWorkflow(alertId: string, _signal?: AbortSignal): Promise<CaseRuleWorkflowResponse> {
    consume(_signal)
    return copy(selectCaseRuleWorkflow(getMockState(), alertId))
  }

  async getCaseRuleWorkflow(caseId: string, _signal?: AbortSignal): Promise<CaseRuleWorkflowResponse> {
    return this.getAlertRuleWorkflow(caseId, _signal)
  }

  async createRuleProposal(input: CreateRuleProposalInput): Promise<RuleProposalResponse> {
    return copy(withMockState((state) => createRuleProposal(state, input)))
  }

  async reviewRuleProposal(proposalId: string, input: ReviewRuleProposalInput): Promise<RuleProposalResponse> {
    return copy(withMockState((state) => reviewRuleProposal(state, proposalId, input)))
  }

  async simulateRuleProposal(proposalId: string, input: SimulateRuleProposalInput): Promise<RuleSimulationResultResponse> {
    return copy(withMockState((state) => simulateRuleProposal(state, proposalId, input)))
  }

  async advanceRolloutStage(rolloutPlanId: string, input: AdvanceRolloutStageInput): Promise<RolloutPlanResponse> {
    return copy(withMockState((state) => advanceRolloutStage(state, rolloutPlanId, input)))
  }

  async recordCanaryObservation(
    rolloutPlanId: string,
    input: RecordCanaryObservationInput,
  ): Promise<RolloutPlanResponse> {
    return copy(withMockState((state) => recordCanaryObservation(state, rolloutPlanId, input)))
  }

  async triggerRollback(rollbackPlanId: string, input: TriggerRollbackInput): Promise<RollbackPlanResponse> {
    return copy(withMockState((state) => triggerRollback(state, rollbackPlanId, input)))
  }

  async getCaseDetail(caseId: string, _signal?: AbortSignal): Promise<CaseDetailVM> {
    consume(_signal)
    return copy(selectCaseDetail(getMockState(), caseId))
  }

  async getOverview(_signal?: AbortSignal): Promise<{ cards: OverviewCard[]; queue: QueueItem[]; isSimulated: boolean }> {
    consume(_signal)
    return copy(selectOverview(getMockState()))
  }

  async getProblematicQueue(_signal?: AbortSignal): Promise<{ queue: QueueItem[]; isSimulated: boolean }> {
    consume(_signal)
    return copy(selectProblematicQueue(getMockState()))
  }

  async getReportsIngestion(_signal?: AbortSignal): Promise<ReportsIngestionVM> {
    consume(_signal)
    return copy(selectReportsIngestion(getMockState()))
  }

  async getGraphRelationships(caseId: string, _signal?: AbortSignal): Promise<GraphRelationshipsVM> {
    consume(_signal)
    return copy(selectGraphRelationships(getMockState(), caseId))
  }

  async getSettingsAdmin(_signal?: AbortSignal): Promise<SettingsAdminVM> {
    consume(_signal)
    return copy(selectSettingsAdmin(getMockState()))
  }

  async runModelRetraining(triggeredByUserId: string) {
    return copy(withMockState((state) => runModelRetraining(state, triggeredByUserId)))
  }

  async getCoveragePainAnalysis(
    _input?: CoveragePainAnalysisScopeInput,
    _signal?: AbortSignal,
  ): Promise<CoveragePainAnalysisResponse> {
    consume(_input, _signal)
    throw new Error("Coverage pain analysis is not available in mock gateway.")
  }
}

