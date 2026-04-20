import type {
  DeploymentRecommendationResponse,
  DeploymentResponse,
  FeedbackResponse,
  JobRunResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleProposalResponse,
  RuleSimulationResultResponse,
} from "@/shared/api/schemas"
import type {
  AdvanceRolloutStageInput,
  CreateRuleProposalInput,
  RecordCanaryObservationInput,
  ReviewRuleProposalInput,
  SimulateRuleProposalInput,
  TriggerRollbackInput,
} from "@/shared/gateway/types"
import type { AuditEventType, MockStoreState } from "@/shared/domain/cti"
import { deterministicUuid, seededRandom } from "@/shared/mock/utils"

function nowUtc(state: MockStoreState) {
  const result = new Date(Date.parse(state.meta.referenceUtc) + state.meta.sequence * state.meta.tickMinutes * 60 * 1000).toISOString()
  state.meta.sequence += 1
  return result
}

function nextId(state: MockStoreState, scope: string) {
  return deterministicUuid(`${scope}:${state.meta.sequence}`)
}

function verdictForEvent(type: AuditEventType): FeedbackResponse["verdict"] {
  switch (type) {
    case "rollback_triggered":
      return "stale_or_revoked"
    case "canary_observation_recorded":
      return "likely_benign"
    case "rollout_advanced":
      return "likely_malicious"
    case "rule_proposal_reviewed":
      return "suspicious"
    default:
      return "insufficient_evidence"
  }
}

function feedbackDefaults(verdict: FeedbackResponse["verdict"]) {
  return {
    confidence: 0.5,
    falsePositiveRisk: 0.5,
    reviewPriority:
      verdict === "malicious" ? "critical" : verdict === "likely_malicious" || verdict === "suspicious" ? "high" : "medium",
    shouldPromoteToIndicator: verdict === "malicious" || verdict === "likely_malicious" || verdict === "suspicious",
    shouldSuppress: verdict === "false_positive" || verdict === "stale_or_revoked",
    shouldAllowlist: verdict === "benign" || verdict === "likely_benign" || verdict === "false_positive",
    shouldEscalate:
      verdict === "malicious" || verdict === "likely_malicious" || verdict === "suspicious" || verdict === "insufficient_evidence",
  } as const
}

function appendEvent(
  state: MockStoreState,
  caseId: string,
  type: AuditEventType,
  actorUserId: string,
  summary: string,
  details: Record<string, string>,
) {
  const occurredAtUtc = nowUtc(state)
  const eventId = nextId(state, `event:${type}`)
  state.events.push({
    id: eventId,
    caseId,
    type,
    actorUserId,
    occurredAtUtc,
    summary,
    details,
  })

  const verdict = verdictForEvent(type)
  const feedbackId = nextId(state, `feedback:${type}`)
  const feedback: FeedbackResponse = {
    ...feedbackDefaults(verdict),
    id: feedbackId,
    caseId,
    decisionId: null,
    verdict,
    notes: summary,
    submittedByUserId: actorUserId,
    submittedAtUtc: occurredAtUtc,
  }
  state.entities.feedback[feedbackId] = feedback
  pushCaseIndex(state.indices.feedbackByCase, caseId, feedbackId)
}

function pushCaseIndex(index: Record<string, string[]>, caseId: string, id: string) {
  index[caseId] = [...(index[caseId] ?? []), id]
}

function updateCaseTouch(state: MockStoreState, caseId: string, status?: string) {
  const caseItem = state.entities.cases[caseId]
  if (!caseItem) {
    return
  }

  caseItem.updatedAtUtc = nowUtc(state)
  if (status) {
    caseItem.status = status
  }
}

export function createRuleProposal(state: MockStoreState, input: CreateRuleProposalInput): RuleProposalResponse {
  const caseId = input.alertId ?? input.caseId
  if (!caseId || !state.entities.cases[caseId]) {
    throw new Error("Case not found for proposal creation.")
  }

  const id = nextId(state, "proposal")
  const timestamp = nowUtc(state)
  const proposal: RuleProposalResponse = {
    id,
    caseId,
    proposalName: input.proposalName,
    ruleFamily: input.ruleFamily,
    ruleBody: input.ruleBody,
    proposedVersion: input.proposedVersion,
    proposedByUserId: input.proposedByUserId,
    rationale: input.rationale,
    policyRiskScore: input.policyRiskScore ?? 0.4,
    status: "InReview",
    reviewedByUserId: null,
    reviewedAtUtc: null,
    reviewReason: null,
    overrideReason: null,
    createdAtUtc: timestamp,
    updatedAtUtc: timestamp,
  }

  state.entities.ruleProposals[id] = proposal
  pushCaseIndex(state.indices.proposalsByCase, caseId, id)

  appendEvent(
    state,
    caseId,
    "rule_proposal_created",
    input.proposedByUserId,
    `Proposal ${input.proposalName} created.`,
    { proposalId: id, ruleFamily: input.ruleFamily },
  )
  updateCaseTouch(state, caseId, "Investigating")
  return proposal
}

export function reviewRuleProposal(state: MockStoreState, proposalId: string, input: ReviewRuleProposalInput): RuleProposalResponse {
  const proposal = state.entities.ruleProposals[proposalId]
  if (!proposal) {
    throw new Error("Rule proposal not found.")
  }

  proposal.status = input.decision === "accept" ? "Accepted" : "Rejected"
  proposal.reviewedByUserId = input.reviewerUserId
  proposal.reviewReason = input.reviewReason
  proposal.overrideReason = input.overrideReason ?? null
  proposal.reviewedAtUtc = nowUtc(state)
  proposal.updatedAtUtc = proposal.reviewedAtUtc

  const caseId = proposal.caseId
  appendEvent(
    state,
    caseId,
    "rule_proposal_reviewed",
    input.reviewerUserId,
    `Proposal ${proposal.proposalName} ${proposal.status.toLowerCase()}.`,
    { proposalId, decision: input.decision },
  )
  updateCaseTouch(state, caseId, input.decision === "accept" ? "AwaitingApproval" : "Investigating")
  return proposal
}

export function simulateRuleProposal(state: MockStoreState, proposalId: string, input: SimulateRuleProposalInput): RuleSimulationResultResponse {
  const proposal = state.entities.ruleProposals[proposalId]
  if (!proposal) {
    throw new Error("Rule proposal not found.")
  }

  const random = seededRandom(`${proposal.id}:${proposal.updatedAtUtc}`)
  const caseId = proposal.caseId
  const now = nowUtc(state)
  proposal.status = "Simulated"
  proposal.updatedAtUtc = now

  const recommendationId = nextId(state, "recommendation")
  const recommendation: DeploymentRecommendationResponse = {
    id: recommendationId,
    caseId,
    ruleProposalId: proposal.id,
    targetEnvironment: input.targetEnvironment,
    recommendedStage: "shadow",
    riskScore: Number.parseFloat((0.32 + random() * 0.28).toFixed(3)),
    predictedNoise: Number.parseFloat((0.12 + random() * 0.15).toFixed(3)),
    baselineNoise: Number.parseFloat((0.09 + random() * 0.1).toFixed(3)),
    predictedNoiseDelta: Number.parseFloat((0.02 + random() * 0.06).toFixed(3)),
    analystAcceptanceRate: Number.parseFloat((0.68 + random() * 0.24).toFixed(3)),
    requiresHumanApproval: true,
    autoPublishEnabled: false,
    requestedByUserId: input.actorUserId,
    rationale: "Scenario simulation recommends staged rollout with explicit approval checkpoints.",
    recommendedAtUtc: now,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
  state.entities.recommendations[recommendationId] = recommendation
  pushCaseIndex(state.indices.recommendationsByCase, caseId, recommendationId)

  const rolloutId = nextId(state, "rollout")
  const rollout: RolloutPlanResponse = {
    id: rolloutId,
    caseId,
    ruleProposalId: proposal.id,
    deploymentRecommendationId: recommendationId,
    currentStage: "shadow",
    canaryTrafficPercent: 5,
    predictedNoise: recommendation.predictedNoise,
    observedNoise: null,
    observedNoiseDelta: null,
    analystAcceptanceRate: recommendation.analystAcceptanceRate,
    requiresManualPromotion: true,
    shadowStartedAtUtc: now,
    canaryStartedAtUtc: null,
    promotedAtUtc: null,
    rolledBackAtUtc: null,
    lastStageReason: input.notes ?? "Simulation created rollout plan.",
    lastOverrideReason: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
  state.entities.rollouts[rolloutId] = rollout
  pushCaseIndex(state.indices.rolloutsByCase, caseId, rolloutId)

  const rollbackId = nextId(state, "rollback")
  const rollback: RollbackPlanResponse = {
    id: rollbackId,
    caseId,
    ruleProposalId: proposal.id,
    rolloutPlanId: rolloutId,
    triggerCondition: "observed_noise_delta > 0.10 OR analyst_acceptance_rate < 0.6",
    recoveryPlaybook: "Revert to prior detector version, freeze promotion, and notify lead/admin approvers.",
    predictedNoiseThreshold: Number.parseFloat((recommendation.predictedNoise + 0.12).toFixed(3)),
    lastObservedNoise: null,
    triggerConditionMet: false,
    isTriggered: false,
    triggeredByUserId: null,
    triggeredAtUtc: null,
    triggerReason: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
  state.entities.rollbacks[rollbackId] = rollback
  pushCaseIndex(state.indices.rollbacksByCase, caseId, rollbackId)

  appendEvent(
    state,
    caseId,
    "rule_proposal_simulated",
    input.actorUserId,
    `Proposal ${proposal.proposalName} simulated for ${input.targetEnvironment}.`,
    { proposalId: proposal.id, rolloutPlanId: rolloutId, rollbackPlanId: rollbackId },
  )
  updateCaseTouch(state, caseId, "AwaitingApproval")

  return {
    proposal,
    recommendation,
    rolloutPlan: rollout,
    rollbackPlan: rollback,
  }
}

function ensureDeploymentForRollout(state: MockStoreState, rollout: RolloutPlanResponse, actorUserId: string): DeploymentResponse {
  const existing = (state.indices.deploymentsByCase[rollout.caseId] ?? [])
    .map((id) => state.entities.deployments[id])
    .find((item) => item.ruleId === rollout.ruleProposalId)
  if (existing) {
    return existing
  }

  const rules = state.indices.rulesByCase[rollout.caseId] ?? []
  const linkedRuleId = rules[0] ?? nextId(state, "rule-placeholder")
  const now = nowUtc(state)
  const deployment: DeploymentResponse = {
    id: nextId(state, "deployment"),
    caseId: rollout.caseId,
    ruleId: linkedRuleId,
    targetEnvironment: "production",
    status: "Shadow",
    requestedByUserId: actorUserId,
    approvedByUserId: null,
    approvedAtUtc: null,
    deployedAtUtc: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
  state.entities.deployments[deployment.id] = deployment
  pushCaseIndex(state.indices.deploymentsByCase, rollout.caseId, deployment.id)
  return deployment
}

export function advanceRolloutStage(state: MockStoreState, rolloutPlanId: string, input: AdvanceRolloutStageInput): RolloutPlanResponse {
  const rollout = state.entities.rollouts[rolloutPlanId]
  if (!rollout) {
    throw new Error("Rollout plan not found.")
  }

  const now = nowUtc(state)
  rollout.currentStage = input.stage
  rollout.updatedAtUtc = now
  rollout.lastStageReason = input.reason
  rollout.lastOverrideReason = input.overrideReason ?? null
  if (input.stage === "canary") {
    rollout.canaryStartedAtUtc = now
    rollout.canaryTrafficPercent = Math.max(rollout.canaryTrafficPercent, 15)
  }
  if (input.stage === "promote") {
    rollout.promotedAtUtc = now
    rollout.canaryTrafficPercent = 100
  }
  if (input.stage === "rollback") {
    rollout.rolledBackAtUtc = now
  }

  const deployment = ensureDeploymentForRollout(state, rollout, input.actorUserId)
  deployment.status =
    input.stage === "promote"
      ? "Promoted"
      : input.stage === "rollback"
        ? "Rollback"
        : input.stage === "canary"
          ? "Canary"
          : "Shadow"
  deployment.updatedAtUtc = now
  if (input.stage === "promote" || input.stage === "canary") {
    deployment.approvedByUserId = input.actorUserId
    deployment.approvedAtUtc = now
    deployment.deployedAtUtc = now
  }

  const proposal = state.entities.ruleProposals[rollout.ruleProposalId]
  if (proposal) {
    proposal.status =
      input.stage === "promote" ? "Promoted" : input.stage === "rollback" ? "RolledBack" : input.stage === "canary" ? "Canary" : "Simulated"
    proposal.updatedAtUtc = now
  }

  const rollback = (state.indices.rollbacksByCase[rollout.caseId] ?? [])
    .map((id) => state.entities.rollbacks[id])
    .find((item) => item.rolloutPlanId === rollout.id)
  if (rollback && input.stage === "rollback") {
    rollback.isTriggered = true
    rollback.triggerConditionMet = true
    rollback.triggeredByUserId = input.actorUserId
    rollback.triggeredAtUtc = now
    rollback.triggerReason = input.reason
    rollback.updatedAtUtc = now
  }

  appendEvent(
    state,
    rollout.caseId,
    "rollout_advanced",
    input.actorUserId,
    `Rollout advanced to ${input.stage}.`,
    { rolloutPlanId, stage: input.stage },
  )
  updateCaseTouch(
    state,
    rollout.caseId,
    input.stage === "promote" ? "Approved" : input.stage === "rollback" ? "Investigating" : "AwaitingApproval",
  )
  return rollout
}

export function recordCanaryObservation(
  state: MockStoreState,
  rolloutPlanId: string,
  input: RecordCanaryObservationInput,
): RolloutPlanResponse {
  const rollout = state.entities.rollouts[rolloutPlanId]
  if (!rollout) {
    throw new Error("Rollout plan not found.")
  }

  const now = nowUtc(state)
  rollout.observedNoise = input.observedNoise
  rollout.observedNoiseDelta = Number.parseFloat((input.observedNoise - rollout.predictedNoise).toFixed(3))
  rollout.analystAcceptanceRate = input.analystReviewedCount === 0 ? 0 : input.analystAcceptedCount / input.analystReviewedCount
  rollout.updatedAtUtc = now

  const rollback = (state.indices.rollbacksByCase[rollout.caseId] ?? [])
    .map((id) => state.entities.rollbacks[id])
    .find((item) => item.rolloutPlanId === rollout.id)
  if (rollback) {
    rollback.lastObservedNoise = input.observedNoise
    rollback.triggerConditionMet = input.observedNoise >= rollback.predictedNoiseThreshold
    rollback.updatedAtUtc = now
  }

  appendEvent(
    state,
    rollout.caseId,
    "canary_observation_recorded",
    input.actorUserId,
    `Canary observation recorded (${Math.round(input.observedNoise * 100)}% noise).`,
    { rolloutPlanId, observedNoise: String(input.observedNoise) },
  )
  updateCaseTouch(state, rollout.caseId)
  return rollout
}

export function triggerRollback(state: MockStoreState, rollbackPlanId: string, input: TriggerRollbackInput): RollbackPlanResponse {
  const rollback = state.entities.rollbacks[rollbackPlanId]
  if (!rollback) {
    throw new Error("Rollback plan not found.")
  }

  const now = nowUtc(state)
  rollback.isTriggered = true
  rollback.triggerConditionMet = true
  rollback.triggeredByUserId = input.actorUserId
  rollback.triggeredAtUtc = now
  rollback.triggerReason = input.reason
  rollback.lastObservedNoise = input.observedNoise ?? rollback.lastObservedNoise
  rollback.updatedAtUtc = now

  const rollout = state.entities.rollouts[rollback.rolloutPlanId]
  if (rollout) {
    rollout.currentStage = "rollback"
    rollout.rolledBackAtUtc = now
    rollout.updatedAtUtc = now
  }

  const proposal = state.entities.ruleProposals[rollback.ruleProposalId]
  if (proposal) {
    proposal.status = "RolledBack"
    proposal.updatedAtUtc = now
  }

  appendEvent(
    state,
    rollback.caseId,
    "rollback_triggered",
    input.actorUserId,
    "Rollback triggered for active rollout plan.",
    { rollbackPlanId, reason: input.reason },
  )
  updateCaseTouch(state, rollback.caseId, "Investigating")
  return rollback
}

function appendJob(state: MockStoreState, jobType: "ModelRetraining", actor: string): JobRunResponse {
  const start = nowUtc(state)
  const completed = nowUtc(state)
  const job: JobRunResponse = {
    id: nextId(state, `job:${jobType}`),
    jobType,
    status: "Completed",
    triggeredBy: actor,
    details: "Design/demo model retraining completed with updated analyst feedback weighting.",
    startedAtUtc: start,
    completedAtUtc: completed,
  }

  state.entities.jobs[job.id] = job
  state.indices.jobsByType[jobType] = [...(state.indices.jobsByType[jobType] ?? []), job.id]
  appendEvent(
    state,
    state.indices.caseIds[0] ?? "00000000-0000-4000-8000-000000000000",
    "job_triggered",
    actor,
    `${jobType} triggered from admin controls.`,
    { jobId: job.id, jobType },
  )

  return job
}

export function runModelRetraining(state: MockStoreState, triggeredByUserId: string): JobRunResponse {
  return appendJob(state, "ModelRetraining", triggeredByUserId)
}
