"use client"

import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { type AlertResponse, type DecisionResponse, type DeploymentResponse, type EvidenceResponse, type FeedbackResponse, type RuleResponse } from "@/shared/api/schemas"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import {
  DependencyDownState,
  EmptyState,
  LoadingState,
  SimulatedBadge,
} from "@/shared/ui/state-panels"

function latestByUpdatedAt<T extends { updatedAtUtc: string }>(rows: T[]) {
  return rows.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function AlertEvents<T extends { id: string }>({
  rows,
  renderRow,
  emptyLabel,
}: {
  rows: T[]
  renderRow: (row: T) => ReactNode
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <EmptyState title="No records" description={emptyLabel} />
  }

  return <div className="space-y-2">{rows.map((row) => <div key={row.id}>{renderRow(row)}</div>)}</div>
}

function SectionFailure({ title, error }: { title: string; error: unknown }) {
  const failure = classifyUiError(error)
  if (failure.kind === "dependency-down") {
    return (
      <DependencyDownState
        title={`${title} dependency down`}
        description={failure.isContractMismatch ? "Contract mismatch detected while reading this section." : "Backend dependency failure prevented loading this section."}
      />
    )
  }

  return <ClassifiedFailureState failure={failure} fallbackTitle={`${title} unavailable`} />
}

export default function AlertDetailPage() {
  const params = useParams<{ alertId: string }>()
  const alertId = params.alertId

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Alert detail unavailable" />
  }

  const alertQuery = useWorkbenchQuery(["alert", alertId], (signal) => gateway.getAlert(alertId, signal))
  const evidenceQuery = useWorkbenchQuery(["alert", alertId, "evidence"], (signal) => gateway.listEvidence(alertId, signal))
  const decisionsQuery = useWorkbenchQuery(["alert", alertId, "decisions"], (signal) => gateway.listDecisions(alertId, signal))
  const deploymentsQuery = useWorkbenchQuery(["alert", alertId, "deployments"], (signal) => gateway.listDeployments(alertId, signal))
  const rulesQuery = useWorkbenchQuery(["alert", alertId, "rules"], (signal) => gateway.listRules(alertId, signal))
  const feedbackQuery = useWorkbenchQuery(["alert", alertId, "feedback"], (signal) => gateway.listFeedback(alertId, signal))
  const workflowQuery = useWorkbenchQuery(["alert", alertId, "workflow"], (signal) => gateway.getAlertRuleWorkflow(alertId, signal))

  if (alertQuery.isLoading) {
    return <LoadingState label="Loading alert detail" />
  }

  if (alertQuery.isError || !alertQuery.data) {
    const failure = classifyUiError(alertQuery.error)
    return <ClassifiedFailureState failure={failure} fallbackTitle="Alert detail unavailable" />
  }

  const alertItem: AlertResponse = alertQuery.data
  const latestDecision: DecisionResponse | null = latestByUpdatedAt(decisionsQuery.data ?? [])
  const latestDeployment: DeploymentResponse | null = latestByUpdatedAt(deploymentsQuery.data ?? [])
  const evidenceRows: EvidenceResponse[] = evidenceQuery.data ?? []
  const rulesRows: RuleResponse[] = rulesQuery.data ?? []
  const feedbackRows: FeedbackResponse[] = feedbackQuery.data ?? []
  const latestDecisionLabel = decisionsQuery.isLoading
    ? "Loading..."
    : decisionsQuery.isError
      ? "Unavailable"
      : (latestDecision?.state ?? "No decision")
  const latestDeploymentLabel = deploymentsQuery.isLoading
    ? "Loading..."
    : deploymentsQuery.isError
      ? "Unavailable"
      : (latestDeployment?.status ?? "No deployment")

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Alert Detail</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{alertItem.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{alertItem.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge value={alertItem.priority} />
            <StatusBadge value={alertItem.status} />
            <StatusBadge value={alertItem.approvalTierRequired} />
            {isMockMode ? <SimulatedBadge /> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Owner</p>
            <p className="mt-1 text-sm font-semibold">{alertItem.ownerUserId}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Latest Decision</p>
            <p className="mt-1 text-sm font-semibold">{latestDecisionLabel}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Latest Deployment</p>
            <p className="mt-1 text-sm font-semibold">{latestDeploymentLabel}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Updated</p>
            <p className="mt-1 text-sm font-semibold">{new Date(alertItem.updatedAtUtc).toLocaleString()}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel" variants={panelMotion}>
        <SectionHeader
          title="Decisions"
          description="Decision records rendered directly from backend decision contracts."
        />
        {decisionsQuery.isLoading ? <LoadingState label="Loading decisions" /> : null}
        {decisionsQuery.isError ? <SectionFailure title="Decisions" error={decisionsQuery.error} /> : null}
        {!decisionsQuery.isLoading && !decisionsQuery.isError ? (
          <AlertEvents
            rows={decisionsQuery.data ?? []}
            emptyLabel="No decision records have been created for this alert."
            renderRow={(decision) => (
              <div className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{decision.recommendedAction}</p>
                  <StatusBadge value={decision.state} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Approval: {decision.approvalTierRequired} · Updated {new Date(decision.updatedAtUtc).toLocaleString()}
                </p>
              </div>
            )}
          />
        ) : null}
      </motion.article>

      <motion.article className="wb-panel grid gap-3 xl:grid-cols-2" variants={panelMotion}>
        <section>
          <SectionHeader
            title="Deployments"
            description="Distribution records are rendered directly from deployment contracts."
          />
          {deploymentsQuery.isLoading ? <LoadingState label="Loading deployments" /> : null}
          {deploymentsQuery.isError ? <SectionFailure title="Deployments" error={deploymentsQuery.error} /> : null}
          {!deploymentsQuery.isLoading && !deploymentsQuery.isError ? (
            <AlertEvents
              rows={deploymentsQuery.data ?? []}
              emptyLabel="No deployment records exist for this alert."
              renderRow={(deployment) => (
                <div className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{deployment.targetEnvironment}</p>
                    <StatusBadge value={deployment.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rule {deployment.ruleId.slice(0, 8)} · Updated {new Date(deployment.updatedAtUtc).toLocaleString()}
                  </p>
                </div>
              )}
            />
          ) : null}
        </section>

        <section>
          <SectionHeader
            title="Rule Workflow"
            description="Workflow counters are direct from the rule workflow contract."
          />
          {workflowQuery.isLoading ? <LoadingState label="Loading workflow" /> : null}
          {workflowQuery.isError ? <SectionFailure title="Rule workflow" error={workflowQuery.error} /> : null}
          {!workflowQuery.isLoading && !workflowQuery.isError ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="wb-kicker">Proposals</p>
                <p className="mt-1 text-lg font-semibold">{workflowQuery.data?.proposals.length ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="wb-kicker">Recommendations</p>
                <p className="mt-1 text-lg font-semibold">{workflowQuery.data?.recommendations.length ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="wb-kicker">Rollouts</p>
                <p className="mt-1 text-lg font-semibold">{workflowQuery.data?.rolloutPlans.length ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="wb-kicker">Rollbacks</p>
                <p className="mt-1 text-lg font-semibold">{workflowQuery.data?.rollbackPlans.length ?? 0}</p>
              </div>
            </div>
          ) : null}
        </section>
      </motion.article>

      <motion.article className="wb-panel grid gap-3 xl:grid-cols-3" variants={panelMotion}>
        <section>
          <SectionHeader title="Evidence" description="Evidence list is rendered from backend evidence records." />
          {evidenceQuery.isLoading ? <LoadingState label="Loading evidence" /> : null}
          {evidenceQuery.isError ? <SectionFailure title="Evidence" error={evidenceQuery.error} /> : null}
          {!evidenceQuery.isLoading && !evidenceQuery.isError ? (
            <AlertEvents
              rows={evidenceRows}
              emptyLabel="No evidence records are attached to this alert."
              renderRow={(item) => (
                <div className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                  <p className="text-sm font-medium">{item.evidenceType}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sourceSystem} · {Math.round(item.confidence * 100)}% confidence
                  </p>
                </div>
              )}
            />
          ) : null}
        </section>

        <section>
          <SectionHeader title="Rules" description="Rule records are rendered directly from backend rules." />
          {rulesQuery.isLoading ? <LoadingState label="Loading rules" /> : null}
          {rulesQuery.isError ? <SectionFailure title="Rules" error={rulesQuery.error} /> : null}
          {!rulesQuery.isLoading && !rulesQuery.isError ? (
            <AlertEvents
              rows={rulesRows}
              emptyLabel="No rules are currently linked to this alert."
              renderRow={(item) => (
                <div className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.version} · {item.status}
                  </p>
                </div>
              )}
            />
          ) : null}
        </section>

        <section>
          <SectionHeader title="Feedback" description="Analyst feedback records are rendered from backend feedback data." />
          {feedbackQuery.isLoading ? <LoadingState label="Loading feedback" /> : null}
          {feedbackQuery.isError ? <SectionFailure title="Feedback" error={feedbackQuery.error} /> : null}
          {!feedbackQuery.isLoading && !feedbackQuery.isError ? (
            <AlertEvents
              rows={feedbackRows}
              emptyLabel="No feedback entries are available for this alert."
              renderRow={(item) => (
                <div className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                  <p className="text-sm font-medium">{item.verdict}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.submittedByUserId} · {new Date(item.submittedAtUtc).toLocaleString()}
                  </p>
                </div>
              )}
            />
          ) : null}
        </section>
      </motion.article>
    </motion.section>
  )
}
