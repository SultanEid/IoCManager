"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BarChart3,
  Clock3,
  Database,
  Download,
  Eye,
  FileText,
  FolderOpen,
  ShieldCheck,
  type LucideIcon,
  X,
} from "lucide-react"
import { AegisMitigationTimeline, AegisPrimaryActions, type LegacyPlanLike } from "@/components/workbench/aegis/mitigation-plan-elements"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { reportTypeAccent } from "@/components/workbench/accent-tone"
import { classifyUiError } from "@/shared/api/error-classification"
import type { GeneratedReportResponse, GeneratedReportSectionResponse, ReportMitigationPlanResponse, ReportResponse, RuleFamily, TargetServerResponse } from "@/shared/api/schemas"
import { writeAegisWidgetState } from "@/shared/aegis/widget-state"
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
    icon: BarChart3,
  },
  {
    value: "DetailedIocReport",
    label: "Detailed IOC Report",
    description: "Scanner-heavy finding coverage grouped around rule hits and indicator counts.",
    icon: Database,
  },
  {
    value: "TargetExposureSummary",
    label: "Target Exposure Summary",
    description: "Target inventory posture and finding linkage for selected hosts or subnets.",
    icon: ShieldCheck,
  },
  {
    value: "ScanActivitySummary",
    label: "Scan Activity Summary",
    description: "Execution outcomes and recent result activity across the selected scope.",
    icon: Clock3,
  },
] as const

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const
const STATUS_OPTIONS = ["Open", "Investigating", "Resolved", "Closed"] as const
const REPORT_WORKSPACES = ["builder", "library"] as const

type ReportWorkspace = (typeof REPORT_WORKSPACES)[number]

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

function reportHtmlHref(reportId: string) {
  return `/api/v2/reports/${encodeURIComponent(reportId)}/html`
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
  aegisPlan?: LegacyPlanLike | null
}

type ReportPreviewState =
  | { kind: "generated"; report: GeneratedReportResponse }
  | { kind: "saved"; report: ReportResponse; snapshot: ReportSnapshot }

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

function readValue(source: Record<string, unknown>, key: string) {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    return source[key]
  }

  const match = Object.keys(source).find((candidate) => candidate.toLowerCase() === key.toLowerCase())
  return match ? source[match] : undefined
}

function readOptionalString(source: Record<string, unknown>, key: string) {
  const value = readValue(source, key)
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function readOptionalBoolean(source: Record<string, unknown>, key: string) {
  const value = readValue(source, key)
  return typeof value === "boolean" ? value : null
}

function readRecord(source: Record<string, unknown>, key: string) {
  const value = readValue(source, key)
  return isRecord(value) ? value : null
}

function readRecords(source: Record<string, unknown>, key: string) {
  const value = readValue(source, key)
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function readStringList(source: Record<string, unknown>, key: string) {
  const value = readValue(source, key)
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

type ReportTone = {
  border: string
  surface: string
  text: string
  rail: string
}

const neutralReportTone: ReportTone = {
  border: "border-border/55",
  surface: "bg-surface-1/55",
  text: "text-muted-foreground",
  rail: "bg-border",
}

function normalizeReportToken(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, " ")
}

function reportToneForValue(value: string | null | undefined): ReportTone {
  const normalized = normalizeReportToken(value ?? "")

  if (["critical", "high", "open", "yes", "human review recommended"].includes(normalized)) {
    return {
      border: "border-rose-300/35",
      surface: "bg-rose-500/10",
      text: "text-rose-100",
      rail: "bg-rose-300",
    }
  }

  if (["medium", "investigating", "review soon", "partial", "safe to draft"].includes(normalized)) {
    return {
      border: "border-orange-300/35",
      surface: "bg-orange-500/10",
      text: "text-orange-100",
      rail: "bg-orange-300",
    }
  }

  if (["resolved", "operator can proceed", "no"].includes(normalized)) {
    return {
      border: "border-sky-300/35",
      surface: "bg-sky-500/10",
      text: "text-sky-100",
      rail: "bg-sky-300",
    }
  }

  if (["closed", "low"].includes(normalized)) {
    return {
      border: "border-slate-300/30",
      surface: "bg-slate-500/10",
      text: "text-slate-200",
      rail: "bg-slate-400",
    }
  }

  return neutralReportTone
}

function reportToneForMetric(label: string, value: string): ReportTone {
  const normalizedLabel = normalizeReportToken(label)
  const normalizedValue = normalizeReportToken(value)

  if (normalizedLabel === "confidence") {
    if (normalizedValue === "high") {
      return {
        border: "border-emerald-300/35",
        surface: "bg-emerald-500/10",
        text: "text-emerald-100",
        rail: "bg-emerald-300",
      }
    }

    if (normalizedValue === "medium") {
      return {
        border: "border-orange-300/35",
        surface: "bg-orange-500/10",
        text: "text-orange-100",
        rail: "bg-orange-300",
      }
    }

    if (normalizedValue === "low") {
      return {
        border: "border-rose-300/35",
        surface: "bg-rose-500/10",
        text: "text-rose-100",
        rail: "bg-rose-300",
      }
    }
  }

  return reportToneForValue(value)
}

function splitLeadingReportToken(value: string) {
  const match = value.match(/^([a-zA-Z][a-zA-Z0-9_ -]{1,32}):\s*(.+)$/)
  if (!match) {
    return null
  }

  return {
    token: match[1].trim(),
    body: match[2].trim(),
  }
}

function ReportMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  const isToneable = ["severity", "status", "human review", "review gate", "confidence"].includes(normalizeReportToken(label))
  const tone = isToneable ? reportToneForMetric(label, value) : neutralReportTone

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] border ${tone.border} ${tone.surface} p-3 shadow-[var(--shadow-soft)]`}>
      {isToneable ? <span className={`absolute inset-y-3 left-0 w-1 rounded-r ${tone.rail}`} aria-hidden="true" /> : null}
      <p className="wb-kicker">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${isToneable ? tone.text : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ReportHighlightCard({ highlight }: { highlight: string }) {
  const leading = splitLeadingReportToken(highlight)
  const tone = leading ? reportToneForValue(leading.token) : neutralReportTone

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${tone.border} ${tone.surface} px-4 py-3 text-sm leading-6 text-muted-foreground`}>
      {leading ? <span className={`absolute inset-y-3 left-0 w-1 rounded-r ${tone.rail}`} aria-hidden="true" /> : null}
      {leading ? (
        <p>
          <span className={`mr-2 inline-flex rounded-full border ${tone.border} ${tone.surface} px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.text}`}>
            {leading.token}
          </span>
          <span>{leading.body}</span>
        </p>
      ) : (
        highlight
      )}
    </div>
  )
}

function buildScope(query: SnapshotQuery) {
  return summarizeQuery(query)
}

function readStoredSections(record: Record<string, unknown>): GeneratedReportSectionResponse[] {
  return readRecords(record, "sections").map((section) => ({
    title: readOptionalString(section, "title") ?? "Report Section",
    summary: readOptionalString(section, "summary") ?? "",
    metrics: readRecords(section, "metrics").map((metric) => ({
      label: readOptionalString(metric, "label") ?? "Metric",
      value: readOptionalString(metric, "value") ?? "n/a",
      detail: readOptionalString(metric, "detail") ?? "",
    })),
    highlights: readStringList(section, "highlights"),
    narrative: readOptionalString(section, "narrative"),
    tables: readRecords(section, "tables").map((table) => ({
      title: readOptionalString(table, "title") ?? "Table",
      columns: readRecords(table, "columns").map((column) => ({
        key: readOptionalString(column, "key") ?? "",
        label: readOptionalString(column, "label") ?? readOptionalString(column, "key") ?? "Column",
      })).filter((column) => column.key.length > 0),
      rows: readRecords(table, "rows").map((row) => {
        const values = readRecord(row, "values") ?? {}
        return {
          values: Object.fromEntries(
            Object.entries(values).map(([key, value]) => [
              key,
              typeof value === "string" ? value : value == null ? "" : String(value),
            ]),
          ),
        }
      }),
    })),
  }))
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
    aegisPlan: plan as LegacyPlanLike,
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
        title: "Hardening and validation",
        summary: "Follow-up resilience recommendations and validation checks.",
        metrics: [
          { label: "Hardening", value: String(hardeningActions.length), detail: "Recommended configuration or resilience improvements." },
          { label: "Validation", value: String(validationSteps.length), detail: "Ways to confirm mitigation worked." },
        ],
        highlights: listOrFallback(
          [
            ...summarizeMitigationActions(hardeningActions),
            ...validationSteps.slice(0, 5).map((step) => `Validation: ${step}`),
          ],
          "No hardening or validation recommendations were recorded.",
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

      const sections = readStoredSections(record).map(normalizeReportSection)
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
  icon: LucideIcon
  label: string
  value: string
  description: string
}) {
  return (
    <div
      className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-full border border-border/55 bg-surface-1/60 px-3.5 py-2 text-sm shadow-[var(--shadow-soft)]"
      aria-label={`${label}: ${value}. ${description}`}
      title={description}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border/60 bg-background/70 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="ml-2 text-base font-semibold tracking-tight text-foreground">{value}</span>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "system"
  const [refreshKey, setRefreshKey] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [aegisBusyReportId, setAegisBusyReportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReportPreviewState | null>(null)
  const [review, setReview] = useState<ReportPreviewState | null>(null)
  const [closedReviewId, setClosedReviewId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [activeWorkspace, setActiveWorkspace] = useState<ReportWorkspace>("builder")
  const [reviewLanguage, setReviewLanguage] = useState<"en" | "ar">("en")
  const [translatedReviewAegisPlan, setTranslatedReviewAegisPlan] = useState<ReportMitigationPlanResponse | null>(null)
  const [reviewTranslationBusy, setReviewTranslationBusy] = useState(false)
  const [reviewTranslationError, setReviewTranslationError] = useState<string | null>(null)
  const previewRef = useRef<HTMLElement | null>(null)
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

  const focusPreview = useCallback(() => {
    window.requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

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
      focusPreview()
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

  const openSavedReport = useCallback(async (report: ReportResponse, targets: TargetServerResponse[]) => {
    setErrorText(null)
    setMessage(null)
    setClosedReviewId(null)
    const nextReview = { kind: "saved", report, snapshot: parseReportSnapshot(report, targets) } as const
    setPreview(nextReview)
    setReview(nextReview)
    focusPreview()
    if (isAegisMitigationReport(report)) {
      setMessage("Aegis mitigation plan opened in structured review mode.")
      return
    }

    setMessage("Saved report opened in review mode.")
  }, [focusPreview])

  const closeReview = () => {
    if (review?.kind === "saved") {
      setClosedReviewId(review.report.id)
    }

    setReviewLanguage("en")
    setTranslatedReviewAegisPlan(null)
    setReviewTranslationError(null)
    setReview(null)
    setPreview(null)
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

  const openAegisPlan = (planId: string) => {
    writeAegisWidgetState({
      phase: "completed",
      title: "Aegis mitigation plan ready",
      sourceName: "Saved Aegis plan",
      reviewPath: `/agents/aegis?plan=${encodeURIComponent(planId)}`,
      source: "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
    router.push(`/agents/aegis?plan=${encodeURIComponent(planId)}`)
  }

  const createAegisPlanForReport = async (reportId: string, regenerate: boolean) => {
    setAegisBusyReportId(reportId)
    setErrorText(null)
    setMessage(null)
    const sourceReport = reports.find((item) => item.id === reportId)
    writeAegisWidgetState({
      phase: regenerate ? "drafting" : "reviewing",
      title: regenerate ? "Aegis is regenerating a mitigation plan" : "Aegis is reviewing the selected report",
      sourceName: sourceReport?.title ?? "Selected report",
      reviewPath: null,
      source: "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
    try {
      const response = await gateway.generateReportMitigation({
        sourceName: "Aegis report review",
        sourceType: "bulletin",
        existingReportId: reportId,
        includeWorkspaceContext: true,
        actorUserId,
        regenerate,
      })
      if (!response.persistedMitigationReport) {
        throw new Error("Aegis did not return a saved mitigation plan.")
      }
      setRefreshKey((value) => value + 1)
      writeAegisWidgetState({
        phase: "completed",
        title: "Aegis mitigation plan ready",
        sourceName: response.persistedMitigationReport.title,
        reviewPath: `/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`,
        source: "user_action",
        updatedAtUtc: new Date().toISOString(),
      })
      router.push(`/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`)
    } catch (error) {
      writeAegisWidgetState({
        phase: "blocked",
        title: "Aegis was blocked while reviewing the selected report",
        sourceName: sourceReport?.title ?? "Selected report",
        reviewPath: null,
        source: "user_action",
        updatedAtUtc: new Date().toISOString(),
      })
      setErrorText(classifyUiError(error).message)
    } finally {
      setAegisBusyReportId(null)
    }
  }

  const showReviewArabic = async () => {
    if (review?.kind !== "saved") {
      return
    }

    if (translatedReviewAegisPlan) {
      setReviewLanguage("ar")
      return
    }

    setReviewTranslationBusy(true)
    setReviewTranslationError(null)
    try {
      const response = await gateway.translateReportMitigationPlan(review.report.id, {
        targetLanguage: "ar",
        actorUserId,
      })
      setTranslatedReviewAegisPlan(response.mitigationPlan)
      setReviewLanguage("ar")
    } catch (error) {
      setReviewTranslationError(classifyUiError(error).message)
    } finally {
      setReviewTranslationBusy(false)
    }
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

    const controller = new AbortController()
    void (async () => {
      const report = reportsQuery.data?.items.find((item) => item.id === requestedReviewId)
        ?? await gateway.getReport(requestedReviewId, controller.signal)
      if (controller.signal.aborted) {
        return
      }

      setClosedReviewId(null)
      await openSavedReport(report, targetsQuery.data ?? [])
    })().catch((error) => {
      if (!controller.signal.aborted) {
        setErrorText(classifyUiError(error).message)
      }
    })

    return () => controller.abort()
  }, [
    closedReviewId,
    openSavedReport,
    requestedReviewId,
    reportsQuery.data,
    reportsQuery.isError,
    reportsQuery.isLoading,
    review,
    targetsQuery.data,
    targetsQuery.isError,
    targetsQuery.isLoading,
  ])

  useEffect(() => {
    setReviewLanguage("en")
    setTranslatedReviewAegisPlan(null)
    setReviewTranslationError(null)
  }, [review?.kind === "saved" ? review.report.id : null])

  if (targetsQuery.isLoading || reportsQuery.isLoading || aegisPlansQuery.isLoading) {
    return <LoadingState label="Loading reports workspace" />
  }

  if (targetsQuery.isError || reportsQuery.isError || aegisPlansQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(targetsQuery.error ?? reportsQuery.error ?? aegisPlansQuery.error)} fallbackTitle="Reports unavailable" />
  }

  const targets = targetsQuery.data ?? []
  const reports = reportsQuery.data?.items ?? []
  const visibleReports = reports.slice(0, 12)
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
  const reviewAegisPlan = review?.kind === "saved" ? review.snapshot.aegisPlan ?? null : null
  const displayReviewAegisPlan = reviewLanguage === "ar" && translatedReviewAegisPlan ? translatedReviewAegisPlan : reviewAegisPlan
  const reviewIsArabic = reviewLanguage === "ar" && translatedReviewAegisPlan !== null
  const previewExportReportId = preview?.kind === "saved" ? preview.report.id : preview?.report.persistedReport?.id
  const reviewExportReportId = review?.kind === "saved" ? review.report.id : review?.report.persistedReport?.id

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

      <nav className="wb-panel-muted flex flex-wrap gap-2 p-2" aria-label="Reports workspace">
        {REPORT_WORKSPACES.map((workspace) => (
          <button
            key={workspace}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeWorkspace === workspace
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
            onClick={() => setActiveWorkspace(workspace)}
          >
            {workspace === "builder" ? "Builder" : `Library (${reports.length})`}
          </button>
        ))}
      </nav>

      {activeWorkspace === "builder" ? (
      <>
      <article className="wb-panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/55 pb-4">
          <div className="space-y-1">
            <p className="wb-kicker">Report Builder</p>
            <p className="max-w-3xl text-sm text-muted-foreground">Choose a report type, scope the evidence, preview the report, then export saved snapshots as clean HTML.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BuilderMetric icon={FolderOpen} label="Saved" value={String(reports.length)} description="Stored snapshots in the library." />
            <BuilderMetric icon={Clock3} label="Window" value="7d" description="UTC scope before custom filtering." />
          </div>
        </div>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="space-y-3" aria-labelledby="report-type-heading">
            <div>
              <h3 id="report-type-heading" className="text-sm font-semibold text-foreground">Report type</h3>
              <p className="mt-1 text-xs text-muted-foreground">Pick the structure analysts will review before export.</p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-1">
              {REPORT_TEMPLATES.map((template) => {
                const active = form.reportType === template.value
                const TemplateIcon = template.icon
                const accent = reportTypeAccent(template.value)
                return (
                  <button
                    key={template.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm((current) => ({ ...current, reportType: template.value }))}
                    className={`group relative min-h-[128px] overflow-hidden rounded-2xl border px-5 py-4 text-left transition ${
                      active
                        ? "border-primary/55 bg-surface-2/72 shadow-[var(--shadow-emphasis)]"
                        : "border-border/70 bg-surface-2/42 hover:border-primary/28 hover:bg-surface-2/60"
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${active ? accent.rail : "bg-border/45 group-hover:bg-primary/45"}`} aria-hidden="true" />
                    <div className="flex h-full items-start gap-4">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${
                        active ? accent.icon : "border-border/60 bg-surface-1/70 text-muted-foreground group-hover:border-primary/25 group-hover:text-primary"
                      }`}>
                        <TemplateIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold leading-tight text-foreground">{template.label}</p>
                          {active ? <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${accent.chip}`}>Selected</span> : null}
                        </div>
                        <p className="mt-3 max-w-[42rem] text-sm leading-6 text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/65 bg-surface-2/40 p-4 shadow-[var(--shadow-soft)]" aria-labelledby="scope-output-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="scope-output-heading" className="text-sm font-semibold text-foreground">Scope and output</h3>
                <p className="mt-1 text-xs text-muted-foreground">Constrain report evidence without leaving the builder.</p>
              </div>
              <span className="wb-chip">
                <Database className="h-3.5 w-3.5" />
                HTML snapshots
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Title</span>
                <Input
                  placeholder="Optional report title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Scanner</span>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.scannerFamily}
                    onChange={(event) => setForm((current) => ({ ...current, scannerFamily: event.target.value }))}
                  >
                    <option value="">All scanner families</option>
                    <option value="YARA">YARA</option>
                    <option value="SIGMA">SIGMA</option>
                    <option value="SNORT">SNORT</option>
                    <option value="SURICATA">SURICATA</option>
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Target</span>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.targetId}
                    onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}
                  >
                    <option value="">All targets</option>
                    {targets.map((target) => <option key={target.id} value={target.id}>{target.hostname || target.ipAddress}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Severity</span>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.severity}
                    onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                  >
                    <option value="">All severities</option>
                    {SEVERITY_OPTIONS.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alert status</span>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="">All alert statuses</option>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">From UTC</span>
                  <Input
                    placeholder="ISO-8601"
                    value={form.fromUtc}
                    onChange={(event) => setForm((current) => ({ ...current, fromUtc: event.target.value }))}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">To UTC</span>
                  <Input
                    placeholder="ISO-8601"
                    value={form.toUtc}
                    onChange={(event) => setForm((current) => ({ ...current, toUtc: event.target.value }))}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface-1/60 px-3 py-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.persist}
                    onChange={(event) => setForm((current) => ({ ...current, persist: event.target.checked }))}
                  />
                  <span>{form.persist ? "Save snapshot in library for HTML export" : "Preview only without saving"}</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/55 pt-4">
          <Button onClick={generate} disabled={generating}>
            {generating ? "Building preview..." : "Preview report"}
          </Button>
          <Button type="button" variant="outline" onClick={resetLastSevenDays}>
            Reset to last 7 days
          </Button>
          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          {errorText ? <p className="text-sm text-rose-700 dark:text-rose-300">{errorText}</p> : null}
        </div>
      </article>

      <article ref={previewRef} className="wb-reading-surface scroll-mt-28 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Preview</p>
            <p className="text-sm text-muted-foreground">Review the structured report in the workspace before exporting a saved HTML file.</p>
          </div>
          {preview ? (
            previewExportReportId ? (
              <a
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                href={reportHtmlHref(previewExportReportId)}
                download
              >
                <Download className="mr-2 h-4 w-4" />
                Export HTML
              </a>
            ) : (
              <Button type="button" variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Save snapshot to export HTML
              </Button>
            )
          ) : null}
        </div>

        {!preview ? (
          <EmptyState title="No preview yet" description="Preview a report or open a saved snapshot to inspect the report sections." />
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  {section.metrics.map((metric) => (
                    <ReportMetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
                  ))}
                </div>

                {section.highlights.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {section.highlights.map((highlight) => (
                      <ReportHighlightCard key={highlight} highlight={highlight} />
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
      </>
      ) : null}

      {activeWorkspace === "library" ? (
      <>
      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Saved Library</p>
            <p className="text-sm text-muted-foreground">
              Showing the latest {visibleReports.length} of {reports.length} saved snapshots. Older snapshots remain available through direct report links and future archive search.
            </p>
          </div>
          <span className="wb-chip">
            <FolderOpen className="h-3.5 w-3.5" />
            Snapshot Archive
          </span>
        </div>

        {reports.length === 0 ? (
          <EmptyState title="No saved reports" description="Saved report snapshots will appear here after preview generation with saving enabled." />
        ) : (
          <>
          <div className="hidden overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
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
                  const aegisBusy = aegisBusyReportId === report.id
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
                            Preview
                          </Button>
                          <a
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                            href={reportHtmlHref(report.id)}
                            download
                          >
                            Export HTML
                          </a>
                          {aegisPlan || isAegisPlan ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openAegisPlan(aegisPlan?.id ?? report.id)}
                                disabled={deleting || aegisBusy}
                              >
                                Open in Aegis
                              </Button>
                              {!isAegisPlan ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void createAegisPlanForReport(report.id, true)}
                                  disabled={deleting || aegisBusy}
                                >
                                  {aegisBusy ? "Regenerating..." : "Regenerate"}
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void createAegisPlanForReport(report.id, false)}
                              disabled={deleting || aegisBusy}
                            >
                              {aegisBusy ? "Creating..." : "Create mitigation plan"}
                            </Button>
                          )}
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
          <div className="grid gap-2">
            {visibleReports.map((report) => {
              const snapshot = parseReportSnapshot(report, targets)
              const deleting = deletingReportId === report.id
              const aegisPlan = aegisPlanBySourceReportId.get(report.id)
              const isAegisPlan = isAegisMitigationReport(report)
              const accent = reportTypeAccent(report.reportType)
              return (
                <div key={report.id} className="relative overflow-hidden rounded-xl border border-border/65 bg-surface-1/60 p-3 transition-colors hover:border-primary/25 hover:bg-surface-1/75">
                  <span className={`absolute inset-y-3 left-0 w-1 rounded-r ${accent.rail}`} aria-hidden="true" />
                  <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openSavedReport(report, targets)} disabled={deleting}>
                      <p className="font-semibold text-foreground">{report.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 ${accent.chip}`}>{formatReportType(report.reportType)}</span>
                        <span>{formatUtc(report.createdAtUtc)}</span>
                        <span>{snapshot.scope}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {aegisPlan || isAegisPlan ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200">
                          <ShieldCheck className="h-3 w-3" />
                          Aegis
                        </span>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => openSavedReport(report, targets)} disabled={deleting}>
                        Preview
                      </Button>
                      <details className="relative">
                        <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted [&::-webkit-details-marker]:hidden">
                          More
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 grid w-52 gap-1 rounded-xl border border-border/70 bg-surface-1 p-2 shadow-[var(--shadow-panel)]">
                          <a
                            className="rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2"
                            href={reportHtmlHref(report.id)}
                            download
                          >
                            Export HTML
                          </a>
                          {aegisPlan || isAegisPlan ? (
                            <Link
                              className="rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2"
                              href={`/agents/aegis?plan=${encodeURIComponent(aegisPlan?.id ?? report.id)}`}
                            >
                              Open in Aegis
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
                            onClick={() => deleteSavedReport(report.id, report.title)}
                            disabled={deleting}
                          >
                            {deleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </article>
      </>
      ) : null}

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
                {reviewExportReportId ? (
                  <a
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                    href={reportHtmlHref(reviewExportReportId)}
                    download
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export HTML
                  </a>
                ) : null}
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

              {review.kind === "saved" && reviewIsAegisPlan ? (
                <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  <span>Aegis mitigation plans are shown as structured recommendations below. Export HTML to preserve this report as a standalone file.</span>
                  <span className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant={reviewLanguage === "en" ? "default" : "outline"} onClick={() => setReviewLanguage("en")}>
                      English
                    </Button>
                    <Button type="button" size="sm" variant={reviewIsArabic ? "default" : "outline"} onClick={() => { void showReviewArabic() }} disabled={reviewTranslationBusy}>
                      {reviewTranslationBusy ? "Translating..." : "Arabic"}
                    </Button>
                  </span>
                </section>
              ) : null}

              {reviewTranslationError ? (
                <p className="mb-5 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{reviewTranslationError}</p>
              ) : null}

              {reviewIsAegisPlan && displayReviewAegisPlan ? (
                <div className={`space-y-5 ${reviewIsArabic ? "text-right" : ""}`} dir={reviewIsArabic ? "rtl" : "ltr"}>
                  <section className="rounded-[1.8rem] border border-border/65 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_82%,transparent),color-mix(in_srgb,var(--background)_88%,transparent))] p-5 shadow-[var(--shadow-soft)]">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                      <div className="space-y-4">
                        <div>
                          <p className="wb-kicker">Mitigation Brief</p>
                          <h3 className="mt-1 text-2xl font-semibold tracking-tight">Operator-ready response plan</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                            {displayReviewAegisPlan.executiveSummary?.trim() || "Aegis created a mitigation plan from the stored report evidence and linked alert context."}
                          </p>
                        </div>
                        {displayReviewAegisPlan.threatSummary ? (
                          <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3 text-sm leading-6 text-foreground/85">
                            {displayReviewAegisPlan.threatSummary}
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <ReportMetricCard
                          label="Severity"
                          value={displayReviewAegisPlan.severity || "Unknown"}
                          detail="Aegis-assessed response priority for this case."
                        />
                        <ReportMetricCard
                          label="Confidence"
                          value={displayReviewAegisPlan.confidence || "Unknown"}
                          detail="Confidence based on available evidence and linked operational context."
                        />
                        <ReportMetricCard
                          label="Review Gate"
                          value={displayReviewAegisPlan.requiresHumanReview === false ? "Operator can proceed" : "Human review recommended"}
                          detail="Aegis remains advisory and does not apply mitigations directly."
                        />
                        <ReportMetricCard
                          label="Affected Focus"
                          value={displayReviewAegisPlan.affectedAssetHypotheses?.[0] || "Workspace-wide case"}
                          detail="Primary target or case hypothesis Aegis anchored the plan around."
                        />
                      </div>
                    </div>
                  </section>

                  <AegisPrimaryActions plan={displayReviewAegisPlan} />
                  <AegisMitigationTimeline plan={displayReviewAegisPlan} />

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                    {reviewSections?.slice(1).map((section) => (
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

                        {section.metrics.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {section.metrics.map((metric) => (
                              <ReportMetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
                            ))}
                          </div>
                        ) : null}

                        {section.highlights.length > 0 ? (
                          <div className="mt-4 grid gap-2">
                            {section.highlights.map((highlight) => (
                              <ReportHighlightCard key={highlight} highlight={highlight} />
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
              ) : (
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

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                        {section.metrics.map((metric) => (
                          <ReportMetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
                        ))}
                      </div>

                      {section.highlights.length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {section.highlights.map((highlight) => (
                            <ReportHighlightCard key={highlight} highlight={highlight} />
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
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
