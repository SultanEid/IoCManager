"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import {
  createLegacyPlan,
  listLegacyNetworks,
  listLegacyPlans,
  listLegacyRulePresets,
  listLegacyTargets,
  runLegacyPlan,
  updateLegacyPlan,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const FAMILIES = ["yara", "sigma", "snort", "suricata"] as const
const PLAN_STATUSES = ["Draft", "Active", "Paused"] as const
const SCHEDULE_TYPES = ["Manual", "Interval", "Daily", "Weekly"] as const

export default function ScanPlanPage() {
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "team-dev"
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    scannerFamily: "yara",
    status: "Draft",
    scheduleType: "Manual",
    rulePath: "",
    rulePathPreset: "",
    notes: "",
    intervalMinutes: "60",
    hourUtc: "2",
    minuteUtc: "0",
    dayOfWeek: "Monday",
    selectedNetworkIds: [] as string[],
    selectedTargetIds: [] as string[],
  })

  const networksQuery = useWorkbenchQuery(["legacy-pipeline", "plan-networks"], (signal) => listLegacyNetworks(signal))
  const targetsQuery = useWorkbenchQuery(["legacy-pipeline", "plan-targets"], (signal) => listLegacyTargets(undefined, signal))
  const presetsQuery = useWorkbenchQuery(["legacy-pipeline", "rule-presets"], (signal) => listLegacyRulePresets(signal))
  const plansQuery = useWorkbenchQuery(["legacy-pipeline", "plans", refreshKey], (signal) => listLegacyPlans(signal))

  const familyPresetOptions = useMemo(
    () => presetsQuery.data?.find((item) => item.scannerFamily.toLowerCase() === form.scannerFamily)?.paths ?? [],
    [presetsQuery.data, form.scannerFamily],
  )

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: "",
      scannerFamily: "yara",
      status: "Draft",
      scheduleType: "Manual",
      rulePath: "",
      rulePathPreset: "",
      notes: "",
      intervalMinutes: "60",
      hourUtc: "2",
      minuteUtc: "0",
      dayOfWeek: "Monday",
      selectedNetworkIds: [],
      selectedTargetIds: [],
    })
  }

  const buildBody = () => ({
    name: form.name,
    scannerFamily: form.scannerFamily,
    status: form.status,
    scheduleType: form.scheduleType,
    rulePath: form.rulePath || null,
    rulePathPreset: form.rulePathPreset || null,
    notes: form.notes || null,
    actorUserId,
    networkIds: form.selectedNetworkIds,
    targetIds: form.selectedTargetIds,
    schedule:
      form.scheduleType === "Interval"
        ? { intervalMinutes: form.intervalMinutes }
        : form.scheduleType === "Daily"
          ? { hourUtc: form.hourUtc, minuteUtc: form.minuteUtc }
          : form.scheduleType === "Weekly"
            ? { hourUtc: form.hourUtc, minuteUtc: form.minuteUtc, dayOfWeek: form.dayOfWeek }
            : {},
    options: { notes: form.notes || null },
  })

  const savePlan = async () => {
    setSaving(true)
    setErrorText(null)
    setMessage(null)
    try {
      if (editingId) {
        await updateLegacyPlan(editingId, buildBody())
        setMessage("Scan plan updated.")
      } else {
        await createLegacyPlan(buildBody())
        setMessage("Scan plan created.")
      }
      resetForm()
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setSaving(false)
    }
  }

  const runPlan = async (planId: string) => {
    setRunningId(planId)
    setErrorText(null)
    setMessage(null)
    try {
      await runLegacyPlan(planId, actorUserId)
      setMessage("Plan queued for execution.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setRunningId(null)
    }
  }

  const startEditing = (plan: NonNullable<typeof plansQuery.data>[number]) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      scannerFamily: plan.scannerFamily,
      status: plan.status,
      scheduleType: plan.scheduleType,
      rulePath: plan.rulePath ?? "",
      rulePathPreset: "",
      notes: plan.notes ?? "",
      intervalMinutes: plan.schedule.intervalMinutes ?? "60",
      hourUtc: plan.schedule.hourUtc ?? "2",
      minuteUtc: plan.schedule.minuteUtc ?? "0",
      dayOfWeek: plan.schedule.dayOfWeek ?? "Monday",
      selectedNetworkIds: plan.networkIds,
      selectedTargetIds: plan.targetIds,
    })
  }

  if (networksQuery.isLoading || targetsQuery.isLoading || presetsQuery.isLoading || plansQuery.isLoading) {
    return <LoadingState label="Loading scan plans" />
  }

  if (networksQuery.isError || targetsQuery.isError || presetsQuery.isError || plansQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(networksQuery.error ?? targetsQuery.error ?? presetsQuery.error ?? plansQuery.error)} fallbackTitle="Scan plan unavailable" />
  }

  const networks = networksQuery.data ?? []
  const targets = targetsQuery.data ?? []
  const plans = plansQuery.data ?? []

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <p className="wb-kicker">Scan Plan</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Create reusable scheduled scans</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Store recurring scan definitions with target scope, UTC cadence, rule paths, and run-now support.
        </p>
      </header>

      <article className="wb-panel space-y-5">
        <div className="space-y-1">
          <p className="wb-kicker">Plan Builder</p>
          <p className="text-sm text-muted-foreground">Define the scanner, cadence, rule path, and target scope in one pass.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.9fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
          <Input placeholder="Plan name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.scannerFamily} onChange={(event) => setForm((current) => ({ ...current, scannerFamily: event.target.value }))}>
            {FAMILIES.map((family) => <option key={family} value={family}>{family.toUpperCase()}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            {PLAN_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.scheduleType} onChange={(event) => setForm((current) => ({ ...current, scheduleType: event.target.value }))}>
            {SCHEDULE_TYPES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.9fr)]">
          <Input placeholder="Host rule path on IOC_MGR" value={form.rulePath} onChange={(event) => setForm((current) => ({ ...current, rulePath: event.target.value }))} />
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.rulePathPreset} onChange={(event) => setForm((current) => ({ ...current, rulePathPreset: event.target.value }))}>
            <option value="">Preset rule path</option>
            {familyPresetOptions.map((path) => <option key={path} value={path}>{path}</option>)}
          </select>
        </div>

        {form.scheduleType === "Interval" ? (
          <Input placeholder="Interval minutes" value={form.intervalMinutes} onChange={(event) => setForm((current) => ({ ...current, intervalMinutes: event.target.value }))} />
        ) : null}
        {form.scheduleType === "Daily" || form.scheduleType === "Weekly" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_minmax(220px,0.8fr)]">
            <Input placeholder="UTC hour" value={form.hourUtc} onChange={(event) => setForm((current) => ({ ...current, hourUtc: event.target.value }))} />
            <Input placeholder="UTC minute" value={form.minuteUtc} onChange={(event) => setForm((current) => ({ ...current, minuteUtc: event.target.value }))} />
            {form.scheduleType === "Weekly" ? (
              <Input placeholder="Day of week" value={form.dayOfWeek} onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))} />
            ) : null}
          </div>
        ) : null}

        <Input placeholder="Operator notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4 md:p-5">
            <p className="wb-kicker">Subnet Scope</p>
            <div className="mt-3 space-y-2">
              {networks.map((network) => (
                <label key={network.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedNetworkIds.includes(network.id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        selectedNetworkIds: event.target.checked
                          ? [...current.selectedNetworkIds, network.id]
                          : current.selectedNetworkIds.filter((value) => value !== network.id),
                      }))
                    }
                  />
                  <span>{network.name} ({network.cidrBlock})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4 md:p-5">
            <p className="wb-kicker">Explicit Targets</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {targets.map((target) => (
                <label key={target.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedTargetIds.includes(target.id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        selectedTargetIds: event.target.checked
                          ? [...current.selectedTargetIds, target.id]
                          : current.selectedTargetIds.filter((value) => value !== target.id),
                      }))
                    }
                  />
                  <span>{target.hostname ?? target.ipAddress} ({target.ipAddress})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={savePlan} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}</Button>
          {editingId ? <Button variant="outline" onClick={resetForm}>Cancel edit</Button> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
        </div>
      </article>

      <article className="wb-panel">
        <p className="wb-kicker">Stored Plans</p>
        {plans.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No scan plans yet" description="Create the first reusable plan to store schedule, scope, and rule path." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 2xl:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.scannerFamily.toUpperCase()} | {plan.scheduleType} | {plan.status}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Next: {plan.nextRunAtUtc ? new Date(plan.nextRunAtUtc).toLocaleString() : "Manual only"}</p>
                    <p>Last: {plan.lastRunAtUtc ? new Date(plan.lastRunAtUtc).toLocaleString() : "Never"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Rule path: {plan.rulePath ?? "Not set"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Subnets: {plan.networkNames.join(", ") || "None"} | Targets: {plan.targetDisplayNames.length}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => startEditing(plan)}>Edit</Button>
                  <Button onClick={() => runPlan(plan.id)} disabled={runningId === plan.id}>{runningId === plan.id ? "Queuing..." : "Run Now"}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
