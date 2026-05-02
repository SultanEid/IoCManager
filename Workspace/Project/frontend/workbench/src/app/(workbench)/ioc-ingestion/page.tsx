"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Search,
  X,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ACCENT_TONES } from "@/components/workbench/accent-tone"
import { ScannerFamilyBadge } from "@/components/workbench/scanner-family-mark"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError } from "@/shared/api/error"
import { explainDecisionConfidence } from "@/shared/ai/confidence-explanation"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import {
  exportLegacyIocFindingsCsv,
  exportLegacyIocFindingsJson,
  getLegacyIocFindingDetail,
  listLegacyIocFindings,
  listLegacyTargets,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

type IocExplorerFilters = {
  q: string
  scannerFamily: string
  targetId: string
  severity: string
  painLevel: string
  fromUtc: string
  toUtc: string
  page: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_OPTIONS = [25, 50, 100]
const IOC_DECISION_POLL_INTERVAL_MS = 2500
const IOC_DECISION_POLL_MAX_ATTEMPTS = 12

function toLocalDateTimeInput(value: string) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toUtcQueryValue(value: string) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function readErrorMessage(error: unknown) {
  const failure = classifyUiError(error)
  return failure.message || "Request failed."
}

function normalizeDecisionStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function isPendingDecisionStatus(value: string | null | undefined) {
  return normalizeDecisionStatus(value) === "queued" || normalizeDecisionStatus(value) === "running"
}

function isFailedDecisionStatus(value: string | null | undefined) {
  const status = normalizeDecisionStatus(value)
  return status === "failed" || status === "error" || status === "cancelled" || status === "canceled"
}

function InlineState({
  title,
  description,
  tone = "default",
}: {
  title: string
  description: string
  tone?: "default" | "warning" | "danger"
}) {
  const className =
    tone === "warning"
      ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
      : tone === "danger"
        ? "border-destructive/35 bg-destructive/10 text-destructive"
        : "border-border/70 bg-surface-2/65 text-muted-foreground"

  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5">{description}</p>
    </div>
  )
}

function parseFilters(searchParams: URLSearchParams): IocExplorerFilters {
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const parsedPageSize = Number.parseInt(searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10)

  return {
    q: searchParams.get("q") ?? "",
    scannerFamily: searchParams.get("scannerFamily") ?? "",
    targetId: searchParams.get("targetId") ?? "",
    severity: searchParams.get("severity") ?? "",
    painLevel: searchParams.get("painLevel") ?? "",
    fromUtc: toLocalDateTimeInput(searchParams.get("fromUtc") ?? ""),
    toUtc: toLocalDateTimeInput(searchParams.get("toUtc") ?? ""),
    page: Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
    pageSize: PAGE_SIZE_OPTIONS.includes(parsedPageSize) ? parsedPageSize : DEFAULT_PAGE_SIZE,
  }
}

function buildQuery(filters: IocExplorerFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.scannerFamily) params.set("scannerFamily", filters.scannerFamily)
  if (filters.targetId) params.set("targetId", filters.targetId)
  if (filters.severity) params.set("severity", filters.severity)
  if (filters.painLevel) params.set("painLevel", filters.painLevel)
  const fromUtc = toUtcQueryValue(filters.fromUtc)
  const toUtc = toUtcQueryValue(filters.toUtc)
  if (fromUtc) params.set("fromUtc", fromUtc)
  if (toUtc) params.set("toUtc", toUtc)
  if (filters.page > 1) params.set("page", filters.page.toString())
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", filters.pageSize.toString())
  return params.toString()
}

function formatPainLevelLabel(value: string) {
  if (value === "HostArtifact") {
    return "Host / Network Artifact"
  }

  if (value === "Ttp") {
    return "TTP"
  }

  return value
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function isDecisionTelemetryReason(reason: string) {
  return /(verdict=|calibrated_signal=|uncertainty=|conflict=|evidence bucket scores)/i.test(reason)
}

function formatDecisionSummary(verdict: string) {
  switch (verdict) {
    case "malicious":
      return "The model sees enough corroboration to treat this IOC as malicious."
    case "likely_malicious":
      return "The model leans malicious, but some uncertainty remains."
    case "suspicious":
      return "The IOC looks suspicious, but the evidence is not strong enough for a stronger call."
    case "benign":
      return "The model sees enough context to treat this IOC as benign."
    case "likely_benign":
      return "The model leans benign, but the signal is still directional."
    case "stale_or_revoked":
      return "The IOC appears stale or revoked."
    case "false_positive":
      return "The model sees enough context to treat this IOC as a false positive."
    case "insufficient_evidence":
      return "The model could not support a stronger decision from the current evidence."
    default:
      return "The model returned a decision for this IOC."
  }
}

function formatDecisionVerdictLabel(verdict: string) {
  switch (verdict) {
    case "malicious":
      return "Malicious"
    case "likely_malicious":
      return "Likely malicious"
    case "suspicious":
      return "Suspicious"
    case "benign":
      return "Non-malicious"
    case "likely_benign":
      return "Likely non-malicious"
    case "false_positive":
      return "False positive"
    case "stale_or_revoked":
      return "Stale or revoked"
    case "insufficient_evidence":
      return "Insufficient evidence"
    default:
      return verdict.replace(/_/g, " ")
  }
}

function decisionVerdictTone(verdict: string) {
  switch (verdict) {
    case "malicious":
    case "likely_malicious":
      return "border-red-300/50 bg-red-500/18 text-red-50 shadow-[0_0_24px_rgba(239,68,68,0.18)]"
    case "suspicious":
      return "border-orange-300/55 bg-orange-500/18 text-orange-50 shadow-[0_0_24px_rgba(249,115,22,0.16)]"
    case "benign":
    case "likely_benign":
      return "border-blue-300/55 bg-blue-500/18 text-blue-50 shadow-[0_0_24px_rgba(59,130,246,0.16)]"
    case "false_positive":
      return "border-violet-300/55 bg-violet-500/18 text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.16)]"
    case "insufficient_evidence":
    case "stale_or_revoked":
      return "border-slate-300/45 bg-slate-400/14 text-slate-50 shadow-[0_0_24px_rgba(148,163,184,0.12)]"
    default:
      return "border-border/80 bg-surface-2/80 text-foreground"
  }
}

function DecisionVerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex min-h-10 items-center rounded-xl border px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] ${decisionVerdictTone(verdict)}`}
    >
      {formatDecisionVerdictLabel(verdict)}
    </span>
  )
}

type ActiveFilterChip = {
  key: keyof Pick<IocExplorerFilters, "q" | "scannerFamily" | "targetId" | "severity" | "painLevel" | "fromUtc" | "toUtc">
  label: string
  value: string
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1))
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatLocalInputLabel(value: string) {
  return value ? value.replace("T", " ") : ""
}

function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const boundedPage = clampPage(currentPage, totalPages)
  const rangeStart = totalCount === 0 ? 0 : (boundedPage - 1) * pageSize + 1
  const rangeEnd = totalCount === 0 ? 0 : Math.min(boundedPage * pageSize, totalCount)
  const atFirstPage = loading || boundedPage <= 1
  const atLastPage = loading || boundedPage >= totalPages

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-2/45 px-3 py-2 text-xs text-muted-foreground">
      <div className="min-w-0">
        {loading ? (
          <p>Loading findings for the current query.</p>
        ) : (
          <>
            <p className="font-medium text-foreground">
              Showing {formatCount(rangeStart)}-{formatCount(rangeEnd)} of {formatCount(totalCount)} findings
            </p>
            <p className="mt-0.5">
              Page {formatCount(boundedPage)} of {formatCount(totalPages)}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Page size</span>
          <select
            aria-label="Page size"
            className="h-8 rounded-lg border border-border/70 bg-surface-1 px-2 text-xs"
            value={pageSize}
            disabled={loading}
            onChange={(event) => {
              const nextPageSize = Number.parseInt(event.target.value, 10) || DEFAULT_PAGE_SIZE
              onPageSizeChange(nextPageSize)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1" aria-label="Pagination controls">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Go to first page"
            title="Go to first page"
            onClick={() => onPageChange(1)}
            disabled={atFirstPage}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Go to previous page"
            title="Go to previous page"
            onClick={() => onPageChange(boundedPage - 1)}
            disabled={atFirstPage}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Go to next page"
            title="Go to next page"
            onClick={() => onPageChange(boundedPage + 1)}
            disabled={atLastPage}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Go to last page"
            title="Go to last page"
            onClick={() => onPageChange(totalPages)}
            disabled={atLastPage}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function IocsExplorerPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedIocId, setSelectedIocId] = useState<string | null>(null)
  const [isGeneratingDecision, setIsGeneratingDecision] = useState(false)
  const [generateDecisionError, setGenerateDecisionError] = useState<string | null>(null)
  const [generateDecisionStatus, setGenerateDecisionStatus] = useState<string | null>(null)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const targetsQuery = useWorkbenchQuery(
    ["legacy-pipeline", "ioc-explorer-targets"],
    (signal) => listLegacyTargets(undefined, signal),
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  )
  const findingsQuery = useWorkbenchQuery(
    ["legacy-pipeline", "ioc-findings", parsedFilters],
    (signal) =>
      listLegacyIocFindings(
        {
          scannerFamily: parsedFilters.scannerFamily || undefined,
          targetId: parsedFilters.targetId || undefined,
          severity: parsedFilters.severity || undefined,
          painLevel: parsedFilters.painLevel || undefined,
          fromUtc: toUtcQueryValue(parsedFilters.fromUtc) || undefined,
          toUtc: toUtcQueryValue(parsedFilters.toUtc) || undefined,
          q: parsedFilters.q || undefined,
          page: parsedFilters.page,
          pageSize: parsedFilters.pageSize,
        },
        signal,
      ),
  )
  const detailQuery = useWorkbenchQuery(
    ["legacy-pipeline", "ioc-findings", "detail", selectedIocId],
    (signal) => getLegacyIocFindingDetail(selectedIocId as string, signal),
    { enabled: selectedIocId !== null },
  )
  const relatedDetectionsQuery = useWorkbenchQuery(
    ["scanning", "detections", "ioc", selectedIocId],
    (signal) =>
      gateway.listDetections(
        {
          iocId: selectedIocId as string,
          pageSize: 5,
          sort: "observedAtUtc_desc",
        },
        signal,
      ),
    { enabled: selectedIocId !== null },
  )
  const latestRelatedDetection = relatedDetectionsQuery.data?.items[0] ?? null
  const latestIocDecisionQuery = useWorkbenchQuery(
    ["ai", "decision", "latest", "ioc", selectedIocId],
    async (signal) => {
      try {
        return await gateway.getLatestAiDecisionForIoc(selectedIocId as string, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }

        throw error
      }
    },
    { enabled: selectedIocId !== null },
  )
  const actorUserId = session?.userId ?? session?.username ?? "analyst-1"
  const latestIocDecisionData = latestIocDecisionQuery.data ?? null
  const latestIocDecision = latestIocDecisionQuery.data?.result.decision ?? null
  const latestIocDecisionResult = latestIocDecisionQuery.data?.result ?? null
  const latestIocDecisionStatus = latestIocDecisionResult?.status ?? null
  const latestIocNarrativeReasons =
    latestIocDecision?.reasons.filter((reason) => !isDecisionTelemetryReason(reason)) ?? []
  const latestIocLeadReason = latestIocNarrativeReasons[0] ?? null
  const latestIocConfidenceReasons = explainDecisionConfidence({
    result: latestIocDecisionResult,
    sourceLabel: latestRelatedDetection?.source ?? "IOC-native generation",
    hasDetectionContext: Boolean(latestIocDecisionData?.detectionId),
  })

  const findingsPage = findingsQuery.data
  const targets = useMemo(() => targetsQuery.data ?? [], [targetsQuery.data])
  const findings = useMemo(() => findingsPage?.items ?? [], [findingsPage?.items])
  const totalCount = findingsPage?.totalCount ?? 0
  const currentPage = findingsPage?.page ?? parsedFilters.page
  const pageSize = findingsPage?.pageSize ?? parsedFilters.pageSize
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const targetsLoading = targetsQuery.isLoading && !targetsQuery.data
  const findingsLoading = findingsQuery.isLoading && !findingsQuery.data
  const findingsRefreshing = findingsQuery.isFetching && !findingsLoading

  useEffect(() => {
    const visibleIds = new Set(findings.map((item) => item.iocId))
    setSelectedIds((current) => {
      const next = current.filter((value) => visibleIds.has(value))
      return next.length === current.length && next.every((value, index) => value === current[index]) ? current : next
    })
    if (selectedIocId && !visibleIds.has(selectedIocId)) {
      setSelectedIocId(null)
    }
  }, [findings, selectedIocId])

  useEffect(() => {
    setGenerateDecisionError(null)
    setGenerateDecisionStatus(null)
    setIsGeneratingDecision(false)
  }, [selectedIocId])

  const severityOptions = useMemo(() => {
    const values = findingsPage?.availableSeverities ?? []
    if (parsedFilters.severity && !values.includes(parsedFilters.severity)) {
      return [parsedFilters.severity, ...values]
    }

    return values
  }, [findingsPage, parsedFilters.severity])

  const selectedRows = useMemo(
    () => findings.filter((item) => selectedIds.includes(item.iocId)),
    [findings, selectedIds],
  )
  const allVisibleSelected = findings.length > 0 && findings.every((item) => selectedIds.includes(item.iocId))
  const filteredOut = Boolean(
    parsedFilters.q
      || parsedFilters.scannerFamily
      || parsedFilters.targetId
      || parsedFilters.severity
      || parsedFilters.painLevel
      || parsedFilters.fromUtc
      || parsedFilters.toUtc,
  )
  const canClearFilters = filteredOut || parsedFilters.pageSize !== DEFAULT_PAGE_SIZE
  const targetLabelById = useMemo(() => {
    return new Map(
      targets.map((target) => [
        target.id,
        target.displayName ?? target.hostname ?? target.ipAddress,
      ]),
    )
  }, [targets])
  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (parsedFilters.q) chips.push({ key: "q", label: "Search", value: parsedFilters.q })
    if (parsedFilters.scannerFamily) {
      chips.push({ key: "scannerFamily", label: "Scanner", value: parsedFilters.scannerFamily })
    }
    if (parsedFilters.targetId) {
      chips.push({
        key: "targetId",
        label: "Target",
        value: targetLabelById.get(parsedFilters.targetId) ?? parsedFilters.targetId,
      })
    }
    if (parsedFilters.severity) chips.push({ key: "severity", label: "Severity", value: parsedFilters.severity })
    if (parsedFilters.painLevel) {
      chips.push({ key: "painLevel", label: "Pyramid", value: formatPainLevelLabel(parsedFilters.painLevel) })
    }
    if (parsedFilters.fromUtc) {
      chips.push({ key: "fromUtc", label: "From", value: formatLocalInputLabel(parsedFilters.fromUtc) })
    }
    if (parsedFilters.toUtc) {
      chips.push({ key: "toUtc", label: "To", value: formatLocalInputLabel(parsedFilters.toUtc) })
    }
    return chips
  }, [parsedFilters, targetLabelById])

  const applyFilters = () => {
    const next = buildQuery({ ...filters, page: 1 })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: IocExplorerFilters = {
      q: "",
      scannerFamily: "",
      targetId: "",
      severity: "",
      painLevel: "",
      fromUtc: "",
      toUtc: "",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const updatePageState = (nextPage: number, nextPageSize = parsedFilters.pageSize) => {
    const nextTotalPages = Math.max(1, Math.ceil(totalCount / nextPageSize))
    const next = buildQuery({
      ...parsedFilters,
      page: clampPage(nextPage, nextTotalPages),
      pageSize: nextPageSize,
    })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const updatePageSize = (nextPageSize: number) => {
    setFilters((current) => ({ ...current, page: 1, pageSize: nextPageSize }))
    updatePageState(1, nextPageSize)
  }

  const removeFilter = (key: ActiveFilterChip["key"]) => {
    const nextFilters = { ...parsedFilters, [key]: "", page: 1 }
    setFilters(nextFilters)
    const next = buildQuery(nextFilters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  useEffect(() => {
    if (!findingsPage || findingsLoading) {
      return
    }

    const effectivePage = clampPage(findingsPage.page, totalPages)
    if (parsedFilters.page === effectivePage) {
      return
    }

    const next = buildQuery({ ...parsedFilters, page: effectivePage, pageSize })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }, [findingsLoading, findingsPage, pageSize, parsedFilters, pathname, router, totalPages])

  const toggleSelected = (iocId: string) => {
    setSelectedIds((current) =>
      current.includes(iocId) ? current.filter((value) => value !== iocId) : [...current, iocId],
    )
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((value) => !findings.some((item) => item.iocId === value)))
      return
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...findings.map((item) => item.iocId)])))
  }

  const openTarget = (targetId: string | null | undefined) => {
    if (!targetId) {
      return
    }

    router.push(`/servers?targetId=${encodeURIComponent(targetId)}`)
  }

  const openDecisionPage = (detectionId: string) => {
    router.push(`/scans/${encodeURIComponent(detectionId)}`)
    setSelectedIocId(null)
  }

  const generateAiDecisionForSelectedIoc = async () => {
    if (!selectedIocId) {
      return
    }

    setIsGeneratingDecision(true)
    setGenerateDecisionError(null)
    setGenerateDecisionStatus("Submitting AI decision request")

    try {
      const submitted = await gateway.generateAiDecisionForIoc(selectedIocId, {
        submittedByUserId: actorUserId,
      })

      for (let attempt = 1; attempt <= IOC_DECISION_POLL_MAX_ATTEMPTS; attempt += 1) {
        setGenerateDecisionStatus(
          attempt === 1
            ? "Decision analysis in progress"
            : `Decision analysis in progress (${attempt}/${IOC_DECISION_POLL_MAX_ATTEMPTS})`,
        )

        const result = await gateway.getAiDecisionResult(submitted.decisionId)
        const normalizedStatus = result.status.trim().toLowerCase()
        if (
          normalizedStatus === "completed"
          || normalizedStatus === "failed"
          || normalizedStatus === "closed"
          || normalizedStatus === "overridden"
          || normalizedStatus === "cancelled"
          || normalizedStatus === "canceled"
          || normalizedStatus === "error"
        ) {
          break
        }

        if (attempt < IOC_DECISION_POLL_MAX_ATTEMPTS) {
          await new Promise((resolve) => window.setTimeout(resolve, IOC_DECISION_POLL_INTERVAL_MS))
        }
      }

      const [latestRefresh] = await Promise.all([latestIocDecisionQuery.refetch(), relatedDetectionsQuery.refetch()])
      const latestResult = latestRefresh.data?.result
      if (latestResult?.decision) {
        setGenerateDecisionStatus("Latest AI decision loaded for this IOC.")
      } else if (isPendingDecisionStatus(latestResult?.status)) {
        setGenerateDecisionStatus("AI decision is still running. This drawer will show the verdict after refresh.")
      } else if (isFailedDecisionStatus(latestResult?.status)) {
        setGenerateDecisionError(latestResult?.failureMessage ?? "AI decision failed before producing a verdict.")
        setGenerateDecisionStatus(null)
      } else {
        setGenerateDecisionStatus("AI decision request was accepted, but no verdict has been returned yet.")
      }
    } catch (error) {
      setGenerateDecisionError(readErrorMessage(error))
      setGenerateDecisionStatus(null)
    } finally {
      setIsGeneratingDecision(false)
    }
  }

  if (findingsQuery.isError) {
    return (
      <ClassifiedFailureState
        failure={classifyUiError(findingsQuery.error)}
        fallbackTitle="IOCs Explorer unavailable"
      />
    )
  }

  return (
    <section className="wb-page space-y-6">
      <header className="wb-page-header">
        <p className="wb-kicker">IOCs Explorer</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Normalized findings explorer</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Review scanner detections and evidence.
        </p>
        {parsedFilters.painLevel ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs text-primary">
            <span className="font-semibold uppercase tracking-[0.09em]">Pyramid filter</span>
            <span>{formatPainLevelLabel(parsedFilters.painLevel)}</span>
          </div>
        ) : null}
        <div className="mt-4 grid gap-2 xl:grid-cols-2 2xl:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-surface-2/65 p-3 pl-4">
            <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${ACCENT_TONES.primary.rail}`} aria-hidden="true" />
            <p className="wb-kicker">Loaded Findings</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{findingsLoading ? "..." : findings.length}</p>
            {findingsLoading ? (
              <p className="mt-1 text-xs text-muted-foreground">Loading findings for the current query.</p>
            ) : null}
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-surface-2/65 p-3 pl-4">
            <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${ACCENT_TONES.cyan.rail}`} aria-hidden="true" />
            <p className="wb-kicker">Total Matching</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{findingsLoading ? "..." : totalCount}</p>
            {findingsRefreshing ? (
              <p className="mt-1 text-xs text-muted-foreground">Refreshing totals for the current filter set.</p>
            ) : null}
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-surface-2/65 p-3 pl-4">
            <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${ACCENT_TONES.violet.rail}`} aria-hidden="true" />
            <p className="wb-kicker">Selected Rows</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{selectedRows.length}</p>
          </div>
        </div>
      </header>

      <article className="wb-panel space-y-4">
        {targetsQuery.isError ? (
          <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Target list unavailable: {classifyUiError(targetsQuery.error).message}. Findings can still be searched without the target filter.
          </div>
        ) : targetsLoading ? (
          <div className="rounded-lg border border-border/70 bg-surface-2/55 px-3 py-2 text-sm text-muted-foreground">
            Loading target list. Other filters are ready.
          </div>
        ) : null}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Investigation filters</h3>
              <p className="text-xs text-muted-foreground">
                Narrow the table by scanner, target, severity, time range, or indicator text.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilters}
                disabled={!canClearFilters}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(180px,0.55fr))]">
            <label className="block">
              <span className="sr-only">Search findings</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Search rule name, value, payload, command line, or network indicators"
                />
              </div>
            </label>
            <label className="block">
              <span className="sr-only">Scanner family</span>
              <select
                className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                value={filters.scannerFamily}
                onChange={(event) => setFilters((current) => ({ ...current, scannerFamily: event.target.value }))}
              >
                <option value="">All scanners</option>
                <option value="YARA">YARA</option>
                <option value="SIGMA">SIGMA</option>
                <option value="SNORT">SNORT</option>
                <option value="SURICATA">SURICATA</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Target</span>
              <select
                className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                value={filters.targetId}
                onChange={(event) => setFilters((current) => ({ ...current, targetId: event.target.value }))}
                disabled={targetsLoading || targetsQuery.isError}
              >
                <option value="">
                  {targetsLoading ? "Loading targets..." : targetsQuery.isError ? "Targets unavailable" : "All targets"}
                </option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.displayName ?? target.hostname ?? target.ipAddress}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Severity</span>
              <select
                className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                value={filters.severity}
                onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}
              >
                <option value="">All severities</option>
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Observed after</span>
              <Input
                type="datetime-local"
                value={filters.fromUtc}
                onChange={(event) => setFilters((current) => ({ ...current, fromUtc: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Observed before</span>
              <Input
                type="datetime-local"
                value={filters.toUtc}
                onChange={(event) => setFilters((current) => ({ ...current, toUtc: event.target.value }))}
              />
            </label>
          </div>
        </form>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active</span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:border-primary/55 hover:bg-primary/15"
                onClick={() => removeFilter(chip.key)}
                aria-label={`Remove ${chip.label.toLowerCase()} filter`}
                title={`Remove ${chip.label.toLowerCase()} filter`}
              >
                <span className="font-semibold">{chip.label}</span>
                <span className="max-w-64 truncate text-primary/90">{chip.value}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Normalized findings</h3>
            <p className="text-xs text-muted-foreground">
              One searchable table over persisted findings from host and network scanners.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface-2/45 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {selectedRows.length === 0 ? "No rows selected" : `${formatCount(selectedRows.length)} selected`}
            </span>
            {selectedRows.length > 0 ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportLegacyIocFindingsCsv(selectedRows)}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportLegacyIocFindingsJson(selectedRows)}
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Export JSON
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          loading={findingsLoading}
          onPageChange={updatePageState}
          onPageSizeChange={updatePageSize}
        />
        {findingsLoading ? (
          <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
            <div className="border-b border-border/70 bg-surface-2/70 px-4 py-3">
              <p className="text-sm font-medium">Loading findings for the current query</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The filters and summary cards stay available while the findings table hydrates.
              </p>
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`ioc-loading-row-${index + 1}`}
                  className="grid gap-3 rounded-lg border border-border/60 bg-surface-2/40 px-4 py-3 md:grid-cols-[120px_1.4fr_1.6fr_140px_180px_48px]"
                >
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                  <div className="h-4 animate-pulse rounded bg-surface-3/70" />
                </div>
              ))}
            </div>
          </div>
        ) : totalCount === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No findings matched the current filters"
              description="Broaden the time range, remove the target or severity filter, or clear the search query to reopen the wider findings surface."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No normalized findings available"
              description="Scanner findings will appear here after YARA, SIGMA, SNORT, or SURICATA runs persist IOC rows."
            />
          )
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
              <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-surface-2/85 backdrop-blur supports-[backdrop-filter]:bg-surface-2/75">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      aria-label="Select all visible findings"
                      onChange={toggleSelectAllVisible}
                    />
                  </TableHead>
                  <TableHead className="w-[7rem]">Scanner</TableHead>
                  <TableHead className="w-[15%]">Target</TableHead>
                  <TableHead className="w-[23%]">Rule Name</TableHead>
                  <TableHead className="w-[27%]">Indicator Value</TableHead>
                  <TableHead className="w-[7rem]">Severity</TableHead>
                  <TableHead className="w-[10rem]">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding) => {
                  const selected = selectedIds.includes(finding.iocId)
                  return (
                    <TableRow
                      key={finding.iocId}
                      data-state={selected ? "selected" : undefined}
                      className="cursor-pointer transition-colors hover:bg-primary/5 data-[state=selected]:bg-primary/10 data-[state=selected]:shadow-[inset_3px_0_0_color-mix(in_srgb,var(--primary)_70%,transparent)]"
                      onClick={() => setSelectedIocId(finding.iocId)}
                    >
                      <TableCell className="px-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          aria-label={`Select finding ${finding.iocId}`}
                          onChange={() => toggleSelected(finding.iocId)}
                        />
                      </TableCell>
                      <TableCell>
                        <ScannerFamilyBadge family={finding.scannerFamily} size="sm" />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={finding.targetDisplay}>{finding.targetDisplay}</p>
                          <p className="truncate text-xs text-muted-foreground" title={finding.targetIp ?? "Unresolved target"}>
                            {finding.targetIp ?? "Unresolved target"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="min-w-0">
                          <p
                            className="max-h-10 overflow-hidden break-words font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            title={finding.ruleName}
                          >
                            {finding.ruleName}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{finding.status}</p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="min-w-0">
                          <p
                            className="max-h-10 overflow-hidden break-words leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            title={finding.indicatorValue}
                          >
                            {finding.indicatorValue}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.indicatorKind}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={finding.severity} />
                      </TableCell>
                      <TableCell className="truncate" title={formatTimestamp(finding.timestampUtc)}>
                        {formatTimestamp(finding.timestampUtc)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              </Table>
            </div>
          </>
        )}
        {!findingsLoading && totalCount > 0 ? (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={false}
            onPageChange={updatePageState}
            onPageSizeChange={updatePageSize}
          />
        ) : null}
      </article>

      <Sheet open={selectedIocId !== null} onOpenChange={(open) => !open && setSelectedIocId(null)}>
        <SheetContent side="right" className="!w-[min(96vw,72rem)] !max-w-none overflow-y-auto border-border/70 bg-surface-1/96 px-8">
          <SheetHeader>
            <SheetTitle>IOC detail</SheetTitle>
            <SheetDescription>
              Raw payload, scanner-specific fields, and linked scan context for the selected normalized finding.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {detailQuery.isLoading ? (
              <LoadingState label="Loading IOC detail" />
            ) : detailQuery.isError ? (
              <ClassifiedFailureState failure={classifyUiError(detailQuery.error)} fallbackTitle="IOC detail unavailable" />
            ) : !detailQuery.data ? (
              <EmptyState title="IOC detail unavailable" description="The selected finding is no longer available." />
            ) : (
              <div className="space-y-5">
                <section className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="wb-kicker">Rule</p>
                      <h3 className="mt-1 text-base font-semibold">{detailQuery.data.ruleName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{detailQuery.data.indicatorValue}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ScannerFamilyBadge family={detailQuery.data.scannerFamily} />
                      <StatusBadge value={detailQuery.data.severity} />
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                    <p className="wb-kicker">Related target</p>
                    <p className="mt-2 text-sm font-medium">{detailQuery.data.target?.display ?? detailQuery.data.targetDisplay}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detailQuery.data.target?.ipAddress ?? detailQuery.data.targetIp ?? "Unresolved target"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {detailQuery.data.target?.status ? <StatusBadge value={detailQuery.data.target.status} /> : null}
                      {detailQuery.data.target?.targetOsType ? <StatusBadge value={detailQuery.data.target.targetOsType} /> : null}
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openTarget(detailQuery.data.target?.id)}
                        disabled={!detailQuery.data.target?.id}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open target
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                    <p className="wb-kicker">Related scan</p>
                    {detailQuery.data.relatedScan ? (
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <ScannerFamilyBadge family={detailQuery.data.relatedScan.scannerFamily} />
                          <StatusBadge value={detailQuery.data.relatedScan.status} />
                          {detailQuery.data.relatedScan.executionMode ? <StatusBadge value={detailQuery.data.relatedScan.executionMode} /> : null}
                        </div>
                        <p>Job: {detailQuery.data.relatedScan.jobId ?? "Detached"}</p>
                        <p>Plan: {detailQuery.data.relatedScan.scanPlanId ?? "Manual run"}</p>
                        <p>Trigger: {detailQuery.data.relatedScan.triggerType ?? "Unknown"}</p>
                        <p>Started: {detailQuery.data.relatedScan.startedAtUtc ? formatTimestamp(detailQuery.data.relatedScan.startedAtUtc) : "Unknown"}</p>
                        <p>Finished: {detailQuery.data.relatedScan.finishedAtUtc ? formatTimestamp(detailQuery.data.relatedScan.finishedAtUtc) : "Unknown"}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No related scan metadata is available for this finding.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="wb-kicker">AI Decision</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Generate or review the latest AI decision recorded for this IOC.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={generateAiDecisionForSelectedIoc}
                        disabled={isGeneratingDecision}
                      >
                        {isGeneratingDecision
                          ? "Generating..."
                          : latestIocDecisionQuery.data?.result.decision
                            ? "Regenerate AI decision"
                            : "Generate AI decision"}
                      </Button>
                      {latestIocDecisionQuery.data?.detectionId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openDecisionPage(latestIocDecisionQuery.data!.detectionId!)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open full decision
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4">
                    {generateDecisionError ? (
                      <InlineState
                        title="AI decision request failed"
                        description={generateDecisionError}
                        tone="danger"
                      />
                    ) : null}
                    {generateDecisionStatus ? (
                      <div className={generateDecisionError ? "mt-3" : undefined}>
                        <InlineState
                          title={isGeneratingDecision ? "AI decision in progress" : "AI decision updated"}
                          description={generateDecisionStatus}
                        />
                      </div>
                    ) : null}
                    {latestIocDecisionQuery.isLoading ? (
                      <LoadingState label="Loading latest AI decision" />
                    ) : latestIocDecisionQuery.isError ? (
                      <ClassifiedFailureState
                        failure={classifyUiError(latestIocDecisionQuery.error)}
                        fallbackTitle="AI decision unavailable"
                      />
                    ) : !latestIocDecision && latestIocDecisionResult ? (
                      <InlineState
                        title={
                          isPendingDecisionStatus(latestIocDecisionStatus)
                            ? "AI decision in progress"
                            : isFailedDecisionStatus(latestIocDecisionStatus)
                              ? "AI decision failed"
                              : "AI decision has no verdict yet"
                        }
                        description={
                          isFailedDecisionStatus(latestIocDecisionStatus)
                            ? latestIocDecisionResult.failureMessage ?? "The backend did not return a failure detail."
                            : `Current status: ${latestIocDecisionResult.status}. Refresh or generate again after the sidecar finishes processing.`
                        }
                        tone={
                          isFailedDecisionStatus(latestIocDecisionStatus)
                            ? "danger"
                            : isPendingDecisionStatus(latestIocDecisionStatus)
                              ? "warning"
                              : "default"
                        }
                      />
                    ) : !latestIocDecision ? (
                      <SearchEmptyState
                        title="No AI decision recorded yet"
                        description={
                          latestRelatedDetection
                            ? "A related detection exists, but no AI decision has been recorded for this IOC yet."
                            : "This IOC does not have a stored AI decision yet. Generate one directly from this drawer."
                        }
                        action={
                          latestRelatedDetection ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => openDecisionPage(latestRelatedDetection.id)}>
                              Open latest related detection
                            </Button>
                          ) : undefined
                        }
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border/70 bg-surface-1/70 p-5">
                          <div className="flex flex-col gap-5">
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <DecisionVerdictBadge verdict={latestIocDecision.verdict} />
                                <StatusBadge value={latestIocDecisionResult?.status ?? "unknown"} />
                              </div>
                              <div className="space-y-2">
                                <p className="text-2xl font-semibold leading-snug tracking-tight">
                                  {formatDecisionSummary(latestIocDecision.verdict)}
                                </p>
                                {latestIocLeadReason ? (
                                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    {latestIocLeadReason}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <dl className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-lg border border-border/60 bg-surface-2/55 p-4">
                                <dt className="wb-kicker">Confidence</dt>
                                <dd className="mt-2 text-3xl font-semibold tracking-tight">{formatPercent(latestIocDecision.confidence)}</dd>
                              </div>
                              <div className="rounded-lg border border-border/60 bg-surface-2/55 p-4">
                                <dt className="wb-kicker">False Positive Risk</dt>
                                <dd className="mt-2 text-3xl font-semibold tracking-tight">{formatPercent(latestIocDecision.falsePositiveRisk)}</dd>
                              </div>
                            </dl>

                            <div className="rounded-lg border border-border/60 bg-surface-2/45 p-3">
                              <p className="wb-kicker">Why this confidence</p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {latestIocConfidenceReasons.map((reason) => (
                                  <InlineState
                                    key={reason.title}
                                    title={reason.title}
                                    description={reason.detail}
                                    tone={reason.tone}
                                  />
                                ))}
                              </div>
                            </div>

                            <dl className="grid gap-x-4 gap-y-3 rounded-lg border border-border/60 bg-surface-2/35 px-3 py-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <dt className="wb-kicker">Source</dt>
                                <dd className="mt-1 font-medium">
                                  {latestRelatedDetection?.source ?? "IOC-native generation"}
                                </dd>
                              </div>
                              <div>
                                <dt className="wb-kicker">Scanner Family</dt>
                                <dd className="mt-1 font-medium">
                                  {latestRelatedDetection?.scannerFamily ?? detailQuery.data.scannerFamily}
                                </dd>
                              </div>
                              <div>
                                <dt className="wb-kicker">Model Version</dt>
                                <dd className="mt-1 font-medium">
                                  {latestIocDecisionResult?.modelVersion ?? "Not reported"}
                                </dd>
                              </div>
                              <div>
                                <dt className="wb-kicker">Scored</dt>
                                <dd className="mt-1 font-medium">
                                  {formatTimestamp(latestIocDecision.scoredAtUtc)}
                                </dd>
                              </div>
                              <div>
                                <dt className="wb-kicker">Detection View</dt>
                                <dd className="mt-1 font-medium">
                                  {latestIocDecisionData?.detectionId ? "Available" : "IOC-only"}
                                </dd>
                              </div>
                              {latestIocDecisionResult?.datasetVersion && latestIocDecisionResult.datasetVersion !== "unknown" ? (
                                <div>
                                  <dt className="wb-kicker">Dataset Version</dt>
                                  <dd className="mt-1 font-medium">
                                    {latestIocDecisionResult.datasetVersion}
                                  </dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                  <p className="wb-kicker">Scanner-specific fields</p>
                  {detailQuery.data.yaraDetail ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="font-medium">File path:</span> {detailQuery.data.yaraDetail.filePath ?? "Unknown"}</p>
                      <p><span className="font-medium">File hash:</span> {detailQuery.data.yaraDetail.fileHash ?? "Unknown"}</p>
                    </div>
                  ) : null}
                  {detailQuery.data.sigmaDetail ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="font-medium">Log source:</span> {detailQuery.data.sigmaDetail.logSource ?? "Unknown"}</p>
                      <p><span className="font-medium">Severity:</span> {detailQuery.data.sigmaDetail.severity ?? "Unknown"}</p>
                      <p className="whitespace-pre-wrap break-words"><span className="font-medium">Command line:</span> {detailQuery.data.sigmaDetail.commandLine ?? "Unknown"}</p>
                    </div>
                  ) : null}
                  {detailQuery.data.networkDetail ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="font-medium">Source IP:</span> {detailQuery.data.networkDetail.sourceIp ?? "Unknown"}</p>
                      <p><span className="font-medium">Destination IP:</span> {detailQuery.data.networkDetail.destIp ?? "Unknown"}</p>
                      <p><span className="font-medium">Protocol:</span> {detailQuery.data.networkDetail.protocol ?? "Unknown"}</p>
                      <p><span className="font-medium">Severity:</span> {detailQuery.data.networkDetail.severity ?? "Unknown"}</p>
                      <p><span className="font-medium">Flow ID:</span> {detailQuery.data.networkDetail.flowId ?? "Unknown"}</p>
                    </div>
                  ) : null}
                  {!detailQuery.data.yaraDetail && !detailQuery.data.sigmaDetail && !detailQuery.data.networkDetail ? (
                    <p className="mt-3 text-sm text-muted-foreground">No scanner-specific fields were persisted for this finding.</p>
                  ) : null}
                </section>

                <section className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                  <p className="wb-kicker">Raw payload</p>
                  <pre className="mt-3 max-h-[20rem] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-surface-1/70 p-3 text-xs">
                    <code>{detailQuery.data.rawPayload ?? "No raw payload stored."}</code>
                  </pre>
                </section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

