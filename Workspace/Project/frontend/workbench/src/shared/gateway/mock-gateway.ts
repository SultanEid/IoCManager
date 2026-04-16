import type {
  AlertListResponse,
  AuditLogListResponse,
  CaseRuleWorkflowResponse,
  CoveragePainAnalysisResponse,
  DetectionHistoryResponse,
  FeedSourceResponse,
  IocListResponse,
  ManagedServerConnectionSecretMetadataResponse,
  ManagedServerInventoryResponse,
  ManagedServerResponse,
  PowerBiVisualizationCatalogResponse,
  GeneratedReportResponse,
  ReportListResponse,
  ScanJobResponse,
  ScanJobTargetExecutionResponse,
  ScanPlanResponse,
  RuleDistributionAttemptResponse,
  RuleDistributionJobResponse,
  RuleDistributionTargetResponse,
  ScannerResponse,
  DiscoveredHostResponse,
  DiscoveryRunResponse,
  PromoteDiscoveredHostResponse,
  RoleResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleDetail,
  RuleImportAttempt,
  RuleListResponse,
  RuleRevisionItem,
  SubnetResponse,
  TargetGroupMemberResponse,
  TargetGroupResponse,
  TargetServerResponse,
  RuleProposalResponse,
  RuleSimulationResultResponse,
  TokenResponse,
  UserResponse,
} from "@/shared/api/schemas"
import type {
  AdvanceRolloutStageInput,
  AlertListQuery,
  ArchiveRuleInput,
  AuditLogListQuery,
  CaseDetailVM,
  CreateDistributionJobInput,
  CreateScanPlanInput,
  CoveragePainAnalysisScopeInput,
  CreateRuleRepositoryInput,
  CreateManagedServerInput,
  CreateWorkbenchUserInput,
  CreateRuleProposalInput,
  DetectionListQuery,
  Gateway,
  GenerateReportInput,
  GraphRelationshipsVM,
  IocListQuery,
  ManagedServerInventoryFilters,
  DistributionJobFilters,
  ScanJobFilters,
  OverviewCard,
  PromoteDiscoveredHostInput,
  QueueItem,
  QueueDiscoveryRunInput,
  RecordCanaryObservationInput,
  ReportListQuery,
  RestoreRuleInput,
  RuleRepositoryListQuery,
  RotateManagedServerConnectionSecretInput,
  ReportsIngestionVM,
  ReviewRuleProposalInput,
  SettingsAdminVM,
  SimulateRuleProposalInput,
  TriggerRollbackInput,
  RetryDistributionJobInput,
  ImportRuleFileInput,
  UpdateRuleRepositoryInput,
  UpdateScanPlanInput,
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

export class MockGateway implements Gateway {
  private users: UserResponse[] = listMockPersonas().map((persona, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    userName: persona.username,
    email: `${persona.username}@demo.local`,
    displayName: persona.displayName,
    role: persona.roles[0] ?? "Analyst",
  }))
  private generatedReports: ReportListResponse["items"] = []

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
      items: page.items.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        severity: item.priority,
        status: item.status,
        ownerUserId: item.ownerUserId,
        approvalTierRequired: item.approvalTierRequired,
        firstDetectedAtUtc: item.createdAtUtc,
        lastDetectedAtUtc: item.updatedAtUtc,
        createdAtUtc: item.createdAtUtc,
        updatedAtUtc: item.updatedAtUtc,
      })),
      totalCount: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
    }
  }

  async listAlerts(_signal?: AbortSignal) {
    consume(_signal)
    return copy(selectCases(getMockState()))
  }

  async getAlert(alertId: string, _signal?: AbortSignal) {
    consume(_signal)
    return copy(selectCase(getMockState(), alertId))
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
        },
      ],
      alertIds: [],
      persistedReport: null,
    }

    if (input.persist) {
      const persistedReport = {
        id: nextUserId(),
        title,
        reportType: input.reportType,
        summaryJson: JSON.stringify(preview.sections),
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
    return copy(MOCK_ROLES)
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
    return []
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
