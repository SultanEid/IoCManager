import type {
  CaseDetailVM,
  GraphEdgeVM,
  GraphEntityType,
  GraphNeighbor,
  GraphNodeVM,
  GraphPathHintVM,
  LinkedReportVM,
  LinkedRuleVM,
  NextBestEvidenceHint,
  PolicyGuardrailVM,
  QueueItem,
  ReportsIngestionVM,
  ScoreAxis,
  SimilarHistoricalCase,
  TimelineEventVM,
} from "@/shared/gateway/types"
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
  RuleResponse,
} from "@/shared/api/schemas"

function seedFromString(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function mulberry32(seed: number) {
  let value = seed
  return () => {
    value += 0x6d2b79f5
    let next = Math.imul(value ^ (value >>> 15), 1 | value)
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function numberInRange(random: () => number, min: number, max: number) {
  return Math.round(min + random() * (max - min))
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function normalize(value: string) {
  return value.replace(/\s|_|-/g, "").toLowerCase()
}

function normalizeAction(action: string) {
  return action.replace(/_/g, " ")
}

function latestByUpdatedAt<T extends { updatedAtUtc: string }>(items: T[]) {
  return items.slice().sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null
}

function latestByTimestamp<T extends { collectedAtUtc: string }>(items: T[]) {
  return items.slice().sort((left, right) => Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc))[0] ?? null
}

export function buildScoreAxes(caseId: string, evidence: EvidenceResponse[], decisions: DecisionResponse[]): ScoreAxis[] {
  const random = mulberry32(seedFromString(caseId))
  const evidenceConfidence = evidence.length > 0 ? evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length : 0.5
  const decisionStrength = decisions.length > 0 ? Math.min(0.95, 0.55 + decisions.length * 0.08) : 0.4

  return [
    { axis: "Maliciousness", value: numberInRange(random, 45, 92), max: 100 },
    { axis: "Uncertainty", value: numberInRange(random, 12, 67), max: 100 },
    { axis: "Blast Radius", value: numberInRange(random, 18, 88), max: 100 },
    { axis: "Evidence Completeness", value: Math.round(Math.min(100, evidenceConfidence * 100)), max: 100 },
    { axis: "Actionability", value: Math.round(Math.min(100, decisionStrength * 100)), max: 100 },
  ]
}

export function buildGraphNeighbors(caseId: string, count = 5): GraphNeighbor[] {
  const random = mulberry32(seedFromString(`${caseId}:neighbors`))
  const relations = ["co-observed", "lineage-parent", "lineage-child", "same-campaign", "shared-infrastructure"]
  const labels = [
    "Domain Cluster",
    "Beaconing Endpoint",
    "Credential Artifact",
    "Operator Tooling Node",
    "C2 Infrastructure",
    "Phishing Sender Profile",
    "Lateral Movement Host",
    "Malware Lineage",
  ]

  return Array.from({ length: count }).map((_, index) => {
    const confidence = numberInRange(random, 48, 92)
    return {
      id: `${caseId}-neighbor-${index + 1}`,
      label: `${labels[index % labels.length]} ${index + 1}`,
      relationship: relations[index % relations.length],
      confidence,
    }
  })
}

function hoursAgo(referenceUtc: string, hours: number) {
  return new Date(Date.parse(referenceUtc) - hours * 60 * 60 * 1000).toISOString()
}

function summarizeEvidenceSources(evidence: EvidenceResponse[]) {
  const sources = Array.from(new Set(evidence.map((item) => item.sourceSystem))).slice(0, 3)
  return sources.length > 0 ? sources : ["EDR", "DNS", "SIEM"]
}

function nodeId(caseId: string, key: string) {
  return `${caseId}:${key}`
}

function randomEntityConfidence(random: () => number) {
  return numberInRange(random, 58, 95)
}

export function buildGraphInvestigation(
  caseItem: CaseResponse,
  evidence: EvidenceResponse[],
  rules: RuleResponse[],
  allCases: CaseResponse[],
): {
  nodes: GraphNodeVM[]
  edges: GraphEdgeVM[]
  pathHints: GraphPathHintVM[]
  timeBounds: { startUtc: string; endUtc: string }
} {
  const caseId = caseItem.id
  const random = mulberry32(seedFromString(`${caseId}:investigation-graph`))
  const evidenceSources = summarizeEvidenceSources(evidence)
  const relatedCases = allCases.filter((item) => item.id !== caseId).slice(0, 3)
  const relatedRules = rules.slice(0, 3).map((item) => ({ id: item.id, name: item.name, status: item.status }))
  const referenceUtc = caseItem.updatedAtUtc

  const entities: Array<{ key: string; label: string; entityType: GraphEntityType; metadata: Record<string, string> }> = [
    {
      key: "identity",
      label: `Identity ${caseId.slice(0, 6)}`,
      entityType: "identity",
      metadata: {
        principal: `svc-${caseId.slice(0, 6)}`,
        role: "Privileged service account",
      },
    },
    {
      key: "host",
      label: "Lateral Host",
      entityType: "host",
      metadata: {
        hostname: `wkstn-${caseId.slice(0, 4)}`,
        segment: "Finance-Prod",
      },
    },
    {
      key: "domain",
      label: "Beacon Domain",
      entityType: "domain",
      metadata: {
        fqdn: `update-${caseId.slice(0, 5)}.infra-sync.net`,
        registrar: "Recently registered",
      },
    },
    {
      key: "ip",
      label: "C2 Endpoint",
      entityType: "ip",
      metadata: {
        address: `198.51.100.${numberInRange(random, 11, 219)}`,
        asn: `AS${numberInRange(random, 64000, 64800)}`,
      },
    },
    {
      key: "malware",
      label: "Payload Family",
      entityType: "malware",
      metadata: {
        family: "Loader.Greyline",
        lineage: "Variant B",
      },
    },
    {
      key: "tool",
      label: "Operator Tooling",
      entityType: "tool",
      metadata: {
        toolset: "Credential dumper",
        execution: "Living-off-the-land",
      },
    },
    {
      key: "artifact",
      label: "Credential Artifact",
      entityType: "artifact",
      metadata: {
        hash: evidence[0]?.contentHash.slice(0, 16) ?? "unknown-hash",
        source: evidence[0]?.sourceSystem ?? "EDR",
      },
    },
  ]

  const nodes: GraphNodeVM[] = [
    {
      id: caseId,
      label: caseItem.title,
      entityType: "case",
      confidence: 100,
      metadata: {
        priority: caseItem.priority,
        status: caseItem.status,
        owner: caseItem.ownerUserId,
        approvalTier: caseItem.approvalTierRequired,
      },
      provenance: ["Case registry", "Policy engine timeline"],
      sightings: [
        {
          source: "Case timeline",
          firstSeenUtc: caseItem.createdAtUtc,
          lastSeenUtc: caseItem.updatedAtUtc,
          count: 1,
        },
      ],
      linkedCases: relatedCases.map((item) => ({ caseId: item.id, title: item.title, status: item.status })),
      relatedRules,
    },
    ...entities.map((entity, index) => {
      const firstSeenOffsetHours = numberInRange(random, 36 + index * 3, 240 + index * 8)
      const lastSeenOffsetHours = Math.max(1, numberInRange(random, 2, 24 + index * 2))
      const firstSeenUtc = hoursAgo(referenceUtc, firstSeenOffsetHours)
      const lastSeenUtc = hoursAgo(referenceUtc, lastSeenOffsetHours)
      const sourceA = evidenceSources[index % evidenceSources.length]
      const sourceB = evidenceSources[(index + 1) % evidenceSources.length]

      return {
        id: nodeId(caseId, entity.key),
        label: entity.label,
        entityType: entity.entityType,
        confidence: randomEntityConfidence(random),
        metadata: entity.metadata,
        provenance: [`${sourceA} correlated telemetry`, "Analyst-reviewed linkage"],
        sightings: [
          {
            source: sourceA,
            firstSeenUtc,
            lastSeenUtc,
            count: numberInRange(random, 2, 14),
          },
          {
            source: sourceB,
            firstSeenUtc: hoursAgo(referenceUtc, firstSeenOffsetHours + numberInRange(random, 2, 24)),
            lastSeenUtc,
            count: numberInRange(random, 1, 8),
          },
        ],
        linkedCases: relatedCases
          .slice(0, 2)
          .map((item) => ({ caseId: item.id, title: item.title, status: item.status })),
        relatedRules,
      }
    }),
  ]

  const edges: GraphEdgeVM[] = [
    {
      id: `${caseId}:edge:case-identity`,
      source: caseId,
      target: nodeId(caseId, "identity"),
      edgeType: "related-case",
      semantic: "Identity appeared in adjacent investigation cases.",
      confidence: numberInRange(random, 62, 92),
      firstSeenUtc: hoursAgo(referenceUtc, 192),
      lastSeenUtc: hoursAgo(referenceUtc, 8),
    },
    {
      id: `${caseId}:edge:identity-host`,
      source: nodeId(caseId, "identity"),
      target: nodeId(caseId, "host"),
      edgeType: "authenticates-to",
      semantic: "Service account authenticated to host during suspicious window.",
      confidence: numberInRange(random, 66, 94),
      firstSeenUtc: hoursAgo(referenceUtc, 164),
      lastSeenUtc: hoursAgo(referenceUtc, 4),
    },
    {
      id: `${caseId}:edge:host-domain`,
      source: nodeId(caseId, "host"),
      target: nodeId(caseId, "domain"),
      edgeType: "communicates-with",
      semantic: "Host repeatedly beaconed to rare domain.",
      confidence: numberInRange(random, 58, 89),
      firstSeenUtc: hoursAgo(referenceUtc, 150),
      lastSeenUtc: hoursAgo(referenceUtc, 2),
    },
    {
      id: `${caseId}:edge:domain-ip`,
      source: nodeId(caseId, "domain"),
      target: nodeId(caseId, "ip"),
      edgeType: "resolves-to",
      semantic: "Domain resolved to rotating endpoint set.",
      confidence: numberInRange(random, 71, 96),
      firstSeenUtc: hoursAgo(referenceUtc, 146),
      lastSeenUtc: hoursAgo(referenceUtc, 2),
    },
    {
      id: `${caseId}:edge:artifact-malware`,
      source: nodeId(caseId, "artifact"),
      target: nodeId(caseId, "malware"),
      edgeType: "indicates",
      semantic: "Artifact fingerprint indicates malware lineage.",
      confidence: numberInRange(random, 67, 95),
      firstSeenUtc: hoursAgo(referenceUtc, 136),
      lastSeenUtc: hoursAgo(referenceUtc, 6),
    },
    {
      id: `${caseId}:edge:malware-host`,
      source: nodeId(caseId, "malware"),
      target: nodeId(caseId, "host"),
      edgeType: "observed-on",
      semantic: "Malware execution observed on host with corroborating telemetry.",
      confidence: numberInRange(random, 64, 90),
      firstSeenUtc: hoursAgo(referenceUtc, 132),
      lastSeenUtc: hoursAgo(referenceUtc, 5),
    },
    {
      id: `${caseId}:edge:tool-host`,
      source: nodeId(caseId, "tool"),
      target: nodeId(caseId, "host"),
      edgeType: "uses",
      semantic: "Operator tooling execution linked to host process chain.",
      confidence: numberInRange(random, 55, 83),
      firstSeenUtc: hoursAgo(referenceUtc, 120),
      lastSeenUtc: hoursAgo(referenceUtc, 3),
    },
    {
      id: `${caseId}:edge:case-artifact`,
      source: caseId,
      target: nodeId(caseId, "artifact"),
      edgeType: "delivers",
      semantic: "Case evidence package contains artifact sample.",
      confidence: numberInRange(random, 62, 88),
      firstSeenUtc: hoursAgo(referenceUtc, 126),
      lastSeenUtc: hoursAgo(referenceUtc, 7),
    },
    {
      id: `${caseId}:edge:case-domain`,
      source: caseId,
      target: nodeId(caseId, "domain"),
      edgeType: "related-case",
      semantic: "Domain appears in cross-case pivots relevant to this case.",
      confidence: numberInRange(random, 59, 87),
      firstSeenUtc: hoursAgo(referenceUtc, 174),
      lastSeenUtc: hoursAgo(referenceUtc, 8),
    },
  ]

  const pathHints: GraphPathHintVM[] = [
    {
      id: `${caseId}:path:credential-lateral`,
      title: "Credential to Lateral Movement",
      description: "Track suspect principal to host execution and outbound beacon.",
      nodeIds: [caseId, nodeId(caseId, "identity"), nodeId(caseId, "host"), nodeId(caseId, "domain")],
      edgeIds: [
        `${caseId}:edge:case-identity`,
        `${caseId}:edge:identity-host`,
        `${caseId}:edge:host-domain`,
      ],
      relevanceScore: 93,
    },
    {
      id: `${caseId}:path:delivery-c2`,
      title: "Artifact to C2 Infrastructure",
      description: "Follow evidence artifact lineage toward active C2 endpoint.",
      nodeIds: [caseId, nodeId(caseId, "artifact"), nodeId(caseId, "malware"), nodeId(caseId, "domain"), nodeId(caseId, "ip")],
      edgeIds: [
        `${caseId}:edge:case-artifact`,
        `${caseId}:edge:artifact-malware`,
        `${caseId}:edge:malware-host`,
        `${caseId}:edge:host-domain`,
        `${caseId}:edge:domain-ip`,
      ],
      relevanceScore: 87,
    },
  ]

  const allTimes = [
    ...edges.flatMap((edge) => [Date.parse(edge.firstSeenUtc), Date.parse(edge.lastSeenUtc)]),
    ...nodes.flatMap((node) =>
      node.sightings.flatMap((sighting) => [Date.parse(sighting.firstSeenUtc), Date.parse(sighting.lastSeenUtc)]),
    ),
  ].filter((value) => Number.isFinite(value))

  const start = Math.min(...allTimes)
  const end = Math.max(...allTimes)
  return {
    nodes,
    edges,
    pathHints,
    timeBounds: {
      startUtc: new Date(start).toISOString(),
      endUtc: new Date(end).toISOString(),
    },
  }
}

export function buildSimilarHistoricalCases(caseId: string): SimilarHistoricalCase[] {
  const random = mulberry32(seedFromString(`${caseId}:similar`))
  const names = [
    "Credential Replay Across Finance Segment",
    "DNS Exfiltration Through Newly Registered Domain",
    "Privilege Escalation via Scripted Task Chain",
  ]

  return Array.from({ length: 3 }).map((_, index) => ({
    caseId: `hist-${caseId.slice(0, 6)}-${index + 1}`,
    title: names[index % names.length],
    outcome: index % 2 === 0 ? "Promoted" : "Contained",
    similarity: numberInRange(random, 62, 94),
  }))
}

export function buildNextBestEvidence(caseId: string): NextBestEvidenceHint[] {
  const random = mulberry32(seedFromString(`${caseId}:nbe`))
  const hints = [
    "Endpoint process tree for first execution timestamp",
    "Passive DNS history for linked domain",
    "EDR prevalence pivot across peer hosts",
    "Email telemetry for related sender infrastructure",
  ]

  return hints.slice(0, 3).map((label, index) => ({
    id: `${caseId}-hint-${index + 1}`,
    label,
    reason: `Expected policy confidence uplift ${numberInRange(random, 8, 22)}%`,
    sourceHint: index % 2 === 0 ? "EDR + DNS" : "SIEM + Email",
  }))
}

function feedbackSignal(feedback: FeedbackResponse[]) {
  if (feedback.length === 0) {
    return "No analyst feedback yet"
  }

  const supportive = feedback.filter((item) => normalize(item.verdict).includes("accept") || normalize(item.verdict).includes("approve")).length
  const dissenting = feedback.filter((item) => normalize(item.verdict).includes("reject")).length

  return `${supportive} supportive / ${dissenting} dissenting verdicts`
}

export function buildLinkedReports(evidence: EvidenceResponse[], feedback: FeedbackResponse[]): LinkedReportVM[] {
  if (evidence.length === 0) {
    return []
  }

  const grouped = new Map<string, EvidenceResponse[]>()
  for (const item of evidence) {
    grouped.set(item.sourceSystem, [...(grouped.get(item.sourceSystem) ?? []), item])
  }

  return Array.from(grouped.entries())
    .map(([sourceSystem, items], index) => {
      const latest = latestByTimestamp(items)
      const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length
      const reportTitle = `${sourceSystem} intelligence report`

      return {
        id: `${normalize(sourceSystem)}-report-${index + 1}`,
        title: reportTitle,
        sourceSystem,
        summary: `${items.length} evidence item(s), top hash ${latest?.contentHash.slice(0, 10) ?? "unknown"}`,
        confidence: Number.parseFloat(avgConfidence.toFixed(3)),
        collectedAtUtc: latest?.collectedAtUtc ?? new Date(0).toISOString(),
        contentHash: latest?.contentHash ?? "n/a",
        feedbackSignal: feedbackSignal(feedback),
      }
    })
    .sort((left, right) => Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc))
    .slice(0, 6)
}

export function buildActivityTimeline(
  decisions: DecisionResponse[],
  deployments: DeploymentResponse[],
  feedback: FeedbackResponse[],
): TimelineEventVM[] {
  const decisionEvents: TimelineEventVM[] = decisions.map((item) => ({
    id: `decision-${item.id}`,
    title: `Decision ${item.state}`,
    detail: `${normalizeAction(item.recommendedAction)} · policy ${item.policyVersion}`,
    when: item.updatedAtUtc,
    tone: normalize(item.state).includes("approved") ? "success" : normalize(item.state).includes("reject") ? "warning" : "default",
    source: "decision",
  }))

  const deploymentEvents: TimelineEventVM[] = deployments.map((item) => ({
    id: `deployment-${item.id}`,
    title: `Deployment ${item.status}`,
    detail: `${item.targetEnvironment} · rule ${item.ruleId.slice(0, 8)}`,
    when: item.updatedAtUtc,
    tone: normalize(item.status).includes("rollback") ? "warning" : normalize(item.status).includes("promot") ? "success" : "default",
    source: "deployment",
  }))

  const feedbackEvents: TimelineEventVM[] = feedback.map((item) => ({
    id: `feedback-${item.id}`,
    title: `Feedback ${item.verdict}`,
    detail: item.notes,
    when: item.submittedAtUtc,
    tone: normalize(item.verdict).includes("reject") ? "warning" : "default",
    source: "feedback",
  }))

  return [...decisionEvents, ...deploymentEvents, ...feedbackEvents].sort(
    (left, right) => Date.parse(right.when) - Date.parse(left.when),
  )
}

export function buildLinkedRules(rules: RuleResponse[], workflow: CaseRuleWorkflowResponse | null): LinkedRuleVM[] {
  const latestProposalByKey = new Map<string, CaseRuleWorkflowResponse["proposals"][number]>()
  for (const proposal of workflow?.proposals ?? []) {
    const key = `${normalize(proposal.ruleFamily)}:${normalize(proposal.proposedVersion)}`
    const current = latestProposalByKey.get(key)
    if (!current || Date.parse(proposal.updatedAtUtc) > Date.parse(current.updatedAtUtc)) {
      latestProposalByKey.set(key, proposal)
    }
  }

  return rules
    .map((rule) => {
      const key = `${normalize(rule.ruleFamily)}:${normalize(rule.version)}`
      const matchingProposal = latestProposalByKey.get(key)
      const provenance = matchingProposal
        ? `Proposal ${matchingProposal.proposalName} (${matchingProposal.status})`
        : "Existing enforced case rule"

      return {
        id: rule.id,
        name: rule.name,
        family: rule.ruleFamily,
        version: rule.version,
        status: rule.status,
        provenance,
        updatedAtUtc: rule.updatedAtUtc,
      }
    })
    .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))
}

function latestRollout(workflow: CaseRuleWorkflowResponse | null): RolloutPlanResponse | null {
  if (!workflow || workflow.rolloutPlans.length === 0) {
    return null
  }

  return latestByUpdatedAt(workflow.rolloutPlans)
}

function linkedRollback(workflow: CaseRuleWorkflowResponse | null, rollout: RolloutPlanResponse | null): RollbackPlanResponse | null {
  if (!workflow || workflow.rollbackPlans.length === 0) {
    return null
  }

  if (!rollout) {
    return latestByUpdatedAt(workflow.rollbackPlans)
  }

  return workflow.rollbackPlans.find((item) => item.rolloutPlanId === rollout.id) ?? latestByUpdatedAt(workflow.rollbackPlans)
}

export function buildPolicyGuardrails(
  latestDecision: DecisionResponse | null,
  workflow: CaseRuleWorkflowResponse | null,
  latestWorkflowRollout: RolloutPlanResponse | null,
  latestWorkflowRollback: RollbackPlanResponse | null,
  caseItem: CaseResponse,
): PolicyGuardrailVM[] {
  const effectiveRollout = latestWorkflowRollout ?? latestRollout(workflow)
  const effectiveRollback = latestWorkflowRollback ?? linkedRollback(workflow, effectiveRollout)
  const effectiveTier = latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired
  const allRecommendationsRequireApproval = (workflow?.recommendations ?? []).every((item) => item.requiresHumanApproval)
  const allRecommendationsAutopublishDisabled = (workflow?.recommendations ?? []).every((item) => !item.autoPublishEnabled)

  return [
    {
      id: "human-approval",
      label: `Human approval gate (${effectiveTier})`,
      status: "enforced",
      rationale: latestDecision?.approvedByUserId
        ? `Approved by ${latestDecision.approvedByUserId} at ${new Date(latestDecision.approvedAtUtc ?? latestDecision.updatedAtUtc).toLocaleString()}.`
        : "Decision cannot be promoted without an approved human reviewer.",
      owner: "Policy engine",
    },
    {
      id: "auto-publish-disabled",
      label: "Auto-publish disabled",
      status: allRecommendationsAutopublishDisabled ? "enforced" : "warning",
      rationale: allRecommendationsAutopublishDisabled
        ? "All recommendations require explicit analyst/lead action for rollout progression."
        : "One or more recommendations are missing explicit auto-publish controls.",
      owner: "Deployment controls",
    },
    {
      id: "manual-promotion",
      label: "Manual promotion checkpoints",
      status: effectiveRollout?.requiresManualPromotion || allRecommendationsRequireApproval ? "enforced" : "info",
      rationale: effectiveRollout
        ? `Current stage ${effectiveRollout.currentStage}; manual promotion required at each stage boundary.`
        : "No rollout plan is active; manual promotion policy remains in standby.",
      owner: "Rollout policy",
    },
    {
      id: "rollback-threshold",
      label: "Rollback threshold guard",
      status: effectiveRollback?.triggerConditionMet ? "warning" : "enforced",
      rationale: effectiveRollback
        ? `${effectiveRollback.triggerCondition} (threshold ${(effectiveRollback.predictedNoiseThreshold * 100).toFixed(1)}%).`
        : "Rollback requires observed noise threshold breach or policy violation override.",
      owner: "Safety controls",
    },
  ]
}

function formatActionSummary(action?: string) {
  if (!action) {
    return "Collect corroborating evidence before escalation."
  }

  const normalized = action.replace(/_/g, " ").toLowerCase()
  if (normalized.includes("contain")) {
    return "Contain scope and monitor blast radius drift."
  }

  if (normalized.includes("block")) {
    return "Block indicators and monitor policy side effects."
  }

  if (normalized.includes("evidence")) {
    return "Gather additional evidence before approval gate."
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function detectDecisionState(caseStatus: string, recommendedAction: string) {
  const status = normalize(caseStatus)
  const action = normalize(recommendedAction)

  if (status.includes("awaitingapproval")) {
    return "Awaiting Approval"
  }

  if (status.includes("approved")) {
    return "Approved"
  }

  if (status.includes("closed")) {
    return "Closed"
  }

  if (action.includes("contain") || action.includes("block")) {
    return "Ready for Containment"
  }

  return "Investigating"
}

function parsePriorityWeight(priority: string) {
  const normalized = normalize(priority)
  if (normalized === "critical") {
    return 100
  }
  if (normalized === "high") {
    return 78
  }
  if (normalized === "medium") {
    return 56
  }
  return 34
}

function parseApprovalTierWeight(approvalTier: string) {
  const normalized = normalize(approvalTier)
  if (normalized === "admin") {
    return 96
  }
  if (normalized === "lead") {
    return 78
  }
  return 55
}

function formatGraphSummary(caseId: string, neighbors: GraphNeighbor[]) {
  if (neighbors.length === 0) {
    return "No graph pivots yet."
  }

  const relationCounts = neighbors.reduce<Record<string, number>>((accumulator, neighbor) => {
    const key = neighbor.relationship
    accumulator[key] = (accumulator[key] ?? 0) + 1
    return accumulator
  }, {})

  const [primaryRelation, primaryCount] =
    Object.entries(relationCounts).sort((left, right) => right[1] - left[1])[0] ?? ["related", 0]

  const topConfidence = neighbors.reduce((max, neighbor) => Math.max(max, neighbor.confidence), 0)
  return `${primaryCount} ${primaryRelation} pivots · top confidence ${topConfidence}% · node ${caseId.slice(0, 8)}`
}

function computeConflictFromEvidence(caseId: string, evidenceCount: number) {
  const random = mulberry32(seedFromString(`${caseId}:conflict`))
  if (evidenceCount === 0) {
    return numberInRange(random, 74, 96)
  }

  const baseline = numberInRange(random, 28, 82)
  const volatilityPenalty = numberInRange(random, 0, 12)
  return clamp(baseline + volatilityPenalty - evidenceCount * 4)
}

function computeSlaPressure(updatedAtUtc: string, priorityWeight: number, state: string) {
  const hoursSinceUpdate = Math.max(0, (Date.now() - Date.parse(updatedAtUtc)) / (1000 * 60 * 60))
  const staleness = clamp((hoursSinceUpdate / 72) * 100)
  const stateBoost = normalize(state).includes("awaitingapproval") ? 22 : 0
  return clamp(staleness * 0.56 + priorityWeight * 0.34 + stateBoost)
}

function computeExpiryUtc(updatedAtUtc: string, priorityWeight: number, state: string) {
  const baseHours = priorityWeight >= 90 ? 4 : priorityWeight >= 70 ? 8 : priorityWeight >= 55 ? 16 : 24
  const approvalPenalty = normalize(state).includes("awaitingapproval") ? 2 : 0
  const expiresAt = new Date(Date.parse(updatedAtUtc) + (baseHours - approvalPenalty) * 60 * 60 * 1000)
  return expiresAt.toISOString()
}

export function synthesizeRolloutPlan(caseItem: CaseResponse, latestDeployment: DeploymentResponse | null) {
  if (latestDeployment) {
    return `Current status ${latestDeployment.status} in ${latestDeployment.targetEnvironment}. Maintain canary hold for 90 minutes before promotion gate.`
  }

  return `Begin with shadow rollout for case ${caseItem.id.slice(0, 8)} then progress to canary at 10% scope if analyst acceptance remains above threshold.`
}

export function synthesizeRollbackPlan(caseItem: CaseResponse, latestDeployment: DeploymentResponse | null) {
  if (!latestDeployment) {
    return "Rollback trigger: policy violation or fp delta > 15% sustained for 2h. Restore prior stable rule bundle and notify lead approver."
  }

  return `If ${latestDeployment.status.toLowerCase()} regresses quality, rollback ${latestDeployment.ruleId.slice(0, 8)} to previous version and freeze promotion for 24h.`
}

export function buildTopEvidence(evidence: EvidenceResponse[]) {
  return evidence
    .slice()
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      evidenceType: item.evidenceType,
      sourceSystem: item.sourceSystem,
      confidence: item.confidence,
      collectedAtUtc: item.collectedAtUtc,
      summary: `${item.evidenceType} from ${item.sourceSystem} at confidence ${Math.round(item.confidence * 100)}%`,
    }))
}

export function buildQueue(cases: CaseResponse[], details: CaseDetailVM[]): QueueItem[] {
  const detailById = new Map(details.map((item) => [item.caseItem.id, item]))

  return cases
    .map((item) => {
      const detail = detailById.get(item.id)
      const uncertainty = detail?.scoreAxes.find((axis) => axis.axis === "Uncertainty")?.value ?? 50
      const blastRadius = detail?.scoreAxes.find((axis) => axis.axis === "Blast Radius")?.value ?? 50
      const actionability = detail?.scoreAxes.find((axis) => axis.axis === "Actionability")?.value ?? 45
      const recommendation = detail?.recommendedAction ?? "request_more_evidence"
      const decisionState = detail?.decisionState ?? detectDecisionState(item.status, recommendation)
      const evidenceConflict = computeConflictFromEvidence(item.id, detail?.topEvidence.length ?? 0)
      const novelty = clamp(
        100 -
          (detail?.similarHistoricalCases.reduce((max, similar) => Math.max(max, similar.similarity), 0) ??
            numberInRange(mulberry32(seedFromString(`${item.id}:novelty`)), 45, 80)),
      )
      const priorityWeight = parsePriorityWeight(item.priority)
      const strategicValue = clamp(priorityWeight * 0.42 + parseApprovalTierWeight(detail?.approvalTier ?? item.approvalTierRequired) * 0.58)
      const slaPressure = computeSlaPressure(item.updatedAtUtc, priorityWeight, decisionState)
      const missingEvidence = (detail?.nextBestEvidence ?? []).slice(0, 3).map((hint) => hint.label)
      const relatedGraphSummary = formatGraphSummary(item.id, detail?.graphNeighbors ?? [])
      const triageScore = clamp(
        uncertainty * 0.17 +
          evidenceConflict * 0.16 +
          novelty * 0.12 +
          actionability * 0.12 +
          blastRadius * 0.18 +
          strategicValue * 0.14 +
          slaPressure * 0.11,
      )

      return {
        caseId: item.id,
        title: item.title,
        priority: item.priority,
        status: item.status,
        decisionState,
        recommendedAction: recommendation.replace(/_/g, " "),
        uncertainty,
        evidenceConflict,
        novelty,
        actionability,
        blastRadius,
        strategicValue,
        slaPressure,
        missingEvidence,
        relatedGraphSummary,
        expiresAtUtc: computeExpiryUtc(item.updatedAtUtc, priorityWeight, decisionState),
        triageScore,
        policyRisk: triageScore,
        approvalTier: detail?.approvalTier ?? item.approvalTierRequired,
        rolloutState: detail?.latestDeployment?.status ?? "NotScheduled",
        reason: formatActionSummary(recommendation),
        isSimulated: true,
      }
    })
    .sort((left, right) => right.triageScore - left.triageScore)
}

export function buildReportsIngestion(healthService: string, jobs: JobRunResponse[]): ReportsIngestionVM["ingestionSummary"] {
  const seed = seedFromString(`${healthService}:${jobs.length}`)
  const random = mulberry32(seed)
  const sources = ["EDR stream", "SIEM collector", "DNS sink", "Email telemetry"]

  return sources.map((source, index) => ({
    source,
    freshness: index % 2 === 0 ? "Fresh" : "Aging",
    quality: numberInRange(random, 71, 98),
    notes: jobs.length > index ? `Recent ${jobs[index].jobType} job completed ${jobs[index].status.toLowerCase()}.` : "No recent job telemetry.",
  }))
}


