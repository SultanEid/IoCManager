"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import {
  CompactEmptyState,
  CompactErrorState,
  CompactLoadingState,
  LoadingState,
} from "@/shared/ui/state-panels"

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never"
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warning"
}) {
  const toneClassName =
    tone === "warning"
      ? "border-amber-300/35 bg-amber-500/10 text-amber-100"
      : "border-border/70 bg-surface-2/65 text-foreground"

  return (
    <div className={`rounded-lg border p-3 ${toneClassName}`}>
      <p className="wb-kicker">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export function ManagedServerDetailPage({ serverId }: { serverId: string }) {
  const [renderedAtMs] = useState(() => Date.now())
  const serverQuery = useWorkbenchQuery(
    ["servers", "detail", serverId],
    (signal) => gateway.getManagedServer(serverId, signal),
  )
  const subnetsQuery = useWorkbenchQuery(["servers", "detail", "subnets"], (signal) => gateway.listSubnets(signal))
  const alertsQuery = useWorkbenchQuery(
    ["servers", "detail", serverId, "alerts"],
    (signal) => gateway.listAlertRegistry({ serverId, page: 1, pageSize: 8 }, signal),
  )
  const detectionsQuery = useWorkbenchQuery(
    ["servers", "detail", serverId, "detections"],
    (signal) => gateway.listDetections({ serverId, page: 1, pageSize: 8 }, signal),
  )
  const reportsQuery = useWorkbenchQuery(
    ["servers", "detail", serverId, "reports"],
    (signal) => gateway.listReports({ serverId, page: 1, pageSize: 8 }, signal),
  )
  const groupsQuery = useWorkbenchQuery(
    ["servers", "detail", serverId, "groups"],
    async (signal) => {
      const groups = await gateway.listTargetGroups(signal)
      const memberships = await Promise.all(
        groups.map(async (group) => ({
          group,
          members: await gateway.listTargetGroupMembers(group.id, signal),
        })),
      )

      return memberships.filter((item) => item.members.some((member) => member.targetServerId === serverId))
    },
    { enabled: serverQuery.data !== undefined },
  )

  if (serverQuery.isLoading || subnetsQuery.isLoading) {
    return <LoadingState label="Loading server detail" />
  }

  if (serverQuery.isError || !serverQuery.data) {
    return (
      <ClassifiedFailureState
        failure={classifyUiError(serverQuery.error, { treat404AsMissingFeature: true })}
        fallbackTitle="Server detail unavailable"
      />
    )
  }

  if (subnetsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(subnetsQuery.error)} fallbackTitle="Server detail unavailable" />
  }

  const server = serverQuery.data
  const subnet = (subnetsQuery.data ?? []).find((item) => item.id === server.subnetId) ?? null
  const relatedAlerts = alertsQuery.data?.items ?? []
  const relatedDetections = detectionsQuery.data?.items ?? []
  const relatedReports = reportsQuery.data?.items ?? []
  const relatedGroups = groupsQuery.data ?? []
  const isContactStale = !server.lastContactUtc || renderedAtMs - Date.parse(server.lastContactUtc) > 72 * 60 * 60 * 1000

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Server Detail</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{server.hostname}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href="/servers" className="text-primary hover:underline">
                Back to inventory
              </Link>
              {" | "}
              {server.ipAddress}
              {" | "}
              {server.operatingSystem}
              {" | "}
              {server.environment}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <StatusBadge value={server.status} />
            <StatusBadge value={server.connectivityStatus} />
          </div>
        </div>
      </motion.header>

      <motion.article className="grid gap-3 md:grid-cols-4" variants={panelMotion}>
        <MetricCard label="Scanner Assignments" value={String(server.scannerAssignments.length)} />
        <MetricCard label="Related Groups" value={groupsQuery.isSuccess ? String(relatedGroups.length) : "--"} />
        <MetricCard label="Linked Alerts" value={alertsQuery.isSuccess ? String(alertsQuery.data.totalCount) : "--"} />
        <MetricCard
          label="Last Contact"
          value={server.lastContactUtc ? new Date(server.lastContactUtc).toLocaleDateString() : "Never"}
          tone={isContactStale ? "warning" : "default"}
        />
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-3">
            <div>
              <p className="wb-kicker">Identity</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3 text-sm">
                  <p className="wb-kicker">Subnet</p>
                  <p className="mt-1 font-medium">{subnet ? `${subnet.name} (${subnet.cidrBlock})` : server.subnetId}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3 text-sm">
                  <p className="wb-kicker">Secret Posture</p>
                  <p className="mt-1 font-medium">{server.hasConnectionSecret ? "Stored and encrypted" : "Not configured"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatTimestamp(server.connectionSecretUpdatedAtUtc)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="wb-kicker">Managed Connectivity</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3 text-sm">
                  <p className="font-medium">{server.connectionProtocol ?? "No remote protocol configured"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Host {server.connectionHost ?? "-"} | Port {server.connectionPort ?? "-"} | Auth {server.connectionAuthMode ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3 text-sm">
                  <p className="font-medium">Heartbeat {formatTimestamp(server.lastHeartbeatUtc)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Last contact {formatTimestamp(server.lastContactUtc)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-surface-2/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold tracking-tight">Assigned Scanners</p>
              <p className="text-xs text-muted-foreground">{server.scannerAssignments.length} row(s)</p>
            </div>
            {server.scannerAssignments.length === 0 ? (
              <CompactEmptyState label="No scanner assignments are persisted for this server." />
            ) : (
              server.scannerAssignments.map((assignment) => (
                <div key={assignment.scannerId} className="rounded-lg border border-border/70 bg-surface-1/85 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{assignment.scannerName}</p>
                    <StatusBadge value={assignment.connectivityStatus} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contact {formatTimestamp(assignment.lastContactUtc)} | Heartbeat {formatTimestamp(assignment.lastHeartbeatUtc)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {assignment.capabilities.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No capabilities</span>
                    ) : (
                      assignment.capabilities.map((capability) => (
                        <StatusBadge key={`${assignment.scannerId}-${capability}`} value={capability} />
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.article>

      <div className="grid gap-4 xl:grid-cols-2">
        <motion.article className="wb-panel" variants={panelMotion}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Group Membership</h3>
            {groupsQuery.isLoading ? <CompactLoadingState label="Resolving groups" /> : null}
          </div>
          <div className="mt-3">
            {groupsQuery.isError ? (
              <CompactErrorState label={classifyUiError(groupsQuery.error).message} />
            ) : relatedGroups.length === 0 ? (
              <CompactEmptyState label="This server is not attached to any persisted target group." />
            ) : (
              <div className="space-y-2">
                {relatedGroups.map((item) => (
                  <div key={item.group.id} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.group.name}</p>
                      <StatusBadge value={item.group.isEnabled ? "Enabled" : "Disabled"} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.group.description || "No group description provided."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.article>

        <motion.article className="wb-panel" variants={panelMotion}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Recent Alerts</h3>
            {alertsQuery.isLoading ? <CompactLoadingState label="Loading alerts" /> : null}
          </div>
          <div className="mt-3">
            {alertsQuery.isError ? (
              <CompactErrorState label={classifyUiError(alertsQuery.error).message} />
            ) : relatedAlerts.length === 0 ? (
              <CompactEmptyState label="No alert records are currently linked to this server." />
            ) : (
              <div className="space-y-2">
                {relatedAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/alerts/${alert.id}`} className="text-sm font-medium hover:underline">
                        {alert.title}
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge value={alert.severity} />
                        <StatusBadge value={alert.status} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Owner {alert.ownerUserId} | Updated {new Date(alert.updatedAtUtc).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.article>

        <motion.article className="wb-panel" variants={panelMotion}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Recent Detections</h3>
            {detectionsQuery.isLoading ? <CompactLoadingState label="Loading detections" /> : null}
          </div>
          <div className="mt-3">
            {detectionsQuery.isError ? (
              <CompactErrorState label={classifyUiError(detectionsQuery.error).message} />
            ) : relatedDetections.length === 0 ? (
              <CompactEmptyState label="No detection history is indexed for this server yet." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Disposition</TableHead>
                      <TableHead>Observed</TableHead>
                      <TableHead className="text-right">AI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedDetections.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ruleName ?? item.fingerprint.slice(0, 12)}</TableCell>
                        <TableCell>{item.scannerFamily}</TableCell>
                        <TableCell><StatusBadge value={item.disposition} /></TableCell>
                        <TableCell>{new Date(item.observedAtUtc).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/scans/${encodeURIComponent(item.id)}`}
                            className="text-xs font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
                          >
                            Open decision
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </motion.article>

        <motion.article className="wb-panel" variants={panelMotion}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Recent Reports</h3>
            {reportsQuery.isLoading ? <CompactLoadingState label="Loading reports" /> : null}
          </div>
          <div className="mt-3">
            {reportsQuery.isError ? (
              <CompactErrorState label={classifyUiError(reportsQuery.error).message} />
            ) : relatedReports.length === 0 ? (
              <CompactEmptyState label="No report artifacts currently reference this server." />
            ) : (
              <div className="space-y-2">
                {relatedReports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{report.title}</p>
                      <StatusBadge value={report.reportType} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generated {new Date(report.generatedAtUtc).toLocaleString()} | Linked alerts {report.alertIds.length}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.article>
      </div>
    </motion.section>
  )
}
