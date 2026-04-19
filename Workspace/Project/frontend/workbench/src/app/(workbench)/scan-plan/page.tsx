"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clock3, FolderSearch } from "lucide-react"
import { ScannerFamilyBadge, ScannerFamilyMark } from "@/components/workbench/scanner-family-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import {
  cloneLegacyPlan,
  createLegacyPlan,
  deleteLegacyPlan,
  listLegacyNetworks,
  listLegacyPlans,
  listLegacyRulePresets,
  listLegacyTargets,
  runLegacyPlan,
  updateLegacyPlan,
  type LegacyPipelineScanPlan,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const FAMILIES = ["yara", "sigma", "snort", "suricata"] as const
const PLAN_STATUSES = ["Draft", "Active", "Paused"] as const
const SCHEDULE_TYPES = ["Manual", "Interval", "Daily", "Weekly"] as const
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const

type ScannerFamily = (typeof FAMILIES)[number]
type ResolvedTargetOs = "windows" | "linux"
type NetworkMode = "hunt" | "pcap"

const SCANNER_METADATA = {
  yara: {
    title: "YARA",
    description: "File and malware signature sweep",
    executionHint: "SSH / host",
  },
  sigma: {
    title: "SIGMA",
    description: "Windows EVTX and constrained Linux log detection",
    executionHint: "SSH / host",
  },
  snort: {
    title: "SNORT",
    description: "Recurring sensor hunt or offline PCAP analysis",
    executionHint: "Network",
  },
  suricata: {
    title: "SURICATA",
    description: "Recurring sensor hunt or offline PCAP analysis",
    executionHint: "Network",
  },
} as const

function normalizeTargetOs(value: string | null | undefined): ResolvedTargetOs | null {
  const normalized = value?.trim().toLowerCase()
  return normalized === "windows" || normalized === "linux" ? normalized : null
}

function isPositiveInteger(value: string) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

function isWindowsAbsolutePath(value: string) {
  return /^[a-zA-Z]:\\/.test(value.trim())
}

function isPosixAbsolutePath(value: string) {
  return value.trim().startsWith("/")
}

function isPcapPath(value: string) {
  return /\.(pcap|pcapng)$/i.test(value.trim())
}

function buildPlanOptionKey(scannerFamily: ScannerFamily, optionKey: string) {
  return `${scannerFamily}.${optionKey}`
}

function getPlanOption(
  options: Record<string, string | null> | undefined,
  scannerFamily: ScannerFamily,
  optionKey: string,
) {
  return options?.[buildPlanOptionKey(scannerFamily, optionKey)] ?? ""
}

function toggleScannerFamilySelection(selectedFamilies: string[], family: ScannerFamily) {
  if (selectedFamilies.includes(family)) {
    return selectedFamilies.filter((value) => value !== family)
  }

  if (family === "snort") {
    return [...selectedFamilies.filter((value) => value !== "suricata"), family]
  }

  if (family === "suricata") {
    return [...selectedFamilies.filter((value) => value !== "snort"), family]
  }

  return [...selectedFamilies, family]
}

function formatScheduleSummary(
  scheduleType: string,
  schedule: Record<string, string | null | undefined>,
) {
  switch (scheduleType) {
    case "Interval":
      return `Every ${schedule.intervalMinutes ?? "?"} minutes`
    case "Daily":
      return `Daily at ${schedule.hourUtc ?? "?"}:${(schedule.minuteUtc ?? "0").padStart(2, "0")} UTC`
    case "Weekly":
      return `${schedule.dayOfWeek ?? "Unknown day"} at ${schedule.hourUtc ?? "?"}:${(schedule.minuteUtc ?? "0").padStart(2, "0")} UTC`
    default:
      return "Manual only"
  }
}

function createEmptyForm() {
  return {
    name: "",
    selectedFamilies: ["yara"] as string[],
    status: "Draft",
    scheduleType: "Manual",
    notes: "",
    intervalMinutes: "60",
    hourUtc: "2",
    minuteUtc: "0",
    dayOfWeek: "Monday",
    selectedNetworkIds: [] as string[],
    selectedTargetIds: [] as string[],
    rulePathsByFamily: {
      yara: "",
      sigma: "",
      snort: "",
      suricata: "",
    } satisfies Record<ScannerFamily, string>,
    yaraWindowsScanPath: "",
    yaraLinuxScanPath: "",
    sigmaMinutesBack: "60",
    snortMode: "hunt" as NetworkMode,
    snortMinutesBack: "60",
    snortPcapPath: "",
    suricataMode: "hunt" as NetworkMode,
    suricataMinutesBack: "60",
    suricataPcapPath: "",
  }
}

function buildPlanBody(form: ReturnType<typeof createEmptyForm>, actorUserId: string) {
  const selectedFamilies = form.selectedFamilies as ScannerFamily[]
  const options: Record<string, string | null> = {}

  if (form.notes.trim()) {
    options.notes = form.notes.trim()
  }

  if (selectedFamilies.includes("yara")) {
    options[buildPlanOptionKey("yara", "windowsScanPath")] = form.yaraWindowsScanPath.trim() || null
    options[buildPlanOptionKey("yara", "linuxScanPath")] = form.yaraLinuxScanPath.trim() || null
  }

  if (selectedFamilies.includes("sigma")) {
    options[buildPlanOptionKey("sigma", "minutesBack")] = form.sigmaMinutesBack.trim() || null
  }

  if (selectedFamilies.includes("snort")) {
    options[buildPlanOptionKey("snort", "snortMode")] = form.snortMode
    options[buildPlanOptionKey("snort", "minutesBack")] = form.snortMode === "hunt" ? form.snortMinutesBack.trim() || null : null
    options[buildPlanOptionKey("snort", "pcapPath")] = form.snortMode === "pcap" ? form.snortPcapPath.trim() || null : null
  }

  if (selectedFamilies.includes("suricata")) {
    options[buildPlanOptionKey("suricata", "suricataMode")] = form.suricataMode
    options[buildPlanOptionKey("suricata", "minutesBack")] = form.suricataMode === "hunt" ? form.suricataMinutesBack.trim() || null : null
    options[buildPlanOptionKey("suricata", "pcapPath")] = form.suricataMode === "pcap" ? form.suricataPcapPath.trim() || null : null
  }

  const rulePathsByFamily = selectedFamilies.reduce<Record<string, string | null>>((acc, family) => {
    acc[family] = form.rulePathsByFamily[family].trim() || null
    return acc
  }, {})

  return {
    name: form.name.trim(),
    scannerFamilies: selectedFamilies,
    status: form.status,
    scheduleType: form.scheduleType,
    rulePathsByFamily,
    notes: form.notes.trim() || null,
    actorUserId,
    networkIds: form.selectedNetworkIds,
    targetIds: form.selectedTargetIds,
    schedule:
      form.scheduleType === "Interval"
        ? { intervalMinutes: form.intervalMinutes.trim() || null }
        : form.scheduleType === "Daily"
          ? { hourUtc: form.hourUtc.trim() || null, minuteUtc: form.minuteUtc.trim() || null }
          : form.scheduleType === "Weekly"
            ? { hourUtc: form.hourUtc.trim() || null, minuteUtc: form.minuteUtc.trim() || null, dayOfWeek: form.dayOfWeek }
            : {},
    options,
  }
}

function hydrateFormFromPlan(plan: LegacyPipelineScanPlan) {
  const next = createEmptyForm()
  const selectedFamilies = plan.scannerFamilies.filter((family): family is ScannerFamily => FAMILIES.includes(family as ScannerFamily))
  return {
    ...next,
    name: plan.name,
    selectedFamilies: selectedFamilies.length > 0 ? selectedFamilies : ["yara"],
    status: plan.status,
    scheduleType: plan.scheduleType,
    notes: plan.notes ?? "",
    intervalMinutes: plan.schedule.intervalMinutes ?? next.intervalMinutes,
    hourUtc: plan.schedule.hourUtc ?? next.hourUtc,
    minuteUtc: plan.schedule.minuteUtc ?? next.minuteUtc,
    dayOfWeek: plan.schedule.dayOfWeek ?? next.dayOfWeek,
    selectedNetworkIds: plan.networkIds,
    selectedTargetIds: plan.targetIds,
    rulePathsByFamily: {
      yara: plan.rulePathsByFamily.yara ?? "",
      sigma: plan.rulePathsByFamily.sigma ?? "",
      snort: plan.rulePathsByFamily.snort ?? "",
      suricata: plan.rulePathsByFamily.suricata ?? "",
    },
    yaraWindowsScanPath: getPlanOption(plan.options, "yara", "windowsScanPath"),
    yaraLinuxScanPath: getPlanOption(plan.options, "yara", "linuxScanPath"),
    sigmaMinutesBack: getPlanOption(plan.options, "sigma", "minutesBack") || next.sigmaMinutesBack,
    snortMode: (getPlanOption(plan.options, "snort", "snortMode") as NetworkMode) || next.snortMode,
    snortMinutesBack: getPlanOption(plan.options, "snort", "minutesBack") || next.snortMinutesBack,
    snortPcapPath: getPlanOption(plan.options, "snort", "pcapPath"),
    suricataMode: (getPlanOption(plan.options, "suricata", "suricataMode") as NetworkMode) || next.suricataMode,
    suricataMinutesBack: getPlanOption(plan.options, "suricata", "minutesBack") || next.suricataMinutesBack,
    suricataPcapPath: getPlanOption(plan.options, "suricata", "pcapPath"),
  }
}

export default function ScanPlanPage() {
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "team-dev"
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [form, setForm] = useState(createEmptyForm())

  const networksQuery = useWorkbenchQuery(["legacy-pipeline", "plan-networks"], (signal) => listLegacyNetworks(signal))
  const targetsQuery = useWorkbenchQuery(["legacy-pipeline", "plan-targets"], (signal) => listLegacyTargets(undefined, signal))
  const presetsQuery = useWorkbenchQuery(["legacy-pipeline", "rule-presets"], (signal) => listLegacyRulePresets(signal))
  const plansQuery = useWorkbenchQuery(["legacy-pipeline", "plans", refreshKey], (signal) => listLegacyPlans(signal))

  const presetPathsByFamily = useMemo(() => {
    return FAMILIES.reduce<Record<ScannerFamily, string[]>>((acc, family) => {
      acc[family] = Array.from(
        new Set(
          presetsQuery.data?.find((item) => item.scannerFamily.toLowerCase() === family)?.paths ?? [],
        ),
      )
      return acc
    }, {
      yara: [],
      sigma: [],
      snort: [],
      suricata: [],
    })
  }, [presetsQuery.data])

  const resetForm = () => {
    setEditingId(null)
    setForm(createEmptyForm())
  }

  const selectedTargets = useMemo(() => {
    const selectedNetworkIds = new Set(form.selectedNetworkIds)
    const selectedTargetIds = new Set(form.selectedTargetIds)
    return (targetsQuery.data ?? []).filter((target) => selectedTargetIds.has(target.id) || selectedNetworkIds.has(target.networkId))
  }, [targetsQuery.data, form.selectedNetworkIds, form.selectedTargetIds])

  const selectedFamilies = form.selectedFamilies as ScannerFamily[]
  const yaraSelected = selectedFamilies.includes("yara")
  const sigmaSelected = selectedFamilies.includes("sigma")
  const snortSelected = selectedFamilies.includes("snort")
  const suricataSelected = selectedFamilies.includes("suricata")
  const networkFamilyConflict = snortSelected && suricataSelected

  const selectedYaraOs = Array.from(
    new Set(
      (yaraSelected ? selectedTargets : [])
        .map((target) => normalizeTargetOs(target.targetOsType))
        .filter((value): value is ResolvedTargetOs => value === "windows" || value === "linux"),
    ),
  )
  const yaraUnknownTargets = yaraSelected ? selectedTargets.filter((target) => !normalizeTargetOs(target.targetOsType)) : []
  const requiresWindowsYaraPath = yaraSelected && selectedYaraOs.includes("windows")
  const requiresLinuxYaraPath = yaraSelected && selectedYaraOs.includes("linux")

  const sigmaKnownOs = Array.from(
    new Set(
      (sigmaSelected ? selectedTargets : [])
        .map((target) => normalizeTargetOs(target.targetOsType))
        .filter((value): value is ResolvedTargetOs => value === "windows" || value === "linux"),
    ),
  )
  const sigmaUnknownTargets = sigmaSelected ? selectedTargets.filter((target) => !normalizeTargetOs(target.targetOsType)) : []
  const sigmaIncludesLinux = sigmaSelected && sigmaKnownOs.includes("linux")
  const sigmaMixedScope = sigmaSelected && sigmaKnownOs.includes("windows") && sigmaKnownOs.includes("linux")

  const snortHuntSelected = snortSelected && form.snortMode === "hunt"
  const snortPcapSelected = snortSelected && form.snortMode === "pcap"
  const suricataHuntSelected = suricataSelected && form.suricataMode === "hunt"
  const suricataPcapSelected = suricataSelected && form.suricataMode === "pcap"

  const validationMessages = [
    ...(form.name.trim().length === 0 ? ["Enter a plan name."] : []),
    ...(selectedFamilies.length === 0 ? ["Select at least one scanner."] : []),
    ...(form.selectedNetworkIds.length === 0 && form.selectedTargetIds.length === 0 ? ["Choose a subnet or at least one explicit target."] : []),
    ...(networkFamilyConflict ? ["Choose either Snort or Suricata for a network scan plan, not both."] : []),
    ...selectedFamilies.flatMap((family) =>
      form.rulePathsByFamily[family].trim().length === 0
        ? [`${SCANNER_METADATA[family].title} requires a host rule path on IOC_MGR.`]
        : [],
    ),
    ...(yaraUnknownTargets.length > 0 ? ["YARA plan targets must all have a discovered OS before the plan can be saved."] : []),
    ...(requiresWindowsYaraPath && !isWindowsAbsolutePath(form.yaraWindowsScanPath) ? ["Windows YARA scope requires a Windows scan path like C:\\IOC\\."] : []),
    ...(requiresLinuxYaraPath && !isPosixAbsolutePath(form.yaraLinuxScanPath) ? ["Linux YARA scope requires a POSIX scan path like /opt/ioc/."] : []),
    ...(sigmaUnknownTargets.length > 0 ? ["Sigma requires every selected target to have a discovered OS before the plan can be saved."] : []),
    ...(sigmaSelected && !isPositiveInteger(form.sigmaMinutesBack) ? ["Sigma requires Minutes back to be a positive integer."] : []),
    ...(snortHuntSelected && !isPositiveInteger(form.snortMinutesBack) ? ["Snort Hunt requires Minutes back to be a positive integer."] : []),
    ...(snortPcapSelected && (!form.snortPcapPath.trim() || !isPcapPath(form.snortPcapPath)) ? ["Snort PCAP requires a .pcap or .pcapng path on IOC_MGR."] : []),
    ...(suricataHuntSelected && !isPositiveInteger(form.suricataMinutesBack) ? ["Suricata Hunt requires Minutes back to be a positive integer."] : []),
    ...(suricataPcapSelected && (!form.suricataPcapPath.trim() || !isPcapPath(form.suricataPcapPath)) ? ["Suricata PCAP requires a .pcap or .pcapng path on IOC_MGR."] : []),
    ...(form.scheduleType === "Interval" && !isPositiveInteger(form.intervalMinutes) ? ["Interval schedules require a positive interval in minutes."] : []),
    ...((form.scheduleType === "Daily" || form.scheduleType === "Weekly") && !isPositiveInteger(form.minuteUtc) ? ["UTC minute must be a positive integer."] : []),
    ...((form.scheduleType === "Daily" || form.scheduleType === "Weekly") && (!Number.isInteger(Number(form.hourUtc)) || Number(form.hourUtc) < 0 || Number(form.hourUtc) > 23) ? ["UTC hour must be between 0 and 23."] : []),
  ]
  const canSubmit = validationMessages.length === 0

  const savePlan = async () => {
    setSaving(true)
    setErrorText(null)
    setMessage(null)
    try {
      const body = buildPlanBody(form, actorUserId)
      if (editingId) {
        await updateLegacyPlan(editingId, body)
        setMessage("Scan plan updated.")
      } else {
        await createLegacyPlan(body)
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

  const runPlanAction = async (planId: string) => {
    setRunningId(planId)
    setErrorText(null)
    setMessage(null)
    try {
      const result = await runLegacyPlan(planId, actorUserId)
      setMessage(`Plan queued ${result.jobs.length} scanner job${result.jobs.length === 1 ? "" : "s"} under one batch.`)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setRunningId(null)
    }
  }

  const clonePlanAction = async (planId: string) => {
    setCloningId(planId)
    setErrorText(null)
    setMessage(null)
    try {
      await cloneLegacyPlan(planId)
      setMessage("Plan cloned as a Draft copy.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setCloningId(null)
    }
  }

  const deletePlanAction = async (plan: LegacyPipelineScanPlan) => {
    if (!window.confirm(`Delete plan '${plan.name}'? Historical jobs will be preserved but detached from the plan.`)) {
      return
    }

    setDeletingId(plan.id)
    setErrorText(null)
    setMessage(null)
    try {
      await deleteLegacyPlan(plan.id)
      if (editingId === plan.id) {
        resetForm()
      }
      setMessage("Plan deleted.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setDeletingId(null)
    }
  }

  const togglePlanStatus = async (plan: LegacyPipelineScanPlan) => {
    setStatusUpdatingId(plan.id)
    setErrorText(null)
    setMessage(null)
    try {
      const nextStatus = plan.status === "Active" ? "Paused" : "Active"
      await updateLegacyPlan(plan.id, {
        name: plan.name,
        scannerFamilies: plan.scannerFamilies,
        status: nextStatus,
        scheduleType: plan.scheduleType,
        rulePathsByFamily: plan.rulePathsByFamily,
        notes: plan.notes ?? null,
        actorUserId,
        networkIds: plan.networkIds,
        targetIds: plan.targetIds,
        schedule: plan.schedule,
        options: plan.options,
      })
      setMessage(nextStatus === "Active" ? "Plan activated." : "Plan paused.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const startEditing = (plan: LegacyPipelineScanPlan) => {
    setEditingId(plan.id)
    setForm(hydrateFormFromPlan(plan))
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
          Store recurring multi-scanner plans with per-family rule paths, UTC cadence, target scope, and run-now support.
        </p>
      </header>

      <article className="wb-panel space-y-5">
        <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <div>
            <p className="wb-kicker">Scanner Families</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Choose one or more scanners</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plans can queue multiple scanner families under one schedule, but Snort and Suricata stay mutually exclusive.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {FAMILIES.map((family) => {
              const meta = SCANNER_METADATA[family]
              const selected = form.selectedFamilies.includes(family)
              return (
                <button
                  key={family}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      selectedFamilies: toggleScannerFamilySelection(current.selectedFamilies, family),
                    }))
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-cyan-300/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(103,232,249,0.2)]"
                      : "border-border/70 bg-background/40 hover:border-border hover:bg-surface-1/70"
                  }`}
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ScannerFamilyMark family={family} size="md" className={selected ? "ring-1 ring-cyan-300/25" : ""} />
                      <div>
                        <p className="text-base font-semibold">{meta.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    {selected ? <CheckCircle2 className="mt-0.5 size-4 text-cyan-200" /> : null}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Badge variant={selected ? "secondary" : "outline"}>{meta.executionHint}</Badge>
                    <span className="text-xs text-muted-foreground">{selected ? "Selected" : "Tap to add"}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedFamilies.length > 0 ? (
          <>
            <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <div>
                <p className="wb-kicker">Per-Scanner Rule Paths</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Store one host rule path per selected family</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plans are host-path only. Each selected family keeps its own rule source on IOC_MGR.
                </p>
              </div>
              <div className="grid gap-4 2xl:grid-cols-2">
                {selectedFamilies.map((family) => (
                  <div key={`rule-${family}`} className="rounded-xl border border-border/70 bg-background/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{SCANNER_METADATA[family].title}</p>
                        <p className="text-xs text-muted-foreground">Rule path on IOC_MGR</p>
                      </div>
                      <Badge variant="outline">{SCANNER_METADATA[family].executionHint}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
                      <Input
                        placeholder={family === "yara" ? "C:\\Rules\\yara\\" : family === "sigma" ? "C:\\Rules\\sigma\\" : `C:\\Rules\\${family}.rules`}
                        value={form.rulePathsByFamily[family]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rulePathsByFamily: {
                              ...current.rulePathsByFamily,
                              [family]: event.target.value,
                            },
                          }))
                        }
                      />
                      <select
                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                        value=""
                        onChange={(event) => {
                          const nextValue = event.target.value
                          if (!nextValue) {
                            return
                          }

                          setForm((current) => ({
                            ...current,
                            rulePathsByFamily: {
                              ...current.rulePathsByFamily,
                              [family]: nextValue,
                            },
                          }))
                        }}
                      >
                        <option value="">Preset path</option>
                        {presetPathsByFamily[family].map((path) => (
                          <option key={path} value={path}>{path}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <div>
                <p className="wb-kicker">Scanner Runtime Options</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Store only the options each selected family needs</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  YARA is OS-aware, Sigma requires known target OS, and network plans support Hunt or PCAP only.
                </p>
              </div>
              <div className="grid gap-4 2xl:grid-cols-2">
                {selectedFamilies.map((family) => (
                  <div key={`options-${family}`} className="rounded-xl border border-border/70 bg-background/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{SCANNER_METADATA[family].title}</p>
                        <p className="text-xs text-muted-foreground">{SCANNER_METADATA[family].description}</p>
                      </div>
                      <Badge variant="outline">{SCANNER_METADATA[family].executionHint}</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {family === "yara" ? (
                        <>
                          {selectedTargets.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                              Select a subnet or target first. The required YARA scan path fields depend on whether the selected hosts are Windows, Linux, or mixed.
                            </div>
                          ) : (
                            <>
                              {requiresWindowsYaraPath ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Windows scan path</label>
                                  <Input
                                    placeholder="C:\\IOC\\"
                                    value={form.yaraWindowsScanPath}
                                    onChange={(event) => setForm((current) => ({ ...current, yaraWindowsScanPath: event.target.value }))}
                                  />
                                </div>
                              ) : null}
                              {requiresLinuxYaraPath ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Linux scan path</label>
                                  <Input
                                    placeholder="/opt/ioc/"
                                    value={form.yaraLinuxScanPath}
                                    onChange={(event) => setForm((current) => ({ ...current, yaraLinuxScanPath: event.target.value }))}
                                  />
                                </div>
                              ) : null}
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                YARA plans do not allow one-time OS overrides. Every selected target must already have a discovered OS.
                              </div>
                            </>
                          )}
                        </>
                      ) : null}

                      {family === "sigma" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Minutes back</label>
                            <Input
                              placeholder="60"
                              value={form.sigmaMinutesBack}
                              onChange={(event) => setForm((current) => ({ ...current, sigmaMinutesBack: event.target.value }))}
                            />
                          </div>
                          <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                            {sigmaMixedScope
                              ? "Mixed Windows and Linux Sigma plans require a shared Linux-compatible Sigma rule source using detection.selection.keywords."
                              : sigmaIncludesLinux
                                ? "Linux Sigma plans accept only Linux-compatible Sigma YAML using detection.selection.keywords."
                                : "Windows-only Sigma plans still require all selected targets to have a discovered OS."}
                          </div>
                        </>
                      ) : null}

                      {family === "snort" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Snort mode</label>
                            <select
                              className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                              value={form.snortMode}
                              onChange={(event) => setForm((current) => ({ ...current, snortMode: event.target.value as NetworkMode }))}
                            >
                              <option value="hunt">Hunt</option>
                              <option value="pcap">PCAP</option>
                            </select>
                          </div>
                          {form.snortMode === "hunt" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Minutes back</label>
                              <Input
                                placeholder="60"
                                value={form.snortMinutesBack}
                                onChange={(event) => setForm((current) => ({ ...current, snortMinutesBack: event.target.value }))}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">PCAP path on IOC_MGR</label>
                              <Input
                                placeholder="C:\\Captures\\snort-test.pcap"
                                value={form.snortPcapPath}
                                onChange={(event) => setForm((current) => ({ ...current, snortPcapPath: event.target.value }))}
                              />
                            </div>
                          )}
                          <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                            Snort plans support recurring Hunt or offline PCAP analysis only. Quarantine remains an ad-hoc workflow.
                          </div>
                        </>
                      ) : null}

                      {family === "suricata" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Suricata mode</label>
                            <select
                              className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                              value={form.suricataMode}
                              onChange={(event) => setForm((current) => ({ ...current, suricataMode: event.target.value as NetworkMode }))}
                            >
                              <option value="hunt">Hunt</option>
                              <option value="pcap">PCAP</option>
                            </select>
                          </div>
                          {form.suricataMode === "hunt" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Minutes back</label>
                              <Input
                                placeholder="60"
                                value={form.suricataMinutesBack}
                                onChange={(event) => setForm((current) => ({ ...current, suricataMinutesBack: event.target.value }))}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">PCAP path on IOC_MGR</label>
                              <Input
                                placeholder="C:\\Captures\\suricata-test.pcap"
                                value={form.suricataPcapPath}
                                onChange={(event) => setForm((current) => ({ ...current, suricataPcapPath: event.target.value }))}
                              />
                            </div>
                          )}
                          <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                            Suricata plans support recurring Hunt or offline PCAP analysis only. Quarantine remains an ad-hoc workflow.
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface-2/35 p-4 text-sm text-muted-foreground">
            Select a scanner family to reveal per-scanner rule paths and runtime options.
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <div>
                <p className="wb-kicker">Schedule</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Keep cadence in UTC</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stored plans keep UTC cadence for interval, daily, and weekly runs.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan name</label>
                  <Input
                    placeholder="Morning Hunt Pack"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    {PLAN_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule type</label>
                  <select
                    className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                    value={form.scheduleType}
                    onChange={(event) => setForm((current) => ({ ...current, scheduleType: event.target.value }))}
                  >
                    {SCHEDULE_TYPES.map((scheduleType) => (
                      <option key={scheduleType} value={scheduleType}>{scheduleType}</option>
                    ))}
                  </select>
                </div>
                {form.scheduleType === "Interval" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interval minutes</label>
                    <Input
                      placeholder="60"
                      value={form.intervalMinutes}
                      onChange={(event) => setForm((current) => ({ ...current, intervalMinutes: event.target.value }))}
                    />
                  </div>
                ) : null}
                {form.scheduleType === "Daily" || form.scheduleType === "Weekly" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">UTC hour</label>
                      <Input
                        placeholder="2"
                        value={form.hourUtc}
                        onChange={(event) => setForm((current) => ({ ...current, hourUtc: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">UTC minute</label>
                      <Input
                        placeholder="0"
                        value={form.minuteUtc}
                        onChange={(event) => setForm((current) => ({ ...current, minuteUtc: event.target.value }))}
                      />
                    </div>
                  </>
                ) : null}
                {form.scheduleType === "Weekly" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UTC day</label>
                    <select
                      className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                      value={form.dayOfWeek}
                      onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))}
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-2 xl:col-span-2">
                  <label className="text-sm font-medium">Operator notes</label>
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-border/70 bg-surface-1 px-3 py-2 text-sm outline-none transition focus:border-cyan-300/60"
                    placeholder="Optional operating notes for the recurring pack"
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                Schedule preview: {formatScheduleSummary(form.scheduleType, {
                  intervalMinutes: form.intervalMinutes,
                  hourUtc: form.hourUtc,
                  minuteUtc: form.minuteUtc,
                  dayOfWeek: form.dayOfWeek,
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <div>
                <p className="wb-kicker">Scan Scope</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Choose subnets first, then refine with explicit targets</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plans keep one shared target scope across all selected scanner families.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/35 p-4">
                  <div className="flex items-center gap-2">
                    <FolderSearch className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Subnet scope</p>
                      <p className="text-xs text-muted-foreground">All discovered targets inside the selected subnets</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {networks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
                        No subnets found yet. Add and discover subnets in Servers first.
                      </div>
                    ) : (
                      networks.map((network) => {
                        const checked = form.selectedNetworkIds.includes(network.id)
                        return (
                          <label key={network.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/25 p-3 text-sm">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  selectedNetworkIds: event.target.checked
                                    ? [...current.selectedNetworkIds, network.id]
                                    : current.selectedNetworkIds.filter((value) => value !== network.id),
                                }))
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-medium">{network.name} ({network.cidrBlock})</p>
                              <p className="text-xs text-muted-foreground">
                                {network.onlineTargets}/{network.totalTargets} online
                              </p>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/35 p-4">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Explicit targets</p>
                      <p className="text-xs text-muted-foreground">Optional target refinement layered on top of subnet scope</p>
                    </div>
                  </div>
                  <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
                    {targets.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
                        No discovered targets yet.
                      </div>
                    ) : (
                      targets.map((target) => {
                        const checked = form.selectedTargetIds.includes(target.id)
                        const targetOs = normalizeTargetOs(target.targetOsType)
                        return (
                          <label key={target.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/25 p-3 text-sm">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  selectedTargetIds: event.target.checked
                                    ? [...current.selectedTargetIds, target.id]
                                    : current.selectedTargetIds.filter((value) => value !== target.id),
                                }))
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate font-medium">{target.displayName ?? target.hostname ?? target.ipAddress}</p>
                                <Badge variant="outline">{target.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {target.ipAddress} · {targetOs ? targetOs.toUpperCase() : "Unknown OS"} · {target.networkName}
                              </p>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <div>
                <p className="wb-kicker">Ready To Save</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Validate the recurring pack before saving</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plan validation mirrors the `Scans` surface, but recurring runs stay host-path only.
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-lg border border-border/70 bg-background/35 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Selected families</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFamilies.length > 0 ? selectedFamilies.map((family) => (
                      <ScannerFamilyBadge key={family} family={family} />
                    )) : (
                      <span className="text-sm text-muted-foreground">No scanners selected.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/35 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scope summary</p>
                  <p className="mt-2 text-sm">
                    {form.selectedNetworkIds.length} subnet{form.selectedNetworkIds.length === 1 ? "" : "s"} and {form.selectedTargetIds.length} explicit target{form.selectedTargetIds.length === 1 ? "" : "s"} selected.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Effective discovered targets in scope: {selectedTargets.length}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/35 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Validation</p>
                  {validationMessages.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-amber-100/90">
                      {validationMessages.map((item) => (
                        <li key={item} className="rounded-md border border-amber-300/25 bg-amber-500/10 px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 rounded-md border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90">
                      This plan is ready to save.
                    </div>
                  )}
                </div>
                {message ? (
                  <div className="rounded-md border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90">
                    {message}
                  </div>
                ) : null}
                {errorText ? (
                  <div className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorText}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={savePlan} disabled={!canSubmit || saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Plan"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving && !editingId}>
                  {editingId ? "Cancel Edit" : "Reset"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <section className="wb-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Stored Plans</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Recurring scan packs ready to run or schedule</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plans keep scanner families, per-family host rule paths, UTC cadence, and target scope together.
            </p>
          </div>
        </div>

        {plans.length === 0 ? (
          <EmptyState
            title="No scan plans yet"
            description="Create the first recurring pack above. Saved plans can be run now, paused, cloned, edited, or deleted."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-border/70 bg-surface-2/55 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold tracking-tight">{plan.name}</h4>
                      <Badge variant={plan.status === "Active" ? "secondary" : "outline"}>{plan.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatScheduleSummary(plan.scheduleType, plan.schedule)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.scannerFamilies.map((family) => (
                      <ScannerFamilyBadge key={`${plan.id}-${family}`} family={family} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-background/25 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scope</p>
                    <p className="mt-2 text-sm">
                      {plan.networkNames.length > 0 ? plan.networkNames.join(", ") : "No subnet scope"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.targetDisplayNames.length > 0 ? plan.targetDisplayNames.join(", ") : "No explicit target refinement"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/25 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Per-scanner rule paths</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {plan.scannerFamilies.map((family) => (
                        <p key={`${plan.id}-path-${family}`}>
                          <span className="font-medium">{SCANNER_METADATA[family as ScannerFamily]?.title ?? family.toUpperCase()}:</span>{" "}
                          <span className="text-muted-foreground">{plan.rulePathsByFamily[family] ?? "Not set"}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-background/25 p-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <p><span className="font-medium">Next run:</span> {plan.nextRunAtUtc ?? "Not scheduled"}</p>
                    <p><span className="font-medium">Last run:</span> {plan.lastRunAtUtc ?? "Never"}</p>
                  </div>
                  {plan.notes ? <p className="mt-2 text-muted-foreground">{plan.notes}</p> : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => runPlanAction(plan.id)} disabled={runningId === plan.id}>
                    {runningId === plan.id ? "Queueing..." : "Run Now"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEditing(plan)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePlanStatus(plan)}
                    disabled={statusUpdatingId === plan.id}
                  >
                    {statusUpdatingId === plan.id ? "Updating..." : plan.status === "Active" ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clonePlanAction(plan.id)}
                    disabled={cloningId === plan.id}
                  >
                    {cloningId === plan.id ? "Cloning..." : "Clone"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePlanAction(plan)}
                    disabled={deletingId === plan.id}
                  >
                    {deletingId === plan.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
