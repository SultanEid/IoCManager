"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  BarChart3,
  Clock3,
  Database,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Printer,
  LayoutTemplate,
  ShieldCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestBlob } from "@/shared/api/client"
import { classifyUiError } from "@/shared/api/error-classification"
import type { GeneratedReportResponse, GeneratedReportSectionResponse, ReportResponse, RuleFamily, TargetServerResponse } from "@/shared/api/schemas"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import type { GenerateReportInput, ReportGenerationType } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const REPORT_TEMPLATES = [
  {
    value: "ExecutiveSummary",
    label: "Executive Summary",
    description: "High-level reporting across jobs, results, and findings in the selected scope.",
  },
  {
    value: "DetailedIocReport",
    label: "Detailed IOC Report",
    description: "Scanner-heavy finding coverage grouped around rule hits and indicator counts.",
  },
  {
    value: "TargetExposureSummary",
    label: "Target Exposure Summary",
    description: "Target inventory posture and finding linkage for selected hosts or subnets.",
  },
  {
    value: "ScanActivitySummary",
    label: "Scan Activity Summary",
    description: "Execution outcomes and recent result activity across the selected scope.",
  },
] as const

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const
const STATUS_OPTIONS = ["Open", "Investigating", "Resolved", "Closed"] as const

const REPORT_TYPE_LABELS: Record<string, string> = {
  ExecutiveSummary: "Executive Summary",
  DetailedIocReport: "Detailed IOC Report",
  TargetExposureSummary: "Target Exposure Summary",
  ScanActivitySummary: "Scan Activity Summary",
}

function defaultUtcRange() {
  const now = new Date()
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return {
    fromUtc: from.toISOString().replace(/\.\d{3}Z$/, "Z"),
    toUtc: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
  }
}

function formatUtc(value: string | null | undefined) {
  if (!value) {
    return "Not set"
  }

  return new Date(value).toLocaleString()
}

function formatReportType(reportType: string | null | undefined) {
  if (!reportType) {
    return "Unknown report"
  }

  return REPORT_TYPE_LABELS[reportType] ?? reportType
}

function summarizeQuery(query: {
  targetServerId?: string | null
  targetLabel?: string | null
  scannerFamily?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  severity?: string | null
  status?: string | null
  iocType?: string | null
  source?: string | null
}) {
  const parts: string[] = []
  if (query.targetLabel ?? query.targetServerId) parts.push(`Target ${query.targetLabel ?? query.targetServerId}`)
  if (query.scannerFamily) parts.push(query.scannerFamily.toUpperCase())
  if (query.severity) parts.push(`${query.severity} severity`)
  if (query.status) parts.push(`${query.status} alerts`)
  if (query.iocType) parts.push(`${query.iocType} IOCs`)
  if (query.source) parts.push(`Source ${query.source}`)
  if (query.fromUtc || query.toUtc) {
    parts.push(`${query.fromUtc ?? "..."} to ${query.toUtc ?? "..."}`)
  }

  return parts.length > 0 ? parts.join(" | ") : "Global scope"
}

type SnapshotQuery = {
  targetServerId?: string | null
  targetLabel?: string | null
  scannerFamily?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  severity?: string | null
  status?: string | null
  iocType?: string | null
  source?: string | null
}

type ReportSnapshot = {
  scope: string
  query: SnapshotQuery
  sections: GeneratedReportSectionResponse[]
}

type ReportPreviewState =
  | { kind: "generated"; report: GeneratedReportResponse }
  | { kind: "saved"; report: ReportResponse; snapshot: ReportSnapshot }

function isSectionArray(value: unknown): value is GeneratedReportSectionResponse[] {
  return Array.isArray(value) && value.every((section) => {
    if (typeof section !== "object" || section === null) {
      return false
    }

    const candidate = section as Record<string, unknown>
    return (
      typeof candidate.title === "string"
      && typeof candidate.summary === "string"
      && Array.isArray(candidate.metrics)
      && Array.isArray(candidate.highlights)
    )
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeReportSection(section: GeneratedReportSectionResponse): GeneratedReportSectionResponse {
  return {
    ...section,
    narrative: section.narrative ?? null,
    tables: section.tables ?? [],
  }
}

function readOptionalString(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function readOptionalBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === "boolean" ? value : null
}

function readRecord(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return isRecord(value) ? value : null
}

function readRecords(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function readStringList(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function listOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items : [fallback]
}

function summarizeMitigationActions(actions: Record<string, unknown>[]) {
  return actions.slice(0, 6).map((action) => {
    const title = readOptionalString(action, "title") ?? "Recommended action"
    const priority = readOptionalString(action, "priority") ?? "Priority not set"
    const readiness = readOptionalString(action, "automationReadiness") ?? "Readiness not set"
    const rationale = readOptionalString(action, "rationale") ?? "No rationale recorded."
    const validation = readOptionalString(action, "validation") ?? "No validation step recorded."
    return `${priority}: ${title} - ${rationale} Validation: ${validation} (${readiness}).`
  })
}

function buildScope(query: SnapshotQuery) {
  return summarizeQuery(query)
}

function buildAegisSnapshot(report: ReportResponse, record: Record<string, unknown>): ReportSnapshot | null {
  const result = readRecord(record, "result")
  const plan = result ? readRecord(result, "mitigationPlan") : null
  if (!result || !plan) {
    return null
  }

  const extractedIocs = readRecords(result, "extractedIocs")
  const claims = readRecords(result, "claims")
  const immediateActions = readRecords(plan, "immediateActions")
  const detectionActions = readRecords(plan, "detectionActions")
  const hardeningActions = readRecords(plan, "hardeningActions")
  const scanRecommendations = readRecords(plan, "scanRecommendations")
  const affectedAssets = readStringList(plan, "affectedAssetHypotheses")
  const assumptions = readStringList(plan, "assumptions")
  const gaps = readStringList(plan, "gaps")
  const validationSteps = readStringList(plan, "validationSteps")
  const sourceReportId = readOptionalString(record, "sourceReportId") ?? readOptionalString(result, "sourceReportId")
  const sourceAlertId = readOptionalString(record, "sourceAlertId")
  const trigger = readOptionalString(record, "autonomousTrigger")
  const requiresHumanReview = readOptionalBoolean(plan, "requiresHumanReview")

  return {
    scope: sourceReportId ? `Aegis mitigation for source report ${sourceReportId}` : "Aegis mitigation plan",
    query: {
      source: trigger ?? (sourceAlertId ? "alert-driven" : "report-review"),
      status: requiresHumanReview === false ? "Ready for operator review" : "Human review recommended",
    },
    sections: [
      {
        title: "Aegis mitigation plan",
        summary: readOptionalString(plan, "executiveSummary") ?? "Aegis created a mitigation plan from the stored report evidence.",
        metrics: [
          { label: "Severity", value: readOptionalString(plan, "severity") ?? "Unknown", detail: "Aegis-assessed response severity." },
          { label: "Confidence", value: readOptionalString(plan, "confidence") ?? "Unknown", detail: "Confidence based on extracted evidence and context." },
          { label: "Planner", value: readOptionalString(result, "plannerModel") ?? "Aegis", detail: "Planner path used to create this mitigation plan." },
          { label: "Linked alerts", value: String(report.alertIds.length), detail: "Alerts associated with this saved mitigation report." },
        ],
        highlights: listOrFallback(
          [
            readOptionalString(plan, "threatSummary"),
            ...affectedAssets.slice(0, 5).map((asset) => `Affected asset hypothesis: ${asset}`),
          ].filter((item): item is string => Boolean(item)),
          "No threat summary was recorded for this Aegis plan.",
        ),
        narrative: sourceAlertId
          ? `Aegis generated this plan after alert ${sourceAlertId}. It is advisory by default and does not modify systems.`
          : "Aegis generated this plan from stored report evidence. It is advisory by default and does not modify systems.",
        tables: [],
      },
      {
        title: "Evidence extracted from the report",
        summary: "Structured indicators and claims Aegis used while building the mitigation plan.",
        metrics: [
          { label: "IOCs", value: String(extractedIocs.length), detail: "IP addresses, domains, hashes, URLs, or related indicators." },
          { label: "Claims", value: String(claims.length), detail: "Evidence statements extracted from the source report." },
          { label: "Campaign hints", value: String(readStringList(result, "campaignHints").length), detail: "Campaign names or clusters detected in the report." },
          { label: "Malware hints", value: String(readStringList(result, "malwareFamilyHints").length), detail: "Malware or tool family hints detected in the report." },
        ],
        highlights: listOrFallback(
          extractedIocs.slice(0, 10).map((ioc) => {
            const type = readOptionalString(ioc, "iocType") ?? "ioc"
            const value = readOptionalString(ioc, "iocValue") ?? "unknown"
            const confidence = typeof ioc.confidence === "number" ? ` (${Math.round(ioc.confidence * 100)}% confidence)` : ""
            return `${type}: ${value}${confidence}`
          }),
          "No structured IOCs were extracted from the saved plan.",
        ),
        narrative: claims.length > 0
          ? claims.slice(0, 3).map((claim) => readOptionalString(claim, "statement")).filter(Boolean).join(" ")
          : null,
        tables: [],
      },
      {
        title: "Immediate mitigation actions",
        summary: "Highest-priority recommendations for containment, triage, and operator review.",
        metrics: [
          { label: "Immediate", value: String(immediateActions.length), detail: "Actions Aegis thinks should happen first." },
          { label: "Human review", value: requiresHumanReview === false ? "No" : "Yes", detail: "Whether Aegis requires operator approval before application." },
        ],
        highlights: listOrFallback(summarizeMitigationActions(immediateActions), "No immediate actions were recorded."),
        narrative: null,
        tables: [],
      },
      {
        title: "Detection and hardening",
        summary: "Follow-up monitoring and resilience recommendations.",
        metrics: [
          { label: "Detection", value: String(detectionActions.length), detail: "Recommended monitoring or detection improvements." },
          { label: "Hardening", value: String(hardeningActions.length), detail: "Recommended configuration or resilience improvements." },
          { label: "Validation", value: String(validationSteps.length), detail: "Ways to confirm mitigation worked." },
        ],
        highlights: listOrFallback(
          [
            ...summarizeMitigationActions(detectionActions),
            ...summarizeMitigationActions(hardeningActions),
            ...validationSteps.slice(0, 5).map((step) => `Validation: ${step}`),
          ],
          "No detection, hardening, or validation recommendations were recorded.",
        ),
        narrative: null,
        tables: [],
      },
      {
        title: "Zira follow-up suggestions",
        summary: "Suggested scan ideas only. Zira remains responsible for deciding whether to create or run scan plans.",
        metrics: [
          { label: "Suggested scans", value: String(scanRecommendations.length), detail: "Aegis-to-Zira recommendations captured in the plan." },
          { label: "Assumptions", value: String(assumptions.length), detail: "Assumptions Aegis made while planning." },
          { label: "Gaps", value: String(gaps.length), detail: "Missing evidence Aegis wants filled later." },
        ],
        highlights: listOrFallback(
          [
            ...scanRecommendations.slice(0, 6).map((scan) => {
              const scanner = readOptionalString(scan, "scannerFamily") ?? "scanner"
              const target = readOptionalString(scan, "targetHint") ?? "target"
              const rule = readOptionalString(scan, "ruleHint") ?? "rule"
              const rationale = readOptionalString(scan, "rationale") ?? "No rationale recorded."
              return `${scanner} on ${target} using ${rule}: ${rationale}`
            }),
            ...assumptions.slice(0, 4).map((item) => `Assumption: ${item}`),
            ...gaps.slice(0, 4).map((item) => `Gap: ${item}`),
          ],
          "No follow-up scan suggestions, assumptions, or gaps were recorded.",
        ),
        narrative: null,
        tables: [],
      },
    ],
  }
}

function parseReportSnapshot(report: ReportResponse, targets: TargetServerResponse[]): ReportSnapshot {
  try {
    const parsed = JSON.parse(report.summaryJson) as unknown
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>
      const aegisSnapshot = buildAegisSnapshot(report, record)
      if (aegisSnapshot) {
        return aegisSnapshot
      }

      const filters = (typeof record.filters === "object" && record.filters !== null ? record.filters : record.query) as Record<string, unknown> | undefined
      const query: SnapshotQuery = filters
        ? {
            targetServerId: readOptionalString(filters, "targetServerId"),
            scannerFamily: readOptionalString(filters, "scannerFamily") ?? readOptionalString(filters, "ScannerFamily"),
            fromUtc: readOptionalString(filters, "fromUtc") ?? readOptionalString(filters, "FromUtc"),
            toUtc: readOptionalString(filters, "toUtc") ?? readOptionalString(filters, "ToUtc"),
            severity: readOptionalString(filters, "severity"),
            status: readOptionalString(filters, "status"),
            iocType: readOptionalString(filters, "iocType"),
            source: readOptionalString(filters, "source"),
          }
        : {}

      if (query.targetServerId) {
        const target = targets.find((item) => item.id === query.targetServerId)
        query.targetLabel = target ? target.hostname || target.ipAddress : query.targetServerId
      }

      const sections = isSectionArray(record.sections) ? record.sections.map(normalizeReportSection) : []
      if (sections.length === 0) {
        return buildFallbackSnapshot(report)
      }

      return {
        scope: readOptionalString(record, "scope") ?? buildScope(query),
        query,
        sections,
      }
    }
  } catch {
    // Fall back to a raw snapshot panel below.
  }

  return buildFallbackSnapshot(report)
}

function buildFallbackSnapshot(report: ReportResponse): ReportSnapshot {
  return {
    scope: "Stored snapshot",
    query: {},
    sections: [
      {
        title: report.title,
        summary: "This report was migrated without structured sections. The raw stored summary is preserved below.",
        metrics: [
          { label: "Report type", value: formatReportType(report.reportType), detail: "Persisted report classification." },
          { label: "Linked alerts", value: String(report.alertIds.length), detail: "Alerts associated with this report." },
        ],
        highlights: [report.summaryJson],
        narrative: null,
        tables: [],
      },
    ],
  }
}

function isAegisMitigationReport(report: ReportResponse) {
  return report.summaryJson.includes("aegisMitigationPlanVersion")
}

function BuilderMetric({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof LayoutTemplate
  label: string
  value: string
  description: string
}) {
  return (
    <div className="wb-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-surface-1/70 text-primary shadow-[var(--shadow-soft)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "system"
  const [refreshKey, setRefreshKey] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReportPreviewState | null>(null)
  const [review, setReview] = useState<ReportPreviewState | null>(null)
  const [closedReviewId, setClosedReviewId] = useState<string | null>(null)
  const [reviewPdfUrl, setReviewPdfUrl] = useState<string | null>(null)
  const [reviewPdfLoading, setReviewPdfLoading] = useState(false)
  const [reviewPdfError, setReviewPdfError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [form, setForm] = useState(() => {
    const range = defaultUtcRange()
    return {
      reportType: "ExecutiveSummary",
      title: "",
      targetId: "",
      scannerFamily: "",
      severity: "",
      status: "",
      fromUtc: range.fromUtc,
      toUtc: range.toUtc,
      persist: true,
    }
  })

  const targetsQuery = useWorkbenchQuery(["reports", "servers"], (signal) => gateway.listTargetServers(undefined, signal))
  const reportsQuery = useWorkbenchQuery(["reports", "library", refreshKey], (signal) => gateway.listReports({ page: 1, pageSize: 100 }, signal))
  const aegisPlansQuery = useWorkbenchQuery(["reports", "aegis-plans", refreshKey], (signal) => gateway.listReportMitigationPlans(signal))
  const requestedReviewId = searchParams.get("review")

  const generate = async () => {
    setGenerating(true)
    setErrorText(null)
    setMessage(null)
    try {
      const payload: GenerateReportInput = {
        reportType: form.reportType as ReportGenerationType,
        title: form.title || undefined,
        targetServerId: form.targetId || undefined,
        fromUtc: form.fromUtc || undefined,
        toUtc: form.toUtc || undefined,
        scannerFamily: form.scannerFamily ? (form.scannerFamily as RuleFamily) : undefined,
        severity: form.severity || undefined,
        status: form.status || undefined,
        persist: form.persist,
        actorUserId,
      }
      const response = await gateway.generateReport(payload)
      setPreview({ kind: "generated", report: response })
      setMessage(form.persist ? "Report generated and saved to the library." : "Preview generated without saving.")
      if (response.persistedReport) {
        setRefreshKey((value) => value + 1)
      }
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setGenerating(false)
    }
  }

  const clearReviewPdf = () => {
    setReviewPdfUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }

      return null
    })
    setReviewPdfLoading(false)
    setReviewPdfError(null)
  }

  const openSavedReport = async (report: ReportResponse, targets: TargetServerResponse[]) => {
    setErrorText(null)
    setMessage(null)
    setClosedReviewId(null)
    const nextReview = { kind: "saved", report, snapshot: parseReportSnapshot(report, targets) } as const
    setPreview(nextReview)
    setReview(nextReview)
    clearReviewPdf()
    if (isAegisMitigationReport(report)) {
      setMessage("Aegis mitigation plan opened in structured review mode.")
      return
    }

    setMessage("Saved report opened in review mode.")
    setReviewPdfLoading(true)
    try {
      const pdf = await requestBlob(`/api/v2/reports/${report.id}/pdf`)
      setReviewPdfUrl(URL.createObjectURL(pdf.blob))
    } catch (error) {
      setReviewPdfError(classifyUiError(error).message)
    } finally {
      setReviewPdfLoading(false)
    }
  }

  const closeReview = () => {
    if (review?.kind === "saved") {
      setClosedReviewId(review.report.id)
    }

    setReview(null)
    setPreview(null)
    clearReviewPdf()
    if (requestedReviewId) {
      window.history.replaceState(null, "", "/reports")
    }
  }

  const deleteSavedReport = async (reportId: string, title: string) => {
    if (!window.confirm(`Delete saved report "${title}"? This does not affect source scan data.`)) {
      return
    }

    setDeletingReportId(reportId)
    setErrorText(null)
    setMessage(null)
    try {
      await gateway.deleteReport(reportId)
      if (preview?.kind === "saved" && preview.report.id === reportId) {
        setPreview(null)
      }

      if (review?.kind === "saved" && review.report.id === reportId) {
        setReview(null)
        clearReviewPdf()
      }

      if (preview?.kind === "generated" && preview.report.persistedReport?.id === reportId) {
        setPreview(null)
      }

      setMessage(`Deleted "${title}" from the saved library.`)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setDeletingReportId(null)
    }
  }

  const resetLastSevenDays = () => {
    const range = defaultUtcRange()
    setForm((current) => ({
      ...current,
      fromUtc: range.fromUtc,
      toUtc: range.toUtc,
    }))
  }

  useEffect(() => {
    if (
      !requestedReviewId
      || closedReviewId === requestedReviewId
      || targetsQuery.isLoading
      || reportsQuery.isLoading
      || targetsQuery.isError
      || reportsQuery.isError
      || (review?.kind === "saved" && review.report.id === requestedReviewId)
    ) {
      return
    }

    const report = reportsQuery.data?.items.find((item) => item.id === requestedReviewId)
    if (!report) {
      return
    }

    setClosedReviewId(null)
    void openSavedReport(report, targetsQuery.data ?? [])
  }, [
    closedReviewId,
    requestedReviewId,
    reportsQuery.data,
    reportsQuery.isError,
    reportsQuery.isLoading,
    review,
    targetsQuery.data,
    targetsQuery.isError,
    targetsQuery.isLoading,
  ])

  if (targetsQuery.isLoading || reportsQuery.isLoading || aegisPlansQuery.isLoading) {
    return <LoadingState label="Loading reports workspace" />
  }

  if (targetsQuery.isError || reportsQuery.isError || aegisPlansQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(targetsQuery.error ?? reportsQuery.error ?? aegisPlansQuery.error)} fallbackTitle="Reports unavailable" />
  }

  const targets = targetsQuery.data ?? []
  const reports = reportsQuery.data?.items ?? []
  const aegisPlanBySourceReportId = new Map((aegisPlansQuery.data?.items ?? []).filter((plan) => plan.sourceReportId).map((plan) => [plan.sourceReportId, plan]))
  const generatedQuery: SnapshotQuery = {
    targetServerId: form.targetId || null,
    targetLabel: targets.find((item) => item.id === form.targetId)?.hostname ?? targets.find((item) => item.id === form.targetId)?.ipAddress ?? null,
    scannerFamily: form.scannerFamily || null,
    fromUtc: form.fromUtc || null,
    toUtc: form.toUtc || null,
    severity: form.severity || null,
    status: form.status || null,
  }
  const previewTitle = preview?.report.title
  const previewReportType = formatReportType(preview?.kind === "saved" ? preview.report.reportType : preview?.report.requestedReportType)
  const previewScope = preview?.kind === "saved" ? preview.snapshot.scope : buildScope(generatedQuery)
  const previewSections = (preview?.kind === "saved" ? preview.snapshot.sections : preview?.report.sections)?.map(normalizeReportSection)
  const previewQuery = preview?.kind === "saved" ? preview.snapshot.query : generatedQuery
  const previewGeneratedAt = preview?.kind === "saved" ? preview.report.generatedAtUtc : preview?.report.generatedAtUtc
  const reviewTitle = review?.report.title
  const reviewReportType = formatReportType(review?.kind === "saved" ? review.report.reportType : review?.report.requestedReportType)
  const reviewScope = review?.kind === "saved" ? review.snapshot.scope : buildScope(generatedQuery)
  const reviewSections = (review?.kind === "saved" ? review.snapshot.sections : review?.report.sections)?.map(normalizeReportSection)
  const reviewQuery = review?.kind === "saved" ? review.snapshot.query : generatedQuery
  const reviewGeneratedAt = review?.kind === "saved" ? review.report.generatedAtUtc : review?.report.generatedAtUtc
  const reviewIsAegisPlan = review?.kind === "saved" ? isAegisMitigationReport(review.report) : false
  const printReport = () => window.print()

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <div className="max-w-3xl">
          <p className="wb-kicker">Reports</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[var(--shadow-soft)]">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Report workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build, review, and preserve executive and analyst-ready snapshots from stored operational evidence.
              </p>
            </div>
          </div>
        </div>
      </header>

      <article className="wb-hero space-y-5">
        <div className="space-y-1">
          <p className="wb-kicker">Report Builder</p>
          <p className="text-sm text-muted-foreground">Choose a report type, set scope, generate a preview, then save the snapshot when it is ready.</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <BuilderMetric icon={LayoutTemplate} label="Templates" value={String(REPORT_TEMPLATES.length)} description="Executive, IOC, target, and scan-focused modes." />
          <BuilderMetric icon={FolderOpen} label="Saved Reports" value={String(reports.length)} description="Stored snapshots in the library." />
          <BuilderMetric icon={Clock3} label="Default Window" value="7 days" description="UTC scope before custom filtering." />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {REPORT_TEMPLATES.map((template) => {
            const active = form.reportType === template.value
            return (
              <button
                key={template.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, reportType: template.value }))}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-sky-300/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_18%,transparent),color-mix(in_srgb,var(--surface-2)_84%,transparent))] shadow-[var(--shadow-emphasis)]"
                    : "border-border/70 bg-surface-2/45 hover:border-border hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{template.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-surface-1/70 text-primary">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="wb-filter-bar space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="wb-chip">
              <Filter className="h-3.5 w-3.5" />
              Scope and Export Controls
            </span>
            <span className="wb-chip">
              <Database className="h-3.5 w-3.5" />
              Snapshot-backed Outputs
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)_minmax(220px,0.9fr)]">
          <Input
            placeholder="Optional report title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.scannerFamily}
            onChange={(event) => setForm((current) => ({ ...current, scannerFamily: event.target.value }))}
          >
            <option value="">All scanner families</option>
            <option value="YARA">YARA</option>
            <option value="SIGMA">SIGMA</option>
            <option value="SNORT">SNORT</option>
            <option value="SURICATA">SURICATA</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-1 px-3 text-sm">
            <input
              type="checkbox"
              checked={form.persist}
              onChange={(event) => setForm((current) => ({ ...current, persist: event.target.checked }))}
            />
            <span>{form.persist ? "Save snapshot in library" : "Preview only"}</span>
          </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.targetId}
            onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}
          >
            <option value="">All targets</option>
            {targets.map((target) => <option key={target.id} value={target.id}>{target.hostname || target.ipAddress}</option>)}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.severity}
            onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
          </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.9fr)_minmax(220px,0.9fr)_minmax(220px,0.9fr)]">
          <Input
            placeholder="From UTC (ISO-8601)"
            value={form.fromUtc}
            onChange={(event) => setForm((current) => ({ ...current, fromUtc: event.target.value }))}
          />
          <Input
            placeholder="To UTC (ISO-8601)"
            value={form.toUtc}
            onChange={(event) => setForm((current) => ({ ...current, toUtc: event.target.value }))}
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">All alert statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={generating}>
            {generating ? "Generating..." : "Generate Report"}
          </Button>
          <Button type="button" variant="outline" onClick={resetLastSevenDays}>
            Reset to last 7 days
          </Button>
          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          {errorText ? <p className="text-sm text-rose-700 dark:text-rose-300">{errorText}</p> : null}
        </div>
      </article>

      <article className="wb-reading-surface space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Preview</p>
            <p className="text-sm text-muted-foreground">Inspect the transient preview or reopen a persisted snapshot from the saved library.</p>
          </div>
          {preview ? (
            <Button type="button" variant="outline" onClick={printReport}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Export
            </Button>
          ) : null}
        </div>

        {!preview ? (
          <EmptyState title="No preview yet" description="Generate a report or open a saved snapshot to inspect the report sections." />
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--primary)_10%,transparent),color-mix(in_srgb,var(--surface-2)_88%,transparent)_30%,color-mix(in_srgb,var(--surface-1)_86%,transparent))] p-5 shadow-[var(--shadow-panel)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="wb-chip">
                    <Eye className="h-3.5 w-3.5" />
                    {preview.kind === "saved" ? "Saved Snapshot" : preview.report.persistedReport ? "Generated and Saved" : "Preview Only"}
                  </span>
                  <p className="mt-3 text-xl font-semibold tracking-tight">{previewTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{previewReportType} | {previewScope}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatUtc(previewGeneratedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/30 px-3 py-3 text-xs text-muted-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
                  {summarizeQuery(previewQuery ?? {})}
                </div>
              </div>
            </div>

            {previewSections?.map((section) => (
              <div key={section.title} className="wb-section-frame">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{section.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
                  </div>
                </div>

                {section.narrative ? (
                  <div className="mt-4 rounded-2xl border border-border/55 bg-background/35 px-4 py-3 text-sm leading-6 text-foreground/85">
                    {section.narrative}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {section.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[1.2rem] border border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-1)_85%,transparent),color-mix(in_srgb,var(--background)_82%,transparent))] p-3 shadow-[var(--shadow-soft)]">
                      <p className="wb-kicker">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                {section.highlights.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {section.highlights.map((highlight) => (
                      <div key={highlight} className="rounded-2xl border border-border/55 bg-surface-1/55 px-4 py-3 text-sm text-muted-foreground">
                        {highlight}
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.tables.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {section.tables.map((table) => (
                      <div key={table.title} className="overflow-hidden rounded-2xl border border-border/60 bg-surface-1/45">
                        <div className="border-b border-border/55 px-4 py-3">
                          <p className="text-sm font-semibold">{table.title}</p>
                        </div>
                        {table.rows.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-muted-foreground">No rows matched this report scope.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                <tr>
                                  {table.columns.map((column) => (
                                    <th key={column.key} className="border-b border-border/50 px-3 py-2 font-semibold">{column.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, rowIndex) => (
                                  <tr key={`${table.title}-${rowIndex}`} className="border-b border-border/35 last:border-0">
                                    {table.columns.map((column) => (
                                      <td key={column.key} className="max-w-[280px] px-3 py-2 align-top text-muted-foreground">
                                        {row.values[column.key] ?? "n/a"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Saved Library</p>
            <p className="text-sm text-muted-foreground">Persisted report snapshots stay here until you delete them. Opening a saved report uses the stored snapshot instead of regenerating from live data.</p>
          </div>
          <span className="wb-chip">
            <FolderOpen className="h-3.5 w-3.5" />
            Snapshot Archive
          </span>
        </div>

        {reports.length === 0 ? (
          <EmptyState title="No saved reports" description="Persisted report snapshots will appear here after generation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Scope</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const snapshot = parseReportSnapshot(report, targets)
                  const deleting = deletingReportId === report.id
                  const aegisPlan = aegisPlanBySourceReportId.get(report.id)
                  const isAegisPlan = isAegisMitigationReport(report)
                  return (
                    <tr key={report.id} className="border-t border-border/50 align-top">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{report.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Report #{report.id}</p>
                          {aegisPlan || isAegisPlan ? (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
                              <ShieldCheck className="h-3 w-3" />
                              {isAegisPlan ? "Aegis mitigation plan" : "Aegis plan available"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3">{formatReportType(report.reportType)}</td>
                      <td className="py-3 text-muted-foreground">{snapshot.scope}</td>
                      <td className="py-3 text-muted-foreground">{formatUtc(report.createdAtUtc)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => openSavedReport(report, targets)} disabled={deleting}>
                            Open
                          </Button>
                          {aegisPlan || isAegisPlan ? (
                            <Link
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                              href={`/agents/aegis?plan=${encodeURIComponent(aegisPlan?.id ?? report.id)}`}
                            >
                              Open in Aegis
                            </Link>
                          ) : null}
                          <Button type="button" variant="outline" onClick={() => deleteSavedReport(report.id, report.title)} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {review ? (
        <div className="report-review-modal fixed inset-0 z-50 bg-background/88 p-4 backdrop-blur-xl md:p-8" role="dialog" aria-modal="true" aria-label="Report review">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface-1 shadow-[var(--shadow-panel)]">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div>
                <p className="wb-kicker">Report Review</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{reviewTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{reviewReportType} | {reviewScope}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatUtc(reviewGeneratedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={printReport}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Export
                </Button>
                <Button type="button" variant="outline" onClick={closeReview} aria-label="Close report review">
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-4 rounded-2xl border border-border/65 bg-surface-2/50 px-4 py-3 text-sm text-muted-foreground">
                {summarizeQuery(reviewQuery ?? {})}
              </div>

              {review.kind === "saved" && !reviewIsAegisPlan ? (
                <section className="mb-5 overflow-hidden rounded-2xl border border-border/65 bg-surface-2/45">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/55 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">PDF Preview</p>
                      <p className="mt-1 text-xs text-muted-foreground">Rendered from the stored report snapshot.</p>
                    </div>
                    {reviewPdfLoading ? <span className="text-xs text-muted-foreground">Rendering PDF...</span> : null}
                  </div>
                  {reviewPdfError ? (
                    <div className="px-4 py-4 text-sm text-rose-700 dark:text-rose-300">{reviewPdfError}</div>
                  ) : reviewPdfUrl ? (
                    <iframe
                      title={`${reviewTitle ?? "Report"} PDF preview`}
                      src={reviewPdfUrl}
                      className="h-[72vh] w-full bg-white"
                    />
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground">Preparing PDF preview.</div>
                  )}
                </section>
              ) : review.kind === "saved" && reviewIsAegisPlan ? (
                <section className="mb-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Aegis mitigation plans are shown as structured recommendations below instead of a generic PDF iframe. Use Print / Export to export this view.
                </section>
              ) : null}

              <div className="space-y-4">
                {reviewSections?.map((section) => (
                  <div key={section.title} className="wb-section-frame">
                    <div>
                      <p className="text-base font-semibold">{section.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
                    </div>

                    {section.narrative ? (
                      <div className="mt-4 rounded-2xl border border-border/55 bg-background/35 px-4 py-3 text-sm leading-6 text-foreground/85">
                        {section.narrative}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {section.metrics.map((metric) => (
                        <div key={metric.label} className="rounded-[1.2rem] border border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-1)_85%,transparent),color-mix(in_srgb,var(--background)_82%,transparent))] p-3 shadow-[var(--shadow-soft)]">
                          <p className="wb-kicker">{metric.label}</p>
                          <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                        </div>
                      ))}
                    </div>

                    {section.highlights.length > 0 ? (
                      <div className="mt-4 grid gap-2">
                        {section.highlights.map((highlight) => (
                          <div key={highlight} className="rounded-2xl border border-border/55 bg-surface-1/55 px-4 py-3 text-sm text-muted-foreground">
                            {highlight}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {section.tables.length > 0 ? (
                      <div className="mt-4 space-y-4">
                        {section.tables.map((table) => (
                          <div key={table.title} className="overflow-hidden rounded-2xl border border-border/60 bg-surface-1/45">
                            <div className="border-b border-border/55 px-4 py-3">
                              <p className="text-sm font-semibold">{table.title}</p>
                            </div>
                            {table.rows.length === 0 ? (
                              <div className="px-4 py-4 text-sm text-muted-foreground">No rows matched this report scope.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                  <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                    <tr>
                                      {table.columns.map((column) => (
                                        <th key={column.key} className="border-b border-border/50 px-3 py-2 font-semibold">{column.label}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.rows.map((row, rowIndex) => (
                                      <tr key={`${table.title}-${rowIndex}`} className="border-b border-border/35 last:border-0">
                                        {table.columns.map((column) => (
                                          <td key={column.key} className="max-w-[280px] px-3 py-2 align-top text-muted-foreground">
                                            {row.values[column.key] ?? "n/a"}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
