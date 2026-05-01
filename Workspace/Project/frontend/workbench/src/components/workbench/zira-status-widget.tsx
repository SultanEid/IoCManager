"use client"

import Link from "next/link"
import { Bot, CheckCircle2, CircleAlert, CircleDot, Loader2, PauseCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { gateway } from "@/shared/gateway"
import { listLegacyJobs, type LegacyPipelineScanJob } from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import {
  readZiraWidgetState,
  type ZiraWidgetState,
  ZIRA_WIDGET_STATE_EVENT,
} from "@/shared/zira/widget-state"

type WidgetTone = "idle" | "working" | "finished" | "attention" | "down"

type ZiraLiveState = {
  label: string
  title: string
  detail: string
  tone: WidgetTone
  updatedAtUtc: string | null
  mode: string
}

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "inprogress", "in_progress", "processing", "started"])
const FINISHED_JOB_STATUSES = new Set(["completed", "succeeded", "success", "finished"])
const FAILED_JOB_STATUSES = new Set(["failed", "error", "cancelled", "canceled", "stopped"])
const LOCAL_STATE_FRESH_MS = 45 * 1000
const RECENT_FINISHED_JOB_MS = 90 * 1000
const RECENT_ATTENTION_JOB_MS = 10 * 60 * 1000

function parseTime(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatTime(value: string | null | undefined) {
  const timestamp = parseTime(value)
  return timestamp > 0 ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now"
}

function latestJobTime(job: LegacyPipelineScanJob) {
  return Math.max(parseTime(job.finishedAtUtc), parseTime(job.startedAtUtc), parseTime(job.queuedAtUtc))
}

function sortJobsNewestFirst(jobs: LegacyPipelineScanJob[]) {
  return [...jobs].sort((a, b) => latestJobTime(b) - latestJobTime(a))
}

function isRecentTerminalJob(job: LegacyPipelineScanJob) {
  const status = job.status.toLowerCase()
  const ageMs = Date.now() - latestJobTime(job)
  if (ageMs < 0) {
    return true
  }

  if (FINISHED_JOB_STATUSES.has(status)) {
    return ageMs < RECENT_FINISHED_JOB_MS
  }

  if (FAILED_JOB_STATUSES.has(status)) {
    return ageMs < RECENT_ATTENTION_JOB_MS
  }

  return false
}

function isFreshLocalState(state: ZiraWidgetState | null, newestBackendTime: number) {
  if (!state) {
    return false
  }

  const updatedAt = parseTime(state.updatedAtUtc)
  return updatedAt > newestBackendTime && Date.now() - updatedAt < LOCAL_STATE_FRESH_MS
}

function stateFromLocal(state: ZiraWidgetState): ZiraLiveState {
  const working = ["analyzing", "drafting", "creating", "running", "summarizing"].includes(state.phase)
  const blocked = state.phase === "blocked"
  return {
    label: blocked ? "Blocked" : working ? "Working" : state.phase === "completed" ? "Finished" : "Idle",
    title: state.title,
    detail: `${state.scannerCapability ?? "Auto"} planner update at ${formatTime(state.updatedAtUtc)}`,
    tone: blocked ? "attention" : working ? "working" : state.phase === "completed" ? "finished" : "idle",
    updatedAtUtc: state.updatedAtUtc,
    mode: state.operatingMode ?? "Unknown",
  }
}

function stateFromJob(job: LegacyPipelineScanJob): ZiraLiveState {
  const status = job.status.toLowerCase()
  const scannerFamily = job.scannerFamily.toUpperCase()
  const targetLine = `${job.completedTargets}/${job.totalTargets} targets`

  if (ACTIVE_JOB_STATUSES.has(status)) {
    const queued = status === "queued"
    return {
      label: queued ? "Queued" : "Running",
      title: queued ? `${scannerFamily} scan queued` : `${scannerFamily} scan in progress`,
      detail: queued ? "Waiting for the legacy worker to start." : `${targetLine} complete. ${job.summary || "Waiting for execution output."}`,
      tone: "working",
      updatedAtUtc: job.startedAtUtc ?? job.queuedAtUtc,
      mode: "LiveData",
    }
  }

  if (FAILED_JOB_STATUSES.has(status)) {
    return {
      label: "Attention",
      title: `${scannerFamily} scan needs review`,
      detail: job.summary || `${job.failedTargets} targets failed.`,
      tone: "attention",
      updatedAtUtc: job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc,
      mode: "LiveData",
    }
  }

  if (FINISHED_JOB_STATUSES.has(status)) {
    return {
      label: "Finished",
      title: `${scannerFamily} scan finished`,
      detail: job.summary || `${targetLine} completed with ${job.failedTargets} failures.`,
      tone: "finished",
      updatedAtUtc: job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc,
      mode: "LiveData",
    }
  }

  return {
    label: job.status,
    title: `${scannerFamily} scan updated`,
    detail: job.summary || targetLine,
    tone: "idle",
    updatedAtUtc: job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc,
    mode: "LiveData",
  }
}

function idleState(
  status: NonNullable<ReturnType<typeof gateway.getScanAnalystStatus> extends Promise<infer T> ? T : never> | undefined,
  latestJob: LegacyPipelineScanJob | null,
): ZiraLiveState {
  const lastJob = latestJob
    ? ` Last ${latestJob.scannerFamily.toUpperCase()} job ${latestJob.status.toLowerCase()} at ${formatTime(latestJob.finishedAtUtc ?? latestJob.startedAtUtc ?? latestJob.queuedAtUtc)}.`
    : ""

  return {
    label: status?.autonomyEnabled ? "Idle" : "Manual only",
    title: status?.autonomyEnabled ? "Zira is watching" : "Zira is waiting",
    detail: `${status?.autonomyEnabled ? "Autonomy is enabled. No scan is currently running." : "Request-based planning is available."}${lastJob}`,
    tone: "idle",
    updatedAtUtc: latestJob?.finishedAtUtc ?? latestJob?.startedAtUtc ?? latestJob?.queuedAtUtc ?? null,
    mode: status?.operatingMode ?? "Unknown",
  }
}

function iconForTone(tone: WidgetTone) {
  if (tone === "working") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  }

  if (tone === "finished") {
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  if (tone === "attention" || tone === "down") {
    return <CircleAlert className="h-3.5 w-3.5" />
  }

  return <CircleDot className="h-3.5 w-3.5" />
}

export function ZiraStatusWidget({ className }: { className?: string }) {
  const [localState, setLocalState] = useState<ZiraWidgetState | null>(() => readZiraWidgetState())

  const statusQuery = useWorkbenchQuery(["shell", "zira", "status"], (signal) => gateway.getScanAnalystStatus(signal), {
    refetchInterval: 30_000,
    staleTime: 30_000,
  })
  const jobsQuery = useWorkbenchQuery(["shell", "zira", "legacy-jobs"], (signal) => listLegacyJobs(signal), {
    refetchInterval: 45_000,
    staleTime: 30_000,
  })

  useEffect(() => {
    function handleStateEvent(event: Event) {
      setLocalState((event as CustomEvent<ZiraWidgetState>).detail ?? readZiraWidgetState())
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "zira.widget.state") {
        setLocalState(readZiraWidgetState())
      }
    }

    window.addEventListener(ZIRA_WIDGET_STATE_EVENT, handleStateEvent)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener(ZIRA_WIDGET_STATE_EVENT, handleStateEvent)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const liveState = useMemo<ZiraLiveState>(() => {
    if (statusQuery.isError) {
      return {
        label: "Dependency down",
        title: "Zira status unavailable",
        detail: "Agent status is not available. Open Zira for diagnostics.",
        tone: "attention",
        updatedAtUtc: null,
        mode: "Unknown",
      }
    }

    const status = statusQuery.data
    if (status && !status.agentEnabled) {
      return {
        label: "Disabled",
        title: "Zira is switched off",
        detail: "Agent execution is disabled in backend settings.",
        tone: "down",
        updatedAtUtc: null,
        mode: status.operatingMode,
      }
    }

    if (status && !status.databaseAvailable) {
      return {
        label: "Dependency down",
        title: "Zira is in fallback mode",
        detail: status.degradedReason ?? "The database-backed context is unavailable.",
        tone: "down",
        updatedAtUtc: null,
        mode: status.operatingMode,
      }
    }

    const jobs = sortJobsNewestFirst(jobsQuery.data ?? [])
    const activeJob = jobs.find((job) => ACTIVE_JOB_STATUSES.has(job.status.toLowerCase()))
    const latestJob = activeJob ?? jobs[0] ?? null
    const latestJobTimestamp = latestJob ? latestJobTime(latestJob) : 0

    if (activeJob) {
      return stateFromJob(activeJob)
    }

    if (isFreshLocalState(localState, latestJobTimestamp)) {
      return stateFromLocal(localState!)
    }

    if (latestJob && isRecentTerminalJob(latestJob)) {
      return stateFromJob(latestJob)
    }

    if (status?.lastAutonomousActivity) {
      return {
        label: "Autonomous",
        title: "Zira completed an autonomous pass",
        detail: status.lastAutonomousActivity.summary,
        tone: "finished",
        updatedAtUtc: status.lastAutonomousActivity.occurredAtUtc,
        mode: status.operatingMode,
      }
    }

    if (statusQuery.isLoading || jobsQuery.isLoading) {
      return {
        label: "Checking",
        title: "Zira is checking live state",
        detail: "Loading agent status and recent scan jobs.",
        tone: "working",
        updatedAtUtc: null,
        mode: "Unknown",
      }
    }

    return idleState(status, latestJob)
  }, [jobsQuery.data, jobsQuery.isLoading, localState, statusQuery.data, statusQuery.isError, statusQuery.isLoading])

  const toneClasses: Record<WidgetTone, string> = {
    idle: "border-border/70 bg-surface-2/70 text-muted-foreground hover:text-foreground",
    working: "border-primary/35 bg-primary/12 text-primary",
    finished: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    attention: "border-amber-500/35 bg-amber-500/10 text-amber-300",
    down: "border-destructive/35 bg-destructive/10 text-destructive",
  }

  return (
    <Link
      href="/scan-analyst"
      data-testid="zira-status-widget"
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2 text-xs transition-colors xl:min-w-[136px] xl:max-w-[220px]",
        toneClasses[liveState.tone],
        className,
      )}
      title={`${liveState.title}: ${liveState.detail}`}
      aria-label={`Zira ${liveState.label}: ${liveState.detail}`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-current/20 bg-current/10">
        {liveState.tone === "idle" ? <Bot className="h-3.5 w-3.5" /> : iconForTone(liveState.tone)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Zira</span>
          <span className="hidden rounded-full border border-current/20 px-1.5 py-0.5 text-xs xl:inline-flex">{liveState.label}</span>
        </span>
        <span className="hidden truncate text-xs text-muted-foreground 2xl:block">{liveState.title}</span>
      </span>
      <span className="hidden shrink-0 flex-col items-end text-xs text-muted-foreground 2xl:flex">
        <span>{liveState.mode}</span>
        <span>{liveState.updatedAtUtc ? formatTime(liveState.updatedAtUtc) : <PauseCircle className="h-3 w-3" />}</span>
      </span>
    </Link>
  )
}
