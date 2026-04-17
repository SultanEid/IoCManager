"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Timeline } from "@/components/workbench/timeline"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import {
  deriveServerRiskSummary,
  findServerById,
  getOperationsVm,
  resolveSubnet,
} from "@/shared/modules/operations-foundation"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { ErrorState } from "@/shared/ui/state-panels"

type OperationsServerDetailPageProps = {
  serverId: string
}

export function OperationsServerDetailPage({ serverId }: OperationsServerDetailPageProps) {
  const vm = getOperationsVm()
  const server = findServerById(vm.servers, serverId)
  if (!server) {
    return <ErrorState title="Server Not Found" description="Requested server does not exist in the current operations snapshot." />
  }

  const subnet = resolveSubnet(vm.subnets, server.subnetId)
  const detail = vm.serverDetailsById[server.id] ?? null
  const riskSummary = deriveServerRiskSummary(server, detail)
  const timelineEvents = (detail?.timeline ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: `${item.source} - ${item.detail}`,
    when: item.whenUtc,
    tone: item.tone,
  }))
  const deploymentSummary = detail?.deploymentSummary ?? {
    stage: server.deploymentStatus,
    lastChangeUtc: server.updatedAtUtc,
    note: "Deployment summary inherited from server posture.",
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header space-y-3" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="wb-kicker">Server Detail</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{server.hostname}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {server.ipv4} - {server.os} - {server.ownerTeam}
            </p>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/servers">Back To Inventory</Link>}>
            Back to inventory
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={server.environment} />
          <StatusBadge value={server.criticality} />
          <StatusBadge value={server.health} />
          <StatusBadge value={server.telemetryStatus} />
          <StatusBadge value={server.scannerCoverage} />
          <StatusBadge value={server.riskSeverity} />
        </div>
      </motion.header>

      <motion.article className="wb-panel-muted grid gap-3 md:grid-cols-2 xl:grid-cols-4" variants={panelMotion}>
        <div className="rounded-lg border border-border/70 bg-surface-1/75 p-3">
          <p className="wb-kicker">Subnet</p>
          <p className="mt-1 text-sm font-semibold">{subnet?.name ?? server.subnetId}</p>
          <p className="text-xs text-muted-foreground">{subnet?.cidr ?? "Unknown CIDR"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-1/75 p-3">
          <p className="wb-kicker">Risk Score</p>
          <p className="mt-1 text-sm font-semibold">{riskSummary.score}</p>
          <p className="text-xs text-muted-foreground">{riskSummary.severity} severity</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-1/75 p-3">
          <p className="wb-kicker">Deployment Status</p>
          <p className="mt-1 text-sm font-semibold">{deploymentSummary.stage}</p>
          <p className="text-xs text-muted-foreground">{new Date(deploymentSummary.lastChangeUtc).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-1/75 p-3">
          <p className="wb-kicker">Scanner Assignments</p>
          <p className="mt-1 text-sm font-semibold">{server.scannerAssignments.length}</p>
          <p className="text-xs text-muted-foreground">Last heartbeat {new Date(server.lastHeartbeatUtc).toLocaleString()}</p>
        </div>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <section>
            <p className="wb-kicker">Timeline</p>
            {timelineEvents.length > 0 ? (
              <div className="mt-2">
                <Timeline events={timelineEvents} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No timeline events recorded yet for this server.</p>
            )}
          </section>

          <section className="space-y-3">
            <article className="rounded-lg border border-border/70 bg-surface-2/70 p-3">
              <p className="wb-kicker">Risk Summary</p>
              <p className="mt-1 text-xs text-muted-foreground">{riskSummary.recommendation}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {riskSummary.drivers.map((driver) => (
                  <li key={driver.label}>
                    {driver.label}: <span className="text-foreground">{driver.value}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-border/70 bg-surface-2/70 p-3">
              <p className="wb-kicker">Deployment Notes</p>
              <p className="mt-1 text-xs text-muted-foreground">{deploymentSummary.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(deploymentSummary.lastChangeUtc).toLocaleString()}
              </p>
            </article>
          </section>
        </div>
      </motion.article>

      <motion.article className="wb-panel grid gap-3 xl:grid-cols-2" variants={panelMotion}>
        <article className="rounded-lg border border-border/70 bg-surface-2/70 p-3">
          <p className="wb-kicker">Linked Rules</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {server.linkedRules.map((rule) => (
              <li key={rule.id}>
                {rule.id}: <span className="text-foreground">{rule.title}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-border/70 bg-surface-2/70 p-3">
          <p className="wb-kicker">Linked Detections / Alerts</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {server.linkedDetections.map((detection) => (
              <li key={detection.id}>
                Detection {detection.id}: <span className="text-foreground">{detection.title}</span>
              </li>
            ))}
            {server.linkedCases.map((caseRef) => (
              <li key={caseRef.id}>
                Alert {caseRef.id}: <span className="text-foreground">{caseRef.title}</span>
              </li>
            ))}
          </ul>
        </article>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <p className="wb-kicker">Scanner History</p>
        <div className="mt-2 space-y-2">
          {(detail?.scannerHistory ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No scanner history recorded for this host.</p>
          ) : (
            detail?.scannerHistory.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 bg-surface-2/70 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {item.scannerName} - {item.outcome}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(item.whenUtc).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </div>
            ))
          )}
        </div>
      </motion.article>
    </motion.section>
  )
}
