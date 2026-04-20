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
  RuleProposalResponse,
  RuleResponse,
} from "@/shared/api/schemas"

export type CaseLifecycle = "new" | "investigating" | "awaiting_approval" | "approved" | "contained" | "closed"

export type RuleWorkflowLifecycle =
  | "draft"
  | "in_review"
  | "accepted"
  | "rejected"
  | "simulated"
  | "canary"
  | "promoted"
  | "rolled_back"

export type PolicyGuardrailStatus = "enforced" | "warning" | "violated"

export type UserPersonaRole = "Analyst" | "Lead" | "Admin"

export type UserPersona = {
  id: string
  username: string
  displayName: string
  roles: UserPersonaRole[]
  focus: string
}

export type ScenarioPack = {
  id: string
  label: string
  summary: string
  caseId: string
}

export type AuditEventType =
  | "rule_proposal_created"
  | "rule_proposal_reviewed"
  | "rule_proposal_simulated"
  | "rollout_advanced"
  | "canary_observation_recorded"
  | "rollback_triggered"
  | "job_triggered"

export type AuditEvent = {
  id: string
  caseId: string
  type: AuditEventType
  actorUserId: string
  occurredAtUtc: string
  summary: string
  details: Record<string, string>
}

export type MockStoreEntities = {
  cases: Record<string, CaseResponse>
  evidence: Record<string, EvidenceResponse>
  decisions: Record<string, DecisionResponse>
  rules: Record<string, RuleResponse>
  deployments: Record<string, DeploymentResponse>
  feedback: Record<string, FeedbackResponse>
  ruleProposals: Record<string, RuleProposalResponse>
  recommendations: Record<string, DeploymentRecommendationResponse>
  rollouts: Record<string, RolloutPlanResponse>
  rollbacks: Record<string, RollbackPlanResponse>
  jobs: Record<string, JobRunResponse>
}

export type MockStoreIndices = {
  caseIds: string[]
  evidenceByCase: Record<string, string[]>
  decisionsByCase: Record<string, string[]>
  rulesByCase: Record<string, string[]>
  deploymentsByCase: Record<string, string[]>
  feedbackByCase: Record<string, string[]>
  proposalsByCase: Record<string, string[]>
  recommendationsByCase: Record<string, string[]>
  rolloutsByCase: Record<string, string[]>
  rollbacksByCase: Record<string, string[]>
  jobsByType: Record<string, string[]>
}

export type MockStoreState = {
  entities: MockStoreEntities
  indices: MockStoreIndices
  events: AuditEvent[]
  scenarios: ScenarioPack[]
  meta: {
    referenceUtc: string
    tickMinutes: number
    sequence: number
  }
}
