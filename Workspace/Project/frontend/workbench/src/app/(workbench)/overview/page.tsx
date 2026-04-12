"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import type { V2AlertResponse } from "@/shared/api/schemas"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SimulatedBadge } from "@/shared/ui/state-panels"

const columns: ColumnDef<V2AlertResponse>[] = [
  {
    accessorKey: "title",
    header: "Alert",
    cell: ({ row }) => (
      <Link href={`/alerts/${row.original.id}`} className="text-xs font-medium text-foreground hover:underline">
        {row.original.title}
      </Link>
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
    accessorKey: "ownerUserId",
    header: "Owner",
  },
  {
    accessorKey: "updatedAtUtc",
    header: "Updated",
    cell: ({ row }) => new Date(row.original.updatedAtUtc).toLocaleString(),
  },
]

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
      <p className="wb-kicker">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export default function OverviewPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Overview unavailable" />
  }

  const alertsQuery = useWorkbenchQuery(
    ["overview", "alerts"],
    (signal) => gateway.listAlertRegistry({ page: 1, pageSize: 12 }, signal),
  )
  const serversQuery = useWorkbenchQuery(
    ["overview", "servers"],
    (signal) => gateway.listManagedServers({ page: 1, pageSize: 1 }, signal),
  )
  const reportsQuery = useWorkbenchQuery(
    ["overview", "reports"],
    (signal) => gateway.listReports({ page: 1, pageSize: 1 }, signal),
  )
  const detectionsQuery = useWorkbenchQuery(
    ["overview", "detections"],
    (signal) => gateway.listDetections({ page: 1, pageSize: 1 }, signal),
  )

  if (alertsQuery.isLoading) {
    return <LoadingState label="Loading overview" />
  }

  if (alertsQuery.isError || !alertsQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(alertsQuery.error)} fallbackTitle="Overview unavailable" />
  }

  const alerts = alertsQuery.data.items

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Overview</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Live posture across alerts, servers, detections, and reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview cards only show totals backed by current ASP.NET contracts. Recent alerts below come from the first live result page.
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
      </motion.header>

      <motion.article className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={panelMotion}>
        <MetricCard
          label="Indexed Alerts"
          value={String(alertsQuery.data.totalCount)}
          description="Current alert registry total."
        />
        <MetricCard
          label="Managed Servers"
          value={serversQuery.isSuccess ? String(serversQuery.data.totalServers) : "--"}
          description={serversQuery.isSuccess ? "Persisted server inventory." : "Server inventory temporarily unavailable."}
        />
        <MetricCard
          label="Detections"
          value={detectionsQuery.isSuccess ? String(detectionsQuery.data.total) : "--"}
          description={detectionsQuery.isSuccess ? "Indexed detection history." : "Detection history temporarily unavailable."}
        />
        <MetricCard
          label="Reports"
          value={reportsQuery.isSuccess ? String(reportsQuery.data.totalCount) : "--"}
          description={reportsQuery.isSuccess ? "Generated report artifacts." : "Reporting index temporarily unavailable."}
        />
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Recent Alerts</h3>
          <Link href="/alerts" className="text-xs text-primary hover:underline">
            Open alert registry
          </Link>
        </div>

        {alerts.length === 0 ? (
          <EmptyState title="No alerts available" description="Alerts will appear once telemetry intake produces persisted detections." />
        ) : (
          <DataGrid data={alerts} columns={columns} />
        )}
      </motion.article>
    </motion.section>
  )
}
