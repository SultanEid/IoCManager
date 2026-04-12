import { StatusBadge } from "@/components/workbench/status-badge"
import type { RuleValidationResult } from "@/shared/api/schemas"

const STAGE_LABELS: Record<string, string> = {
  syntax: "Syntax",
  metadata: "Metadata",
  deployment_readiness: "Deployment Readiness",
}

const STAGE_ORDER: Record<string, number> = {
  syntax: 0,
  metadata: 1,
  deployment_readiness: 2,
}

type RuleValidationPanelProps = {
  validation: RuleValidationResult
  title?: string
}

export function RuleValidationPanel({ validation, title = "Validation" }: RuleValidationPanelProps) {
  const stages = [...validation.stages].sort((a, b) => (STAGE_ORDER[a.stage] ?? 100) - (STAGE_ORDER[b.stage] ?? 100))
  const hasLimitedDepth = stages.some((stage) => stage.capabilityDepth !== "full_engine")

  return (
    <div className="rounded-lg border border-border/70 bg-surface-2/50 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold tracking-tight">{title}</p>
        <StatusBadge value={validation.canPersist ? "passing" : "failing"} />
        <StatusBadge value={validation.isDeploymentReady ? "ready" : "notready"} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Evaluated {new Date(validation.evaluatedAtUtc).toLocaleString()}</p>
      {hasLimitedDepth ? (
        <p className="mt-2 rounded-md border border-amber-300/35 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
          Engine-level validation is not fully available in this phase. Treat passing results as limited-confidence checks.
        </p>
      ) : null}

      <div className="mt-2 space-y-2">
        {stages.map((stage) => (
          <div key={stage.stage} className="rounded-md border border-border/60 bg-surface-1/70 p-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <p className="font-medium">{STAGE_LABELS[stage.stage] ?? stage.stage}</p>
              <StatusBadge value={stage.passed ? "passing" : "failing"} />
              <StatusBadge value={stage.capabilityDepth} />
              <span className="text-muted-foreground">
                {stage.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length} errors,{" "}
                {stage.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length} warnings,{" "}
                {stage.diagnostics.filter((diagnostic) => diagnostic.severity === "note").length} notes
              </span>
            </div>
            {stage.limitation ? (
              <p className="mt-1 rounded border border-amber-300/35 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
                {stage.limitation}
              </p>
            ) : null}
            {stage.diagnostics.length === 0 ? (
              <p className="mt-1 text-muted-foreground">No diagnostics.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {stage.diagnostics.map((diagnostic, index) => (
                  <li key={`${stage.stage}-${diagnostic.code}-${index}`} className="rounded border border-border/50 bg-surface-2/60 px-2 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={diagnostic.severity} />
                      <span className="font-mono text-[11px] text-muted-foreground">{diagnostic.code}</span>
                      {diagnostic.line ? (
                        <span className="text-[11px] text-muted-foreground">
                          line {diagnostic.line}{diagnostic.column ? `:${diagnostic.column}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-foreground">{diagnostic.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
