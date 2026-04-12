"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/shared/api/error"
import { classifyUiError } from "@/shared/api/error-classification"
import type { DetectionHistoryItemResponse, RuleFamily } from "@/shared/api/schemas"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import type { DetectionListQuery } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState, SimulatedBadge } from "@/shared/ui/state-panels"

const FAMILY_OPTIONS = ["yara", "sigma", "snort", "suricata"] as const
const PAGE_SIZE = 20

type DetectionFiltersState = {
  q: string
  family: string
  status: string
  source: string
  serverId: string
  fromUtc: string
  toUtc: string
  page: number
}

const columns: ColumnDef<DetectionHistoryItemResponse>[] = [
  {
    accessorKey: "fingerprint",
    header: "Detection",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.ruleName || row.original.iocValue || row.original.fingerprint.slice(0, 12)}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.fingerprint}</p>
      </div>
    ),
  },
  {
    accessorKey: "scannerFamily",
    header: "Family",
    cell: ({ row }) => <StatusBadge value={row.original.scannerFamily} />,
  },
  {
    accessorKey: "disposition",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.disposition} />,
  },
  {
    accessorKey: "serverHostname",
    header: "Server",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.serverHostname || row.original.serverId.slice(0, 8)}</span>
    ),
  },
  {
    accessorKey: "lastObservedAtUtc",
    header: "Last Seen",
    cell: ({ row }) => new Date(row.original.lastObservedAtUtc).toLocaleString(),
  },
]

function parseFilters(searchParams: URLSearchParams): DetectionFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    family: searchParams.get("family") ?? "",
    status: searchParams.get("status") ?? "",
    source: searchParams.get("source") ?? "",
    serverId: searchParams.get("serverId") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: DetectionFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.family) {
    params.set("family", filters.family)
  }
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.source) {
    params.set("source", filters.source)
  }
  if (filters.serverId) {
    params.set("serverId", filters.serverId)
  }
  if (filters.fromUtc) {
    params.set("fromUtc", filters.fromUtc)
  }
  if (filters.toUtc) {
    params.set("toUtc", filters.toUtc)
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page))
  }
  return params.toString()
}

export default function ResultsIngestionPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Result ingestion unavailable" />
  }

  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const healthQuery = useWorkbenchQuery(["results-ingestion", "health"], (signal) => gateway.getHealthInfo(signal))
  const readinessQuery = useWorkbenchQuery(["results-ingestion", "ready"], (signal) => gateway.getHealthReady(signal))
  const jobsQuery = useWorkbenchQuery(["results-ingestion", "jobs"], (signal) => gateway.listJobRuns(signal))
  const serversQuery = useWorkbenchQuery(["results-ingestion", "servers"], (signal) => gateway.listTargetServers(undefined, signal))
  const detectionsQuery = useWorkbenchQuery(
    ["results-ingestion", "detections", parsedFilters],
    (signal) =>
      gateway.listDetections(
        {
          q: parsedFilters.q || undefined,
          family: parsedFilters.family as RuleFamily | undefined,
          status: parsedFilters.status || undefined,
          source: parsedFilters.source || undefined,
          serverId: parsedFilters.serverId || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: PAGE_SIZE,
        } satisfies DetectionListQuery,
        signal,
      ),
  )

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: DetectionFiltersState = {
      q: "",
      family: "",
      status: "",
      source: "",
      serverId: "",
      fromUtc: "",
      toUtc: "",
      page: 1,
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const movePage = (page: number) => {
    const next = buildQuery({ ...parsedFilters, page: Math.max(1, page) })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  if (
    healthQuery.isLoading ||
    readinessQuery.isLoading ||
    jobsQuery.isLoading ||
    serversQuery.isLoading ||
    detectionsQuery.isLoading
  ) {
    return <LoadingState label="Loading scans" />
  }

  if (healthQuery.isError || !healthQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(healthQuery.error)} fallbackTitle="Scans unavailable" />
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(readinessQuery.error)} fallbackTitle="Scans unavailable" />
  }

  if (jobsQuery.isError || !jobsQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(jobsQuery.error)} fallbackTitle="Scans unavailable" />
  }

  if (serversQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(serversQuery.error)} fallbackTitle="Scans unavailable" />
  }

  if (detectionsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(detectionsQuery.error)} fallbackTitle="Scans unavailable" />
  }

  if (readinessQuery.data.status !== "ready") {
    const unavailableRequired = readinessQuery.data.components
      .filter((component) => component.required && component.status !== "healthy")
      .map((component) => component.name)
    const detail =
      unavailableRequired.length > 0
        ? `Required backend dependencies are unavailable: ${unavailableRequired.join(", ")}.`
        : "Required backend dependencies are unavailable."

    return (
      <ClassifiedFailureState
        failure={classifyUiError(
          new ApiError(detail, 503, readinessQuery.data, {
            title: "Dependency Temporarily Unavailable",
            detail,
            dependency: unavailableRequired.join(",") || "required_dependencies",
            condition: "not_ready",
            dependencyType: "required",
            retryable: true,
          }),
        )}
        fallbackTitle="Scans unavailable"
      />
    )
  }

  const optionalDegradedComponents = readinessQuery.data.components.filter(
    (component) => !component.required && component.status === "degraded",
  )
  const list = detectionsQuery.data
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const page = Math.floor((list?.skip ?? 0) / (list?.take || PAGE_SIZE)) + 1
  const canMoveNext = (list?.skip ?? 0) + (list?.take ?? PAGE_SIZE) < total
  const filteredOut = Object.values(parsedFilters).some((value) => value !== "" && value !== 1)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Scans</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Search scan results and normalized detections with backend filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Service: {healthQuery.data.service} | Env: {healthQuery.data.environment}
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
        {optionalDegradedComponents.length > 0 ? (
          <div
            data-testid="results-ingestion-optional-degraded"
            className="mt-3 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          >
            Optional dependency degraded:{" "}
            {optionalDegradedComponents.map((component) => `${component.name} (${component.message})`).join(", ")}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Matching Detections</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Visible This Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{items.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Sources In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{new Set(items.map((item) => item.source || "unknown")).size}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search fingerprint, rule, or IoC"
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.family}
            onChange={(event) => setFilters((current) => ({ ...current, family: event.target.value, page: 1 }))}
          >
            <option value="">All families</option>
            {FAMILY_OPTIONS.map((family) => (
              <option key={family} value={family}>
                {family.toUpperCase()}
              </option>
            ))}
          </select>
          <Input
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
            placeholder="Disposition"
          />
          <Input
            value={filters.source}
            onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value, page: 1 }))}
            placeholder="Source"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.serverId}
            onChange={(event) => setFilters((current) => ({ ...current, serverId: event.target.value, page: 1 }))}
          >
            <option value="">All servers</option>
            {(serversQuery.data ?? []).map((server) => (
              <option key={server.id} value={server.id}>
                {server.hostname} ({server.ipAddress})
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={filters.fromUtc}
            onChange={(event) => setFilters((current) => ({ ...current, fromUtc: event.target.value, page: 1 }))}
          />
          <Input
            type="date"
            value={filters.toUtc}
            onChange={(event) => setFilters((current) => ({ ...current, toUtc: event.target.value, page: 1 }))}
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Detection history</h3>
            <p className="text-xs text-muted-foreground">
              Page {page} | {items.length} row(s) returned
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No detections matched the current search"
              description="Relax the observed-at window, remove the source or server filter, or clear the search text to reopen the wider normalized result set."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset detection filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No detections available"
              description="Detections will appear here once scan results are normalized into persisted history."
            />
          )
        ) : (
          <DataGrid data={items} columns={columns} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {items.length} of {total} matching detections</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(page - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(page + 1)} disabled={!canMoveNext}>
              Next
            </Button>
          </div>
        </div>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Recent Result Processing Jobs</h3>
        {jobsQuery.data.length === 0 ? (
          <EmptyState
            title="No result ingestion jobs"
            description="No recent scan-result normalization jobs were returned by the backend."
          />
        ) : (
          <div className="space-y-2">
            {jobsQuery.data.slice(0, 8).map((job) => (
              <div key={job.id} className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2 text-sm">
                <p className="font-medium">
                  {job.jobType} | {job.status}
                </p>
                <p className="text-xs text-muted-foreground">{job.details || "No detail"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Triggered by {job.triggeredBy} | {new Date(job.startedAtUtc).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.article>
    </motion.section>
  )
}
