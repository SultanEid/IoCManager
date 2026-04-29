"use client"

import { z } from "zod"
import { ApiError } from "@/shared/api/error"
import { requestBlob, requestForm, requestJson } from "@/shared/api/client"
import { isMockMode } from "@/shared/gateway"

const metricSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
})

const sectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  metrics: z.array(metricSchema),
  highlights: z.array(z.string()),
})

const networkSchema = z.object({
  id: z.string(),
  name: z.string(),
  cidrBlock: z.string(),
  sshUser: z.string().nullable(),
  sshKeyPath: z.string().nullable(),
  hasSshPassword: z.boolean(),
  notes: z.string().nullable(),
  totalTargets: z.number().int(),
  onlineTargets: z.number().int(),
  lastSweepAtUtc: z.string().nullable(),
})

const networkDeletionSchema = z.object({
  networkId: z.string(),
  networkName: z.string(),
  deletedTargets: z.number().int(),
  forced: z.boolean(),
  deletedPlans: z.number().int(),
  deletedJobs: z.number().int(),
  detachedResults: z.number().int(),
  detachedReports: z.number().int(),
})

const networkDeletionBlockerSchema = z.object({
  category: z.string(),
  count: z.number().int(),
  message: z.string(),
})

const networkDeletionBlockedSchema = z.object({
  title: z.string(),
  detail: z.string(),
  status: z.number().int(),
  networkId: z.string(),
  networkName: z.string(),
  targetCount: z.number().int(),
  blockers: z.array(networkDeletionBlockerSchema),
})

const targetSchema = z.object({
  id: z.string(),
  networkId: z.string(),
  networkName: z.string(),
  displayName: z.string().nullable(),
  hostname: z.string().nullable(),
  ipAddress: z.string(),
  status: z.string(),
  targetOsType: z.string().nullable(),
  lastSweepAtUtc: z.string().nullable(),
})

const discoverySchema = z.object({
  networkId: z.string(),
  networkName: z.string(),
  requestedCidr: z.string(),
  totalHosts: z.number().int(),
  reachableHosts: z.number().int(),
  offlineHosts: z.number().int(),
  discoveredAtUtc: z.string(),
})

const rulePresetSchema = z.object({
  scannerFamily: z.string(),
  paths: z.array(z.string()),
})

const scanPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  scannerFamilies: z.array(z.string()),
  status: z.string(),
  scheduleType: z.string(),
  rulePathsByFamily: z.record(z.string(), z.string().nullable()),
  notes: z.string().nullable(),
  networkIds: z.array(z.string()),
  targetIds: z.array(z.string()),
  networkNames: z.array(z.string()),
  targetDisplayNames: z.array(z.string()),
  schedule: z.record(z.string(), z.string().nullable()),
  options: z.record(z.string(), z.string().nullable()),
  nextRunAtUtc: z.string().nullable(),
  lastRunAtUtc: z.string().nullable(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
})

const scanPlanDeletionSchema = z.object({
  planId: z.string(),
  planName: z.string(),
  detachedJobs: z.number().int(),
})

const scanJobSchema = z.object({
  id: z.string(),
  scanPlanId: z.string().nullable(),
  scannerFamily: z.string(),
  ruleInputMode: z.string(),
  rulePath: z.string().nullable(),
  executionMode: z.string().nullable(),
  triggerType: z.string(),
  status: z.string(),
  summary: z.string(),
  queuedAtUtc: z.string(),
  startedAtUtc: z.string().nullable(),
  finishedAtUtc: z.string().nullable(),
  batchId: z.string().nullable(),
  totalTargets: z.number().int(),
  completedTargets: z.number().int(),
  failedTargets: z.number().int(),
  noFindingsTargets: z.number().int(),
})

const scanPlanRunSchema = z.object({
  batchId: z.string(),
  planId: z.string(),
  jobs: z.array(scanJobSchema),
})

const customScanSchema = z.object({
  batchId: z.string(),
  jobs: z.array(scanJobSchema),
})

const scanResultSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  targetId: z.string().nullable(),
  targetDisplay: z.string(),
  scannerFamily: z.string(),
  status: z.string(),
  findingsCount: z.number().int(),
  startedAtUtc: z.string().nullable(),
  finishedAtUtc: z.string().nullable(),
})

const iocFindingSchema = z.object({
  iocId: z.string(),
  scannerFamily: z.string(),
  targetId: z.string().nullable(),
  targetDisplay: z.string(),
  targetIp: z.string().nullable(),
  targetOsType: z.string().nullable(),
  jobId: z.string().nullable(),
  scanPlanId: z.string().nullable(),
  ruleName: z.string(),
  indicatorValue: z.string(),
  indicatorKind: z.string(),
  painLevel: z.string(),
  severity: z.string(),
  timestampUtc: z.string(),
  rawPayload: z.string().nullable(),
  status: z.string(),
})

const iocFindingListSchema = z.object({
  items: z.array(iocFindingSchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  availableSeverities: z.array(z.string()),
})

const iocFindingTargetSchema = z.object({
  id: z.string().nullable(),
  display: z.string(),
  hostname: z.string().nullable(),
  ipAddress: z.string().nullable(),
  status: z.string().nullable(),
  targetOsType: z.string().nullable(),
})

const iocFindingScanSchema = z.object({
  jobId: z.string().nullable(),
  scanPlanId: z.string().nullable(),
  scannerFamily: z.string(),
  executionMode: z.string().nullable(),
  triggerType: z.string().nullable(),
  status: z.string(),
  queuedAtUtc: z.string().nullable(),
  startedAtUtc: z.string().nullable(),
  finishedAtUtc: z.string().nullable(),
})

const iocFindingYaraDetailSchema = z.object({
  filePath: z.string().nullable(),
  fileHash: z.string().nullable(),
})

const iocFindingSigmaDetailSchema = z.object({
  logSource: z.string().nullable(),
  severity: z.string().nullable(),
  commandLine: z.string().nullable(),
})

const iocFindingNetworkDetailSchema = z.object({
  sourceIp: z.string().nullable(),
  destIp: z.string().nullable(),
  protocol: z.string().nullable(),
  severity: z.string().nullable(),
  flowId: z.number().int().nullable(),
})

const iocFindingDetailSchema = iocFindingSchema.extend({
  target: iocFindingTargetSchema.nullable(),
  relatedScan: iocFindingScanSchema.nullable(),
  yaraDetail: iocFindingYaraDetailSchema.nullable(),
  sigmaDetail: iocFindingSigmaDetailSchema.nullable(),
  networkDetail: iocFindingNetworkDetailSchema.nullable(),
})

const painLevelSchema = z.object({
  level: z.string(),
  label: z.string(),
  count: z.number().int(),
  share: z.number(),
  previewIocs: z.array(iocFindingSchema),
})

const painTrendSchema = z.object({
  bucketStartUtc: z.string(),
  countsByLevel: z.record(z.string(), z.number().int()),
})

const painAnalysisSchema = z.object({
  fromUtc: z.string(),
  toUtc: z.string(),
  totalCount: z.number().int(),
  levels: z.array(painLevelSchema),
  trend: z.array(painTrendSchema),
})

const overviewSummarySchema = z.object({
  targetCount: z.number().int(),
  iocCount: z.number().int(),
  reportCount: z.number().int(),
  alertCount: z.number().int(),
})

const reportRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  reportType: z.string(),
  scope: z.string(),
  createdAtUtc: z.string(),
  htmlDownloadPath: z.string().nullable(),
  status: z.string(),
})

const reportQuerySchema = z.object({
  jobId: z.string().nullable(),
  targetId: z.string().nullable(),
  networkId: z.string().nullable(),
  scannerFamily: z.string().nullable(),
  fromUtc: z.string().nullable(),
  toUtc: z.string().nullable(),
  severity: z.string().nullable(),
  status: z.string().nullable(),
})

const generatedReportSchema = z.object({
  title: z.string(),
  reportType: z.string(),
  scope: z.string(),
  generatedAtUtc: z.string(),
  query: reportQuerySchema,
  sections: z.array(sectionSchema),
  persistedReport: reportRecordSchema.nullable(),
})

const reportDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  reportType: z.string(),
  scope: z.string(),
  createdAtUtc: z.string(),
  query: reportQuerySchema,
  sections: z.array(sectionSchema),
  htmlDownloadPath: z.string().nullable(),
  status: z.string(),
})

const reportDeletionSchema = z.object({
  id: z.string(),
  title: z.string(),
  deletedFiles: z.number().int(),
})

export type LegacyPipelineNetwork = z.infer<typeof networkSchema>
export type LegacyPipelineTarget = z.infer<typeof targetSchema>
export type LegacyPipelineNetworkDeletion = z.infer<typeof networkDeletionSchema>
export type LegacyPipelineNetworkDeletionBlocked = z.infer<typeof networkDeletionBlockedSchema>
export type LegacyPipelineDiscovery = z.infer<typeof discoverySchema>
export type LegacyPipelineRulePreset = z.infer<typeof rulePresetSchema>
export type LegacyPipelineScanPlan = z.infer<typeof scanPlanSchema>
export type LegacyPipelineScanPlanRun = z.infer<typeof scanPlanRunSchema>
export type LegacyPipelineScanPlanDeletion = z.infer<typeof scanPlanDeletionSchema>
export type LegacyPipelineScanJob = z.infer<typeof scanJobSchema>
export type LegacyPipelineCustomScan = z.infer<typeof customScanSchema>
export type LegacyPipelineScanResult = z.infer<typeof scanResultSchema>
export type LegacyPipelineIocFinding = z.infer<typeof iocFindingSchema>
export type LegacyPipelineIocFindingList = z.infer<typeof iocFindingListSchema>
export type LegacyPipelineIocFindingDetail = z.infer<typeof iocFindingDetailSchema>
export type LegacyPipelinePainAnalysis = z.infer<typeof painAnalysisSchema>
export type LegacyPipelineOverviewSummary = z.infer<typeof overviewSummarySchema>
export type LegacyPipelineReportRecord = z.infer<typeof reportRecordSchema>
export type LegacyPipelineGeneratedReport = z.infer<typeof generatedReportSchema>
export type LegacyPipelineReportDetail = z.infer<typeof reportDetailSchema>
export type LegacyPipelineReportDeletion = z.infer<typeof reportDeletionSchema>

const mockLegacyTargets: LegacyPipelineTarget[] = [
  {
    id: "7bc88d92-4eb4-456a-a7a4-a70ae62f6b91",
    networkId: "demo-network-1",
    networkName: "Demo SOC network",
    displayName: "srv-finance-01",
    hostname: "srv-finance-01",
    ipAddress: "10.20.4.18",
    status: "Online",
    targetOsType: "Windows",
    lastSweepAtUtc: "2026-04-26T08:35:00.000Z",
  },
  {
    id: "ac4fd902-b3c2-4f76-99d0-343ad229f9f1",
    networkId: "demo-network-1",
    networkName: "Demo SOC network",
    displayName: "mail-edge-02",
    hostname: "mail-edge-02",
    ipAddress: "10.20.9.44",
    status: "Online",
    targetOsType: "Linux",
    lastSweepAtUtc: "2026-04-26T08:33:00.000Z",
  },
]

const mockLegacyIocDetails: LegacyPipelineIocFindingDetail[] = [
  {
    iocId: "9c79a40c-0454-4e26-9f72-e6b3f2656f59",
    scannerFamily: "YARA",
    targetId: mockLegacyTargets[0].id,
    targetDisplay: "srv-finance-01",
    targetIp: "10.20.4.18",
    targetOsType: "Windows",
    jobId: "demo-job-yara-1",
    scanPlanId: "demo-plan-endpoints",
    ruleName: "suspicious_powershell_loader",
    indicatorValue: "C:\\Users\\Public\\loader.ps1",
    indicatorKind: "file_path",
    painLevel: "HostArtifact",
    severity: "High",
    timestampUtc: "2026-04-26T08:37:42.000Z",
    rawPayload: "{\"match\":\"suspicious_powershell_loader\",\"confidence\":\"low\",\"missing_enrichment\":true}",
    status: "Open",
    target: {
      id: mockLegacyTargets[0].id,
      display: "srv-finance-01",
      hostname: "srv-finance-01",
      ipAddress: "10.20.4.18",
      status: "Online",
      targetOsType: "Windows",
    },
    relatedScan: {
      jobId: "demo-job-yara-1",
      scanPlanId: "demo-plan-endpoints",
      scannerFamily: "YARA",
      executionMode: "Manual",
      triggerType: "Analyst",
      status: "Completed",
      queuedAtUtc: "2026-04-26T08:35:01.000Z",
      startedAtUtc: "2026-04-26T08:35:12.000Z",
      finishedAtUtc: "2026-04-26T08:37:55.000Z",
    },
    yaraDetail: {
      filePath: "C:\\Users\\Public\\loader.ps1",
      fileHash: "b6c5d3c73c1de742a7f4260b8a27f3a3f4ea7d0e9af3f2d7a4e1cf355cb6fd55",
    },
    sigmaDetail: null,
    networkDetail: null,
  },
  {
    iocId: "e97b8b0f-03cf-40a4-9614-55918023d0de",
    scannerFamily: "SIGMA",
    targetId: mockLegacyTargets[0].id,
    targetDisplay: "srv-finance-01",
    targetIp: "10.20.4.18",
    targetOsType: "Windows",
    jobId: "demo-job-sigma-1",
    scanPlanId: "demo-plan-endpoints",
    ruleName: "encoded_command_execution",
    indicatorValue: "powershell.exe -enc SQBFAFgA",
    indicatorKind: "process_command_line",
    painLevel: "Ttp",
    severity: "Medium",
    timestampUtc: "2026-04-26T08:41:16.000Z",
    rawPayload: "{\"event_id\":4688,\"command_line\":\"powershell.exe -enc SQBFAFgA\",\"source\":\"windows-security\"}",
    status: "Review",
    target: {
      id: mockLegacyTargets[0].id,
      display: "srv-finance-01",
      hostname: "srv-finance-01",
      ipAddress: "10.20.4.18",
      status: "Online",
      targetOsType: "Windows",
    },
    relatedScan: {
      jobId: "demo-job-sigma-1",
      scanPlanId: "demo-plan-endpoints",
      scannerFamily: "SIGMA",
      executionMode: "Scheduled",
      triggerType: "Plan",
      status: "Completed",
      queuedAtUtc: "2026-04-26T08:38:00.000Z",
      startedAtUtc: "2026-04-26T08:38:08.000Z",
      finishedAtUtc: "2026-04-26T08:42:00.000Z",
    },
    yaraDetail: null,
    sigmaDetail: {
      logSource: "Windows Security",
      severity: "medium",
      commandLine: "powershell.exe -enc SQBFAFgA",
    },
    networkDetail: null,
  },
  {
    iocId: "620192eb-12c2-47cb-ae96-3e26bdf2b8e6",
    scannerFamily: "SURICATA",
    targetId: mockLegacyTargets[1].id,
    targetDisplay: "mail-edge-02",
    targetIp: "10.20.9.44",
    targetOsType: "Linux",
    jobId: "demo-job-network-1",
    scanPlanId: "demo-plan-network",
    ruleName: "possible_c2_beacon",
    indicatorValue: "hxxp://unknown.example/checkin",
    indicatorKind: "url",
    painLevel: "CommandAndControl",
    severity: "Critical",
    timestampUtc: "2026-04-26T08:44:03.000Z",
    rawPayload: "{\"alert\":\"possible_c2_beacon\",\"flow_id\":24219,\"dest\":\"unknown.example\"}",
    status: "Open",
    target: {
      id: mockLegacyTargets[1].id,
      display: "mail-edge-02",
      hostname: "mail-edge-02",
      ipAddress: "10.20.9.44",
      status: "Online",
      targetOsType: "Linux",
    },
    relatedScan: {
      jobId: "demo-job-network-1",
      scanPlanId: "demo-plan-network",
      scannerFamily: "SURICATA",
      executionMode: "Manual",
      triggerType: "Analyst",
      status: "Completed",
      queuedAtUtc: "2026-04-26T08:42:00.000Z",
      startedAtUtc: "2026-04-26T08:42:09.000Z",
      finishedAtUtc: "2026-04-26T08:44:20.000Z",
    },
    yaraDetail: null,
    sigmaDetail: null,
    networkDetail: {
      sourceIp: "10.20.9.44",
      destIp: "203.0.113.19",
      protocol: "HTTP",
      severity: "critical",
      flowId: 24219,
    },
  },
]

function toMockFindingListItem(detail: LegacyPipelineIocFindingDetail): LegacyPipelineIocFinding {
  return {
    iocId: detail.iocId,
    scannerFamily: detail.scannerFamily,
    targetId: detail.targetId,
    targetDisplay: detail.targetDisplay,
    targetIp: detail.targetIp,
    targetOsType: detail.targetOsType,
    jobId: detail.jobId,
    scanPlanId: detail.scanPlanId,
    ruleName: detail.ruleName,
    indicatorValue: detail.indicatorValue,
    indicatorKind: detail.indicatorKind,
    painLevel: detail.painLevel,
    severity: detail.severity,
    timestampUtc: detail.timestampUtc,
    rawPayload: detail.rawPayload,
    status: detail.status,
  }
}

function includesText(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query)
}

export async function listLegacyNetworks(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/networks", z.array(networkSchema), { signal })
}

export async function createLegacyNetwork(input: {
  name: string
  cidrBlock: string
  sshUser?: string
  sshKeyPath?: string
  sshPassword?: string
  clearSshPassword?: boolean
  notes?: string
}) {
  return requestJson("/api/v2/legacy-pipeline/networks", networkSchema, {
    method: "POST",
    body: input,
  })
}

export async function updateLegacyNetwork(networkId: string, input: {
  name: string
  cidrBlock: string
  sshUser?: string
  sshKeyPath?: string
  sshPassword?: string
  clearSshPassword?: boolean
  notes?: string
}) {
  return requestJson(`/api/v2/legacy-pipeline/networks/${networkId}`, networkSchema, {
    method: "PUT",
    body: input,
  })
}

export async function discoverLegacyNetwork(networkId: string, input: {
  actorUserId: string
  rangeStartIp?: string
  rangeEndIp?: string
}) {
  return requestJson(`/api/v2/legacy-pipeline/networks/${networkId}/discover`, discoverySchema, {
    method: "POST",
    body: {
      actorUserId: input.actorUserId,
      rangeStartIp: input.rangeStartIp ?? null,
      rangeEndIp: input.rangeEndIp ?? null,
    },
  })
}

export async function deleteLegacyNetwork(networkId: string, force?: boolean) {
  const suffix = force ? "?force=true" : ""
  return requestJson(`/api/v2/legacy-pipeline/networks/${networkId}${suffix}`, networkDeletionSchema, {
    method: "DELETE",
  })
}

export async function listLegacyTargets(networkId?: string, signal?: AbortSignal) {
  if (isMockMode) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError")
    }

    return networkId ? mockLegacyTargets.filter((target) => target.networkId === networkId) : mockLegacyTargets
  }

  const suffix = networkId ? `?networkId=${encodeURIComponent(networkId)}` : ""
  return requestJson(`/api/v2/legacy-pipeline/targets${suffix}`, z.array(targetSchema), { signal })
}

export async function updateLegacyTarget(targetId: string, input: { displayName?: string | null }) {
  return requestJson(`/api/v2/legacy-pipeline/targets/${targetId}`, targetSchema, {
    method: "PUT",
    body: {
      displayName: input.displayName ?? null,
    },
  })
}

export async function listLegacyRulePresets(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/rule-presets", z.array(rulePresetSchema), { signal })
}

export async function listLegacyPlans(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/plans", z.array(scanPlanSchema), { signal })
}

export async function createLegacyPlan(body: unknown) {
  return requestJson("/api/v2/legacy-pipeline/plans", scanPlanSchema, { method: "POST", body })
}

export async function updateLegacyPlan(planId: string, body: unknown) {
  return requestJson(`/api/v2/legacy-pipeline/plans/${planId}`, scanPlanSchema, { method: "PUT", body })
}

export async function cloneLegacyPlan(planId: string) {
  return requestJson(`/api/v2/legacy-pipeline/plans/${planId}/clone`, scanPlanSchema, {
    method: "POST",
  })
}

export async function deleteLegacyPlan(planId: string) {
  return requestJson(`/api/v2/legacy-pipeline/plans/${planId}`, scanPlanDeletionSchema, {
    method: "DELETE",
  })
}

export async function runLegacyPlan(planId: string, actorUserId: string) {
  return requestJson(`/api/v2/legacy-pipeline/plans/${planId}/run`, scanPlanRunSchema, {
    method: "POST",
    body: { actorUserId },
  })
}

export async function createLegacyCustomScan(input: {
  actorUserId: string
  scannerFamilies: string[]
  ruleInputMode: "hostPath" | "upload"
  rulePath?: string
  rulePathsByFamily?: Record<string, string | null>
  networkIds: string[]
  targetIds: string[]
  options: Record<string, string | null>
  targetOsOverrides?: Record<string, "windows" | "linux">
  files: File[]
  pcapFile?: File | null
}) {
  const formData = new FormData()
  formData.set("actorUserId", input.actorUserId)
  formData.set("scannerFamiliesJson", JSON.stringify(input.scannerFamilies))
  formData.set("ruleInputMode", input.ruleInputMode)
  if (input.rulePath) {
    formData.set("rulePath", input.rulePath)
  }
  if (input.rulePathsByFamily && Object.keys(input.rulePathsByFamily).length > 0) {
    formData.set("rulePathsByFamilyJson", JSON.stringify(input.rulePathsByFamily))
  }
  formData.set("networkIdsJson", JSON.stringify(input.networkIds))
  formData.set("targetIdsJson", JSON.stringify(input.targetIds))
  formData.set("optionsJson", JSON.stringify(input.options))
  if (input.targetOsOverrides && Object.keys(input.targetOsOverrides).length > 0) {
    formData.set("targetOsOverridesJson", JSON.stringify(input.targetOsOverrides))
  }
  for (const file of input.files) {
    formData.append("files", file)
  }
  if (input.pcapFile) {
    formData.append("pcapFile", input.pcapFile)
  }

  return requestForm("/api/v2/legacy-pipeline/custom-scans", customScanSchema, {
    method: "POST",
    formData,
  })
}

export async function listLegacyJobs(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/jobs", z.array(scanJobSchema), { signal })
}

export async function stopLegacyJob(jobId: string) {
  return requestJson(`/api/v2/legacy-pipeline/jobs/${jobId}/stop`, scanJobSchema, {
    method: "POST",
  })
}

export async function listLegacyResults(filters: {
  jobId?: string
  targetId?: string
  limit?: number
  scannerFamily?: string
  status?: string
  includeOrphaned?: boolean
}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.jobId) params.set("jobId", filters.jobId)
  if (filters.targetId) params.set("targetId", filters.targetId)
  if (typeof filters.limit === "number") params.set("limit", filters.limit.toString())
  if (filters.scannerFamily) params.set("scannerFamily", filters.scannerFamily)
  if (filters.status) params.set("status", filters.status)
  if (filters.includeOrphaned) params.set("includeOrphaned", "true")
  const suffix = params.size > 0 ? `?${params.toString()}` : ""
  return requestJson(`/api/v2/legacy-pipeline/results${suffix}`, z.array(scanResultSchema), { signal })
}

export async function listLegacyIocFindings(filters: {
  scannerFamily?: string
  targetId?: string
  severity?: string
  fromUtc?: string
  toUtc?: string
  q?: string
  painLevel?: string
  page?: number
  pageSize?: number
}, signal?: AbortSignal) {
  if (isMockMode) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError")
    }

    const query = (filters.q ?? "").trim().toLowerCase()
    const fromTime = filters.fromUtc ? new Date(filters.fromUtc).getTime() : null
    const toTime = filters.toUtc ? new Date(filters.toUtc).getTime() : null
    const filtered = mockLegacyIocDetails
      .map(toMockFindingListItem)
      .filter((finding) => {
        const findingTime = new Date(finding.timestampUtc).getTime()
        return (
          (!filters.scannerFamily || finding.scannerFamily === filters.scannerFamily)
          && (!filters.targetId || finding.targetId === filters.targetId)
          && (!filters.severity || finding.severity === filters.severity)
          && (!filters.painLevel || finding.painLevel === filters.painLevel)
          && (fromTime === null || findingTime >= fromTime)
          && (toTime === null || findingTime <= toTime)
          && (!query
            || includesText(finding.ruleName, query)
            || includesText(finding.indicatorValue, query)
            || includesText(finding.indicatorKind, query)
            || includesText(finding.rawPayload, query)
            || includesText(finding.targetDisplay, query))
        )
      })
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.max(1, filters.pageSize ?? 100)
    const start = (page - 1) * pageSize

    return {
      items: filtered.slice(start, start + pageSize),
      totalCount: filtered.length,
      page,
      pageSize,
      availableSeverities: Array.from(new Set(mockLegacyIocDetails.map((finding) => finding.severity))).sort(),
    }
  }

  const params = new URLSearchParams()
  if (filters.scannerFamily) params.set("scannerFamily", filters.scannerFamily)
  if (filters.targetId) params.set("targetId", filters.targetId)
  if (filters.severity) params.set("severity", filters.severity)
  if (filters.fromUtc) params.set("fromUtc", filters.fromUtc)
  if (filters.toUtc) params.set("toUtc", filters.toUtc)
  if (filters.q) params.set("q", filters.q)
  if (filters.painLevel) params.set("painLevel", filters.painLevel)
  if (typeof filters.page === "number") params.set("page", filters.page.toString())
  if (typeof filters.pageSize === "number") params.set("pageSize", filters.pageSize.toString())
  const suffix = params.size > 0 ? `?${params.toString()}` : ""
  return requestJson(`/api/v2/legacy-pipeline/iocs${suffix}`, iocFindingListSchema, { signal })
}

export async function getLegacyIocFindingDetail(iocId: string, signal?: AbortSignal) {
  if (isMockMode) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError")
    }

    const detail = mockLegacyIocDetails.find((finding) => finding.iocId === iocId)
    if (detail) {
      return detail
    }
  }

  return requestJson(`/api/v2/legacy-pipeline/iocs/${encodeURIComponent(iocId)}`, iocFindingDetailSchema, { signal })
}

export async function getLegacyPainAnalysis(filters: {
  scannerFamily?: string
  targetId?: string
  severity?: string
  fromUtc?: string
  toUtc?: string
}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.scannerFamily) params.set("scannerFamily", filters.scannerFamily)
  if (filters.targetId) params.set("targetId", filters.targetId)
  if (filters.severity) params.set("severity", filters.severity)
  if (filters.fromUtc) params.set("fromUtc", filters.fromUtc)
  if (filters.toUtc) params.set("toUtc", filters.toUtc)
  const suffix = params.size > 0 ? `?${params.toString()}` : ""
  return requestJson(`/api/v2/legacy-pipeline/pain-analysis${suffix}`, painAnalysisSchema, { signal })
}

export async function getLegacyOverviewSummary(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/overview-summary", overviewSummarySchema, { signal })
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`
  }

  return value
}

function triggerClientDownload(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function triggerBlobDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function exportLegacyIocFindingsCsv(rows: LegacyPipelineIocFinding[]) {
  const headers = ["Scanner", "Target", "Target IP", "Rule Name", "Indicator Value", "Indicator Kind", "Severity", "Status", "Timestamp"]
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.scannerFamily,
        row.targetDisplay,
        row.targetIp ?? "",
        row.ruleName,
        row.indicatorValue,
        row.indicatorKind,
        row.severity,
        row.status,
        row.timestampUtc,
      ].map((value) => escapeCsvValue(value)).join(",")),
  ]

  triggerClientDownload("ioc-findings.csv", lines.join("\r\n"), "text/csv;charset=utf-8")
}

export function exportLegacyIocFindingsJson(rows: LegacyPipelineIocFinding[]) {
  triggerClientDownload("ioc-findings.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8")
}

export async function listLegacyReports(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/reports", z.array(reportRecordSchema), { signal })
}

export async function getLegacyReportDetail(reportId: string, signal?: AbortSignal) {
  return requestJson(`/api/v2/legacy-pipeline/reports/${encodeURIComponent(reportId)}`, reportDetailSchema, { signal })
}

export async function generateLegacyReport(body: unknown) {
  return requestJson("/api/v2/legacy-pipeline/reports/generate", generatedReportSchema, { method: "POST", body })
}

export async function deleteLegacyReport(reportId: string) {
  return requestJson(`/api/v2/legacy-pipeline/reports/${encodeURIComponent(reportId)}`, reportDeletionSchema, {
    method: "DELETE",
  })
}

export async function downloadLegacyReportArtifact(path: string, fallbackFileName: string) {
  const response = await requestBlob(path)
  triggerBlobDownload(response.fileName ?? fallbackFileName, response.blob)
}

export function parseLegacyNetworkDeletionBlocked(error: unknown): LegacyPipelineNetworkDeletionBlocked | null {
  if (!(error instanceof ApiError)) {
    return null
  }

  const parsed = networkDeletionBlockedSchema.safeParse(error.payload)
  return parsed.success ? parsed.data : null
}
