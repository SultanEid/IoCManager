"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import type { ManagedServerResponse, ScannerCapability, ScannerResponse } from "@/shared/api/schemas"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

type ScannerFleetFilters = {
  q: string
  capability: ScannerCapability | ""
  health: string
  scannerId: string
}

type ScannerAssignmentView = {
  scanner: ScannerResponse
  assignedServers: ManagedServerResponse[]
}

function isScannerCapability(value: string): value is ScannerCapability {
  return value === "Yara" || value === "Sigma" || value === "Snort" || value === "Suricata"
}

function parseFilters(searchParams: URLSearchParams): ScannerFleetFilters {
  const capability = searchParams.get("capability") ?? ""
  return {
    q: searchParams.get("q") ?? "",
    capability: isScannerCapability(capability) ? capability : "",
    health: searchParams.get("health") ?? "",
    scannerId: searchParams.get("scannerId") ?? "",
  }
}

function buildQuery(filters: ScannerFleetFilters) {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.capability) {
    params.set("capability", filters.capability)
  }
  if (filters.health) {
    params.set("health", filters.health)
  }
  if (filters.scannerId) {
    params.set("scannerId", filters.scannerId)
  }
  return params.toString()
}

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never"
}

export function ScannerFleetPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const fleetQuery = useWorkbenchQuery(["scanner-fleet"], async (signal) => {
    const [scanners, inventory] = await Promise.all([
      gateway.listScanners(signal),
      gateway.listManagedServers({ page: 1, pageSize: 500 }, signal),
    ])

    return {
      scanners,
      servers: inventory.servers,
    }
  })

  if (fleetQuery.isLoading) {
    return <LoadingState label="Loading scanner fleet" />
  }

  if (fleetQuery.isError || !fleetQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(fleetQuery.error)} fallbackTitle="Scanner fleet unavailable" />
  }

  const capabilityOptions = Array.from(new Set(fleetQuery.data.scanners.flatMap((scanner) => scanner.capabilities))).sort()
  const healthOptions = Array.from(new Set(fleetQuery.data.scanners.map((scanner) => scanner.healthStatus))).sort()

  const rows: ScannerAssignmentView[] = fleetQuery.data.scanners.map((scanner) => ({
    scanner,
    assignedServers: fleetQuery.data.servers.filter((server) =>
      server.scannerAssignments.some((assignment) => assignment.scannerId === scanner.id && assignment.isEnabled),
    ),
  }))

  const filteredRows = rows.filter(({ scanner }) => {
    const searchBlob = [scanner.name, scanner.engineType, scanner.version, scanner.healthStatus, ...scanner.capabilities]
      .join(" ")
      .toLowerCase()
    const matchesQ = !parsedFilters.q || searchBlob.includes(parsedFilters.q.toLowerCase())
    const matchesCapability = !parsedFilters.capability || scanner.capabilities.includes(parsedFilters.capability)
    const matchesHealth = !parsedFilters.health || scanner.healthStatus === parsedFilters.health
    return matchesQ && matchesCapability && matchesHealth
  })

  const selectedScanner =
    filteredRows.find((item) => item.scanner.id === parsedFilters.scannerId) ??
    filteredRows[0] ??
    null

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: ScannerFleetFilters = {
      q: "",
      capability: "",
      health: "",
      scannerId: "",
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const selectScanner = (scannerId: string) => {
    const next = buildQuery({ ...parsedFilters, scannerId })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const filteredOut = Boolean(parsedFilters.q || parsedFilters.capability || parsedFilters.health)
  const healthyCount = rows.filter((item) => item.scanner.healthStatus.toLowerCase() === "healthy").length
  const assignedServerCount = rows.reduce((sum, item) => sum + item.assignedServers.length, 0)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div>
          <p className="wb-kicker">Scanner Fleet</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Persisted scanner health and assignment coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fleet telemetry is drawn from live scanners plus persisted managed-server assignments. No synthetic coverage rows are shown.
          </p>
        </div>
      </motion.header>

      <motion.article className="grid gap-3 md:grid-cols-4" variants={panelMotion}>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Scanners</p>
          <p className="mt-1 text-lg font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 p-3">
          <p className="wb-kicker text-emerald-100">Healthy</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">{healthyCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Assigned Servers</p>
          <p className="mt-1 text-lg font-semibold">{assignedServerCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Capabilities</p>
          <p className="mt-1 text-lg font-semibold">{capabilityOptions.length}</p>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search scanner name or engine"
          />
          <select
            value={filters.capability}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                capability: isScannerCapability(event.target.value) ? event.target.value : "",
              }))
            }
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          >
            <option value="">All capabilities</option>
            {capabilityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.health}
            onChange={(event) => setFilters((current) => ({ ...current, health: event.target.value }))}
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          >
            <option value="">All health states</option>
            {healthOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </motion.article>

      {rows.length === 0 ? (
        <motion.article variants={panelMotion}>
          <EmptyState
            title="No scanners registered"
            description="Create or heartbeat a scanner from the backend before using fleet coverage views."
          />
        </motion.article>
      ) : filteredRows.length === 0 ? (
        <motion.article variants={panelMotion}>
          <SearchEmptyState
            title="No scanners matched the current filters"
            description="Clear the capability or health filter, or broaden the search text to reopen the full fleet."
            action={
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                Reset fleet filters
              </Button>
            }
          />
        </motion.article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Fleet Inventory</h3>
              <p className="text-xs text-muted-foreground">
                {filteredRows.length} row(s){filteredOut ? " filtered" : ""}
              </p>
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scanner</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Heartbeat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((item) => (
                    <TableRow
                      key={item.scanner.id}
                      className={selectedScanner?.scanner.id === item.scanner.id ? "bg-surface-2/50" : ""}
                      onClick={() => selectScanner(item.scanner.id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{item.scanner.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.scanner.engineType} | {item.scanner.version}
                        </p>
                      </TableCell>
                      <TableCell><StatusBadge value={item.scanner.healthStatus} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.scanner.capabilities.map((capability) => (
                            <StatusBadge key={`${item.scanner.id}-${capability}`} value={capability} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{item.assignedServers.length} server(s)</TableCell>
                      <TableCell>{formatTimestamp(item.scanner.lastHeartbeatUtc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.article>

          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Selected Scanner</h3>
              {selectedScanner ? <StatusBadge value={selectedScanner.scanner.healthStatus} /> : null}
            </div>
            {!selectedScanner ? (
              <div className="mt-3">
                <EmptyState title="No scanner selected" description="Choose a scanner row to inspect server coverage." />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                  <p className="text-sm font-medium">{selectedScanner.scanner.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last heartbeat {formatTimestamp(selectedScanner.scanner.lastHeartbeatUtc)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedScanner.scanner.capabilities.map((capability) => (
                      <StatusBadge key={`${selectedScanner.scanner.id}-detail-${capability}`} value={capability} />
                    ))}
                  </div>
                </div>

                {selectedScanner.assignedServers.length === 0 ? (
                  <EmptyState
                    title="No assigned servers"
                    description="This scanner has no enabled managed-server assignments in persisted inventory."
                  />
                ) : (
                  <div className="space-y-2">
                    {selectedScanner.assignedServers.map((server) => (
                      <div key={server.id} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/servers/servers/${server.id}`} className="text-sm font-medium hover:underline">
                            {server.hostname}
                          </Link>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge value={server.status} />
                            <StatusBadge value={server.connectivityStatus} />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {server.ipAddress} | {server.environment} | Contact {formatTimestamp(server.lastContactUtc)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.article>
        </div>
      )}
    </motion.section>
  )
}
