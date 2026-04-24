"use client"

import { motion } from "framer-motion"
import { ArrowRight, ChevronRight, Clock3, Radar, Sparkles, TrendingUp, Triangle } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
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

const LEVEL_THEME: Record<
  (typeof PAIN_LEVELS)[number],
  { fill: string; accent: string; toneFrom: string; toneTo: string; stroke: string; glow: string; border: string }
> = {
  Ttp: {
    fill: "from-rose-500/85 to-orange-400/70",
    accent: "text-rose-700 dark:text-rose-100",
    toneFrom: "#ef4444",
    toneTo: "#fb923c",
    stroke: "rgba(251,146,60,0.34)",
    glow: "rgba(251,146,60,0.18)",
    border: "border-rose-300/35",
  },
  Tool: {
    fill: "from-orange-400/80 to-amber-300/65",
    accent: "text-orange-700 dark:text-orange-100",
    toneFrom: "#f59e0b",
    toneTo: "#fbbf24",
    stroke: "rgba(251,191,36,0.3)",
    glow: "rgba(251,191,36,0.16)",
    border: "border-orange-300/30",
  },
  HostArtifact: {
    fill: "from-amber-300/80 to-yellow-300/60",
    accent: "text-amber-700 dark:text-amber-50",
    toneFrom: "#fcd34d",
    toneTo: "#eab308",
    stroke: "rgba(250,204,21,0.28)",
    glow: "rgba(250,204,21,0.14)",
    border: "border-amber-300/25",
  },
  Domain: {
    fill: "from-cyan-400/70 to-sky-300/60",
    accent: "text-cyan-700 dark:text-cyan-50",
    toneFrom: "#67e8f9",
    toneTo: "#38bdf8",
    stroke: "rgba(103,232,249,0.28)",
    glow: "rgba(103,232,249,0.14)",
    border: "border-cyan-300/25",
  },
  IP: {
    fill: "from-sky-500/75 to-blue-400/60",
    accent: "text-sky-700 dark:text-sky-50",
    toneFrom: "#60a5fa",
    toneTo: "#3b82f6",
    stroke: "rgba(96,165,250,0.28)",
    glow: "rgba(96,165,250,0.14)",
    border: "border-sky-300/25",
  },
  Hash: {
    fill: "from-violet-400/75 to-fuchsia-300/60",
    accent: "text-violet-700 dark:text-violet-50",
    toneFrom: "#a78bfa",
    toneTo: "#c084fc",
    stroke: "rgba(167,139,250,0.28)",
    glow: "rgba(167,139,250,0.14)",
    border: "border-violet-300/25",
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

function formatShareLabel(count: number, share: number) {
  if (count <= 0) {
    return "No detections in range"
  }

  const percent = share * 100
  if (percent > 0 && percent < 1) {
    return "<1% of the current detection mix"
  }

  return `${Math.round(percent)}% of the current detection mix`
}

function buildRange() {
  const toUtc = new Date()
  const fromUtc = new Date(toUtc.getTime() - RANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return {
    fromUtc: fromUtc.toISOString(),
    toUtc: toUtc.toISOString(),
  }
}

function getSparklinePoints(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return ""
  }

  const max = Math.max(...values, 1)
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - (value / max) * height
      return `${x},${y}`
    })
    .join(" ")
}

function buildPostureSummary(analysis: LegacyPipelinePainAnalysis) {
  const highest = [...analysis.levels].sort((left, right) => right.count - left.count)[0]
  if (!highest || highest.count === 0) {
    return "No detections landed in the selected window, so the environment is quiet from a Pyramid of Pain perspective."
  }

  const label = formatPainLevelLabel(highest.level)
  if (highest.level === "Ttp" || highest.level === "Tool") {
    return `The environment is surfacing higher-pain detections, with ${label} currently dominating the last 7 days.`
  }

  return `The current detection mix is still concentrated in ${label}, which suggests more indicator-heavy findings than behavior-level coverage.`
}

function buildLevelInsight(level: string, count: number, share: number) {
  const label = formatPainLevelLabel(level)

  if (count <= 0) {
    return `${label} is quiet in the current window, so this band is available as a comparison point rather than an active source of pressure.`
  }

  if (level === "Ttp") {
    return `${label} detections point to higher-resilience behavioral coverage, which is harder for an adversary to rotate away from than basic indicators.`
  }

  if (level === "Tool") {
    return `${label} activity suggests the environment is surfacing adversary tooling rather than just the artifacts it leaves behind.`
  }

  if (level === "HostArtifact") {
    return `${label} currently carries ${Math.round(share * 100)}% of the mix, which means the present posture is still weighted toward file, command, and network artifacts.`
  }

  if (level === "Domain" || level === "IP" || level === "Hash") {
    return `${label} detections remain indicator-led, which is useful operationally but easier for an adversary to rotate than higher-pain behaviors.`
  }

  return `${label} findings are active in the selected window and should be reviewed in IOC Explorer for deeper evidence context.`
}

export default function PyramidOfPainPage() {
  const router = useRouter()
  const [range] = useState(buildRange)
  const [activeLevel, setActiveLevel] = useState<string>("")
  const analysisQuery = useWorkbenchQuery(
    ["legacy-pipeline", "pain-analysis", range],
    (signal) => getLegacyPainAnalysis(range, signal),
  )

  const analysis = analysisQuery.data
  const orderedLevels = useMemo(() => {
    if (!analysis) {
      return []
    }

    const byLevel = new Map(analysis.levels.map((item) => [item.level, item]))
    return PAIN_LEVELS.map((level) => byLevel.get(level)).filter((value): value is NonNullable<typeof value> => Boolean(value))
  }, [analysis])

  const dominantLevelSummary = useMemo(() => {
    if (!orderedLevels.length) {
      return null
    }

    return [...orderedLevels].sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return PAIN_LEVELS.indexOf(left.level as (typeof PAIN_LEVELS)[number]) - PAIN_LEVELS.indexOf(right.level as (typeof PAIN_LEVELS)[number])
    })[0]
  }, [orderedLevels])

  const fallbackLevelSummary = dominantLevelSummary ?? orderedLevels.find((level) => level.count > 0) ?? orderedLevels[0] ?? null
  const activeLevelSummary = orderedLevels.find((level) => level.level === activeLevel) ?? fallbackLevelSummary
  const maxCount = Math.max(...orderedLevels.map((item) => item.count), 1)
  const postureSummary = analysis ? buildPostureSummary(analysis) : ""
  const activeLevelInsight = activeLevelSummary
    ? buildLevelInsight(activeLevelSummary.level, activeLevelSummary.count, activeLevelSummary.share)
    : ""

  const trendByLevel = useMemo(() => {
    if (!analysis) {
      return new Map<string, number[]>()
    }

    return new Map(
      PAIN_LEVELS.map((level) => [
        level,
        analysis.trend.map((point) => point.countsByLevel[level] ?? 0),
      ]),
    )
  }, [analysis])

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
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary/90">
              <Triangle className="h-3.5 w-3.5" />
              Pyramid Of Pain
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Detection posture, not just detection count</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Translate normalized findings into the kinds of adversary pressure you are actually observing across the environment.
            </p>
            <p className="mt-4 max-w-2xl text-sm text-foreground/90">{postureSummary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-border/70 bg-surface-2/50 p-4 backdrop-blur"
            >
              <p className="wb-kicker">Total Findings</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{formatCount(analysis.totalCount)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-2xl border border-border/70 bg-surface-2/50 p-4 backdrop-blur"
            >
              <p className="wb-kicker">Window</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge value="7 days" />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="rounded-2xl border border-border/70 bg-surface-2/50 p-4 backdrop-blur"
            >
              <p className="wb-kicker">Top Pressure</p>
              <p className="mt-2 text-base font-semibold tracking-tight">
                {dominantLevelSummary ? formatPainLevelLabel(dominantLevelSummary.level) : "No detections"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dominantLevelSummary ? `${formatCount(dominantLevelSummary.count)} findings in range` : "No matching findings"}
              </p>
            </motion.div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="gap-2">
            <Clock3 className="h-3.5 w-3.5" />
            7 days
          </Button>
          {["24h", "30d"].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border/60 bg-surface-2/40 px-3 py-1.5 text-xs text-muted-foreground/80"
            >
              <span>{label}</span>
              <span className="rounded-full border border-border/60 bg-surface-1/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                Soon
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <article className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_92%,transparent),color-mix(in_srgb,var(--surface-1)_90%,transparent))] p-5 shadow-[var(--shadow-reading-surface)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="wb-kicker">Pain Pyramid</p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">Higher levels mean more resilient detection value</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Radar className="h-3.5 w-3.5" />
              Click a band to inspect findings
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {orderedLevels.map((level, index) => {
              const theme = LEVEL_THEME[level.level as keyof typeof LEVEL_THEME]
              const width = 56 + index * 8
              const intensity = Math.max(level.count / maxCount, 0.08)
              const isActive = activeLevel === level.level
              const contentInset = `${Math.max(11.5 - index * 0.35, 9.5)}%`
              const gradientId = `pain-band-gradient-${level.level}`
              const shapeId = `pain-band-shape-${level.level}`
              const shadowId = `pain-band-shadow-${level.level}`
              return (
                <motion.button
                  key={level.level}
                  type="button"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  onClick={() => setActiveLevel(level.level)}
                  className={cn(
                    "group relative mx-auto block h-[4.5rem] overflow-visible text-left transition-all",
                    isActive
                      ? "scale-[1.008] shadow-[var(--shadow-soft)]"
                      : "opacity-92 hover:opacity-100",
                  )}
                  style={{
                    width: `${width}%`,
                  }}
                >
                  <svg
                    viewBox="0 0 1000 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={theme.toneFrom} stopOpacity="0.96" />
                        <stop offset="100%" stopColor={theme.toneTo} stopOpacity="0.74" />
                      </linearGradient>
                      <clipPath id={shapeId}>
                        <path d="M72 6 H905 Q944 6 956 28 L990 82 Q998 94 982 98 H28 Q8 98 10 82 L42 28 Q54 6 72 6 Z" />
                      </clipPath>
                      <filter id={shadowId} x="-8%" y="-18%" width="116%" height="150%">
                        <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="color-mix(in srgb, var(--foreground) 28%, transparent)" />
                      </filter>
                    </defs>
                    <path
                      d="M72 6 H905 Q944 6 956 28 L990 82 Q998 94 982 98 H28 Q8 98 10 82 L42 28 Q54 6 72 6 Z"
                      fill="color-mix(in srgb, var(--surface-1) 86%, transparent)"
                      filter={`url(#${shadowId})`}
                    />
                    <path
                      d="M72 6 H905 Q944 6 956 28 L990 82 Q998 94 982 98 H28 Q8 98 10 82 L42 28 Q54 6 72 6 Z"
                      fill="color-mix(in srgb, var(--foreground) 2%, transparent)"
                      stroke={theme.stroke}
                      strokeWidth="1.8"
                    />
                    <path
                      d="M72 6 H905"
                      stroke="color-mix(in srgb, var(--foreground) 14%, transparent)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(intensity * 1000, 90)}
                      height="100"
                      fill={`url(#${gradientId})`}
                      clipPath={`url(#${shapeId})`}
                    />
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(intensity * 1000, 90)}
                      height="100"
                      fill={theme.glow}
                      opacity="0.28"
                      clipPath={`url(#${shapeId})`}
                    />
                  </svg>
                  <div
                    className="relative z-10 grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-5"
                    style={{ paddingLeft: contentInset, paddingRight: contentInset }}
                  >
                    <div className="min-w-0">
                      <p className={cn("truncate text-[13px] font-semibold tracking-tight", theme.accent)}>
                        {formatPainLevelLabel(level.level)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-foreground/70">
                        {formatShareLabel(level.count, level.share)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold tracking-tight text-foreground sm:text-[1.65rem]">{formatCount(level.count)}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/60">detections</p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {activeLevelSummary ? (
            <motion.div
              key={activeLevelSummary.level}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className={cn(
                "mt-5 rounded-[24px] border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_92%,transparent),color-mix(in_srgb,var(--surface-1)_88%,transparent))] p-4 shadow-[var(--shadow-soft)]",
                LEVEL_THEME[activeLevelSummary.level as keyof typeof LEVEL_THEME].border,
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <p className="wb-kicker">Selected Level</p>
                  <h4 className="mt-1 text-lg font-semibold tracking-tight">
                    {formatPainLevelLabel(activeLevelSummary.level)}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">{activeLevelInsight}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                  <div className="rounded-2xl border border-border/70 bg-surface-2/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Findings</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight">{formatCount(activeLevelSummary.count)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface-2/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Share</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight">
                      {activeLevelSummary.count > 0 ? `${Math.max(Math.round(activeLevelSummary.share * 100), 1)}%` : "0%"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/35 px-3 py-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  {range.fromUtc.slice(0, 10)} to {range.toUtc.slice(0, 10)}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    router.push(
                      `/ioc-ingestion?painLevel=${encodeURIComponent(activeLevelSummary.level)}&fromUtc=${encodeURIComponent(range.fromUtc)}&toUtc=${encodeURIComponent(range.toUtc)}`,
                    )
                  }
                >
                  Open in IOC Explorer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ) : null}
        </article>

        <article className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_92%,transparent),color-mix(in_srgb,var(--surface-1)_88%,transparent))] p-5 shadow-[var(--shadow-reading-surface)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="wb-kicker">Trend Rail</p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">7-day motion by pain level</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/35 px-3 py-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Daily buckets
            </div>
          </div>

          <div className="space-y-2.5">
            {orderedLevels.map((level, index) => {
              const values = trendByLevel.get(level.level) ?? []
              const points = getSparklinePoints(values, 220, 52)
              const theme = LEVEL_THEME[level.level as keyof typeof LEVEL_THEME]
              return (
                <motion.button
                  key={level.level}
                  type="button"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.32, delay: index * 0.05 }}
                  onClick={() => setActiveLevel(level.level)}
                  className={cn(
                    "w-full rounded-2xl border bg-surface-2/40 p-2.5 text-left transition-colors",
                    theme.border,
                    activeLevel === level.level
                      ? "bg-surface-2/60 shadow-[var(--shadow-soft)]"
                      : "hover:bg-surface-2/55",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{formatPainLevelLabel(level.level)}</p>
                      <p className="text-xs text-muted-foreground">{formatCount(level.count)} findings in this window</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-border/60 bg-background/35 p-2">
                    <svg viewBox="0 0 220 52" className="h-11 w-full">
                      <defs>
                        <linearGradient id={`spark-${level.level}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="color-mix(in srgb, var(--foreground) 18%, transparent)" />
                          <stop offset="100%" stopColor="color-mix(in srgb, var(--foreground) 72%, transparent)" />
                        </linearGradient>
                      </defs>
                      {points ? (
                        <polyline
                          fill="none"
                          stroke={`url(#spark-${level.level})`}
                          strokeWidth="2.5"
                          points={points}
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : null}
                    </svg>
                  </div>
                </motion.button>
              )
            })}
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="wb-kicker">Recent Findings</p>
                <h4 className="mt-1 text-base font-semibold tracking-tight">
                  {activeLevelSummary ? formatPainLevelLabel(activeLevelSummary.level) : "Selected level"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Newest evidence for the active level. Use IOC Explorer for full filtering and row-level investigation.
                </p>
              </div>
              {activeLevelSummary ? (
                <Link
                  href={`/ioc-ingestion?painLevel=${encodeURIComponent(activeLevelSummary.level)}&fromUtc=${encodeURIComponent(range.fromUtc)}&toUtc=${encodeURIComponent(range.toUtc)}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-2/40 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-2/60"
                >
                  Open in IOC Explorer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-1/80">
              {activeLevelSummary && activeLevelSummary.previewIocs.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {activeLevelSummary.previewIocs.slice(0, 5).map((finding, index) => (
                    <motion.div
                      key={finding.iocId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: index * 0.04 }}
                      className="grid gap-2 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={finding.scannerFamily} />
                        <StatusBadge value={finding.severity} />
                        <span className="text-[11px] text-muted-foreground">{formatTimestamp(finding.timestampUtc)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium tracking-tight">{finding.ruleName}</p>
                        <p className="truncate text-xs text-muted-foreground">{finding.indicatorValue}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                        <span className="truncate">{finding.targetDisplay}</span>
                        <span className="shrink-0">{finding.targetIp ?? "No target IP"}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-5 py-7 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-surface-2/55">
                    <Triangle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold tracking-tight">No recent findings for this level</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    The active band is quiet in the current 7-day window, so the page stays focused on comparative posture rather than forcing empty detail rows.
                  </p>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
