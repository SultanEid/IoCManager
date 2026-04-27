"use client"

import Link from "next/link"
import { useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Bot, ChevronDown, PlayCircle, Radar, Sparkles } from "lucide-react"
import type { FormEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type {
  ScanAnalystChatResponse,
  ScanAnalystAgentStatusResponse,
  ScanAnalystPlanProposalResponse,
  ScannerCapability,
} from "@/shared/api/schemas"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import {
  listLegacyJobs,
  listLegacyPlans,
  type LegacyPipelineScanJob,
  type LegacyPipelineScanPlan,
} from "@/shared/gateway/legacy-scan-pipeline"
import type {
  ScanAnalystSimulatedCondition,
  SendScanAnalystChatTurnInput,
  UpdateScanAnalystPostureInput,
} from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"
import { normalizeZiraOperatingMode, writeZiraWidgetState } from "@/shared/zira/widget-state"

const ACTIONS: Array<{ value: SendScanAnalystChatTurnInput["action"]; label: string; description: string }> = [
  { value: "RecommendOnly", label: "Recommend", description: "Draft and explain the plan." },
  { value: "CreatePlan", label: "Create Plan", description: "Persist the proposal without running it." },
  { value: "CreateAndRun", label: "Create & Run", description: "Persist and execute the plan." },
]

const CAPABILITIES: Array<ScannerCapability | "Auto"> = ["Auto", "Yara", "Sigma", "Snort", "Suricata"]

const QUICK_PROMPTS = [
  "Recommend the safest useful scan plan for the current live targets.",
  "Create and run a bounded YARA scan for exactly one online Windows target.",
  "Review recent alerts and failed scans, then propose the next autonomous task.",
]

const MOCK_CONDITION_LABELS: Record<ScanAnalystSimulatedCondition, string> = {
  new_hosts_found: "New hosts found",
  failed_recent_job: "Failed recent job",
  stale_coverage: "Stale coverage",
  recent_alert_detected: "Recent alert detected",
}

const MOCK_CONDITION_STATUS_PRESETS: Record<
  ScanAnalystSimulatedCondition,
  {
    currentActivity: string
    latestActionSummary: string
    recentActionTitle: string
    recentActionSummary: string
    completedPlan: {
      id: string
      name: string
      scannerCapability: ScannerCapability
      targetCount: number
      detectionCount: number
      outcome: string
    }
    autonomous: {
      summary: string
      trigger: string
      action: "RecommendOnly" | "CreatePlan" | "CreateAndRun"
    }
  }
> = {
  new_hosts_found: {
    currentActivity: "Reviewing newly added targets and preparing a first-pass follow-up scan.",
    latestActionSummary: "Zira detected new hosts in scope and drafted a focused onboarding sweep without waiting for a prompt.",
    recentActionTitle: "Prepared new-host follow-up",
    recentActionSummary: "Zira scoped a first-pass sweep for the newly discovered hosts with matching scanner coverage.",
    completedPlan: {
      id: "mock-completed-plan-new-hosts",
      name: "zira-new-hosts-followup",
      scannerCapability: "Sigma",
      targetCount: 4,
      detectionCount: 1,
      outcome: "Prepared for 4 new hosts",
    },
    autonomous: {
      summary: "Zira noticed new targets and prepared a follow-up scan automatically.",
      trigger: "new hosts",
      action: "CreateAndRun",
    },
  },
  failed_recent_job: {
    currentActivity: "Analyzing the failed recent job and drafting a tighter rerun.",
    latestActionSummary: "Zira correlated the failed job with reduced coverage and prepared a narrower rerun plan.",
    recentActionTitle: "Drafted failed-job rerun",
    recentActionSummary: "Zira removed the degraded path from the first pass and queued a more focused rerun recommendation.",
    completedPlan: {
      id: "mock-completed-plan-failed-job",
      name: "zira-failed-job-rerun",
      scannerCapability: "Yara",
      targetCount: 2,
      detectionCount: 0,
      outcome: "Prepared rerun after failed job",
    },
    autonomous: {
      summary: "Zira detected a failed recent job and prepared a tighter rerun automatically.",
      trigger: "failed recent job",
      action: "CreatePlan",
    },
  },
  stale_coverage: {
    currentActivity: "Reviewing stale coverage and selecting hosts that need the next scan.",
    latestActionSummary: "Zira identified aging coverage gaps and prepared the next highest-value scan pass.",
    recentActionTitle: "Reviewed stale coverage",
    recentActionSummary: "Zira highlighted the hosts with aging coverage and prepared a focused refresh plan.",
    completedPlan: {
      id: "mock-completed-plan-stale-coverage",
      name: "zira-stale-coverage-refresh",
      scannerCapability: "Suricata",
      targetCount: 3,
      detectionCount: 2,
      outcome: "Prepared refresh for stale coverage",
    },
    autonomous: {
      summary: "Zira found stale coverage and prepared the next scan automatically.",
      trigger: "stale coverage",
      action: "RecommendOnly",
    },
  },
  recent_alert_detected: {
    currentActivity: "Correlating a recent alert with impacted assets and candidate scanner rules.",
    latestActionSummary: "Zira detected a fresh alert signal and prepared a bounded verification scan.",
    recentActionTitle: "Prepared alert-driven verification",
    recentActionSummary: "Zira used the alert as an indicator to scope affected hosts and matching scan rules.",
    completedPlan: {
      id: "mock-completed-plan-recent-alert",
      name: "zira-alert-verification",
      scannerCapability: "Yara",
      targetCount: 3,
      detectionCount: 1,
      outcome: "Prepared verification for recent alert",
    },
    autonomous: {
      summary: "Zira noticed a recent alert and prepared a verification scan automatically.",
      trigger: "recent alert",
      action: "CreateAndRun",
    },
  },
}

function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "N/A"
}

function resolveCapabilityLabel(value: ScannerCapability | "Auto" | null | undefined) {
  return value && value !== "Auto" ? value : null
}

function resolvePlannerModeLabel(value: string | null | undefined) {
  if (value === "openai_refined") {
    return "OpenAI refined"
  }
  if (value === "openai_fallback") {
    return "Explicit local fallback"
  }
  if (value === "bounded-local") {
    return "Bounded automation"
  }
  if (value === "local") {
    return "Explicit local planner"
  }
  return "OpenAI required"
}

const LEGACY_FINISHED_JOB_STATUSES = new Set(["completed", "succeeded", "success", "finished"])

function toScannerCapability(value: string): ScannerCapability {
  const normalized = value.toLowerCase()
  if (normalized === "sigma") {
    return "Sigma"
  }
  if (normalized === "snort") {
    return "Snort"
  }
  if (normalized === "suricata") {
    return "Suricata"
  }

  return "Yara"
}

function formatRulePath(value: string | null | undefined) {
  return value?.trim() ? value : "Not recorded"
}

function readCompletedPlanRulePath(plan: object) {
  return "rulePath" in plan && typeof plan.rulePath === "string" ? plan.rulePath : null
}

function latestJobTimestamp(job: LegacyPipelineScanJob) {
  const timestamp = Date.parse(job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function deriveLiveCompletedPlans(
  jobs: LegacyPipelineScanJob[] | undefined,
  plans: LegacyPipelineScanPlan[] | undefined,
) {
  const planById = new Map((plans ?? []).map((plan) => [plan.id, plan]))

  return (jobs ?? [])
    .filter((job) => LEGACY_FINISHED_JOB_STATUSES.has(job.status.toLowerCase()))
    .sort((a, b) => latestJobTimestamp(b) - latestJobTimestamp(a))
    .slice(0, 6)
    .map((job) => {
      const plan = job.scanPlanId ? planById.get(job.scanPlanId) : null
      return {
        id: job.id,
        name: plan?.name ?? `Legacy ${toScannerCapability(job.scannerFamily)} scan ${job.id}`,
        scannerCapability: toScannerCapability(job.scannerFamily),
        targetCount: job.totalTargets,
        detectionCount: Math.max(0, job.totalTargets - job.noFindingsTargets - job.failedTargets),
        outcome: job.status,
        completedAtUtc: job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc,
        rulePath: job.rulePath ?? plan?.rulePathsByFamily[job.scannerFamily] ?? null,
        summary: job.summary,
      }
    })
}

function deriveMockStatus(
  status: ScanAnalystAgentStatusResponse,
  simulatedConditions: ScanAnalystSimulatedCondition[],
): ScanAnalystAgentStatusResponse {
  if (status.operatingMode !== "MockFallback") {
    return status
  }

  const activeConditions: ScanAnalystSimulatedCondition[] = simulatedConditions.length > 0 ? simulatedConditions : ["new_hosts_found"]
  const primaryCondition = activeConditions[activeConditions.length - 1]
  const preset = MOCK_CONDITION_STATUS_PRESETS[primaryCondition]

  return {
    ...status,
    activeMockConditions: activeConditions,
    currentActivity: preset.currentActivity,
    latestActionSummary: preset.latestActionSummary,
    recentActions: [
      {
        id: `${primaryCondition}-recent-action`,
        title: preset.recentActionTitle,
        summary: preset.recentActionSummary,
        occurredAtUtc: new Date(Date.now() - 2 * 60_000).toISOString(),
        status: "Completed",
      },
      ...(status.recentActions ?? []).slice(0, 2),
    ],
    completedPlans: [
      {
        ...preset.completedPlan,
        completedAtUtc: new Date(Date.now() - 8 * 60_000).toISOString(),
      },
      ...(status.completedPlans ?? []).slice(0, 1),
    ],
    lastAutonomousActivity: {
      summary: preset.autonomous.summary,
      trigger: preset.autonomous.trigger,
      action: preset.autonomous.action,
      operatingMode: "MockFallback",
      occurredAtUtc: new Date(Date.now() - 3 * 60_000).toISOString(),
    },
  }
}

function clonePlan(plan: ScanAnalystPlanProposalResponse | null) {
  if (!plan) {
    return null
  }

  return {
    ...plan,
    targetServerIds: [...plan.targetServerIds],
    ruleRevisionIds: [...plan.ruleRevisionIds],
    targets: [...plan.targets],
    rules: [...plan.rules],
  } satisfies ScanAnalystPlanProposalResponse
}

function CollapsibleSection({
  eyebrow,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  eyebrow: string
  title: string
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="wb-panel group space-y-4" open={defaultOpen}>
      <summary className="-m-1 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-1 transition-colors hover:bg-surface-2/45 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="wb-kicker">{eyebrow}</span>
          <span className="mt-1 block text-sm font-semibold tracking-tight">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="pt-1">{children}</div>
    </details>
  )
}

function StatusOverview({ status }: { status: ScanAnalystAgentStatusResponse }) {
  return (
    <motion.article className="grid gap-4 xl:grid-cols-[1fr_1fr]" variants={panelMotion}>
      <CollapsibleSection
        eyebrow="Latest action"
        title="What Zira has been doing"
        badge={<StatusBadge value={status.operatingMode === "LiveData" ? "Live" : "Demo"} />}
      >
        <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
          <p className="text-sm font-medium text-foreground">
            {status.latestActionSummary ?? status.currentActivity ?? "Zira is monitoring the workspace and waiting for the next task."}
          </p>
          {status.lastAutonomousActivity ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Last autonomous pass: {status.lastAutonomousActivity.summary} at {formatTimestamp(status.lastAutonomousActivity.occurredAtUtc)}.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          {(status.recentActions ?? []).length > 0 ? (
            status.recentActions?.map((action) => (
              <div key={action.id} className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{action.title}</p>
                  <StatusBadge value={action.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{action.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatTimestamp(action.occurredAtUtc)}</p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No recent actions yet"
              description="Zira will list its latest work here once the first planning or run activity is available."
            />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="Completed scan plans"
        title="Recently finished work"
        badge={<StatusBadge value={`${status.completedPlans?.length ?? 0} plans`} />}
      >
        {(status.completedPlans ?? []).length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Scanner</TableHead>
                  <TableHead>Rule file</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.completedPlans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Targets {plan.targetCount} | Detections {plan.detectionCount}
                      </div>
                    </TableCell>
                    <TableCell>{plan.scannerCapability}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {formatRulePath(readCompletedPlanRulePath(plan))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={plan.outcome} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatTimestamp(plan.completedAtUtc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No completed plans yet"
            description="Finished plans from the live environment or demo scenario will appear here."
          />
        )}
      </CollapsibleSection>
    </motion.article>
  )
}

type PostureDraft = Omit<UpdateScanAnalystPostureInput, "actorUserId">
type PostureBooleanKey =
  | "autonomyEnabled"
  | "autoRun"
  | "watchForNewHosts"
  | "watchForRecentAlerts"
  | "watchForFailedRecentJobs"
  | "requireMatchingRuleFamily"

const POSTURE_FLAGS: Array<{ key: PostureBooleanKey; label: string }> = [
  { key: "autonomyEnabled", label: "Autonomous passes enabled" },
  { key: "autoRun", label: "Auto-run approved plans" },
  { key: "watchForNewHosts", label: "React to new hosts and networks" },
  { key: "watchForRecentAlerts", label: "React to recent alerts" },
  { key: "watchForFailedRecentJobs", label: "React to failed scan jobs" },
  { key: "requireMatchingRuleFamily", label: "Require matching rule family" },
]

function buildPostureDraft(status: ScanAnalystAgentStatusResponse): PostureDraft {
  return {
    autonomyEnabled: status.parameters.enabled,
    maxTargetsPerRun: status.parameters.maxTargetsPerRun,
    preferredScannerFamily: CAPABILITIES.includes(status.parameters.preferredScannerFamily as ScannerCapability | "Auto")
      ? (status.parameters.preferredScannerFamily as ScannerCapability | "Auto")
      : "Auto",
    autoRun: status.parameters.autoRun,
    quietHours: status.parameters.quietHours,
    watchForNewHosts: status.parameters.watchForNewHosts,
    watchForFailedRecentJobs: status.parameters.watchForFailedRecentJobs,
    watchForRecentAlerts: status.parameters.watchForRecentAlerts,
    requireMatchingRuleFamily: status.parameters.requireMatchingRuleFamily,
  }
}

function PostureEditor({
  status,
  actorUserId,
  isSaving,
  error,
  onSave,
}: {
  status: ScanAnalystAgentStatusResponse
  actorUserId: string
  isSaving: boolean
  error: Error | null
  onSave: (input: UpdateScanAnalystPostureInput) => Promise<unknown>
}) {
  const [draft, setDraft] = useState<PostureDraft>(() => buildPostureDraft(status))
  const [savedAtUtc, setSavedAtUtc] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildPostureDraft(status))
  }, [status])

  const currentDraft = buildPostureDraft(status)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(currentDraft)
  const canSave = Boolean(actorUserId) && isDirty && !isSaving

  function updateDraft<T extends keyof PostureDraft>(key: T, value: PostureDraft[T]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!actorUserId) {
      return
    }

    await onSave({
      ...draft,
      maxTargetsPerRun: Math.min(25, Math.max(1, Number(draft.maxTargetsPerRun) || 1)),
      quietHours: draft.quietHours.trim() || "none",
      actorUserId,
    })
    setSavedAtUtc(new Date().toISOString())
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
          <span className="wb-kicker">Preferred family</span>
          <select
            className="h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-foreground outline-none focus:border-cyan-400"
            value={draft.preferredScannerFamily}
            onChange={(event) => updateDraft("preferredScannerFamily", event.target.value as ScannerCapability | "Auto")}
          >
            {CAPABILITIES.map((capability) => (
              <option key={capability} value={capability}>
                {capability}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
          <span className="wb-kicker">Max targets per run</span>
          <Input
            min={1}
            max={25}
            type="number"
            value={String(draft.maxTargetsPerRun)}
            onChange={(event) => updateDraft("maxTargetsPerRun", Number(event.target.value))}
          />
        </label>

        <label className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3 sm:col-span-2">
          <span className="wb-kicker">Quiet hours</span>
          <Input
            value={draft.quietHours}
            onChange={(event) => updateDraft("quietHours", event.target.value)}
            placeholder="01:00-05:00 UTC or none"
          />
        </label>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {POSTURE_FLAGS.map((flag) => (
          <label key={flag.key} className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-2/45 px-3 py-2">
            <input
              checked={draft[flag.key]}
              className="size-4 accent-cyan-400"
              type="checkbox"
              onChange={(event) => updateDraft(flag.key, event.target.checked)}
            />
            <span>{flag.label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!canSave} type="submit">
          {isSaving ? "Saving..." : "Save posture"}
        </Button>
        <Button disabled={!isDirty || isSaving} type="button" variant="outline" onClick={() => setDraft(currentDraft)}>
          Reset
        </Button>
        <span className="text-xs text-muted-foreground">
          {savedAtUtc ? `Saved ${formatTimestamp(savedAtUtc)}` : "Changes affect Zira immediately until the backend restarts."}
        </span>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error.message}</p> : null}
    </form>
  )
}

export function ScanAnalystPage() {
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? ""
  const conversationRef = useRef<HTMLDivElement | null>(null)

  const [message, setMessage] = useState("")
  const [subnetId, setSubnetId] = useState("")
  const [preferredCapability, setPreferredCapability] = useState<ScannerCapability | "Auto">("Auto")
  const [maxTargetCount, setMaxTargetCount] = useState("5")
  const [simulatedConditions, setSimulatedConditions] = useState<ScanAnalystSimulatedCondition[]>(["new_hosts_found"])
  const [chatState, setChatState] = useState<ScanAnalystChatResponse | null>(null)
  const [draftPlan, setDraftPlan] = useState<ScanAnalystPlanProposalResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<SendScanAnalystChatTurnInput["action"] | null>(null)
  const [lastActionFeedback, setLastActionFeedback] = useState<{
    title: string
    detail: string
    timestampUtc: string
  } | null>(null)

  const subnetsQuery = useWorkbenchQuery(["scan-analyst", "subnets"], (signal) => gateway.listSubnets(signal))
  const statusQuery = useWorkbenchQuery(["scan-analyst", "status"], (signal) => gateway.getScanAnalystStatus(signal))
  const legacyJobsQuery = useWorkbenchQuery(["scan-analyst", "legacy-jobs"], (signal) => listLegacyJobs(signal), {
    refetchInterval: 5000,
  })
  const legacyPlansQuery = useWorkbenchQuery(["scan-analyst", "legacy-plans"], (signal) => listLegacyPlans(signal), {
    refetchInterval: 10000,
  })

  const queuedJobId = chatState?.latestAnalysis.queuedJob?.id ?? ""
  const liveRunSummaryQuery = useWorkbenchQuery(
    ["scan-analyst", "run-summary", queuedJobId],
    (signal) => gateway.getScanAnalystRunSummary(queuedJobId, signal),
    {
      enabled: queuedJobId.length > 0 && chatState?.operatingMode === "LiveData",
      refetchInterval: 4000,
    },
  )

  const activeRunSummary = chatState?.latestRunSummary ?? liveRunSummaryQuery.data ?? chatState?.latestAnalysis.runSummary ?? null
  const currentAnalysis = chatState?.latestAnalysis ?? null
  const trimmedMessage = message.trim()
  const actionDisabledReason = !actorUserId
    ? "Open a demo workspace first so Zira has an operator identity for the session."
    : trimmedMessage.length < 10
      ? "Enter at least 10 characters so Zira has enough context to act."
      : null
  const selectedSubnet = useMemo(
    () => (subnetsQuery.data ?? []).find((subnet) => subnet.id === subnetId) ?? null,
    [subnetId, subnetsQuery.data],
  )

  useEffect(() => {
    if (!chatState) {
      return
    }

    conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [chatState])

  function actionLabel(action: SendScanAnalystChatTurnInput["action"]) {
    return ACTIONS.find((item) => item.value === action)?.label ?? action
  }

  function actionProgressLine(action: SendScanAnalystChatTurnInput["action"]) {
    switch (action) {
      case "RecommendOnly":
        return "Zira is reviewing the current context and drafting a recommendation."
      case "CreatePlan":
        return "Zira is preparing and packaging the scan plan for creation."
      case "CreateAndRun":
        return "Zira is preparing the plan, queueing execution, and waiting for run output."
      default:
        return "Zira is working on your request."
    }
  }

  const publishWidgetState = useCallback((
    phase: "analyzing" | "drafting" | "creating" | "running" | "summarizing" | "completed" | "blocked",
    title: string,
    scannerCapability: string | null,
  ) => {
    writeZiraWidgetState({
      phase,
      title,
      scannerCapability,
      operatingMode: normalizeZiraOperatingMode(statusQuery.data?.operatingMode),
      source: phase === "completed" ? "user_action" : phase === "blocked" ? "user_action" : "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
  }, [statusQuery.data?.operatingMode])

  const chatMutation = useMutation({
    mutationFn: async (action: SendScanAnalystChatTurnInput["action"]) => {
      if (!actorUserId) {
        throw new Error("Open a demo workspace first so Zira has an operator identity for the session.")
      }

      if (trimmedMessage.length < 10) {
        throw new Error("Enter at least 10 characters so Zira has enough context to act.")
      }

      return gateway.sendScanAnalystChatTurn({
        sessionId: chatState?.sessionId,
        actorUserId,
        message: trimmedMessage,
        action,
        subnetId: subnetId || undefined,
        preferredScannerCapability: preferredCapability === "Auto" ? undefined : preferredCapability,
        maxTargetCount: Number.parseInt(maxTargetCount, 10) || undefined,
        editedPlan: draftPlan ?? undefined,
        simulatedConditions: statusQuery.data?.operatingMode === "MockFallback" ? simulatedConditions : undefined,
      })
    },
    onMutate: (action) => {
      setActiveAction(action)
      setSubmitError(null)
      const capability = draftPlan?.scannerCapability ?? resolveCapabilityLabel(preferredCapability)
      const title =
        action === "RecommendOnly"
          ? capability
            ? `Reviewing context and drafting a ${capability} recommendation`
            : "Reviewing context and drafting a recommendation"
          : action === "CreatePlan"
            ? capability
              ? `Creating a ${capability} scan plan`
              : "Creating a scan plan"
            : capability
              ? `Queueing a ${capability} scan run`
              : "Queueing a scan run"
      publishWidgetState(action === "CreateAndRun" ? "running" : action === "CreatePlan" ? "creating" : "analyzing", title, capability)
    },
    onSuccess: (response) => {
      setChatState(response)
      setDraftPlan(clonePlan(response.latestAnalysis.proposedPlan))
      setSubmitError(null)
      setActiveAction(null)
      const analysis = response.latestAnalysis
      const capability = analysis.proposedPlan.scannerCapability
      const title =
        analysis.action === "CreateAndRun"
          ? "Zira created and ran the plan"
          : analysis.action === "CreatePlan"
            ? "Zira created the plan"
            : "Zira drafted a recommendation"
      const detail =
        analysis.action === "CreateAndRun"
          ? `${analysis.proposedPlan.name} is queued with ${analysis.proposedPlan.targetServerIds.length} targets and ${analysis.proposedPlan.ruleRevisionIds.length} rules.`
          : analysis.action === "CreatePlan"
            ? `${analysis.proposedPlan.name} was prepared with ${analysis.proposedPlan.targetServerIds.length} targets and ${analysis.proposedPlan.ruleRevisionIds.length} rules.`
            : `${analysis.proposedPlan.name} is ready for review with ${analysis.proposedPlan.targetServerIds.length} targets and ${analysis.proposedPlan.ruleRevisionIds.length} rules.`
      setLastActionFeedback({
        title,
        detail,
        timestampUtc: new Date().toISOString(),
      })
      const widgetTitle =
        analysis.action === "CreateAndRun"
          ? `Summarized the ${capability} run and prepared the next recommendation`
          : analysis.action === "CreatePlan"
            ? `Created a ${capability} scan plan for operator review`
            : `Drafted a ${capability} recommendation for review`
      publishWidgetState(analysis.action === "CreateAndRun" ? "summarizing" : analysis.action === "CreatePlan" ? "completed" : "drafting", widgetTitle, capability)
    },
    onError: (error) => {
      setActiveAction(null)
      setSubmitError(classifyUiError(error).message)
      const capability = draftPlan?.scannerCapability ?? resolveCapabilityLabel(preferredCapability)
      publishWidgetState("blocked", "Blocked while processing the latest request", capability)
    },
  })

  const postureMutation = useMutation({
    mutationFn: (input: UpdateScanAnalystPostureInput) => gateway.updateScanAnalystPosture(input),
    onSuccess: async () => {
      await statusQuery.refetch()
    },
  })

  useEffect(() => {
    if (!currentAnalysis || currentAnalysis.action !== "CreateAndRun" || !activeRunSummary) {
      return
    }

    publishWidgetState(
      "completed",
      `Completed a ${currentAnalysis.proposedPlan.scannerCapability} run summary with ${activeRunSummary.detectionCount} mock detections`,
      currentAnalysis.proposedPlan.scannerCapability,
    )
  }, [activeRunSummary, currentAnalysis, publishWidgetState])

  if (subnetsQuery.isLoading || statusQuery.isLoading) {
    return <LoadingState label="Loading Zira workspace" />
  }

  if (subnetsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(subnetsQuery.error)} fallbackTitle="Zira unavailable" />
  }

  if (statusQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(statusQuery.error)} fallbackTitle="Agent status unavailable" />
  }

  const liveCompletedPlans = deriveLiveCompletedPlans(legacyJobsQuery.data, legacyPlansQuery.data)
  const baseStatus = deriveMockStatus(statusQuery.data!, simulatedConditions)
  const status = baseStatus.operatingMode === "LiveData" && liveCompletedPlans.length > 0
    ? {
      ...baseStatus,
      completedPlans: liveCompletedPlans,
      recentActions: liveCompletedPlans.slice(0, 3).map((plan) => ({
        id: `legacy-job-${plan.id}`,
        title: `${plan.scannerCapability} scan finished`,
        summary: plan.summary,
        occurredAtUtc: plan.completedAtUtc,
        status: plan.outcome,
      })),
    }
    : baseStatus

  function toggleCondition(condition: ScanAnalystSimulatedCondition) {
    const next = simulatedConditions.includes(condition)
      ? simulatedConditions.filter((item) => item !== condition)
      : [...simulatedConditions, condition]
    const activeConditions: ScanAnalystSimulatedCondition[] = next.length > 0 ? next : ["new_hosts_found"]
    const primaryCondition = activeConditions[activeConditions.length - 1]
    const preset = MOCK_CONDITION_STATUS_PRESETS[primaryCondition]

    setSimulatedConditions(next)
    writeZiraWidgetState({
      phase: "drafting",
      title: preset.currentActivity,
      scannerCapability: preset.completedPlan.scannerCapability,
      operatingMode: "MockFallback",
      source: "autonomous",
      updatedAtUtc: new Date().toISOString(),
    })
  }

  function updateDraftPlan(patch: Partial<ScanAnalystPlanProposalResponse>) {
    setDraftPlan((previous) => (previous ? { ...previous, ...patch } : previous))
  }

  function toggleTarget(targetId: string) {
    setDraftPlan((previous) => {
      if (!previous) {
        return previous
      }

      const nextTargetIds = previous.targetServerIds.includes(targetId)
        ? previous.targetServerIds.filter((item) => item !== targetId)
        : [...previous.targetServerIds, targetId]

      return {
        ...previous,
        targetServerIds: nextTargetIds,
      }
    })
  }

  function toggleRule(ruleRevisionId: string) {
    setDraftPlan((previous) => {
      if (!previous) {
        return previous
      }

      const nextRuleIds = previous.ruleRevisionIds.includes(ruleRevisionId)
        ? previous.ruleRevisionIds.filter((item) => item !== ruleRevisionId)
        : [...previous.ruleRevisionIds, ruleRevisionId]

      return {
        ...previous,
        ruleRevisionIds: nextRuleIds,
      }
    })
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="wb-kicker">Operations</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">Zira</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Ask for a scan, let Zira draft the plan, then create or run it against live inventory.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-surface-2/70 px-3 py-2 text-xs">
            <Bot className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{status.personaName ?? "Zira"}</p>
              <p className="text-muted-foreground">
                {status.operatingMode === "LiveData" ? "Real discovery context" : "Mock fallback context"}
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr_1fr_140px]">
          <label className="space-y-1 lg:col-span-4">
            <span className="wb-kicker">Ask Zira</span>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Example: Create and run a bounded YARA scan for Win1-FH only."
              rows={3}
            />
          </label>
          <div className="flex flex-wrap gap-2 lg:col-span-4">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMessage(prompt)}
                className="justify-start whitespace-normal text-left"
              >
                {prompt}
              </Button>
            ))}
          </div>
          <label className="space-y-1">
            <span className="wb-kicker">Subnet Focus</span>
            <select
              value={subnetId}
              onChange={(event) => setSubnetId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All subnets</option>
              {(subnetsQuery.data ?? []).map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name} ({subnet.cidrBlock})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Preferred Scanner</span>
            <select
              value={preferredCapability}
              onChange={(event) => setPreferredCapability(event.target.value as ScannerCapability | "Auto")}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {CAPABILITIES.map((capability) => (
                <option key={capability} value={capability}>
                  {capability}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="wb-kicker">Target Limit</span>
            <Input value={maxTargetCount} onChange={(event) => setMaxTargetCount(event.target.value)} inputMode="numeric" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <Button
              key={action.value}
              type="button"
              onClick={() => chatMutation.mutate(action.value)}
              disabled={chatMutation.isPending}
              title={action.description}
            >
              {chatMutation.isPending && activeAction === action.value ? `${action.label}...` : action.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Focused subnet: {selectedSubnet ? `${selectedSubnet.name} (${selectedSubnet.cidrBlock})` : "All available inventory"}</span>
          <span>Actor: {actorUserId || "Unavailable"}</span>
          <span>Autonomy: {status.autonomyEnabled ? "Backend active" : "Disabled"}</span>
          {submitError ? <span className="text-destructive">{submitError}</span> : null}
        </div>

        {actionDisabledReason ? (
          <div className="rounded-xl border border-border/70 bg-surface-2/55 px-3 py-2 text-sm text-muted-foreground">
            {actionDisabledReason}
          </div>
        ) : null}

        {chatMutation.isPending && activeAction ? (
          <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Zira is working</p>
              <span className="text-xs text-muted-foreground">{actionLabel(activeAction)}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{actionProgressLine(activeAction)}</p>
          </div>
        ) : null}

        {chatState ? (
          <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Zira responded</p>
              <span className="text-xs text-muted-foreground">{formatTimestamp(chatState.messages.at(-1)?.timestampUtc)}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {chatState.messages.at(-1)?.content ?? chatState.agentStatusLine}
            </p>
          </div>
        ) : null}

        {lastActionFeedback ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{lastActionFeedback.title}</p>
              <span className="text-xs text-muted-foreground">{formatTimestamp(lastActionFeedback.timestampUtc)}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{lastActionFeedback.detail}</p>
          </div>
        ) : null}

        {status.operatingMode === "MockFallback" ? (
          <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Radar className="h-4 w-4 text-amber-300" />
              Demo scenario controls
            </div>
            <div className="flex flex-wrap gap-2">
              {status.availableMockConditions.map((condition) => {
                const typed = condition as ScanAnalystSimulatedCondition
                const active = simulatedConditions.includes(typed)
                return (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleCondition(typed)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-border/70 bg-surface-2/55 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {MOCK_CONDITION_LABELS[typed]}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Live SQL data is unavailable for the POC, so Zira is using a fixed demo scenario with optional simulated
              conditions.
            </p>
          </div>
        ) : null}
      </motion.article>

      <StatusOverview status={status} />

      <motion.article className="grid gap-4 xl:grid-cols-[1.1fr_1fr]" variants={panelMotion}>
        <div ref={conversationRef}>
          <CollapsibleSection
            eyebrow="Conversation"
            title="Zira session"
            defaultOpen={Boolean(chatState)}
            badge={
              <span className="rounded-full border border-border/70 bg-surface-2/60 px-3 py-1 text-xs text-muted-foreground">
                {chatState?.sessionId ? `Session ${chatState.sessionId.slice(0, 8)}` : "No active session"}
              </span>
            }
          >

          {chatState ? (
            <div className="space-y-3">
              {chatState.messages.map((entry, index) => (
                <div
                  key={`${entry.timestampUtc}-${index}`}
                  className={`rounded-2xl border p-3 ${
                    entry.role === "agent"
                      ? "border-primary/25 bg-primary/10"
                      : "border-border/70 bg-surface-2/55"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-xs font-medium">
                      {entry.role === "agent" ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5" />}
                      {entry.role === "agent" ? "Zira" : "User"}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{formatTimestamp(entry.timestampUtc)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No conversation yet"
              description="Ask Zira to investigate a discovery pattern, revise a plan, or run a scan so the session memory can start building."
            />
          )}
          </CollapsibleSection>
        </div>

        <CollapsibleSection
          eyebrow="Zira posture"
          title="Autonomy and guardrails"
          badge={<StatusBadge value={status.parameters.enabled ? "Editable" : "Paused"} />}
        >
          <PostureEditor
            actorUserId={actorUserId}
            error={postureMutation.error}
            isSaving={postureMutation.isPending}
            onSave={(input) => postureMutation.mutateAsync(input)}
            status={status}
          />

          <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3 text-sm text-muted-foreground">
            <p>{chatState?.agentStatusLine ?? "Zira is online and waiting for a session request."}</p>
            {status.lastAutonomousActivity ? (
              <p className="mt-2 text-xs">
                Last autonomous pass: {status.lastAutonomousActivity.summary} at{" "}
                {formatTimestamp(status.lastAutonomousActivity.occurredAtUtc)}.
              </p>
            ) : null}
          </div>
        </CollapsibleSection>
      </motion.article>

      {!currentAnalysis ? (
        <motion.article variants={panelMotion}>
          <EmptyState
            title="No Zira proposal yet"
            description="Start the conversation above, then Zira will draft a plan, keep context across turns, and surface execution output when available."
          />
        </motion.article>
      ) : (
        <>
          <motion.article className="wb-panel space-y-4" variants={panelMotion}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Scanner</p>
                <p className="mt-1 text-lg font-semibold">{currentAnalysis.recommendedScannerCapability}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Targets</p>
                <p className="mt-1 text-lg font-semibold">{currentAnalysis.proposedPlan.targetServerIds.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Rules</p>
                <p className="mt-1 text-lg font-semibold">{currentAnalysis.proposedPlan.ruleRevisionIds.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Mode</p>
                <p className="mt-1 text-lg font-semibold">{currentAnalysis.operatingMode}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Planner</p>
                <p className="mt-1 text-lg font-semibold">{resolvePlannerModeLabel(currentAnalysis.plannerMode)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Action</p>
                <p className="mt-1 text-base font-semibold">{actionLabel(currentAnalysis.action)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Created plan</p>
                <p className="mt-1 text-base font-semibold">{currentAnalysis.createdPlan ? "Yes" : "Not yet"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Queued run</p>
                <p className="mt-1 text-base font-semibold">{currentAnalysis.queuedJob ? "Yes" : "Not yet"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
              <p className="text-sm font-medium">{currentAnalysis.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Context: {currentAnalysis.contextSummary.discoveryRunCount} discovery runs,{" "}
                {currentAnalysis.contextSummary.discoveredHostCount} discovered hosts, {currentAnalysis.contextSummary.managedServerCount} managed
                servers, {currentAnalysis.contextSummary.candidateRuleCount} candidate rules.
              </p>
            </div>

            {currentAnalysis.createdPlan ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-3 text-sm">
                <p>
                  Created plan <strong>{currentAnalysis.createdPlan.name}</strong>.{" "}
                  <Link href="/scan-plan" className="underline underline-offset-4">
                    Open scan plans
                  </Link>
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold tracking-tight">Observations</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {currentAnalysis.observations.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg border border-border/60 bg-surface-2/45 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-semibold tracking-tight">Reasoning</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {currentAnalysis.reasoning.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg border border-border/60 bg-surface-2/45 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
                {currentAnalysis.validationWarnings.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">Warnings</h3>
                    {currentAnalysis.validationWarnings.map((item, index) => (
                      <p key={`${item}-${index}`} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.article>

          <motion.article className="wb-panel space-y-4" variants={panelMotion}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="wb-kicker">Plan Editor</p>
                <h2 className="mt-1 text-sm font-semibold tracking-tight">Refine before the next run</h2>
              </div>
              {draftPlan ? <StatusBadge value={draftPlan.status} /> : null}
            </div>

            {draftPlan ? (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="space-y-1">
                    <span className="wb-kicker">Plan name</span>
                    <Input value={draftPlan.name} onChange={(event) => updateDraftPlan({ name: event.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="wb-kicker">Scanner family</span>
                    <select
                      value={draftPlan.scannerCapability}
                      onChange={(event) =>
                        updateDraftPlan({ scannerCapability: event.target.value as ScanAnalystPlanProposalResponse["scannerCapability"] })
                      }
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {CAPABILITIES.filter((item) => item !== "Auto").map((capability) => (
                        <option key={capability} value={capability}>
                          {capability}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 lg:col-span-2">
                    <span className="wb-kicker">Description</span>
                    <Textarea value={draftPlan.description} onChange={(event) => updateDraftPlan({ description: event.target.value })} rows={3} />
                  </label>
                  <label className="space-y-1 lg:col-span-2">
                    <span className="wb-kicker">Operator notes</span>
                    <Textarea value={draftPlan.operatorNotes} onChange={(event) => updateDraftPlan({ operatorNotes: event.target.value })} rows={3} />
                  </label>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Use</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftPlan.targets.map((target) => {
                          const selected = draftPlan.targetServerIds.includes(target.targetServerId)
                          return (
                            <TableRow key={target.targetServerId}>
                              <TableCell>
                                <input type="checkbox" checked={selected} onChange={() => toggleTarget(target.targetServerId)} />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{target.hostname}</div>
                                <div className="text-xs text-muted-foreground">
                                  {target.ipAddress} - {target.operatingSystem} - {target.environment}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{target.reason}</div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge value={target.connectivityStatus} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Use</TableHead>
                          <TableHead>Rule</TableHead>
                          <TableHead>Family</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftPlan.rules.map((rule) => {
                          const selected = draftPlan.ruleRevisionIds.includes(rule.ruleRevisionId)
                          return (
                            <TableRow key={rule.ruleRevisionId}>
                              <TableCell>
                                <input type="checkbox" checked={selected} onChange={() => toggleRule(rule.ruleRevisionId)} />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{rule.ruleName}</div>
                                <div className="text-xs text-muted-foreground">{rule.reason}</div>
                              </TableCell>
                              <TableCell>{rule.ruleFamily}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : null}
          </motion.article>

          {activeRunSummary ? (
            <motion.article className="wb-panel space-y-4" variants={panelMotion}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="wb-kicker">Run Summary</p>
                  <h2 className="mt-1 text-sm font-semibold tracking-tight">Analyst narrative</h2>
                </div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  <StatusBadge value={activeRunSummary.jobStatus} />
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                <p className="text-sm">{activeRunSummary.narrativeSummary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Generated {formatTimestamp(activeRunSummary.generatedAtUtc)} | Targets {activeRunSummary.completedTargets}/
                  {activeRunSummary.totalTargets} complete | Detections {activeRunSummary.detectionCount}
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRunSummary.targetExecutions.map((target, index) => (
                        <TableRow key={`${target.targetHostname}-${index}`}>
                          <TableCell>
                            <div className="font-medium">{target.targetHostname}</div>
                            <div className="text-xs text-muted-foreground">{target.targetIpAddress}</div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={target.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{target.errorMessage ?? target.summary}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Disposition</TableHead>
                        <TableHead>Observed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRunSummary.detections.length > 0 ? (
                        activeRunSummary.detections.map((detection) => (
                          <TableRow key={detection.detectionId}>
                            <TableCell>
                              <div className="font-medium">{detection.ruleName}</div>
                              <div className="text-xs text-muted-foreground">{detection.serverHostname}</div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge value={detection.disposition} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatTimestamp(detection.observedAtUtc)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground">
                            No detections are available for this run summary yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.article>
          ) : null}
        </>
      )}
    </motion.section>
  )
}
