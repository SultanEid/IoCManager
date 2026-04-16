"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { type DecisionResponse, type V2AlertResponse } from "@/shared/api/schemas"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { FilterChips } from "@/shared/ui/filter-chips"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

type QueueRow = {
  alertId: string
  title: string
  severity: string
  status: string
  approvalTier: string
  decisionState: string
  updatedAtUtc: string
  decisionAvailable: boolean
}

type QueueData = {
  rows: QueueRow[]
  totalAlerts: number
  decisionUnavailableCount: number
}

const decisionFilters = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting Approval" },
  { key: "investigating", label: "Investigating" },
  { key: "approved", label: "Approved" },
  { key: "no-decision", label: "No decision" },
]

const columns: ColumnDef<QueueRow>[] = [
  {
    accessorKey: "title",
    header: "Alert",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.alertId.slice(0, 8)}</p>
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
    header: "Alert Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    accessorKey: "decisionState",
    header: "Decision State",
    cell: ({ row }) => <StatusBadge value={row.original.decisionState} />,
  },
  {
    accessorKey: "approvalTier",
    header: "Approval Tier",
  },
  {
    accessorKey: "updatedAtUtc",
    header: "Updated",
    cell: ({ row }) => new Date(row.original.updatedAtUtc).toLocaleString(),
  },
]

function normalize(value: string) {
  return value.replace(/\s|_|-/g, "").toLowerCase()
}

function latestDecision(decisions: DecisionResponse[]) {
  return decisions
    .slice()
    .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
}

async function buildQueueRows(signal?: AbortSignal): Promise<QueueData> {
  const alertsResponse = await gateway.listAlertRegistry({ page: 1, pageSize: 200 }, signal)
  const activeAlerts = alertsResponse.items.filter((item) => normalize(item.status) !== "closed")
  const decisionSets = await Promise.allSettled(activeAlerts.map((item) => gateway.listDecisions(item.id, signal)))

  const rows = activeAlerts
    .map((item: V2AlertResponse, index) => {
      const result = decisionSets[index]
      const decisions = result?.status === "fulfilled" ? result.value : []
      const decision = latestDecision(decisions)
      const decisionAvailable = result?.status !== "rejected"

      return {
        alertId: item.id,
        title: item.title,
        severity: item.severity,
        status: item.status,
        approvalTier: item.approvalTierRequired,
        decisionState: decisionAvailable ? decision?.state ?? "No Decision" : "Decision Unavailable",
        updatedAtUtc: item.updatedAtUtc,
        decisionAvailable,
      }
    })
    .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))

  return {
    rows,
    totalAlerts: alertsResponse.totalCount,
    decisionUnavailableCount: rows.filter((row) => !row.decisionAvailable).length,
  }
}

export function AlertQueuePanel() {
  const router = useRouter()
  const [filter, setFilter] = useState("all")
  const queueQuery = useWorkbenchQuery(["alerts", "queue", "rows"], (signal) => buildQueueRows(signal))

  const filteredRows = useMemo(() => {
    const rows = queueQuery.data?.rows ?? []
    if (filter === "all") {
      return rows
    }

    if (filter === "awaiting") {
      return rows.filter((row) => normalize(row.decisionState).includes("awaitingapproval") || normalize(row.status).includes("awaitingapproval"))
    }

    if (filter === "investigating") {
      return rows.filter((row) => normalize(row.status).includes("investigating"))
    }

    if (filter === "approved") {
      return rows.filter((row) => normalize(row.decisionState).includes("approved"))
    }

    return rows.filter((row) => normalize(row.decisionState) === "nodecision")
  }, [filter, queueQuery.data])

  if (queueQuery.isLoading) {
    return <LoadingState label="Loading alert queue" />
  }

  if (queueQuery.isError || !queueQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(queueQuery.error)} fallbackTitle="Alert queue unavailable" />
  }

  return (
    <article className="wb-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">Queue Focus</p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight">Analyst queue inside the alert registry</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Active alerts stay triage-ready here, with decision lookup gaps called out instead of hidden.
          </p>
        </div>
        <div className="grid min-w-[240px] gap-2 text-right sm:grid-cols-3 sm:text-left">
          <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
            <p className="wb-kicker">Queue Rows</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{queueQuery.data.rows.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
            <p className="wb-kicker">Awaiting Approval</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {queueQuery.data.rows.filter((item) => normalize(item.decisionState).includes("awaitingapproval")).length}
            </p>
          </div>
          <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 p-3">
            <p className="wb-kicker text-amber-100">Decision Gaps</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-amber-100">{queueQuery.data.decisionUnavailableCount}</p>
          </div>
        </div>
      </div>

      {queueQuery.data.totalAlerts > queueQuery.data.rows.length ? (
        <div className="rounded-lg border border-border/70 bg-surface-2/55 px-3 py-2 text-xs text-muted-foreground">
          Showing the newest {queueQuery.data.rows.length} active alerts from a total registry size of {queueQuery.data.totalAlerts}.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterChips title="Decision Focus" chips={decisionFilters} active={filter} onChange={setFilter} />
        <p className="wb-subtle">{filteredRows.length} queue item(s)</p>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          title="No queue items in this view"
          description="No active alerts match the selected queue focus filter."
        />
      ) : (
        <DataGrid data={filteredRows} columns={columns} onRowClick={(row) => router.push(`/alerts/${row.alertId}`)} />
      )}
    </article>
  )
}
