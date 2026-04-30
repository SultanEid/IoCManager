"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronDown, ChevronRight, Clock3, FolderSearch } from "lucide-react"
import { ScannerFamilyBadge, ScannerFamilyMark } from "@/components/workbench/scanner-family-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import {
  createLegacyCustomScan,
  listLegacyJobs,
  listLegacyNetworks,
  listLegacyResults,
  listLegacyTargets,
  stopLegacyJob,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const FAMILIES = ["yara", "sigma", "snort", "suricata"] as const

const SCANNER_METADATA = {
  yara: {
    title: "YARA",
    description: "File and malware signature sweep",
    executionHint: "SSH / host",
    rulePlaceholder: "C:\\IOC\\ZombieVM\\zombie-lab-yara-probe.yar",
  },
  sigma: {
    title: "SIGMA",
    description: "Windows EVTX and constrained Linux log detection",
    executionHint: "SSH / host",
    rulePlaceholder: "C:\\Tools\\Tools\\Sigma\\rules\\windows\\process_creation",
  },
  snort: {
    title: "SNORT",
    description: "Sensor hunt, live watch, and offline PCAP analysis",
    executionHint: "Network",
    rulePlaceholder: "C:\\Tools\\Snort\\rules\\local.rules",
  },
  suricata: {
    title: "SURICATA",
    description: "Sensor hunt, live watch, and offline PCAP analysis",
    executionHint: "Network",
    rulePlaceholder: "C:\\Tools\\Suricata\\rules\\local.rules",
  },
} as const

type ResolvedTargetOs = "windows" | "linux"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

function buildLegacyAegisDocumentId(jobId: string) {
  return `legacy-scan-job:${jobId}`
}

function resolveScanOrigin(triggerType: string | null | undefined) {
  const normalized = triggerType?.trim().toLowerCase() ?? ""

  if (normalized === "manual") {
    return {
      label: "Manual",
      summary: "Started directly by a user.",
      badgeClassName: "border-cyan-300/35 bg-cyan-500/10 text-cyan-100",
    }
  }

  if (normalized === "plan" || normalized === "scheduled" || normalized === "schedule") {
    return {
      label: "Automatic",
      summary: "Queued automatically from a saved plan or schedule.",
      badgeClassName: "border-amber-300/35 bg-amber-500/10 text-amber-100",
    }
  }

  if (normalized === "analyst" || normalized.includes("agent") || normalized.includes("zira")) {
    return {
      label: "Agent",
      summary: "Queued by Zira or another agent-driven workflow.",
      badgeClassName: "border-emerald-300/35 bg-emerald-500/10 text-emerald-100",
    }
  }

  return {
    label: "System",
    summary: triggerType?.trim() ? `Backend trigger: ${triggerType.trim()}` : "Backend-created run.",
    badgeClassName: "border-border/70 bg-background/45 text-foreground",
  }
}

function buildLegacyAegisDocumentText(
  job: {
    id: string
    scannerFamily: string
    triggerType: string
    status: string
    summary: string
    rulePath: string | null
    executionMode: string | null
    queuedAtUtc: string
    startedAtUtc: string | null
    finishedAtUtc: string | null
    totalTargets: number
    completedTargets: number
    failedTargets: number
    noFindingsTargets: number
  },
  results: Array<{
    targetDisplay: string
    status: string
    findingsCount: number
    startedAtUtc: string | null
    finishedAtUtc: string | null
  }>,
) {
  const lines = [
    `Legacy scan job id: ${job.id}`,
    `Scanner family: ${job.scannerFamily}`,
    `Trigger type: ${job.triggerType}`,
    `Status: ${job.status}`,
    `Execution mode: ${job.executionMode ?? "Not recorded"}`,
    `Rule path: ${job.rulePath?.trim() ? job.rulePath : "Not recorded"}`,
    `Queued at UTC: ${job.queuedAtUtc}`,
    `Started at UTC: ${job.startedAtUtc ?? "Not recorded"}`,
    `Finished at UTC: ${job.finishedAtUtc ?? "Not recorded"}`,
    `Summary: ${job.summary}`,
    `Target counts: ${job.completedTargets}/${job.totalTargets} completed, ${job.failedTargets} failed, ${job.noFindingsTargets} no-findings.`,
    "Per-target results:",
    ...(results.length > 0
      ? results.map((result) => `${result.targetDisplay} | ${result.status} | findings=${result.findingsCount} | finished=${result.finishedAtUtc ?? result.startedAtUtc ?? "running"}`)
      : ["No per-target result rows were recorded for this legacy scan job."]),
  ]

  return lines.join("\n")
}

function normalizeTargetOs(value: string | null | undefined): ResolvedTargetOs | null {
  const normalized = value?.trim().toLowerCase()
  return normalized === "windows" || normalized === "linux" ? normalized : null
}

function normalizeWindowsPathInput(value: string) {
  return /^[a-zA-Z]:(?:\\|$)/.test(value) ? value.replace(/\\{2,}/g, "\\") : value
}

function toggleScannerFamilySelection(
  selectedFamilies: string[],
  family: (typeof FAMILIES)[number],
) {
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

export default function ScansPage() {
  const router = useRouter()
  const { session, signOut } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "system"
  const [refreshKey, setRefreshKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([])
  const [resultFilters, setResultFilters] = useState({
    scannerFamily: "all",
    status: "all",
  })
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [stoppingJobId, setStoppingJobId] = useState<string | null>(null)
  const [aegisBusyJobId, setAegisBusyJobId] = useState<string | null>(null)
  const [aegisBusyAction, setAegisBusyAction] = useState<"create" | "regenerate" | null>(null)
  const [aegisError, setAegisError] = useState<string | null>(null)
  const [form, setForm] = useState({
    selectedFamilies: ["yara"] as string[],
    ruleInputMode: "hostPath" as "hostPath" | "upload",
    rulePathsByFamily: {} as Record<string, string>,
    minutesBack: "60",
    snortMode: "hunt" as "hunt" | "quarantine" | "pcap",
    suricataMode: "hunt" as "hunt" | "quarantine" | "pcap",
    quarantineDurationMinutes: "15",
    pcapInputMode: "upload" as "upload" | "hostPath",
    pcapPath: "",
    pcapFile: null as File | null,
    windowsScanPath: "",
    linuxScanPath: "",
    selectedNetworkIds: [] as string[],
    selectedTargetIds: [] as string[],
    targetOsOverrides: {} as Record<string, ResolvedTargetOs>,
    files: [] as File[],
  })

  const networksQuery = useWorkbenchQuery(["legacy-pipeline", "scan-networks"], (signal) => listLegacyNetworks(signal))
  const targetsQuery = useWorkbenchQuery(["legacy-pipeline", "scan-targets"], (signal) => listLegacyTargets(undefined, signal))
  const jobsQuery = useWorkbenchQuery(["legacy-pipeline", "scan-jobs", refreshKey], (signal) => listLegacyJobs(signal))
  const aegisPlansQuery = useWorkbenchQuery(["legacy-pipeline", "aegis-plans"], (signal) => gateway.listReportMitigationPlans(signal))
  const resultsQuery = useWorkbenchQuery(
    [
      "legacy-pipeline",
      "scan-results",
      refreshKey,
      historyExpanded ? "expanded" : "compact",
    ],
    (signal) =>
      listLegacyResults(
        {
          limit: historyExpanded ? 160 : 40,
          includeOrphaned: false,
        },
        signal,
      ),
  )
  const networks = networksQuery.data ?? []
  const targets = targetsQuery.data ?? []
  const jobs = jobsQuery.data ?? []
  const aegisPlans = aegisPlansQuery.data?.items ?? []
  const results = resultsQuery.data ?? []

  const selectedTargets = useMemo(() => {
    const selectedNetworkIds = new Set(form.selectedNetworkIds)
    const selectedTargetIds = new Set(form.selectedTargetIds)
    return (targetsQuery.data ?? []).filter((target) => selectedTargetIds.has(target.id) || selectedNetworkIds.has(target.networkId))
  }, [targetsQuery.data, form.selectedNetworkIds, form.selectedTargetIds])

  const selectedFamilies = form.selectedFamilies as Array<(typeof FAMILIES)[number]>
  const offlineSelectedTargets = selectedTargets.filter((target) => target.status === "Offline")
  const yaraSelected = selectedFamilies.includes("yara")
  const sigmaSelected = selectedFamilies.includes("sigma")
  const selectedYaraTargets = useMemo(
    () =>
      selectedTargets.map((target) => {
        const storedOs = normalizeTargetOs(target.targetOsType)
        const overrideOs = form.targetOsOverrides[target.id]
        return {
          target,
          storedOs,
          overrideOs,
          effectiveOs: storedOs ?? overrideOs ?? null,
        }
      }),
    [selectedTargets, form.targetOsOverrides],
  )
  const yaraUnknownTargets = yaraSelected ? selectedYaraTargets.filter((item) => !item.effectiveOs) : []
  const yaraKnownOs = Array.from(
    new Set(
      (yaraSelected ? selectedYaraTargets : [])
        .map((item) => item.effectiveOs)
        .filter((value): value is ResolvedTargetOs => value === "windows" || value === "linux"),
    ),
  )
  const requiresWindowsYaraPath = yaraSelected && yaraKnownOs.includes("windows")
  const requiresLinuxYaraPath = yaraSelected && yaraKnownOs.includes("linux")
  const sigmaKnownOs = Array.from(
    new Set(
      (sigmaSelected ? selectedTargets : [])
        .map((target) => normalizeTargetOs(target.targetOsType))
        .filter((value): value is ResolvedTargetOs => value === "windows" || value === "linux"),
    ),
  )
  const sigmaUnknownTargets = sigmaSelected
    ? selectedTargets.filter((target) => !normalizeTargetOs(target.targetOsType))
    : []
  const sigmaIncludesLinux = sigmaSelected && sigmaKnownOs.includes("linux")
  const sigmaMixedScope = sigmaSelected && sigmaKnownOs.includes("windows") && sigmaKnownOs.includes("linux")
  const snortSelected = selectedFamilies.includes("snort")
  const snortMode = form.snortMode
  const snortHuntSelected = snortSelected && snortMode === "hunt"
  const snortQuarantineSelected = snortSelected && snortMode === "quarantine"
  const snortPcapSelected = snortSelected && snortMode === "pcap"
  const suricataSelected = selectedFamilies.includes("suricata")
  const suricataMode = form.suricataMode
  const suricataHuntSelected = suricataSelected && suricataMode === "hunt"
  const suricataQuarantineSelected = suricataSelected && suricataMode === "quarantine"
  const suricataPcapSelected = suricataSelected && suricataMode === "pcap"
  const networkFamilyConflict = snortSelected && suricataSelected
  const minutesBackIsValid = Number.isInteger(Number(form.minutesBack)) && Number(form.minutesBack) > 0
  const quarantineDurationIsValid = Number.isInteger(Number(form.quarantineDurationMinutes)) && Number(form.quarantineDurationMinutes) > 0 && Number(form.quarantineDurationMinutes) <= 120
  const hasNetworkPcapUpload = !!form.pcapFile
  const hasNetworkPcapHostPath = form.pcapPath.trim().length > 0
  const missingScope = form.selectedNetworkIds.length === 0 && form.selectedTargetIds.length === 0
  const windowsScanPath = normalizeWindowsPathInput(form.windowsScanPath).trim()
  const linuxScanPath = form.linuxScanPath.trim()
  const missingRuleFamilies = form.ruleInputMode === "hostPath"
    ? selectedFamilies.filter((family) => !form.rulePathsByFamily[family]?.trim())
    : []
  const missingUploadFiles = form.ruleInputMode === "upload" && form.files.length === 0
  const submitValidationMessages = [
    ...(selectedFamilies.length === 0 ? ["Select at least one scanner."] : []),
    ...(missingScope ? ["Choose a subnet or at least one explicit target."] : []),
    ...(missingRuleFamilies.length > 0 ? [`Enter a rule path for ${missingRuleFamilies.map((family) => SCANNER_METADATA[family].title).join(", ")} or switch to upload mode.`] : []),
    ...(missingUploadFiles ? ["Upload at least one rule file or zip bundle."] : []),
    ...(networkFamilyConflict ? ["Choose either Snort or Suricata for a network scan run, not both."] : []),
    ...(snortHuntSelected && !minutesBackIsValid ? ["Snort Hunt mode requires Minutes back to be a positive integer."] : []),
    ...(suricataHuntSelected && !minutesBackIsValid ? ["Suricata Hunt mode requires Minutes back to be a positive integer."] : []),
    ...(snortQuarantineSelected && !quarantineDurationIsValid ? ["Snort Quarantine mode requires a watch duration between 1 and 120 minutes."] : []),
    ...(suricataQuarantineSelected && !quarantineDurationIsValid ? ["Suricata Quarantine mode requires a watch duration between 1 and 120 minutes."] : []),
    ...(snortSelected && snortMode !== "hunt" && selectedFamilies.length > 1 ? ["Snort Quarantine and PCAP runs must be queued on their own in v1."] : []),
    ...(suricataSelected && suricataMode !== "hunt" && selectedFamilies.length > 1 ? ["Suricata Quarantine and PCAP runs must be queued on their own in v1."] : []),
    ...((snortPcapSelected || suricataPcapSelected) && hasNetworkPcapUpload && hasNetworkPcapHostPath ? ["Choose either a PCAP upload or a PCAP path on IOC_MGR, not both."] : []),
    ...(snortPcapSelected && !hasNetworkPcapUpload && !hasNetworkPcapHostPath ? ["Snort PCAP mode requires one PCAP source via upload or IOC_MGR host path."] : []),
    ...(suricataPcapSelected && !hasNetworkPcapUpload && !hasNetworkPcapHostPath ? ["Suricata PCAP mode requires one PCAP source via upload or IOC_MGR host path."] : []),
    ...(yaraSelected && yaraUnknownTargets.length > 0 ? ["Choose Windows or Linux for each selected YARA target whose OS is still unknown."] : []),
    ...(sigmaSelected && sigmaUnknownTargets.length > 0 ? ["Sigma requires every selected target to have a discovered OS before the run can be queued."] : []),
    ...(requiresWindowsYaraPath && !windowsScanPath ? ["Windows YARA scope requires a Windows scan path like C:\\IOC\\."] : []),
    ...(requiresLinuxYaraPath && !linuxScanPath ? ["Linux YARA scope requires a POSIX scan path like /opt/ioc/."] : []),
  ]
  const canSubmit = submitValidationMessages.length === 0
  const filteredJobs = jobs.filter((job) => {
    if (resultFilters.scannerFamily !== "all" && job.scannerFamily !== resultFilters.scannerFamily) {
      return false
    }

    if (resultFilters.status !== "all" && job.status !== resultFilters.status) {
      return false
    }

    return true
  })
  const visibleJobs = historyExpanded ? filteredJobs : filteredJobs.slice(0, 4)
  const resultsByJobId = useMemo(() => {
    const map = new Map<string, typeof results>()
    for (const result of results) {
      if (!result.jobId) {
        continue
      }

      const existing = map.get(result.jobId) ?? []
      existing.push(result)
      map.set(result.jobId, existing)
    }

    return map
  }, [results])

  const toggleSelection = (values: string[], value: string, checked: boolean) =>
    checked ? [...values, value] : values.filter((item) => item !== value)

  const submitScan = async () => {
    setSubmitting(true)
    setMessage(null)
    setErrorText(null)
    try {
      const options: Record<string, string | null> = {}
      if (selectedFamilies.includes("sigma") || snortHuntSelected || suricataHuntSelected) {
        options.minutesBack = form.minutesBack
      }
      if (snortSelected) {
        options.snortMode = form.snortMode
        if (snortQuarantineSelected) {
          options.quarantineDurationMinutes = form.quarantineDurationMinutes
        }
        if (snortPcapSelected && form.pcapInputMode === "hostPath") {
          options.pcapPath = form.pcapPath.trim()
        }
      }
      if (suricataSelected) {
        options.suricataMode = form.suricataMode
        if (suricataQuarantineSelected) {
          options.quarantineDurationMinutes = form.quarantineDurationMinutes
        }
        if (suricataPcapSelected && form.pcapInputMode === "hostPath") {
          options.pcapPath = form.pcapPath.trim()
        }
      }

      if (yaraSelected) {
        if (requiresWindowsYaraPath) {
          options.windowsScanPath = windowsScanPath
        }

        if (requiresLinuxYaraPath) {
          options.linuxScanPath = linuxScanPath
        }

        if (yaraKnownOs.length === 1) {
          options.scanPath = yaraKnownOs[0] === "windows" ? windowsScanPath : linuxScanPath
        }
      }

      const targetOsOverrides = Object.fromEntries(
        selectedYaraTargets
          .filter((item) => !item.storedOs && item.overrideOs)
          .map((item) => [item.target.id, item.overrideOs!]),
      )

      await createLegacyCustomScan({
        actorUserId,
        scannerFamilies: form.selectedFamilies,
        ruleInputMode: form.ruleInputMode,
        rulePathsByFamily: form.ruleInputMode === "hostPath"
          ? Object.fromEntries(selectedFamilies.map((family) => [family, form.rulePathsByFamily[family]?.trim() || null]))
          : undefined,
        networkIds: form.selectedNetworkIds,
        targetIds: form.selectedTargetIds,
        options,
        targetOsOverrides,
        files: form.files,
        pcapFile: form.pcapFile,
      })
      setMessage("Custom scan queued.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      if (failure.status === 401) {
        signOut()
        setErrorText("Session expired. Sign in again, then rerun the scan.")
      } else {
        setErrorText(failure.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const stopJob = async (jobId: string) => {
    setStoppingJobId(jobId)
    setMessage(null)
    setErrorText(null)
    try {
      const job = jobs.find((candidate) => candidate.id === jobId)
      await stopLegacyJob(jobId)
      setMessage(`${job?.scannerFamily === "suricata" ? "Suricata" : "Snort"} Quarantine session stopped.`)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setStoppingJobId(null)
    }
  }

  const navigateToAegisPlan = (planId: string) => {
    const destination = `/agents/aegis?plan=${encodeURIComponent(planId)}`
    if (typeof window !== "undefined") {
      window.location.assign(destination)
      return
    }

    router.push(destination)
  }

  const openExistingAegisPlan = (planId: string) => {
    navigateToAegisPlan(planId)
  }

  const createAegisPlanForJob = async (jobId: string, regenerate: boolean) => {
    setAegisBusyJobId(jobId)
    setAegisBusyAction(regenerate ? "regenerate" : "create")
    setAegisError(null)
    try {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) {
        throw new Error("The selected scan job could not be found.")
      }

      const response = isUuid(jobId)
        ? await gateway.generateReportMitigationFromScanJob(jobId, {
            includeWorkspaceContext: true,
            actorUserId,
            regenerate,
          })
        : await gateway.generateReportMitigation({
            sourceName: `${job.scannerFamily.toUpperCase()} legacy scan ${job.id}`,
            sourceType: "bulletin",
            documentId: buildLegacyAegisDocumentId(job.id),
            documentText: buildLegacyAegisDocumentText(job, resultsByJobId.get(job.id) ?? []),
            includeWorkspaceContext: true,
            actorUserId,
            regenerate,
          })
      if (!response.persistedMitigationReport) {
        throw new Error("Aegis did not return a saved mitigation plan.")
      }

        navigateToAegisPlan(response.persistedMitigationReport.id)
      } catch (error) {
        setAegisError(classifyUiError(error).message)
      } finally {
      setAegisBusyJobId(null)
      setAegisBusyAction(null)
    }
  }

  if (networksQuery.isLoading || targetsQuery.isLoading || jobsQuery.isLoading || aegisPlansQuery.isLoading || resultsQuery.isLoading) {
    return <LoadingState label="Loading scans" />
  }

  if (networksQuery.isError || targetsQuery.isError || jobsQuery.isError || aegisPlansQuery.isError || resultsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(networksQuery.error ?? targetsQuery.error ?? jobsQuery.error ?? aegisPlansQuery.error ?? resultsQuery.error)} fallbackTitle="Scans unavailable" />
  }

  const toggleExpandedJob = (jobId: string) =>
    setExpandedJobIds((current) => (current.includes(jobId) ? current.filter((value) => value !== jobId) : [...current, jobId]))

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <p className="wb-kicker">Scans</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Run one-time custom scans</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Run YARA, Sigma, Snort, and Suricata scans against discovered targets with scanner-specific rule sources and runtime options.
        </p>
      </header>

      <article className="wb-panel space-y-5">
        <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <div>
            <p className="wb-kicker">Scanner Families</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Choose one or more scanners</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Selected scanners unlock only the parameters they actually use, so the composer stays focused.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Snort and Suricata are mutually exclusive in one custom scan run. Choose one network engine per submission.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[repeat(4,minmax(0,1fr))]">
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
                      selectedFamilies: toggleScannerFamilySelection(
                        current.selectedFamilies,
                        family,
                      ),
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

        <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <div>
            <p className="wb-kicker">Rule Source</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Choose how this run gets its rules</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a compatible rule source for each selected scanner.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={form.ruleInputMode}
              onChange={(event) => setForm((current) => ({ ...current, ruleInputMode: event.target.value as "hostPath" | "upload" }))}
            >
              <option value="hostPath">Host rule path</option>
              <option value="upload">Upload file or zip</option>
            </select>
            <div className="space-y-2">
              {form.ruleInputMode === "hostPath" ? (
                selectedFamilies.length > 0 ? (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {selectedFamilies.map((family) => {
                      const meta = SCANNER_METADATA[family]
                      return (
                        <label key={family} className="space-y-1 rounded-lg border border-border/70 bg-surface-1/70 p-3">
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <ScannerFamilyMark family={family} size="sm" />
                            {meta.title} rules
                          </span>
                          <Input
                            placeholder={meta.rulePlaceholder}
                            value={form.rulePathsByFamily[family] ?? ""}
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
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border/70 bg-surface-1/70 p-3 text-sm text-muted-foreground">Select a scanner to assign its rule path.</p>
                )
              ) : (
                <>
                  <Input type="file" multiple onChange={(event) => setForm((current) => ({ ...current, files: Array.from(event.target.files ?? []) }))} />
                  <p className="text-xs text-muted-foreground">
                    Upload rule files or a zip bundle. The backend stages compatible files for each selected scanner.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {selectedFamilies.length > 0 ? (
          <div className="grid gap-3 2xl:grid-cols-2">
            {selectedFamilies.map((family) => {
              const meta = SCANNER_METADATA[family]
              const usesMinutesBack = family === "sigma" || family === "snort" || family === "suricata"
              const usesScanPath = family === "yara"
              return (
                <div key={family} className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ScannerFamilyMark family={family} size="md" />
                      <div>
                        <p className="text-base font-semibold">{meta.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{meta.executionHint}</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {usesMinutesBack ? (
                      family === "snort" ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Snort mode</label>
                            <select
                              className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                              value={form.snortMode}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  snortMode: event.target.value as "hunt" | "quarantine" | "pcap",
                                }))
                              }
                            >
                              <option value="hunt">Hunt</option>
                              <option value="quarantine">Quarantine</option>
                              <option value="pcap">PCAP</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                              Hunt searches recent sensor alerts, Quarantine runs a live watch, and PCAP analyzes one capture file against the selected target IPs.
                            </p>
                          </div>

                          {form.snortMode === "hunt" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Minutes back</label>
                              <Input
                                placeholder="Minutes back"
                                value={form.minutesBack}
                                onChange={(event) => setForm((current) => ({ ...current, minutesBack: event.target.value }))}
                              />
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                Hunt syncs the shared `.rules` file to the remote sensor, then filters recent alert log entries where the selected target IP appears as source or destination.
                              </div>
                            </div>
                          ) : null}

                          {form.snortMode === "quarantine" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Watch duration (minutes)</label>
                              <Input
                                placeholder="15"
                                value={form.quarantineDurationMinutes}
                                onChange={(event) => setForm((current) => ({ ...current, quarantineDurationMinutes: event.target.value }))}
                              />
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                Quarantine starts a live sensor watch that stays running until you stop it or the duration expires. Use Snort only for this run, and expect the selected target IPs to match as source or destination.
                              </div>
                            </div>
                          ) : null}

                          {form.snortMode === "pcap" ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">PCAP source</label>
                                <select
                                  className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                                  value={form.pcapInputMode}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      pcapInputMode: event.target.value as "upload" | "hostPath",
                                      pcapFile: event.target.value === "hostPath" ? null : current.pcapFile,
                                      pcapPath: event.target.value === "upload" ? "" : current.pcapPath,
                                    }))
                                  }
                                >
                                  <option value="upload">Upload PCAP</option>
                                  <option value="hostPath">PCAP path on IOC_MGR</option>
                                </select>
                              </div>
                              {form.pcapInputMode === "upload" ? (
                                <div className="space-y-2">
                                  <Input
                                    type="file"
                                    accept=".pcap,.pcapng"
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        pcapFile: event.target.files?.[0] ?? null,
                                      }))
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Upload one `.pcap` or `.pcapng` file. Findings count only when packet source or destination matches a selected target IP.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Input
                                    placeholder="C:\\Captures\\lab-snort-test.pcap"
                                    value={form.pcapPath}
                                    onChange={(event) => setForm((current) => ({ ...current, pcapPath: event.target.value }))}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Point to one `.pcap` or `.pcapng` file that already exists on IOC_MGR.
                                  </p>
                                </div>
                              )}
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                PCAP mode is offline analysis. The shared `.rules` source is applied locally, and unmatched packets are ignored because this workflow stays target-driven.
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : family === "suricata" ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Suricata mode</label>
                            <select
                              className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                              value={form.suricataMode}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  suricataMode: event.target.value as "hunt" | "quarantine" | "pcap",
                                }))
                              }
                            >
                              <option value="hunt">Hunt</option>
                              <option value="quarantine">Quarantine</option>
                              <option value="pcap">PCAP</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                              Hunt searches recent sensor alerts, Quarantine runs a live watch, and PCAP analyzes one capture file against the selected target IPs.
                            </p>
                          </div>

                          {form.suricataMode === "hunt" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Minutes back</label>
                              <Input
                                placeholder="Minutes back"
                                value={form.minutesBack}
                                onChange={(event) => setForm((current) => ({ ...current, minutesBack: event.target.value }))}
                              />
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                Hunt syncs the shared Suricata rule file to the remote sensor, then filters recent alert log entries where the selected target IP appears as source or destination.
                              </div>
                            </div>
                          ) : null}

                          {form.suricataMode === "quarantine" ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Watch duration (minutes)</label>
                              <Input
                                placeholder="15"
                                value={form.quarantineDurationMinutes}
                                onChange={(event) => setForm((current) => ({ ...current, quarantineDurationMinutes: event.target.value }))}
                              />
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                Quarantine starts a live sensor watch that stays running until you stop it or the duration expires. Use Suricata only for this run, and expect selected target IPs to match as source or destination.
                              </div>
                            </div>
                          ) : null}

                          {form.suricataMode === "pcap" ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">PCAP source</label>
                                <select
                                  className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                                  value={form.pcapInputMode}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      pcapInputMode: event.target.value as "upload" | "hostPath",
                                      pcapFile: event.target.value === "hostPath" ? null : current.pcapFile,
                                      pcapPath: event.target.value === "upload" ? "" : current.pcapPath,
                                    }))
                                  }
                                >
                                  <option value="upload">Upload PCAP</option>
                                  <option value="hostPath">PCAP path on IOC_MGR</option>
                                </select>
                              </div>
                              {form.pcapInputMode === "upload" ? (
                                <div className="space-y-2">
                                  <Input
                                    type="file"
                                    accept=".pcap,.pcapng"
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        pcapFile: event.target.files?.[0] ?? null,
                                      }))
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Upload one `.pcap` or `.pcapng` file. Findings count only when packet source or destination matches a selected target IP.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Input
                                    placeholder="C:\\Captures\\lab-suricata-test.pcap"
                                    value={form.pcapPath}
                                    onChange={(event) => setForm((current) => ({ ...current, pcapPath: event.target.value }))}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Point to one `.pcap` or `.pcapng` file that already exists on IOC_MGR.
                                  </p>
                                </div>
                              )}
                              <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                                PCAP mode is offline analysis. The shared Suricata rule source is applied to one capture file, and unmatched packets are ignored because this workflow stays target-driven.
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Minutes back</label>
                          <Input
                            placeholder="Minutes back"
                            value={form.minutesBack}
                            onChange={(event) => setForm((current) => ({ ...current, minutesBack: event.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Shared across the selected log and network scanners to limit how far back the search window goes.
                          </p>
                          {family === "sigma" ? (
                            <div className="rounded-lg border border-cyan-300/15 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
                              {sigmaMixedScope
                                ? "Mixed Windows and Linux Sigma runs require a shared Linux-compatible custom Sigma YAML rule source using detection.selection.keywords."
                                : sigmaIncludesLinux
                                  ? "Linux Sigma mode is limited to custom Sigma YAML rules that use detection.selection.keywords."
                                  : "Windows Sigma runs use the EVTX / Chainsaw path. Linux-compatible custom rules still work here, but they are only required when Linux targets are selected."}
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : null}
                    {usesScanPath ? (
                      <div className="space-y-2">
                        {selectedTargets.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                            Select a subnet or target first. The YARA scan path changes based on whether the selected hosts are Windows, Linux, or mixed.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {requiresWindowsYaraPath ? (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Windows scan path</label>
                                <Input
                                  aria-label="Windows scan path"
                                  placeholder={"C:\\IOC\\"}
                                  value={form.windowsScanPath}
                                  onChange={(event) => setForm((current) => ({ ...current, windowsScanPath: normalizeWindowsPathInput(event.target.value) }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Used for every selected Windows host in this YARA run.
                                </p>
                              </div>
                            ) : null}
                            {requiresLinuxYaraPath ? (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Linux scan path</label>
                                <Input
                                  aria-label="Linux scan path"
                                  placeholder="/opt/ioc/"
                                  value={form.linuxScanPath}
                                  onChange={(event) => setForm((current) => ({ ...current, linuxScanPath: event.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Used for every selected Linux host in this YARA run.
                                </p>
                              </div>
                            ) : null}
                            {yaraUnknownTargets.length > 0 ? (
                              <div className="space-y-3 rounded-lg border border-amber-300/20 bg-amber-500/10 p-3">
                                <div>
                                  <p className="text-sm font-medium text-amber-50">Selected targets requiring OS</p>
                                  <p className="text-xs text-amber-100/80">
                                    Choose a one-time OS only for targets that are still unknown in discovery. This does not overwrite stored inventory.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {yaraUnknownTargets.map(({ target, overrideOs }) => (
                                    <div key={target.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/35 p-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{target.displayName ?? target.hostname ?? "Unknown host"}</p>
                                        <p className="text-xs text-muted-foreground">{target.ipAddress}</p>
                                      </div>
                                      <select
                                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm md:w-40"
                                        value={overrideOs ?? ""}
                                        onChange={(event) =>
                                          setForm((current) => ({
                                            ...current,
                                            targetOsOverrides: {
                                              ...current.targetOsOverrides,
                                              [target.id]: event.target.value as ResolvedTargetOs,
                                            },
                                          }))
                                        }
                                      >
                                        <option value="">Choose OS</option>
                                        <option value="windows">Windows</option>
                                        <option value="linux">Linux</option>
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                    {!usesMinutesBack && !usesScanPath ? (
                      <div className="rounded-lg border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                        This scanner uses its assigned rule source and target scope.
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface-2/35 p-4 text-sm text-muted-foreground">
            Select a scanner family to reveal its runtime settings.
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <div>
            <p className="wb-kicker">Scan Scope</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Pick a subnet first, then refine with explicit targets</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Subnets drive the main selection flow. Explicit targets stay available when you want to narrow or supplement the scope.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-border/70 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="wb-kicker">Subnets</p>
                  <p className="mt-1 text-sm text-muted-foreground">Primary scope for discovery-backed scan runs.</p>
                </div>
                <FolderSearch className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-4 grid gap-3">
                {networks.map((network) => {
                  const selected = form.selectedNetworkIds.includes(network.id)
                  return (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          selectedNetworkIds: current.selectedNetworkIds.includes(network.id)
                            ? current.selectedNetworkIds.filter((value) => value !== network.id)
                            : [...current.selectedNetworkIds, network.id],
                        }))
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-cyan-300/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
                          : "border-border/70 bg-surface-1/70 hover:border-border hover:bg-surface-1"
                      }`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{network.name}</p>
                          <p className="text-xs text-muted-foreground">{network.cidrBlock}</p>
                        </div>
                        <Badge variant={selected ? "secondary" : "outline"}>
                          {network.onlineTargets}/{network.totalTargets} online
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{network.sshUser ? `SSH: ${network.sshUser}` : "SSH defaults not set"}</span>
                        <span>{selected ? "Included" : "Tap to include"}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="wb-kicker">Explicit Targets</p>
                  <p className="mt-1 text-sm text-muted-foreground">Optional refinement when you only want specific hosts.</p>
                </div>
                <Clock3 className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {targets.map((target) => {
                  const selected = form.selectedTargetIds.includes(target.id)
                  const targetName = target.displayName ?? target.hostname ?? "Unknown host"
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          selectedTargetIds: toggleSelection(current.selectedTargetIds, target.id, !selected),
                        }))
                      }
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-cyan-300/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
                          : "border-border/70 bg-surface-1/70 hover:border-border hover:bg-surface-1"
                      } ${target.status === "Offline" ? "opacity-80" : ""}`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{targetName}</p>
                          <p className="text-xs text-muted-foreground">{target.ipAddress}</p>
                        </div>
                        <Badge variant={target.status === "Online" ? "secondary" : "outline"}>{target.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{target.networkName}</span>
                        <span>{selected ? "Included" : "Optional"}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4 xl:flex-nowrap xl:gap-6">
            <div className="space-y-3">
              <div>
                <p className="wb-kicker">Ready To Run</p>
                <p className="mt-1 text-sm text-muted-foreground">Review the final scope before submitting the job batch.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFamilies.length > 0 ? (
                  selectedFamilies.map((family) => (
                    <ScannerFamilyBadge key={family} family={family} />
                  ))
                ) : (
                  <Badge variant="outline">No scanners selected</Badge>
                )}
                <Badge variant="outline">{form.ruleInputMode === "hostPath" ? "Host rule path" : "Upload bundle"}</Badge>
                {snortSelected ? <Badge variant="outline">Snort {form.snortMode}</Badge> : null}
                {suricataSelected ? <Badge variant="outline">Suricata {form.suricataMode}</Badge> : null}
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                <p>Selected subnets: <span className="font-medium text-foreground">{form.selectedNetworkIds.length}</span></p>
                <p>Explicit targets: <span className="font-medium text-foreground">{form.selectedTargetIds.length}</span></p>
                <p>Resolved targets: <span className="font-medium text-foreground">{selectedTargets.length}</span></p>
              </div>
            </div>
            <div className="min-w-[260px] space-y-2 rounded-xl border border-border/70 bg-background/35 p-3 text-sm xl:max-w-[320px]">
              <p className="font-medium">Run checks</p>
              <div className="space-y-1 text-muted-foreground">
                <p>{selectedFamilies.length > 0 ? "Scanners selected" : "No scanners selected yet"}</p>
                <p>{missingScope ? "No scan scope selected yet" : "Scan scope selected"}</p>
                <p>{missingRuleFamilies.length > 0 ? "Rule paths still required" : "Rule sources configured"}</p>
                {snortHuntSelected ? <p>{minutesBackIsValid ? "Snort Hunt window configured" : "Snort Hunt window still invalid"}</p> : null}
                {snortQuarantineSelected ? <p>{quarantineDurationIsValid ? "Snort Quarantine duration configured" : "Snort Quarantine duration still invalid"}</p> : null}
                {snortPcapSelected ? <p>{hasNetworkPcapUpload || hasNetworkPcapHostPath ? "Snort PCAP source configured" : "Snort PCAP source still required"}</p> : null}
                {suricataHuntSelected ? <p>{minutesBackIsValid ? "Suricata Hunt window configured" : "Suricata Hunt window still invalid"}</p> : null}
                {suricataQuarantineSelected ? <p>{quarantineDurationIsValid ? "Suricata Quarantine duration configured" : "Suricata Quarantine duration still invalid"}</p> : null}
                {suricataPcapSelected ? <p>{hasNetworkPcapUpload || hasNetworkPcapHostPath ? "Suricata PCAP source configured" : "Suricata PCAP source still required"}</p> : null}
              </div>
            </div>
          </div>
          {offlineSelectedTargets.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-100">
              {offlineSelectedTargets.length} selected target{offlineSelectedTargets.length === 1 ? "" : "s"} are offline. They remain selectable, but their executions may fail.
            </div>
          ) : null}
          {snortSelected ? (
            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
              {snortHuntSelected
                ? "Snort Hunt reads the recent sensor alert log, not the target host. Traffic must cross the monitored segment, and the selected target can match as either source or destination IP inside the recent alert window."
                : snortQuarantineSelected
                  ? "Snort Quarantine starts a live session. The run stays in Running until you stop it or the watch duration expires, and matching traffic can hit either the source or destination side of a selected target IP."
                  : "Snort PCAP analyzes one capture file offline on IOC_MGR. Findings only count when the packet source or destination matches a selected target IP."}
            </div>
          ) : null}
          {suricataSelected ? (
            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
              {suricataHuntSelected
                ? "Suricata Hunt reads the recent sensor alert log, not the target host. Traffic must cross the monitored segment, and the selected target can match as either source or destination IP inside the recent alert window."
                : suricataQuarantineSelected
                  ? "Suricata Quarantine starts a live session. The run stays in Running until you stop it or the watch duration expires, and matching traffic can hit either the source or destination side of a selected target IP."
                  : "Suricata PCAP analyzes one capture file offline on IOC_MGR. Findings only count when the packet source or destination matches a selected target IP."}
            </div>
          ) : null}
          {submitValidationMessages.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-amber-200">
              {submitValidationMessages.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={submitScan} disabled={submitting || !canSubmit}>{submitting ? "Queuing..." : "Run Custom Scan"}</Button>
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
          </div>
        </div>
      </article>

      <article className="wb-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Scan History</p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">Recent Scan Runs</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {historyExpanded
                ? "Showing the expanded run history. Open a run to inspect its per-target results."
                : "The latest 4 runs are shown here by default. Expand a run to inspect its per-target results."}
            </p>
          </div>
          <Button variant="outline" onClick={() => setHistoryExpanded((value) => !value)}>
            {historyExpanded ? "Collapse" : "Show More"}
          </Button>
        </div>

        {aegisError ? (
          <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {aegisError}
          </div>
        ) : null}

        {historyExpanded ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={resultFilters.scannerFamily}
              onChange={(event) => setResultFilters((current) => ({ ...current, scannerFamily: event.target.value }))}
            >
              <option value="all">All families</option>
              {FAMILIES.map((family) => (
                <option key={family} value={family}>
                  {family.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={resultFilters.status}
              onChange={(event) => setResultFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="all">All statuses</option>
              <option value="Completed">Completed</option>
              <option value="PartiallyCompleted">PartiallyCompleted</option>
              <option value="Failed">Failed</option>
              <option value="Queued">Queued</option>
              <option value="Running">Running</option>
              <option value="Stopped">Stopped</option>
            </select>
          </div>
        ) : null}

        {visibleJobs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={historyExpanded ? "No runs match the current filters" : "No scan runs yet"}
              description={historyExpanded
                ? "Try clearing one of the run filters or collapse back to the default recent view."
                : "Queued custom scans and plan-triggered runs will appear here with expandable per-target results."}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleJobs.map((job) => {
              const isExpanded = expandedJobIds.includes(job.id)
              const jobResults = resultsByJobId.get(job.id) ?? []
              const legacyDocumentId = buildLegacyAegisDocumentId(job.id)
              const existingAegisPlan = aegisPlans.find((item) =>
                item.sourceScanJobIds.includes(job.id) || item.sourceDocumentId === legacyDocumentId) ?? null
              const aegisBusy = aegisBusyJobId === job.id
              const origin = resolveScanOrigin(job.triggerType)
              return (
                <div key={job.id} className="rounded-xl border border-border/70 bg-surface-2/60">
                  <div className="flex items-start justify-between gap-4 p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpandedJob(job.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="mt-0.5 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ScannerFamilyBadge family={job.scannerFamily} />
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${origin.badgeClassName}`}>
                            {origin.label}
                          </span>
                          <Badge variant="outline">{job.triggerType}</Badge>
                          {job.executionMode ? <Badge variant="outline">{job.executionMode}</Badge> : null}
                          <Badge variant={job.status === "Completed" ? "secondary" : "outline"}>{job.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{job.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{origin.summary}</span>
                          <span>{job.completedTargets}/{job.totalTargets} complete</span>
                          <span>{job.failedTargets} failed</span>
                          <span>{job.noFindingsTargets} no-findings</span>
                          <span>Rule file: {job.rulePath?.trim() ? job.rulePath : "Not recorded"}</span>
                        </div>
                      </div>
                    </button>
                    <div className="min-w-[220px] text-right text-xs text-muted-foreground">
                      <p>{job.finishedAtUtc ? new Date(job.finishedAtUtc).toLocaleString() : new Date(job.queuedAtUtc).toLocaleString()}</p>
                      <p>{job.finishedAtUtc ? "Finished" : "Queued"}</p>
                      {(job.scannerFamily === "snort" || job.scannerFamily === "suricata") && job.executionMode === "quarantine" && job.status === "Running" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          disabled={stoppingJobId === job.id}
                          onClick={() => void stopJob(job.id)}
                        >
                          {stoppingJobId === job.id ? "Stopping..." : "Stop"}
                        </Button>
                      ) : null}
                      <div className="mt-3 rounded-xl border border-border/60 bg-background/35 p-3 text-left">
                        <p className="wb-kicker">Aegis</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {existingAegisPlan
                            ? `${existingAegisPlan.severity} severity, ${existingAegisPlan.confidence} confidence.`
                            : "Create a mitigation plan from this specific scan run."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {existingAegisPlan ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openExistingAegisPlan(existingAegisPlan.id)}
                                disabled={aegisBusy}
                              >
                                Open mitigation plan
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void createAegisPlanForJob(job.id, true)}
                                disabled={aegisBusy}
                              >
                                {aegisBusy && aegisBusyAction === "regenerate" ? "Regenerating..." : "Regenerate"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void createAegisPlanForJob(job.id, false)}
                              disabled={aegisBusy}
                            >
                              {aegisBusy && aegisBusyAction === "create" ? "Creating..." : "Create mitigation plan"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-border/60 px-4 pb-4 pt-3">
                      {jobResults.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3 text-sm text-muted-foreground">
                          No per-target results are currently attached to this run.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[720px] text-sm">
                            <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              <tr>
                                <th className="pb-3">Target</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Findings</th>
                                <th className="pb-3">Finished</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobResults.map((result) => (
                                <tr key={result.id} className="border-t border-border/50">
                                  <td className="py-3">{result.targetDisplay}</td>
                                  <td className="py-3">{result.status}</td>
                                  <td className="py-3">{result.findingsCount}</td>
                                  <td className="py-3">{result.finishedAtUtc ? new Date(result.finishedAtUtc).toLocaleString() : "Running"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}
