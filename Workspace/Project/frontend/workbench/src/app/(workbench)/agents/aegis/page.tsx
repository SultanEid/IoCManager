"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, FileText, FolderOpen, ShieldCheck, UploadCloud } from "lucide-react"
import { AegisMitigationTimeline, AegisPrimaryActions } from "@/components/workbench/aegis/mitigation-plan-elements"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import type { ReportMitigationActionResponse, ReportMitigationPlanResponse, ReportMitigationResponse, ReportResponse } from "@/shared/api/schemas"
import { writeAegisWidgetState } from "@/shared/aegis/widget-state"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import { listLegacyJobs, listLegacyResults } from "@/shared/gateway/legacy-scan-pipeline"
import type { GenerateReportMitigationInput } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const SUPPORTED_TEXT_EXTENSIONS = [".txt", ".csv", ".json", ".xml", ".stix", ".ioc", ".yar", ".yara", ".yaml", ".yml", ".md"]

function formatUtc(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not recorded"
}

function shortenText(value: string, maxLength = 120) {
  const trimmed = value.trim()
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3).trimEnd()}...`
}

function toDataUrlBase64(dataUrl: string) {
  return dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl
}

function isLikelyTextFile(file: File) {
  const lower = file.name.toLowerCase()
  return file.type.startsWith("text/") || SUPPORTED_TEXT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."))
    reader.readAsText(file)
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."))
    reader.readAsDataURL(file)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readOptionalString(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function readAegisResultFromReport(report: ReportResponse): ReportMitigationResponse | null {
  try {
    const parsed = JSON.parse(report.summaryJson) as unknown
    if (!isRecord(parsed) || !isRecord(parsed.result) || !isRecord(parsed.result.mitigationPlan)) {
      return null
    }

    return {
      ...(parsed.result as Omit<ReportMitigationResponse, "sourceReportId" | "persistedMitigationReport">),
      sourceReportId: readOptionalString(parsed, "sourceReportId") ?? readOptionalString(parsed.result, "sourceReportId"),
      persistedMitigationReport: report,
    } as ReportMitigationResponse
  } catch {
    return null
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

function buildLegacyAegisDocumentId(jobId: string) {
  return `legacy-scan-job:${jobId}`
}

function buildLegacyAegisDocumentText(
  job: {
    id: string
    scannerFamily: string
    triggerType: string
    status: string
    summary: string
    rulePath: string | null
    executionMode: string | null
    queuedAtUtc: string
    startedAtUtc: string | null
    finishedAtUtc: string | null
    totalTargets: number
    completedTargets: number
    failedTargets: number
    noFindingsTargets: number
  },
  results: Array<{
    targetDisplay: string
    status: string
    findingsCount: number
    startedAtUtc: string | null
    finishedAtUtc: string | null
  }>,
) {
  const lines = [
    `Legacy scan job id: ${job.id}`,
    `Scanner family: ${job.scannerFamily}`,
    `Trigger type: ${job.triggerType}`,
    `Status: ${job.status}`,
    `Execution mode: ${job.executionMode ?? "Not recorded"}`,
    `Rule path: ${job.rulePath?.trim() ? job.rulePath : "Not recorded"}`,
    `Queued at UTC: ${job.queuedAtUtc}`,
    `Started at UTC: ${job.startedAtUtc ?? "Not recorded"}`,
    `Finished at UTC: ${job.finishedAtUtc ?? "Not recorded"}`,
    `Summary: ${job.summary}`,
    `Target counts: ${job.completedTargets}/${job.totalTargets} completed, ${job.failedTargets} failed, ${job.noFindingsTargets} no-findings.`,
    "Per-target results:",
    ...(results.length > 0
      ? results.map((result) => `${result.targetDisplay} | ${result.status} | findings=${result.findingsCount} | finished=${result.finishedAtUtc ?? result.startedAtUtc ?? "running"}`)
      : ["No per-target result rows were recorded for this legacy scan job."]),
  ]

  return lines.join("\n")
}

function ActionGroup({ title, actions }: { title: string; actions: ReportMitigationActionResponse[] }) {
  return (
    <details className="wb-panel group space-y-4">
      <summary className="-m-1 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-1 transition-colors hover:bg-surface-2/45 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="wb-kicker">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{actions.length} recommendations</span>
        </span>
        <span className="wb-chip">{actions.length}</span>
      </summary>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aegis did not recommend actions in this category.</p>
      ) : (
        <div className="grid gap-3">
          {actions.map((action) => (
            <div key={`${title}-${action.title}`} className="rounded-2xl border border-border/60 bg-surface-2/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{action.title}</p>
                <span className="wb-chip">{action.priority} | {action.automationReadiness}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{action.rationale}</p>
              <p className="mt-2 text-xs text-muted-foreground">Owner: {action.ownerHint}</p>
              <p className="mt-1 text-xs text-muted-foreground">Validate: {action.validation}</p>
            </div>
          ))}
        </div>
      )}
    </details>
  )
}

function PlanView({ result, actorUserId }: { result: ReportMitigationResponse; actorUserId: string }) {
  const reportId = result.persistedMitigationReport?.id ?? null
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const [translatedPlan, setTranslatedPlan] = useState<ReportMitigationPlanResponse | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const plan = language === "ar" && translatedPlan ? translatedPlan : result.mitigationPlan
  const isArabic = language === "ar" && translatedPlan !== null

  useEffect(() => {
    setLanguage("en")
    setTranslatedPlan(null)
    setTranslationError(null)
  }, [reportId])

  const showArabic = async () => {
    if (!reportId) {
      setTranslationError("Save this mitigation plan before requesting Arabic translation.")
      return
    }

    if (translatedPlan) {
      setLanguage("ar")
      return
    }

    setTranslating(true)
    setTranslationError(null)
    try {
      const response = await gateway.translateReportMitigationPlan(reportId, {
        targetLanguage: "ar",
        actorUserId,
      })
      setTranslatedPlan(response.mitigationPlan)
      setLanguage("ar")
    } catch (error) {
      setTranslationError(classifyUiError(error).message)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className={`space-y-4 ${isArabic ? "text-right" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
      <article className="wb-panel space-y-4 border-emerald-400/35">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Aegis Plan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{plan.severity} severity, {plan.confidence} confidence</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.executiveSummary}</p>
          </div>
          {result.persistedMitigationReport ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={language === "en" ? "default" : "outline"} size="sm" onClick={() => setLanguage("en")}>
                English
              </Button>
              <Button type="button" variant={isArabic ? "default" : "outline"} size="sm" onClick={() => { void showArabic() }} disabled={translating}>
                {translating ? "Translating..." : "Arabic"}
              </Button>
              <Link
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                href={`/reports?review=${encodeURIComponent(result.persistedMitigationReport.id)}`}
              >
                Open report review
              </Link>
              {result.sourceReportId ? (
                <Link
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                  href={`/reports?review=${encodeURIComponent(result.sourceReportId)}`}
                >
                  Source report
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {translationError ? (
          <p className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{translationError}</p>
        ) : null}
        <div className="rounded-2xl border border-border/60 bg-surface-2/45 p-4 text-sm leading-6 text-muted-foreground">
          {plan.threatSummary}
        </div>
      </article>

      <AegisPrimaryActions plan={plan} />
      <AegisMitigationTimeline plan={plan} collapsible />

      <ActionGroup title="Immediate actions" actions={plan.immediateActions} />
      <ActionGroup title="Hardening actions" actions={plan.hardeningActions} />

      <details className="wb-panel space-y-4">
        <summary className="-m-1 flex cursor-pointer list-none items-center justify-between rounded-lg p-1 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="wb-kicker">Zira Suggestions</span>
            <span className="mt-1 block text-sm text-muted-foreground">Suggested scans only. Zira decides whether to create or run them.</span>
          </span>
          <span className="wb-chip">{plan.scanRecommendations.length}</span>
        </summary>
        {plan.scanRecommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-up scan suggestions.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {plan.scanRecommendations.map((scan) => (
              <div key={`${scan.scannerFamily}-${scan.targetHint}-${scan.ruleHint}`} className="rounded-2xl border border-border/60 bg-surface-2/45 p-4">
                <p className="font-semibold">{scan.scannerFamily} | {scan.priority}</p>
                <p className="mt-2 text-sm text-muted-foreground">{scan.rationale}</p>
                <p className="mt-2 text-xs text-muted-foreground">Target: {scan.targetHint}</p>
                <p className="mt-1 text-xs text-muted-foreground">Rule: {scan.ruleHint}</p>
              </div>
            ))}
          </div>
        )}
      </details>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="wb-panel space-y-3">
          <p className="wb-kicker">Extracted IOCs</p>
          {result.extractedIocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No structured IOCs were extracted.</p>
          ) : (
            <div className="grid gap-2">
              {result.extractedIocs.slice(0, 12).map((ioc) => (
                <div key={`${ioc.iocType}-${ioc.iocValue}`} className="rounded-xl border border-border/55 bg-surface-2/40 px-3 py-2 text-sm">
                  <span className="font-medium">{ioc.iocType}</span>
                  <span className="ml-2 text-muted-foreground">{ioc.iocValue}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="wb-panel space-y-3">
          <p className="wb-kicker">Assumptions and Gaps</p>
          {[...plan.assumptions, ...plan.gaps].length === 0 ? (
            <p className="text-sm text-muted-foreground">No gaps reported.</p>
          ) : (
            <div className="grid gap-2">
              {[...plan.assumptions, ...plan.gaps].map((item) => (
                <div key={item} className="rounded-xl border border-border/55 bg-surface-2/40 px-3 py-2 text-sm text-muted-foreground">{item}</div>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

type AegisWorkspaceSection = "create" | "active" | "library"

export default function AegisPage() {
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "system"
  const [sourceName, setSourceName] = useState("Aegis report review")
  const [documentText, setDocumentText] = useState("")
  const [documentBytesBase64, setDocumentBytesBase64] = useState<string | undefined>()
  const [selectedReportId, setSelectedReportId] = useState("")
  const [sourceType, setSourceType] = useState<GenerateReportMitigationInput["sourceType"]>("bulletin")
  const [includeWorkspaceContext, setIncludeWorkspaceContext] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ReportMitigationResponse | null>(null)
  const [shouldFocusResult, setShouldFocusResult] = useState(false)
  const [closedPlanId, setClosedPlanId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedScanJobId, setSelectedScanJobId] = useState("")
  const [scanJobSearch, setScanJobSearch] = useState("")
  const [scanBusyAction, setScanBusyAction] = useState<"create" | "regenerate" | null>(null)
  const requestedSection = searchParams.get("section")
  const widgetIssueTitle = searchParams.get("issueTitle")
  const widgetIssueDetail = searchParams.get("issueDetail")
  const widgetIssueTone = searchParams.get("issueTone")
  const [activeSection, setActiveSection] = useState<AegisWorkspaceSection>(() => {
    return requestedSection === "active" || requestedSection === "library" || requestedSection === "create"
      ? requestedSection
      : "create"
  })
  const planDetailsRef = useRef<HTMLDivElement | null>(null)

  const reportsQuery = useWorkbenchQuery(["aegis", "reports"], (signal) => gateway.listReports({ page: 1, pageSize: 100 }, signal))
  const jobsQuery = useWorkbenchQuery(["aegis", "legacy-jobs"], (signal) => listLegacyJobs(signal))
  const resultsQuery = useWorkbenchQuery(
    ["aegis", "legacy-results"],
    (signal) => listLegacyResults({ limit: 200, includeOrphaned: false }, signal),
  )
  const plansQuery = useWorkbenchQuery(["aegis", "plans", refreshKey], (signal) => gateway.listReportMitigationPlans(signal))
  const selectedReport = useMemo(
    () => reportsQuery.data?.items.find((item) => item.id === selectedReportId) ?? null,
    [reportsQuery.data?.items, selectedReportId],
  )

  const publishWidgetState = useCallback((
    phase: "reviewing" | "drafting" | "saving" | "completed" | "blocked",
    title: string,
    sourceNameValue: string | null,
    detail?: string | null,
    reviewPath?: string | null,
  ) => {
    writeAegisWidgetState({
      phase,
      title,
      sourceName: sourceNameValue,
      detail: detail ?? null,
      reviewPath: reviewPath ?? null,
      source: "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
  }, [])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setErrorText(null)
    setSelectedReportId("")
    setSourceName(file.name)
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setSourceType("pdf")
        setDocumentText("")
        setDocumentBytesBase64(toDataUrlBase64(await readFileAsDataUrl(file)))
        setMessage(`Loaded PDF ${file.name}. Aegis will extract text through the sidecar.`)
        return
      }

      if (!isLikelyTextFile(file)) {
        setErrorText("Unsupported file type for v1. Use PDF or common text IOC/report files.")
        return
      }

      setSourceType("bulletin")
      setDocumentBytesBase64(undefined)
      setDocumentText(await readFileAsText(file))
      setMessage(`Loaded ${file.name}.`)
    } catch (error) {
      setErrorText(classifyUiError(error).message)
    }
  }

  const generate = async () => {
    setGenerating(true)
    setErrorText(null)
    setMessage(null)
    publishWidgetState("reviewing", "Aegis is reviewing evidence", selectedReport?.title ?? sourceName, "Aegis started a live mitigation review.")
    try {
      const response = await gateway.generateReportMitigation({
        sourceName: selectedReport?.title ?? sourceName,
        sourceType,
        documentId: selectedReport?.id,
        documentText: selectedReport ? undefined : documentText,
        documentBytesBase64: selectedReport ? undefined : documentBytesBase64,
        existingReportId: selectedReport?.id,
        includeWorkspaceContext,
        actorUserId,
      })
      setResult(response)
      setActiveSection("active")
      setShouldFocusResult(true)
      setRefreshKey((value) => value + 1)
      publishWidgetState(
        "completed",
        "Aegis mitigation plan ready",
        response.persistedMitigationReport?.title ?? selectedReport?.title ?? sourceName,
        "Aegis finished creating a mitigation plan.",
        response.persistedMitigationReport ? `/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}` : "/agents/aegis",
      )
      setMessage("Aegis created and saved a mitigation plan.")
    } catch (error) {
      const failure = classifyUiError(error)
      publishWidgetState("blocked", "Aegis was blocked while creating the mitigation plan", selectedReport?.title ?? sourceName, failure.message)
      setErrorText(failure.message)
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate = Boolean(selectedReport || documentText.trim() || documentBytesBase64)
  const reports = useMemo(() => reportsQuery.data?.items ?? [], [reportsQuery.data?.items])
  const scanJobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data])
  const scanResults = useMemo(() => resultsQuery.data ?? [], [resultsQuery.data])
  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data?.items])
  const resultsByJobId = useMemo(() => {
    const grouped = new Map<string, typeof scanResults>()
    for (const result of scanResults) {
      if (!result.jobId) {
        continue
      }

      const current = grouped.get(result.jobId)
      if (current) {
        current.push(result)
        continue
      }

      grouped.set(result.jobId, [result])
    }

    return grouped
  }, [scanResults])
  const selectedScanJob = useMemo(
    () => scanJobs.find((job) => job.id === selectedScanJobId) ?? null,
    [scanJobs, selectedScanJobId],
  )
  const filteredScanJobs = useMemo(() => {
    const search = scanJobSearch.trim().toLowerCase()
    return scanJobs
      .filter((job) => {
        if (!search) {
          return true
        }

        return [
          job.id,
          job.scannerFamily,
          job.status,
          job.summary,
          job.rulePath ?? "",
        ].join(" ").toLowerCase().includes(search)
      })
      .slice(0, 12)
  }, [scanJobSearch, scanJobs])
  const existingScanPlan = useMemo(
    () => plans.find((plan) => selectedScanJobId && plan.sourceScanJobIds.includes(selectedScanJobId)) ?? null,
    [plans, selectedScanJobId],
  )
  const requestedPlanId = searchParams.get("plan")
  const highlightedIssue = useMemo(() => {
    if (!widgetIssueTitle || !widgetIssueDetail) {
      return null
    }

    return {
      title: widgetIssueTitle,
      detail: widgetIssueDetail,
      tone: widgetIssueTone === "working" ? "working" : widgetIssueTone === "finished" ? "finished" : "attention",
    } as const
  }, [widgetIssueDetail, widgetIssueTitle, widgetIssueTone])
  const loadPlanDetails = useCallback(async (planId: string, signal?: AbortSignal) => {
    const matchingReport = reports.find((report) => report.id === planId) ?? await gateway.getReport(planId, signal)
    const nextResult = readAegisResultFromReport(matchingReport)
    if (!nextResult) {
      throw new Error("Aegis could not reopen the saved plan details from this report snapshot.")
    }

    return nextResult
  }, [reports])

  const openPlanDetails = async (planId: string) => {
    if (result?.persistedMitigationReport?.id === planId) {
      setResult(null)
      setClosedPlanId(planId)
      setActiveSection("library")
      window.history.replaceState(null, "", "/agents/aegis")
      setMessage("Closed saved Aegis mitigation plan details.")
      setErrorText(null)
      return
    }

    try {
      const nextResult = await loadPlanDetails(planId)
      setResult(nextResult)
      setClosedPlanId(null)
      setActiveSection("active")
      setShouldFocusResult(true)
      window.history.replaceState(null, "", `/agents/aegis?plan=${encodeURIComponent(planId)}`)
      publishWidgetState(
        "completed",
        "Aegis mitigation plan ready",
        nextResult.persistedMitigationReport?.title ?? "Saved Aegis plan",
        "Aegis reopened a saved mitigation plan.",
        `/agents/aegis?plan=${encodeURIComponent(planId)}`,
      )
      setMessage("Opened saved Aegis mitigation plan details.")
      setErrorText(null)
    } catch (error) {
      const failure = classifyUiError(error)
      publishWidgetState("blocked", "Aegis could not open the saved mitigation plan", "Saved Aegis plan", failure.message)
      setErrorText(failure.message)
    }
  }

  const createPlanFromSelectedScan = async (regenerate: boolean) => {
    if (!selectedScanJobId) {
      return
    }

    setScanBusyAction(regenerate ? "regenerate" : "create")
    setErrorText(null)
    setMessage(null)
    publishWidgetState(
      regenerate ? "drafting" : "reviewing",
      regenerate ? "Aegis is regenerating a mitigation plan" : "Aegis is reviewing the selected scan",
      selectedScanJob ? `${selectedScanJob.scannerFamily} scan run` : "Selected scan run",
      selectedScanJob ? `${selectedScanJob.summary} at ${formatUtc(selectedScanJob.finishedAtUtc ?? selectedScanJob.startedAtUtc ?? selectedScanJob.queuedAtUtc)}` : "Selected scan run",
    )
    try {
      const response = isUuid(selectedScanJobId)
        ? await gateway.generateReportMitigationFromScanJob(selectedScanJobId, {
            includeWorkspaceContext: true,
            actorUserId,
            regenerate,
          })
        : await gateway.generateReportMitigation({
            sourceName: selectedScanJob ? `${selectedScanJob.scannerFamily.toUpperCase()} scan run ${selectedScanJob.id}` : "Legacy scan run",
            sourceType: "bulletin",
            documentId: buildLegacyAegisDocumentId(selectedScanJobId),
            documentText: selectedScanJob
              ? buildLegacyAegisDocumentText(selectedScanJob, resultsByJobId.get(selectedScanJob.id) ?? [])
              : `Legacy scan job ${selectedScanJobId}`,
            includeWorkspaceContext: true,
            actorUserId,
            regenerate,
          })
      if (!response.persistedMitigationReport) {
        throw new Error("Aegis did not return a saved mitigation plan.")
      }

      setResult(response)
      setClosedPlanId(null)
      setActiveSection("active")
      setShouldFocusResult(true)
      setRefreshKey((value) => value + 1)
      window.history.replaceState(null, "", `/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`)
      publishWidgetState(
        "completed",
        "Aegis mitigation plan ready",
        response.persistedMitigationReport.title,
        "Aegis created a mitigation plan from the selected scan run.",
        `/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`,
      )
      setMessage("Aegis created a mitigation plan from the selected scan run.")
    } catch (error) {
      const failure = classifyUiError(error)
      publishWidgetState(
        "blocked",
        "Aegis was blocked while reviewing the selected scan",
        selectedScanJob ? `${selectedScanJob.scannerFamily} scan run` : "Selected scan run",
        failure.message,
      )
      setErrorText(failure.message)
    } finally {
      setScanBusyAction(null)
    }
  }

  useEffect(() => {
    if (requestedSection === "active" || requestedSection === "library" || requestedSection === "create") {
      setActiveSection(requestedSection)
    }
  }, [requestedSection])

  useEffect(() => {
    if (
      !requestedPlanId
      || closedPlanId === requestedPlanId
      || result?.persistedMitigationReport?.id === requestedPlanId
    ) {
      return
    }

    const controller = new AbortController()
    void loadPlanDetails(requestedPlanId, controller.signal)
      .then((nextResult) => {
        setResult(nextResult)
        setClosedPlanId(null)
        setActiveSection("active")
        setShouldFocusResult(true)
        setMessage("Opened saved Aegis mitigation plan details.")
        setErrorText(null)
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErrorText(classifyUiError(error).message)
        }
      })

    return () => controller.abort()
  }, [closedPlanId, loadPlanDetails, requestedPlanId, result?.persistedMitigationReport?.id])

  useEffect(() => {
    if (!shouldFocusResult || !result) {
      return
    }

    planDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setShouldFocusResult(false)
  }, [result, shouldFocusResult])

  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(() => setMessage(null), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  if (reportsQuery.isLoading || jobsQuery.isLoading || resultsQuery.isLoading || plansQuery.isLoading) {
    return <LoadingState label="Loading Aegis workspace" />
  }

  if (reportsQuery.isError || jobsQuery.isError || resultsQuery.isError || plansQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(reportsQuery.error ?? jobsQuery.error ?? resultsQuery.error ?? plansQuery.error)} fallbackTitle="Aegis unavailable" />
  }

  return (
    <section className="space-y-6">
      <div className="wb-hero-panel">
        <div className="max-w-3xl">
          <p className="wb-kicker">Aegis</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Mitigation plan agent</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            Aegis reads report evidence and creates mitigation recommendations. It does not create scan plans, modify files, or change systems.
          </p>
        </div>
      </div>

      {message ? <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {errorText ? <div className="rounded-2xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{errorText}</div> : null}
      {highlightedIssue ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            highlightedIssue.tone === "working"
              ? "border-primary/35 bg-primary/10 text-primary"
              : highlightedIssue.tone === "finished"
                ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/35 bg-amber-400/10 text-amber-100"
          }`}
        >
          <p className="wb-kicker mb-1">{highlightedIssue.tone === "working" ? "In progress" : highlightedIssue.tone === "finished" ? "Ready" : "Needs review"}</p>
          <p className="font-medium">{highlightedIssue.title}</p>
          <p className="mt-1 opacity-90">{highlightedIssue.detail}</p>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-2xl border border-border/60 bg-surface-2/35 p-2 md:grid-cols-3">
        {([
          ["create", "Create plan", "Pick evidence or a scan run"],
          ["active", "Active plan", result ? "Review current details" : "No plan selected"],
          ["library", "Library", `${plans.length} saved plans`],
        ] as const).map(([value, label, helper]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveSection(value)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              activeSection === value
                ? "border-primary/45 bg-primary/15 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-surface-2/55 hover:text-foreground"
            }`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="mt-0.5 block text-xs">{helper}</span>
          </button>
        ))}
      </div>

      {activeSection === "create" ? (
        <article className="wb-panel self-start space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="wb-kicker">Create plan</p>
              <h2 className="mt-1 text-xl font-semibold">Choose evidence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a recent scan run, saved report, file upload, or pasted IOC text.
              </p>
            </div>
            <span className="wb-chip"><ShieldCheck className="h-3.5 w-3.5" /> Read-only</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface-2/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="wb-kicker">Saved scan run</p>
                <h3 className="mt-1 text-base font-semibold">Send a specific scan to Aegis</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a completed or failed scan run when you want Aegis to create a mitigation plan from that exact result set.
                </p>
              </div>
              {selectedScanJob ? <span className="wb-chip">{selectedScanJob.scannerFamily} | {selectedScanJob.status}</span> : null}
            </div>

            <div className="mt-4 space-y-3">
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Find scan run</span>
                <Input
                  value={scanJobSearch}
                  onChange={(event) => setScanJobSearch(event.target.value)}
                  placeholder="Filter by scanner, status, summary, or rule path"
                />
              </label>
              <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
                {filteredScanJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/30 px-3 py-3 text-sm text-muted-foreground">
                    No scan runs match this filter.
                  </div>
                ) : (
                  filteredScanJobs.map((job) => {
                    const selected = selectedScanJobId === job.id
                    const when = job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedScanJobId((current) => current === job.id ? "" : job.id)}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-primary/45 bg-primary/12 text-foreground"
                            : "border-border/60 bg-background/25 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{job.scannerFamily.toUpperCase()} · {job.status}</span>
                          <span className="text-xs">{formatUtc(when)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm">{job.summary || "No summary recorded."}</p>
                        <p className="mt-1 text-xs">
                          {job.completedTargets}/{job.totalTargets} targets · {job.failedTargets} failed · {job.noFindingsTargets} clean
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
              {scanJobs.length > filteredScanJobs.length ? (
                <p className="text-xs text-muted-foreground">Showing {filteredScanJobs.length} of {scanJobs.length}. Use the filter to narrow older scan runs.</p>
              ) : null}
            </div>

            {selectedScanJob ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/45 p-4 text-sm">
                <p className="font-medium">{selectedScanJob.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Targets: {selectedScanJob.completedTargets}/{selectedScanJob.totalTargets} complete | Failed: {selectedScanJob.failedTargets} | No findings: {selectedScanJob.noFindingsTargets}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rule file: {selectedScanJob.rulePath?.trim() ? selectedScanJob.rulePath : "Not recorded"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {existingScanPlan ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => { void openPlanDetails(existingScanPlan.id) }} disabled={scanBusyAction !== null}>
                        Open mitigation plan
                      </Button>
                      <Button type="button" onClick={() => { void createPlanFromSelectedScan(true) }} disabled={scanBusyAction !== null}>
                        {scanBusyAction === "regenerate" ? "Regenerating..." : "Regenerate"}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => { void createPlanFromSelectedScan(false) }} disabled={scanBusyAction !== null}>
                      {scanBusyAction === "create" ? "Creating..." : "Create mitigation plan"}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Saved report</span>
            <select
              value={selectedReportId}
              onChange={(event) => {
                setSelectedReportId(event.target.value)
                if (event.target.value) {
                  setDocumentText("")
                  setDocumentBytesBase64(undefined)
                  setSourceType("bulletin")
                }
              }}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none"
            >
              <option value="">Use pasted text or file upload</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>{shortenText(report.title, 90)}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Source name</span>
              <Input value={selectedReport?.title ?? sourceName} onChange={(event) => setSourceName(event.target.value)} disabled={Boolean(selectedReport)} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Type</span>
              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as GenerateReportMitigationInput["sourceType"])}
                disabled={Boolean(selectedReport)}
                className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none"
              >
                <option value="bulletin">Bulletin / IOC file</option>
                <option value="blog">Report text</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 rounded-2xl border border-dashed border-border/70 bg-surface-2/35 p-4 text-sm">
            <span className="flex items-center gap-2 font-medium"><UploadCloud className="h-4 w-4" /> Upload PDF or common IOC/report file</span>
            <Input type="file" accept=".pdf,.txt,.csv,.json,.xml,.stix,.ioc,.yar,.yara,.yaml,.yml,.md,text/*,application/pdf" onChange={handleFile} disabled={Boolean(selectedReport)} />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Report or IOC text</span>
            <textarea
              value={selectedReport ? `Using saved report: ${selectedReport.title}` : documentText}
              onChange={(event) => {
                setSelectedReportId("")
                setDocumentBytesBase64(undefined)
                setDocumentText(event.target.value)
              }}
              disabled={Boolean(selectedReport)}
              placeholder="Paste report text, IOC lists, scan summaries, or threat bulletins here."
              className="min-h-[140px] max-h-[260px] resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/70"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2/35 px-4 py-3 text-sm">
            <input type="checkbox" checked={includeWorkspaceContext} onChange={(event) => setIncludeWorkspaceContext(event.target.checked)} />
            Include live workspace context from targets, alerts, and rules
          </label>

          <Button type="button" onClick={generate} disabled={!canGenerate || generating}>
            {generating ? "Reviewing..." : "Create plan"}
          </Button>
        </article>
      ) : null}

      {activeSection === "active" ? (
        <div ref={planDetailsRef} className="scroll-mt-24 space-y-5">
          {result ? (
            <PlanView result={result} actorUserId={actorUserId} />
          ) : (
            <article className="wb-panel min-h-[340px]">
              <EmptyState
                title="No active Aegis plan yet"
                description="Choose a saved report, upload a PDF/common IOC file, or paste report text to create a mitigation plan."
              />
            </article>
          )}
        </div>
      ) : null}

      {activeSection === "library" ? (
      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Mitigation Library</p>
            <h2 className="mt-1 text-xl font-semibold">Plans Aegis created</h2>
          </div>
          <span className="wb-chip"><FolderOpen className="h-3.5 w-3.5" /> {plans.length} saved</span>
        </div>
        {plans.length === 0 ? (
          <EmptyState title="No mitigation plans" description="Saved Aegis plans will appear here." />
        ) : (
          <div className="grid gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border/60 bg-surface-2/35 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{plan.title}</p>
                    <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{shortenText(plan.executiveSummary, 180)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Created {formatUtc(plan.generatedAtUtc)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="wb-chip"><AlertTriangle className="h-3.5 w-3.5" /> {plan.severity}</span>
                    <span className="wb-chip">{plan.confidence} confidence</span>
                    <Button type="button" variant="outline" onClick={() => { void openPlanDetails(plan.id) }}>
                      {result?.persistedMitigationReport?.id === plan.id ? "Close" : "Open"}
                    </Button>
                    {plan.sourceReportId ? (
                      <Link
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                        href={`/reports?review=${encodeURIComponent(plan.sourceReportId)}`}
                      >
                        Source report
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-surface-2/35 px-4 py-3 text-xs text-muted-foreground">
        <FileText className="mr-2 inline h-3.5 w-3.5" />
        V1 supports PDFs and common text IOC/report files. Richer report artifacts can be added later without changing the Aegis planning contract.
      </div>
    </section>
  )
}
