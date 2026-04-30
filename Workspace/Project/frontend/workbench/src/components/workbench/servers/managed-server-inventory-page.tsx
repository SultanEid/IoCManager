"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { ManagedServerResponse, ScannerCapability } from "@/shared/api/schemas"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessLeadActions } from "@/shared/auth/session"
import { gateway } from "@/shared/gateway"
import type {
  ManagedConnectionAuthMode,
  ManagedConnectionProtocol,
  ManagedServerInventoryFilters,
  ManagedServerInventoryLastContactFilter,
  ManagedServerInventoryStatusFilter,
} from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

type ManagedServerFormState = {
  subnetId: string
  hostname: string
  ipAddress: string
  operatingSystem: string
  environment: string
  status: string
  connectivityStatus: string
  connectionProtocol: string
  connectionHost: string
  connectionPort: string
  connectionAuthMode: string
  connectionUsername: string
}

const STATUS_OPTIONS: ManagedServerInventoryStatusFilter[] = ["Unknown", "Online", "Degraded", "Offline"]
const CAPABILITY_OPTIONS: ScannerCapability[] = ["Yara", "Sigma", "Snort", "Suricata"]
const LAST_CONTACT_OPTIONS: ManagedServerInventoryLastContactFilter[] = ["24h", "72h", "7d", "30d", "stale", "never"]
const INVENTORY_PAGE_SIZE = 20

type ManagedServerFiltersState = {
  q: string
  status: string
  scannerCapability: string
  subnetId: string
  lastContact: string
  environment: string
  fromUtc: string
  toUtc: string
  page: number
}

function parseFilters(searchParams: URLSearchParams): ManagedServerFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    scannerCapability: searchParams.get("scannerCapability") ?? "",
    subnetId: searchParams.get("subnetId") ?? "",
    lastContact: searchParams.get("lastContact") ?? "",
    environment: searchParams.get("environment") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: ManagedServerFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.scannerCapability) {
    params.set("scannerCapability", filters.scannerCapability)
  }
  if (filters.subnetId) {
    params.set("subnetId", filters.subnetId)
  }
  if (filters.lastContact) {
    params.set("lastContact", filters.lastContact)
  }
  if (filters.environment) {
    params.set("environment", filters.environment)
  }
  if (filters.fromUtc) {
    params.set("fromUtc", filters.fromUtc)
  }
  if (filters.toUtc) {
    params.set("toUtc", filters.toUtc)
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page))
  }
  return params.toString()
}

function toOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseOptionalPort(value: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return undefined
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isNaN(parsed)) {
    return undefined
  }

  return parsed
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never"
  }

  return new Date(value).toLocaleString()
}

function isStaleContact(value: string | null) {
  if (!value) {
    return true
  }

  return Date.now() - Date.parse(value) > 72 * 60 * 60 * 1000
}

function buildFormState(server: ManagedServerResponse | null, defaultSubnetId: string): ManagedServerFormState {
  if (!server) {
    return {
      subnetId: defaultSubnetId,
      hostname: "",
      ipAddress: "",
      operatingSystem: "",
      environment: "",
      status: "Discovered",
      connectivityStatus: "Unknown",
      connectionProtocol: "",
      connectionHost: "",
      connectionPort: "",
      connectionAuthMode: "",
      connectionUsername: "",
    }
  }

  return {
    subnetId: server.subnetId,
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    operatingSystem: server.operatingSystem,
    environment: server.environment,
    status: server.status,
    connectivityStatus: server.connectivityStatus,
    connectionProtocol: server.connectionProtocol ?? "",
    connectionHost: server.connectionHost ?? "",
    connectionPort: server.connectionPort?.toString() ?? "",
    connectionAuthMode: server.connectionAuthMode ?? "",
    connectionUsername: server.connectionUsername ?? "",
  }
}

export function ManagedServerInventoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const canManageServers = canAccessLeadActions(session)
  const actorUserId = session?.userId ?? session?.username ?? "unknown-user"
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState<ManagedServerFiltersState>(parsedFilters)

  const [serverDialogOpen, setServerDialogOpen] = useState(false)
  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [formState, setFormState] = useState<ManagedServerFormState>(() => buildFormState(null, ""))
  const [formError, setFormError] = useState<string | null>(null)

  const [assignmentDialogServer, setAssignmentDialogServer] = useState<ManagedServerResponse | null>(null)
  const [assignmentConnectivityStatus, setAssignmentConnectivityStatus] = useState<ManagedServerInventoryStatusFilter>("Unknown")
  const [assignmentSelection, setAssignmentSelection] = useState<Record<string, boolean>>({})
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  const [secretDialogServer, setSecretDialogServer] = useState<ManagedServerResponse | null>(null)
  const [secretPayload, setSecretPayload] = useState("")
  const [secretError, setSecretError] = useState<string | null>(null)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const subnetsQuery = useWorkbenchQuery(["infrastructure", "subnets"], (signal) => gateway.listSubnets(signal))
  const scannersQuery = useWorkbenchQuery(["infrastructure", "scanners"], (signal) => gateway.listScanners(signal))

  const inventoryFilters = useMemo<ManagedServerInventoryFilters>(
    () => ({
      q: parsedFilters.q || undefined,
      status: parsedFilters.status.length > 0 ? (parsedFilters.status as ManagedServerInventoryStatusFilter) : undefined,
      scannerCapability:
        parsedFilters.scannerCapability.length > 0 ? (parsedFilters.scannerCapability as ScannerCapability) : undefined,
      subnetId: parsedFilters.subnetId || undefined,
      lastContact:
        parsedFilters.lastContact.length > 0 ? (parsedFilters.lastContact as ManagedServerInventoryLastContactFilter) : undefined,
      environment: parsedFilters.environment || undefined,
      fromUtc: parsedFilters.fromUtc || undefined,
      toUtc: parsedFilters.toUtc || undefined,
      page: parsedFilters.page,
      pageSize: INVENTORY_PAGE_SIZE,
    }),
    [parsedFilters],
  )

  const inventoryQuery = useWorkbenchQuery(
    ["infrastructure", "managed-servers", inventoryFilters],
    (signal) => gateway.listManagedServers(inventoryFilters, signal),
    { refetchInterval: 15000 },
  )

  const saveServerMutation = useMutation({
    mutationFn: async (draft: ManagedServerFormState) => {
      const hostname = draft.hostname.trim()
      const ipAddress = draft.ipAddress.trim()
      const operatingSystem = draft.operatingSystem.trim()
      const environment = draft.environment.trim()
      if (!draft.subnetId || hostname.length === 0 || ipAddress.length === 0 || operatingSystem.length === 0 || environment.length === 0) {
        throw new Error("Subnet, hostname, IP address, operating system, and environment are required.")
      }

      if (editingServerId) {
        await gateway.updateManagedServer(editingServerId, {
          hostname,
          ipAddress,
          operatingSystem,
          environment,
          actorUserId,
          status: toOptionalString(draft.status),
          connectivityStatus: toOptionalString(draft.connectivityStatus) as ManagedServerInventoryStatusFilter | undefined,
          connectionProtocol: toOptionalString(draft.connectionProtocol) as ManagedConnectionProtocol | undefined,
          connectionHost: toOptionalString(draft.connectionHost),
          connectionPort: parseOptionalPort(draft.connectionPort),
          connectionAuthMode: toOptionalString(draft.connectionAuthMode) as ManagedConnectionAuthMode | undefined,
          connectionUsername: toOptionalString(draft.connectionUsername),
        })
        return
      }

      await gateway.createManagedServer({
        subnetId: draft.subnetId,
        hostname,
        ipAddress,
        operatingSystem,
        environment,
        actorUserId,
        status: toOptionalString(draft.status),
        connectivityStatus: toOptionalString(draft.connectivityStatus) as ManagedServerInventoryStatusFilter | undefined,
        connectionProtocol: toOptionalString(draft.connectionProtocol) as ManagedConnectionProtocol | undefined,
        connectionHost: toOptionalString(draft.connectionHost),
        connectionPort: parseOptionalPort(draft.connectionPort),
        connectionAuthMode: toOptionalString(draft.connectionAuthMode) as ManagedConnectionAuthMode | undefined,
        connectionUsername: toOptionalString(draft.connectionUsername),
      })
    },
    onSuccess: async () => {
      setServerDialogOpen(false)
      setEditingServerId(null)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ["infrastructure", "managed-servers"] })
    },
    onError: (error) => {
      setFormError(classifyUiError(error).message)
    },
  })

  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentDialogServer) {
        return
      }

      const scannerRows = scannersQuery.data ?? []
      const selectedIds = scannerRows.filter((scanner) => assignmentSelection[scanner.id]).map((scanner) => scanner.id)
      const selectedIdSet = new Set(selectedIds)
      const existingAssignments = assignmentDialogServer.scannerAssignments
      const existingByScannerId = new Map(existingAssignments.map((item) => [item.scannerId, item]))
      const toRemove = existingAssignments.filter((item) => !selectedIdSet.has(item.scannerId)).map((item) => item.scannerId)

      for (const scannerId of selectedIds) {
        const current = existingByScannerId.get(scannerId)
        await gateway.upsertManagedServerScannerAssignment(assignmentDialogServer.id, scannerId, {
          connectivityStatus: (current?.connectivityStatus as ManagedServerInventoryStatusFilter | undefined) ?? assignmentConnectivityStatus,
          lastHeartbeatUtc: current?.lastHeartbeatUtc ?? undefined,
          lastContactUtc: current?.lastContactUtc ?? undefined,
          isEnabled: true,
          actorUserId,
        })
      }

      for (const scannerId of toRemove) {
        await gateway.removeManagedServerScannerAssignment(assignmentDialogServer.id, scannerId)
      }
    },
    onSuccess: async () => {
      setAssignmentDialogServer(null)
      setAssignmentError(null)
      await queryClient.invalidateQueries({ queryKey: ["infrastructure", "managed-servers"] })
    },
    onError: (error) => {
      setAssignmentError(classifyUiError(error).message)
    },
  })

  const rotateSecretMutation = useMutation({
    mutationFn: async () => {
      if (!secretDialogServer) {
        return
      }

      const payload = secretPayload.trim()
      if (payload.length === 0) {
        throw new Error("Connection secret payload is required.")
      }

      await gateway.rotateManagedServerConnectionSecret(secretDialogServer.id, {
        secretPayload: payload,
        actorUserId,
      })
    },
    onSuccess: async () => {
      setSecretDialogServer(null)
      setSecretPayload("")
      setSecretError(null)
      await queryClient.invalidateQueries({ queryKey: ["infrastructure", "managed-servers"] })
    },
    onError: (error) => {
      setSecretError(classifyUiError(error).message)
    },
  })

  const subnets = useMemo(() => subnetsQuery.data ?? [], [subnetsQuery.data])
  const scanners = scannersQuery.data ?? []
  const subnetLabelById = useMemo(() => {
    return new Map(subnets.map((item) => [item.id, item.name]))
  }, [subnets])

  if (subnetsQuery.isLoading || inventoryQuery.isLoading || scannersQuery.isLoading) {
    return <LoadingState label="Loading managed server inventory" />
  }

  if (subnetsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(subnetsQuery.error)} fallbackTitle="Servers unavailable" />
  }

  if (inventoryQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(inventoryQuery.error)} fallbackTitle="Servers unavailable" />
  }

  if (scannersQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(scannersQuery.error)} fallbackTitle="Scanner inventory unavailable" />
  }

  const inventory = inventoryQuery.data ?? {
    servers: [],
    totalServers: 0,
    unhealthyServers: 0,
    unreachableServers: 0,
    staleContactServers: 0,
    page: 1,
    pageSize: INVENTORY_PAGE_SIZE,
  }
  const servers = inventory.servers
  const staleServers = servers.filter((server) => isStaleContact(server.lastContactUtc)).length
  const page = inventory.page ?? parsedFilters.page
  const pageSize = inventory.pageSize ?? INVENTORY_PAGE_SIZE
  const canMoveNext = page * pageSize < inventory.totalServers
  const filteredOut = Object.values(parsedFilters).some((value) => value !== "" && value !== 1)

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: ManagedServerFiltersState = {
      q: "",
      status: "",
      scannerCapability: "",
      subnetId: "",
      lastContact: "",
      environment: "",
      fromUtc: "",
      toUtc: "",
      page: 1,
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const movePage = (nextPage: number) => {
    const next = buildQuery({
      ...parsedFilters,
      page: Math.max(1, nextPage),
    })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const openCreateDialog = () => {
    setEditingServerId(null)
    setFormState(buildFormState(null, subnets[0]?.id ?? ""))
    setFormError(null)
    setServerDialogOpen(true)
  }

  const openEditDialog = (server: ManagedServerResponse) => {
    setEditingServerId(server.id)
    setFormState(buildFormState(server, server.subnetId))
    setFormError(null)
    setServerDialogOpen(true)
  }

  const openAssignmentDialog = (server: ManagedServerResponse) => {
    const selected = Object.fromEntries(scanners.map((scanner) => [scanner.id, false]))
    for (const assignment of server.scannerAssignments) {
      selected[assignment.scannerId] = assignment.isEnabled
    }

    setAssignmentDialogServer(server)
    setAssignmentConnectivityStatus((server.connectivityStatus as ManagedServerInventoryStatusFilter) ?? "Unknown")
    setAssignmentSelection(selected)
    setAssignmentError(null)
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Servers</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Managed server and scanner inventory</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search indexed inventory by hostname, IP, environment, capability, subnet, and contact recency without losing place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" render={<Link href="/scan-plan" />}>
              Open scan plans
            </Button>
            {canManageServers ? (
              <Button type="button" size="sm" onClick={openCreateDialog}>
                Register managed server
              </Button>
            ) : null}
          </div>
        </div>
      </motion.header>

      <motion.article className="grid gap-3 md:grid-cols-4" variants={panelMotion}>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Total Servers</p>
          <p className="mt-1 text-lg font-semibold">{inventory.totalServers}</p>
        </div>
        <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 p-3">
          <p className="wb-kicker text-amber-100">Unhealthy</p>
          <p className="mt-1 text-lg font-semibold text-amber-100">{inventory.unhealthyServers}</p>
        </div>
        <div className="rounded-lg border border-rose-300/35 bg-rose-500/10 p-3">
          <p className="wb-kicker text-rose-100">Unreachable</p>
          <p className="mt-1 text-lg font-semibold text-rose-100">{inventory.unreachableServers}</p>
        </div>
        <div className="rounded-lg border border-sky-300/35 bg-sky-500/10 p-3">
          <p className="wb-kicker text-sky-100">Stale Contact</p>
          <p className="mt-1 text-lg font-semibold text-sky-100">{staleServers}</p>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 md:col-span-2">
            <span className="wb-kicker">Search</span>
            <Input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
              placeholder="Hostname, IP, OS, environment"
            />
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Scanner Capability</span>
            <select
              value={filters.scannerCapability}
              onChange={(event) => setFilters((current) => ({ ...current, scannerCapability: event.target.value, page: 1 }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {CAPABILITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Subnet</span>
            <select
              value={filters.subnetId}
              onChange={(event) => setFilters((current) => ({ ...current, subnetId: event.target.value, page: 1 }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {subnets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Last Contact</span>
            <select
              value={filters.lastContact}
              onChange={(event) => setFilters((current) => ({ ...current, lastContact: event.target.value, page: 1 }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {LAST_CONTACT_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="wb-kicker">Environment</span>
            <Input
              value={filters.environment}
              onChange={(event) => setFilters((current) => ({ ...current, environment: event.target.value, page: 1 }))}
              placeholder="prod, dmz, lab"
            />
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Contact From</span>
            <Input
              type="date"
              value={filters.fromUtc}
              onChange={(event) => setFilters((current) => ({ ...current, fromUtc: event.target.value, page: 1 }))}
            />
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Contact To</span>
            <Input
              type="date"
              value={filters.toUtc}
              onChange={(event) => setFilters((current) => ({ ...current, toUtc: event.target.value, page: 1 }))}
            />
          </label>
          <div className="flex items-end gap-2">
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Managed inventory</h3>
          <p className="text-xs text-muted-foreground">
            Page {page} | {servers.length} row(s) returned
          </p>
        </div>

        {servers.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No managed servers matched the current search"
              description="Broaden the contact window, remove the capability or subnet filter, or clear the search text to reopen the full inventory."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset server filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No managed servers"
              description="Register a managed server to start scanner assignment and heartbeat tracking."
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Subnet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Contact</TableHead>
                  {canManageServers ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>
                      <Link href={`/servers/servers/${server.id}`} className="text-sm font-semibold hover:underline">
                        {server.hostname}
                      </Link>
                      <p className="text-xs text-muted-foreground">{server.ipAddress}</p>
                    </TableCell>
                    <TableCell>{subnetLabelById.get(server.subnetId) ?? server.subnetId.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusBadge value={server.status} />
                        <StatusBadge value={server.connectivityStatus} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {server.scannerCapabilities.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          server.scannerCapabilities.map((capability) => <StatusBadge key={`${server.id}-${capability}`} value={capability} />)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className={`text-xs ${isStaleContact(server.lastContactUtc) ? "text-amber-100" : "text-muted-foreground"}`}>
                        Last contact: {formatTimestamp(server.lastContactUtc)}
                      </p>
                      <p className="text-xs text-muted-foreground">Heartbeat: {formatTimestamp(server.lastHeartbeatUtc)}</p>
                    </TableCell>
                    {canManageServers ? (
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button type="button" size="xs" variant="outline" onClick={() => openEditDialog(server)}>
                            Edit
                          </Button>
                          <Button type="button" size="xs" variant="outline" onClick={() => openAssignmentDialog(server)}>
                            Assign
                          </Button>
                          <Button type="button" size="xs" variant="outline" onClick={() => setSecretDialogServer(server)}>
                            Rotate Secret
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {servers.length} of {inventory.totalServers} matching servers
          </p>
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

      <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingServerId ? "Edit Managed Server" : "Register Managed Server"}</DialogTitle>
            <DialogDescription>
              Connection secrets are write-only and rotated separately. This form stores only metadata needed for managed connectivity.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="wb-kicker">Subnet</span>
              <select
                value={formState.subnetId}
                onChange={(event) => setFormState((current) => ({ ...current, subnetId: event.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Select subnet</option>
                {subnets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.cidrBlock})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Hostname</span>
              <Input
                value={formState.hostname}
                onChange={(event) => setFormState((current) => ({ ...current, hostname: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">IP Address</span>
              <Input
                value={formState.ipAddress}
                onChange={(event) => setFormState((current) => ({ ...current, ipAddress: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Operating System</span>
              <Input
                value={formState.operatingSystem}
                onChange={(event) => setFormState((current) => ({ ...current, operatingSystem: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Environment</span>
              <Input
                value={formState.environment}
                onChange={(event) => setFormState((current) => ({ ...current, environment: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Server Status</span>
              <Input
                value={formState.status}
                onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Connectivity</span>
              <select
                value={formState.connectivityStatus}
                onChange={(event) => setFormState((current) => ({ ...current, connectivityStatus: event.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="wb-kicker">Connection Protocol</span>
              <select
                value={formState.connectionProtocol}
                onChange={(event) => setFormState((current) => ({ ...current, connectionProtocol: event.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">None</option>
                <option value="Ssh">Ssh</option>
                <option value="WinRm">WinRm</option>
                <option value="Agent">Agent</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Connection Host</span>
              <Input
                value={formState.connectionHost}
                onChange={(event) => setFormState((current) => ({ ...current, connectionHost: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Connection Port</span>
              <Input
                value={formState.connectionPort}
                onChange={(event) => setFormState((current) => ({ ...current, connectionPort: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="wb-kicker">Auth Mode</span>
              <select
                value={formState.connectionAuthMode}
                onChange={(event) => setFormState((current) => ({ ...current, connectionAuthMode: event.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">None</option>
                <option value="Password">Password</option>
                <option value="Key">Key</option>
                <option value="Token">Token</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="wb-kicker">Connection Username</span>
              <Input
                value={formState.connectionUsername}
                onChange={(event) => setFormState((current) => ({ ...current, connectionUsername: event.target.value }))}
              />
            </label>
          </div>

          {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setServerDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => saveServerMutation.mutate(formState)} disabled={saveServerMutation.isPending}>
              {saveServerMutation.isPending ? "Saving..." : editingServerId ? "Save Changes" : "Register Server"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentDialogServer !== null} onOpenChange={(open) => (!open ? setAssignmentDialogServer(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scanner Assignments</DialogTitle>
            <DialogDescription>
              Enable scanners for this server and persist assignment telemetry routing in backend inventory.
            </DialogDescription>
          </DialogHeader>

          <label className="space-y-1">
            <span className="wb-kicker">Default Connectivity For New Assignments</span>
            <select
              value={assignmentConnectivityStatus}
              onChange={(event) => setAssignmentConnectivityStatus(event.target.value as ManagedServerInventoryStatusFilter)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-surface-2/55 p-2">
            {scanners.map((scanner) => (
              <label key={scanner.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-surface-1/80 px-2 py-2">
                <span>
                  <p className="text-sm font-medium">{scanner.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {scanner.capabilities.map((capability) => (
                      <StatusBadge key={`${scanner.id}-${capability}`} value={capability} />
                    ))}
                  </div>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(assignmentSelection[scanner.id])}
                  onChange={(event) =>
                    setAssignmentSelection((current) => ({
                      ...current,
                      [scanner.id]: event.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          {assignmentError ? <p className="text-xs text-destructive">{assignmentError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignmentDialogServer(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => assignmentMutation.mutate()} disabled={assignmentMutation.isPending}>
              {assignmentMutation.isPending ? "Saving..." : "Save Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={secretDialogServer !== null} onOpenChange={(open) => (!open ? setSecretDialogServer(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rotate Connection Secret</DialogTitle>
            <DialogDescription>
              Secret payload is encrypted before persistence and never returned in read responses.
            </DialogDescription>
          </DialogHeader>

          <label className="space-y-1">
            <span className="wb-kicker">Secret Payload</span>
            <Textarea
              value={secretPayload}
              onChange={(event) => setSecretPayload(event.target.value)}
              placeholder="Paste credential payload JSON or token bundle"
            />
          </label>

          {secretError ? <p className="text-xs text-destructive">{secretError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSecretDialogServer(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => rotateSecretMutation.mutate()} disabled={rotateSecretMutation.isPending}>
              {rotateSecretMutation.isPending ? "Rotating..." : "Rotate Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.section>
  )
}
