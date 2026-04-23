import { StatusBadge } from "@/components/workbench/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CaseDetailVM, PolicyGuardrailVM } from "@/shared/gateway/types"

function actionLabel(value: string) {
  return value.replace(/_/g, " ")
}

function guardrailTone(status: PolicyGuardrailVM["status"]) {
  if (status === "enforced") {
    return "border-emerald-300/35 bg-emerald-500/10 text-emerald-200"
  }

  if (status === "warning") {
    return "border-amber-300/35 bg-amber-500/10 text-amber-100"
  }

  return "border-border/70 bg-surface-2/70 text-muted-foreground"
}

export function CaseDecisionPanel({
  detail,
  onGuardrailSelect,
}: {
  detail: CaseDetailVM
  onGuardrailSelect?: (guardrail: PolicyGuardrailVM) => void
}) {
  const topEvidence = detail.topEvidence[0] ?? null

  return (
    <section className="rounded-2xl border border-border/80 bg-surface-1/90 p-4 shadow-[0_14px_40px_-28px_color-mix(in_srgb,var(--foreground)_45%,transparent)] md:p-5">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] xl:gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/12 text-[10px] uppercase tracking-[0.12em] text-primary">
              Decision Bundle
            </Badge>
            <StatusBadge value={detail.decisionState} />
            <StatusBadge value={detail.approvalTier} />
          </div>

          <div>
            <p className="wb-kicker">Recommended Action</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl" data-testid="recommended-action">
              {actionLabel(detail.recommendedAction)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="decision-state">
              Decision state: {detail.decisionState}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="approval-tier">
              Approval tier: {detail.approvalTier}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-border/65 bg-surface-2/75 p-3">
              <p className="wb-kicker">Rollout Plan</p>
              <p className="mt-1 text-sm leading-relaxed">{detail.rolloutPlan}</p>
            </div>
            <div className="rounded-xl border border-border/65 bg-surface-2/75 p-3">
              <p className="wb-kicker">Rollback Plan</p>
              <p className="mt-1 text-sm leading-relaxed">{detail.rollbackPlan}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="wb-kicker">Policy Guardrails</p>
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid="policy-guardrails">
              {detail.policyGuardrails.slice(0, 4).map((guardrail) => (
                <Button
                  key={guardrail.id}
                  variant="outline"
                  size="sm"
                  className={`h-auto min-h-8 rounded-full px-2.5 py-1 text-[11px] ${guardrailTone(guardrail.status)}`}
                  onClick={() => onGuardrailSelect?.(guardrail)}
                >
                  {guardrail.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/65 bg-surface-2/75 p-3">
            <p className="wb-kicker">Top Evidence Signal</p>
            {topEvidence ? (
              <>
                <p className="mt-1 text-sm font-medium">{topEvidence.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topEvidence.sourceSystem} · {Math.round(topEvidence.confidence * 100)}% confidence
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No linked evidence yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
