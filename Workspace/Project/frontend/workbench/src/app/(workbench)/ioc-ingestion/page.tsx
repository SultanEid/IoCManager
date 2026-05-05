"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Eye, FileJson, FileSpreadsheet, Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { summarizeAiVerdict, toAiVerdictDisplay } from "@/shared/ai/verdict-scale"
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

const DEFAULT_PAGE_SIZE = 100
const PAGE_SIZE_OPTIONS = [50, 100, 250]
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
  return /(verdict=|calibrated_signal=|uncertainty=|conflict=)/i.test(reason)
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

  const targetsQuery = useWorkbenchQuery(["legacy-pipeline", "ioc-explorer-targets"], (signal) => listLegacyTargets(undefined, signal))
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
  const latestIocVerdictDisplay = latestIocDecision ? toAiVerdictDisplay(latestIocDecision.verdict) : null
  const latestIocTelemetryReason =
    latestIocDecision?.reasons.find((reason) => isDecisionTelemetryReason(reason)) ?? null
  const latestIocNarrativeReasons =
    latestIocDecision?.reasons.filter((reason) => !isDecisionTelemetryReason(reason)) ?? []
  const latestIocLeadReason = latestIocNarrativeReasons[0] ?? null
  const latestIocSupportingReasons = latestIocNarrativeReasons.slice(1, 3)
  const latestIocConfidenceReasons = explainDecisionConfidence({
    result: latestIocDecisionResult,
    sourceLabel: latestRelatedDetection?.source ?? "IOC-native generation",
    hasDetectionContext: Boolean(latestIocDecisionData?.detectionId),
  })

  const targets = targetsQuery.data ?? []
  const findingsPage = findingsQuery.data
  const findings = findingsPage?.items ?? []
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
    const next = buildQuery({
      ...parsedFilters,
      page: Math.max(nextPage, 1),
      pageSize: nextPageSize,
    })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

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

      await Promise.all([latestIocDecisionQuery.refetch(), relatedDetectionsQuery.refetch()])
      setGenerateDecisionStatus("Latest AI decision loaded for this IOC.")
    } catch (error) {
      setGenerateDecisionError(readErrorMessage(error))
      setGenerateDecisionStatus(null)
    } finally {
      setIsGeneratingDecision(false)
    }
  }

  if (targetsQuery.isError || findingsQuery.isError) {
    return (
      <ClassifiedFailureState
        failure={classifyUiError(targetsQuery.error ?? findingsQuery.error)}
        fallbackTitle="IOCs Explorer unavailable"
      />
    )
  }

  return (
    <section className="wb-page space-y-6">
      <header className="wb-page-header">
        <p className="wb-kicker">IOCs Explorer</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Investigate normalized findings across all scanners</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Review normalized YARA, SIGMA, SNORT, and SURICATA detections with shared filters, raw payload access, and scanner-specific context.
        </p>
        {parsedFilters.painLevel ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs text-primary">
            <span className="font-semibold uppercase tracking-[0.09em]">Pyramid filter</span>
            <span>{formatPainLevelLabel(parsedFilters.painLevel)}</span>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Loaded Findings</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{findingsLoading ? "..." : findings.length}</p>
            {findingsLoading ? (
              <p className="mt-1 text-xs text-muted-foreground">Loading findings for the current query.</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Total Matching</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{findingsLoading ? "..." : totalCount}</p>
            {findingsRefreshing ? (
              <p className="mt-1 text-xs text-muted-foreground">Refreshing totals for the current filter set.</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Selected Rows</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{selectedRows.length}</p>
          </div>
        </div>
      </header>

      <article className="wb-panel space-y-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(180px,0.6fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Search rule name, value, payload, command line, or network indicators"
            />
          </div>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.scannerFamily}
            onChange={(event) => setFilters((current) => ({ ...current, scannerFamily: event.target.value }))}
          >
            <option value="">All scanners</option>
            <option value="YARA">YARA</option>
            <option value="SIGMA">SIGMA</option>
            <option value="SNORT">SNORT</option>
            <option value="SURICATA">SURICATA</option>
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.targetId}
            onChange={(event) => setFilters((current) => ({ ...current, targetId: event.target.value }))}
            disabled={targetsLoading}
          >
            <option value="">{targetsLoading ? "Loading targets..." : "All targets"}</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.displayName ?? target.hostname ?? target.ipAddress}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
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
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)_auto]">
          <Input
            type="datetime-local"
            value={filters.fromUtc}
            onChange={(event) => setFilters((current) => ({ ...current, fromUtc: event.target.value }))}
          />
          <Input
            type="datetime-local"
            value={filters.toUtc}
            onChange={(event) => setFilters((current) => ({ ...current, toUtc: event.target.value }))}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
            {parsedFilters.painLevel ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const nextFilters = { ...filters, painLevel: "", page: 1 }
                  setFilters(nextFilters)
                  const next = buildQuery(nextFilters)
                  router.replace(next ? `${pathname}?${next}` : pathname)
                }}
              >
                Clear pyramid filter
              </Button>
            ) : null}
          </div>
        </div>
      </article>

      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Normalized findings</h3>
            <p className="text-xs text-muted-foreground">
              One searchable table over persisted findings from host and network scanners.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => exportLegacyIocFindingsCsv(selectedRows)}
              disabled={selectedRows.length === 0}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => exportLegacyIocFindingsJson(selectedRows)}
              disabled={selectedRows.length === 0}
            >
              <FileJson className="h-3.5 w-3.5" />
              Export JSON
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-2/45 px-3 py-2 text-xs text-muted-foreground">
          {findingsLoading ? <p>Loading findings for the current query.</p> : null}
          <p className={findingsLoading ? "hidden" : undefined}>
            Page {currentPage} of {totalPages} Â· {totalCount} matching findings
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Page size</span>
              <select
                className="h-8 rounded-lg border border-border/70 bg-surface-1 px-2 text-xs"
                value={pageSize}
                disabled={findingsLoading}
                onChange={(event) => {
                  const nextPageSize = Number.parseInt(event.target.value, 10) || DEFAULT_PAGE_SIZE
                  setFilters((current) => ({ ...current, page: 1, pageSize: nextPageSize }))
                  updatePageState(1, nextPageSize)
                }}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => updatePageState(currentPage - 1)}
              disabled={findingsLoading || currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => updatePageState(currentPage + 1)}
              disabled={findingsLoading || currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>

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
          <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-surface-2/85 backdrop-blur supports-[backdrop-filter]:bg-surface-2/75">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      aria-label="Select all visible findings"
                      onChange={toggleSelectAllVisible}
                    />
                  </TableHead>
                  <TableHead>Scanner</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Indicator Value</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="w-12">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding) => {
                  const selected = selectedIds.includes(finding.iocId)
                  return (
                    <TableRow
                      key={finding.iocId}
                      data-state={selected ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedIocId(finding.iocId)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
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
                      <TableCell>
                        <div className="min-w-[15rem]">
                          <p className="font-medium">{finding.targetDisplay}</p>
                          <p className="text-xs text-muted-foreground">{finding.targetIp ?? "Unresolved target"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[18rem] whitespace-normal">
                          <p className="font-medium">{finding.ruleName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.status}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[22rem] whitespace-normal">
                          <p className="line-clamp-2">{finding.indicatorValue}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.indicatorKind}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={finding.severity} />
                      </TableCell>
                      <TableCell>{formatTimestamp(finding.timestampUtc)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedIocId(finding.iocId)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </article>

      <Sheet open={selectedIocId !== null} onOpenChange={(open) => !open && setSelectedIocId(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto border-border/70 bg-surface-1/96 px-6">
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
                        <div className="rounded-xl border border-border/70 bg-surface-1/70 p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {latestIocVerdictDisplay ? <StatusBadge value={latestIocVerdictDisplay.label} /> : null}
                                  {latestIocVerdictDisplay ? (
                                    <StatusBadge value={`Level ${latestIocVerdictDisplay.scalePosition} of 5`} />
                                  ) : null}
                                  <StatusBadge value={latestIocDecisionResult?.status ?? "unknown"} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-base font-semibold tracking-tight">
                                    {summarizeAiVerdict(latestIocDecision.verdict, "IOC")}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {latestIocLeadReason ?? "No operator-facing explanation was stored for this decision."}
                                  </p>
                                </div>
                              </div>

                              <dl className="grid min-w-[16rem] gap-x-6 gap-y-3 sm:grid-cols-2">
                                <div>
                                  <dt className="wb-kicker">Confidence</dt>
                                  <dd className="mt-1 text-lg font-semibold">{formatPercent(latestIocDecision.confidence)}</dd>
                                </div>
                                <div>
                                  <dt className="wb-kicker">False Positive Risk</dt>
                                  <dd className="mt-1 text-lg font-semibold">{formatPercent(latestIocDecision.falsePositiveRisk)}</dd>
                                </div>
                              </dl>
                            </div>

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

                            <div className="rounded-lg border border-border/60 bg-surface-2/45 px-3 py-2.5 text-sm text-muted-foreground">
                              {latestIocDecisionData?.detectionId
                                ? latestRelatedDetection?.ruleName
                                  ? `Linked to detection ${latestRelatedDetection.ruleName}. Open full decision to review the full detection context.`
                                  : "A full detection view is available for this AI decision."
                                : "This decision was generated directly from IOC context. No full detection page has been materialized for this IOC yet."}
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

                        {latestIocSupportingReasons.length > 0 || latestIocTelemetryReason ? (
                          <div className="rounded-lg border border-border/70 bg-surface-1/70 p-4">
                            <p className="wb-kicker">Decision notes</p>
                            <div className="mt-3 space-y-3">
                              {latestIocSupportingReasons.length > 0 ? (
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  {latestIocSupportingReasons.map((reason) => (
                                    <li key={reason} className="flex gap-2">
                                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              {latestIocTelemetryReason ? (
                                <details className="rounded-lg border border-border/60 bg-surface-2/45 p-3">
                                  <summary className="cursor-pointer list-none text-xs font-semibold tracking-tight text-muted-foreground">
                                    <div className="flex items-center justify-between gap-2">
                                      <span>Technical details</span>
                                      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">Expand</span>
                                    </div>
                                  </summary>
                                  <div className="mt-3 rounded-md border border-dashed border-border/60 bg-surface-2/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
                                    <span className="font-medium text-foreground">Scoring note:</span> {latestIocTelemetryReason}
                                  </div>
                                </details>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
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

