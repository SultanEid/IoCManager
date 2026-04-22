"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { Activity, AlertOctagon, FileText, Radar, ServerCog, Sparkles } from "lucide-react"
import { PowerBiVisualAnalyticsPanel } from "@/components/workbench/dashboard/power-bi-visual-analytics-panel"
import { StatusBadge } from "@/components/workbench/status-badge"
import type { V2AlertResponse } from "@/shared/api/schemas"
import { classifyUiError } from "@/shared/api/error-classification"
import { getLegacyOverviewSummary } from "@/shared/gateway/legacy-scan-pipeline"
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
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Radar
  label: string
  value: string
  description: string
}) {
  return (
    <div className="wb-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-surface-1/70 text-primary shadow-[var(--shadow-soft)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
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
  const summaryQuery = useWorkbenchQuery(["overview", "summary"], (signal) => getLegacyOverviewSummary(signal))

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="wb-kicker">Overview</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[var(--shadow-soft)]">
                <Radar className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Operational posture with live evidence and report output</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Current counts come from the working legacy evidence model, while the analytics surface below stays inside the main shell for a cleaner analyst workflow.
                </p>
              </div>
            </div>
          </div>
          <div className="wb-insight max-w-sm">
            <div className="mb-2 flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold tracking-tight">Posture Summary</p>
            </div>
            <p>
              The dashboard is now tied to persisted targets, normalized IOC detections, saved reports, and the live alert registry instead of the stale V2 placeholders.
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
      </motion.header>

      <motion.article className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={panelMotion}>
        <MetricCard
          icon={AlertOctagon}
          label="Indexed Alerts"
          value={summaryQuery.isSuccess ? String(summaryQuery.data.alertCount) : String(alertsQuery.data.totalCount)}
          description="Current alert registry total."
        />
        <MetricCard
          icon={ServerCog}
          label="Managed Targets"
          value={summaryQuery.isSuccess ? String(summaryQuery.data.targetCount) : "--"}
          description={summaryQuery.isSuccess ? "Discovered target inventory." : "Target inventory temporarily unavailable."}
        />
        <MetricCard
          icon={Activity}
          label="Detections"
          value={summaryQuery.isSuccess ? String(summaryQuery.data.iocCount) : "--"}
          description={summaryQuery.isSuccess ? "Normalized IOC findings." : "Detection history temporarily unavailable."}
        />
        <MetricCard
          icon={FileText}
          label="Reports"
          value={summaryQuery.isSuccess ? String(summaryQuery.data.reportCount) : "--"}
          description={summaryQuery.isSuccess ? "Generated report artifacts." : "Reporting index temporarily unavailable."}
        />
      </motion.article>

      <PowerBiVisualAnalyticsPanel />

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
