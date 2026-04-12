"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  buildScannerCoverageRollup,
  buildSubnetRollups,
  getOperationsVm,
  groupServersBy,
  OPERATIONS_SUBPAGES,
} from "@/shared/modules/operations-foundation"
import type {
  OperationsSubpageKey,
  RiskSeverity,
  ScannerCoverageStatus,
  Server,
  ServerCriticality,
  ServerEnvironment,
  ServerGroupBy,
  ServerHealthStatus,
  Subnet,
  TelemetryStatus,
} from "@/shared/modules/types"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState } from "@/shared/ui/state-panels"

const GROUP_OPTIONS: Array<{ key: ServerGroupBy; label: string }> = [
  { key: "subnet", label: "Subnet" },
  { key: "environment", label: "Environment" },
  { key: "criticality", label: "Criticality" },
]

type OperationsModulePageProps = {
  subpageKey: OperationsSubpageKey
}

type ServerDraft = {
  hostname: string
  ipv4: string
  os: string
  ownerTeam: string
  subnetId: string
  environment: ServerEnvironment
  criticality: ServerCriticality
  health: ServerHealthStatus
  telemetryStatus: TelemetryStatus
  scannerCoverage: ScannerCoverageStatus
  riskSeverity: RiskSeverity
}

type SubnetDraft = {
  name: string
  cidr: string
  gateway: string
  zone: "DMZ" | "Core" | "Cloud Edge" | "OT"
  environment: ServerEnvironment
  capacity: string
}

function toId(prefix: string, value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return `${prefix}-${normalized}`
}

function buildDefaultServerDraft(subnetId: string): ServerDraft {
  return {
    hostname: "",
    ipv4: "",
    os: "Ubuntu 24.04 LTS",
    ownerTeam: "",
    subnetId,
    environment: "Production",
    criticality: "Business Critical",
    health: "Healthy",
    telemetryStatus: "Healthy",
    scannerCoverage: "Partial",
    riskSeverity: "Medium",
  }
}

function buildDefaultSubnetDraft(): SubnetDraft {
  return {
    name: "",
    cidr: "",
    gateway: "",
    zone: "DMZ",
    environment: "Production",
    capacity: "120",
  }
}

function hasServerFormErrors(draft: ServerDraft) {
  return !draft.hostname.trim() || !draft.ipv4.trim() || !draft.ownerTeam.trim() || !draft.subnetId
}

function hasSubnetFormErrors(draft: SubnetDraft) {
  return !draft.name.trim() || !draft.cidr.trim() || !draft.gateway.trim() || Number.isNaN(Number(draft.capacity))
}

function environmentTint(value: number) {
  if (value >= 80) return "text-rose-200"
  if (value >= 60) return "text-amber-200"
  return "text-emerald-200"
}

export function OperationsModulePage({ subpageKey }: OperationsModulePageProps) {
  const vm = useMemo(() => getOperationsVm(), [])
  const [servers, setServers] = useState(vm.servers)
  const [subnets, setSubnets] = useState(vm.subnets)
  const [scannerFleet, setScannerFleet] = useState(vm.scannerFleet)
  const [assetGroups] = useState(vm.assetGroups)
  const [groupBy, setGroupBy] = useState<ServerGroupBy>(vm.defaults.groupBy)

  const [addServerOpen, setAddServerOpen] = useState(false)
  const [editServerId, setEditServerId] = useState<string | null>(null)
  const [addSubnetOpen, setAddSubnetOpen] = useState(false)
  const [removeSubnetId, setRemoveSubnetId] = useState<string | null>(null)

  const [serverDraft, setServerDraft] = useState<ServerDraft>(() => buildDefaultServerDraft(vm.subnets[0]?.id ?? ""))
  const [editDraft, setEditDraft] = useState<ServerDraft>(() => buildDefaultServerDraft(vm.subnets[0]?.id ?? ""))
  const [subnetDraft, setSubnetDraft] = useState<SubnetDraft>(() => buildDefaultSubnetDraft())
  const [reassignSubnetId, setReassignSubnetId] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const copy = OPERATIONS_SUBPAGES.find((item) => item.key === subpageKey) ?? OPERATIONS_SUBPAGES[0]
  const groupedServers = useMemo(() => groupServersBy(servers, subnets, groupBy), [servers, subnets, groupBy])
  const subnetRollups = useMemo(() => buildSubnetRollups(servers, subnets), [servers, subnets])
  const coverage = useMemo(() => buildScannerCoverageRollup(servers), [servers])
  const editServer = useMemo(() => servers.find((item) => item.id === editServerId) ?? null, [servers, editServerId])
  const removeSubnet = useMemo(() => subnets.find((item) => item.id === removeSubnetId) ?? null, [subnets, removeSubnetId])
  const attachedServers = useMemo(
    () => (removeSubnet ? servers.filter((server) => server.subnetId === removeSubnet.id) : []),
    [removeSubnet, servers],
  )
  const unhealthyCount = servers.filter((item) => item.health !== "Healthy").length
  const telemetryGaps = servers.filter((item) => item.telemetryStatus !== "Healthy").length
  const criticalCount = servers.filter((item) => item.criticality === "Mission Critical").length

  function openEdit(server: Server) {
    setEditServerId(server.id)
    setEditDraft({
      hostname: server.hostname,
      ipv4: server.ipv4,
      os: server.os,
      ownerTeam: server.ownerTeam,
      subnetId: server.subnetId,
      environment: server.environment,
      criticality: server.criticality,
      health: server.health,
      telemetryStatus: server.telemetryStatus,
      scannerCoverage: server.scannerCoverage,
      riskSeverity: server.riskSeverity,
    })
    setMessage(null)
  }

  function submitAddServer() {
    if (hasServerFormErrors(serverDraft)) {
      setMessage("Add server failed: hostname, IP, owner team, and subnet are required.")
      return
    }
    const nextServer: Server = {
      id: toId("srv", serverDraft.hostname),
      hostname: serverDraft.hostname.trim(),
      ipv4: serverDraft.ipv4.trim(),
      os: serverDraft.os.trim(),
      ownerTeam: serverDraft.ownerTeam.trim(),
      subnetId: serverDraft.subnetId,
      environment: serverDraft.environment,
      criticality: serverDraft.criticality,
      health: serverDraft.health,
      telemetryStatus: serverDraft.telemetryStatus,
      scannerCoverage: serverDraft.scannerCoverage,
      deploymentStatus: "Pending",
      riskSeverity: serverDraft.riskSeverity,
      linkedDetections: [{ id: "DET-7701", title: "Operational baseline anomaly" }],
      linkedCases: [{ id: "CA-4601", title: "Infrastructure posture watch" }],
      linkedRules: [{ id: "SIG-2041", title: "PowerShell Credential Artifact Sweep" }],
      scannerAssignments: [],
      lastHeartbeatUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    }
    setServers((current) => [nextServer, ...current])
    setServerDraft(buildDefaultServerDraft(serverDraft.subnetId))
    setAddServerOpen(false)
    setMessage("Server added to inventory.")
  }

  function submitEditServer() {
    if (!editServer) return
    if (hasServerFormErrors(editDraft)) {
      setMessage("Edit server failed: hostname, IP, owner team, and subnet are required.")
      return
    }
    setServers((current) =>
      current.map((server) =>
        server.id === editServer.id
          ? {
              ...server,
              hostname: editDraft.hostname.trim(),
              ipv4: editDraft.ipv4.trim(),
              os: editDraft.os.trim(),
              ownerTeam: editDraft.ownerTeam.trim(),
              subnetId: editDraft.subnetId,
              environment: editDraft.environment,
              criticality: editDraft.criticality,
              health: editDraft.health,
              telemetryStatus: editDraft.telemetryStatus,
              scannerCoverage: editDraft.scannerCoverage,
              riskSeverity: editDraft.riskSeverity,
              updatedAtUtc: new Date().toISOString(),
            }
          : server,
      ),
    )
    setEditServerId(null)
    setMessage("Server updated.")
  }

  function submitAddSubnet() {
    if (hasSubnetFormErrors(subnetDraft)) {
      setMessage("Add subnet failed: name, CIDR, gateway, and numeric capacity are required.")
      return
    }
    const nextSubnet: Subnet = {
      id: toId("snet", subnetDraft.name),
      name: subnetDraft.name.trim(),
      cidr: subnetDraft.cidr.trim(),
      gateway: subnetDraft.gateway.trim(),
      zone: subnetDraft.zone,
      environment: subnetDraft.environment,
      capacity: Number(subnetDraft.capacity),
      utilizationPercent: 0,
      scannerCoverage: subnetDraft.environment === "Production" ? "Partial" : "None",
      health: subnetDraft.environment === "Development" ? "Degraded" : "Healthy",
      notes: "New subnet pending scanner assignment.",
    }
    setSubnets((current) => [nextSubnet, ...current])
    setSubnetDraft(buildDefaultSubnetDraft())
    setAddSubnetOpen(false)
    setMessage("Subnet added.")
  }

  function submitRemoveSubnet() {
    if (!removeSubnet) return
    if (attachedServers.length > 0 && !reassignSubnetId) {
      setMessage("Subnet removal blocked: reassign attached servers first.")
      return
    }
    setServers((current) =>
      current.map((server) =>
        server.subnetId === removeSubnet.id && reassignSubnetId
          ? { ...server, subnetId: reassignSubnetId, updatedAtUtc: new Date().toISOString() }
          : server,
      ),
    )
    setSubnets((current) => current.filter((subnet) => subnet.id !== removeSubnet.id))
    setScannerFleet((current) =>
      current.map((scanner) => ({
        ...scanner,
        assignedSubnetIds: scanner.assignedSubnetIds.filter((id) => id !== removeSubnet.id),
      })),
    )
    setRemoveSubnetId(null)
    setReassignSubnetId("")
    setMessage("Subnet removed and attached servers reassigned.")
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header space-y-3" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Infrastructure Operations</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{copy.title}</h1>
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <p className="rounded-full border border-border/70 bg-surface-2/70 px-3 py-1 text-[11px] text-muted-foreground">
            Snapshot {new Date(vm.generatedAtUtc).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 p-1.5">
          {OPERATIONS_SUBPAGES.map((page) => (
            <Link
              key={page.key}
              href={page.href}
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors",
                page.key === subpageKey
                  ? "border-primary/45 bg-primary/14 text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/75 hover:bg-surface-1/80 hover:text-foreground",
              )}
            >
              {page.label}
            </Link>
          ))}
        </div>
      </motion.header>

      {message ? (
        <motion.article className="wb-panel-muted" variants={panelMotion}>
          <p className="text-xs text-muted-foreground">{message}</p>
        </motion.article>
      ) : null}

      {subpageKey === "inventory" ? (
        <motion.article className="wb-panel space-y-3" variants={panelMotion}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Servers</p><p className="mt-1 text-lg font-semibold">{servers.length}</p></div>
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Mission Critical</p><p className="mt-1 text-lg font-semibold">{criticalCount}</p></div>
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Health Alerts</p><p className="mt-1 text-lg font-semibold text-rose-200">{unhealthyCount}</p></div>
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Coverage</p><p className="mt-1 text-lg font-semibold">{coverage.fullCoverageCount}/{coverage.totalServers} full</p><p className="text-xs text-muted-foreground">{coverage.partialCoverageCount} partial - {coverage.noCoverageCount} none</p></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {GROUP_OPTIONS.map((option) => <Button key={option.key} size="xs" variant={groupBy === option.key ? "secondary" : "outline"} onClick={() => setGroupBy(option.key)}>Group by {option.label}</Button>)}
            </div>
            <Sheet open={addServerOpen} onOpenChange={setAddServerOpen}>
              <SheetTrigger render={<Button size="sm" variant="outline">Add Server</Button>} />
              <SheetContent side="right" className="w-full max-w-md border-border bg-surface-1">
                <SheetHeader><SheetTitle>Add Server</SheetTitle><SheetDescription>Register server in inventory.</SheetDescription></SheetHeader>
                <div className="space-y-2 px-4 pb-4 text-xs">
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="Hostname" value={serverDraft.hostname} onChange={(event) => setServerDraft((current) => ({ ...current, hostname: event.target.value }))} />
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="IPv4" value={serverDraft.ipv4} onChange={(event) => setServerDraft((current) => ({ ...current, ipv4: event.target.value }))} />
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="Owner Team" value={serverDraft.ownerTeam} onChange={(event) => setServerDraft((current) => ({ ...current, ownerTeam: event.target.value }))} />
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="OS" value={serverDraft.os} onChange={(event) => setServerDraft((current) => ({ ...current, os: event.target.value }))} />
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.subnetId} onChange={(event) => setServerDraft((current) => ({ ...current, subnetId: event.target.value }))}>{subnets.map((subnet) => <option key={subnet.id} value={subnet.id}>{subnet.name}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.environment} onChange={(event) => setServerDraft((current) => ({ ...current, environment: event.target.value as ServerEnvironment }))}>{["Production", "Staging", "Development"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.criticality} onChange={(event) => setServerDraft((current) => ({ ...current, criticality: event.target.value as ServerCriticality }))}>{["Mission Critical", "Business Critical", "Standard"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.health} onChange={(event) => setServerDraft((current) => ({ ...current, health: event.target.value as ServerHealthStatus }))}>{["Healthy", "Degraded", "Unreachable"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.telemetryStatus} onChange={(event) => setServerDraft((current) => ({ ...current, telemetryStatus: event.target.value as TelemetryStatus }))}>{["Healthy", "Delayed", "Missing"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.scannerCoverage} onChange={(event) => setServerDraft((current) => ({ ...current, scannerCoverage: event.target.value as ScannerCoverageStatus }))}>{["Full", "Partial", "None"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={serverDraft.riskSeverity} onChange={(event) => setServerDraft((current) => ({ ...current, riskSeverity: event.target.value as RiskSeverity }))}>{["Critical", "High", "Medium", "Low"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setAddServerOpen(false)}>Cancel</Button><Button size="sm" onClick={submitAddServer}>Add</Button></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {groupedServers.length === 0 ? <EmptyState title="No servers" description="Add a server to start monitoring posture." /> : groupedServers.map((group) => (
            <div key={group.key} className="rounded-xl border border-border/70 bg-surface-2/55">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2"><p className="text-sm font-semibold">{group.label}</p><p className="text-xs text-muted-foreground">{group.servers.length} server(s)</p></div>
              <div className="divide-y divide-border/50">
                {group.servers.map((server) => (
                  <div key={server.id} className="grid gap-2 px-3 py-2.5 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                    <div><p className="text-sm font-medium">{server.hostname}</p><p className="text-xs text-muted-foreground">{server.ipv4} - {server.os}</p><p className="text-xs text-muted-foreground">{server.ownerTeam}</p></div>
                    <div className="space-y-1"><StatusBadge value={server.health} /><StatusBadge value={server.telemetryStatus} /></div>
                    <div className="space-y-1"><StatusBadge value={server.scannerCoverage} /><StatusBadge value={server.riskSeverity} /></div>
                    <div className="text-xs text-muted-foreground"><p>{server.linkedDetections.length} detections</p><p>{server.linkedCases.length} alerts</p><p>{server.linkedRules.length} rules</p></div>
                    <div className="flex items-start gap-1"><Button size="xs" variant="outline" onClick={() => openEdit(server)}>Edit</Button><Button size="xs" variant="outline" render={<Link href={`/servers/servers/${server.id}`} />}>Detail</Button></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.article>
      ) : null}

      {subpageKey === "subnets" ? (
        <motion.article className="wb-panel space-y-3" variants={panelMotion}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Subnet Registry</p>
            <Sheet open={addSubnetOpen} onOpenChange={setAddSubnetOpen}>
              <SheetTrigger render={<Button size="sm" variant="outline">Add Subnet</Button>} />
              <SheetContent side="right" className="w-full max-w-md border-border bg-surface-1">
                <SheetHeader><SheetTitle>Add Subnet</SheetTitle><SheetDescription>Register subnet for server placement.</SheetDescription></SheetHeader>
                <div className="space-y-2 px-4 pb-4 text-xs">
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="Name" value={subnetDraft.name} onChange={(event) => setSubnetDraft((current) => ({ ...current, name: event.target.value }))} />
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="CIDR" value={subnetDraft.cidr} onChange={(event) => setSubnetDraft((current) => ({ ...current, cidr: event.target.value }))} />
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="Gateway" value={subnetDraft.gateway} onChange={(event) => setSubnetDraft((current) => ({ ...current, gateway: event.target.value }))} />
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={subnetDraft.zone} onChange={(event) => setSubnetDraft((current) => ({ ...current, zone: event.target.value as SubnetDraft["zone"] }))}>{["DMZ", "Core", "Cloud Edge", "OT"].map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select>
                  <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={subnetDraft.environment} onChange={(event) => setSubnetDraft((current) => ({ ...current, environment: event.target.value as ServerEnvironment }))}>{["Production", "Staging", "Development"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" placeholder="Capacity" value={subnetDraft.capacity} onChange={(event) => setSubnetDraft((current) => ({ ...current, capacity: event.target.value }))} />
                  <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setAddSubnetOpen(false)}>Cancel</Button><Button size="sm" onClick={submitAddSubnet}>Add</Button></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {subnets.map((subnet) => {
              const rollup = subnetRollups[subnet.id]
              const reassignOptions = subnets.filter((item) => item.id !== subnet.id)
              return (
                <article key={subnet.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-3">
                  <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{subnet.name}</p><p className="text-xs text-muted-foreground">{subnet.cidr} - {subnet.gateway}</p></div><StatusBadge value={subnet.health} /></div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><p>Zone: {subnet.zone}</p><p>Env: {subnet.environment}</p><p>Servers: {rollup?.serverCount ?? 0}</p><p>Capacity: {subnet.capacity}</p><p className={environmentTint(subnet.utilizationPercent)}>Utilization: {subnet.utilizationPercent}%</p><p>Coverage: {subnet.scannerCoverage}</p></div>
                  <p className="mt-1 text-xs text-muted-foreground">{subnet.notes}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">{rollup?.missionCriticalCount ?? 0} mission critical - {rollup?.telemetryMissingCount ?? 0} telemetry missing</p>
                    <Sheet open={removeSubnetId === subnet.id} onOpenChange={(open) => { setRemoveSubnetId(open ? subnet.id : null); setReassignSubnetId(reassignOptions[0]?.id ?? ""); }}>
                      <SheetTrigger render={<Button size="xs" variant="outline">Remove</Button>} />
                      <SheetContent side="right" className="w-full max-w-sm border-border bg-surface-1">
                        <SheetHeader><SheetTitle>Remove Subnet</SheetTitle><SheetDescription>Reassign attached servers before removal.</SheetDescription></SheetHeader>
                        <div className="space-y-3 px-4 pb-4 text-xs">
                          <p className="rounded-lg border border-amber-300/35 bg-amber-500/10 p-2 text-amber-100">Attached servers: {servers.filter((server) => server.subnetId === subnet.id).length}</p>
                          {servers.filter((server) => server.subnetId === subnet.id).length > 0 ? <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={reassignSubnetId} onChange={(event) => setReassignSubnetId(event.target.value)}>{reassignOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select> : null}
                          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setRemoveSubnetId(null)}>Cancel</Button><Button size="sm" onClick={submitRemoveSubnet}>Confirm</Button></div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </article>
              )
            })}
          </div>
        </motion.article>
      ) : null}

      {subpageKey === "asset-groups" ? (
        <motion.article className="wb-panel grid gap-3 md:grid-cols-2" variants={panelMotion}>
          {assetGroups.map((group) => {
            const members = servers.filter((server) => group.memberServerIds.includes(server.id))
            return (
              <article key={group.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-3">
                <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{group.name}</p><p className="text-xs text-muted-foreground">{group.policyProfile}</p></div><StatusBadge value={group.environment} /></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><p>Owner: {group.ownerTeam}</p><p>Members: {members.length}</p><p>Scanner compliance: {group.scannerCompliancePercent}%</p><p>Detections: {group.linkedDetections.length}</p><p>Alerts: {group.linkedCases.length}</p></div>
                <div className="mt-2 rounded-lg border border-border/65 bg-surface-1/70 p-2">
                  <p className="wb-kicker">Member Servers</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">{members.map((member) => <li key={member.id} className="flex items-center justify-between"><span>{member.hostname}</span><StatusBadge value={member.health} /></li>)}</ul>
                </div>
              </article>
            )
          })}
        </motion.article>
      ) : null}

      {subpageKey === "scanner-fleet" ? (
        <motion.article className="wb-panel space-y-3" variants={panelMotion}>
          <div className="grid gap-3 md:grid-cols-2">
            {scannerFleet.map((node) => (
              <article key={node.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-3">
                <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{node.name}</p><p className="text-xs text-muted-foreground">{node.mode} mode | v{node.latestVersion}</p></div><StatusBadge value={node.health} /></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><p>Queue depth: {node.queueDepth}</p><p>Coverage: {node.coveragePercent}%</p><p>Uptime: {node.uptimePercent}%</p><p>Subnets: {node.assignedSubnetIds.length}</p></div>
                <p className="mt-2 text-xs text-muted-foreground">Last heartbeat: {new Date(node.lastHeartbeatUtc).toLocaleString()}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3"><p className="wb-kicker">Total Nodes</p><p className="mt-1 text-lg font-semibold">{scannerFleet.length}</p></div>
            <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3"><p className="wb-kicker">Degraded/Offline</p><p className="mt-1 text-lg font-semibold text-amber-200">{scannerFleet.filter((node) => node.health !== "Healthy").length}</p></div>
            <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3"><p className="wb-kicker">Telemetry Gaps</p><p className="mt-1 text-lg font-semibold text-rose-200">{telemetryGaps}</p></div>
          </div>
        </motion.article>
      ) : null}

      <Sheet open={Boolean(editServer)} onOpenChange={(open) => !open && setEditServerId(null)}>
        <SheetTrigger className="hidden" />
        <SheetContent side="right" className="w-full max-w-md border-border bg-surface-1">
          <SheetHeader><SheetTitle>Edit Server</SheetTitle><SheetDescription>Modify host and posture data.</SheetDescription></SheetHeader>
          {editServer ? (
            <div className="space-y-2 px-4 pb-4 text-xs">
              <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.hostname} onChange={(event) => setEditDraft((current) => ({ ...current, hostname: event.target.value }))} />
              <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.ipv4} onChange={(event) => setEditDraft((current) => ({ ...current, ipv4: event.target.value }))} />
              <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.ownerTeam} onChange={(event) => setEditDraft((current) => ({ ...current, ownerTeam: event.target.value }))} />
              <input className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.os} onChange={(event) => setEditDraft((current) => ({ ...current, os: event.target.value }))} />
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.subnetId} onChange={(event) => setEditDraft((current) => ({ ...current, subnetId: event.target.value }))}>{subnets.map((subnet) => <option key={subnet.id} value={subnet.id}>{subnet.name}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.environment} onChange={(event) => setEditDraft((current) => ({ ...current, environment: event.target.value as ServerEnvironment }))}>{["Production", "Staging", "Development"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.criticality} onChange={(event) => setEditDraft((current) => ({ ...current, criticality: event.target.value as ServerCriticality }))}>{["Mission Critical", "Business Critical", "Standard"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.health} onChange={(event) => setEditDraft((current) => ({ ...current, health: event.target.value as ServerHealthStatus }))}>{["Healthy", "Degraded", "Unreachable"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.telemetryStatus} onChange={(event) => setEditDraft((current) => ({ ...current, telemetryStatus: event.target.value as TelemetryStatus }))}>{["Healthy", "Delayed", "Missing"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.scannerCoverage} onChange={(event) => setEditDraft((current) => ({ ...current, scannerCoverage: event.target.value as ScannerCoverageStatus }))}>{["Full", "Partial", "None"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <select className="h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2" value={editDraft.riskSeverity} onChange={(event) => setEditDraft((current) => ({ ...current, riskSeverity: event.target.value as RiskSeverity }))}>{["Critical", "High", "Medium", "Low"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
              <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setEditServerId(null)}>Cancel</Button><Button size="sm" onClick={submitEditServer}>Save</Button></div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </motion.section>
  )
}

