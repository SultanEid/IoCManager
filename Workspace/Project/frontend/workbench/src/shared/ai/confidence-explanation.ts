import type {
  AiDecisionActionPlanResponse,
  AiDecisionExplanationResponse,
  AiDecisionResultResponse,
  AiEvidenceSourcesResponse,
  AiSimilarDetectionsResponse,
} from "@/shared/api/schemas"

type ConfidenceExplanationInput = {
  result: AiDecisionResultResponse | null
  explanation?: AiDecisionExplanationResponse | null
  actionPlan?: AiDecisionActionPlanResponse | null
  evidenceSources?: AiEvidenceSourcesResponse | null
  similarDetections?: AiSimilarDetectionsResponse | null
  sourceLabel?: string | null
  hasDetectionContext?: boolean
}

export type ConfidenceExplanation = {
  title: string
  detail: string
  tone: "warning" | "danger" | "default"
}

export function explainDecisionConfidence({
  result,
  explanation = null,
  actionPlan = null,
  evidenceSources = null,
  similarDetections = null,
  sourceLabel = null,
  hasDetectionContext = true,
}: ConfidenceExplanationInput): ConfidenceExplanation[] {
  if (!result?.decision) {
    return []
  }

  const decision = result.decision
  const safety = decision.safetyDiagnostics ?? null
  const evidenceItems = evidenceSources?.items ?? []
  const contradictoryEvidence = evidenceItems.filter((item) => {
    const text = `${item.polarity} ${item.category}`.toLowerCase()
    return text.includes("contradict") || text.includes("conflict")
  })
  const missingEvidenceRequests = new Set([
    ...decision.nextBestEvidence,
    ...(explanation?.nextBestEvidence ?? []),
    ...(actionPlan?.prerequisites ?? []),
  ])
  const reasons: ConfidenceExplanation[] = []

  if (
    !hasDetectionContext
    || safety?.weakEvidence
    || safety?.partialEvidence
    || (safety?.missingCriticalFields.length ?? 0) > 0
    || missingEvidenceRequests.size > 0
    || (!result.evidenceSourcesAvailable && evidenceItems.length === 0)
  ) {
    const missingFields = safety?.missingCriticalFields.length
      ? ` Missing fields: ${safety.missingCriticalFields.join(", ")}.`
      : ""
    reasons.push({
      title: "Missing scan evidence",
      detail: `The model needs more scan, host, or enrichment evidence before it can make a stronger call.${missingFields}`,
      tone: "warning",
    })
  }

  const normalizedSource = (sourceLabel ?? "").trim().toLowerCase()
  if (
    !normalizedSource
    || normalizedSource === "unknown"
    || normalizedSource === "not reported"
    || normalizedSource.includes("ioc-native")
    || decision.provenance.length === 0
  ) {
    reasons.push({
      title: "Unknown source",
      detail: "The decision has limited source provenance, so provider trust contributes less to confidence.",
      tone: "warning",
    })
  }

  if (!result.similarDetectionsAvailable || (similarDetections && similarDetections.items.length === 0)) {
    reasons.push({
      title: "No analyst history",
      detail: "No prior similar detections or analyst decisions were available to corroborate this IOC.",
      tone: "default",
    })
  }

  if (
    safety?.enrichmentStatus === "degraded"
    || safety?.enrichmentStatus === "unavailable"
    || safety?.degradationReasons.some((item) => item.toLowerCase().includes("enrichment"))
  ) {
    reasons.push({
      title: "Weak enrichment",
      detail: "External enrichment is degraded or unavailable, so reputation and context signals are weaker.",
      tone: "warning",
    })
  }

  if (
    safety?.contradictoryEvidence
    || (safety?.contradictionScore ?? 0) >= 0.2
    || contradictoryEvidence.length > 0
  ) {
    reasons.push({
      title: "Conflicting evidence",
      detail: "Some evidence conflicts with the verdict, which lowers confidence and should be reviewed.",
      tone: "danger",
    })
  }

  if (reasons.length === 0 && decision.confidence < 0.5) {
    reasons.push({
      title: "Low-confidence decision",
      detail: "The backend returned a low confidence score without a specific machine-readable reason.",
      tone: "warning",
    })
  }

  if (reasons.length === 0) {
    reasons.push({
      title: "No major confidence reducers",
      detail: "The decision did not report missing evidence, source, history, enrichment, or conflict issues.",
      tone: "default",
    })
  }

  return dedupeReasons(reasons)
}

function dedupeReasons(reasons: ConfidenceExplanation[]) {
  const seen = new Set<string>()
  return reasons.filter((reason) => {
    if (seen.has(reason.title)) {
      return false
    }
    seen.add(reason.title)
    return true
  })
}
