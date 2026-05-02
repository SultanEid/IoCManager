"use client"

import Link from "next/link"
import { Bot, CheckCircle2, CircleAlert, CircleDot, Loader2, PauseCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { AuditLogResponse, ReportMitigationListItemResponse } from "@/shared/api/schemas"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import {
  AEGIS_WIDGET_DISMISSED_KEY_EVENT,
  AEGIS_WIDGET_STATE_EVENT,
  readAegisWidgetDismissedKey,
  readAegisWidgetState,
  type AegisWidgetState,
  writeAegisWidgetDismissedKey,
} from "@/shared/aegis/widget-state"

type WidgetTone = "idle" | "working" | "finished" | "attention" | "down"

type AegisLiveState = {
  label: string
  title: string
  detail: string
  tone: WidgetTone
  updatedAtUtc: string | null
  mode: string
  href: string
}

const LOCAL_STATE_FRESH_MS = 45 * 1000
const RECENT_FINISHED_MS = 10 * 60 * 1000
const RECENT_WORKING_MS = 10 * 60 * 1000

type AegisAuditPayload = {
  agent?: string
  phase?: string
  sourceName?: string
  triggerKind?: string
  reportId?: string
  reviewPath?: string
  message?: string
  severity?: string
  confidence?: string
  primaryActions?: Array<{ title?: string }>
}

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

function isFreshLocalState(state: AegisWidgetState | null, newestBackendTime: number, observedAtMs: number) {
  if (!state) {
    return false
  }

  const updatedAt = parseTime(state.updatedAtUtc)
  return updatedAt > newestBackendTime && observedAtMs - updatedAt < LOCAL_STATE_FRESH_MS
}

function buildIssueHref(basePath: string, title: string, detail: string, tone: WidgetTone) {
  const [pathname, rawQuery = ""] = basePath.split("?")
  const params = new URLSearchParams(rawQuery)
  if (!params.has("section")) {
    params.set("section", params.has("plan") ? "active" : "library")
  }
  params.set("issueTitle", title)
  params.set("issueDetail", detail)
  params.set("issueTone", tone)
  const nextQuery = params.toString()
  return nextQuery ? `${pathname}?${nextQuery}` : pathname
}

function stateFromLocal(state: AegisWidgetState): AegisLiveState {
  const working = ["reviewing", "drafting", "saving"].includes(state.phase)
  const blocked = state.phase === "blocked"
  const reviewPath = state.reviewPath?.trim() || "/agents/aegis"
  const detail = state.detail?.trim() || `${state.sourceName ?? "Aegis"} update at ${formatTime(state.updatedAtUtc)}`
  return {
    label: blocked ? "Blocked" : working ? "Working" : state.phase === "completed" ? "Finished" : "Idle",
    title: state.title,
    detail,
    tone: blocked ? "attention" : working ? "working" : state.phase === "completed" ? "finished" : "idle",
    updatedAtUtc: state.updatedAtUtc,
    mode: state.source === "autonomous" ? "Auto" : "Manual",
    href: buildIssueHref(reviewPath, state.title, detail, blocked ? "attention" : working ? "working" : "finished"),
  }
}

function parseAuditPayload(entry: AuditLogResponse): AegisAuditPayload {
  try {
    return JSON.parse(entry.payloadJson) as AegisAuditPayload
  } catch {
    return {}
  }
}

function stateFromAudit(entry: AuditLogResponse): AegisLiveState {
  const payload = parseAuditPayload(entry)
  const sourceName = payload.sourceName?.trim() || "Aegis case"
  const reviewPath = payload.reviewPath?.trim() || "/agents/aegis"
  const primaryAction = payload.primaryActions?.[0]?.title?.trim()
  const detailFromPayload = payload.message?.trim()
    || (primaryAction ? `Top action: ${primaryAction}` : null)
    || `${payload.severity ?? "Unknown"} severity, ${payload.confidence ?? "unknown"} confidence.`
  const isStarted = entry.actionType.endsWith(".started")
  const title = isStarted ? "Aegis is generating a mitigation plan" : "Aegis plan needs review"
  const detail = isStarted
    ? detailFromPayload
    : `${sourceName}. ${detailFromPayload}`

  return {
    label: isStarted ? "Working" : "Attention",
    title,
    detail,
    tone: isStarted ? "working" : "attention",
    updatedAtUtc: entry.occurredAtUtc,
    mode: "Auto",
    href: buildIssueHref(reviewPath, title, detail, isStarted ? "working" : "attention"),
  }
}

function stateFromPlan(plan: ReportMitigationListItemResponse): AegisLiveState {
  const severity = plan.severity.toLowerCase()
  const tone: WidgetTone = severity === "high" || severity === "critical" ? "attention" : "finished"
  const title = tone === "attention" ? "Aegis plan needs review" : "Aegis plan ready"
  const detail = `${plan.title}. ${plan.severity} severity, ${plan.confidence} confidence.`
  const href = buildIssueHref(`/agents/aegis?plan=${encodeURIComponent(plan.id)}`, title, detail, tone)
  return {
    label: tone === "attention" ? "Attention" : "Finished",
    title,
    detail,
    tone,
    updatedAtUtc: plan.generatedAtUtc,
    mode: "LiveData",
    href,
  }
}

function idleState(latestPlan: ReportMitigationListItemResponse | null): AegisLiveState {
  const lastPlan = latestPlan
    ? ` Last plan ${latestPlan.severity.toLowerCase()} severity at ${formatTime(latestPlan.generatedAtUtc)}.`
    : ""

  return {
    label: "Idle",
    title: "Aegis is watching",
    detail: `Automatic mitigation review is available for qualifying alerts and scans.${lastPlan}`,
    tone: "idle",
    updatedAtUtc: latestPlan?.generatedAtUtc ?? null,
    mode: "LiveData",
    href: "/agents/aegis",
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

function buildLiveStateKey(state: AegisLiveState) {
  return [state.tone, state.title, state.detail, state.updatedAtUtc ?? "none"].join("|")
}

export function AegisStatusWidget({ className }: { className?: string }) {
  const [localState, setLocalState] = useState<AegisWidgetState | null>(() => readAegisWidgetState())
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => readAegisWidgetDismissedKey())

  const plansQuery = useWorkbenchQuery(["shell", "aegis", "plans"], (signal) => gateway.listReportMitigationPlans(signal), {
    refetchInterval: 30_000,
    staleTime: 30_000,
  })
  const auditQuery = useWorkbenchQuery(["shell", "aegis", "audit"], (signal) => gateway.listAuditLogs({
    actionType: "aegis.mitigation.auto",
    page: 1,
    pageSize: 8,
  }, signal), {
    refetchInterval: 30_000,
    staleTime: 30_000,
  })

  useEffect(() => {
    function handleStateEvent(event: Event) {
      setLocalState((event as CustomEvent<AegisWidgetState>).detail ?? readAegisWidgetState())
    }

    function handleDismissedEvent(event: Event) {
      setDismissedKey((event as CustomEvent<string | null>).detail ?? readAegisWidgetDismissedKey())
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "aegis.widget.state") {
        setLocalState(readAegisWidgetState())
      }

      if (event.key === "aegis.widget.dismissed") {
        setDismissedKey(readAegisWidgetDismissedKey())
      }
    }

    window.addEventListener(AEGIS_WIDGET_STATE_EVENT, handleStateEvent)
    window.addEventListener(AEGIS_WIDGET_DISMISSED_KEY_EVENT, handleDismissedEvent)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener(AEGIS_WIDGET_STATE_EVENT, handleStateEvent)
      window.removeEventListener(AEGIS_WIDGET_DISMISSED_KEY_EVENT, handleDismissedEvent)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const liveState = useMemo<AegisLiveState>(() => {
    if (plansQuery.isError || auditQuery.isError) {
      return {
        label: "Dependency down",
        title: "Aegis status unavailable",
        detail: "Mitigation plan status is not available. Open Aegis for diagnostics.",
        tone: "attention",
        updatedAtUtc: null,
        mode: "Unknown",
        href: "/agents/aegis",
      }
    }

    const audits = auditQuery.data?.items ?? []
    const plans = [...(plansQuery.data?.items ?? [])].sort((left, right) => parseTime(right.generatedAtUtc) - parseTime(left.generatedAtUtc))
    const latestAudit = audits[0] ?? null
    const latestPlan = plans[0] ?? null
    const newestBackendTime = Math.max(parseTime(latestAudit?.occurredAtUtc), parseTime(latestPlan?.generatedAtUtc))
    const observedAtMs = Math.max(plansQuery.dataUpdatedAt, auditQuery.dataUpdatedAt, newestBackendTime)

    if (latestAudit) {
      const state = stateFromAudit(latestAudit)
      const ageMs = observedAtMs - parseTime(state.updatedAtUtc)
      if (state.tone === "working" && ageMs >= 0 && ageMs < RECENT_WORKING_MS) {
        return state
      }
      if (state.tone === "attention" && ageMs >= 0 && ageMs < RECENT_FINISHED_MS) {
        return state
      }
    }

    if (isFreshLocalState(localState, newestBackendTime, observedAtMs)) {
      return stateFromLocal(localState!)
    }

    if (latestPlan) {
      const ageMs = observedAtMs - parseTime(latestPlan.generatedAtUtc)
      if (ageMs >= 0 && ageMs < RECENT_FINISHED_MS) {
        return stateFromPlan(latestPlan)
      }
    }

    if (plansQuery.isLoading || auditQuery.isLoading) {
      return {
        label: "Checking",
        title: "Aegis is checking live state",
        detail: "Loading mitigation plans and automation activity.",
        tone: "working",
        updatedAtUtc: null,
        mode: "Unknown",
        href: "/agents/aegis",
      }
    }

    return idleState(latestPlan)
  }, [auditQuery.data?.items, auditQuery.dataUpdatedAt, auditQuery.isError, auditQuery.isLoading, localState, plansQuery.data?.items, plansQuery.dataUpdatedAt, plansQuery.isError, plansQuery.isLoading])

  const toneClasses: Record<WidgetTone, string> = {
    idle: "border-border/70 bg-surface-2/70 text-muted-foreground hover:text-foreground",
    working: "border-primary/35 bg-primary/12 text-primary",
    finished: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    attention: "border-amber-500/35 bg-amber-500/10 text-amber-300",
    down: "border-destructive/35 bg-destructive/10 text-destructive",
  }

  const isDismissed = dismissedKey === buildLiveStateKey(liveState) && liveState.tone !== "down"
  const visibleState = isDismissed ? idleState(plansQuery.data?.items?.[0] ?? null) : liveState

  function handleClick() {
    if (liveState.tone === "down") {
      return
    }

    window.setTimeout(() => {
      writeAegisWidgetDismissedKey(buildLiveStateKey(liveState))
    }, 0)
  }

  return (
    <Link
      href={liveState.href}
      onClick={handleClick}
      data-testid="aegis-status-widget"
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2 text-xs transition-colors xl:min-w-[136px] xl:max-w-[220px]",
        toneClasses[visibleState.tone],
        className,
      )}
      title={`${visibleState.title}: ${visibleState.detail}`}
      aria-label={`Aegis ${visibleState.label}: ${visibleState.detail}`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-current/20 bg-current/10">
        {visibleState.tone === "idle" ? <Bot className="h-3.5 w-3.5" /> : iconForTone(visibleState.tone)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Aegis</span>
          <span className="hidden rounded-full border border-current/20 px-1.5 py-0.5 text-xs xl:inline-flex">{visibleState.label}</span>
        </span>
        <span className="hidden truncate text-xs text-muted-foreground 2xl:block">{visibleState.title}</span>
      </span>
      <span className="hidden shrink-0 flex-col items-end text-xs text-muted-foreground 2xl:flex">
        <span>{visibleState.mode}</span>
        <span>{visibleState.updatedAtUtc ? formatTime(visibleState.updatedAtUtc) : <PauseCircle className="h-3 w-3" />}</span>
      </span>
    </Link>
  )
}
