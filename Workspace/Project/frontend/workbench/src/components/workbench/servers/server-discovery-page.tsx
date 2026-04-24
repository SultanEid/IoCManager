"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessLeadActions } from "@/shared/auth/session"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"
import { validateDiscoveryRangeInput } from "@/shared/modules/server-discovery-validation"

function formatTimestamp(value: string | null) {
  if (!value) {
    return "N/A"
  }

  return new Date(value).toLocaleString()
}

function normalizeHostname(hostname: string, ipAddress: string) {
  const trimmed = hostname.trim()
  if (trimmed.length > 0) {
    return trimmed
  }

  return `srv-${ipAddress.replaceAll(".", "-")}`
}

export function ServerDiscoveryPage({ surface }: { surface: "servers" | "subnets" }) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const canPromote = canAccessLeadActions(session)
  const actorUserId = session?.userId ?? session?.username ?? "unknown-user"

  const [selectedSubnetId, setSelectedSubnetId] = useState("")
  const [rangeStartIp, setRangeStartIp] = useState("")
  const [rangeEndIp, setRangeEndIp] = useState("")
  const [promotionOperatingSystem, setPromotionOperatingSystem] = useState("Unknown")
  const [promotionEnvironment, setPromotionEnvironment] = useState("lab")

  const subnetsQuery = useWorkbenchQuery(["infrastructure", "subnets"], (signal) => gateway.listSubnets(signal))
  const subnets = useMemo(() => subnetsQuery.data ?? [], [subnetsQuery.data])
  const effectiveSubnetId = selectedSubnetId || subnets[0]?.id || ""

  const selectedSubnet = useMemo(
    () => subnets.find((subnet) => subnet.id === effectiveSubnetId) ?? null,
    [effectiveSubnetId, subnets],
  )

  const rangeValidation = useMemo(() => {
    if (!selectedSubnet) {
      return {
        valid: false,
        error: "Select a subnet to queue discovery.",
        normalizedRangeStartIp: null,
        normalizedRangeEndIp: null,
        totalHosts: 0,
      }
    }

    return validateDiscoveryRangeInput(selectedSubnet.cidrBlock, rangeStartIp, rangeEndIp, 256)
  }, [rangeEndIp, rangeStartIp, selectedSubnet])

  const runsQuery = useWorkbenchQuery(
    ["infrastructure", "discovery-runs", effectiveSubnetId],
    (signal) => (effectiveSubnetId ? gateway.listDiscoveryRuns(effectiveSubnetId, signal) : Promise.resolve([])),
    { refetchInterval: 2500 },
  )
  const hostsQuery = useWorkbenchQuery(
    ["infrastructure", "discovered-hosts", effectiveSubnetId],
    (signal) => (effectiveSubnetId ? gateway.listDiscoveredHosts(effectiveSubnetId, signal) : Promise.resolve([])),
    { refetchInterval: 2500 },
  )

  const queueMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubnet || !rangeValidation.valid) {
        throw new Error(rangeValidation.error ?? "Invalid discovery range.")
      }

      return gateway.queueDiscoveryRun({
        subnetId: selectedSubnet.id,
        actorUserId,
        rangeStartIp: rangeValidation.normalizedRangeStartIp ?? undefined,
        rangeEndIp: rangeValidation.normalizedRangeEndIp ?? undefined,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["infrastructure", "discovery-runs", effectiveSubnetId] }),
        queryClient.invalidateQueries({ queryKey: ["infrastructure", "discovered-hosts", effectiveSubnetId] }),
      ])
    },
  })

  const promoteMutation = useMutation({
    mutationFn: ({
      discoveredHostId,
      hostname,
    }: {
      discoveredHostId: string
      hostname: string
    }) =>
      gateway.promoteDiscoveredHost(discoveredHostId, {
        hostname,
        operatingSystem: promotionOperatingSystem.trim() || "Unknown",
        environment: promotionEnvironment.trim() || "lab",
        actorUserId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["infrastructure", "discovered-hosts", effectiveSubnetId] }),
        queryClient.invalidateQueries({ queryKey: ["infrastructure", "discovery-runs", effectiveSubnetId] }),
        queryClient.invalidateQueries({ queryKey: ["infrastructure", "target-servers", effectiveSubnetId] }),
      ])
    },
  })

  if (subnetsQuery.isLoading) {
    return <LoadingState label="Loading subnet inventory" />
  }

  if (subnetsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(subnetsQuery.error)} fallbackTitle="Server discovery unavailable" />
  }

  if (subnets.length === 0) {
    return (
      <EmptyState
        title="No subnets registered"
        description="Create at least one subnet before running lab discovery."
      />
    )
  }

  if (runsQuery.isLoading || hostsQuery.isLoading) {
    return <LoadingState label="Loading discovery state" />
  }

  if (runsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(runsQuery.error)} fallbackTitle="Server discovery unavailable" />
  }

  if (hostsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(hostsQuery.error)} fallbackTitle="Server discovery unavailable" />
  }

  const runs = runsQuery.data ?? []
  const hosts = hostsQuery.data ?? []
  const latestRun = runs[0] ?? null
  const hasRunHistory = runs.length > 0

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div>
          <p className="wb-kicker">{surface === "servers" ? "Servers" : "Subnets"}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Lab ICMP discovery</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Discovery results are shown only after real runs complete. No synthetic host data is displayed in normal mode.
          </p>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="wb-kicker">Subnet</span>
            <select
              value={effectiveSubnetId}
              onChange={(event) => setSelectedSubnetId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {subnets.map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name} ({subnet.cidrBlock})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Range start (optional)</span>
            <Input value={rangeStartIp} onChange={(event) => setRangeStartIp(event.target.value)} placeholder="10.10.1.10" />
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Range end (optional)</span>
            <Input value={rangeEndIp} onChange={(event) => setRangeEndIp(event.target.value)} placeholder="10.10.1.25" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Button type="button" onClick={() => queueMutation.mutate()} disabled={!rangeValidation.valid || queueMutation.isPending}>
            {queueMutation.isPending ? "Queueing..." : "Queue Discovery Run"}
          </Button>
          <span className="text-muted-foreground">Validated host count: {rangeValidation.totalHosts}</span>
          {!rangeValidation.valid ? <span className="text-destructive">{rangeValidation.error}</span> : null}
          {queueMutation.isError ? <span className="text-destructive">{classifyUiError(queueMutation.error).message}</span> : null}
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Latest discovery run</h3>
          {latestRun ? <StatusBadge value={latestRun.status} /> : null}
        </div>

        {!hasRunHistory ? (
          <EmptyState
            title="No discovery runs yet"
            description="Queue a run for the selected subnet to populate discovered host inventory."
          />
        ) : (
          <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3 text-sm">
            <p>
              <span className="wb-kicker">Requested CIDR</span> {latestRun.requestedCidr}
            </p>
            <p className="mt-1 text-muted-foreground">
              Queued {formatTimestamp(latestRun.queuedAtUtc)} | Started {formatTimestamp(latestRun.startedAtUtc)} | Completed{" "}
              {formatTimestamp(latestRun.completedAtUtc)}
            </p>
            <p className="mt-2">
              Reachable: <strong>{latestRun.reachableHosts}</strong> | Unreachable: <strong>{latestRun.unreachableHosts}</strong> | Total:{" "}
              <strong>{latestRun.totalHosts}</strong>
            </p>
            <p className="mt-1 text-muted-foreground">{latestRun.summary || "Run is queued or in progress."}</p>
          </div>
        )}
      </motion.article>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Discovered hosts</h3>
          <span className="text-xs text-muted-foreground">Hosts: {hosts.length}</span>
        </div>

        {canPromote ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="wb-kicker">Promotion OS</span>
              <Input value={promotionOperatingSystem} onChange={(event) => setPromotionOperatingSystem(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Promotion environment</span>
              <Input value={promotionEnvironment} onChange={(event) => setPromotionEnvironment(event.target.value)} />
            </label>
          </div>
        ) : null}

        {hosts.length === 0 ? (
          <EmptyState
            title="No discovered hosts"
            description={hasRunHistory ? "The latest run did not persist any host records yet." : "Discovered hosts appear after the first run."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Reachability</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Promotion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosts.map((host) => (
                  <TableRow key={host.id}>
                    <TableCell>{host.ipAddress}</TableCell>
                    <TableCell>{host.hostname || "N/A"}</TableCell>
                    <TableCell>
                      <StatusBadge value={host.reachability} />
                    </TableCell>
                    <TableCell>{formatTimestamp(host.lastSeenAtUtc)}</TableCell>
                    <TableCell>{formatTimestamp(host.lastCheckedAtUtc)}</TableCell>
                    <TableCell>
                      {host.promotedTargetServerId ? (
                        <StatusBadge value="Promoted" />
                      ) : canPromote ? (
                        <Button
                          type="button"
                          size="xs"
                          onClick={() =>
                            promoteMutation.mutate({
                              discoveredHostId: host.id,
                              hostname: normalizeHostname(host.hostname, host.ipAddress),
                            })
                          }
                          disabled={promoteMutation.isPending}
                        >
                          Promote
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Lead/Admin required</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {promoteMutation.isError ? (
          <p className="text-xs text-destructive">{classifyUiError(promoteMutation.error).message}</p>
        ) : null}
      </motion.article>
    </motion.section>
  )
}
