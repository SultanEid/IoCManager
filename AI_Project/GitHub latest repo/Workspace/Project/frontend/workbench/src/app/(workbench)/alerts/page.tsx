"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import type { RuleFamily, V2AlertResponse } from "@/shared/api/schemas"
import { gateway } from "@/shared/gateway"
import type { AlertListQuery } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"

const FAMILY_OPTIONS = ["yara", "sigma", "snort", "suricata"] as const
const STATUS_OPTIONS = ["Open", "Investigating", "Resolved", "Closed"] as const
const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const

type AlertFiltersState = {
  q: string
  status: string
  severity: string
  family: string
  serverId: string
  fromUtc: string
  toUtc: string
  page: number
}

const columns: ColumnDef<V2AlertResponse>[] = [
  {
    accessorKey: "title",
    header: "Alert",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.summary}</p>
      </div>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadge value={row.original.severity} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  { accessorKey: "ownerUserId", header: "Owner" },
  { accessorKey: "approvalTierRequired", header: "Approval Tier" },
  {
    accessorKey: "lastDetectedAtUtc",
    header: "Last Seen",
    cell: ({ row }) => new Date(row.original.lastDetectedAtUtc).toLocaleString(),
  },
]

function parseFilters(searchParams: URLSearchParams): AlertFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    severity: searchParams.get("severity") ?? "",
    family: searchParams.get("family") ?? "",
    serverId: searchParams.get("serverId") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: AlertFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.severity) {
    params.set("severity", filters.severity)
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

export default function AlertsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const alertsQuery = useWorkbenchQuery(
    ["alerts", parsedFilters],
    (signal) =>
      gateway.listAlertRegistry(
        {
          q: parsedFilters.q || undefined,
          status: parsedFilters.status || undefined,
          severity: parsedFilters.severity || undefined,
          family: parsedFilters.family as RuleFamily | undefined,
          serverId: parsedFilters.serverId || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: 20,
        } satisfies AlertListQuery,
        signal,
      ),
  )
  const serversQuery = useWorkbenchQuery(["alerts", "servers"], (signal) => gateway.listTargetServers(undefined, signal))

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared = {
      q: "",
      status: "",
      severity: "",
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
    const nextFilters = { ...parsedFilters, page: Math.max(1, page) }
    const next = buildQuery(nextFilters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  if (alertsQuery.isLoading || serversQuery.isLoading) {
    return <LoadingState label="Loading alerts" />
  }

  if (alertsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(alertsQuery.error)} fallbackTitle="Alerts unavailable" />
  }

  if (serversQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(serversQuery.error)} fallbackTitle="Alerts unavailable" />
  }

  const list = alertsQuery.data
  const rows = list?.items ?? []
  const total = list?.totalCount ?? 0
  const page = list?.page ?? parsedFilters.page
  const pageSize = list?.pageSize ?? 20
  const canMoveNext = page * pageSize < total
  const filteredOut = total === 0 && Object.values(parsedFilters).some((value) => value !== "" && value !== 1)
  const openAlerts = rows.filter((item) => item.status.toLowerCase() !== "closed").length
  const criticalAlerts = rows.filter((item) => item.severity.toLowerCase() === "critical").length
  const familyFiltered = parsedFilters.family.length > 0 ? parsedFilters.family.toUpperCase() : "All families"

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <p className="wb-kicker">Alert Posture</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Search live alerts without dropping triage context</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indexed filters cover severity, status, related detection family, related server, and last-seen time range.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Matching Alerts</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Open In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{openAlerts}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Critical In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{criticalAlerts}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search title, summary, owner"
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value, page: 1 }))}
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
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
            <h3 className="text-sm font-semibold tracking-tight">Alert registry</h3>
            <p className="text-xs text-muted-foreground">
              {familyFiltered} | page {page} | {rows.length} row(s) returned
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No alerts matched the current search"
              description="Broaden the time window, remove the server or family constraint, or clear the query to re-open the active triage set."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset alert filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No alerts available"
              description="Alerts will appear here once detections are promoted into the operational queue."
            />
          )
        ) : (
          <DataGrid data={rows} columns={columns} onRowClick={(row) => router.push(`/alerts/${row.id}`)} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {rows.length} of {total} matching alerts</p>
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
