"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import type { ReportResponse, RuleFamily } from "@/shared/api/schemas"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import type { ReportListQuery } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState, SimulatedBadge } from "@/shared/ui/state-panels"

const FAMILY_OPTIONS = ["yara", "sigma", "snort", "suricata"] as const
const PAGE_SIZE = 20

type ReportFiltersState = {
  q: string
  reportType: string
  severity: string
  status: string
  family: string
  serverId: string
  fromUtc: string
  toUtc: string
  page: number
}

const columns: ColumnDef<ReportResponse>[] = [
  {
    accessorKey: "title",
    header: "Report",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.id.slice(0, 8)}</p>
      </div>
    ),
  },
  {
    accessorKey: "reportType",
    header: "Type",
    cell: ({ row }) => <StatusBadge value={row.original.reportType} />,
  },
  {
    accessorKey: "alertIds",
    header: "Linked Alerts",
    cell: ({ row }) => row.original.alertIds.length,
  },
  {
    accessorKey: "generatedAtUtc",
    header: "Generated",
    cell: ({ row }) => new Date(row.original.generatedAtUtc).toLocaleString(),
  },
]

function parseFilters(searchParams: URLSearchParams): ReportFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    reportType: searchParams.get("reportType") ?? "",
    severity: searchParams.get("severity") ?? "",
    status: searchParams.get("status") ?? "",
    family: searchParams.get("family") ?? "",
    serverId: searchParams.get("serverId") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: ReportFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.reportType) {
    params.set("reportType", filters.reportType)
  }
  if (filters.severity) {
    params.set("severity", filters.severity)
  }
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.family) {
    params.set("family", filters.family)
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

export default function ReportsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Reports unavailable" />
  }

  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const reportsQuery = useWorkbenchQuery(
    ["reports", parsedFilters],
    (signal) =>
      gateway.listReports(
        {
          q: parsedFilters.q || undefined,
          reportType: parsedFilters.reportType || undefined,
          severity: parsedFilters.severity || undefined,
          status: parsedFilters.status || undefined,
          family: parsedFilters.family as RuleFamily | undefined,
          serverId: parsedFilters.serverId || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: PAGE_SIZE,
        } satisfies ReportListQuery,
        signal,
      ),
  )
  const serversQuery = useWorkbenchQuery(["reports", "servers"], (signal) => gateway.listTargetServers(undefined, signal))

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: ReportFiltersState = {
      q: "",
      reportType: "",
      severity: "",
      status: "",
      family: "",
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

  if (reportsQuery.isLoading || serversQuery.isLoading) {
    return <LoadingState label="Loading reports" />
  }

  if (reportsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(reportsQuery.error)} fallbackTitle="Reports unavailable" />
  }

  if (serversQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(serversQuery.error)} fallbackTitle="Reports unavailable" />
  }

  const list = reportsQuery.data
  const items = list?.items ?? []
  const total = list?.totalCount ?? 0
  const page = list?.page ?? parsedFilters.page
  const pageSize = list?.pageSize ?? PAGE_SIZE
  const canMoveNext = page * pageSize < total
  const linkedAlerts = items.reduce((sum, item) => sum + item.alertIds.length, 0)
  const filteredOut = Object.values(parsedFilters).some((value) => value !== "" && value !== 1)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Reports</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Search generated reporting artifacts without leaving the workbench</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by report type, linked alert posture, related scanner family, server, and generation window.
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Matching Reports</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Visible This Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{items.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Linked Alerts</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{linkedAlerts}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search title or summary"
          />
          <Input
            value={filters.reportType}
            onChange={(event) => setFilters((current) => ({ ...current, reportType: event.target.value, page: 1 }))}
            placeholder="Report type"
          />
          <Input
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value, page: 1 }))}
            placeholder="Alert severity"
          />
          <Input
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
            placeholder="Alert status"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
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
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={applyFilters}>
            Apply
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Report registry</h3>
            <p className="text-xs text-muted-foreground">
              Page {page} | {items.length} row(s) returned
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No reports matched the current search"
              description="Relax the generation window, remove the linked server or family filter, or clear the query to return to the broader reporting set."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset report filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No reports available"
              description="Reports will appear here after analysis and export workflows emit persisted report artifacts."
            />
          )
        ) : (
          <DataGrid data={items} columns={columns} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {items.length} of {total} matching reports</p>
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
