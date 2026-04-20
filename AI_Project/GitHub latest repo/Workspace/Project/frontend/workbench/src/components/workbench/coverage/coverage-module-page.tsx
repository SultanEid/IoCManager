"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowDownRight, ArrowUpRight, CircleDashed, Radar } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildComparedTiers, buildPainGapRollup, getCoverageVm } from "@/shared/modules/coverage-foundation"
import type {
  AnalysisMode,
  CoverageSubpageKey,
  GapReason,
  ScopeType,
  TierDefinition,
  TierSnapshot,
} from "@/shared/modules/types"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState } from "@/shared/ui/state-panels"

const SEGMENT_WIDTH = ["w-[46%]", "w-[56%]", "w-[66%]", "w-[76%]", "w-[86%]", "w-full"] as const

type CoverageModulePageProps = {
  subpageKey: CoverageSubpageKey
}

function parseMode(value: string | null, fallback: AnalysisMode): AnalysisMode {
  return value === "active" ? "active" : value === "readiness" ? "readiness" : fallback
}

function trendIcon(value: number) {
  if (value > 0) return <ArrowUpRight className="h-3.5 w-3.5" />
  if (value < 0) return <ArrowDownRight className="h-3.5 w-3.5" />
  return <CircleDashed className="h-3.5 w-3.5" />
}

function trendTone(value: number) {
  if (value > 0) return "text-emerald-200"
  if (value < 0) return "text-rose-200"
  return "text-muted-foreground"
}

function freshnessTone(value: TierSnapshot["freshness"]["state"]) {
  if (value === "Fresh") return "text-emerald-200"
  if (value === "Aging") return "text-amber-200"
  return "text-rose-200"
}

function confidenceTone(value: TierSnapshot["confidence"]) {
  if (value === "High") return "text-emerald-200"
  if (value === "Medium") return "text-amber-200"
  return "text-rose-200"
}

function gapLabel(value: GapReason) {
  if (value === "weak_logic") return "Weak logic"
  if (value === "missing_telemetry") return "Missing telemetry"
  return "Healthy"
}

function gapTone(value: GapReason) {
  if (value === "weak_logic") return "border-amber-300/35 bg-amber-400/10 text-amber-200"
  if (value === "missing_telemetry") return "border-rose-300/35 bg-rose-400/10 text-rose-200"
  return "border-emerald-300/35 bg-emerald-400/10 text-emerald-200"
}

function snapshotForMode(tier: TierDefinition, mode: AnalysisMode) {
  return mode === "readiness" ? tier.readiness : tier.active
}

function subpageCopy(subpageKey: CoverageSubpageKey) {
  if (subpageKey === "pain-analysis") {
    return {
      kicker: "IoC Registry",
      title: "Registry Overview",
      description: "Six-tier registry posture with explicit weak-vs-missing gap separation and actionable drilldown.",
    }
  }
  if (subpageKey === "telemetry") {
    return { kicker: "Telemetry", title: "Telemetry Coverage", description: "Collection health, parse quality, utility, freshness, and collection-status analytics." }
  }
  return { kicker: "Sources", title: "Source Analysis", description: "Source trust, reliability, dependency risk, and recommended evidence actions." }
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/75 bg-surface-1/90">
      <table className="w-full text-sm">
        <thead className="bg-surface-2/75 text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-t border-border/65 align-top">
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CoverageModulePage({ subpageKey }: CoverageModulePageProps) {
  const vm = useMemo(() => getCoverageVm(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const copy = subpageCopy(subpageKey)

  const scopeType = useMemo<ScopeType>(() => {
    const value = searchParams.get("scopeType")
    if (value && vm.scopeTypes.some((entry) => entry.key === value)) {
      return value as ScopeType
    }

    return vm.defaults.scopeType
  }, [searchParams, vm.scopeTypes, vm.defaults.scopeType])

  const targets = vm.targetsByScopeType[scopeType]
  const mode = parseMode(searchParams.get("mode"), vm.defaults.mode)
  const baselineTargetId = useMemo<string>(() => {
    const selected = searchParams.get("target")
    if (selected && targets.some((item) => item.id === selected)) return selected
    return vm.defaults.targetByScopeType[scopeType] ?? targets[0]?.id ?? ""
  }, [scopeType, searchParams, targets, vm.defaults.targetByScopeType])
  const compareEnabled = searchParams.get("compare") === "1"

  const comparisonTargetId = useMemo<string>(() => {
    const selected = searchParams.get("against")
    if (selected && selected !== baselineTargetId && targets.some((item) => item.id === selected)) return selected
    const configured = vm.defaults.compareTargetByScopeType[scopeType]
    if (configured && configured !== baselineTargetId && targets.some((item) => item.id === configured)) return configured
    return targets.find((item) => item.id !== baselineTargetId)?.id ?? baselineTargetId
  }, [baselineTargetId, scopeType, searchParams, targets, vm.defaults.compareTargetByScopeType])

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  function subpageHref(href: string) {
    const query = searchParams.toString()
    return query ? `${href}?${query}` : href
  }

  const baselineProfile = vm.profilesByTargetId[baselineTargetId]
  const comparisonProfile = vm.profilesByTargetId[comparisonTargetId] ?? baselineProfile
  const comparedTiers = useMemo(
    () => buildComparedTiers(baselineProfile.tiers, comparisonProfile.tiers, mode),
    [baselineProfile.tiers, comparisonProfile.tiers, mode],
  )
  const rollup = useMemo(() => buildPainGapRollup(baselineProfile.tiers, mode), [baselineProfile.tiers, mode])
  const comparisonRollup = useMemo(() => buildPainGapRollup(comparisonProfile.tiers, mode), [comparisonProfile.tiers, mode])

  const [selectedTierId, setSelectedTierId] = useState<string>(baselineProfile.tiers[0]?.id ?? "")
  const activeTierId =
    comparedTiers.some((entry) => entry.tier.id === selectedTierId)
      ? selectedTierId
      : comparedTiers[0]?.tier.id ?? ""
  const selected = comparedTiers.find((entry) => entry.tier.id === activeTierId) ?? comparedTiers[0]
  const selectedTier = selected?.tier

  const telemetryRows = useMemo(() => {
    const compareById = new Map(comparisonProfile.telemetryCoverage.map((row) => [row.id, row]))
    return baselineProfile.telemetryCoverage.map((row) => {
      const compare = compareById.get(row.id) ?? row
      return { ...row, utilityDelta: row.detectionUtility - compare.detectionUtility }
    })
  }, [baselineProfile.telemetryCoverage, comparisonProfile.telemetryCoverage])

  const sourceRows = useMemo(() => {
    const compareById = new Map(comparisonProfile.sourceAnalysis.map((row) => [row.id, row]))
    return baselineProfile.sourceAnalysis.map((row) => {
      const compare = compareById.get(row.id) ?? row
      return { ...row, reliabilityDelta: row.reliability - compare.reliability }
    })
  }, [baselineProfile.sourceAnalysis, comparisonProfile.sourceAnalysis])

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header space-y-4" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">{copy.kicker}</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{copy.title}</h1>
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <Badge variant="outline" className="rounded-full border-border/70 bg-surface-2/70 text-[10px] uppercase tracking-[0.09em]">
            {mode === "readiness" ? "Defensive readiness" : "Active incidents"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 p-1.5">
          {vm.subpages.map((page) => (
            <Link key={page.key} href={subpageHref(page.href)} className={cn("inline-flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors", page.key === subpageKey ? "border-primary/45 bg-primary/14 text-foreground" : "border-transparent text-muted-foreground hover:border-border/75 hover:bg-surface-1/80 hover:text-foreground")}>
              {page.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
              <p className="wb-kicker">Scope Type</p>
              <select value={scopeType} onChange={(event) => updateParams({ scopeType: event.target.value, target: vm.defaults.targetByScopeType[event.target.value as keyof typeof vm.defaults.targetByScopeType], against: vm.defaults.compareTargetByScopeType[event.target.value as keyof typeof vm.defaults.compareTargetByScopeType] })} className="mt-1 h-8 w-full rounded-lg border border-border/70 bg-surface-1/75 px-2 text-xs">
                {vm.scopeTypes.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
            <label className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
              <p className="wb-kicker">Scope Target</p>
              <select value={baselineTargetId} onChange={(event) => updateParams({ target: event.target.value })} className="mt-1 h-8 w-full rounded-lg border border-border/70 bg-surface-1/75 px-2 text-xs">
                {targets.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
              <p className="wb-kicker">Mode</p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-border/70 bg-surface-1/80 p-1">
                <Button size="sm" variant={mode === "readiness" ? "secondary" : "ghost"} className="h-7 text-xs" onClick={() => updateParams({ mode: "readiness" })}>Defensive Readiness</Button>
                <Button size="sm" variant={mode === "active" ? "secondary" : "ghost"} className="h-7 text-xs" onClick={() => updateParams({ mode: "active" })}>Active Incidents</Button>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="wb-kicker">Compare Mode</p>
                <Button size="sm" variant={compareEnabled ? "secondary" : "outline"} className="h-7 text-xs" onClick={() => updateParams({ compare: compareEnabled ? null : "1" })}>{compareEnabled ? "On" : "Off"}</Button>
              </div>
              {compareEnabled ? (
                <select value={comparisonTargetId} onChange={(event) => updateParams({ against: event.target.value })} className="mt-2 h-8 w-full rounded-lg border border-border/70 bg-surface-1/75 px-2 text-xs">
                  {targets.filter((option) => option.id !== baselineTargetId).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              ) : <p className="mt-2 text-[11px] text-muted-foreground">Compare against another target from the selected scope type.</p>}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Registry Summary</p>
            <p className="mt-1 text-sm text-muted-foreground">{targets.find((item) => item.id === baselineTargetId)?.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/70 bg-surface-1/75 p-2"><p className="wb-kicker">Average Score</p><p className="mt-1 text-base font-semibold">{rollup.averageScore}</p></div>
              <div className="rounded-md border border-border/70 bg-surface-1/75 p-2"><p className="wb-kicker">Confidence Integrity</p><p className="mt-1 text-base font-semibold">{rollup.confidenceIntegrity}%</p></div>
              <div className="rounded-md border border-border/70 bg-surface-1/75 p-2"><p className="wb-kicker">Weak Coverage</p><p className="mt-1 text-base font-semibold text-amber-200">{rollup.weakCoverageCount}</p></div>
              <div className="rounded-md border border-border/70 bg-surface-1/75 p-2"><p className="wb-kicker">Missing Data</p><p className="mt-1 text-base font-semibold text-rose-200">{rollup.missingDataCount}</p></div>
            </div>
            {compareEnabled ? <p className="mt-2 text-[11px] text-muted-foreground">Comparison delta score: {rollup.averageScore - comparisonRollup.averageScore >= 0 ? "+" : ""}{rollup.averageScore - comparisonRollup.averageScore}</p> : null}
          </div>
        </div>
      </motion.header>

      {subpageKey === "pain-analysis" ? (
        <>
          <motion.article className="wb-panel space-y-2" variants={panelMotion}>
            {comparedTiers.map((entry, index) => {
              const snapshot = snapshotForMode(entry.tier, mode)
              const selectedTierActive = selectedTier?.id === entry.tier.id
              return (
                <button key={entry.tier.id} type="button" onClick={() => setSelectedTierId(entry.tier.id)} className={cn("relative grid h-[86px] grid-cols-[1.2fr_0.6fr_0.5fr_0.62fr_0.62fr_0.62fr] items-center gap-2 rounded-lg border px-3 text-left transition-colors", SEGMENT_WIDTH[index], selectedTierActive ? "border-primary/50 bg-primary/12" : "border-border/75 bg-surface-2/70 hover:border-primary/35")}>
                  <div><p className="text-sm font-semibold">{entry.tier.label}</p><p className="text-[11px] text-muted-foreground">Pain weight {entry.tier.painWeight}</p></div>
                  <div><p className="wb-kicker">Score</p><p className="text-sm font-semibold">{snapshot.score}</p></div>
                  <div><p className="wb-kicker">Count</p><p className="text-sm">{snapshot.count}</p></div>
                  <div><p className="wb-kicker">Trend</p><p className={cn("inline-flex items-center gap-1 text-sm", trendTone(snapshot.trend))}>{trendIcon(snapshot.trend)}{snapshot.trend > 0 ? "+" : ""}{snapshot.trend}%</p></div>
                  <div><p className="wb-kicker">Confidence</p><p className={cn("text-sm", confidenceTone(snapshot.confidence))}>{snapshot.confidence}</p></div>
                  <div><p className="wb-kicker">Freshness</p><p className={cn("text-sm", freshnessTone(snapshot.freshness.state))}>{snapshot.freshness.label}</p></div>
                </button>
              )
            })}
          </motion.article>

          {selectedTier ? (
            <motion.article className="wb-panel space-y-3" variants={panelMotion}>
              <div><p className="wb-kicker">Explanation</p><p className="mt-1 text-sm text-muted-foreground">{selectedTier.justification}</p></div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="wb-kicker">Observed Items</p>
                  <ul className="mt-2 space-y-1">{selectedTier.observedItems.map((item) => <li key={item.item} className="text-xs text-muted-foreground">- {item.item} | {item.source} | {item.lastSeen}</li>)}</ul>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="wb-kicker">Gaps</p>
                  <p className="mt-2 text-xs text-amber-200">Weak Coverage ({selectedTier.weakCoverageGaps.length})</p>
                  <ul className="mt-1 space-y-1">{selectedTier.weakCoverageGaps.map((gap) => <li key={gap} className="text-xs text-amber-100">- {gap}</li>)}</ul>
                  <p className="mt-2 text-xs text-rose-200">Missing Data ({selectedTier.missingDataGaps.length})</p>
                  <ul className="mt-1 space-y-1">{selectedTier.missingDataGaps.map((gap) => <li key={gap} className="text-xs text-rose-100">- {gap}</li>)}</ul>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Recommended Actions</p><ul className="mt-2 space-y-1">{selectedTier.recommendations.map((item) => <li key={item.title} className="text-xs text-muted-foreground">- {item.title} ({item.owner}, {item.eta})</li>)}</ul></div>
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Linked Cases / Rules</p><ul className="mt-2 space-y-1">{selectedTier.linkedCases.map((item) => <li key={item.id} className="text-xs text-muted-foreground">- Case {item.id}: {item.title}</li>)}</ul><ul className="mt-2 space-y-1">{selectedTier.linkedRules.map((item) => <li key={item.id} className="text-xs text-muted-foreground">- Rule {item.id}: {item.name}</li>)}</ul></div>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3"><p className="wb-kicker">Tier Pain Gap Summary</p><p className="mt-1 text-sm">Pain {selectedTier.summary.painPotential} | Readiness {selectedTier.summary.readinessDepth} | Data {selectedTier.summary.dataCompleteness} | Priority {selectedTier.summary.actionPriority}</p></div>
            </motion.article>
          ) : (
            <EmptyState title="No Tier Selected" description="Select a tier to inspect explanation, gaps, and linked action context." />
          )}
        </>
      ) : null}

      {subpageKey === "telemetry" ? (
        <motion.article className="wb-panel" variants={panelMotion}>
          <SimpleTable headers={["Domain/Source", "Collection", "Parse", "Utility", "Freshness", "Status", "Gap Reason"]} rows={telemetryRows.map((row) => [<div key={`${row.id}-d`}><p className="text-sm font-medium">{row.domain}</p><p className="text-xs text-muted-foreground">{row.source}</p></div>, row.collectionHealth, row.parseQuality, <div key={`${row.id}-u`}><p>{row.detectionUtility}</p>{compareEnabled ? <p className="text-[11px] text-muted-foreground">Delta {row.utilityDelta >= 0 ? "+" : ""}{row.utilityDelta}</p> : null}</div>, <span key={`${row.id}-f`} className={cn("text-sm", freshnessTone(row.freshness.state))}>{row.freshness.label}</span>, row.status, <Badge key={`${row.id}-g`} variant="outline" className={cn("rounded-full border px-2 py-0 text-[9px] uppercase tracking-[0.09em]", gapTone(row.gapReason))}>{gapLabel(row.gapReason)}</Badge>])} />
        </motion.article>
      ) : null}

      {subpageKey === "sources" ? (
        <motion.article className="wb-panel" variants={panelMotion}>
          <SimpleTable headers={["Source", "Trust", "Reliability", "Freshness", "Contribution", "Dependency Risk", "Recommended Action"]} rows={sourceRows.map((row) => [<div key={`${row.id}-s`}><p className="text-sm font-medium">{row.source}</p><p className="text-xs text-muted-foreground">{row.riskFlags.join(", ")}</p></div>, row.trust, <div key={`${row.id}-r`}><p>{row.reliability}</p>{compareEnabled ? <p className="text-[11px] text-muted-foreground">Delta {row.reliabilityDelta >= 0 ? "+" : ""}{row.reliabilityDelta}</p> : null}</div>, <span key={`${row.id}-f`} className={cn("text-sm", freshnessTone(row.freshness.state))}>{row.freshness.label}</span>, `${row.detectionContribution}%`, row.dependencyRisk, <span key={`${row.id}-a`} className="text-xs text-muted-foreground">{row.recommendedAction}</span>])} />
        </motion.article>
      ) : null}

      <motion.footer className="wb-panel-muted" variants={panelMotion}>
        <div className="flex items-start gap-2">
          <Radar className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Analyst guidance: prioritize tiers where active incident score and freshness degrade together while readiness appears strong. That pattern indicates fragile controls under pressure.</p>
        </div>
      </motion.footer>
    </motion.section>
  )
}


