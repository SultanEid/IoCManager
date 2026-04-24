"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { IngestionFeedsSubnav } from "@/components/workbench/ingestion-feeds-subnav"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/shared/api/error"
import { classifyUiError } from "@/shared/api/error-classification"
import type { IocResponse } from "@/shared/api/schemas"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import type { IocListQuery } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState, SimulatedBadge } from "@/shared/ui/state-panels"

const PAGE_SIZE = 20

type IocFiltersState = {
  q: string
  type: string
  severity: string
  source: string
  feedSourceId: string
  fromUtc: string
  toUtc: string
  page: number
}

const columns: ColumnDef<IocResponse>[] = [
  {
    accessorKey: "value",
    header: "IoC",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.value}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.fileName || row.original.feedSourceName || "Inline feed item"}</p>
      </div>
    ),
  },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadge value={row.original.severity} />,
  },
  {
    accessorKey: "feedSourceType",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.feedSourceType || row.original.feedSourceName || row.original.feedSourceId.slice(0, 8)}</span>
    ),
  },
  {
    accessorKey: "lastSeenAtUtc",
    header: "Last Seen",
    cell: ({ row }) => new Date(row.original.lastSeenAtUtc).toLocaleString(),
  },
]

function parseFilters(searchParams: URLSearchParams): IocFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    severity: searchParams.get("severity") ?? "",
    source: searchParams.get("source") ?? "",
    feedSourceId: searchParams.get("feedSourceId") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: IocFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.type) {
    params.set("type", filters.type)
  }
  if (filters.severity) {
    params.set("severity", filters.severity)
  }
  if (filters.source) {
    params.set("source", filters.source)
  }
  if (filters.feedSourceId) {
    params.set("feedSourceId", filters.feedSourceId)
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

export default function IngestionFeedsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const healthQuery = useWorkbenchQuery(["ingestion", "health"], (signal) => gateway.getHealthInfo(signal), {
    enabled: isModeConfigured,
  })
  const readinessQuery = useWorkbenchQuery(["ingestion", "ready"], (signal) => gateway.getHealthReady(signal), {
    enabled: isModeConfigured,
  })
  const feedSourcesQuery = useWorkbenchQuery(["ingestion", "feed-sources"], (signal) => gateway.listFeedSources(signal), {
    enabled: isModeConfigured,
  })
  const iocsQuery = useWorkbenchQuery(
    ["ingestion", "iocs", parsedFilters],
    (signal) =>
      gateway.listIocs(
        {
          q: parsedFilters.q || undefined,
          type: parsedFilters.type || undefined,
          severity: parsedFilters.severity || undefined,
          source: parsedFilters.source || undefined,
          feedSourceId: parsedFilters.feedSourceId || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: PAGE_SIZE,
        } satisfies IocListQuery,
        signal,
      ),
    {
      enabled: isModeConfigured,
    },
  )

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: IocFiltersState = {
      q: "",
      type: "",
      severity: "",
      source: "",
      feedSourceId: "",
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

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="IoC ingestion unavailable" />
  }

  if (
    healthQuery.isLoading ||
    readinessQuery.isLoading ||
    feedSourcesQuery.isLoading ||
    iocsQuery.isLoading
  ) {
    return <LoadingState label="Loading IOCs Explorer" />
  }

  if (healthQuery.isError || !healthQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(healthQuery.error)} fallbackTitle="IOCs Explorer unavailable" />
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(readinessQuery.error)} fallbackTitle="IoC ingestion unavailable" />
  }

  if (feedSourcesQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(feedSourcesQuery.error)} fallbackTitle="IOCs Explorer unavailable" />
  }

  if (iocsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(iocsQuery.error)} fallbackTitle="IOCs Explorer unavailable" />
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
        fallbackTitle="IOCs Explorer unavailable"
      />
    )
  }

  const optionalDegradedComponents = readinessQuery.data.components.filter(
    (component) => !component.required && component.status === "degraded",
  )
  const list = iocsQuery.data
  const items = list?.items ?? []
  const total = list?.totalCount ?? 0
  const page = list?.page ?? parsedFilters.page
  const pageSize = list?.pageSize ?? PAGE_SIZE
  const canMoveNext = page * pageSize < total
  const filteredOut = Object.values(parsedFilters).some((value) => value !== "" && value !== 1)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <IngestionFeedsSubnav current="overview" />

      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">IOCs Explorer</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Search ingested indicators with contract-backed filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Service: {healthQuery.data.service} | Env: {healthQuery.data.environment}
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
        {optionalDegradedComponents.length > 0 ? (
          <div
            data-testid="ingestion-optional-degraded"
            className="mt-3 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          >
            Optional dependency degraded:{" "}
            {optionalDegradedComponents.map((component) => `${component.name} (${component.message})`).join(", ")}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Matching IoCs</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Visible This Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{items.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Feed Sources</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{feedSourcesQuery.data?.length ?? 0}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search value, file, or source"
          />
          <Input
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value, page: 1 }))}
            placeholder="Type"
          />
          <Input
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value, page: 1 }))}
            placeholder="Severity"
          />
          <Input
            value={filters.source}
            onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value, page: 1 }))}
            placeholder="Source name or type"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.feedSourceId}
            onChange={(event) => setFilters((current) => ({ ...current, feedSourceId: event.target.value, page: 1 }))}
          >
            <option value="">All feed sources</option>
            {(feedSourcesQuery.data ?? []).map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.name} ({feed.sourceType})
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
            <h3 className="text-sm font-semibold tracking-tight">Ingested indicators</h3>
            <p className="text-xs text-muted-foreground">
              Page {page} | {items.length} row(s) returned
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No indicators matched the current search"
              description="Broaden the time window, remove the feed constraint, or clear the search terms to reopen the wider ingestion surface."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset IoC filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No indicators available"
              description="Indicators will appear here once feed ingestion writes normalized IoC records."
            />
          )
        ) : (
          <DataGrid data={items} columns={columns} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {items.length} of {total} matching indicators</p>
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
    </motion.section>
  )
}
