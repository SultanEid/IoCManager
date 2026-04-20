"use client"

import { type ReactNode, useMemo, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  CircleX,
  LoaderCircle,
  PlayCircle,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Workflow,
  Wrench,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/workbench/status-badge"
import type {
  DetectionCanaryRow,
  DetectionFeedRow,
  DetectionPanelStatus,
  DetectionRollbackRow,
  DetectionRuleItem,
  DetectionSimulationRow,
  DetectionStudioSubpageKey,
  DetectionStudioVM,
  ReviewDecision,
  ValidationCheck,
} from "@/shared/modules/types"
import { DataGrid } from "@/shared/ui/data-grid"
import { MonacoRuleEditor } from "./rule-editor"
import { toPercent } from "./helpers"

type CenterPaneProps = {
  subpageKey: DetectionStudioSubpageKey
  vm: DetectionStudioVM
  selectedRule: DetectionRuleItem
  currentCode: string
  originalCode: string
  showDiff: boolean
  onToggleDiff: (showDiff: boolean) => void
  onEditorChange: (nextValue: string | undefined) => void
  lintChecks: ValidationCheck[]
  decision: ReviewDecision | null
  onDecisionChange: (decision: ReviewDecision) => void
  onSelectRule: (ruleId: string) => void
  panelStatus: DetectionPanelStatus
  panelStatusDetail: string
  onRefreshPanel: () => void
  onFailPanel: () => void
  onRecoverPanel: () => void
  selectedSimulationRunId: string | null
  onSelectSimulationRun: (runId: string) => void
  selectedCanaryRolloutId: string | null
  onSelectCanaryRollout: (rolloutId: string) => void
}

function WorkflowSurface({
  status,
  detail,
  onRetry,
  children,
}: {
  status: DetectionPanelStatus
  detail: string
  onRetry: () => void
  children: ReactNode
}) {
  if (status === "loading") {
    return (
      <div className="space-y-3" data-testid="workflow-loading-state">
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Syncing workspace context...
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="h-10 rounded-md bg-surface-1/85" />
            <div className="h-10 rounded-md bg-surface-1/85" />
            <div className="h-10 rounded-md bg-surface-1/85" />
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
          <div className="space-y-2">
            <div className="h-8 rounded-md bg-surface-1/85" />
            <div className="h-8 rounded-md bg-surface-1/85" />
            <div className="h-8 rounded-md bg-surface-1/85" />
            <div className="h-8 rounded-md bg-surface-1/85" />
          </div>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-rose-300/40 bg-rose-400/10 p-4" data-testid="workflow-error-state">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-200" />
          <div>
            <p className="text-sm font-semibold">Workspace sync interruption</p>
            <p className="mt-1 text-xs text-rose-100/90">{detail}</p>
            <Button size="sm" variant="secondary" className="mt-3 h-8 text-xs" onClick={onRetry}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Retry panel sync
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function CatalogWorkflow({
  selectedRule,
  currentCode,
  originalCode,
  showDiff,
  onToggleDiff,
  onEditorChange,
  lintChecks,
  decision,
  onDecisionChange,
}: {
  selectedRule: DetectionRuleItem
  currentCode: string
  originalCode: string
  showDiff: boolean
  onToggleDiff: (showDiff: boolean) => void
  onEditorChange: (nextValue: string | undefined) => void
  lintChecks: ValidationCheck[]
  decision: ReviewDecision | null
  onDecisionChange: (decision: ReviewDecision) => void
}) {
  const passCount = lintChecks.filter((item) => item.status === "pass").length
  const warnCount = lintChecks.filter((item) => item.status === "warn").length
  const failCount = lintChecks.filter((item) => item.status === "fail").length
  const hasLintErrors = failCount > 0

  return (
    <div className="space-y-3">
      <MonacoRuleEditor
        rule={selectedRule}
        code={currentCode}
        originalCode={originalCode}
        showDiff={showDiff}
        onCodeChange={onEditorChange}
        onToggleDiff={onToggleDiff}
      />

      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="wb-kicker">Validation + Linting</p>
            <p className="text-xs text-muted-foreground">Policy, syntax, and deployment readiness checks.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-emerald-300/35 bg-emerald-400/10 text-emerald-200">
              {passCount} pass
            </Badge>
            <Badge variant="outline" className="border-amber-300/35 bg-amber-400/10 text-amber-200">
              {warnCount} warn
            </Badge>
            <Badge variant="outline" className="border-rose-300/35 bg-rose-400/10 text-rose-200">
              {failCount} fail
            </Badge>
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          {lintChecks.map((check) => (
            <div key={check.key} className="rounded-md border border-border/70 bg-surface-1/80 px-2.5 py-2">
              <div className="flex items-start gap-2">
                {check.status === "pass" ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-300" /> : null}
                {check.status === "warn" ? <Workflow className="mt-0.5 h-3.5 w-3.5 text-amber-300" /> : null}
                {check.status === "fail" ? <CircleX className="mt-0.5 h-3.5 w-3.5 text-rose-300" /> : null}
                <div>
                  <p className="text-xs font-medium">{check.title}</p>
                  <p className="text-[11px] text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <p className="wb-kicker">Review Decision</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" className="h-8 text-xs" disabled={hasLintErrors} onClick={() => onDecisionChange("Approve")}>
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => onDecisionChange("Request Changes")}>
            <Workflow className="mr-1.5 h-3.5 w-3.5" />
            Request Changes
          </Button>
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => onDecisionChange("Reject")}>
            <ShieldX className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
        {decision ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Decision staged: <span className="font-semibold text-foreground">{decision}</span>. Audit entry ready for reviewer sign-off.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ReviewWorkflow({
  vm,
  selectedRule,
  currentCode,
  originalCode,
  showDiff,
  onToggleDiff,
  onEditorChange,
  onSelectRule,
}: {
  vm: DetectionStudioVM
  selectedRule: DetectionRuleItem
  currentCode: string
  originalCode: string
  showDiff: boolean
  onToggleDiff: (showDiff: boolean) => void
  onEditorChange: (nextValue: string | undefined) => void
  onSelectRule: (ruleId: string) => void
}) {
  const columns = useMemo<ColumnDef<DetectionStudioVM["reviewQueue"][number]>[]>(
    () => [
      { accessorKey: "ruleName", header: "Rule" },
      { accessorKey: "family", header: "Family", cell: ({ row }) => <StatusBadge value={row.original.family} /> },
      { accessorKey: "policyGate", header: "Policy Gate" },
      { accessorKey: "reviewer", header: "Reviewer" },
      { accessorKey: "decision", header: "Decision", cell: ({ row }) => <StatusBadge value={row.original.decision} /> },
      { accessorKey: "dueAtUtc", header: "Due", cell: ({ row }) => new Date(row.original.dueAtUtc).toLocaleString() },
    ],
    [],
  )

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="wb-kicker">Review Queue</p>
          <Badge variant="outline" className="rounded-full border-border/70 text-[10px] uppercase tracking-[0.09em]">
            {vm.reviewQueue.length} items
          </Badge>
        </div>
        <DataGrid data={vm.reviewQueue} columns={columns} onRowClick={(row) => onSelectRule(row.ruleId)} rowClassName="text-xs" />
      </div>

      <MonacoRuleEditor
        rule={selectedRule}
        code={currentCode}
        originalCode={originalCode}
        showDiff={showDiff}
        onCodeChange={onEditorChange}
        onToggleDiff={onToggleDiff}
      />
    </div>
  )
}

function SimulationWorkflow({
  vm,
  selectedRule,
  currentCode,
  originalCode,
  showDiff,
  onToggleDiff,
  onEditorChange,
  selectedSimulationRunId,
  onSelectSimulationRun,
}: {
  vm: DetectionStudioVM
  selectedRule: DetectionRuleItem
  currentCode: string
  originalCode: string
  showDiff: boolean
  onToggleDiff: (showDiff: boolean) => void
  onEditorChange: (nextValue: string | undefined) => void
  selectedSimulationRunId: string | null
  onSelectSimulationRun: (runId: string) => void
}) {
  const [replayState, setReplayState] = useState<"idle" | "running" | "completed" | "failed">("idle")

  const columns = useMemo<ColumnDef<DetectionSimulationRow>[]>(
    () => [
      { accessorKey: "runId", header: "Run" },
      { accessorKey: "ruleId", header: "Rule" },
      { accessorKey: "dataset", header: "Dataset" },
      { accessorKey: "state", header: "State", cell: ({ row }) => <StatusBadge value={row.original.state} /> },
      { accessorKey: "result", header: "Result", cell: ({ row }) => <StatusBadge value={row.original.result} /> },
      { accessorKey: "eventsScanned", header: "Events", cell: ({ row }) => row.original.eventsScanned.toLocaleString() },
      { accessorKey: "precision", header: "Precision", cell: ({ row }) => toPercent(row.original.precision) },
      { accessorKey: "recall", header: "Recall", cell: ({ row }) => toPercent(row.original.recall) },
    ],
    [],
  )

  const selectedRun =
    vm.simulationRuns.find((item) => item.runId === selectedSimulationRunId) ??
    vm.simulationRuns.find((item) => item.ruleId === selectedRule.id) ??
    vm.simulationRuns[0]

  function queueReplay() {
    setReplayState("running")
    window.setTimeout(() => {
      setReplayState(selectedRule.simulationState.result === "Fail" ? "failed" : "completed")
    }, 900)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-2.5">
          <p className="wb-kicker">Current State</p>
          <p className="mt-1 text-sm font-semibold">{selectedRule.simulationState.state}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-2.5">
          <p className="wb-kicker">TP Rate</p>
          <p className="mt-1 text-sm font-semibold">{toPercent(selectedRule.simulationState.truePositiveRate)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-2.5">
          <p className="wb-kicker">FP Rate</p>
          <p className="mt-1 text-sm font-semibold">{toPercent(selectedRule.simulationState.falsePositiveRate)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/60 p-2.5">
          <p className="wb-kicker">Replay State</p>
          <p className="mt-1 text-sm font-semibold capitalize">{replayState}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="wb-kicker">Simulation Runs</p>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={queueReplay}
            disabled={replayState === "running"}
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
            {replayState === "running" ? "Replaying..." : "Queue Replay"}
          </Button>
        </div>
        <DataGrid
          data={vm.simulationRuns}
          columns={columns}
          onRowClick={(row) => onSelectSimulationRun(row.runId)}
          rowClassName="text-xs"
        />
        {selectedRun ? (
          <div className="mt-2 rounded-md border border-border/70 bg-surface-1/80 px-2.5 py-2 text-xs text-muted-foreground">
            Selected run <span className="font-semibold text-foreground">{selectedRun.runId}</span> scanned{" "}
            {selectedRun.eventsScanned.toLocaleString()} events with{" "}
            <span className="font-semibold text-foreground">{toPercent(selectedRun.precision)}</span> precision.
          </div>
        ) : null}
      </div>

      <MonacoRuleEditor
        rule={selectedRule}
        code={currentCode}
        originalCode={originalCode}
        showDiff={showDiff}
        onCodeChange={onEditorChange}
        onToggleDiff={onToggleDiff}
      />
    </div>
  )
}

function CanaryRolloutWorkflow({
  rows,
  selectedCanaryRolloutId,
  onSelectCanaryRollout,
}: {
  rows: DetectionCanaryRow[]
  selectedCanaryRolloutId: string | null
  onSelectCanaryRollout: (rolloutId: string) => void
}) {
  const columns = useMemo<ColumnDef<DetectionCanaryRow>[]>(
    () => [
      { accessorKey: "rolloutId", header: "Rollout" },
      { accessorKey: "ruleId", header: "Rule" },
      { accessorKey: "stage", header: "Stage", cell: ({ row }) => <StatusBadge value={row.original.stage} /> },
      { accessorKey: "canaryPercent", header: "Canary %", cell: ({ row }) => `${row.original.canaryPercent}%` },
      { accessorKey: "observedNoise", header: "Noise", cell: ({ row }) => toPercent(row.original.observedNoise) },
      { accessorKey: "acceptanceRate", header: "Acceptance", cell: ({ row }) => toPercent(row.original.acceptanceRate) },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
      { accessorKey: "updatedAtUtc", header: "Updated", cell: ({ row }) => new Date(row.original.updatedAtUtc).toLocaleString() },
    ],
    [],
  )

  const selectedRollout = rows.find((row) => row.rolloutId === selectedCanaryRolloutId) ?? rows[0]

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="wb-kicker">Canary Rollouts</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Rollback Drill
          </Button>
        </div>
        <DataGrid data={rows} columns={columns} onRowClick={(row) => onSelectCanaryRollout(row.rolloutId)} rowClassName="text-xs" />
      </div>

      {selectedRollout ? (
        <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
          <p className="wb-kicker">Selected Rollout Context</p>
          <p className="mt-1 text-sm font-semibold">{selectedRollout.rolloutId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedRollout.ruleId} · {selectedRollout.canaryPercent}% canary · Acceptance {toPercent(selectedRollout.acceptanceRate)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function RollbackHistoryWorkflow({ rows }: { rows: DetectionRollbackRow[] }) {
  const columns = useMemo<ColumnDef<DetectionRollbackRow>[]>(
    () => [
      { accessorKey: "rollbackId", header: "Rollback" },
      { accessorKey: "ruleId", header: "Rule" },
      { accessorKey: "triggeredBy", header: "Triggered By" },
      { accessorKey: "reason", header: "Reason" },
      { accessorKey: "impact", header: "Impact" },
      { accessorKey: "restoredVersion", header: "Restored Version" },
      { accessorKey: "rolledBackAtUtc", header: "Time", cell: ({ row }) => new Date(row.original.rolledBackAtUtc).toLocaleString() },
    ],
    [],
  )

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <DataGrid data={rows} columns={columns} rowClassName="text-xs" />
      </div>
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3 text-xs text-muted-foreground">
        Rollback events are immutable records used for policy replay, impact audits, and post-incident control tuning.
      </div>
    </div>
  )
}

function FeedExplorerWorkflow({ rows }: { rows: DetectionFeedRow[] }) {
  const columns = useMemo<ColumnDef<DetectionFeedRow>[]>(
    () => [
      { accessorKey: "feedId", header: "Feed ID" },
      { accessorKey: "source", header: "Source" },
      { accessorKey: "ruleName", header: "Candidate Rule" },
      { accessorKey: "family", header: "Family", cell: ({ row }) => <StatusBadge value={row.original.family} /> },
      { accessorKey: "parseState", header: "Parse State", cell: ({ row }) => <StatusBadge value={row.original.parseState} /> },
      { accessorKey: "duplicateRisk", header: "Duplicate Risk", cell: ({ row }) => <StatusBadge value={row.original.duplicateRisk} /> },
      { accessorKey: "provenance", header: "Provenance" },
      { accessorKey: "importedAtUtc", header: "Imported", cell: ({ row }) => new Date(row.original.importedAtUtc).toLocaleString() },
    ],
    [],
  )

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3">
        <DataGrid data={rows} columns={columns} rowClassName="text-xs" />
      </div>
      <div className="rounded-xl border border-border/70 bg-surface-2/55 p-3 text-xs text-muted-foreground">
        Feed explorer binds external rule candidates to alert context and duplicate risk before repository import.
      </div>
    </div>
  )
}

function renderSubpageWorkflow({
  subpageKey,
  vm,
  selectedRule,
  currentCode,
  originalCode,
  showDiff,
  onToggleDiff,
  onEditorChange,
  lintChecks,
  decision,
  onDecisionChange,
  onSelectRule,
  selectedSimulationRunId,
  onSelectSimulationRun,
  selectedCanaryRolloutId,
  onSelectCanaryRollout,
}: Omit<CenterPaneProps, "panelStatus" | "panelStatusDetail" | "onRefreshPanel" | "onFailPanel" | "onRecoverPanel">) {
  if (subpageKey === "review") {
    return (
      <ReviewWorkflow
        vm={vm}
        selectedRule={selectedRule}
        currentCode={currentCode}
        originalCode={originalCode}
        showDiff={showDiff}
        onToggleDiff={onToggleDiff}
        onEditorChange={onEditorChange}
        onSelectRule={onSelectRule}
      />
    )
  }

  if (subpageKey === "simulation") {
    return (
      <SimulationWorkflow
        vm={vm}
        selectedRule={selectedRule}
        currentCode={currentCode}
        originalCode={originalCode}
        showDiff={showDiff}
        onToggleDiff={onToggleDiff}
        onEditorChange={onEditorChange}
        selectedSimulationRunId={selectedSimulationRunId}
        onSelectSimulationRun={onSelectSimulationRun}
      />
    )
  }

  if (subpageKey === "canary-rollouts") {
    return (
      <CanaryRolloutWorkflow
        rows={vm.canaryRollouts}
        selectedCanaryRolloutId={selectedCanaryRolloutId}
        onSelectCanaryRollout={onSelectCanaryRollout}
      />
    )
  }

  if (subpageKey === "rollback-history") {
    return <RollbackHistoryWorkflow rows={vm.rollbackHistory} />
  }

  if (subpageKey === "feed-explorer") {
    return <FeedExplorerWorkflow rows={vm.feedExplorer} />
  }

  return (
    <CatalogWorkflow
      selectedRule={selectedRule}
      currentCode={currentCode}
      originalCode={originalCode}
      showDiff={showDiff}
      onToggleDiff={onToggleDiff}
      onEditorChange={onEditorChange}
      lintChecks={lintChecks}
      decision={decision}
      onDecisionChange={onDecisionChange}
    />
  )
}

export function CenterPane(props: CenterPaneProps) {
  const {
    panelStatus,
    panelStatusDetail,
    onRefreshPanel,
    onFailPanel,
    onRecoverPanel,
  } = props

  return (
    <section className="rounded-xl border border-border/70 bg-surface-1/85 p-3">
      <div className="mb-3 flex items-center justify-between rounded-lg border border-border/70 bg-surface-2/55 px-2.5 py-2">
        <div>
          <p className="wb-kicker">Workflow Runtime</p>
          <p className="text-xs text-muted-foreground">{panelStatusDetail}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge value={panelStatus === "ready" ? "Healthy" : panelStatus === "loading" ? "Running" : "Failing"} />
          {panelStatus === "error" ? (
            <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onRecoverPanel}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Recover
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onRefreshPanel}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
          {panelStatus !== "error" ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onFailPanel}>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Failure Drill
            </Button>
          ) : null}
        </div>
      </div>

      <WorkflowSurface status={panelStatus} detail={panelStatusDetail} onRetry={onRecoverPanel}>
        {renderSubpageWorkflow(props)}
      </WorkflowSurface>
    </section>
  )
}
