"use client"

import { z } from "zod"
import { ApiError } from "@/shared/api/error"
import { requestForm, requestJson } from "@/shared/api/client"

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
  scannerFamily: z.string(),
  status: z.string(),
  scheduleType: z.string(),
  rulePath: z.string().nullable(),
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

const scanJobSchema = z.object({
  id: z.string(),
  scanPlanId: z.string().nullable(),
  scannerFamily: z.string(),
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

const reportRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  reportType: z.string(),
  scope: z.string(),
  createdAtUtc: z.string(),
  fileExtension: z.string().nullable(),
  downloadPath: z.string().nullable(),
  status: z.string(),
})

const generatedReportSchema = z.object({
  title: z.string(),
  reportType: z.string(),
  scope: z.string(),
  generatedAtUtc: z.string(),
  sections: z.array(sectionSchema),
  persistedReport: reportRecordSchema.nullable(),
})

export type LegacyPipelineNetwork = z.infer<typeof networkSchema>
export type LegacyPipelineTarget = z.infer<typeof targetSchema>
export type LegacyPipelineNetworkDeletion = z.infer<typeof networkDeletionSchema>
export type LegacyPipelineNetworkDeletionBlocked = z.infer<typeof networkDeletionBlockedSchema>
export type LegacyPipelineDiscovery = z.infer<typeof discoverySchema>
export type LegacyPipelineRulePreset = z.infer<typeof rulePresetSchema>
export type LegacyPipelineScanPlan = z.infer<typeof scanPlanSchema>
export type LegacyPipelineScanJob = z.infer<typeof scanJobSchema>
export type LegacyPipelineCustomScan = z.infer<typeof customScanSchema>
export type LegacyPipelineScanResult = z.infer<typeof scanResultSchema>
export type LegacyPipelineReportRecord = z.infer<typeof reportRecordSchema>
export type LegacyPipelineGeneratedReport = z.infer<typeof generatedReportSchema>

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

export async function runLegacyPlan(planId: string, actorUserId: string) {
  return requestJson(`/api/v2/legacy-pipeline/plans/${planId}/run`, scanJobSchema, {
    method: "POST",
    body: { actorUserId },
  })
}

export async function createLegacyCustomScan(input: {
  actorUserId: string
  scannerFamilies: string[]
  ruleInputMode: "hostPath" | "upload"
  rulePath?: string
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

export async function listLegacyReports(signal?: AbortSignal) {
  return requestJson("/api/v2/legacy-pipeline/reports", z.array(reportRecordSchema), { signal })
}

export async function generateLegacyReport(body: unknown) {
  return requestJson("/api/v2/legacy-pipeline/reports/generate", generatedReportSchema, { method: "POST", body })
}

export function parseLegacyNetworkDeletionBlocked(error: unknown): LegacyPipelineNetworkDeletionBlocked | null {
  if (!(error instanceof ApiError)) {
    return null
  }

  const parsed = networkDeletionBlockedSchema.safeParse(error.payload)
  return parsed.success ? parsed.data : null
}
