"use client"

import type {
  ReportMitigationActionResponse,
  ReportMitigationPlanResponse,
  ReportMitigationPrimaryActionResponse,
  ReportMitigationTimelineStepResponse,
} from "@/shared/api/schemas"

export type LegacyPlanLike = Partial<ReportMitigationPlanResponse> & {
  primaryActions?: Array<Partial<ReportMitigationPrimaryActionResponse>> | null
  timeline?: Array<Partial<ReportMitigationTimelineStepResponse>> | null
  immediateActions?: Array<Partial<ReportMitigationActionResponse>> | null
  detectionActions?: Array<Partial<ReportMitigationActionResponse>> | null
  hardeningActions?: Array<Partial<ReportMitigationActionResponse>> | null
  affectedAssetHypotheses?: string[] | null
}

type NormalizedPrimaryAction = {
  rank: number
  title: string
  targetHint: string
  urgency: string
  reasoning: string
}

type NormalizedTimelineStep = {
  stepId: string
  title: string
  linkedPrimaryActionRank: number | null
  targetHint: string
  lane: string
  startsIn: number
  duration: number
  unit: string
  rationale: string
}

function laneTone(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === "containment") {
    return "bg-cyan-400/80"
  }
  if (normalized === "validation") {
    return "bg-amber-400/80"
  }
  if (normalized === "recovery") {
    return "bg-emerald-400/80"
  }
  return "bg-slate-400/80"
}

function formatLaneLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === "containment") {
    return "Containment"
  }
  if (normalized === "validation") {
    return "Validation"
  }
  if (normalized === "recovery") {
    return "Recovery"
  }
  return value.replace(/_/g, " ") || "Mitigation"
}

function normalizeAction(action: Partial<ReportMitigationActionResponse> | undefined, rank: number, targetHint: string, urgency: string): NormalizedPrimaryAction {
  return {
    rank,
    title: action?.title?.trim() || `Mitigation action ${rank}`,
    targetHint,
    urgency,
    reasoning: action?.rationale?.trim() || "Aegis did not record a detailed reason for this action.",
  }
}

export function buildAegisPrimaryActions(plan: LegacyPlanLike): NormalizedPrimaryAction[] {
  const direct = (plan.primaryActions ?? [])
    .map((item, index) => ({
      rank: typeof item.rank === "number" ? item.rank : index + 1,
      title: item.title?.trim() || `Mitigation action ${index + 1}`,
      targetHint: item.targetHint?.trim() || plan.affectedAssetHypotheses?.[0] || "Affected target or case",
      urgency: item.urgency?.trim() || (index === 0 ? "now" : index === 1 ? "hours" : "same_day"),
      reasoning: item.reasoning?.trim() || "Aegis did not record a detailed reason for this action.",
    }))
    .sort((left, right) => left.rank - right.rank)

  if (direct.length >= 3) {
    return direct.slice(0, 3)
  }

  const targetHint = plan.affectedAssetHypotheses?.[0] || "Affected target or case"
  const fallbackPool = [
    ...(plan.immediateActions ?? []),
    ...(plan.hardeningActions ?? []),
  ]
  const fallbackUrgencies = ["now", "hours", "same_day"]
  const results = [...direct]

  for (let index = results.length; index < 3; index += 1) {
    results.push(normalizeAction(fallbackPool[index], index + 1, targetHint, fallbackUrgencies[index] ?? "same_day"))
  }

  return results
}

function toHours(unit: string, value: number) {
  return unit.trim().toLowerCase() === "days" ? value * 24 : value
}

function formatWindow(step: NormalizedTimelineStep) {
  const start = step.unit === "days" ? `${step.startsIn}d` : `${step.startsIn}h`
  const endAmount = step.startsIn + step.duration
  const end = step.unit === "days" ? `${endAmount}d` : `${endAmount}h`
  return `${start} - ${end}`
}

function formatRelativeStart(step: NormalizedTimelineStep) {
  if (step.startsIn === 0) {
    return "Start now"
  }

  const unitLabel = step.unit === "days" ? (step.startsIn === 1 ? "day" : "days") : (step.startsIn === 1 ? "hour" : "hours")
  return `Start in ${step.startsIn} ${unitLabel}`
}

function formatDuration(step: NormalizedTimelineStep) {
  const unitLabel = step.unit === "days" ? (step.duration === 1 ? "day" : "days") : (step.duration === 1 ? "hour" : "hours")
  return `${step.duration} ${unitLabel}`
}

function buildScaleLabels(totalHours: number) {
  const labels = [0, 6, 12, 24, totalHours].filter((value, index, array) => array.indexOf(value) === index)
  return labels.map((value) => ({
    value,
    label: value >= 48 ? `${Math.round(value / 24)}d` : `${value}h`,
  }))
}

export function buildAegisTimelineSteps(plan: LegacyPlanLike): NormalizedTimelineStep[] {
  const direct = (plan.timeline ?? [])
    .map((item, index) => ({
      stepId: item.stepId?.trim() || `step-${index + 1}`,
      title: item.title?.trim() || `Mitigation step ${index + 1}`,
      linkedPrimaryActionRank: typeof item.linkedPrimaryActionRank === "number" ? item.linkedPrimaryActionRank : null,
      targetHint: item.targetHint?.trim() || plan.affectedAssetHypotheses?.[0] || "Affected target or case",
      lane: item.lane?.trim() || (index === 0 ? "containment" : index === 1 ? "validation" : "recovery"),
      startsIn: typeof item.startsIn === "number" ? item.startsIn : index * 4,
      duration: typeof item.duration === "number" ? item.duration : 4,
      unit: item.unit?.trim() || "hours",
      rationale: item.rationale?.trim() || "Aegis did not record a timeline rationale for this step.",
    }))
    .sort((left, right) => toHours(left.unit, left.startsIn) - toHours(right.unit, right.startsIn))

  if (direct.length >= 3) {
    return direct
  }

  const primaryActions = buildAegisPrimaryActions(plan)
  return primaryActions.map((action, index) => ({
    stepId: `fallback-${action.rank}`,
    title: action.title,
    linkedPrimaryActionRank: action.rank,
    targetHint: action.targetHint,
    lane: index === 0 ? "containment" : index === 1 ? "validation" : "recovery",
    startsIn: index === 0 ? 0 : index === 1 ? 4 : 24,
    duration: index === 2 ? 1 : 4,
    unit: index === 2 ? "days" : "hours",
    rationale: action.reasoning,
  }))
}

export function AegisPrimaryActions({ plan }: { plan: LegacyPlanLike }) {
  const actions = buildAegisPrimaryActions(plan)

  return (
    <section className="space-y-3">
      <div>
        <p className="wb-kicker">Top 3 Actions</p>
        <h3 className="mt-1 text-xl font-semibold">What the operator should do next</h3>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {actions.map((action) => (
          <article key={`${action.rank}-${action.title}`} className="rounded-3xl border border-border/65 bg-surface-2/45 p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-sm font-semibold text-primary">
                {action.rank}
              </span>
            </div>
            <p className="mt-4 text-base font-semibold">{action.title}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{action.targetHint}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.reasoning}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function AegisMitigationTimeline({
  plan,
  collapsible = false,
  defaultOpen = true,
}: {
  plan: LegacyPlanLike
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const steps = buildAegisTimelineSteps(plan)
  const totalHours = Math.max(...steps.map((step) => toHours(step.unit, step.startsIn + step.duration)), 24)
  const scaleLabels = buildScaleLabels(totalHours)
  const content = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="rounded-2xl border border-border/60 bg-surface-1/50 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div>
              <p className="text-sm font-medium">Suggested order and timing</p>
              <p className="mt-1 text-xs text-muted-foreground">Each bar shows when a mitigation step should start and how long it should stay active.</p>
            </div>
            <div className="flex justify-between gap-2 text-right text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {scaleLabels.map((label) => (
                <span key={`${label.value}-${label.label}`}>{label.label}</span>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {steps.map((step, index) => {
              const startHours = toHours(step.unit, step.startsIn)
              const durationHours = Math.max(toHours(step.unit, step.duration), 1)
              const leftPercent = Math.min((startHours / totalHours) * 100, 100)
              const widthPercent = Math.max((durationHours / totalHours) * 100, 10)

              return (
                <article key={step.stepId} className="rounded-2xl border border-border/60 bg-background/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full border border-primary/35 bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <p className="text-base font-semibold">{step.title}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{step.targetHint}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="wb-chip">{formatLaneLabel(step.lane)}</span>
                      <span className="wb-chip">{formatRelativeStart(step)}</span>
                      <span className="wb-chip">Duration {formatDuration(step)}</span>
                      {step.linkedPrimaryActionRank ? <span className="wb-chip">Action {step.linkedPrimaryActionRank}</span> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div className="space-y-2">
                      <div className="relative h-12 overflow-hidden rounded-2xl border border-border/60 bg-background/55">
                        <div className="absolute inset-y-0 left-1/4 w-px bg-border/45" />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-border/45" />
                        <div className="absolute inset-y-0 left-3/4 w-px bg-border/45" />
                        <div
                          className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-xl shadow-[var(--shadow-soft)] ${laneTone(step.lane)}`}
                          style={{ left: `${leftPercent}%`, width: `${Math.min(widthPercent, 100 - leftPercent)}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Window {formatWindow(step)}</span>
                        <span>Ends by {step.unit === "days" ? `${step.startsIn + step.duration}d` : `${step.startsIn + step.duration}h`}</span>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{step.rationale}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  if (!collapsible) {
    return (
      <section className="space-y-3">
        <div>
          <p className="wb-kicker">Suggested Timeline</p>
          <h3 className="mt-1 text-xl font-semibold">When to carry out the mitigation work</h3>
        </div>
        {content}
      </section>
    )
  }

  return (
    <details className="wb-panel space-y-4" open={defaultOpen}>
      <summary className="-m-1 flex cursor-pointer list-none items-center justify-between rounded-lg p-1 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="wb-kicker">Suggested Timeline</span>
          <span className="mt-1 block text-sm text-muted-foreground">Visual schedule for the mitigation plan.</span>
        </span>
        <span className="wb-chip">{steps.length} steps</span>
      </summary>
      {content}
    </details>
  )
}
