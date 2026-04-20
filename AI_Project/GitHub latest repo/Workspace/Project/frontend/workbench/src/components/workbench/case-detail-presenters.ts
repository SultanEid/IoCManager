import type { CaseRuleWorkflowResponse } from "@/shared/api/schemas"
import type { CaseDetailVM, GraphRelationshipsVM, QueueItem } from "@/shared/gateway/types"

export type UrgencyBand = {
  key: "critical" | "elevated" | "controlled"
  label: string
  toneClass: string
  rationale: string
}

export type AttackMappingRow = {
  id: string
  tactic: string
  technique: string
  confidence: number
  source: string
  note: string
}

export type PolicyNoteRow = {
  id: string
  title: string
  detail: string
  tone: "enforced" | "warning" | "info"
}

const OWNER_DISPLAY: Record<string, string> = {
  "analyst-1": "Analyst",
  "lead-1": "Operator",
  "admin-1": "Administrator",
  u1: "Analyst",
  u2: "Operator",
}

const ATTACK_BY_EVIDENCE: Record<string, { tactic: string; technique: string; note: string }> = {
  dns: {
    tactic: "Command and Control",
    technique: "T1071.004 DNS",
    note: "Beaconing and domain flux behavior indicate C2 transport.",
  },
  edr: {
    tactic: "Execution",
    technique: "T1059.001 PowerShell",
    note: "Endpoint execution sequence is aligned with suspicious script activity.",
  },
  process: {
    tactic: "Execution",
    technique: "T1059 Command and Scripting Interpreter",
    note: "Process graph shows staged command execution.",
  },
  auth: {
    tactic: "Credential Access",
    technique: "T1003 OS Credential Dumping",
    note: "Authentication artifacts suggest credential harvesting attempts.",
  },
  registry: {
    tactic: "Persistence",
    technique: "T1547.001 Registry Run Keys",
    note: "Registry-based startup persistence is implied by host telemetry.",
  },
  ip: {
    tactic: "Command and Control",
    technique: "T1095 Non-Application Layer Protocol",
    note: "Outbound network telemetry indicates covert channel behavior.",
  },
}

function normalize(value: string) {
  return value.replace(/\s|_|-/g, "").toLowerCase()
}

function scoreAxis(detail: CaseDetailVM, axis: string, fallback = 50) {
  return detail.scoreAxes.find((item) => normalize(item.axis) === normalize(axis))?.value ?? fallback
}

function latestRollout(workflow: CaseRuleWorkflowResponse | null) {
  return workflow?.rolloutPlans
    .slice()
    .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
}

function latestRollback(workflow: CaseRuleWorkflowResponse | null, rolloutPlanId?: string) {
  if (!workflow) {
    return null
  }

  if (rolloutPlanId) {
    const linked = workflow.rollbackPlans.find((item) => item.rolloutPlanId === rolloutPlanId)
    if (linked) {
      return linked
    }
  }

  return (
    workflow.rollbackPlans
      .slice()
      .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
  )
}

export function formatActionLabel(value: string) {
  return value.replace(/_/g, " ")
}

export function ownerDisplayName(ownerUserId: string) {
  const direct = OWNER_DISPLAY[ownerUserId]
  if (direct) {
    return direct
  }

  const normalized = ownerUserId.trim().toLowerCase()
  if (normalized.includes("admin")) {
    return "Administrator"
  }

  if (normalized.includes("lead") || normalized.includes("it")) {
    return "Operator"
  }

  if (normalized.includes("analyst")) {
    return "Analyst"
  }

  return ownerUserId
}

export function resolveUncertainty(detail: CaseDetailVM, queueItem: QueueItem | null) {
  return queueItem?.uncertainty ?? scoreAxis(detail, "Uncertainty")
}

export function resolveBlastRadius(detail: CaseDetailVM, queueItem: QueueItem | null) {
  return queueItem?.blastRadius ?? scoreAxis(detail, "Blast Radius")
}

export function formatSla(queueItem: QueueItem | null) {
  const pressure = queueItem?.slaPressure
  if (typeof pressure !== "number") {
    return "SLA not profiled yet"
  }

  if (pressure >= 80) {
    return `Critical SLA (${pressure}/100)`
  }

  if (pressure >= 65) {
    return `Urgent SLA (${pressure}/100)`
  }

  if (pressure >= 45) {
    return `Watch SLA (${pressure}/100)`
  }

  return `Stable SLA (${pressure}/100)`
}

export function deriveUrgencyBand(detail: CaseDetailVM, queueItem: QueueItem | null): UrgencyBand {
  const uncertainty = resolveUncertainty(detail, queueItem)
  const blastRadius = resolveBlastRadius(detail, queueItem)
  const pressure = queueItem?.triageScore ?? Math.round(uncertainty * 0.45 + blastRadius * 0.55)

  if (pressure >= 80 || blastRadius >= 75) {
    return {
      key: "critical",
      label: "Critical urgency",
      toneClass: "border-rose-300/40 bg-rose-400/12 text-rose-200",
      rationale: "Large potential blast radius or triage pressure requires immediate gated action.",
    }
  }

  if (pressure >= 60 || uncertainty >= 55) {
    return {
      key: "elevated",
      label: "Elevated urgency",
      toneClass: "border-amber-300/35 bg-amber-400/12 text-amber-100",
      rationale: "Action is viable but additional corroboration and policy review remain important.",
    }
  }

  return {
    key: "controlled",
    label: "Controlled urgency",
    toneClass: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    rationale: "Current evidence supports paced progression under existing controls.",
  }
}

export function buildAttackMappingRows(detail: CaseDetailVM, graph: GraphRelationshipsVM | null): AttackMappingRow[] {
  const rows: AttackMappingRow[] = []
  const usedTechniques = new Set<string>()

  detail.topEvidence.slice(0, 3).forEach((item, index) => {
    const mapped = ATTACK_BY_EVIDENCE[normalize(item.evidenceType)] ?? ATTACK_BY_EVIDENCE.dns
    if (usedTechniques.has(mapped.technique)) {
      return
    }

    usedTechniques.add(mapped.technique)
    rows.push({
      id: `evidence-${item.id}`,
      tactic: mapped.tactic,
      technique: mapped.technique,
      confidence: Math.round(item.confidence * 100),
      source: item.sourceSystem,
      note: index === 0 ? `${mapped.note} Highest-confidence evidence signal.` : mapped.note,
    })
  })

  const graphHint = graph?.pathHints[0] ?? null
  if (graphHint && !usedTechniques.has("T1020 Automated Exfiltration")) {
    rows.push({
      id: `graph-${graphHint.id}`,
      tactic: "Collection",
      technique: "T1020 Automated Exfiltration",
      confidence: Math.min(96, Math.max(58, graphHint.relevanceScore)),
      source: "Graph path hint",
      note: `Path hint "${graphHint.title}" reinforces cross-entity collection behavior.`,
    })
  }

  if (rows.length === 0) {
    rows.push({
      id: "fallback",
      tactic: "Discovery",
      technique: "T1087 Account Discovery",
      confidence: 61,
      source: "Case synthesis",
      note: "Baseline ATT&CK mapping generated from current case telemetry.",
    })
  }

  return rows.slice(0, 4)
}

export function buildPolicyNotes(
  detail: CaseDetailVM,
  workflow: CaseRuleWorkflowResponse | null,
  queueItem: QueueItem | null,
): PolicyNoteRow[] {
  const rollout = latestRollout(workflow)
  const rollback = latestRollback(workflow, rollout?.id)
  const recommendations = workflow?.recommendations ?? []
  const manualApprovalRate = recommendations.length
    ? Math.round((recommendations.filter((item) => item.requiresHumanApproval).length / recommendations.length) * 100)
    : 100

  const notes: PolicyNoteRow[] = detail.policyGuardrails.slice(0, 2).map((item) => ({
    id: `guardrail-${item.id}`,
    title: item.label,
    detail: item.rationale,
    tone: item.status,
  }))

  notes.push({
    id: "manual-approval-coverage",
    title: "Manual approval coverage",
    detail: `${manualApprovalRate}% of recommendations are explicitly human-gated before promotion.`,
    tone: manualApprovalRate >= 100 ? "enforced" : "warning",
  })

  notes.push({
    id: "sla-risk",
    title: "SLA and policy pressure",
    detail:
      queueItem && queueItem.slaPressure >= 65
        ? `SLA pressure is elevated (${queueItem.slaPressure}/100); approval workflow should be prioritized.`
        : "SLA pressure is within expected operating guardrails for current stage.",
    tone: queueItem && queueItem.slaPressure >= 65 ? "warning" : "info",
  })

  notes.push({
    id: "rollback-readiness",
    title: "Rollback readiness",
    detail: rollback
      ? `${rollback.triggerCondition}. Triggered: ${String(rollback.isTriggered)}.`
      : "Rollback threshold is inherited from case-level rollback strategy.",
    tone: rollback?.triggerConditionMet ? "warning" : "enforced",
  })

  return notes.slice(0, 5)
}

export function resolveRolloutStage(detail: CaseDetailVM, workflow: CaseRuleWorkflowResponse | null) {
  const rollout = latestRollout(workflow)
  if (rollout) {
    return rollout.currentStage
  }

  if (detail.latestDeployment?.status) {
    return detail.latestDeployment.status
  }

  return "NotScheduled"
}

export function resolveRollbackCondition(detail: CaseDetailVM, workflow: CaseRuleWorkflowResponse | null) {
  const rollout = latestRollout(workflow)
  const rollback = latestRollback(workflow, rollout?.id)
  if (rollback) {
    return rollback.triggerCondition
  }

  return detail.rollbackPlan
}
