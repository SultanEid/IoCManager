"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { AlertQueuePanel } from "@/components/workbench/alerts/alert-queue-panel"
import { ScannerFamilyBadge } from "@/components/workbench/scanner-family-mark"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import type { V2AlertResponse } from "@/shared/api/schemas"
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
  targetId: string
  fromUtc: string
  toUtc: string
  page: number
}

function AlertProgressCell({ alert }: { alert: V2AlertResponse }) {
  if (alert.progress.totalIocs === 0) {
    return (
      <div className="min-w-28 rounded-lg border border-border/65 bg-surface-2/55 px-2 py-1.5 text-xs text-muted-foreground">
        No linked IOCs
      </div>
    )
  }

  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">{alert.progress.percentComplete}%</span>
        <span className="text-muted-foreground">
          {alert.progress.completedCount}/{alert.progress.totalIocs}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-1"
        role="progressbar"
        aria-label={`IOC progress for ${alert.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={alert.progress.percentComplete}
      >
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${alert.progress.percentComplete}%` }} />
      </div>
    </div>
  )
}

function AlertMobileCard({ alert, onOpen }: { alert: V2AlertResponse; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-xl border border-border/70 bg-surface-2/55 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold tracking-tight">{alert.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{alert.summary}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <StatusBadge value={alert.severity} />
          <StatusBadge value={alert.status} />
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="wb-kicker">Scanner</p>
          <div className="mt-1"><ScannerFamilyBadge family={alert.scannerFamily} size="sm" /></div>
        </div>
        <div>
          <p className="wb-kicker">Target</p>
          <p className="mt-1 break-words text-foreground">{alert.targetDisplay}</p>
        </div>
        <div>
          <p className="wb-kicker">Owner</p>
          <p className="mt-1 text-foreground">{alert.ownerUserId === "unassigned" ? "Unassigned" : alert.ownerUserId}</p>
        </div>
      </div>
      <div className="mt-3">
        <AlertProgressCell alert={alert} />
      </div>
    </button>
  )
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
  {
    accessorKey: "scannerFamily",
    header: "Scanner",
    cell: ({ row }) => <ScannerFamilyBadge family={row.original.scannerFamily} size="sm" />,
  },
  {
    accessorKey: "targetDisplay",
    header: "Target",
  },
  {
    accessorKey: "linkedIocCount",
    header: "Linked IOCs",
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => <AlertProgressCell alert={row.original} />,
  },
  {
    accessorKey: "lastDetectedAtUtc",
    header: "Last Seen",
    cell: ({ row }) => new Date(row.original.lastDetectedAtUtc).toLocaleString(),
  },
  {
    accessorKey: "ownerUserId",
    header: "Owner",
    cell: ({ row }) => (row.original.ownerUserId === "unassigned" ? "Unassigned" : row.original.ownerUserId),
  },
]

function parseFilters(searchParams: URLSearchParams): AlertFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    severity: searchParams.get("severity") ?? "",
    family: searchParams.get("family") ?? "",
    targetId: searchParams.get("targetId") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: AlertFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.status) params.set("status", filters.status)
  if (filters.severity) params.set("severity", filters.severity)
  if (filters.family) params.set("family", filters.family)
  if (filters.targetId) params.set("targetId", filters.targetId)
  if (filters.fromUtc) params.set("fromUtc", filters.fromUtc)
  if (filters.toUtc) params.set("toUtc", filters.toUtc)
  if (filters.page > 1) params.set("page", String(filters.page))
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
          family: parsedFilters.family ? (parsedFilters.family as AlertListQuery["family"]) : undefined,
          targetId: parsedFilters.targetId || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: 25,
        } satisfies AlertListQuery,
        signal,
      ),
  )

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
      targetId: "",
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

  if (alertsQuery.isLoading) {
    return <LoadingState label="Loading alerts" />
  }

  if (alertsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(alertsQuery.error)} fallbackTitle="Alerts unavailable" />
  }

  const list = alertsQuery.data
  const rows = list?.items ?? []
  const total = list?.totalCount ?? 0
  const page = list?.page ?? parsedFilters.page
  const pageSize = list?.pageSize ?? 25
  const canMoveNext = page * pageSize < total
  const filteredOut = total === 0 && Object.values(parsedFilters).some((value) => value !== "" && value !== 1)
  const openAlerts = rows.filter((item) => item.status === "Open" || item.status === "Investigating").length
  const criticalAlerts = rows.filter((item) => item.severity === "Critical").length
  const unassignedAlerts = rows.filter((item) => item.ownerUserId === "unassigned").length

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <p className="wb-kicker">Alert Posture</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Case alert queue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track case progress and evidence.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
            <p className="wb-kicker">Stored Cases</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
            <p className="wb-kicker">Open In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{openAlerts}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
            <p className="wb-kicker">Critical In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{criticalAlerts}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
            <p className="wb-kicker">Unassigned In Page</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{unassignedAlerts}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search title, summary, target, rule"
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
          <Input
            value={filters.targetId}
            onChange={(event) => setFilters((current) => ({ ...current, targetId: event.target.value.trim(), page: 1 }))}
            placeholder="Target id"
          />
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
            <h3 className="text-sm font-semibold tracking-tight">Stored alert registry</h3>
            <p className="text-xs text-muted-foreground">
              Page {page} | {rows.length} row(s) returned
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No alerts matched the current search"
              description="Broaden the time window, remove the family or target filter, or clear the query to reopen the alert queue."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset alert filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No alerts available"
              description="High and critical fresh findings will appear here once they are promoted during result ingestion."
            />
          )
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {rows.map((row) => (
                <AlertMobileCard key={row.id} alert={row} onOpen={() => router.push(`/alerts/${row.id}`)} />
              ))}
            </div>
            <div className="hidden lg:block">
              <DataGrid data={rows} columns={columns} onRowClick={(row) => router.push(`/alerts/${row.id}`)} />
            </div>
          </>
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

      <motion.div variants={panelMotion}>
        <AlertQueuePanel />
      </motion.div>
    </motion.section>
  )
}
