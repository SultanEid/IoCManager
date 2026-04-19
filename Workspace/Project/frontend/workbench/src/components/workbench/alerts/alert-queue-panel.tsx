"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { ScannerFamilyBadge } from "@/components/workbench/scanner-family-mark"
import { StatusBadge } from "@/components/workbench/status-badge"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { FilterChips } from "@/shared/ui/filter-chips"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"
import { classifyUiError } from "@/shared/api/error-classification"
import type { V2AlertResponse } from "@/shared/api/schemas"

type QueueFilter = "all" | "unassigned" | "critical" | "investigating"

const queueFilters: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All active" },
  { key: "unassigned", label: "Unassigned" },
  { key: "critical", label: "Critical" },
  { key: "investigating", label: "Investigating" },
]

const columns: ColumnDef<V2AlertResponse>[] = [
  {
    accessorKey: "title",
    header: "Alert",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{row.original.targetDisplay}</span>
          <ScannerFamilyBadge family={row.original.scannerFamily} size="sm" />
        </div>
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
    accessorKey: "linkedIocCount",
    header: "Linked IOCs",
  },
  {
    accessorKey: "ownerUserId",
    header: "Owner",
    cell: ({ row }) => (row.original.ownerUserId === "unassigned" ? "Unassigned" : row.original.ownerUserId),
  },
  {
    accessorKey: "lastDetectedAtUtc",
    header: "Last Seen",
    cell: ({ row }) => new Date(row.original.lastDetectedAtUtc).toLocaleString(),
  },
]

export function AlertQueuePanel() {
  const router = useRouter()
  const [filter, setFilter] = useState<QueueFilter>("all")
  const queueQuery = useWorkbenchQuery(["alerts", "queue"], (signal) =>
    gateway.listAlertRegistry({ page: 1, pageSize: 100 }, signal),
  )

  const filteredRows = useMemo(() => {
    const rows = queueQuery.data?.items.filter((item) => item.status !== "Closed" && item.status !== "Resolved") ?? []
    switch (filter) {
      case "unassigned":
        return rows.filter((item) => item.ownerUserId === "unassigned")
      case "critical":
        return rows.filter((item) => item.severity === "Critical")
      case "investigating":
        return rows.filter((item) => item.status === "Investigating")
      default:
        return rows
    }
  }, [filter, queueQuery.data])

  if (queueQuery.isLoading) {
    return <LoadingState label="Loading alert queue" />
  }

  if (queueQuery.isError || !queueQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(queueQuery.error)} fallbackTitle="Alert queue unavailable" />
  }

  const rows = queueQuery.data.items.filter((item) => item.status !== "Closed" && item.status !== "Resolved")
  const unassignedCount = rows.filter((item) => item.ownerUserId === "unassigned").length
  const criticalCount = rows.filter((item) => item.severity === "Critical").length

  return (
    <article className="wb-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">Queue Focus</p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight">Stored alerts ready for analyst triage</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The queue is driven directly by stored IOC alerts, not by decision workflow availability.
          </p>
        </div>
        <div className="grid min-w-[240px] gap-2 text-right sm:grid-cols-3 sm:text-left">
          <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
            <p className="wb-kicker">Active</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
            <p className="wb-kicker">Unassigned</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{unassignedCount}</p>
          </div>
          <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 p-3">
            <p className="wb-kicker text-amber-100">Critical</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-amber-100">{criticalCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterChips title="Queue View" chips={queueFilters} active={filter} onChange={(value) => setFilter(value as QueueFilter)} />
        <p className="wb-subtle">{filteredRows.length} queue item(s)</p>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          title="No queue items in this view"
          description="No active stored alerts match the selected queue focus."
        />
      ) : (
        <DataGrid data={filteredRows} columns={columns} onRowClick={(row) => router.push(`/alerts/${row.id}`)} />
      )}
    </article>
  )
}
