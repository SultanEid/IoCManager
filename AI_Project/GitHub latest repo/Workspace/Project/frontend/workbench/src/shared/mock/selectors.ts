import type {
  CaseResponse,
  CaseRuleWorkflowResponse,
  DecisionResponse,
  DeploymentResponse,
  EvidenceResponse,
  FeedbackResponse,
  JobRunResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleProposalResponse,
  RuleResponse,
} from "@/shared/api/schemas"
import {
  buildActivityTimeline,
  buildGraphInvestigation,
  buildGraphNeighbors,
  buildLinkedReports,
  buildLinkedRules,
  buildNextBestEvidence,
  buildPolicyGuardrails,
  buildQueue,
  buildReportsIngestion,
  buildScoreAxes,
  buildSimilarHistoricalCases,
  buildTopEvidence,
  synthesizeRollbackPlan,
  synthesizeRolloutPlan,
} from "@/shared/gateway/adapters"
import type {
  CaseDetailVM,
  GraphRelationshipsVM,
  OverviewCard,
  QueueItem,
  ReportsIngestionVM,
  SettingsAdminVM,
} from "@/shared/gateway/types"
import type { MockStoreState } from "@/shared/domain/cti"

function sortByUpdatedDescending<T extends { updatedAtUtc: string }>(rows: T[]) {
  return rows.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))
}

function rowsByCaseId<T extends { id: string }>(state: MockStoreState, index: Record<string, string[]>, source: Record<string, T>, caseId: string) {
  return (index[caseId] ?? []).map((id) => source[id]).filter((item): item is T => Boolean(item))
}

export function selectCases(state: MockStoreState): CaseResponse[] {
  return state.indices.caseIds.map((id) => state.entities.cases[id]).filter((item): item is CaseResponse => Boolean(item))
}

export function selectCase(state: MockStoreState, caseId: string): CaseResponse {
  const result = state.entities.cases[caseId]
  if (!result) {
    throw new Error(`Case ${caseId} not found in mock store.`)
  }
  return result
}

export function selectEvidence(state: MockStoreState, caseId: string): EvidenceResponse[] {
  return rowsByCaseId(state, state.indices.evidenceByCase, state.entities.evidence, caseId).sort(
    (left, right) => Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc),
  )
}

export function selectDecisions(state: MockStoreState, caseId: string): DecisionResponse[] {
  return sortByUpdatedDescending(rowsByCaseId(state, state.indices.decisionsByCase, state.entities.decisions, caseId))
}

export function selectRules(state: MockStoreState, caseId: string): RuleResponse[] {
  return sortByUpdatedDescending(rowsByCaseId(state, state.indices.rulesByCase, state.entities.rules, caseId))
}

export function selectDeployments(state: MockStoreState, caseId: string): DeploymentResponse[] {
  return sortByUpdatedDescending(rowsByCaseId(state, state.indices.deploymentsByCase, state.entities.deployments, caseId))
}

export function selectAllDeployments(state: MockStoreState): DeploymentResponse[] {
  return sortByUpdatedDescending(Object.values(state.entities.deployments))
}

export function selectFeedback(state: MockStoreState, caseId: string): FeedbackResponse[] {
  return rowsByCaseId(state, state.indices.feedbackByCase, state.entities.feedback, caseId).sort(
    (left, right) => Date.parse(right.submittedAtUtc) - Date.parse(left.submittedAtUtc),
  )
}

export function selectJobRuns(state: MockStoreState): JobRunResponse[] {
  return Object.values(state.entities.jobs).sort((left, right) => Date.parse(right.startedAtUtc) - Date.parse(left.startedAtUtc))
}

export function selectCaseRuleWorkflow(state: MockStoreState, caseId: string): CaseRuleWorkflowResponse {
  const proposals = sortByUpdatedDescending(rowsByCaseId(state, state.indices.proposalsByCase, state.entities.ruleProposals, caseId))
  const recommendations = sortByUpdatedDescending(
    rowsByCaseId(state, state.indices.recommendationsByCase, state.entities.recommendations, caseId),
  )
  const rolloutPlans = sortByUpdatedDescending(rowsByCaseId(state, state.indices.rolloutsByCase, state.entities.rollouts, caseId))
  const rollbackPlans = sortByUpdatedDescending(rowsByCaseId(state, state.indices.rollbacksByCase, state.entities.rollbacks, caseId))

  const acceptanceBase =
    recommendations.length === 0
      ? 0.7
      : recommendations.reduce((sum, item) => sum + item.analystAcceptanceRate, 0) / recommendations.length

  return {
    caseId,
    proposals,
    recommendations,
    rolloutPlans,
    rollbackPlans,
    analystAcceptanceRate: Number.parseFloat(acceptanceBase.toFixed(3)),
  }
}

export function selectCaseDetail(state: MockStoreState, caseId: string): CaseDetailVM {
  const caseItem = selectCase(state, caseId)
  const evidence = selectEvidence(state, caseId)
  const decisions = selectDecisions(state, caseId)
  const deployments = selectDeployments(state, caseId)
  const rules = selectRules(state, caseId)
  const feedback = selectFeedback(state, caseId)
  const workflow = selectCaseRuleWorkflow(state, caseId)

  const latestDecision = decisions[0] ?? null
  const latestDeployment = deployments[0] ?? null
  const latestRollout = workflow.rolloutPlans[0] ?? null
  const latestRollback =
    (latestRollout ? workflow.rollbackPlans.find((item) => item.rolloutPlanId === latestRollout.id) : null) ??
    workflow.rollbackPlans[0] ??
    null

  return {
    caseItem,
    latestDecision,
    latestDeployment,
    scoreAxes: buildScoreAxes(caseId, evidence, decisions),
    recommendedAction: latestDecision?.recommendedAction ?? "request_more_evidence",
    decisionState: latestDecision?.state ?? "Investigating",
    approvalTier: latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired,
    rolloutPlan: synthesizeRolloutPlan(caseItem, latestDeployment),
    rollbackPlan: synthesizeRollbackPlan(caseItem, latestDeployment),
    topEvidence: buildTopEvidence(evidence),
    graphNeighbors: buildGraphNeighbors(caseId),
    similarHistoricalCases: buildSimilarHistoricalCases(caseId),
    nextBestEvidence: buildNextBestEvidence(caseId),
    activityTimeline: buildActivityTimeline(decisions, deployments, feedback),
    linkedRules: buildLinkedRules(rules, workflow),
    linkedReports: buildLinkedReports(evidence, feedback),
    policyGuardrails: buildPolicyGuardrails(latestDecision, workflow, latestRollout, latestRollback, caseItem),
    isSimulated: true,
  }
}

export function selectQueue(state: MockStoreState): QueueItem[] {
  const cases = selectCases(state)
  const details = cases.map((item) => selectCaseDetail(state, item.id))
  return buildQueue(cases, details)
}

export function selectOverview(state: MockStoreState): { cards: OverviewCard[]; queue: QueueItem[]; isSimulated: boolean } {
  const cases = selectCases(state)
  const queue = selectQueue(state).slice(0, 6)
  const awaitingApproval = cases.filter((item) => item.status.toLowerCase().includes("approval")).length
  const highRisk = queue.filter((item) => item.policyRisk >= 70).length
  const underCanary = queue.filter((item) => item.rolloutState.toLowerCase().includes("canary")).length
  const evidenceFreshness = Math.max(62, 95 - awaitingApproval * 3)

  const cards: OverviewCard[] = [
    {
      key: "approval_pressure",
      title: "Approval Pressure",
      value: String(awaitingApproval),
      subtitle: "Alerts waiting on lead/admin sign-off",
      trend: `${awaitingApproval} requiring action`,
    },
    {
      key: "policy_friction",
      title: "Policy Friction",
      value: String(highRisk),
      subtitle: "Queue items with elevated risk",
      trend: "risk >= 70",
    },
    {
      key: "evidence_freshness",
      title: "Evidence Freshness",
      value: `${evidenceFreshness}%`,
      subtitle: "Correlated telemetry recency across active alerts",
      trend: `${cases.length} active scenarios`,
    },
    {
      key: "rollout_watch",
      title: "Rollout Watch",
      value: String(underCanary),
      subtitle: "Alerts under canary/promote observation",
      trend: "rollback guards enforced",
    },
  ]

  return {
    cards,
    queue,
    isSimulated: true,
  }
}

export function selectProblematicQueue(state: MockStoreState): { queue: QueueItem[]; isSimulated: boolean } {
  return {
    queue: selectQueue(state),
    isSimulated: true,
  }
}

export function selectReportsIngestion(state: MockStoreState): ReportsIngestionVM {
  const healthInfo = {
    service: "IoC Manager Mock Gateway",
    environment: "frontend-prototype",
    utcNow: state.meta.referenceUtc,
  }
  const recentJobs = selectJobRuns(state)

  return {
    healthInfo,
    recentJobs,
    ingestionSummary: buildReportsIngestion(healthInfo.service, recentJobs),
    isSimulated: true,
  }
}

export function selectGraphRelationships(state: MockStoreState, caseId: string): GraphRelationshipsVM {
  const caseItem = selectCase(state, caseId)
  const evidence = selectEvidence(state, caseId)
  const rules = selectRules(state, caseId)
  const allCases = selectCases(state)
  const graph = buildGraphInvestigation(caseItem, evidence, rules, allCases)
  return {
    focalCaseId: caseId,
    nodes: graph.nodes,
    edges: graph.edges,
    pathHints: graph.pathHints,
    timeBounds: graph.timeBounds,
    isSimulated: true,
  }
}

export function selectSettingsAdmin(state: MockStoreState): SettingsAdminVM {
  return {
    healthInfo: {
      service: "IoC Manager Mock Gateway",
      environment: "frontend-prototype",
      utcNow: state.meta.referenceUtc,
    },
    healthAdmin: {
      runtime: "nextjs",
      machineName: "frontend-prototype-node",
      processId: 1,
    },
    recentJobs: selectJobRuns(state),
  }
}

export function selectRollout(state: MockStoreState, rolloutId: string): RolloutPlanResponse {
  const rollout = state.entities.rollouts[rolloutId]
  if (!rollout) {
    throw new Error(`Rollout ${rolloutId} not found.`)
  }
  return rollout
}

export function selectRollback(state: MockStoreState, rollbackId: string): RollbackPlanResponse {
  const rollback = state.entities.rollbacks[rollbackId]
  if (!rollback) {
    throw new Error(`Rollback ${rollbackId} not found.`)
  }
  return rollback
}

export function selectProposal(state: MockStoreState, proposalId: string): RuleProposalResponse {
  const proposal = state.entities.ruleProposals[proposalId]
  if (!proposal) {
    throw new Error(`Rule proposal ${proposalId} not found.`)
  }
  return proposal
}
