"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type AiDecisionActionPlanOrPendingResponse,
  type AiDecisionActionPlanResponse,
  type AiDecisionExplanationOrPendingResponse,
  type AiDecisionExplanationResponse,
  type AiDecisionPendingResponse,
  type AiDecisionResultResponse,
  type AiEvidenceSourceResponse,
  type AiEvidenceSourcesResponse,
  type AiOverrideOrClosureResponse,
  type AiPhrasingDiagnosticsResponse,
  type AiSafetyDiagnosticsResponse,
  type AiSimilarDetectionsResponse,
  type DetectionLinkedAlertCaseResponse,
} from "@/shared/api/schemas"
import { explainDecisionConfidence } from "@/shared/ai/confidence-explanation"
import {
  AI_VERDICT_SCALE_OPTIONS,
  aiVerdictSentenceLabel,
  summarizeAiVerdict,
  toAiVerdictDisplay,
} from "@/shared/ai/verdict-scale"
import { classifyUiError } from "@/shared/api/error-classification"
import { writeAegisWidgetState } from "@/shared/aegis/widget-state"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { LoadingState, UnavailableState } from "@/shared/ui/state-panels"

const POLL_INTERVAL_MS = 2500
const POLL_MAX_ATTEMPTS = 12
const LIST_PAGE_SIZE = 20

type OverrideAction = "accept" | "reject" | "modify" | "defer"
type PhrasingOrigin = "deterministic" | "llm_assist" | "not_reported"

function toPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not reported"
  }

  return `${Math.round(value * 100)}%`
}

function isPendingResponse(
  payload: AiDecisionExplanationOrPendingResponse | AiDecisionActionPlanOrPendingResponse,
): payload is AiDecisionPendingResponse {
  return "message" in payload
}

function mapPhrasingOrigin(diagnostics: AiPhrasingDiagnosticsResponse | null | undefined): PhrasingOrigin {
  if (!diagnostics?.origin) {
    return "not_reported"
  }

  return diagnostics.origin
}

function humanizeToken(value: string | null | undefined, fallback = "Not reported") {
  if (!value) {
    return fallback
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function humanizeSentenceToken(value: string | null | undefined, fallback = "not reported") {
  if (!value) {
    return fallback
  }

  const title = humanizeToken(value, fallback)
  return title.charAt(0).toLowerCase() + title.slice(1)
}

function phrasingTone(origin: PhrasingOrigin) {
  if (origin === "deterministic") {
    return "border-emerald-300/35 bg-emerald-500/12 text-emerald-100"
  }

  if (origin === "llm_assist") {
    return "border-amber-300/35 bg-amber-500/12 text-amber-100"
  }

  return "border-border/75 bg-surface-2/80 text-muted-foreground"
}

function phrasingLabel(origin: PhrasingOrigin) {
  if (origin === "deterministic") {
    return "Deterministic phrasing"
  }

  if (origin === "llm_assist") {
    return "LLM-assisted phrasing"
  }

  return "Phrasing origin not reported"
}

function parseEvidencePolarity(item: AiEvidenceSourceResponse): "positive" | "negative" | "contradictory" | "other" {
  const normalized = `${item.polarity} ${item.category}`.toLowerCase()
  if (normalized.includes("contradict") || normalized.includes("conflict")) {
    return "contradictory"
  }
  if (normalized.includes("positive") || normalized.includes("support")) {
    return "positive"
  }
  if (normalized.includes("negative") || normalized.includes("against")) {
    return "negative"
  }
  return "other"
}

function isTerminalStatus(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase()
  return normalized === "completed"
    || normalized === "failed"
    || normalized === "closed"
    || normalized === "overridden"
    || normalized === "cancelled"
    || normalized === "canceled"
    || normalized === "error"
}

function collectMissingEvidence(
  result: AiDecisionResultResponse | null,
  explanation: AiDecisionExplanationResponse | null,
  actionPlan: AiDecisionActionPlanResponse | null,
) {
  const merged = new Map<string, string>()
  for (const item of result?.decision?.nextBestEvidence ?? []) {
    if (!merged.has(item)) {
      merged.set(item, "Decision follow-up")
    }
  }
  for (const item of explanation?.nextBestEvidence ?? []) {
    if (!merged.has(item)) {
      merged.set(item, "Explanation follow-up")
    }
  }
  for (const item of actionPlan?.prerequisites ?? []) {
    if (!merged.has(item)) {
      merged.set(item, "Action prerequisites")
    }
  }

  return Array.from(merged.entries()).map(([request, source]) => ({ request, source }))
}

function uniqueCases(
  linkedCases: DetectionLinkedAlertCaseResponse[],
  linkedAlerts: DetectionLinkedAlertCaseResponse[],
) {
  const byId = new Map<string, DetectionLinkedAlertCaseResponse>()
  for (const item of [...linkedCases, ...linkedAlerts]) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item)
    }
  }
  return Array.from(byId.values())
}

function readErrorMessage(error: unknown) {
  const failure = classifyUiError(error)
  return failure.message || "Request failed."
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not reported"
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function summarizeActionPlanExecution(actionPlan: AiDecisionActionPlanResponse | null) {
  if (!actionPlan) {
    return "Not reported"
  }

  const executionModes = Array.from(new Set(actionPlan.recommendedActions.map((item) => item.executionMode)))
  if (executionModes.length > 0) {
    return executionModes.map((item) => humanizeToken(item)).join(", ")
  }

  return actionPlan.neverAutoExecutes ? "Manual only" : "Not reported"
}

function summarizeActionPlanApproval(actionPlan: AiDecisionActionPlanResponse | null) {
  if (!actionPlan) {
    return "Not reported"
  }

  if (actionPlan.recommendedActions.length === 0) {
    return actionPlan.neverAutoExecutes ? "Human review required" : "Not reported"
  }

  return actionPlan.recommendedActions.every((item) => item.requiresHumanApproval)
    ? "Human approval required"
    : "Mixed approval requirements"
}

function describeSafetyStatus(safetyDiagnostics: AiSafetyDiagnosticsResponse | null) {
  if (!safetyDiagnostics) {
    return "The backend did not return machine-readable safety diagnostics for this decision."
  }

  const signals = [
    safetyDiagnostics.weakEvidence ? "weak evidence" : null,
    safetyDiagnostics.contradictoryEvidence ? "conflicting evidence" : null,
    safetyDiagnostics.partialEvidence ? "partial evidence" : null,
  ].filter(Boolean)

  if (signals.length === 0) {
    return `No major safety warnings were reported. False-positive risk is ${toPercent(safetyDiagnostics.falsePositiveRisk)}.`
  }

  return `${signals.map((item) => humanizeToken(item)).join(", ")} reported. False-positive risk is ${toPercent(safetyDiagnostics.falsePositiveRisk)}.`
}

function summarizeDecisionNarrative(result: AiDecisionResultResponse | null) {
  if (!result?.decision) {
    return "Run the AI decision to load the current verdict, supporting rationale, and uncertainty limits."
  }

  const decision = result.decision
  const mainReason = decision.reasons[0] ?? "No primary rationale was returned."
  const limits: string[] = []

  if (decision.abstainReason) {
    limits.push(`the system abstained because ${humanizeSentenceToken(decision.abstainReason)}`)
  }

  if (decision.safetyDiagnostics?.weakEvidence) {
    limits.push("evidence quality is weak")
  }
  if (decision.safetyDiagnostics?.contradictoryEvidence) {
    limits.push("the evidence set conflicts")
  }
  if (decision.safetyDiagnostics?.enrichmentStatus && decision.safetyDiagnostics.enrichmentStatus !== "available") {
    limits.push(`enrichment is ${humanizeSentenceToken(decision.safetyDiagnostics.enrichmentStatus)}`)
  }

  const limitText = limits.length > 0 ? ` Limits: ${limits.join("; ")}.` : ""
  return `The system currently places this detection in the ${aiVerdictSentenceLabel(decision.verdict)} band. Primary basis: ${mainReason}.${limitText}`
}

function summarizeProgressLabel({
  isSubmitting,
  isPolling,
  pollAttempts,
  decisionResult,
  explanation,
  actionPlan,
  explanationPendingMessage,
  actionPlanPendingMessage,
  pollingExhausted,
}: {
  isSubmitting: boolean
  isPolling: boolean
  pollAttempts: number
  decisionResult: AiDecisionResultResponse | null
  explanation: AiDecisionExplanationResponse | null
  actionPlan: AiDecisionActionPlanResponse | null
  explanationPendingMessage: string | null
  actionPlanPendingMessage: string | null
  pollingExhausted: boolean
}) {
  if (isSubmitting) {
    return "Submitting decision request"
  }

  if (pollingExhausted) {
    return "Partial results available"
  }

  if (isPolling && !decisionResult) {
    return `Analysis in progress (${pollAttempts}/${POLL_MAX_ATTEMPTS})`
  }

  if (isPolling && decisionResult) {
    if (explanationPendingMessage || (!explanation && decisionResult.explanationAvailable)) {
      return "Waiting for explanation"
    }
    if (actionPlanPendingMessage || (!actionPlan && decisionResult.actionPlanAvailable)) {
      return "Waiting for action plan"
    }
    return `Partial results available (${pollAttempts}/${POLL_MAX_ATTEMPTS})`
  }

  if (decisionResult) {
    return humanizeToken(decisionResult.status)
  }

  return "Not started"
}

function overrideActionHelp(action: OverrideAction) {
  if (action === "accept") {
    return "Close the decision with the recommended outcome after analyst review."
  }
  if (action === "reject") {
    return "Replace the decision verdict and close the current recommendation."
  }
  if (action === "modify") {
    return "Keep the case open to a different analyst decision with a revised verdict and rationale."
  }
  return "Record follow-up work without marking the decision as final."
}

function PhrasingOriginBadge({ diagnostics }: { diagnostics: AiPhrasingDiagnosticsResponse | null | undefined }) {
  if (!diagnostics) {
    return null
  }

  const origin = mapPhrasingOrigin(diagnostics)
  return (
    <Badge variant="secondary" className={`border ${phrasingTone(origin)}`}>
      {phrasingLabel(origin)}
    </Badge>
  )
}

function InlineState({
  title,
  description,
  tone = "default",
}: {
  title: string
  description: string
  tone?: "default" | "warning" | "danger"
}) {
  const className =
    tone === "warning"
      ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
      : tone === "danger"
        ? "border-destructive/35 bg-destructive/10 text-destructive"
        : "border-border/70 bg-surface-2/65 text-muted-foreground"

  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5">{description}</p>
    </div>
  )
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
      <p className="wb-kicker">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

function EvidenceCard({
  item,
  tone,
}: {
  item: AiEvidenceSourceResponse
  tone: "positive" | "warning" | "danger"
}) {
  const className =
    tone === "positive"
      ? "border-emerald-300/20 bg-surface-2/75"
      : tone === "danger"
        ? "border-red-300/25 bg-surface-2/75"
        : "border-amber-300/20 bg-surface-2/75"

  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <p className="text-sm font-medium text-foreground">
        #{item.rank} {item.summary}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {humanizeToken(item.source)} | {item.anchor} | {item.reference ?? "No reference"}
      </p>
    </div>
  )
}

export default function DetectionDecisionPage() {
  const params = useParams<{ detectionId: string }>()
  const router = useRouter()
  const detectionId = params.detectionId
  const { session } = useAuth()
  const pollRunRef = useRef(0)
  const unmountedRef = useRef(false)

  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [decisionId, setDecisionId] = useState<string | null>(null)
  const [decisionResult, setDecisionResult] = useState<AiDecisionResultResponse | null>(null)
  const [explanation, setExplanation] = useState<AiDecisionExplanationResponse | null>(null)
  const [actionPlan, setActionPlan] = useState<AiDecisionActionPlanResponse | null>(null)
  const [evidenceSources, setEvidenceSources] = useState<AiEvidenceSourcesResponse | null>(null)
  const [similarDetections, setSimilarDetections] = useState<AiSimilarDetectionsResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [pollingExhausted, setPollingExhausted] = useState(false)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [explanationPendingMessage, setExplanationPendingMessage] = useState<string | null>(null)
  const [actionPlanPendingMessage, setActionPlanPendingMessage] = useState<string | null>(null)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const [actionPlanError, setActionPlanError] = useState<string | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [similarError, setSimilarError] = useState<string | null>(null)
  const [aegisBusyAction, setAegisBusyAction] = useState<"create" | "regenerate" | null>(null)
  const [aegisError, setAegisError] = useState<string | null>(null)

  const [overrideAction, setOverrideAction] = useState<OverrideAction>("accept")
  const [overrideReason, setOverrideReason] = useState("")
  const [overrideNotes, setOverrideNotes] = useState("")
  const [overrideVerdict, setOverrideVerdict] = useState("")
  const [overrideResponse, setOverrideResponse] = useState<AiOverrideOrClosureResponse | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false)
  const [isLoadingMoreSimilar, setIsLoadingMoreSimilar] = useState(false)

  const actorUserId = session?.userId ?? session?.username ?? "analyst-1"

  useEffect(() => {
    return () => {
      unmountedRef.current = true
      pollRunRef.current += 1
    }
  }, [])

  const detectionQuery = useWorkbenchQuery(
    ["results-ingestion", "detection-detail", detectionId],
    (signal) => gateway.getDetectionDetail(detectionId, signal),
    { enabled: !isMockMode },
  )
  const aegisPlansQuery = useWorkbenchQuery(
    ["results-ingestion", "aegis-plans", detectionId],
    (signal) => gateway.listReportMitigationPlans(signal),
    { enabled: !isMockMode },
  )

  const linkedCases = useMemo(
    () =>
      detectionQuery.data
        ? uniqueCases(detectionQuery.data.linkedCases, detectionQuery.data.linkedAlerts)
        : [],
    [detectionQuery.data],
  )

  useEffect(() => {
    if (linkedCases.length === 1) {
      setSelectedCaseId(linkedCases[0].id)
      return
    }

    if (linkedCases.length === 0) {
      setSelectedCaseId("")
      return
    }

    setSelectedCaseId((current) => (linkedCases.some((item) => item.id === current) ? current : ""))
  }, [linkedCases])

  const pollDecision = useCallback(async (targetDecisionId: string) => {
    const runId = ++pollRunRef.current
    setIsPolling(true)
    setPollingExhausted(false)
    setPollingError(null)
    setPollAttempts(0)

    let explanationReady = false
    let actionPlanReady = false
    let evidenceReady = false
    let similarReady = false

    for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt += 1) {
      if (unmountedRef.current || pollRunRef.current !== runId) {
        return
      }

      setPollAttempts(attempt)

      let result: AiDecisionResultResponse
      try {
        result = await gateway.getAiDecisionResult(targetDecisionId)
      } catch (error) {
        if (unmountedRef.current || pollRunRef.current !== runId) {
          return
        }
        setPollingError(readErrorMessage(error))
        if (attempt < POLL_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        }
        continue
      }

      if (unmountedRef.current || pollRunRef.current !== runId) {
        return
      }

      setPollingError(null)
      setDecisionResult(result)

      try {
        const nextExplanation = await gateway.getAiDecisionExplanation(targetDecisionId)
        if (isPendingResponse(nextExplanation)) {
          setExplanationPendingMessage(nextExplanation.message)
          setExplanationError(null)
        } else {
          explanationReady = true
          setExplanation(nextExplanation)
          setExplanationPendingMessage(null)
          setExplanationError(null)
        }
      } catch (error) {
        setExplanationPendingMessage(null)
        setExplanationError(readErrorMessage(error))
      }

      try {
        const nextActionPlan = await gateway.getAiDecisionActionPlan(targetDecisionId)
        if (isPendingResponse(nextActionPlan)) {
          setActionPlanPendingMessage(nextActionPlan.message)
          setActionPlanError(null)
        } else {
          actionPlanReady = true
          setActionPlan(nextActionPlan)
          setActionPlanPendingMessage(null)
          setActionPlanError(null)
        }
      } catch (error) {
        setActionPlanPendingMessage(null)
        setActionPlanError(readErrorMessage(error))
      }

      if (result.evidenceSourcesAvailable || attempt === 1) {
        try {
          const nextEvidence = await gateway.listAiDecisionEvidenceSources(targetDecisionId, { limit: LIST_PAGE_SIZE })
          evidenceReady = true
          setEvidenceSources(nextEvidence)
          setEvidenceError(null)
        } catch (error) {
          setEvidenceError(readErrorMessage(error))
        }
      }

      if (result.similarDetectionsAvailable || attempt === 1) {
        try {
          const nextSimilar = await gateway.listAiDecisionSimilarDetections(targetDecisionId, { limit: LIST_PAGE_SIZE })
          similarReady = true
          setSimilarDetections(nextSimilar)
          setSimilarError(null)
        } catch (error) {
          setSimilarError(readErrorMessage(error))
        }
      }

      const terminal = isTerminalStatus(result.status) || Boolean(result.completedAtUtc) || Boolean(result.failureCode)
      const explanationSatisfied = !result.explanationAvailable || explanationReady
      const actionPlanSatisfied = !result.actionPlanAvailable || actionPlanReady
      const evidenceSatisfied = !result.evidenceSourcesAvailable || evidenceReady
      const similarSatisfied = !result.similarDetectionsAvailable || similarReady

      if (terminal && explanationSatisfied && actionPlanSatisfied && evidenceSatisfied && similarSatisfied) {
        if (!unmountedRef.current && pollRunRef.current === runId) {
          setIsPolling(false)
        }
        return
      }

      if (attempt < POLL_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
    }

    if (!unmountedRef.current && pollRunRef.current === runId) {
      setIsPolling(false)
      setPollingExhausted(true)
    }
  }, [])

  const handleSubmitDecision = useCallback(async () => {
    if (!detectionQuery.data) {
      return
    }

    const selectedCase =
      linkedCases.find((item) => item.id === selectedCaseId)
      ?? (linkedCases.length === 1 ? linkedCases[0] : null)
    if (!selectedCase) {
      return
    }

    setSubmitError(null)
    setOverrideError(null)
    setOverrideResponse(null)
    setIsSubmitting(true)
    setDecisionResult(null)
    setExplanation(null)
    setActionPlan(null)
    setEvidenceSources(null)
    setSimilarDetections(null)
    setExplanationPendingMessage(null)
    setActionPlanPendingMessage(null)
    setExplanationError(null)
    setActionPlanError(null)
    setEvidenceError(null)
    setSimilarError(null)
    setPollingError(null)
    setPollingExhausted(false)

    try {
        const submitted = await gateway.submitAiDecision({
          caseId: selectedCase.id,
          detectionId: detectionQuery.data.id,
          iocType: detectionQuery.data.iocType ?? "unknown",
          iocValue: detectionQuery.data.iocValue ?? detectionQuery.data.fingerprint,
          observedAtUtc: detectionQuery.data.observedAtUtc,
          detectionPackage: {
            caseId: selectedCase.id,
            detectionId: detectionQuery.data.id,
            observedAt: detectionQuery.data.observedAtUtc,
            fingerprint: detectionQuery.data.fingerprint,
            scannerFamily: detectionQuery.data.scannerFamily,
            source: detectionQuery.data.source,
            ruleName: detectionQuery.data.ruleName,
            iocType: detectionQuery.data.iocType,
          iocValue: detectionQuery.data.iocValue,
          linkedCases: detectionQuery.data.linkedCases,
          linkedAlerts: detectionQuery.data.linkedAlerts,
        },
        submittedByUserId: actorUserId,
      })

      setDecisionId(submitted.decisionId)
      await pollDecision(submitted.decisionId)
    } catch (error) {
      setSubmitError(readErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [actorUserId, detectionQuery.data, linkedCases, pollDecision, selectedCaseId])

  const loadMoreSimilar = useCallback(async () => {
    if (!decisionId || !similarDetections?.nextCursor || isLoadingMoreSimilar) {
      return
    }

    setIsLoadingMoreSimilar(true)
    try {
      const nextPage = await gateway.listAiDecisionSimilarDetections(decisionId, {
        limit: LIST_PAGE_SIZE,
        cursor: similarDetections.nextCursor,
      })

      setSimilarDetections((current) => {
        if (!current) {
          return nextPage
        }

        return {
          ...nextPage,
          items: [...current.items, ...nextPage.items],
        }
      })
      setSimilarError(null)
    } catch (error) {
      setSimilarError(readErrorMessage(error))
    } finally {
      setIsLoadingMoreSimilar(false)
    }
  }, [decisionId, isLoadingMoreSimilar, similarDetections?.nextCursor])

  const submitOverrideOrClosure = useCallback(async () => {
    if (!decisionId) {
      return
    }

    const reason = overrideReason.trim()
    const notes = overrideNotes.trim()
    const verdict = overrideVerdict.trim()
    if (!reason) {
      setOverrideError("Reason is required.")
      return
    }

    if ((overrideAction === "reject" || overrideAction === "modify") && !verdict) {
      setOverrideError("Override verdict is required for reject or modify actions.")
      return
    }

    if ((overrideAction === "modify" || overrideAction === "defer") && !notes) {
      setOverrideError("Follow-up notes are required for modify or defer actions.")
      return
    }

    const payload = (() => {
      if (overrideAction === "accept") {
        return {
          actionType: "Close" as const,
          reason,
          closureDisposition: "accepted_recommendation",
          isFinal: true,
          submittedByUserId: actorUserId,
        }
      }

      if (overrideAction === "reject") {
        return {
          actionType: "Override" as const,
          reason,
          overrideVerdict: verdict,
          isFinal: true,
          submittedByUserId: actorUserId,
        }
      }

      if (overrideAction === "modify") {
        return {
          actionType: "Override" as const,
          reason,
          notes,
          overrideVerdict: verdict,
          isFinal: true,
          submittedByUserId: actorUserId,
        }
      }

      return {
        actionType: "Close" as const,
        reason,
        notes,
        closureDisposition: "deferred_followup",
        isFinal: false,
        submittedByUserId: actorUserId,
      }
    })()

    setIsSubmittingOverride(true)
    setOverrideError(null)
    try {
      const response = await gateway.submitAiDecisionOverrideOrClosure(decisionId, payload)
      setOverrideResponse(response)
    } catch (error) {
      setOverrideError(readErrorMessage(error))
    } finally {
      setIsSubmittingOverride(false)
    }
  }, [actorUserId, decisionId, overrideAction, overrideNotes, overrideReason, overrideVerdict])

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Detection detail unavailable" />
  }

  if (isMockMode) {
    return (
      <UnavailableState
        title="AI decision unavailable"
        description="This operator surface is only available in real backend mode. Demo mode does not provide AI decisions or action plans."
      />
    )
  }

  if (detectionQuery.isLoading || aegisPlansQuery.isLoading) {
    return <LoadingState label="Loading detection detail" />
  }

  if (detectionQuery.isError || aegisPlansQuery.isError || !detectionQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(detectionQuery.error ?? aegisPlansQuery.error)} fallbackTitle="Detection detail unavailable" />
  }

  const detection = detectionQuery.data
  const existingAegisPlan = detection.scanJobId
    ? (aegisPlansQuery.data?.items ?? []).find((item) => item.sourceScanJobIds.includes(detection.scanJobId!)) ?? null
    : null
  const caseSelectionRequired = linkedCases.length > 1 && !selectedCaseId
  const canSubmitDecision = linkedCases.length > 0 && !caseSelectionRequired && !isSubmitting

  const contradictoryEvidence = (evidenceSources?.items ?? []).filter((item) => parseEvidencePolarity(item) === "contradictory")
  const evidenceUsedPositive = (evidenceSources?.items ?? []).filter((item) => parseEvidencePolarity(item) === "positive")
  const evidenceUsedNegative = (evidenceSources?.items ?? []).filter((item) => parseEvidencePolarity(item) === "negative")
  const evidenceUsedOther = (evidenceSources?.items ?? []).filter((item) => parseEvidencePolarity(item) === "other")
  const missingEvidence = collectMissingEvidence(decisionResult, explanation, actionPlan)

  const reasonValue = overrideReason.trim()
  const notesValue = overrideNotes.trim()
  const verdictValue = overrideVerdict.trim()
  const overrideRequirements = [
    !reasonValue ? "Add an analyst reason." : null,
    (overrideAction === "reject" || overrideAction === "modify") && !verdictValue ? "Choose an override verdict." : null,
    (overrideAction === "modify" || overrideAction === "defer") && !notesValue ? "Add follow-up notes." : null,
  ].filter(Boolean) as string[]
  const canSubmitOverride = Boolean(decisionId) && !isSubmittingOverride && overrideRequirements.length === 0
  const safetyDiagnostics = decisionResult?.decision?.safetyDiagnostics ?? null
  const verdictDisplay = decisionResult?.decision ? toAiVerdictDisplay(decisionResult.decision.verdict) : null
  const confidenceReasons = explainDecisionConfidence({
    result: decisionResult,
    explanation,
    actionPlan,
    evidenceSources,
    similarDetections,
    sourceLabel: detection.source,
    hasDetectionContext: true,
  })
  const actionExecutionSummary = summarizeActionPlanExecution(actionPlan)
  const actionApprovalSummary = summarizeActionPlanApproval(actionPlan)
  const progressLabel = summarizeProgressLabel({
    isSubmitting,
    isPolling,
    pollAttempts,
    decisionResult,
    explanation,
    actionPlan,
    explanationPendingMessage,
    actionPlanPendingMessage,
    pollingExhausted,
  })
  const operatorOutcome = overrideResponse
    ? `${humanizeToken(overrideResponse.actionType)} submitted ${formatTimestamp(overrideResponse.submittedAtUtc)}`
    : "No operator decision has been submitted yet."

  const openExistingAegisPlan = () => {
    if (!existingAegisPlan) {
      return
    }

    writeAegisWidgetState({
      phase: "completed",
      title: "Aegis mitigation plan ready",
      sourceName: `${detection.fingerprint}${detection.serverHostname ? ` on ${detection.serverHostname}` : ""}`,
      reviewPath: `/agents/aegis?plan=${encodeURIComponent(existingAegisPlan.id)}`,
      source: "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
    router.push(`/agents/aegis?plan=${encodeURIComponent(existingAegisPlan.id)}`)
  }

  const generateAegisPlan = async (regenerate: boolean) => {
    if (!detection.scanJobId) {
      return
    }

    setAegisBusyAction(regenerate ? "regenerate" : "create")
    setAegisError(null)
    writeAegisWidgetState({
      phase: regenerate ? "drafting" : "reviewing",
      title: regenerate ? "Aegis is regenerating a mitigation plan" : "Aegis is reviewing the selected detection",
      sourceName: `${detection.fingerprint}${detection.serverHostname ? ` on ${detection.serverHostname}` : ""}`,
      reviewPath: null,
      source: "user_action",
      updatedAtUtc: new Date().toISOString(),
    })
    try {
      const response = await gateway.generateReportMitigationFromScanJob(detection.scanJobId, {
        includeWorkspaceContext: true,
        actorUserId,
        regenerate,
      })
      if (!response.persistedMitigationReport) {
        throw new Error("Aegis did not return a saved mitigation plan.")
      }
      writeAegisWidgetState({
        phase: "completed",
        title: "Aegis mitigation plan ready",
        sourceName: response.persistedMitigationReport.title,
        reviewPath: `/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`,
        source: "user_action",
        updatedAtUtc: new Date().toISOString(),
      })
      router.push(`/agents/aegis?plan=${encodeURIComponent(response.persistedMitigationReport.id)}`)
    } catch (error) {
      writeAegisWidgetState({
        phase: "blocked",
        title: "Aegis was blocked while reviewing the selected detection",
        sourceName: `${detection.fingerprint}${detection.serverHostname ? ` on ${detection.serverHostname}` : ""}`,
        reviewPath: null,
        source: "user_action",
        updatedAtUtc: new Date().toISOString(),
      })
      setAegisError(readErrorMessage(error))
    } finally {
      setAegisBusyAction(null)
    }
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="wb-kicker">Scans / Detection Detail</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Detection decision</h2>
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
              This operator surface presents decision support only. No recommendation executes automatically, and uncertainty is shown directly.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <CompactMetric label="Detection" value={detection.fingerprint} detail={`ID: ${detection.id}`} />
          <div className="rounded-xl border border-border/75 bg-surface-2/70 p-3">
            <p className="wb-kicker">Family / Status</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge value={detection.scannerFamily} />
              <StatusBadge value={detection.disposition} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{detection.serverHostname ?? detection.serverId}</p>
          </div>
          <CompactMetric
            label="Observed"
            value={formatTimestamp(detection.observedAtUtc)}
            detail={`Occurrences: ${detection.occurrenceCount}`}
          />
          <CompactMetric
            label="Source / Provenance"
            value={detection.source ?? "Not reported"}
            detail={`Hash: ${detection.rawPayloadHash.slice(0, 14)}`}
          />
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-border/75 bg-surface-2/60 p-3">
            <p className="wb-kicker">Detection Context</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rule: {detection.ruleName ?? "Not linked"} | IOC: {detection.iocType ?? "n/a"} {detection.iocValue ?? ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Linked alerts: {detection.linkedAlerts.length} | Linked cases: {detection.linkedCases.length} | Scan job: {detection.scanJobId ?? "Not linked"}
            </p>
          </div>

          <div className="rounded-xl border border-border/75 bg-surface-2/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="wb-kicker">Case Prerequisite</p>
              <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                {linkedCases.length === 0 ? "No linked case" : caseSelectionRequired ? "Selection required" : "Ready"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Choose the case that should receive this decision before you submit analysis.
            </p>
            <select
              aria-label="Linked case selection"
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className="mt-3 h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              disabled={linkedCases.length <= 1}
            >
              <option value="">
                {linkedCases.length === 0
                  ? "No linked case available"
                  : linkedCases.length === 1
                    ? "Single linked case selected"
                    : "Select a linked case"}
              </option>
              {linkedCases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.status})
                </option>
              ))}
            </select>
            {linkedCases.length === 0 ? (
              <p className="mt-2 text-xs text-amber-100">
                Link this detection to a case before running the decision.
              </p>
            ) : null}
            {caseSelectionRequired ? (
              <p className="mt-2 text-xs text-amber-100">
                Multiple linked cases are available. Select the target case before submitting analysis.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/75 bg-surface-2/60 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="wb-kicker">Aegis</p>
              <p className="mt-1 text-sm font-medium">
                {existingAegisPlan
                  ? "A mitigation plan already exists for this scan job."
                  : detection.scanJobId
                    ? "Send this scan job to Aegis for a mitigation plan."
                    : "This detection is not linked to a scan job Aegis can review directly."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {existingAegisPlan
                  ? `${existingAegisPlan.severity} severity, ${existingAegisPlan.confidence} confidence, created ${formatTimestamp(existingAegisPlan.generatedAtUtc)}.`
                  : detection.scanJobId
                    ? "Use this when a finding matters operationally even if it did not auto-trigger Aegis."
                    : "If needed, open a linked alert and generate a mitigation plan from that alert instead."}
              </p>
            </div>
            {detection.scanJobId ? (
              <div className="flex flex-wrap gap-2">
                {existingAegisPlan ? (
                  <>
                    <Button type="button" variant="outline" onClick={openExistingAegisPlan} disabled={aegisBusyAction !== null}>
                      Open mitigation plan
                    </Button>
                    <Button type="button" onClick={() => void generateAegisPlan(true)} disabled={aegisBusyAction !== null}>
                      {aegisBusyAction === "regenerate" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => void generateAegisPlan(false)} disabled={aegisBusyAction !== null}>
                    {aegisBusyAction === "create" ? "Creating..." : "Create mitigation plan"}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          {aegisError ? <p className="mt-3 text-xs text-rose-300">{aegisError}</p> : null}
        </div>
      </motion.header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <motion.article className="wb-panel space-y-4" variants={panelMotion}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Decision Summary</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Review the current verdict, uncertainty, and lifecycle state before taking operator action.
              </p>
            </div>
            <Button type="button" size="sm" onClick={handleSubmitDecision} disabled={!canSubmitDecision}>
              {isSubmitting ? "Submitting..." : "Run AI decision"}
            </Button>
          </div>

          {submitError ? <InlineState title="Decision request failed" description={submitError} tone="danger" /> : null}
          {pollingError ? <InlineState title="Decision refresh degraded" description={pollingError} tone="warning" /> : null}

          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="wb-kicker">Analysis Status</p>
                <p className="mt-1 text-sm font-semibold tracking-tight">{progressLabel}</p>
              </div>
              {decisionId ? (
                <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                  Request {decisionId.slice(0, 8)}
                </Badge>
              ) : null}
            </div>
            {pollingExhausted && decisionId ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InlineState
                  title="Refresh required"
                  description="Auto-refresh retries were exhausted. The latest partial results remain visible."
                  tone="warning"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => void pollDecision(decisionId)}>
                  Refresh
                </Button>
              </div>
            ) : null}
          </div>

          {decisionResult?.decision ? (
            <div className="space-y-4 rounded-xl border border-border/70 bg-surface-2/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-foreground">
                  Verdict: {verdictDisplay?.label ?? "Suspicious"}
                </Badge>
                <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                  Scale: {verdictDisplay ? `${verdictDisplay.scalePosition}/5` : "3/5"}
                </Badge>
                <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                  Review priority: {humanizeToken(decisionResult.decision.reviewPriority)}
                </Badge>
                <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                  Lifecycle: {humanizeToken(decisionResult.status)}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CompactMetric label="Confidence" value={toPercent(decisionResult.decision.confidence)} />
                <CompactMetric label="False-Positive Risk" value={toPercent(decisionResult.decision.falsePositiveRisk)} />
                <CompactMetric
                  label="Abstention"
                  value={decisionResult.decision.abstainReason ? humanizeToken(decisionResult.decision.abstainReason) : "Not abstained"}
                />
                <CompactMetric label="Scored At" value={formatTimestamp(decisionResult.decision.scoredAtUtc)} />
              </div>

              <div className="rounded-lg border border-border/60 bg-surface-1/70 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Why this confidence
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {confidenceReasons.map((reason) => (
                    <InlineState
                      key={reason.title}
                      title={reason.title}
                      description={reason.detail}
                      tone={reason.tone}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {summarizeAiVerdict(decisionResult.decision.verdict, "detection")} {summarizeDecisionNarrative(decisionResult)}
              </p>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Decision rationale</p>
                {decisionResult.decision.reasons.length > 0 ? (
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {decisionResult.decision.reasons.map((reason) => (
                      <li key={reason} className="rounded-lg border border-border/60 bg-surface-1/70 px-3 py-2">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <InlineState title="No rationale returned" description="The backend did not return decision rationale lines for this decision." />
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Confidence values are directional estimates, not certainty guarantees.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Internal policy state: {humanizeToken(decisionResult.decision.action)}
              </p>
            </div>
          ) : (
            <InlineState
              title={decisionId ? "Decision still pending" : "Analysis not started"}
              description={
                decisionId
                  ? "The backend has accepted the request, but the decision payload is not ready yet."
                  : "Run the AI decision to load the current verdict, uncertainty, and recommendation state."
              }
            />
          )}
        </motion.article>

        <motion.article className="wb-panel space-y-4" variants={panelMotion}>
          <h3 className="text-sm font-semibold tracking-tight">Operator Action</h3>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Recommended Actions</p>
              <PhrasingOriginBadge diagnostics={actionPlan?.phrasingDiagnostics} />
              {actionPlan ? (
                <>
                  <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                    Execution: {actionExecutionSummary}
                  </Badge>
                  <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                    Approval: {actionApprovalSummary}
                  </Badge>
                </>
              ) : null}
            </div>

            {actionPlan ? (
              <>
                <p className="text-sm text-muted-foreground">{actionPlan.summary || "No action summary returned."}</p>
                {actionPlan.recommendedActions.length === 0 ? (
                  <InlineState title="No recommendations returned" description="The action plan completed without any ranked actions." />
                ) : (
                  <div className="space-y-3">
                    {actionPlan.recommendedActions.map((item) => (
                      <div key={`${item.action}-${item.rank}`} className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold tracking-tight">
                            {item.rank}. {humanizeToken(item.action)}
                          </p>
                          <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                            Score {toPercent(item.score)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{item.rationale}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                            {item.requiresHumanApproval ? "Human approval required" : "Approval not reported"}
                          </Badge>
                          <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                            {humanizeToken(item.executionMode)}
                          </Badge>
                          <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                            Reviewer: {humanizeToken(item.requiredReviewerRole)}
                          </Badge>
                        </div>
                        {item.prerequisites.length > 0 ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Prerequisites: {item.prerequisites.map((entry) => humanizeSentenceToken(entry)).join(", ")}
                          </p>
                        ) : null}
                        {item.cautions.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Cautions: {item.cautions.map((entry) => humanizeSentenceToken(entry)).join(", ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {actionPlan.neverAutoExecutes ? (
                    <Badge variant="secondary" className="border border-emerald-300/20 bg-emerald-500/10 text-emerald-100">
                      Manual execution only
                    </Badge>
                  ) : null}
                  {actionPlan.policyConstrained ? (
                    <Badge variant="secondary" className="border border-amber-300/20 bg-amber-500/10 text-amber-100">
                      Policy constraints applied
                    </Badge>
                  ) : null}
                </div>
              </>
            ) : actionPlanError ? (
              <InlineState title="Action plan degraded" description={actionPlanError} tone="warning" />
            ) : decisionId && actionPlanPendingMessage ? (
              <InlineState title="Waiting for action plan" description={actionPlanPendingMessage} />
            ) : decisionResult && !decisionResult.actionPlanAvailable ? (
              <InlineState title="Action plan unavailable" description="The backend did not return an action plan for this decision." />
            ) : decisionId ? (
              <InlineState title="Action plan pending" description="The backend is still preparing the recommended action list." />
            ) : (
              <InlineState title="Action plan not started" description="Run the AI decision to load ranked operator recommendations." />
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold tracking-tight">Similar Detections</p>
            {similarDetections ? (
              <>
                {similarDetections.items.length === 0 ? (
                  <InlineState
                    title="No similar detections found"
                    description="The backend completed the lookup but did not return matching historical detections."
                  />
                ) : (
                  <div className="space-y-2">
                    {similarDetections.items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold tracking-tight">{item.detectionId}</p>
                          <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                            Similarity {toPercent(item.similarityScore)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {humanizeToken(item.ruleFamily)} | {formatTimestamp(item.observedAtUtc)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reasons: {item.similarityReasons.length > 0 ? item.similarityReasons.join(", ") : "Not reported"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Prior verdicts: {item.priorVerdicts.length > 0 ? item.priorVerdicts.map((entry) => toAiVerdictDisplay(entry).label).join(", ") : "Not reported"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {similarDetections.nextCursor ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void loadMoreSimilar()} disabled={isLoadingMoreSimilar}>
                    {isLoadingMoreSimilar ? "Loading..." : "Load more"}
                  </Button>
                ) : null}
              </>
            ) : similarError ? (
              <InlineState title="Similar detections degraded" description={similarError} tone="warning" />
            ) : decisionResult && !decisionResult.similarDetectionsAvailable ? (
              <InlineState title="Similar detections unavailable" description="No historical similarity surface was returned for this decision." />
            ) : decisionId ? (
              <InlineState title="Similar detections pending" description="The backend is still preparing the similarity lookup." />
            ) : (
              <InlineState title="Similarity lookup not started" description="Run the AI decision to load historical comparisons." />
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold tracking-tight">Audit Trail</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactMetric label="Decision ID" value={decisionId ?? "Not assigned"} />
              <CompactMetric label="Lifecycle Status" value={progressLabel} />
              <CompactMetric label="Scored At" value={formatTimestamp(decisionResult?.decision?.scoredAtUtc)} />
              <CompactMetric
                label="Last Operator Update"
                value={overrideResponse ? humanizeToken(overrideResponse.actionType) : "None"}
                detail={operatorOutcome}
              />
            </div>
          </section>
        </motion.article>

        <motion.article className="wb-panel space-y-4" variants={panelMotion}>
          <h3 className="text-sm font-semibold tracking-tight">Decision Support</h3>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Explanation</p>
              <PhrasingOriginBadge diagnostics={explanation?.phrasingDiagnostics} />
            </div>
            {explanation ? (
              <>
                <p className="text-sm text-muted-foreground">{explanation.summary || "No explanation summary was returned."}</p>
                {explanation.rationale.length > 0 ? (
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {explanation.rationale.map((item) => (
                      <li key={item} className="rounded-lg border border-border/60 bg-surface-1/70 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <InlineState title="No explanation details" description="The backend returned an explanation summary without rationale lines." />
                )}
              </>
            ) : explanationError ? (
              <InlineState title="Explanation degraded" description={explanationError} tone="warning" />
            ) : decisionId && explanationPendingMessage ? (
              <InlineState title="Waiting for explanation" description={explanationPendingMessage} />
            ) : decisionResult && !decisionResult.explanationAvailable ? (
              <InlineState title="Explanation unavailable" description="The backend did not return a separate explanation for this decision." />
            ) : decisionId ? (
              <InlineState title="Explanation pending" description="The backend is still preparing the operator explanation." />
            ) : (
              <InlineState title="Explanation not started" description="Run the AI decision to load the explanation and supporting rationale." />
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold tracking-tight">Safety</p>
            <p className="text-sm text-muted-foreground">{describeSafetyStatus(safetyDiagnostics)}</p>
            {safetyDiagnostics ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CompactMetric label="Contradiction Score" value={toPercent(safetyDiagnostics.contradictionScore)} />
                <CompactMetric label="Enrichment Status" value={humanizeToken(safetyDiagnostics.enrichmentStatus)} />
                <CompactMetric label="Severity Cap" value={safetyDiagnostics.severityCapApplied ? "Applied" : "Not applied"} />
                <CompactMetric label="Max Recommendation" value={humanizeToken(safetyDiagnostics.maxRecommendationSeverity)} />
              </div>
            ) : null}
            {safetyDiagnostics?.missingCriticalFields.length ? (
              <InlineState
                title="Missing critical fields"
                description={safetyDiagnostics.missingCriticalFields.join(", ")}
                tone="warning"
              />
            ) : null}
            {safetyDiagnostics?.degradationReasons.length ? (
              <InlineState
                title="Degradation reasons"
                description={safetyDiagnostics.degradationReasons.map((item) => humanizeSentenceToken(item)).join(", ")}
                tone="warning"
              />
            ) : null}
            {!safetyDiagnostics ? (
              <InlineState
                title="Safety diagnostics unavailable"
                description="The backend did not return machine-readable safety diagnostics for this decision."
              />
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Evidence Summary</p>
              <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                Positive {evidenceUsedPositive.length}
              </Badge>
              <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                Conflicting {contradictoryEvidence.length}
              </Badge>
              <Badge variant="secondary" className="border border-border/70 bg-surface-1/75 text-muted-foreground">
                Missing requests {missingEvidence.length}
              </Badge>
            </div>

            {evidenceError ? (
              <InlineState title="Evidence summary degraded" description={evidenceError} tone="warning" />
            ) : decisionId && !evidenceSources && decisionResult?.evidenceSourcesAvailable ? (
              <InlineState title="Evidence summary pending" description="The backend is still preparing the evidence source list." />
            ) : decisionResult && !decisionResult.evidenceSourcesAvailable && missingEvidence.length === 0 ? (
              <InlineState title="Evidence summary unavailable" description="The backend did not return a dedicated evidence source list for this decision." />
            ) : evidenceSources || missingEvidence.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100">Evidence that supports the verdict</p>
                  {evidenceUsedPositive.length === 0 ? (
                    <InlineState title="No supporting evidence reported" description="No positive evidence entries were returned." />
                  ) : (
                    <div className="space-y-2">
                      {evidenceUsedPositive.map((item) => (
                        <EvidenceCard key={item.id} item={item} tone="positive" />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100">Evidence that weakens or conflicts</p>
                  {contradictoryEvidence.length === 0 && evidenceUsedNegative.length === 0 && evidenceUsedOther.length === 0 ? (
                    <InlineState title="No weakening evidence reported" description="No contradictory or negative evidence entries were returned." />
                  ) : (
                    <div className="space-y-2">
                      {contradictoryEvidence.map((item) => (
                        <EvidenceCard key={item.id} item={item} tone="danger" />
                      ))}
                      {[...evidenceUsedNegative, ...evidenceUsedOther].map((item) => (
                        <EvidenceCard key={item.id} item={item} tone="warning" />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Missing evidence requests</p>
                  {missingEvidence.length === 0 ? (
                    <InlineState title="No follow-up requests reported" description="The decision, explanation, and action plan did not request more evidence." />
                  ) : (
                    <div className="space-y-2">
                      {missingEvidence.map((item) => (
                        <div key={`${item.request}-${item.source}`} className="rounded-lg border border-border/70 bg-surface-2/70 p-3">
                          <p className="text-sm font-medium text-foreground">{item.request}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.source}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <InlineState title="Evidence summary not started" description="Run the AI decision to load evidence use, conflicts, and missing-evidence requests." />
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold tracking-tight">Decision Provenance</p>
            {decisionResult?.decision?.provenance?.length ? (
              <div className="space-y-2">
                {decisionResult.decision.provenance.map((item, index) => (
                  <div
                    key={`${item.source}-${item.key}-${index}`}
                    className="rounded-lg border border-border/60 bg-surface-1/70 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{humanizeToken(item.source)}</p>
                      <p className="text-xs text-muted-foreground">{humanizeToken(item.key)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Evidence ID: {item.evidenceId ?? "Not reported"} | Citation: {item.citationRef ?? "Not reported"}
                    </p>
                  </div>
                ))}
              </div>
            ) : decisionResult ? (
              <InlineState title="Decision provenance unavailable" description="No machine-readable provenance items were returned for this decision." />
            ) : (
              <InlineState title="Decision provenance not started" description="Run the AI decision to load machine-readable provenance for the verdict." />
            )}
          </section>
        </motion.article>

        <motion.article className="wb-panel space-y-4 xl:col-span-2" variants={panelMotion}>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Analyst Decision</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Record whether you accept, reject, modify, or defer the recommended handling for this detection.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <Button type="button" size="sm" variant={overrideAction === "accept" ? "default" : "outline"} onClick={() => setOverrideAction("accept")}>
              Accept
            </Button>
            <Button type="button" size="sm" variant={overrideAction === "reject" ? "default" : "outline"} onClick={() => setOverrideAction("reject")}>
              Reject
            </Button>
            <Button type="button" size="sm" variant={overrideAction === "modify" ? "default" : "outline"} onClick={() => setOverrideAction("modify")}>
              Modify
            </Button>
            <Button type="button" size="sm" variant={overrideAction === "defer" ? "default" : "outline"} onClick={() => setOverrideAction("defer")}>
              Defer
            </Button>
          </div>

          <InlineState title={`Selected action: ${humanizeToken(overrideAction)}`} description={overrideActionHelp(overrideAction)} />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Analyst reason</p>
              <Input
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder={overrideAction === "defer" ? "Why is follow-up required?" : "Why are you taking this action?"}
              />
            </div>
            {(overrideAction === "reject" || overrideAction === "modify") ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Override verdict</p>
                <select
                  aria-label="Override verdict"
                  value={overrideVerdict}
                  onChange={(event) => setOverrideVerdict(event.target.value)}
                  className="h-9 w-full rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                >
                  <option value="">Select verdict</option>
                  {AI_VERDICT_SCALE_OPTIONS.map((option) => (
                    <option key={option.level} value={option.level}>
                      {option.scalePosition}. {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <InlineState
                title={overrideAction === "accept" ? "Closure behavior" : "Follow-up behavior"}
                description={
                  overrideAction === "accept"
                    ? "This records analyst acceptance and closes the current decision."
                    : "This keeps the decision open for follow-up without marking it as final."
                }
              />
            )}
          </div>

          {(overrideAction === "modify" || overrideAction === "defer") ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {overrideAction === "modify" ? "Modified decision notes" : "Follow-up notes"}
              </p>
              <Textarea
                value={overrideNotes}
                onChange={(event) => setOverrideNotes(event.target.value)}
                placeholder={
                  overrideAction === "modify"
                    ? "Explain how the analyst decision differs from the recommendation."
                    : "Record the follow-up plan, owner, or next shift handoff."
                }
                className="min-h-24"
              />
            </div>
          ) : null}

          {overrideRequirements.length > 0 ? (
            <InlineState
              title="Required before submit"
              description={overrideRequirements.join(" ")}
              tone="warning"
            />
          ) : null}
          {overrideError ? <InlineState title="Analyst decision failed" description={overrideError} tone="danger" /> : null}
          {overrideResponse ? (
            <InlineState
              title="Analyst decision saved"
              description={`Submitted ${humanizeSentenceToken(overrideResponse.actionType)} with new status ${humanizeSentenceToken(overrideResponse.newStatus)} at ${formatTimestamp(overrideResponse.submittedAtUtc)}.`}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => void submitOverrideOrClosure()} disabled={!canSubmitOverride}>
              {isSubmittingOverride ? "Submitting..." : "Submit operator action"}
            </Button>
            {!decisionId ? (
              <p className="text-xs text-muted-foreground">Run the AI decision first to enable analyst decision entry.</p>
            ) : null}
          </div>
        </motion.article>
      </div>
    </motion.section>
  )
}

