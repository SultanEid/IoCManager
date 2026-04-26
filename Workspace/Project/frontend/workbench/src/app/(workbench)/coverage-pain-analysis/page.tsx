"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Fingerprint,
  Globe2,
  Hash as HashIcon,
  Network,
  Radar,
  ShieldAlert,
  Swords,
  Triangle,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { type CSSProperties, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { classifyUiError } from "@/shared/api/error-classification"
import { getLegacyPainAnalysis, type LegacyPipelinePainAnalysis } from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { LoadingState } from "@/shared/ui/state-panels"

const PAIN_LEVELS = ["Ttp", "Tool", "HostArtifact", "Domain", "IP", "Hash"] as const
const RANGE_WINDOW_DAYS = 7

type PainLevel = (typeof PAIN_LEVELS)[number]

const LEVEL_META: Record<PainLevel, {
  icon: LucideIcon
  accent: string
  surface: string
  border: string
  description: string
  exampleLabel: string
}> = {
  Ttp: {
    icon: Swords,
    accent: "text-rose-100",
    surface: "from-rose-500/92 to-orange-400/78",
    border: "border-rose-300/45",
    description: "Behavior and technique detections that are hardest for an adversary to rotate away from.",
    exampleLabel: "Behavior",
  },
  Tool: {
    icon: Wrench,
    accent: "text-orange-50",
    surface: "from-orange-400/90 to-amber-300/74",
    border: "border-orange-300/40",
    description: "Tooling and dual-use utility detections where the tool family is the primary signal.",
    exampleLabel: "Tooling",
  },
  HostArtifact: {
    icon: Fingerprint,
    accent: "text-amber-950",
    surface: "from-amber-300/92 to-yellow-300/74",
    border: "border-amber-300/40",
    description: "Files, URLs, registry paths, command lines, process artifacts, and network artifacts.",
    exampleLabel: "Artifact",
  },
  Domain: {
    icon: Globe2,
    accent: "text-cyan-950",
    surface: "from-cyan-300/88 to-sky-300/72",
    border: "border-cyan-300/40",
    description: "Bare domains and hostnames that can be blocked or monitored but are easier to replace.",
    exampleLabel: "Domain",
  },
  IP: {
    icon: Network,
    accent: "text-sky-50",
    surface: "from-sky-500/88 to-blue-400/72",
    border: "border-sky-300/40",
    description: "Source and destination IP indicators from network findings or standalone IP rows.",
    exampleLabel: "Address",
  },
  Hash: {
    icon: HashIcon,
    accent: "text-violet-50",
    surface: "from-violet-500/88 to-fuchsia-400/72",
    border: "border-violet-300/40",
    description: "Exact file hashes. Useful for containment, but cheap for attackers to change.",
    exampleLabel: "Hash",
  },
}

function formatPainLevelLabel(value: string) {
  if (value === "HostArtifact") {
    return "Host / Network Artifact"
  }

  if (value === "Ttp") {
    return "TTP"
  }

  return value
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function formatCount(value: number) {
  return value.toLocaleString()
}

function formatPercent(share: number, count: number) {
  if (count <= 0) {
    return "0%"
  }

  const percent = share * 100
  if (percent > 0 && percent < 1) {
    return "<1%"
  }

  return `${Math.round(percent)}%`
}

function buildRange() {
  const toUtc = new Date()
  const fromUtc = new Date(toUtc.getTime() - RANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return {
    fromUtc: fromUtc.toISOString(),
    toUtc: toUtc.toISOString(),
  }
}

function buildPostureSummary(analysis: LegacyPipelinePainAnalysis) {
  const dominant = [...analysis.levels].sort((left, right) => right.count - left.count)[0]
  if (!dominant || dominant.count === 0) {
    return "No IOC detections landed in the selected window."
  }

  const label = formatPainLevelLabel(dominant.level)
  if (dominant.level === "Ttp" || dominant.level === "Tool") {
    return `${label} currently leads the detection mix, so the environment is seeing higher-pain adversary signals.`
  }

  return `${label} currently leads the detection mix, so the posture is still weighted toward indicator-level findings.`
}

export default function PyramidOfPainPage() {
  const router = useRouter()
  const [range] = useState(buildRange)
  const [activeLevel, setActiveLevel] = useState<PainLevel>("Ttp")
  const analysisQuery = useWorkbenchQuery(
    ["legacy-pipeline", "pain-analysis", range],
    (signal) => getLegacyPainAnalysis(range, signal),
    {
      staleTime: 60_000,
      gcTime: 300_000,
      placeholderData: (previousData) => previousData,
    },
  )

  const analysis = analysisQuery.data
  const orderedLevels = useMemo(() => {
    const byLevel = new Map(analysis?.levels.map((item) => [item.level, item]) ?? [])
    return PAIN_LEVELS.map((level) => byLevel.get(level) ?? {
      level,
      label: formatPainLevelLabel(level),
      count: 0,
      share: 0,
      previewIocs: [],
    })
  }, [analysis])

  const activeLevelSummary = orderedLevels.find((level) => level.level === activeLevel) ?? orderedLevels[0]
  const maxCount = Math.max(...orderedLevels.map((level) => level.count), 1)
  const postureSummary = analysis ? buildPostureSummary(analysis) : ""
  const activeMeta = LEVEL_META[activeLevelSummary.level as PainLevel]
  const ActiveIcon = activeMeta.icon

  if (analysisQuery.isLoading) {
    return <LoadingState label="Loading Pyramid of Pain" />
  }

  if (analysisQuery.isError || !analysis) {
    return (
      <ClassifiedFailureState
        failure={classifyUiError(analysisQuery.error)}
        fallbackTitle="Pyramid of Pain unavailable"
      />
    )
  }

  return (
    <section className="wb-page space-y-6">
      <header className="wb-page-header">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary/90">
              <Triangle className="h-3.5 w-3.5" />
              Pyramid Of Pain
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">IOC pressure by adversary effort</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Each IOC is categorized by its strongest value-first indicator, then linked back to IOC Explorer for row-level review.
            </p>
            <p className="mt-4 max-w-2xl text-sm text-foreground/90">{postureSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2">
              <Clock3 className="h-3.5 w-3.5" />
              7 days
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() =>
                router.push(
                  `/ioc-ingestion?fromUtc=${encodeURIComponent(range.fromUtc)}&toUtc=${encodeURIComponent(range.toUtc)}`,
                )
              }
            >
              Open IOC Explorer
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="wb-metric-card">
          <p className="wb-kicker">Total Findings</p>
          <p className="mt-2 text-3xl font-semibold">{formatCount(analysis.totalCount)}</p>
        </div>
        <div className="wb-metric-card">
          <p className="wb-kicker">Window</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge value="7 days" />
            <span className="text-xs text-muted-foreground">
              {range.fromUtc.slice(0, 10)} to {range.toUtc.slice(0, 10)}
            </span>
          </div>
        </div>
        <div className="wb-metric-card">
          <p className="wb-kicker">Active Tier</p>
          <div className="mt-2 flex items-center gap-2">
            <ActiveIcon className="h-4 w-4 text-primary" />
            <p className="text-base font-semibold">{formatPainLevelLabel(activeLevelSummary.level)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.7fr)]">
        <article className="overflow-hidden rounded-2xl border border-border/70 bg-surface-1/88 p-4 shadow-[var(--shadow-reading-surface)] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="wb-kicker">Value-First Tiers</p>
              <h3 className="mt-1 text-base font-semibold">Cleaner Pyramid of Pain distribution</h3>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-surface-2/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Radar className="h-3.5 w-3.5" />
              Select a band
            </div>
          </div>

          <div className="space-y-2.5">
            {orderedLevels.map((level, index) => {
              const key = level.level as PainLevel
              const meta = LEVEL_META[key]
              const Icon = meta.icon
              const isActive = activeLevelSummary.level === level.level
              const width = `${58 + index * 7}%`
              const intensity = level.count / maxCount
              const newest = level.previewIocs[0]

              return (
                <motion.button
                  key={level.level}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.035 }}
                  onClick={() => setActiveLevel(key)}
                  className={cn(
                    "group mx-auto grid min-h-[84px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition sm:w-[var(--band-width)]",
                    `bg-gradient-to-r ${meta.surface}`,
                    meta.border,
                    isActive ? "scale-[1.01] shadow-[0_18px_46px_rgba(0,0,0,0.22)]" : "hover:scale-[1.005] hover:opacity-100",
                  )}
                  style={{
                    "--band-width": width,
                    clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
                    opacity: level.count > 0 ? 0.82 + intensity * 0.18 : 0.54,
                  } as CSSProperties}
                  aria-pressed={isActive}
                >
                  <div className="flex min-w-0 items-center gap-3 px-4 sm:px-8">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/18", meta.accent)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-base font-semibold", meta.accent)}>
                        {formatPainLevelLabel(level.level)}
                      </span>
                      <span className={cn("mt-1 block truncate text-xs", meta.accent)}>
                        {newest ? `${meta.exampleLabel}: ${newest.indicatorValue}` : meta.description}
                      </span>
                    </span>
                  </div>
                  <span className={cn("px-4 text-right sm:px-8", meta.accent)}>
                    <span className="block text-3xl font-semibold">{formatCount(level.count)}</span>
                    <span className="block text-[11px] uppercase tracking-[0.14em]">{formatPercent(level.share, level.count)}</span>
                  </span>
                </motion.button>
              )
            })}
          </div>
        </article>

        <aside className="rounded-2xl border border-border/70 bg-surface-1/88 p-5 shadow-[var(--shadow-reading-surface)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="wb-kicker">Selected Band</p>
              <h3 className="mt-1 text-lg font-semibold">{formatPainLevelLabel(activeLevelSummary.level)}</h3>
            </div>
            <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-r", activeMeta.surface, activeMeta.accent)}>
              <ActiveIcon className="h-5 w-5" />
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{activeMeta.description}</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-surface-2/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Findings</p>
              <p className="mt-1 text-2xl font-semibold">{formatCount(activeLevelSummary.count)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-2/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Share</p>
              <p className="mt-1 text-2xl font-semibold">{formatPercent(activeLevelSummary.share, activeLevelSummary.count)}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-5">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Current 7-day sample
            </div>
            <Link
              href={`/ioc-ingestion?painLevel=${encodeURIComponent(activeLevelSummary.level)}&fromUtc=${encodeURIComponent(range.fromUtc)}&toUtc=${encodeURIComponent(range.toUtc)}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/45 px-3 py-1.5 text-xs text-foreground transition hover:bg-surface-2/70"
            >
              Open rows
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Recent IOCs</h4>
            </div>
            {activeLevelSummary.previewIocs.length > 0 ? (
              <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-surface-2/35">
                {activeLevelSummary.previewIocs.slice(0, 6).map((finding) => (
                  <div key={finding.iocId} className="grid gap-2 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={finding.scannerFamily} />
                      <StatusBadge value={finding.severity} />
                      <span className="text-[11px] text-muted-foreground">{formatTimestamp(finding.timestampUtc)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{finding.ruleName}</p>
                      <p className="truncate text-xs text-muted-foreground">{finding.indicatorValue}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-border/70 bg-surface-2/30 px-5 text-center">
                <p className="text-sm text-muted-foreground">No recent IOCs are categorized in this tier for the selected window.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
