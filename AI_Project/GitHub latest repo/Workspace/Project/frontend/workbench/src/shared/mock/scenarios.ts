import type {
  CaseResponse,
  DecisionResponse,
  DeploymentRecommendationResponse,
  DeploymentResponse,
  EvidenceResponse,
  FeedbackResponse,
  JobRunResponse,
  RollbackPlanResponse,
  RolloutPlanResponse,
  RuleFamily,
  RuleProposalResponse,
  RuleResponse,
} from "@/shared/api/schemas"
import type { AuditEvent, MockStoreIndices, MockStoreState, ScenarioPack } from "@/shared/domain/cti"
import { atOffset, deepCopy, deterministicUuid } from "@/shared/mock/utils"

const referenceUtc = "2026-03-15T09:00:00.000Z"

const caseRows: CaseResponse[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Credential Replay Chain in Treasury Segment",
    summary: "Service account replay followed by suspicious lateral movement toward treasury workloads.",
    priority: "Critical",
    status: "AwaitingApproval",
    ownerUserId: "analyst-1",
    approvalTierRequired: "Lead",
    createdAtUtc: atOffset(referenceUtc, 1400),
    updatedAtUtc: atOffset(referenceUtc, 35),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "C2 Beacon Burst via New Domain Cluster",
    summary: "Beaconing interval burst and JA3 overlap indicate active command-and-control infrastructure.",
    priority: "Critical",
    status: "Investigating",
    ownerUserId: "analyst-1",
    approvalTierRequired: "Lead",
    createdAtUtc: atOffset(referenceUtc, 2020),
    updatedAtUtc: atOffset(referenceUtc, 48),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Cloud Identity Abuse Through Token Drift",
    summary: "Privileged cloud session anomalies with unusual token replay cadence across regions.",
    priority: "High",
    status: "Investigating",
    ownerUserId: "lead-1",
    approvalTierRequired: "Admin",
    createdAtUtc: atOffset(referenceUtc, 980),
    updatedAtUtc: atOffset(referenceUtc, 75),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Phishing Sender Infrastructure Expansion",
    summary: "Look-alike sender graph indicates campaign expansion into finance users.",
    priority: "High",
    status: "Investigating",
    ownerUserId: "analyst-1",
    approvalTierRequired: "Lead",
    createdAtUtc: atOffset(referenceUtc, 820),
    updatedAtUtc: atOffset(referenceUtc, 92),
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Endpoint Artifact Swarm in Remote Office",
    summary: "High-volume artifact hits with uncertain lineage and incomplete endpoint telemetry.",
    priority: "Medium",
    status: "Investigating",
    ownerUserId: "analyst-1",
    approvalTierRequired: "Analyst",
    createdAtUtc: atOffset(referenceUtc, 700),
    updatedAtUtc: atOffset(referenceUtc, 130),
  },
]

function evidence(caseId: string, seed: string, evidenceType: string, sourceSystem: string, confidence: number, minutesAgo: number): EvidenceResponse {
  return {
    id: deterministicUuid(`evidence:${seed}`),
    caseId,
    evidenceType,
    sourceSystem,
    contentHash: `${seed}f2d7a9c37b1e0d5588a91c2d7f4b9d8e`,
    confidence,
    collectedAtUtc: atOffset(referenceUtc, minutesAgo),
    createdAtUtc: atOffset(referenceUtc, minutesAgo + 5),
  }
}

const evidenceRows: EvidenceResponse[] = [
  evidence(caseRows[0].id, "cred-replay-a", "CredentialDumpArtifact", "EDR", 0.91, 62),
  evidence(caseRows[0].id, "cred-replay-b", "LoginAnomaly", "IdentityTelemetry", 0.86, 54),
  evidence(caseRows[0].id, "cred-replay-c", "SessionReplayIndicator", "SIEM", 0.79, 45),
  evidence(caseRows[1].id, "c2-beacon-a", "BeaconInterval", "NetFlow", 0.88, 90),
  evidence(caseRows[1].id, "c2-beacon-b", "JA3Match", "IDS", 0.84, 70),
  evidence(caseRows[1].id, "c2-beacon-c", "PassiveDNSLink", "DNS", 0.76, 60),
  evidence(caseRows[2].id, "cloud-abuse-a", "PrivilegedSessionAnomaly", "CloudAudit", 0.83, 100),
  evidence(caseRows[2].id, "cloud-abuse-b", "TokenReplay", "IdentityTelemetry", 0.8, 84),
  evidence(caseRows[2].id, "cloud-abuse-c", "GeoDrift", "CloudAudit", 0.71, 78),
  evidence(caseRows[3].id, "phish-a", "SenderInfrastructure", "EmailGateway", 0.74, 130),
  evidence(caseRows[3].id, "phish-b", "LookalikeDomain", "PassiveDNS", 0.67, 126),
  evidence(caseRows[4].id, "artifact-a", "EndpointHashHit", "EDR", 0.69, 155),
]

function decision(caseItem: CaseResponse, seed: string, state: string, action: string, minutesAgo: number): DecisionResponse {
  return {
    id: deterministicUuid(`decision:${seed}`),
    caseId: caseItem.id,
    state,
    recommendedAction: action,
    approvalTierRequired: caseItem.approvalTierRequired,
    policyVersion: "policy-2026.03",
    modelVersion: "fusion-v2.4",
    reasoning: `${caseItem.title} scored above escalation threshold with policy-guarded action plan.`,
    approvedByUserId: state === "Approved" ? "lead-1" : null,
    approvedAtUtc: state === "Approved" ? atOffset(referenceUtc, minutesAgo - 2) : null,
    createdAtUtc: atOffset(referenceUtc, minutesAgo + 8),
    updatedAtUtc: atOffset(referenceUtc, minutesAgo),
  }
}

const decisionRows: DecisionResponse[] = [
  decision(caseRows[0], "cred-approval", "AwaitingApproval", "contain_identity_and_rotate_secrets", 40),
  decision(caseRows[1], "c2-investigating", "Investigating", "expand_graph_scope_and_collect_dns_provenance", 55),
  decision(caseRows[2], "cloud-investigating", "Investigating", "request_more_evidence", 88),
  decision(caseRows[3], "phish-investigating", "Investigating", "block_sender_infrastructure", 110),
  decision(caseRows[4], "artifact-investigating", "Investigating", "request_more_evidence", 140),
]

function rule(caseId: string, seed: string, name: string, family: RuleFamily, status: string, minutesAgo: number): RuleResponse {
  return {
    id: deterministicUuid(`rule:${seed}`),
    caseId,
    name,
    ruleFamily: family,
    ruleBody: `// ${name}\n${family} detector body for ${seed}`,
    version: "v1.0.0",
    status,
    createdAtUtc: atOffset(referenceUtc, minutesAgo + 80),
    updatedAtUtc: atOffset(referenceUtc, minutesAgo),
  }
}

const ruleRows: RuleResponse[] = [
  rule(caseRows[0].id, "cred-rule", "Credential Replay Burst Rule", "sigma", "Review", 46),
  rule(caseRows[1].id, "c2-rule", "JA3 C2 Burst Rule", "snort", "Canary", 72),
  rule(caseRows[2].id, "cloud-rule", "Cloud Token Drift Rule", "yara", "Draft", 96),
]

function proposal(caseItem: CaseResponse, ruleFamily: RuleFamily, status: string, seed: string, minutesAgo: number): RuleProposalResponse {
  return {
    id: deterministicUuid(`proposal:${seed}`),
    caseId: caseItem.id,
    proposalName: `${caseItem.title.split(" ").slice(0, 3).join(" ")} Proposal`,
    ruleFamily,
    ruleBody: `proposal body for ${seed}`,
    proposedVersion: "v1.1.0",
    proposedByUserId: "analyst-1",
    rationale: "Policy-gated hardening proposal derived from scenario evidence pack.",
    policyRiskScore: 0.34 + (minutesAgo % 20) / 100,
    status,
    reviewedByUserId: status === "Accepted" ? "lead-1" : null,
    reviewedAtUtc: status === "Accepted" ? atOffset(referenceUtc, minutesAgo - 2) : null,
    reviewReason: status === "Accepted" ? "Meets containment and precision thresholds." : null,
    overrideReason: null,
    createdAtUtc: atOffset(referenceUtc, minutesAgo + 22),
    updatedAtUtc: atOffset(referenceUtc, minutesAgo),
  }
}

const proposalRows: RuleProposalResponse[] = [
  proposal(caseRows[0], "sigma", "InReview", "cred-proposal", 41),
  proposal(caseRows[1], "snort", "Accepted", "c2-proposal", 68),
  proposal(caseRows[2], "yara", "Draft", "cloud-proposal", 94),
]

const recommendationRows: DeploymentRecommendationResponse[] = [
  {
    id: deterministicUuid("recommendation:c2"),
    caseId: caseRows[1].id,
    ruleProposalId: proposalRows[1].id,
    targetEnvironment: "production",
    recommendedStage: "canary",
    riskScore: 0.41,
    predictedNoise: 0.17,
    baselineNoise: 0.14,
    predictedNoiseDelta: 0.03,
    analystAcceptanceRate: 0.82,
    requiresHumanApproval: true,
    autoPublishEnabled: false,
    requestedByUserId: "analyst-1",
    rationale: "Containment value exceeds rollout risk with manual promotion controls.",
    recommendedAtUtc: atOffset(referenceUtc, 65),
    createdAtUtc: atOffset(referenceUtc, 65),
    updatedAtUtc: atOffset(referenceUtc, 65),
  },
]

const rolloutRows: RolloutPlanResponse[] = [
  {
    id: deterministicUuid("rollout:c2"),
    caseId: caseRows[1].id,
    ruleProposalId: proposalRows[1].id,
    deploymentRecommendationId: recommendationRows[0].id,
    currentStage: "canary",
    canaryTrafficPercent: 15,
    predictedNoise: 0.17,
    observedNoise: 0.18,
    observedNoiseDelta: 0.04,
    analystAcceptanceRate: 0.8,
    requiresManualPromotion: true,
    shadowStartedAtUtc: atOffset(referenceUtc, 82),
    canaryStartedAtUtc: atOffset(referenceUtc, 61),
    promotedAtUtc: null,
    rolledBackAtUtc: null,
    lastStageReason: "Canary started after lead acceptance.",
    lastOverrideReason: null,
    createdAtUtc: atOffset(referenceUtc, 82),
    updatedAtUtc: atOffset(referenceUtc, 52),
  },
]

const rollbackRows: RollbackPlanResponse[] = [
  {
    id: deterministicUuid("rollback:c2"),
    caseId: caseRows[1].id,
    ruleProposalId: proposalRows[1].id,
    rolloutPlanId: rolloutRows[0].id,
    triggerCondition: "observed_noise_delta > 0.12 for 30 minutes",
    recoveryPlaybook: "Disable rule bundle, restore previous stable version, notify lead and admin.",
    predictedNoiseThreshold: 0.27,
    lastObservedNoise: 0.18,
    triggerConditionMet: false,
    isTriggered: false,
    triggeredByUserId: null,
    triggeredAtUtc: null,
    triggerReason: null,
    createdAtUtc: atOffset(referenceUtc, 82),
    updatedAtUtc: atOffset(referenceUtc, 52),
  },
]

const deploymentRows: DeploymentResponse[] = [
  {
    id: deterministicUuid("deployment:c2-canary"),
    caseId: caseRows[1].id,
    ruleId: ruleRows[1].id,
    targetEnvironment: "production",
    status: "Canary",
    requestedByUserId: "analyst-1",
    approvedByUserId: "lead-1",
    approvedAtUtc: atOffset(referenceUtc, 62),
    deployedAtUtc: atOffset(referenceUtc, 61),
    createdAtUtc: atOffset(referenceUtc, 63),
    updatedAtUtc: atOffset(referenceUtc, 52),
  },
]

const feedbackRows: FeedbackResponse[] = [
  {
    id: deterministicUuid("feedback:cred"),
    caseId: caseRows[0].id,
    decisionId: decisionRows[0].id,
    verdict: "NeedsMoreEvidence",
    notes: "Approval held pending endpoint command lineage.",
    submittedByUserId: "lead-1",
    submittedAtUtc: atOffset(referenceUtc, 30),
  },
  {
    id: deterministicUuid("feedback:c2"),
    caseId: caseRows[1].id,
    decisionId: decisionRows[1].id,
    verdict: "ApproveCanary",
    notes: "Canary is acceptable with manual promotion and rollback threshold.",
    submittedByUserId: "lead-1",
    submittedAtUtc: atOffset(referenceUtc, 50),
  },
]

const jobRows: JobRunResponse[] = [
  {
    id: deterministicUuid("job:scan"),
    jobType: "ScanPlanExecution",
    status: "Completed",
    triggeredBy: "Administrator",
    details: "Scan plan execution completed with no critical drift.",
    startedAtUtc: atOffset(referenceUtc, 210),
    completedAtUtc: atOffset(referenceUtc, 205),
  },
  {
    id: deterministicUuid("job:retrain"),
    jobType: "ModelRetraining",
    status: "Completed",
    triggeredBy: "Administrator",
    details: "Fusion model retraining applied to latest analyst feedback window.",
    startedAtUtc: atOffset(referenceUtc, 520),
    completedAtUtc: atOffset(referenceUtc, 470),
  },
]

const scenarioRows: ScenarioPack[] = [
  {
    id: "scenario-credential-replay",
    label: "Credential replay chain",
    summary: "Identity replay progression with approval-gated containment.",
    caseId: caseRows[0].id,
  },
  {
    id: "scenario-c2-beacon",
    label: "C2 beacon campaign",
    summary: "Canary-stage rollout with rollback safety controls.",
    caseId: caseRows[1].id,
  },
  {
    id: "scenario-cloud-identity-abuse",
    label: "Cloud identity abuse",
    summary: "Ambiguous evidence fusion requiring next-best-evidence capture.",
    caseId: caseRows[2].id,
  },
]

const eventRows: AuditEvent[] = [
  {
    id: deterministicUuid("event:seed-1"),
    caseId: caseRows[0].id,
    type: "rule_proposal_created",
    actorUserId: "analyst-1",
    occurredAtUtc: atOffset(referenceUtc, 44),
    summary: "Initial proposal created for credential replay scenario.",
    details: { proposalId: proposalRows[0].id },
  },
  {
    id: deterministicUuid("event:seed-2"),
    caseId: caseRows[1].id,
    type: "rule_proposal_simulated",
    actorUserId: "analyst-1",
    occurredAtUtc: atOffset(referenceUtc, 66),
    summary: "C2 proposal simulation generated rollout and rollback plans.",
    details: { proposalId: proposalRows[1].id, rolloutPlanId: rolloutRows[0].id },
  },
]

function indexById<T extends { id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T>>((accumulator, row) => {
    accumulator[row.id] = row
    return accumulator
  }, {})
}

function groupByCase<T extends { id: string; caseId: string }>(rows: T[]) {
  return rows.reduce<Record<string, string[]>>((accumulator, row) => {
    accumulator[row.caseId] = [...(accumulator[row.caseId] ?? []), row.id]
    return accumulator
  }, {})
}

function buildIndices(): MockStoreIndices {
  return {
    caseIds: caseRows.map((item) => item.id),
    evidenceByCase: groupByCase(evidenceRows),
    decisionsByCase: groupByCase(decisionRows),
    rulesByCase: groupByCase(ruleRows),
    deploymentsByCase: groupByCase(deploymentRows),
    feedbackByCase: groupByCase(feedbackRows),
    proposalsByCase: groupByCase(proposalRows),
    recommendationsByCase: groupByCase(recommendationRows),
    rolloutsByCase: groupByCase(rolloutRows),
    rollbacksByCase: groupByCase(rollbackRows),
    jobsByType: jobRows.reduce<Record<string, string[]>>((accumulator, row) => {
      accumulator[row.jobType] = [...(accumulator[row.jobType] ?? []), row.id]
      return accumulator
    }, {}),
  }
}

export function createScenarioState(): MockStoreState {
  const state: MockStoreState = {
    entities: {
      cases: indexById(caseRows),
      evidence: indexById(evidenceRows),
      decisions: indexById(decisionRows),
      rules: indexById(ruleRows),
      deployments: indexById(deploymentRows),
      feedback: indexById(feedbackRows),
      ruleProposals: indexById(proposalRows),
      recommendations: indexById(recommendationRows),
      rollouts: indexById(rolloutRows),
      rollbacks: indexById(rollbackRows),
      jobs: indexById(jobRows),
    },
    indices: buildIndices(),
    events: eventRows,
    scenarios: scenarioRows,
    meta: {
      referenceUtc,
      tickMinutes: 3,
      sequence: 1,
    },
  }

  return deepCopy(state)
}
