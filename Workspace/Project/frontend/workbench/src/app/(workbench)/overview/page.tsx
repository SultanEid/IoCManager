"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { CheckCircle2, Crosshair, FileText, ShieldAlert, ShieldCheck, Target, type LucideIcon } from "lucide-react"
import { alertCaseContext, alertCaseTitle, formatAlertOwner, formatAlertTimestamp } from "@/components/workbench/alert-case-format"
import { PowerBiVisualAnalyticsPanel } from "@/components/workbench/dashboard/power-bi-visual-analytics-panel"
import { StatusBadge } from "@/components/workbench/status-badge"
import type { V2AlertResponse } from "@/shared/api/schemas"
import { classifyUiError } from "@/shared/api/error-classification"
import { getLegacyOverviewSummary } from "@/shared/gateway/legacy-scan-pipeline"
import { gateway, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const columns: ColumnDef<V2AlertResponse>[] = [
  {
    accessorKey: "title",
    header: "Case",
    cell: ({ row }) => (
      <div>
        <Link href={`/alerts/${row.original.id}`} className="text-xs font-medium text-foreground hover:underline">
          {alertCaseTitle(row.original)}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{alertCaseContext(row.original)}</p>
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
    accessorKey: "ownerUserId",
    header: "Owner",
    cell: ({ row }) => formatAlertOwner(row.original.ownerUserId),
  },
  {
    accessorKey: "updatedAtUtc",
    header: "Updated",
    cell: ({ row }) => formatAlertTimestamp(row.original.updatedAtUtc),
  },
]

type EnvironmentStatusLevel = "healthy" | "watch" | "critical"

type SeverityLevel = "Critical" | "High" | "Medium" | "Low"

const severityLevels: SeverityLevel[] = ["Critical", "High", "Medium", "Low"]

const alertSeverityWeights: Record<SeverityLevel, number> = {
  Critical: 100,
  High: 35,
  Medium: 10,
  Low: 2,
}

const openAlertFactor = 1
const investigatingAlertFactor = 0.7

const severityTileTones: Record<SeverityLevel, { border: string; surface: string; text: string; rail: string }> = {
  Critical: {
    border: "border-rose-300/40",
    surface: "bg-rose-500/10",
    text: "text-rose-100",
    rail: "bg-rose-300",
  },
  High: {
    border: "border-orange-300/40",
    surface: "bg-orange-500/10",
    text: "text-orange-100",
    rail: "bg-orange-300",
  },
  Medium: {
    border: "border-amber-300/40",
    surface: "bg-amber-500/10",
    text: "text-amber-100",
    rail: "bg-amber-300",
  },
  Low: {
    border: "border-sky-300/35",
    surface: "bg-sky-500/10",
    text: "text-sky-100",
    rail: "bg-sky-300",
  },
}

const environmentStatusIconConfig = {
  healthy: {
    icon: ShieldCheck,
    frame: "border-emerald-300/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.16)]",
    surface: "bg-emerald-300/12",
  },
  watch: {
    icon: ShieldAlert,
    frame: "border-amber-300/40 bg-amber-500/10 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.18)]",
    surface: "bg-amber-300/12",
  },
  critical: {
    icon: ShieldAlert,
    frame: "border-rose-300/45 bg-rose-500/12 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.22)]",
    surface: "bg-rose-300/14",
  },
} as const

function isActiveAlert(status: string) {
  return getAlertStatusFactor(status) > 0
}

function getAlertStatusFactor(status: string) {
  const normalized = status.trim().toLowerCase().replace(/[\s_-]/g, "")
  if (normalized === "open") return openAlertFactor
  if (normalized === "investigating" || normalized === "inreview" || normalized === "awaitingapproval") {
    return investigatingAlertFactor
  }
  return 0
}

function severityRank(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return 4
    case "high":
      return 3
    case "medium":
      return 2
    case "low":
      return 1
    default:
      return 0
  }
}

function resolveEnvironmentStatus(alerts: V2AlertResponse[]) {
  const activeAlerts = alerts.filter((alert) => getAlertStatusFactor(alert.status) > 0)
  const activeSeverityCounts = severityLevels.reduce<Record<SeverityLevel, number>>(
    (counts, severity) => ({ ...counts, [severity]: 0 }),
    {} as Record<SeverityLevel, number>,
  )
  const riskScore = activeAlerts.reduce((score, alert) => {
    const severity = getSeverityLevel(alert.severity)
    activeSeverityCounts[severity] += 1
    return score + alertSeverityWeights[severity] * getAlertStatusFactor(alert.status)
  }, 0)
  const roundedScore = Math.round(riskScore)
  const activeCriticalCount = activeSeverityCounts.Critical
  const activeHighCount = activeSeverityCounts.High
  const activeMediumCount = activeSeverityCounts.Medium
  const activeLowCount = activeSeverityCounts.Low

  if (activeCriticalCount > 0) {
    return {
      level: "critical" as EnvironmentStatusLevel,
      label: "Security posture critical",
      detail: `Risk score ${roundedScore}: ${activeCriticalCount} active critical alert${activeCriticalCount === 1 ? "" : "s"}.`,
    }
  }

  if (riskScore >= 100 && (activeHighCount > 0 || activeMediumCount > 0)) {
    return {
      level: "critical" as EnvironmentStatusLevel,
      label: "Security posture critical",
      detail: `Risk score ${roundedScore}: active alert pressure crossed the critical threshold.`,
    }
  }

  if (activeHighCount > 0 || activeMediumCount > 0 || (riskScore >= 10 && activeLowCount === 0)) {
    const reason = activeHighCount > 0
      ? `${activeHighCount} active high-severity alert${activeHighCount === 1 ? "" : "s"}`
      : `${activeMediumCount} active medium-severity alert${activeMediumCount === 1 ? "" : "s"}`
    return {
      level: "watch" as EnvironmentStatusLevel,
      label: "Security posture on watch",
      detail: `Risk score ${roundedScore}: ${reason}.`,
    }
  }

  if (activeLowCount > 0) {
    return {
      level: "healthy" as EnvironmentStatusLevel,
      label: "Security posture healthy",
      detail: `Risk score ${roundedScore}: ${activeLowCount} active low-severity alert${activeLowCount === 1 ? "" : "s"} only.`,
    }
  }

  return {
    level: "healthy" as EnvironmentStatusLevel,
    label: "Security posture healthy",
    detail: "Risk score 0: no active alerts in the current environment view.",
  }
}

function EnvironmentStatusIcon({ level, label, detail }: { level: EnvironmentStatusLevel; label: string; detail: string }) {
  const config = environmentStatusIconConfig[level]
  const Icon = config.icon

  return (
    <div
      className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border ${config.frame} motion-safe:animate-pulse`}
      aria-label={`${label}. ${detail}`}
      role="img"
      title={`${label}: ${detail}`}
    >
      <span className={`absolute inset-1.5 rounded-xl ${config.surface}`} />
      <Icon className="relative h-5 w-5 drop-shadow-[0_0_7px_rgba(255,255,255,0.18)]" />
    </div>
  )
}

function getSeverityLevel(severity: string): SeverityLevel {
  return getSeverityLevelFromRank(severityRank(severity))
}

function getSeverityLevelFromRank(rank: number): SeverityLevel {
  if (rank >= 4) return "Critical"
  if (rank === 3) return "High"
  if (rank === 2) return "Medium"
  return "Low"
}

function getAlertOwnerLabel(alert: V2AlertResponse) {
  const ownerKey = alert.ownerUserId.trim().toLowerCase()
  if (!ownerKey || ownerKey === "unassigned") return "Unassigned"
  return alert.ownerDisplayName?.trim() || formatAlertOwner(alert.ownerUserId)
}

function sortByPriority(left: V2AlertResponse, right: V2AlertResponse) {
  const severityDelta = severityRank(right.severity) - severityRank(left.severity)
  if (severityDelta !== 0) return severityDelta
  return Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc)
}

function getScannerFamilyLabel(scannerFamily: string) {
  return scannerFamily.trim().toUpperCase() || "UNKNOWN"
}

function SecurityCommandPanel({
  alerts,
  totalAlertCount,
  targetCount,
  detectionCount,
  reportCount,
  environmentStatus,
}: {
  alerts: V2AlertResponse[]
  totalAlertCount: number
  targetCount: string
  detectionCount: string
  reportCount: string
  environmentStatus: ReturnType<typeof resolveEnvironmentStatus>
}) {
  const activeAlerts = alerts.filter((alert) => isActiveAlert(alert.status))
  const severityCounts = severityLevels.map((severity) => ({
    severity,
    count: activeAlerts.filter((alert) => getSeverityLevel(alert.severity) === severity).length,
  }))

  return (
    <motion.article className="wb-panel space-y-5" variants={panelMotion}>
      <div>
        <div>
          <p className="wb-kicker">Security Command</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Live posture and triage pressure</h3>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]">
        <div className="min-w-0 rounded-xl border border-border/70 bg-surface-1/75 p-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <EnvironmentStatusIcon level={environmentStatus.level} label={environmentStatus.label} detail={environmentStatus.detail} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{environmentStatus.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{environmentStatus.detail}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Only active alerts affect this status. Resolved cases do not keep the environment on watch.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {severityCounts.map((item) => {
            const tone = severityTileTones[item.severity]
            return (
              <div key={item.severity} className={`relative overflow-hidden rounded-xl border ${tone.border} ${tone.surface} p-3`}>
                <span className={`absolute inset-y-3 left-0 w-1 rounded-r ${tone.rail}`} aria-hidden="true" />
                <p className={`pl-1 text-[11px] uppercase tracking-[0.12em] ${tone.text}`}>{item.severity}</p>
                <p className="mt-1 pl-1 text-2xl font-semibold tracking-tight">{item.count}</p>
                <p className="pl-1 text-xs text-muted-foreground">Active alerts</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PressureTile icon={ShieldAlert} label="Indexed Cases" value={String(totalAlertCount)} detail="Alert registry" />
        <PressureTile icon={Target} label="Targets" value={targetCount} detail="Managed assets" />
        <PressureTile icon={Crosshair} label="Detections" value={detectionCount} detail="IOC history" />
        <PressureTile icon={FileText} label="Reports" value={reportCount} detail="Generated artifacts" />
      </div>
    </motion.article>
  )
}

function PressureTile({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-1/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function NextActionsPanel({ alerts }: { alerts: V2AlertResponse[] }) {
  const activeAlerts = alerts.filter((alert) => isActiveAlert(alert.status)).sort(sortByPriority).slice(0, 5)

  return (
    <motion.article className="wb-panel space-y-4" variants={panelMotion}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="wb-kicker">Next Actions</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">Highest-priority active cases</h3>
        </div>
        <span className="wb-chip">{activeAlerts.length} shown</span>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">No active alerts need triage.</p>
            <p className="mt-1 text-sm text-emerald-100/75">The current alert queue is resolved. New detections will appear here first.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <Link
              key={alert.id}
              href={`/alerts/${alert.id}`}
              className="block rounded-xl border border-border/70 bg-surface-1/75 p-3 transition-colors hover:border-primary/40 hover:bg-surface-2/65"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold">{alertCaseTitle(alert)}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{alert.targetDisplay}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge value={alert.severity} />
                  <StatusBadge value={alert.status} />
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>Owner: {getAlertOwnerLabel(alert)}</span>
                <span>Scanner: {getScannerFamilyLabel(alert.scannerFamily)}</span>
                <span>Updated: {formatAlertTimestamp(alert.updatedAtUtc)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.article>
  )
}

function SocSidePanel({ alerts }: { alerts: V2AlertResponse[] }) {
  const activeAlerts = alerts.filter((alert) => isActiveAlert(alert.status))
  const targetRows = Object.values(
    activeAlerts.reduce<Record<string, { target: string; count: number; highestSeverity: number }>>((groups, alert) => {
      const target = alert.targetDisplay.trim() || "Unscoped target"
      const current = groups[target] ?? { target, count: 0, highestSeverity: 0 }
      current.count += 1
      current.highestSeverity = Math.max(current.highestSeverity, severityRank(alert.severity))
      groups[target] = current
      return groups
    }, {}),
  )
    .sort((left, right) => right.highestSeverity - left.highestSeverity || right.count - left.count)
    .slice(0, 4)

  const scannerRows = Object.values(
    alerts.reduce<Record<string, { family: string; active: number; resolved: number }>>((groups, alert) => {
      const family = getScannerFamilyLabel(alert.scannerFamily)
      const current = groups[family] ?? { family, active: 0, resolved: 0 }
      if (isActiveAlert(alert.status)) current.active += 1
      else current.resolved += 1
      groups[family] = current
      return groups
    }, {}),
  ).sort((left, right) => right.active - left.active || right.resolved - left.resolved || left.family.localeCompare(right.family))

  return (
    <motion.article className="wb-panel space-y-5" variants={panelMotion}>
      <section>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="wb-kicker">Affected Assets</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Top active targets</h3>
          </div>
          <Target className="h-4 w-4 text-primary" />
        </div>
        {targetRows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border/70 bg-surface-1/70 p-3 text-sm text-muted-foreground">No active targets under alert pressure.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {targetRows.map((row) => (
              <div key={row.target} className="rounded-xl border border-border/70 bg-surface-1/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium">{row.target}</p>
                  <span className="wb-chip">{row.count}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Highest severity: {getSeverityLevelFromRank(row.highestSeverity)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="wb-kicker">Detection Mix</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Scanner family pressure</h3>
          </div>
          <Crosshair className="h-4 w-4 text-primary" />
        </div>
        {scannerRows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border/70 bg-surface-1/70 p-3 text-sm text-muted-foreground">No scanner detections are indexed yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {scannerRows.map((row) => {
              const total = row.active + row.resolved
              const activePercent = total === 0 ? 0 : Math.round((row.active / total) * 100)
              return (
                <div key={row.family} className="rounded-xl border border-border/70 bg-surface-1/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{row.family}</p>
                    <p className="text-xs text-muted-foreground">{row.active} active / {row.resolved} resolved</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${activePercent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </motion.article>
  )
}

export default function OverviewPage() {
  const alertsQuery = useWorkbenchQuery(
    ["overview", "alerts"],
    (signal) => gateway.listAlertRegistry({ page: 1, pageSize: 100 }, signal),
    { enabled: isModeConfigured },
  )
  const summaryQuery = useWorkbenchQuery(["overview", "summary"], (signal) => getLegacyOverviewSummary(signal), {
    enabled: isModeConfigured,
  })

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Overview unavailable" />
  }

  if (alertsQuery.isLoading) {
    return <LoadingState label="Loading overview" />
  }

  if (alertsQuery.isError || !alertsQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(alertsQuery.error)} fallbackTitle="Overview unavailable" />
  }

  const alerts = alertsQuery.data.items
  const environmentStatus = resolveEnvironmentStatus(alerts)
  const targetCount = summaryQuery.isSuccess ? String(summaryQuery.data.targetCount) : "--"
  const detectionCount = summaryQuery.isSuccess ? String(summaryQuery.data.iocCount) : "--"
  const reportCount = summaryQuery.isSuccess ? String(summaryQuery.data.reportCount) : "--"

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="max-w-3xl">
          <p className="wb-kicker">Overview</p>
          <div className="mt-3 flex items-start gap-3">
            <EnvironmentStatusIcon level={environmentStatus.level} label={environmentStatus.label} detail={environmentStatus.detail} />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Security posture</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor alert pressure, detection coverage, reporting activity, and recent investigation work from one workspace.
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <SecurityCommandPanel
        alerts={alerts}
        totalAlertCount={summaryQuery.isSuccess ? summaryQuery.data.alertCount : alertsQuery.data.totalCount}
        targetCount={targetCount}
        detectionCount={detectionCount}
        reportCount={reportCount}
        environmentStatus={environmentStatus}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <NextActionsPanel alerts={alerts} />
        <SocSidePanel alerts={alerts} />
      </div>

      <PowerBiVisualAnalyticsPanel />

      <motion.article className="wb-panel" variants={panelMotion}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Recent Case Activity</h3>
          <Link href="/alerts" className="text-xs text-primary hover:underline">
            Open cases
          </Link>
        </div>

        {alerts.length === 0 ? (
          <EmptyState title="No cases available" description="Investigation cases will appear once telemetry intake produces persisted detections." />
        ) : (
          <DataGrid
            data={alerts.slice(0, 12)}
            columns={columns}
          />
        )}
      </motion.article>
    </motion.section>
  )
}
