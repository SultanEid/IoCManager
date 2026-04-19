"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import {
  createLegacyNetwork,
  deleteLegacyNetwork,
  discoverLegacyNetwork,
  listLegacyNetworks,
  listLegacyTargets,
  parseLegacyNetworkDeletionBlocked,
  updateLegacyNetwork,
  updateLegacyTarget,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

function formatOsLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown"
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export default function ServersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "team-dev"

  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("")
  const [form, setForm] = useState({
    name: "",
    cidrBlock: "",
    sshUser: "",
    sshKeyPath: "",
    sshPassword: "",
    notes: "",
  })
  const [rangeStartIp, setRangeStartIp] = useState("")
  const [rangeEndIp, setRangeEndIp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [discoveringId, setDiscoveringId] = useState<string | null>(null)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [editingDisplayName, setEditingDisplayName] = useState("")
  const [savingTargetId, setSavingTargetId] = useState<string | null>(null)
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null)
  const [savingNetworkId, setSavingNetworkId] = useState<string | null>(null)
  const [networkForm, setNetworkForm] = useState({
    name: "",
    cidrBlock: "",
    sshUser: "",
    sshKeyPath: "",
    sshPassword: "",
    clearSshPassword: false,
    notes: "",
  })
  const [confirmingDeleteNetworkId, setConfirmingDeleteNetworkId] = useState<string | null>(null)
  const [confirmingForceDeleteNetworkId, setConfirmingForceDeleteNetworkId] = useState<string | null>(null)
  const [deletingNetworkId, setDeletingNetworkId] = useState<string | null>(null)
  const [deleteBlocked, setDeleteBlocked] = useState<ReturnType<typeof parseLegacyNetworkDeletionBlocked>>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const networksQuery = useWorkbenchQuery(["legacy-pipeline", "networks", refreshKey], (signal) => listLegacyNetworks(signal))
  const targetsQuery = useWorkbenchQuery(
    ["legacy-pipeline", "targets", selectedNetworkId, refreshKey],
    (signal) => listLegacyTargets(selectedNetworkId || undefined, signal),
  )
  const networks = networksQuery.data ?? []
  const targets = targetsQuery.data ?? []
  const focusedTargetId = searchParams.get("targetId") ?? ""
  const focusedTarget = useMemo(
    () => (focusedTargetId ? targets.find((target) => target.id === focusedTargetId) ?? null : null),
    [focusedTargetId, targets],
  )

  useEffect(() => {
    if (!focusedTargetId || targets.length === 0) {
      return
    }

    const matchingTarget = targets.find((target) => target.id === focusedTargetId)
    if (matchingTarget && matchingTarget.networkId !== selectedNetworkId) {
      setSelectedNetworkId(matchingTarget.networkId)
    }
  }, [focusedTargetId, selectedNetworkId, targets])

  const submitNetwork = async () => {
    setSubmitting(true)
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
    try {
      await createLegacyNetwork({
        ...form,
        clearSshPassword: false,
      })
      setForm({ name: "", cidrBlock: "", sshUser: "", sshKeyPath: "", sshPassword: "", notes: "" })
      setRefreshKey((value) => value + 1)
      setActionMessage("Subnet saved.")
    } catch (error) {
      const failure = classifyUiError(error)
      setActionError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }

  const beginEditNetwork = (network: {
    id: string
    name: string
    cidrBlock: string
    sshUser: string | null
    sshKeyPath: string | null
    notes: string | null
  }) => {
    setEditingNetworkId(network.id)
    setNetworkForm({
      name: network.name,
      cidrBlock: network.cidrBlock,
      sshUser: network.sshUser ?? "",
      sshKeyPath: network.sshKeyPath ?? "",
      sshPassword: "",
      clearSshPassword: false,
      notes: network.notes ?? "",
    })
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
  }

  const cancelEditNetwork = () => {
    setEditingNetworkId(null)
    setSavingNetworkId(null)
    setNetworkForm({
      name: "",
      cidrBlock: "",
      sshUser: "",
      sshKeyPath: "",
      sshPassword: "",
      clearSshPassword: false,
      notes: "",
    })
  }

  const saveNetwork = async (networkId: string) => {
    setSavingNetworkId(networkId)
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
    try {
      await updateLegacyNetwork(networkId, networkForm)
      if (selectedNetworkId === networkId) {
        setSelectedNetworkId(networkId)
      }
      setRefreshKey((value) => value + 1)
      cancelEditNetwork()
      setActionMessage("Subnet settings saved.")
    } catch (error) {
      const failure = classifyUiError(error)
      setActionError(failure.message)
    } finally {
      setSavingNetworkId(null)
    }
  }

  const runDiscovery = async (networkId: string) => {
    setDiscoveringId(networkId)
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
    try {
      const response = await discoverLegacyNetwork(networkId, { actorUserId, rangeStartIp, rangeEndIp })
      setSelectedNetworkId(networkId)
      setRefreshKey((value) => value + 1)
      setActionMessage(
        `Discovery completed for ${response.networkName}: ${response.reachableHosts} reachable, ${response.offlineHosts} offline.`,
      )
    } catch (error) {
      const failure = classifyUiError(error)
      setActionError(failure.message)
    } finally {
      setDiscoveringId(null)
    }
  }

  const beginRename = (targetId: string, currentDisplayName: string | null) => {
    setEditingTargetId(targetId)
    setEditingDisplayName(currentDisplayName ?? "")
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
  }

  const cancelRename = () => {
    setEditingTargetId(null)
    setEditingDisplayName("")
  }

  const saveRename = async (targetId: string) => {
    setSavingTargetId(targetId)
    setActionError(null)
    setActionMessage(null)
    setDeleteBlocked(null)
    try {
      await updateLegacyTarget(targetId, { displayName: editingDisplayName || null })
      setRefreshKey((value) => value + 1)
      setEditingTargetId(null)
      setEditingDisplayName("")
      setActionMessage("Target name saved.")
    } catch (error) {
      const failure = classifyUiError(error)
      setActionError(failure.message)
    } finally {
      setSavingTargetId(null)
    }
  }

  const requestDelete = (networkId: string) => {
    setConfirmingDeleteNetworkId(networkId)
    setConfirmingForceDeleteNetworkId(null)
    setDeleteBlocked(null)
    setActionError(null)
    setActionMessage(null)
  }

  const cancelDelete = () => {
    setConfirmingDeleteNetworkId(null)
    setConfirmingForceDeleteNetworkId(null)
    setDeleteBlocked(null)
  }

  const runDelete = async (networkId: string, force?: boolean) => {
    setDeletingNetworkId(networkId)
    setDeleteBlocked(null)
    setActionError(null)
    setActionMessage(null)
    try {
      const response = await deleteLegacyNetwork(networkId, force)
      if (selectedNetworkId === networkId) {
        setSelectedNetworkId("")
      }
      setRefreshKey((value) => value + 1)
      setConfirmingDeleteNetworkId(null)
      setConfirmingForceDeleteNetworkId(null)
      setActionMessage(
        response.forced
          ? `Subnet '${response.networkName}' force deleted. Removed ${response.deletedTargets} targets, ${response.deletedPlans} plans, ${response.deletedJobs} jobs, detached ${response.detachedResults} results, and detached ${response.detachedReports} reports.`
          : `Subnet '${response.networkName}' deleted with ${response.deletedTargets} target rows removed.`,
      )
    } catch (error) {
      const blocked = parseLegacyNetworkDeletionBlocked(error)
      if (blocked) {
        setDeleteBlocked(blocked)
        setConfirmingDeleteNetworkId(networkId)
        setConfirmingForceDeleteNetworkId(null)
        setActionError(blocked.detail)
      } else {
        const failure = classifyUiError(error)
        setActionError(failure.message)
      }
    } finally {
      setDeletingNetworkId(null)
    }
  }

  const confirmDelete = async (networkId: string) => runDelete(networkId)

  const requestForceDelete = (networkId: string) => {
    setConfirmingForceDeleteNetworkId(networkId)
    setActionError(null)
    setActionMessage(null)
  }

  const confirmForceDelete = async (networkId: string) => runDelete(networkId, true)

  if (networksQuery.isLoading || targetsQuery.isLoading) {
    return <LoadingState label="Loading servers" />
  }

  if (networksQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(networksQuery.error)} fallbackTitle="Servers unavailable" />
  }

  if (targetsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(targetsQuery.error)} fallbackTitle="Servers unavailable" />
  }

  const clearFocusedTarget = () => {
    router.replace(pathname)
  }

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <p className="wb-kicker">Servers</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Discover subnets and manage target inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover subnet targets, keep inventory current, and maintain the SSH defaults used by host-based scans.
        </p>
      </header>

      <article className="wb-panel space-y-5">
        <div>
          <p className="wb-kicker">Create Subnet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the subnet, define host-scan credentials, and keep discovery ranges ready for repeat sweeps.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.15fr)_minmax(260px,1.2fr)_minmax(180px,0.8fr)_minmax(280px,1fr)_minmax(220px,0.95fr)_minmax(220px,1fr)]">
            <Input placeholder="Subnet name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="CIDR block (for example 172.165.50.0/24)" value={form.cidrBlock} onChange={(event) => setForm((current) => ({ ...current, cidrBlock: event.target.value }))} />
            <Input placeholder="SSH user" value={form.sshUser} onChange={(event) => setForm((current) => ({ ...current, sshUser: event.target.value }))} />
            <Input placeholder="SSH key path on IOC_MGR" value={form.sshKeyPath} onChange={(event) => setForm((current) => ({ ...current, sshKeyPath: event.target.value }))} />
            <Input type="password" placeholder="SSH password (optional fallback)" value={form.sshPassword} onChange={(event) => setForm((current) => ({ ...current, sshPassword: event.target.value }))} />
            <Input placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={submitNetwork} disabled={submitting}>{submitting ? "Saving..." : "Save Subnet"}</Button>
            {actionMessage ? <p className="text-sm text-emerald-300">{actionMessage}</p> : null}
            {actionError ? <p className="text-sm text-rose-300">{actionError}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Input placeholder="Optional discovery start IP" value={rangeStartIp} onChange={(event) => setRangeStartIp(event.target.value)} />
          <Input placeholder="Optional discovery end IP" value={rangeEndIp} onChange={(event) => setRangeEndIp(event.target.value)} />
        </div>
      </article>

      <article className="wb-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="wb-kicker">Subnets</p>
            <p className="mt-1 text-sm text-muted-foreground">Each subnet maps to one `NETWORK` row and discovery writes reachable hosts into `Target`.</p>
          </div>
          {selectedNetworkId ? (
            <Button variant="outline" onClick={() => setSelectedNetworkId("")}>Show all targets</Button>
          ) : null}
        </div>

        {networks.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No subnets yet" description="Create the first subnet to begin discovery and target inventory." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 2xl:grid-cols-2">
            {networks.map((network) => (
              <div key={network.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{network.name}</p>
                    <p className="text-sm text-muted-foreground">{network.cidrBlock}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{network.onlineTargets}/{network.totalTargets} online</p>
                    <p>{network.lastSweepAtUtc ? new Date(network.lastSweepAtUtc).toLocaleString() : "Never scanned"}</p>
                  </div>
                </div>
                {editingNetworkId === network.id ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-black/10 p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(180px,0.75fr)] 2xl:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(180px,0.75fr)_minmax(280px,1fr)_minmax(220px,0.95fr)_minmax(220px,1fr)]">
                      <Input placeholder="Subnet name" value={networkForm.name} onChange={(event) => setNetworkForm((current) => ({ ...current, name: event.target.value }))} />
                      <Input placeholder="CIDR block" value={networkForm.cidrBlock} onChange={(event) => setNetworkForm((current) => ({ ...current, cidrBlock: event.target.value }))} />
                      <Input placeholder="SSH user" value={networkForm.sshUser} onChange={(event) => setNetworkForm((current) => ({ ...current, sshUser: event.target.value }))} />
                      <Input placeholder="SSH key path on IOC_MGR" value={networkForm.sshKeyPath} onChange={(event) => setNetworkForm((current) => ({ ...current, sshKeyPath: event.target.value, clearSshPassword: current.clearSshPassword }))} />
                      <Input type="password" placeholder="Replace SSH password" value={networkForm.sshPassword} onChange={(event) => setNetworkForm((current) => ({ ...current, sshPassword: event.target.value, clearSshPassword: false }))} />
                      <Input placeholder="Notes" value={networkForm.notes} onChange={(event) => setNetworkForm((current) => ({ ...current, notes: event.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={networkForm.clearSshPassword}
                        onChange={(event) => setNetworkForm((current) => ({ ...current, clearSshPassword: event.target.checked, sshPassword: event.target.checked ? "" : current.sshPassword }))}
                      />
                      Clear stored SSH password
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={() => saveNetwork(network.id)} disabled={savingNetworkId === network.id}>
                        {savingNetworkId === network.id ? "Saving..." : "Save Settings"}
                      </Button>
                      <Button variant="ghost" onClick={cancelEditNetwork} disabled={savingNetworkId === network.id}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 text-xs text-muted-foreground">
                      <p>SSH user: {network.sshUser ?? "Not set"}</p>
                      <p>SSH key: {network.sshKeyPath ?? "Not set"}</p>
                      <p>SSH password: {network.hasSshPassword ? "Configured" : "Not set"}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => setSelectedNetworkId(network.id)}>View Targets</Button>
                      <Button onClick={() => runDiscovery(network.id)} disabled={discoveringId === network.id}>
                        {discoveringId === network.id ? "Discovering..." : "Run Discovery"}
                      </Button>
                      <Button variant="outline" onClick={() => beginEditNetwork(network)}>
                        Edit Settings
                      </Button>
                      {confirmingDeleteNetworkId === network.id ? (
                        <>
                          <Button
                            variant="destructive"
                            onClick={() => confirmDelete(network.id)}
                            disabled={deletingNetworkId === network.id}
                          >
                            {deletingNetworkId === network.id ? "Deleting..." : "Confirm Delete"}
                          </Button>
                          <Button variant="ghost" onClick={cancelDelete} disabled={deletingNetworkId === network.id}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="destructive" onClick={() => requestDelete(network.id)}>
                          Delete Subnet
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {deleteBlocked?.networkId === network.id ? (
                  <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                    <p className="font-medium">{deleteBlocked.title}</p>
                    <p className="mt-1 text-xs text-rose-100/85">{deleteBlocked.detail}</p>
                    <ul className="mt-2 space-y-1 text-xs text-rose-100/85">
                      {deleteBlocked.blockers.map((blocker) => (
                        <li key={blocker.category}>
                          {blocker.category}: {blocker.count} - {blocker.message}
                        </li>
                      ))}
                    </ul>
                    {confirmingForceDeleteNetworkId === network.id ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-rose-300/20 bg-black/15 p-3 text-xs text-rose-100/90">
                        <p>
                          Force delete will remove this subnet, its target inventory, and dependent plans/jobs. Historical results and reports will remain, but they will be detached from the deleted subnet and targets.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => confirmForceDelete(network.id)}
                            disabled={deletingNetworkId === network.id}
                          >
                            {deletingNetworkId === network.id ? "Force deleting..." : "Confirm Force Delete"}
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirmingForceDeleteNetworkId(null)} disabled={deletingNetworkId === network.id}>
                            Cancel Force Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Button variant="destructive" onClick={() => requestForceDelete(network.id)} disabled={deletingNetworkId === network.id}>
                          Force Delete Anyway
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="wb-panel">
        <p className="wb-kicker">Targets</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedNetworkId ? "Showing targets for the selected subnet." : "Showing targets across all subnets."}
        </p>
        {focusedTarget ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <div>
              <p className="font-medium">Focused target</p>
              <p className="text-xs text-sky-100/85">
                {focusedTarget.displayName ?? focusedTarget.hostname ?? focusedTarget.ipAddress} - {focusedTarget.ipAddress}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={clearFocusedTarget}>
              Clear focus
            </Button>
          </div>
        ) : null}
        {targets.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No targets yet" description="Run discovery on a subnet to populate the target inventory." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">IP</th>
                  <th className="pb-3">Subnet</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">OS</th>
                  <th className="pb-3">Last Sweep</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr
                    key={target.id}
                    className={`border-t border-border/50 ${target.id === focusedTargetId ? "bg-sky-500/10 ring-1 ring-inset ring-sky-300/20" : ""}`}
                  >
                    <td className="py-3">
                      {editingTargetId === target.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingDisplayName}
                            onChange={(event) => setEditingDisplayName(event.target.value)}
                            placeholder={target.hostname ?? "Unknown host"}
                            className="h-9"
                          />
                          <Button size="sm" onClick={() => saveRename(target.id)} disabled={savingTargetId === target.id}>
                            {savingTargetId === target.id ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelRename} disabled={savingTargetId === target.id}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {target.displayName ?? target.hostname ?? "Unknown host"}
                          </div>
                          {target.displayName && target.hostname ? (
                            <div className="text-xs text-muted-foreground">Detected hostname: {target.hostname}</div>
                          ) : null}
                          <div>
                            <Button size="sm" variant="ghost" className="h-auto px-0 py-0 text-xs" onClick={() => beginRename(target.id, target.displayName)}>
                              {target.displayName ? "Rename" : "Name target"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs">{target.ipAddress}</td>
                    <td className="py-3">{target.networkName}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${target.status === "Online" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                        {target.status}
                      </span>
                    </td>
                    <td className="py-3">{formatOsLabel(target.targetOsType)}</td>
                    <td className="py-3">{target.lastSweepAtUtc ? new Date(target.lastSweepAtUtc).toLocaleString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
