import { AspNetGateway } from "@/shared/gateway/aspnet-gateway"
import {
  buildActivityTimeline,
  buildGraphInvestigation,
  buildGraphNeighbors,
  buildLinkedReports,
  buildLinkedRules,
  buildNextBestEvidence,
  buildPolicyGuardrails,
  buildQueue,
  buildReportsIngestion,
  buildScoreAxes,
  buildSimilarHistoricalCases,
  buildTopEvidence,
  synthesizeRollbackPlan,
  synthesizeRolloutPlan,
} from "@/shared/gateway/adapters"
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
  OverviewCard,
  PromoteDiscoveredHostInput,
  DistributionJobFilters,
  ScanJobFilters,
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

export class AugmentedGateway implements Gateway {
  constructor(private readonly source: AspNetGateway) {}

  login(username: string, password: string) {
    return this.source.login(username, password)
  }

  listAlertRegistry(query?: AlertListQuery, signal?: AbortSignal) {
    return this.source.listAlertRegistry(query, signal)
  }

  listAlerts(signal?: AbortSignal) {
    return this.source.listAlerts(signal)
  }

  getAlert(alertId: string, signal?: AbortSignal) {
    return this.source.getAlert(alertId, signal)
  }

  listCases(signal?: AbortSignal) {
    return this.listAlerts(signal)
  }

  getCase(caseId: string, signal?: AbortSignal) {
    return this.getAlert(caseId, signal)
  }

  listEvidence(caseId: string, signal?: AbortSignal) {
    return this.source.listEvidence(caseId, signal)
  }

  listDecisions(caseId: string, signal?: AbortSignal) {
    return this.source.listDecisions(caseId, signal)
  }

  listRules(caseId: string, signal?: AbortSignal) {
    return this.source.listRules(caseId, signal)
  }

  listRuleRepository(query?: RuleRepositoryListQuery, signal?: AbortSignal) {
    return this.source.listRuleRepository(query, signal)
  }

  getRuleDetail(ruleId: string, signal?: AbortSignal) {
    return this.source.getRuleDetail(ruleId, signal)
  }

  createRule(input: CreateRuleRepositoryInput) {
    return this.source.createRule(input)
  }

  importRuleFile(input: ImportRuleFileInput) {
    return this.source.importRuleFile(input)
  }

  updateRule(ruleId: string, input: UpdateRuleRepositoryInput) {
    return this.source.updateRule(ruleId, input)
  }

  listRuleRevisions(ruleId: string, signal?: AbortSignal) {
    return this.source.listRuleRevisions(ruleId, signal)
  }

  listRuleImportAttempts(ruleId: string, signal?: AbortSignal) {
    return this.source.listRuleImportAttempts(ruleId, signal)
  }

  archiveRule(ruleId: string, input: ArchiveRuleInput) {
    return this.source.archiveRule(ruleId, input)
  }

  restoreRule(ruleId: string, input: RestoreRuleInput) {
    return this.source.restoreRule(ruleId, input)
  }

  listDeployments(caseId: string, signal?: AbortSignal) {
    return this.source.listDeployments(caseId, signal)
  }

  listAllDeployments(signal?: AbortSignal) {
    return this.source.listAllDeployments(signal)
  }

  listFeedback(caseId: string, signal?: AbortSignal) {
    return this.source.listFeedback(caseId, signal)
  }

  listReports(query?: ReportListQuery, signal?: AbortSignal) {
    return this.source.listReports(query, signal)
  }

  generateReport(input: GenerateReportInput) {
    return this.source.generateReport(input)
  }

  getPowerBiVisualizationCatalog(signal?: AbortSignal) {
    return this.source.getPowerBiVisualizationCatalog(signal)
  }

  listAuditLogs(query?: AuditLogListQuery, signal?: AbortSignal) {
    return this.source.listAuditLogs(query, signal)
  }

  listJobRuns(signal?: AbortSignal) {
    return this.source.listJobRuns(signal)
  }

  listUsers(signal?: AbortSignal) {
    return this.source.listUsers(signal)
  }

  listRoles(signal?: AbortSignal) {
    return this.source.listRoles(signal)
  }

  createUser(input: CreateWorkbenchUserInput) {
    return this.source.createUser(input)
  }

  listSubnets(signal?: AbortSignal) {
    return this.source.listSubnets(signal)
  }

  listFeedSources(signal?: AbortSignal) {
    return this.source.listFeedSources(signal)
  }

  listIocs(query?: IocListQuery, signal?: AbortSignal) {
    return this.source.listIocs(query, signal)
  }

  listTargetServers(subnetId?: string, signal?: AbortSignal) {
    return this.source.listTargetServers(subnetId, signal)
  }

  listTargetGroups(signal?: AbortSignal) {
    return this.source.listTargetGroups(signal)
  }

  listTargetGroupMembers(targetGroupId: string, signal?: AbortSignal) {
    return this.source.listTargetGroupMembers(targetGroupId, signal)
  }

  listDistributionJobs(filters?: DistributionJobFilters, signal?: AbortSignal) {
    return this.source.listDistributionJobs(filters, signal)
  }

  getDistributionJob(jobId: string, signal?: AbortSignal) {
    return this.source.getDistributionJob(jobId, signal)
  }

  listDistributionJobAttempts(jobId: string, signal?: AbortSignal) {
    return this.source.listDistributionJobAttempts(jobId, signal)
  }

  listDistributionJobTargets(jobId: string, signal?: AbortSignal) {
    return this.source.listDistributionJobTargets(jobId, signal)
  }

  createDistributionJob(input: CreateDistributionJobInput) {
    return this.source.createDistributionJob(input)
  }

  retryDistributionJob(jobId: string, input: RetryDistributionJobInput) {
    return this.source.retryDistributionJob(jobId, input)
  }

  listScanPlans(signal?: AbortSignal) {
    return this.source.listScanPlans(signal)
  }

  getScanPlan(scanPlanId: string, signal?: AbortSignal) {
    return this.source.getScanPlan(scanPlanId, signal)
  }

  createScanPlan(input: CreateScanPlanInput) {
    return this.source.createScanPlan(input)
  }

  updateScanPlan(scanPlanId: string, input: UpdateScanPlanInput) {
    return this.source.updateScanPlan(scanPlanId, input)
  }

  runScanPlan(scanPlanId: string, actorUserId: string, triggerSource?: string) {
    return this.source.runScanPlan(scanPlanId, actorUserId, triggerSource)
  }

  listScanJobs(filters?: ScanJobFilters, signal?: AbortSignal) {
    return this.source.listScanJobs(filters, signal)
  }

  getScanJob(scanJobId: string, signal?: AbortSignal) {
    return this.source.getScanJob(scanJobId, signal)
  }

  listScanJobTargets(scanJobId: string, signal?: AbortSignal) {
    return this.source.listScanJobTargets(scanJobId, signal)
  }

  cancelScanJob(scanJobId: string, actorUserId: string, reason?: string) {
    return this.source.cancelScanJob(scanJobId, actorUserId, reason)
  }

  listManagedServers(filters?: ManagedServerInventoryFilters, signal?: AbortSignal) {
    return this.source.listManagedServers(filters, signal)
  }

  getManagedServer(targetServerId: string, signal?: AbortSignal) {
    return this.source.getManagedServer(targetServerId, signal)
  }

  createManagedServer(input: CreateManagedServerInput) {
    return this.source.createManagedServer(input)
  }

  updateManagedServer(targetServerId: string, input: UpdateManagedServerInput) {
    return this.source.updateManagedServer(targetServerId, input)
  }

  rotateManagedServerConnectionSecret(targetServerId: string, input: RotateManagedServerConnectionSecretInput) {
    return this.source.rotateManagedServerConnectionSecret(targetServerId, input)
  }

  upsertManagedServerScannerAssignment(
    targetServerId: string,
    scannerId: string,
    input: UpsertManagedServerScannerAssignmentInput,
  ) {
    return this.source.upsertManagedServerScannerAssignment(targetServerId, scannerId, input)
  }

  removeManagedServerScannerAssignment(targetServerId: string, scannerId: string) {
    return this.source.removeManagedServerScannerAssignment(targetServerId, scannerId)
  }

  listScanners(signal?: AbortSignal) {
    return this.source.listScanners(signal)
  }

  queueDiscoveryRun(input: QueueDiscoveryRunInput) {
    return this.source.queueDiscoveryRun(input)
  }

  listDiscoveryRuns(subnetId?: string, signal?: AbortSignal) {
    return this.source.listDiscoveryRuns(subnetId, signal)
  }

  listDiscoveredHosts(subnetId?: string, signal?: AbortSignal) {
    return this.source.listDiscoveredHosts(subnetId, signal)
  }

  listDetections(query?: DetectionListQuery, signal?: AbortSignal) {
    return this.source.listDetections(query, signal)
  }

  promoteDiscoveredHost(discoveredHostId: string, input: PromoteDiscoveredHostInput) {
    return this.source.promoteDiscoveredHost(discoveredHostId, input)
  }

  getHealthInfo(signal?: AbortSignal) {
    return this.source.getHealthInfo(signal)
  }

  getHealthReady(signal?: AbortSignal) {
    return this.source.getHealthReady(signal)
  }

  getHealthAdmin(signal?: AbortSignal) {
    return this.source.getHealthAdmin(signal)
  }

  getAlertRuleWorkflow(alertId: string, signal?: AbortSignal) {
    return this.source.getAlertRuleWorkflow(alertId, signal)
  }

  getCaseRuleWorkflow(caseId: string, signal?: AbortSignal) {
    return this.getAlertRuleWorkflow(caseId, signal)
  }

  createRuleProposal(input: CreateRuleProposalInput) {
    return this.source.createRuleProposal(input)
  }

  reviewRuleProposal(proposalId: string, input: ReviewRuleProposalInput) {
    return this.source.reviewRuleProposal(proposalId, input)
  }

  simulateRuleProposal(proposalId: string, input: SimulateRuleProposalInput) {
    return this.source.simulateRuleProposal(proposalId, input)
  }

  advanceRolloutStage(rolloutPlanId: string, input: AdvanceRolloutStageInput) {
    return this.source.advanceRolloutStage(rolloutPlanId, input)
  }

  recordCanaryObservation(rolloutPlanId: string, input: RecordCanaryObservationInput) {
    return this.source.recordCanaryObservation(rolloutPlanId, input)
  }

  triggerRollback(rollbackPlanId: string, input: TriggerRollbackInput) {
    return this.source.triggerRollback(rollbackPlanId, input)
  }

  runModelRetraining(triggeredByUserId: string) {
    return this.source.runModelRetraining(triggeredByUserId)
  }

  async getCaseDetail(caseId: string, signal?: AbortSignal): Promise<CaseDetailVM> {
    const [caseItem, evidence, decisions, deployments, rules, feedback, workflow] = await Promise.all([
      this.source.getAlert(caseId, signal),
      this.source.listEvidence(caseId, signal),
      this.source.listDecisions(caseId, signal),
      this.source.listDeployments(caseId, signal),
      this.source.listRules(caseId, signal),
      this.source.listFeedback(caseId, signal),
      this.source.getAlertRuleWorkflow(caseId, signal),
    ])

    const latestDecision = decisions.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
    const latestDeployment = deployments.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
    const latestRollout =
      workflow.rolloutPlans.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
    const latestRollback =
      (latestRollout ? workflow.rollbackPlans.find((item) => item.rolloutPlanId === latestRollout.id) : null) ??
      workflow.rollbackPlans.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ??
      null

    return {
      caseItem,
      latestDecision,
      latestDeployment,
      scoreAxes: buildScoreAxes(caseId, evidence, decisions),
      recommendedAction: latestDecision?.recommendedAction ?? "request_more_evidence",
      decisionState: latestDecision?.state ?? "Proposed",
      approvalTier: latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired,
      rolloutPlan: synthesizeRolloutPlan(caseItem, latestDeployment),
      rollbackPlan: synthesizeRollbackPlan(caseItem, latestDeployment),
      topEvidence: buildTopEvidence(evidence),
      graphNeighbors: buildGraphNeighbors(caseId),
      similarHistoricalCases: buildSimilarHistoricalCases(caseId),
      nextBestEvidence: buildNextBestEvidence(caseId),
      activityTimeline: buildActivityTimeline(decisions, deployments, feedback),
      linkedRules: buildLinkedRules(rules, workflow),
      linkedReports: buildLinkedReports(evidence, feedback),
      policyGuardrails: buildPolicyGuardrails(latestDecision, workflow, latestRollout, latestRollback, caseItem),
      isSimulated: true,
    }
  }

  async getOverview(signal?: AbortSignal) {
    const cases = await this.source.listAlerts(signal)
    const details = await Promise.all(cases.slice(0, 8).map((item) => this.getCaseDetail(item.id, signal)))
    const queue = buildQueue(cases, details).slice(0, 5)

    const openCount = cases.filter((item) => item.status.toLowerCase() !== "closed").length
    const approvalCount = cases.filter((item) => item.status.toLowerCase().includes("approval")).length
    const highRiskCount = queue.filter((item) => item.policyRisk >= 70).length
    const canaryCount = queue.filter((item) => item.rolloutState.toLowerCase().includes("canary")).length

    const cards: OverviewCard[] = [
      {
        key: "approval_pressure",
        title: "Approval Pressure",
        value: String(approvalCount),
        subtitle: "Alerts waiting for lead/admin decision",
        trend: `${Math.max(1, approvalCount)} active`,
      },
      {
        key: "policy_friction",
        title: "Policy Friction",
        value: String(highRiskCount),
        subtitle: "Queue items at elevated policy risk",
        trend: "risk >= 70",
      },
      {
        key: "evidence_freshness",
        title: "Evidence Freshness",
        value: `${Math.max(0, 96 - approvalCount)}%`,
        subtitle: "Recent telemetry coverage across active alerts",
        trend: `${openCount} open alerts`,
      },
      {
        key: "rollout_watch",
        title: "Rollout Watch",
        value: String(canaryCount),
        subtitle: "Alerts under canary or promotion monitoring",
        trend: "rollback guard enabled",
      },
    ]

    return {
      cards,
      queue,
      isSimulated: true,
    }
  }

  async getProblematicQueue(signal?: AbortSignal): Promise<{ queue: QueueItem[]; isSimulated: boolean }> {
    const cases = await this.source.listAlerts(signal)
    const details = await Promise.all(cases.map((item) => this.getCaseDetail(item.id, signal)))
    return {
      queue: buildQueue(cases, details),
      isSimulated: true,
    }
  }

  async getReportsIngestion(signal?: AbortSignal): Promise<ReportsIngestionVM> {
    const [healthInfo, recentJobs] = await Promise.all([this.source.getHealthInfo(signal), this.source.listJobRuns(signal)])

    return {
      healthInfo,
      recentJobs,
      ingestionSummary: buildReportsIngestion(healthInfo.service, recentJobs),
      isSimulated: true,
    }
  }

  async getGraphRelationships(caseId: string, signal?: AbortSignal): Promise<GraphRelationshipsVM> {
    const [caseItem, evidence, rules, allCases] = await Promise.all([
      this.source.getAlert(caseId, signal),
      this.source.listEvidence(caseId, signal),
      this.source.listRules(caseId, signal),
      this.source.listAlerts(signal),
    ])
    const investigation = buildGraphInvestigation(caseItem, evidence, rules, allCases)

    return {
      focalCaseId: caseId,
      nodes: investigation.nodes,
      edges: investigation.edges,
      pathHints: investigation.pathHints,
      timeBounds: investigation.timeBounds,
      isSimulated: true,
    }
  }

  async getSettingsAdmin(signal?: AbortSignal): Promise<SettingsAdminVM> {
    const [healthInfo, healthAdmin, recentJobs] = await Promise.all([
      this.source.getHealthInfo(signal),
      this.source.getHealthAdmin(signal),
      this.source.listJobRuns(signal),
    ])

    return {
      healthInfo,
      healthAdmin,
      recentJobs,
    }
  }

  getCoveragePainAnalysis(input?: CoveragePainAnalysisScopeInput, signal?: AbortSignal) {
    return this.source.getCoveragePainAnalysis(input, signal)
  }
}
