import { z } from "zod"
import { requestForm, requestJson } from "@/shared/api/client"
import { ApiError } from "@/shared/api/error"
import {
  alertResponseSchema,
  alertListResponseSchema,
  v2AlertDetailResponseSchema,
  aiDecisionActionPlanOrPendingResponseSchema,
  aiDecisionExplanationOrPendingResponseSchema,
  aiDecisionResultResponseSchema,
  aiEvidenceSourcesResponseSchema,
  iocLatestAiDecisionResponseSchema,
  aiOverrideOrClosureResponseSchema,
  aiSimilarDetectionsResponseSchema,
  alertRuleWorkflowResponseSchema,
  auditLogListResponseSchema,
  archiveRecordResponseSchema,
  coveragePainAnalysisResponseSchema,
  detectionDetailResponseSchema,
  detectionHistoryResponseSchema,
  discoveredHostResponseSchema,
  discoveryRunResponseSchema,
  decisionResponseSchema,
  deploymentResponseSchema,
  deploymentRecommendationResponseSchema,
  feedSourceResponseSchema,
  iocListResponseSchema,
  managedServerConnectionSecretMetadataResponseSchema,
  managedServerInventoryResponseSchema,
  managedServerResponseSchema,
  managedServerScannerAssignmentResponseSchema,
  powerBiVisualizationCatalogResponseSchema,
  generatedReportResponseSchema,
  reportListResponseSchema,
  scanJobResponseSchema,
  scanJobTargetExecutionResponseSchema,
  scanAnalystAgentStatusResponseSchema,
  scanAnalystChatResponseSchema,
  scanAnalystRunSummaryResponseSchema,
  scanPlanResponseSchema,
  ruleDistributionAttemptResponseSchema,
  ruleDistributionJobResponseSchema,
  ruleDistributionTargetResponseSchema,
  evidenceResponseSchema,
  feedbackResponseSchema,
  promoteDiscoveredHostResponseSchema,
  scannerResponseSchema,
  healthAdminSchema,
  healthInfoSchema,
  healthReadySchema,
  jobRunResponseSchema,
  permissionResponseSchema,
  retentionPolicyResponseSchema,
  roleResponseSchema,
  rolePermissionResponseSchema,
  rollbackPlanResponseSchema,
  rolloutPlanResponseSchema,
  ruleProposalResponseSchema,
  ruleDetailSchema,
  ruleImportAttemptSchema,
  ruleListResponseSchema,
  ruleRevisionItemSchema,
  ruleResponseSchema,
  ruleSimulationResultResponseSchema,
  subnetResponseSchema,
  submitAiDecisionAcceptedResponseSchema,
  targetGroupMemberResponseSchema,
  targetGroupResponseSchema,
  targetServerResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  type AlertListResponse,
  type AlertResponse,
  type AiDecisionActionPlanOrPendingResponse,
  type AiDecisionExplanationOrPendingResponse,
  type AiDecisionResultResponse,
  type AiEvidenceSourcesResponse,
  type IocLatestAiDecisionResponse,
  type AiOverrideOrClosureResponse,
  type AiSimilarDetectionsResponse,
  type V2AlertDetailResponse,
  type AlertRuleWorkflowResponse,
  type AuditLogListResponse,
  type ArchiveRecordResponse,
  type CaseResponse,
  type CaseRuleWorkflowResponse,
  type CoveragePainAnalysisResponse,
  type DetectionDetailResponse,
  type DetectionHistoryResponse,
  type ManagedServerConnectionSecretMetadataResponse,
  type ManagedServerInventoryResponse,
  type ManagedServerResponse,
  type FeedSourceResponse,
  type GeneratedReportResponse,
  type IocListResponse,
  type PowerBiVisualizationCatalogResponse,
  type ReportListResponse,
  type ScanJobResponse,
  type ScanJobTargetExecutionResponse,
  type ScanAnalystAgentStatusResponse,
  type ScanAnalystChatResponse,
  type ScanAnalystRunSummaryResponse,
  type ScanPlanResponse,
  type RuleDistributionAttemptResponse,
  type RuleDistributionJobResponse,
  type RuleDistributionTargetResponse,
  type ScannerResponse,
  type DiscoveredHostResponse,
  type DiscoveryRunResponse,
  type DecisionResponse,
  type DeploymentResponse,
  type EvidenceResponse,
  type FeedbackResponse,
  type HealthAdmin,
  type HealthInfo,
  type HealthReady,
  type JobRunResponse,
  type PermissionResponse,
  type PromoteDiscoveredHostResponse,
  type RetentionPolicyResponse,
  type RoleResponse,
  type RolePermissionResponse,
  type RollbackPlanResponse,
  type RolloutPlanResponse,
  type RuleProposalResponse,
  type RuleImportAttempt,
  type RuleListResponse,
  type RuleRevisionItem,
  type RuleDetail,
  type RuleSimulationResultResponse,
  type RuleResponse,
  type SubnetResponse,
  type TargetGroupMemberResponse,
  type TargetGroupResponse,
  type TargetServerResponse,
  type TokenResponse,
  type SubmitAiDecisionAcceptedResponse,
  type UserResponse,
} from "@/shared/api/schemas"
import type {
  AdvanceRolloutStageInput,
  AiDecisionCursorQuery,
  AlertListQuery,
  ArchiveRuleInput,
  AuditLogListQuery,
  CreateDistributionJobInput,
  CreateScanPlanInput,
  CoveragePainAnalysisScopeInput,
  CreateRetentionPolicyInput,
  CreateRuleRepositoryInput,
  CreateManagedServerInput,
  CreateScannerInput,
  CreateWorkbenchPermissionInput,
  CreateWorkbenchRoleInput,
  CreateWorkbenchUserInput,
  CreateRuleProposalInput,
  DetectionListQuery,
  ExecuteRetentionPolicyInput,
  SubmitAiDecisionInput,
  SubmitAiDecisionOverrideOrClosureInput,
  IocListQuery,
  ManagedServerInventoryFilters,
  PromoteDiscoveredHostInput,
  DistributionJobFilters,
  ScanJobFilters,
  QueueDiscoveryRunInput,
  RecordCanaryObservationInput,
  RestoreRuleInput,
  RuleRepositoryListQuery,
  RotateManagedServerConnectionSecretInput,
  GenerateReportInput,
  ReportListQuery,
  ReviewRuleProposalInput,
  SettingsAdminVM,
  SimulateRuleProposalInput,
  TriggerRollbackInput,
  RetryDistributionJobInput,
  SendScanAnalystChatTurnInput,
  AssignWorkbenchRolePermissionInput,
  ImportRuleFileInput,
  UpdateScannerCapabilitiesInput,
  UpdateRuleRepositoryInput,
  UpdateScanPlanInput,
  UpdateManagedServerInput,
  UpsertManagedServerScannerAssignmentInput,
} from "@/shared/gateway/types"

const alertsSchema = z.array(alertResponseSchema)
const evidenceSchema = z.array(evidenceResponseSchema)
const decisionsSchema = z.array(decisionResponseSchema)
const rulesSchema = z.array(ruleResponseSchema)
const deploymentsSchema = z.array(deploymentResponseSchema)
const feedbackSchema = z.array(feedbackResponseSchema)
const jobsSchema = z.array(jobRunResponseSchema)
const usersSchema = z.array(userResponseSchema)
const rolesSchema = z.array(roleResponseSchema)
const permissionsSchema = z.array(permissionResponseSchema)
const rolePermissionsSchema = z.array(rolePermissionResponseSchema)
const retentionPoliciesSchema = z.array(retentionPolicyResponseSchema)
const archiveRecordsSchema = z.array(archiveRecordResponseSchema)
const subnetsSchema = z.array(subnetResponseSchema)
const targetServersSchema = z.array(targetServerResponseSchema)
const targetGroupsSchema = z.array(targetGroupResponseSchema)
const targetGroupMembersSchema = z.array(targetGroupMemberResponseSchema)
const ruleDistributionJobsSchema = z.array(ruleDistributionJobResponseSchema)
const ruleDistributionAttemptsSchema = z.array(ruleDistributionAttemptResponseSchema)
const ruleDistributionTargetsSchema = z.array(ruleDistributionTargetResponseSchema)
const scanPlansSchema = z.array(scanPlanResponseSchema)
const scanJobsSchema = z.array(scanJobResponseSchema)
const scanJobTargetsSchema = z.array(scanJobTargetExecutionResponseSchema)
const scannersSchema = z.array(scannerResponseSchema)
const discoveryRunsSchema = z.array(discoveryRunResponseSchema)
const discoveredHostsSchema = z.array(discoveredHostResponseSchema)
const recommendationsSchema = z.array(deploymentRecommendationResponseSchema)
const rolloutsSchema = z.array(rolloutPlanResponseSchema)
const rollbacksSchema = z.array(rollbackPlanResponseSchema)
const ruleRevisionsSchema = z.array(ruleRevisionItemSchema)
const ruleImportAttemptsSchema = z.array(ruleImportAttemptSchema)

function isRecoverableCompatibilityReadError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (error.isSchemaValidationFailure) {
    return true
  }

  const message = `${error.detail ?? ""} ${error.message ?? ""}`.toLowerCase()
  const hasCompatibilityMarker =
    message.includes("invalid object name") ||
    message.includes("invalid column name") ||
    message.includes("cannot find the object") ||
    message.includes("does not exist") ||
    message.includes("sql exception")

  return error.status >= 500 && hasCompatibilityMarker
}

async function withLegacyEmptyFallback<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isRecoverableCompatibilityReadError(error)) {
      return await fallback()
    }

    throw error
  }
}

export class AspNetGateway {
  async login(username: string, password: string): Promise<TokenResponse> {
    return requestJson("/api/auth/token", tokenResponseSchema, {
      method: "POST",
      auth: false,
      body: {
        userName: username,
        password,
      },
    })
  }

  async listAlertRegistry(query: AlertListQuery = {}, signal?: AbortSignal): Promise<AlertListResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.status) {
      params.set("status", query.status)
    }
    if (query.severity) {
      params.set("severity", query.severity)
    }
    if (query.family) {
      params.set("family", query.family)
    }
    if (query.targetId) {
      params.set("targetId", query.targetId)
    } else if (query.serverId && /^\d+$/.test(query.serverId)) {
      params.set("targetId", query.serverId)
    }
    if (query.ownerUserId) {
      params.set("ownerUserId", query.ownerUserId)
    }
    if (query.fromUtc) {
      params.set("fromUtc", query.fromUtc)
    }
    if (query.toUtc) {
      params.set("toUtc", query.toUtc)
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/alerts${suffix}`, alertListResponseSchema, { signal })
  }

  async listAlerts(signal?: AbortSignal): Promise<AlertResponse[]> {
    return requestJson("/api/alerts", alertsSchema, { signal })
  }

  async getAlert(alertId: string, signal?: AbortSignal): Promise<AlertResponse> {
    return requestJson(`/api/alerts/${alertId}`, alertResponseSchema, { signal })
  }

  async getAlertDetail(alertId: string, signal?: AbortSignal): Promise<V2AlertDetailResponse> {
    return requestJson(`/api/v2/alerts/${alertId}`, v2AlertDetailResponseSchema, { signal })
  }

  async updateAlertStatus(alertId: string, status: string, actorUserId: string): Promise<V2AlertDetailResponse> {
    return requestJson(`/api/v2/alerts/${alertId}/status`, v2AlertDetailResponseSchema, {
      method: "PATCH",
      body: {
        status,
        actorUserId,
      },
    })
  }

  // Legacy aliases retained for one release cycle.
  async listCases(signal?: AbortSignal): Promise<CaseResponse[]> {
    return this.listAlerts(signal)
  }

  // Legacy aliases retained for one release cycle.
  async getCase(caseId: string, signal?: AbortSignal): Promise<CaseResponse> {
    return this.getAlert(caseId, signal)
  }

  async listReports(query: ReportListQuery = {}, signal?: AbortSignal): Promise<ReportListResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.reportType) {
      params.set("reportType", query.reportType)
    }
    if (query.severity) {
      params.set("severity", query.severity)
    }
    if (query.status) {
      params.set("status", query.status)
    }
    if (query.family) {
      params.set("family", query.family)
    }
    if (query.serverId) {
      params.set("serverId", query.serverId)
    }
    if (query.fromUtc) {
      params.set("fromUtc", query.fromUtc)
    }
    if (query.toUtc) {
      params.set("toUtc", query.toUtc)
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/reports${suffix}`, reportListResponseSchema, { signal })
  }

  async generateReport(input: GenerateReportInput): Promise<GeneratedReportResponse> {
    return requestJson("/api/v2/reports/generate", generatedReportResponseSchema, {
      method: "POST",
      body: {
        reportType: input.reportType,
        title: input.title ?? null,
        fromUtc: input.fromUtc ?? null,
        toUtc: input.toUtc ?? null,
        targetServerId: input.targetServerId ?? null,
        scannerFamily: input.scannerFamily ?? null,
        severity: input.severity ?? null,
        status: input.status ?? null,
        iocType: input.iocType ?? null,
        source: input.source ?? null,
        persist: input.persist ?? false,
        actorUserId: input.actorUserId,
      },
    })
  }

  async deleteReport(reportId: string): Promise<void> {
    await requestJson(`/api/v2/reports/${encodeURIComponent(reportId)}`, z.null(), { method: "DELETE" })
  }

  async getPowerBiVisualizationCatalog(signal?: AbortSignal): Promise<PowerBiVisualizationCatalogResponse> {
    return requestJson("/api/v2/reports/power-bi", powerBiVisualizationCatalogResponseSchema, { signal })
  }

  async listAuditLogs(query: AuditLogListQuery = {}, signal?: AbortSignal): Promise<AuditLogListResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.actorUserId) {
      params.set("actorUserId", query.actorUserId)
    }
    if (query.actionType) {
      params.set("actionType", query.actionType)
    }
    if (query.entityType) {
      params.set("entityType", query.entityType)
    }
    if (query.fromUtc) {
      params.set("fromUtc", query.fromUtc)
    }
    if (query.toUtc) {
      params.set("toUtc", query.toUtc)
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/audit-logs${suffix}`, auditLogListResponseSchema, { signal })
  }

  async listEvidence(caseId: string, signal?: AbortSignal): Promise<EvidenceResponse[]> {
    return withLegacyEmptyFallback(() => requestJson(`/api/evidence/alert/${caseId}`, evidenceSchema, { signal }), () => [])
  }

  async listDecisions(caseId: string, signal?: AbortSignal): Promise<DecisionResponse[]> {
    return withLegacyEmptyFallback(() => requestJson(`/api/decisions/alert/${caseId}`, decisionsSchema, { signal }), () => [])
  }

  async listRules(caseId: string, signal?: AbortSignal): Promise<RuleResponse[]> {
    return withLegacyEmptyFallback(() => requestJson(`/api/rules/alert/${caseId}`, rulesSchema, { signal }), () => [])
  }

  async listRuleRepository(query: RuleRepositoryListQuery = {}, signal?: AbortSignal): Promise<RuleListResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.includeContent) {
      params.set("includeContent", "true")
    }
    if (query.family) {
      params.set("family", query.family)
    }
    if (query.severity) {
      params.set("severity", query.severity)
    }
    if (query.status) {
      params.set("status", query.status)
    }
    if (query.scopeType) {
      params.set("scopeType", query.scopeType)
    }
    if (query.source) {
      params.set("source", query.source)
    }
    if (query.tags && query.tags.length > 0) {
      params.set("tags", query.tags.join(","))
    }
    if (query.includeDeleted) {
      params.set("includeDeleted", "true")
    }
    if (query.fromUtc ?? query.updatedFromUtc) {
      params.set("fromUtc", query.fromUtc ?? query.updatedFromUtc ?? "")
    }
    if (query.toUtc ?? query.updatedToUtc) {
      params.set("toUtc", query.toUtc ?? query.updatedToUtc ?? "")
    }
    if (query.actor) {
      params.set("actor", query.actor)
    }
    if (query.version) {
      params.set("version", query.version)
    }
    if (query.sort) {
      params.set("sort", query.sort)
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/rules${suffix}`, ruleListResponseSchema, { signal })
  }

  async getRuleDetail(ruleId: string, signal?: AbortSignal): Promise<RuleDetail> {
    return requestJson(`/api/v2/rules/${ruleId}`, ruleDetailSchema, { signal })
  }

  async createRule(input: CreateRuleRepositoryInput): Promise<RuleDetail> {
    return requestJson("/api/v2/rules", ruleDetailSchema, {
      method: "POST",
      body: {
        name: input.name,
        ruleFamily: input.ruleFamily,
        source: input.source,
        description: input.description,
        tags: input.tags,
        severity: input.severity,
        status: input.status,
        scopeType: input.scopeType,
        scopeValue: input.scopeValue ?? null,
        versionLabel: input.versionLabel,
        originalContent: input.originalContent,
        actorUserId: input.actorUserId,
        changeReason: input.changeReason ?? null,
      },
    })
  }

  async importRuleFile(input: ImportRuleFileInput): Promise<RuleImportAttempt> {
    const form = new FormData()
    form.append("file", input.file)
    form.append("declaredRuleFamily", input.declaredRuleFamily)
    form.append("actorUserId", input.actorUserId)
    if (input.name) {
      form.append("name", input.name)
    }
    if (input.source) {
      form.append("source", input.source)
    }
    if (input.description) {
      form.append("description", input.description)
    }
    if (input.tags && input.tags.length > 0) {
      form.append("tags", input.tags.join(","))
    }
    if (input.severity) {
      form.append("severity", input.severity)
    }
    if (input.status) {
      form.append("status", input.status)
    }
    if (input.scopeType) {
      form.append("scopeType", input.scopeType)
    }
    if (input.scopeValue) {
      form.append("scopeValue", input.scopeValue)
    }
    if (input.versionLabel) {
      form.append("versionLabel", input.versionLabel)
    }
    if (input.changeReason) {
      form.append("changeReason", input.changeReason)
    }

    return requestForm("/api/v2/rules/import", ruleImportAttemptSchema, {
      method: "POST",
      formData: form,
    })
  }

  async updateRule(ruleId: string, input: UpdateRuleRepositoryInput): Promise<RuleDetail> {
    return requestJson(`/api/v2/rules/${ruleId}`, ruleDetailSchema, {
      method: "PATCH",
      body: {
        name: input.name,
        ruleFamily: input.ruleFamily,
        source: input.source,
        description: input.description,
        tags: input.tags,
        severity: input.severity,
        status: input.status,
        scopeType: input.scopeType,
        scopeValue: input.scopeValue ?? null,
        versionLabel: input.versionLabel,
        originalContent: input.originalContent,
        actorUserId: input.actorUserId,
        changeReason: input.changeReason ?? null,
      },
    })
  }

  async listRuleRevisions(ruleId: string, signal?: AbortSignal): Promise<RuleRevisionItem[]> {
    return requestJson(`/api/v2/rules/${ruleId}/revisions`, ruleRevisionsSchema, { signal })
  }

  async listRuleImportAttempts(ruleId: string, signal?: AbortSignal): Promise<RuleImportAttempt[]> {
    return requestJson(`/api/v2/rules/${ruleId}/imports`, ruleImportAttemptsSchema, { signal })
  }

  async archiveRule(ruleId: string, input: ArchiveRuleInput): Promise<void> {
    await requestJson(`/api/v2/rules/${ruleId}`, z.null(), {
      method: "DELETE",
      body: {
        actorUserId: input.actorUserId,
        changeReason: input.changeReason ?? null,
      },
    })
  }

  async restoreRule(ruleId: string, input: RestoreRuleInput): Promise<RuleDetail> {
    return requestJson(`/api/v2/rules/${ruleId}/restore`, ruleDetailSchema, {
      method: "POST",
      body: {
        actorUserId: input.actorUserId,
        changeReason: input.changeReason ?? null,
        restoredStatus: input.restoredStatus ?? null,
      },
    })
  }

  async listDeployments(caseId: string, signal?: AbortSignal): Promise<DeploymentResponse[]> {
    return withLegacyEmptyFallback(() => requestJson(`/api/deployments/alert/${caseId}`, deploymentsSchema, { signal }), () => [])
  }

  async listAllDeployments(signal?: AbortSignal): Promise<DeploymentResponse[]> {
    const alerts = await this.listAlerts(signal)
    const results = await Promise.allSettled(alerts.map((item) => this.listDeployments(item.id, signal)))
    const merged: DeploymentResponse[] = []
    for (const result of results) {
      if (result.status === "fulfilled") {
        merged.push(...result.value)
      }
    }

    return merged.sort((a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc))
  }

  async listFeedback(caseId: string, signal?: AbortSignal): Promise<FeedbackResponse[]> {
    return withLegacyEmptyFallback(() => requestJson(`/api/feedback/alert/${caseId}`, feedbackSchema, { signal }), () => [])
  }

  async listJobRuns(signal?: AbortSignal): Promise<JobRunResponse[]> {
    return requestJson("/api/admin/jobs/runs?take=20", jobsSchema, { signal })
  }

  async listUsers(signal?: AbortSignal): Promise<UserResponse[]> {
    return requestJson("/api/v2/identity/users", usersSchema, { signal })
  }

  async listRoles(signal?: AbortSignal): Promise<RoleResponse[]> {
    return requestJson("/api/v2/identity/roles", rolesSchema, { signal })
  }

  async listPermissions(signal?: AbortSignal): Promise<PermissionResponse[]> {
    return requestJson("/api/v2/identity/permissions", permissionsSchema, { signal })
  }

  async listRolePermissions(roleId?: string, signal?: AbortSignal): Promise<RolePermissionResponse[]> {
    const params = new URLSearchParams()
    if (roleId) {
      params.set("roleId", roleId)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/identity/role-permissions${suffix}`, rolePermissionsSchema, { signal })
  }

  async createUser(input: CreateWorkbenchUserInput): Promise<UserResponse> {
    return requestJson("/api/v2/identity/users", userResponseSchema, {
      method: "POST",
      body: {
        userName: input.userName,
        email: input.email,
        displayName: input.displayName,
        password: input.password,
        roles: input.roles,
      },
    })
  }

  async createRole(input: CreateWorkbenchRoleInput): Promise<RoleResponse> {
    return requestJson("/api/v2/identity/roles", roleResponseSchema, {
      method: "POST",
      body: {
        name: input.name,
      },
    })
  }

  async createPermission(input: CreateWorkbenchPermissionInput): Promise<PermissionResponse> {
    return requestJson("/api/v2/identity/permissions", permissionResponseSchema, {
      method: "POST",
      body: {
        key: input.key,
        description: input.description,
        actorUserId: input.actorUserId,
      },
    })
  }

  async assignRolePermission(input: AssignWorkbenchRolePermissionInput): Promise<RolePermissionResponse> {
    return requestJson("/api/v2/identity/role-permissions", rolePermissionResponseSchema, {
      method: "POST",
      body: {
        roleId: input.roleId,
        permissionId: input.permissionId,
        actorUserId: input.actorUserId,
      },
    })
  }

  async listRetentionPolicies(signal?: AbortSignal): Promise<RetentionPolicyResponse[]> {
    return requestJson("/api/v2/retention/policies", retentionPoliciesSchema, { signal })
  }

  async createRetentionPolicy(input: CreateRetentionPolicyInput): Promise<RetentionPolicyResponse> {
    return requestJson("/api/v2/retention/policies", retentionPolicyResponseSchema, {
      method: "POST",
      body: {
        dataType: input.dataType,
        retainDays: input.retainDays,
        archiveAfterDays: input.archiveAfterDays,
        actorUserId: input.actorUserId,
      },
    })
  }

  async listArchiveRecords(retentionPolicyId?: string, signal?: AbortSignal): Promise<ArchiveRecordResponse[]> {
    const params = new URLSearchParams()
    if (retentionPolicyId) {
      params.set("retentionPolicyId", retentionPolicyId)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/retention/archives${suffix}`, archiveRecordsSchema, { signal })
  }

  async executeRetentionPolicy(input: ExecuteRetentionPolicyInput): Promise<ArchiveRecordResponse[]> {
    return requestJson("/api/v2/retention/execute", archiveRecordsSchema, {
      method: "POST",
      body: {
        retentionPolicyId: input.retentionPolicyId,
        archiveUriPrefix: input.archiveUriPrefix,
        actorUserId: input.actorUserId,
      },
    })
  }

  async listSubnets(signal?: AbortSignal): Promise<SubnetResponse[]> {
    return requestJson("/api/v2/infrastructure/subnets", subnetsSchema, { signal })
  }

  async listFeedSources(signal?: AbortSignal): Promise<FeedSourceResponse[]> {
    return requestJson("/api/v2/iocs/feed-sources", z.array(feedSourceResponseSchema), { signal })
  }

  async listIocs(query: IocListQuery = {}, signal?: AbortSignal): Promise<IocListResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.severity) {
      params.set("severity", query.severity)
    }
    if (query.type) {
      params.set("type", query.type)
    }
    if (query.source) {
      params.set("source", query.source)
    }
    if (query.feedSourceId) {
      params.set("feedSourceId", query.feedSourceId)
    }
    if (query.fromUtc) {
      params.set("fromUtc", query.fromUtc)
    }
    if (query.toUtc) {
      params.set("toUtc", query.toUtc)
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/iocs${suffix}`, iocListResponseSchema, { signal })
  }

  async listTargetServers(subnetId?: string, signal?: AbortSignal): Promise<TargetServerResponse[]> {
    const params = new URLSearchParams()
    if (subnetId) {
      params.set("subnetId", subnetId)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/infrastructure/target-servers${suffix}`, targetServersSchema, { signal })
  }

  async listTargetGroups(signal?: AbortSignal): Promise<TargetGroupResponse[]> {
    return requestJson("/api/v2/infrastructure/target-groups", targetGroupsSchema, { signal })
  }

  async listTargetGroupMembers(targetGroupId: string, signal?: AbortSignal): Promise<TargetGroupMemberResponse[]> {
    return requestJson(`/api/v2/infrastructure/target-groups/${targetGroupId}/members`, targetGroupMembersSchema, { signal })
  }

  async listDistributionJobs(filters: DistributionJobFilters = {}, signal?: AbortSignal): Promise<RuleDistributionJobResponse[]> {
    const params = new URLSearchParams()
    if (filters.status) {
      params.set("status", filters.status)
    }
    if (filters.operatorUserId) {
      params.set("operatorUserId", filters.operatorUserId)
    }
    if (filters.ruleRevisionId) {
      params.set("ruleRevisionId", filters.ruleRevisionId)
    }
    if (filters.ruleFamily) {
      params.set("ruleFamily", filters.ruleFamily)
    }
    if (filters.targetServerId) {
      params.set("targetServerId", filters.targetServerId)
    }
    if (filters.targetGroupId) {
      params.set("targetGroupId", filters.targetGroupId)
    }
    if (filters.queuedFromUtc) {
      params.set("queuedFromUtc", filters.queuedFromUtc)
    }
    if (filters.queuedToUtc) {
      params.set("queuedToUtc", filters.queuedToUtc)
    }
    if (typeof filters.take === "number") {
      params.set("take", String(filters.take))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/rules/distribution-jobs${suffix}`, ruleDistributionJobsSchema, { signal })
  }

  async getDistributionJob(jobId: string, signal?: AbortSignal): Promise<RuleDistributionJobResponse> {
    return requestJson(`/api/v2/rules/distribution-jobs/${jobId}`, ruleDistributionJobResponseSchema, { signal })
  }

  async listDistributionJobAttempts(jobId: string, signal?: AbortSignal): Promise<RuleDistributionAttemptResponse[]> {
    return requestJson(`/api/v2/rules/distribution-jobs/${jobId}/attempts`, ruleDistributionAttemptsSchema, { signal })
  }

  async listDistributionJobTargets(jobId: string, signal?: AbortSignal): Promise<RuleDistributionTargetResponse[]> {
    return requestJson(`/api/v2/rules/distribution-jobs/${jobId}/targets`, ruleDistributionTargetsSchema, { signal })
  }

  async createDistributionJob(input: CreateDistributionJobInput): Promise<RuleDistributionJobResponse> {
    return requestJson("/api/v2/rules/distribution-jobs", ruleDistributionJobResponseSchema, {
      method: "POST",
      body: {
        ruleRevisionId: input.ruleRevisionId,
        targetServerIds: input.targetServerIds,
        targetGroupIds: input.targetGroupIds,
        operatorUserId: input.operatorUserId,
        notes: input.notes ?? null,
        maxAttempts: input.maxAttempts ?? null,
      },
    })
  }

  async retryDistributionJob(jobId: string, input: RetryDistributionJobInput): Promise<RuleDistributionJobResponse> {
    return requestJson(`/api/v2/rules/distribution-jobs/${jobId}/retry`, ruleDistributionJobResponseSchema, {
      method: "POST",
      body: {
        actorUserId: input.actorUserId,
        notes: input.notes ?? null,
      },
    })
  }

  async listScanPlans(signal?: AbortSignal): Promise<ScanPlanResponse[]> {
    return requestJson("/api/v2/scanning/plans", scanPlansSchema, { signal })
  }

  async getScanPlan(scanPlanId: string, signal?: AbortSignal): Promise<ScanPlanResponse> {
    return requestJson(`/api/v2/scanning/plans/${scanPlanId}`, scanPlanResponseSchema, { signal })
  }

  async createScanPlan(input: CreateScanPlanInput): Promise<ScanPlanResponse> {
    return requestJson("/api/v2/scanning/plans", scanPlanResponseSchema, {
      method: "POST",
      body: {
        name: input.name,
        description: input.description,
        scannerCapability: input.scannerCapability,
        ruleSelectionMode: input.ruleSelectionMode,
        ruleScopeType: input.ruleScopeType ?? null,
        ruleScopeValue: input.ruleScopeValue ?? null,
        cadenceType: input.cadenceType,
        intervalMinutes: input.intervalMinutes ?? null,
        runAtHourUtc: input.runAtHourUtc ?? null,
        runAtMinuteUtc: input.runAtMinuteUtc ?? null,
        weeklyDayOfWeek: input.weeklyDayOfWeek ?? null,
        operatorNotes: input.operatorNotes ?? null,
        status: input.status ?? null,
        actorUserId: input.actorUserId,
        targetServerIds: input.targetServerIds,
        ruleRevisionIds: input.ruleRevisionIds,
      },
    })
  }

  async updateScanPlan(scanPlanId: string, input: UpdateScanPlanInput): Promise<ScanPlanResponse> {
    return requestJson(`/api/v2/scanning/plans/${scanPlanId}`, scanPlanResponseSchema, {
      method: "PUT",
      body: {
        name: input.name,
        description: input.description,
        scannerCapability: input.scannerCapability,
        ruleSelectionMode: input.ruleSelectionMode,
        ruleScopeType: input.ruleScopeType ?? null,
        ruleScopeValue: input.ruleScopeValue ?? null,
        cadenceType: input.cadenceType,
        intervalMinutes: input.intervalMinutes ?? null,
        runAtHourUtc: input.runAtHourUtc ?? null,
        runAtMinuteUtc: input.runAtMinuteUtc ?? null,
        weeklyDayOfWeek: input.weeklyDayOfWeek ?? null,
        operatorNotes: input.operatorNotes ?? null,
        status: input.status,
        actorUserId: input.actorUserId,
        targetServerIds: input.targetServerIds,
        ruleRevisionIds: input.ruleRevisionIds,
      },
    })
  }

  async runScanPlan(scanPlanId: string, actorUserId: string, triggerSource?: string): Promise<ScanJobResponse> {
    return requestJson(`/api/v2/scanning/plans/${scanPlanId}/run`, scanJobResponseSchema, {
      method: "POST",
      body: {
        actorUserId,
        triggerSource: triggerSource ?? "Manual",
      },
    })
  }

  async listScanJobs(filters: ScanJobFilters = {}, signal?: AbortSignal): Promise<ScanJobResponse[]> {
    const params = new URLSearchParams()
    if (filters.scanPlanId) {
      params.set("scanPlanId", filters.scanPlanId)
    }
    if (filters.status) {
      params.set("status", filters.status)
    }
    if (filters.queuedFromUtc) {
      params.set("queuedFromUtc", filters.queuedFromUtc)
    }
    if (filters.queuedToUtc) {
      params.set("queuedToUtc", filters.queuedToUtc)
    }
    if (typeof filters.take === "number") {
      params.set("take", String(filters.take))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/scanning/jobs${suffix}`, scanJobsSchema, { signal })
  }

  async getScanJob(scanJobId: string, signal?: AbortSignal): Promise<ScanJobResponse> {
    return requestJson(`/api/v2/scanning/jobs/${scanJobId}`, scanJobResponseSchema, { signal })
  }

  async listScanJobTargets(scanJobId: string, signal?: AbortSignal): Promise<ScanJobTargetExecutionResponse[]> {
    return requestJson(`/api/v2/scanning/jobs/${scanJobId}/targets`, scanJobTargetsSchema, { signal })
  }

  async cancelScanJob(scanJobId: string, actorUserId: string, reason?: string): Promise<ScanJobResponse> {
    return requestJson(`/api/v2/scanning/jobs/${scanJobId}/cancel`, scanJobResponseSchema, {
      method: "POST",
      body: {
        actorUserId,
        reason: reason ?? null,
      },
    })
  }

  async getScanAnalystStatus(signal?: AbortSignal): Promise<ScanAnalystAgentStatusResponse> {
    return requestJson("/api/v2/ai/scan-analyst/status", scanAnalystAgentStatusResponseSchema, { signal })
  }

  async sendScanAnalystChatTurn(input: SendScanAnalystChatTurnInput): Promise<ScanAnalystChatResponse> {
    return requestJson("/api/v2/ai/scan-analyst/chat", scanAnalystChatResponseSchema, {
      method: "POST",
      body: {
        sessionId: input.sessionId ?? null,
        actorUserId: input.actorUserId,
        message: input.message,
        action: input.action,
        subnetId: input.subnetId ?? null,
        preferredScannerCapability: input.preferredScannerCapability ?? null,
        maxTargetCount: input.maxTargetCount ?? null,
        editedPlan: input.editedPlan ?? null,
        simulatedConditions: input.simulatedConditions ?? null,
      },
    })
  }

  async getScanAnalystRunSummary(scanJobId: string, signal?: AbortSignal): Promise<ScanAnalystRunSummaryResponse> {
    return requestJson(`/api/v2/ai/scan-analyst/runs/${scanJobId}/summary`, scanAnalystRunSummaryResponseSchema, { signal })
  }

  async listManagedServers(
    filters: ManagedServerInventoryFilters = {},
    signal?: AbortSignal,
  ): Promise<ManagedServerInventoryResponse> {
    const params = new URLSearchParams()
    if (filters.q) {
      params.set("q", filters.q)
    }
    if (filters.status) {
      params.set("status", filters.status)
    }
    if (filters.scannerCapability) {
      params.set("scannerCapability", filters.scannerCapability)
    }
    if (filters.subnetId) {
      params.set("subnetId", filters.subnetId)
    }
    if (filters.lastContact) {
      params.set("lastContact", filters.lastContact)
    }
    if (filters.environment) {
      params.set("environment", filters.environment)
    }
    if (filters.fromUtc) {
      params.set("fromUtc", filters.fromUtc)
    }
    if (filters.toUtc) {
      params.set("toUtc", filters.toUtc)
    }
    if (typeof filters.page === "number") {
      params.set("page", String(filters.page))
    }
    if (typeof filters.pageSize === "number") {
      params.set("pageSize", String(filters.pageSize))
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/infrastructure/managed-servers${suffix}`, managedServerInventoryResponseSchema, { signal })
  }

  async getManagedServer(targetServerId: string, signal?: AbortSignal): Promise<ManagedServerResponse> {
    return requestJson(`/api/v2/infrastructure/managed-servers/${targetServerId}`, managedServerResponseSchema, { signal })
  }

  async createManagedServer(input: CreateManagedServerInput): Promise<void> {
    await requestJson("/api/v2/infrastructure/managed-servers", managedServerResponseSchema, {
      method: "POST",
      body: {
        subnetId: input.subnetId,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        operatingSystem: input.operatingSystem,
        environment: input.environment,
        actorUserId: input.actorUserId,
        status: input.status ?? null,
        connectivityStatus: input.connectivityStatus ?? null,
        connectionProtocol: input.connectionProtocol ?? null,
        connectionHost: input.connectionHost ?? null,
        connectionPort: input.connectionPort ?? null,
        connectionAuthMode: input.connectionAuthMode ?? null,
        connectionUsername: input.connectionUsername ?? null,
      },
    })
  }

  async updateManagedServer(targetServerId: string, input: UpdateManagedServerInput): Promise<void> {
    await requestJson(`/api/v2/infrastructure/managed-servers/${targetServerId}`, managedServerResponseSchema, {
      method: "PUT",
      body: {
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        operatingSystem: input.operatingSystem,
        environment: input.environment,
        actorUserId: input.actorUserId,
        status: input.status ?? null,
        connectivityStatus: input.connectivityStatus ?? null,
        connectionProtocol: input.connectionProtocol ?? null,
        connectionHost: input.connectionHost ?? null,
        connectionPort: input.connectionPort ?? null,
        connectionAuthMode: input.connectionAuthMode ?? null,
        connectionUsername: input.connectionUsername ?? null,
      },
    })
  }

  async rotateManagedServerConnectionSecret(
    targetServerId: string,
    input: RotateManagedServerConnectionSecretInput,
  ): Promise<ManagedServerConnectionSecretMetadataResponse> {
    return requestJson(
      `/api/v2/infrastructure/managed-servers/${targetServerId}/connection-secret`,
      managedServerConnectionSecretMetadataResponseSchema,
      {
        method: "POST",
        body: {
          secretPayload: input.secretPayload,
          actorUserId: input.actorUserId,
        },
      },
    )
  }

  async upsertManagedServerScannerAssignment(
    targetServerId: string,
    scannerId: string,
    input: UpsertManagedServerScannerAssignmentInput,
  ): Promise<void> {
    await requestJson(
      `/api/v2/infrastructure/managed-servers/${targetServerId}/scanner-assignments/${scannerId}`,
      managedServerScannerAssignmentResponseSchema,
      {
        method: "PUT",
        body: {
          connectivityStatus: input.connectivityStatus,
          lastHeartbeatUtc: input.lastHeartbeatUtc ?? null,
          lastContactUtc: input.lastContactUtc ?? null,
          isEnabled: input.isEnabled,
          actorUserId: input.actorUserId,
        },
      },
    )
  }

  async removeManagedServerScannerAssignment(targetServerId: string, scannerId: string): Promise<void> {
    await requestJson(`/api/v2/infrastructure/managed-servers/${targetServerId}/scanner-assignments/${scannerId}`, z.null(), {
      method: "DELETE",
    })
  }

  async listScanners(signal?: AbortSignal): Promise<ScannerResponse[]> {
    return requestJson("/api/v2/infrastructure/scanners", scannersSchema, { signal })
  }

  async createScanner(input: CreateScannerInput): Promise<ScannerResponse> {
    return requestJson("/api/v2/infrastructure/scanners", scannerResponseSchema, {
      method: "POST",
      body: {
        name: input.name,
        engineType: input.engineType,
        version: input.version,
        actorUserId: input.actorUserId,
        capabilities: input.capabilities ?? null,
      },
    })
  }

  async updateScannerCapabilities(scannerId: string, input: UpdateScannerCapabilitiesInput): Promise<ScannerResponse> {
    return requestJson(`/api/v2/infrastructure/scanners/${scannerId}/capabilities`, scannerResponseSchema, {
      method: "PUT",
      body: {
        capabilities: input.capabilities,
        actorUserId: input.actorUserId,
      },
    })
  }

  async queueDiscoveryRun(input: QueueDiscoveryRunInput): Promise<DiscoveryRunResponse> {
    return requestJson("/api/v2/infrastructure/discovery/runs", discoveryRunResponseSchema, {
      method: "POST",
      body: {
        subnetId: input.subnetId,
        actorUserId: input.actorUserId,
        rangeStartIp: input.rangeStartIp ?? null,
        rangeEndIp: input.rangeEndIp ?? null,
      },
    })
  }

  async listDiscoveryRuns(subnetId?: string, signal?: AbortSignal): Promise<DiscoveryRunResponse[]> {
    const params = new URLSearchParams()
    if (subnetId) {
      params.set("subnetId", subnetId)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/infrastructure/discovery/runs${suffix}`, discoveryRunsSchema, { signal })
  }

  async listDiscoveredHosts(subnetId?: string, signal?: AbortSignal): Promise<DiscoveredHostResponse[]> {
    const params = new URLSearchParams()
    if (subnetId) {
      params.set("subnetId", subnetId)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/infrastructure/discovered-hosts${suffix}`, discoveredHostsSchema, { signal })
  }

  async promoteDiscoveredHost(
    discoveredHostId: string,
    input: PromoteDiscoveredHostInput,
  ): Promise<PromoteDiscoveredHostResponse> {
    return requestJson(
      `/api/v2/infrastructure/discovered-hosts/${discoveredHostId}/promote`,
      promoteDiscoveredHostResponseSchema,
      {
        method: "POST",
        body: {
          hostname: input.hostname,
          operatingSystem: input.operatingSystem,
          environment: input.environment,
          actorUserId: input.actorUserId,
        },
      },
    )
  }

  async listDetections(query: DetectionListQuery = {}, signal?: AbortSignal): Promise<DetectionHistoryResponse> {
    const params = new URLSearchParams()
    if (query.q) {
      params.set("q", query.q)
    }
    if (query.family) {
      params.set("family", query.family)
    }
    if (query.status) {
      params.set("status", query.status)
    }
    if (query.source) {
      params.set("source", query.source)
    }
    if (query.serverId) {
      params.set("serverId", query.serverId)
    }
    if (query.iocId) {
      params.set("iocId", query.iocId)
    }
    if (query.ruleRevisionId) {
      params.set("ruleRevisionId", query.ruleRevisionId)
    }
    if (query.scanJobId) {
      params.set("scanJobId", query.scanJobId)
    }
    if (query.fromUtc) {
      params.set("fromUtc", query.fromUtc)
    }
    if (query.toUtc) {
      params.set("toUtc", query.toUtc)
    }
    if (query.includeProvenance) {
      params.set("includeProvenance", "true")
    }
    if (typeof query.page === "number") {
      params.set("page", String(query.page))
    }
    if (typeof query.pageSize === "number") {
      params.set("pageSize", String(query.pageSize))
    }
    if (query.sort) {
      params.set("sort", query.sort)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(`/api/v2/scanning/results${suffix}`, detectionHistoryResponseSchema, { signal })
  }

  async getDetectionDetail(detectionId: string, signal?: AbortSignal): Promise<DetectionDetailResponse> {
    return requestJson(`/api/v2/scanning/results/${detectionId}`, detectionDetailResponseSchema, { signal })
  }

  async getLatestAiDecisionForIoc(iocId: string, signal?: AbortSignal): Promise<IocLatestAiDecisionResponse> {
    return requestJson(`/api/v2/ai/decisions/iocs/${iocId}/latest`, iocLatestAiDecisionResponseSchema, { signal })
  }

  async generateAiDecisionForIoc(
    iocId: string,
    input: { submittedByUserId: string },
  ): Promise<SubmitAiDecisionAcceptedResponse> {
    return requestJson(`/api/v2/ai/decisions/iocs/${iocId}/generate`, submitAiDecisionAcceptedResponseSchema, {
      method: "POST",
      body: {
        submittedByUserId: input.submittedByUserId,
      },
    })
  }

  async getLatestAiDecisionForDetection(detectionId: string, signal?: AbortSignal): Promise<AiDecisionResultResponse> {
    return requestJson(`/api/v2/ai/decisions/detections/${detectionId}/latest`, aiDecisionResultResponseSchema, { signal })
  }

  async submitAiDecision(input: SubmitAiDecisionInput): Promise<SubmitAiDecisionAcceptedResponse> {
    return requestJson("/api/v2/ai/decisions", submitAiDecisionAcceptedResponseSchema, {
      method: "POST",
      body: {
        caseId: input.caseId,
        detectionId: input.detectionId,
        iocType: input.iocType,
        iocValue: input.iocValue,
        observedAtUtc: input.observedAtUtc,
        detectionPackage: input.detectionPackage,
        submittedByUserId: input.submittedByUserId,
      },
    })
  }

  async getAiDecisionResult(decisionId: string, signal?: AbortSignal): Promise<AiDecisionResultResponse> {
    return requestJson(`/api/v2/ai/decisions/${decisionId}`, aiDecisionResultResponseSchema, { signal })
  }

  async getAiDecisionExplanation(
    decisionId: string,
    signal?: AbortSignal,
  ): Promise<AiDecisionExplanationOrPendingResponse> {
    return requestJson(
      `/api/v2/ai/decisions/${decisionId}/explanation`,
      aiDecisionExplanationOrPendingResponseSchema,
      { signal },
    )
  }

  async getAiDecisionActionPlan(
    decisionId: string,
    signal?: AbortSignal,
  ): Promise<AiDecisionActionPlanOrPendingResponse> {
    return requestJson(
      `/api/v2/ai/decisions/${decisionId}/action-plan`,
      aiDecisionActionPlanOrPendingResponseSchema,
      { signal },
    )
  }

  async listAiDecisionEvidenceSources(
    decisionId: string,
    query: AiDecisionCursorQuery = {},
    signal?: AbortSignal,
  ): Promise<AiEvidenceSourcesResponse> {
    const params = new URLSearchParams()
    if (typeof query.limit === "number") {
      params.set("limit", String(query.limit))
    }
    if (query.cursor) {
      params.set("cursor", query.cursor)
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(
      `/api/v2/ai/decisions/${decisionId}/evidence-sources${suffix}`,
      aiEvidenceSourcesResponseSchema,
      { signal },
    )
  }

  async listAiDecisionSimilarDetections(
    decisionId: string,
    query: AiDecisionCursorQuery = {},
    signal?: AbortSignal,
  ): Promise<AiSimilarDetectionsResponse> {
    const params = new URLSearchParams()
    if (typeof query.limit === "number") {
      params.set("limit", String(query.limit))
    }
    if (query.cursor) {
      params.set("cursor", query.cursor)
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : ""
    return requestJson(
      `/api/v2/ai/decisions/${decisionId}/similar-detections${suffix}`,
      aiSimilarDetectionsResponseSchema,
      { signal },
    )
  }

  async submitAiDecisionOverrideOrClosure(
    decisionId: string,
    input: SubmitAiDecisionOverrideOrClosureInput,
  ): Promise<AiOverrideOrClosureResponse> {
    return requestJson(`/api/v2/ai/decisions/${decisionId}/override-closure`, aiOverrideOrClosureResponseSchema, {
      method: "POST",
      body: {
        actionType: input.actionType,
        reason: input.reason,
        notes: input.notes ?? null,
        overrideVerdict: input.overrideVerdict ?? null,
        closureDisposition: input.closureDisposition ?? null,
        isFinal: input.isFinal ?? null,
        submittedByUserId: input.submittedByUserId,
      },
    })
  }

  async getHealthInfo(signal?: AbortSignal): Promise<HealthInfo> {
    return requestJson("/api/health/info", healthInfoSchema, { signal })
  }

  async getHealthReady(signal?: AbortSignal): Promise<HealthReady> {
    return requestJson("/health/ready", healthReadySchema, { signal })
  }

  async getHealthAdmin(signal?: AbortSignal): Promise<HealthAdmin | null> {
    try {
      return await requestJson("/api/health/admin", healthAdminSchema, { signal })
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return null
      }

      throw error
    }
  }

  async getCaseRuleWorkflow(caseId: string, signal?: AbortSignal): Promise<CaseRuleWorkflowResponse> {
    return this.getAlertRuleWorkflow(caseId, signal)
  }

  async getAlertRuleWorkflow(alertId: string, signal?: AbortSignal): Promise<AlertRuleWorkflowResponse> {
    return requestJson(`/api/rule-workflow/alerts/${alertId}`, alertRuleWorkflowResponseSchema, { signal })
  }

  async createRuleProposal(input: CreateRuleProposalInput): Promise<RuleProposalResponse> {
    const alertId = input.alertId ?? input.caseId
    if (!alertId) {
      throw new ApiError("Rule proposal creation requires alertId.", 400)
    }

    return requestJson("/api/rule-workflow/proposals", ruleProposalResponseSchema, {
      method: "POST",
      body: {
        alertId,
        caseId: input.caseId ?? alertId,
        proposalName: input.proposalName,
        ruleFamily: input.ruleFamily,
        ruleBody: input.ruleBody,
        proposedVersion: input.proposedVersion,
        proposedByUserId: input.proposedByUserId,
        rationale: input.rationale,
        policyRiskScore: input.policyRiskScore,
      },
    })
  }

  async reviewRuleProposal(proposalId: string, input: ReviewRuleProposalInput): Promise<RuleProposalResponse> {
    return requestJson(`/api/rule-workflow/proposals/${proposalId}/review`, ruleProposalResponseSchema, {
      method: "PATCH",
      body: {
        decision: input.decision,
        reviewerUserId: input.reviewerUserId,
        reviewReason: input.reviewReason,
        overrideReason: input.overrideReason,
      },
    })
  }

  async simulateRuleProposal(proposalId: string, input: SimulateRuleProposalInput): Promise<RuleSimulationResultResponse> {
    return requestJson(`/api/rule-workflow/proposals/${proposalId}/simulate`, ruleSimulationResultResponseSchema, {
      method: "POST",
      body: {
        targetEnvironment: input.targetEnvironment,
        actorUserId: input.actorUserId,
        notes: input.notes,
      },
    })
  }

  async advanceRolloutStage(rolloutPlanId: string, input: AdvanceRolloutStageInput): Promise<RolloutPlanResponse> {
    return requestJson(`/api/rule-workflow/rollouts/${rolloutPlanId}/stage`, rolloutPlanResponseSchema, {
      method: "PATCH",
      body: {
        stage: input.stage,
        actorUserId: input.actorUserId,
        reason: input.reason,
        overrideReason: input.overrideReason,
      },
    })
  }

  async recordCanaryObservation(
    rolloutPlanId: string,
    input: RecordCanaryObservationInput,
  ): Promise<RolloutPlanResponse> {
    return requestJson(`/api/rule-workflow/rollouts/${rolloutPlanId}/canary-observation`, rolloutPlanResponseSchema, {
      method: "PATCH",
      body: {
        observedNoise: input.observedNoise,
        analystAcceptedCount: input.analystAcceptedCount,
        analystReviewedCount: input.analystReviewedCount,
        actorUserId: input.actorUserId,
      },
    })
  }

  async triggerRollback(rollbackPlanId: string, input: TriggerRollbackInput): Promise<RollbackPlanResponse> {
    return requestJson(`/api/rule-workflow/rollbacks/${rollbackPlanId}/trigger`, rollbackPlanResponseSchema, {
      method: "POST",
      body: {
        actorUserId: input.actorUserId,
        reason: input.reason,
        observedNoise: input.observedNoise,
      },
    })
  }

  async getCoveragePainAnalysis(
    input: CoveragePainAnalysisScopeInput = { scopeType: "entire-environment" },
    signal?: AbortSignal,
  ): Promise<CoveragePainAnalysisResponse> {
    const params = new URLSearchParams()
    params.set("scopeType", input.scopeType)
    if (input.scopeValue) {
      params.set("scopeValue", input.scopeValue)
    }

    return requestJson(`/api/reporting/analysis?${params.toString()}`, coveragePainAnalysisResponseSchema, {
      signal,
    })
  }

  async runModelRetraining(triggeredByUserId: string) {
    return requestJson("/api/admin/jobs/model-retraining", jobRunResponseSchema, {
      method: "POST",
      body: { triggeredByUserId },
    })
  }

  // Aggregated admin settings surface retained for shared admin compatibility.
  async getSettingsAdmin(signal?: AbortSignal): Promise<SettingsAdminVM> {
    const [healthInfo, healthAdmin, recentJobs] = await Promise.all([
      this.getHealthInfo(signal),
      this.getHealthAdmin(signal),
      this.listJobRuns(signal),
    ])

    return {
      healthInfo,
      healthAdmin,
      recentJobs,
    }
  }

  // Expose list helpers for aggregated views that combine rule workflow entities across cases.
  async listAllRecommendations(signal?: AbortSignal) {
    const alerts = await this.listAlerts(signal)
    const responses = await Promise.allSettled(alerts.map((item) => this.getAlertRuleWorkflow(item.id, signal)))
    const merged = responses.flatMap((result) => (result.status === "fulfilled" ? result.value.recommendations : []))
    return recommendationsSchema.parse(merged)
  }

  async listAllRollouts(signal?: AbortSignal) {
    const alerts = await this.listAlerts(signal)
    const responses = await Promise.allSettled(alerts.map((item) => this.getAlertRuleWorkflow(item.id, signal)))
    const merged = responses.flatMap((result) => (result.status === "fulfilled" ? result.value.rolloutPlans : []))
    return rolloutsSchema.parse(merged)
  }

  async listAllRollbacks(signal?: AbortSignal) {
    const alerts = await this.listAlerts(signal)
    const responses = await Promise.allSettled(alerts.map((item) => this.getAlertRuleWorkflow(item.id, signal)))
    const merged = responses.flatMap((result) => (result.status === "fulfilled" ? result.value.rollbackPlans : []))
    return rollbacksSchema.parse(merged)
  }
}

