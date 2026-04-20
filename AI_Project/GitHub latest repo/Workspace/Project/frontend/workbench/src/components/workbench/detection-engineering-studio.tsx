"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessAdminActions } from "@/shared/auth/session"
import { gateway, isMockMode } from "@/shared/gateway"
import { getDetectionStudioVm } from "@/shared/modules/mock-foundation"
import type {
  DetectionCanaryRow,
  DetectionFamily,
  DetectionPanelStatus,
  DetectionSimulationRow,
  DetectionStudioSubpageKey,
  LifecycleState,
  ReviewDecision,
} from "@/shared/modules/types"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { CatalogPane } from "@/components/workbench/detection-studio/catalog-pane"
import { CenterPane } from "@/components/workbench/detection-studio/center-pane"
import {
  DETECTION_FEED_EXPLORER_META,
  DETECTION_SUBPAGES,
  LIFECYCLE_FILTER_OPTIONS,
} from "@/components/workbench/detection-studio/constants"
import { buildRuleSearchHaystack, deriveLintChecks } from "@/components/workbench/detection-studio/helpers"
import { IntelligenceInspector } from "@/components/workbench/detection-studio/inspector-pane"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import {
  FrontendPhaseLockNotice,
  LoadingState,
  PermissionRestrictedState,
  UnavailableState,
} from "@/shared/ui/state-panels"

type DetectionEngineeringStudioProps = {
  subpageKey?: DetectionStudioSubpageKey
}

const DETECTION_STUDIO_VM = getDetectionStudioVm()
const RULES = DETECTION_STUDIO_VM.rules

function toInitialPanelStatus() {
  return {
    catalog: DETECTION_STUDIO_VM.subpageStatus.catalog.status,
    review: DETECTION_STUDIO_VM.subpageStatus.review.status,
    simulation: DETECTION_STUDIO_VM.subpageStatus.simulation.status,
    "canary-rollouts": DETECTION_STUDIO_VM.subpageStatus["canary-rollouts"].status,
    "rollback-history": DETECTION_STUDIO_VM.subpageStatus["rollback-history"].status,
    "feed-explorer": DETECTION_STUDIO_VM.subpageStatus["feed-explorer"].status,
  } satisfies Record<DetectionStudioSubpageKey, DetectionPanelStatus>
}

function toInitialPanelDetails() {
  return {
    catalog: DETECTION_STUDIO_VM.subpageStatus.catalog.detail,
    review: DETECTION_STUDIO_VM.subpageStatus.review.detail,
    simulation: DETECTION_STUDIO_VM.subpageStatus.simulation.detail,
    "canary-rollouts": DETECTION_STUDIO_VM.subpageStatus["canary-rollouts"].detail,
    "rollback-history": DETECTION_STUDIO_VM.subpageStatus["rollback-history"].detail,
    "feed-explorer": DETECTION_STUDIO_VM.subpageStatus["feed-explorer"].detail,
  } satisfies Record<DetectionStudioSubpageKey, string>
}

function RulesRolloutReadOnly({
  subpageKey,
}: {
  subpageKey: DetectionStudioSubpageKey
}) {
  if (subpageKey === "feed-explorer") {
    return (
      <UnavailableState
        title="Feed explorer unavailable"
        description="Feed-explorer backend support is missing in normal mode."
      />
    )
  }

  const { session } = useAuth()
  const canOperate = canAccessAdminActions(session)
  const alertsQuery = useWorkbenchQuery(["rules-rollout", "alerts"], (signal) => gateway.listAlerts(signal))
  const jobsQuery = useWorkbenchQuery(["rules-rollout", "jobs"], (signal) => gateway.listJobRuns(signal))

  if (alertsQuery.isLoading || jobsQuery.isLoading) {
    return <LoadingState label="Loading rules and rollout posture" />
  }

  if (!alertsQuery.data || !jobsQuery.data) {
    return (
      <UnavailableState
        title="Rule repository unavailable"
        description="Backend read surfaces are currently unavailable for this page."
      />
    )
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <p className="wb-kicker">Rule Repository</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">Read-only in normal mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This surface intentionally disables unsupported write workflows in normal mode.
        </p>
      </motion.header>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <FrontendPhaseLockNotice
          label="Read-only normal mode"
          description="Write actions are disabled until contract-backed mutation paths are approved for this surface."
        />
        {!canOperate ? (
          <PermissionRestrictedState
            title="Permission restricted"
            description="Your role cannot execute rollout mutation actions."
          />
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Alert Count</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{alertsQuery.data.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Contract-backed listAlerts scope.</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Recent Jobs</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{jobsQuery.data.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Derived from admin job runs contract.</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Mutation Status</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">Disabled</p>
            <p className="mt-1 text-xs text-muted-foreground">Reason: read-only in normal mode.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            disabled
            className="rounded-lg border border-border/70 bg-surface-2/55 px-3 py-2 text-left text-xs text-muted-foreground"
            title="Disabled: missing backend support for global catalog mutation."
          >
            Create Proposal (disabled)
            <p className="mt-1">Reason: missing backend support for this page-level action.</p>
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-border/70 bg-surface-2/55 px-3 py-2 text-left text-xs text-muted-foreground"
            title="Disabled: read-only in normal mode."
          >
            Approve Proposal (disabled)
            <p className="mt-1">Reason: read-only in normal mode.</p>
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-border/70 bg-surface-2/55 px-3 py-2 text-left text-xs text-muted-foreground"
            title={canOperate ? "Disabled: missing backend support for workspace-level simulation action." : "Disabled: permission restriction and read-only normal mode."}
          >
            Trigger Rollout (disabled)
            <p className="mt-1">
              Reason: {canOperate ? "missing backend support for this workspace action." : "permission restriction."}
            </p>
          </button>
        </div>
      </motion.article>
    </motion.section>
  )
}

export function DetectionEngineeringStudio({ subpageKey = "catalog" }: DetectionEngineeringStudioProps) {
  if (!isMockMode) {
    return <RulesRolloutReadOnly subpageKey={subpageKey} />
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRuleId, setSelectedRuleId] = useState<string>(RULES[0]?.id ?? "")
  const [familyFilter, setFamilyFilter] = useState<DetectionFamily | "All">("All")
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleState | "All">("All")
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [selectedVersionByRuleId, setSelectedVersionByRuleId] = useState<Record<string, string>>({})
  const [showDiff, setShowDiff] = useState(false)
  const [decision, setDecision] = useState<ReviewDecision | null>(null)
  const [selectedSimulationRunId, setSelectedSimulationRunId] = useState<string | null>(null)
  const [selectedCanaryRolloutId, setSelectedCanaryRolloutId] = useState<string | null>(null)
  const [panelStatusBySubpage, setPanelStatusBySubpage] = useState<Record<DetectionStudioSubpageKey, DetectionPanelStatus>>(toInitialPanelStatus)
  const [panelDetailBySubpage, setPanelDetailBySubpage] = useState<Record<DetectionStudioSubpageKey, string>>(toInitialPanelDetails)

  const refreshTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current)
      }
    },
    [],
  )

  const copy =
    DETECTION_SUBPAGES.find((item) => item.key === subpageKey) ??
    (subpageKey === "feed-explorer" ? DETECTION_FEED_EXPLORER_META : null) ??
    DETECTION_SUBPAGES[0]

  const filteredRules = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return RULES.filter((rule) => {
      if (familyFilter !== "All" && rule.family !== familyFilter) {
        return false
      }

      if (lifecycleFilter !== "All" && rule.lifecycle !== lifecycleFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return buildRuleSearchHaystack(rule).includes(normalizedQuery)
    })
  }, [familyFilter, lifecycleFilter, searchQuery])

  const selectedRule = useMemo(
    () => filteredRules.find((item) => item.id === selectedRuleId) ?? RULES.find((item) => item.id === selectedRuleId) ?? RULES[0],
    [filteredRules, selectedRuleId],
  )

  const currentCode = selectedRule ? drafts[selectedRule.id] ?? selectedRule.code : ""
  const selectedVersion =
    selectedRule?.versions.find((item) => item.version === selectedVersionByRuleId[selectedRule.id]) ??
    selectedRule?.versions[0] ??
    null
  const originalCode = selectedVersion?.code ?? selectedRule?.previousCode ?? ""
  const lintChecks = selectedRule ? deriveLintChecks(selectedRule, currentCode) : []
  const selectedRuleContextId = selectedRule?.id ?? ""

  const selectedSimulationRun: DetectionSimulationRow | null =
    DETECTION_STUDIO_VM.simulationRuns.find(
      (item) => item.runId === selectedSimulationRunId && item.ruleId === selectedRuleContextId,
    ) ??
    DETECTION_STUDIO_VM.simulationRuns.find((item) => item.ruleId === selectedRuleContextId) ??
    null
  const selectedCanaryRollout: DetectionCanaryRow | null =
    DETECTION_STUDIO_VM.canaryRollouts.find(
      (item) => item.rolloutId === selectedCanaryRolloutId && item.ruleId === selectedRuleContextId,
    ) ??
    DETECTION_STUDIO_VM.canaryRollouts.find((item) => item.ruleId === selectedRuleContextId) ??
    null

  function onEditorChange(nextValue: string | undefined) {
    if (!selectedRule) {
      return
    }

    setDrafts((previous) => ({
      ...previous,
      [selectedRule.id]: nextValue ?? "",
    }))
  }

  function onSelectSavedView(savedViewId: string) {
    const view = DETECTION_STUDIO_VM.savedViews.find((item) => item.id === savedViewId)
    if (!view) {
      return
    }

    setActiveSavedViewId(savedViewId)
    setFamilyFilter(view.family)
    setLifecycleFilter(view.lifecycle)
    setSearchQuery(view.query)
  }

  function onResetFilters() {
    setActiveSavedViewId(null)
    setFamilyFilter("All")
    setLifecycleFilter("All")
    setSearchQuery("")
  }

  function onSelectVersion(version: string) {
    if (!selectedRule) {
      return
    }

    setSelectedVersionByRuleId((previous) => ({
      ...previous,
      [selectedRule.id]: version,
    }))
    setShowDiff(true)
  }

  function onRefreshPanel() {
    setPanelStatusBySubpage((previous) => ({
      ...previous,
      [subpageKey]: "loading",
    }))
    setPanelDetailBySubpage((previous) => ({
      ...previous,
      [subpageKey]: "Refreshing workflow surface and reconciling panel context...",
    }))

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setPanelStatusBySubpage((previous) => ({
        ...previous,
        [subpageKey]: "ready",
      }))
      setPanelDetailBySubpage((previous) => ({
        ...previous,
        [subpageKey]: DETECTION_STUDIO_VM.subpageStatus[subpageKey].detail,
      }))
      refreshTimerRef.current = null
    }, 850)
  }

  function onFailPanel() {
    setPanelStatusBySubpage((previous) => ({
      ...previous,
      [subpageKey]: "error",
    }))
    setPanelDetailBySubpage((previous) => ({
      ...previous,
      [subpageKey]: "Failure drill injected: staged panel degradation to validate recovery interactions.",
    }))
  }

  function onRecoverPanel() {
    setPanelStatusBySubpage((previous) => ({
      ...previous,
      [subpageKey]: "ready",
    }))
    setPanelDetailBySubpage((previous) => ({
      ...previous,
      [subpageKey]: DETECTION_STUDIO_VM.subpageStatus[subpageKey].detail,
    }))
  }

  if (!selectedRule) {
    return null
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header space-y-3" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">{subpageKey === "feed-explorer" ? "IoC Ingestion" : "Rule Repository"}</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{copy.title}</h1>
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <Badge variant="outline" className="rounded-full border-border/70 bg-surface-2/65 text-[10px] uppercase tracking-[0.09em]">
            Generated {new Date(DETECTION_STUDIO_VM.generatedAtUtc).toLocaleString()}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 p-1.5" data-testid="detection-subpage-switcher">
          {DETECTION_SUBPAGES.map((page) => (
            <Link
              key={page.key}
              href={page.href}
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors",
                page.key === subpageKey
                  ? "border-primary/45 bg-primary/14 text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/75 hover:bg-surface-1/80 hover:text-foreground",
              )}
            >
              {page.label}
            </Link>
          ))}
        </div>
      </motion.header>

      <motion.article className="wb-panel" variants={panelMotion}>
        <div className="grid gap-3 xl:grid-cols-[1.38fr_2fr_1.28fr]">
          <CatalogPane
            rules={filteredRules}
            selectedRuleId={selectedRule.id}
            families={DETECTION_STUDIO_VM.families}
            lifecycleOptions={LIFECYCLE_FILTER_OPTIONS}
            searchQuery={searchQuery}
            onSearchQueryChange={(query) => {
              setActiveSavedViewId(null)
              setSearchQuery(query)
            }}
            familyFilter={familyFilter}
            onFamilyFilterChange={(family) => {
              setActiveSavedViewId(null)
              setFamilyFilter(family)
            }}
            lifecycleFilter={lifecycleFilter}
            onLifecycleFilterChange={(state) => {
              setActiveSavedViewId(null)
              setLifecycleFilter(state)
            }}
            onSelectRule={setSelectedRuleId}
            savedViews={DETECTION_STUDIO_VM.savedViews}
            activeSavedViewId={activeSavedViewId}
            onSavedViewSelect={onSelectSavedView}
            queuePosture={DETECTION_STUDIO_VM.queuePosture}
            onResetFilters={onResetFilters}
          />

          <CenterPane
            subpageKey={subpageKey}
            vm={DETECTION_STUDIO_VM}
            selectedRule={selectedRule}
            currentCode={currentCode}
            originalCode={originalCode}
            showDiff={showDiff}
            onToggleDiff={setShowDiff}
            onEditorChange={onEditorChange}
            lintChecks={lintChecks}
            decision={decision}
            onDecisionChange={setDecision}
            onSelectRule={setSelectedRuleId}
            panelStatus={panelStatusBySubpage[subpageKey]}
            panelStatusDetail={panelDetailBySubpage[subpageKey]}
            onRefreshPanel={onRefreshPanel}
            onFailPanel={onFailPanel}
            onRecoverPanel={onRecoverPanel}
            selectedSimulationRunId={selectedSimulationRunId}
            onSelectSimulationRun={setSelectedSimulationRunId}
            selectedCanaryRolloutId={selectedCanaryRolloutId}
            onSelectCanaryRollout={setSelectedCanaryRolloutId}
          />

          <IntelligenceInspector
            selectedRule={selectedRule}
            lintChecks={lintChecks}
            selectedVersion={selectedVersion?.version ?? ""}
            onSelectVersion={onSelectVersion}
            selectedSimulationRun={selectedSimulationRun}
            selectedCanaryRollout={selectedCanaryRollout}
          />
        </div>
      </motion.article>

      <motion.footer className="wb-panel-muted" variants={panelMotion}>
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            {subpageKey === "feed-explorer"
              ? "Feed guidance: prioritize high duplicate-risk candidates with low provenance confidence before catalog import."
              : "Rule repository guidance: prioritize high-overlap rules with low provenance confidence before canary progression."}
          </p>
        </div>
      </motion.footer>
    </motion.section>
  )
}
