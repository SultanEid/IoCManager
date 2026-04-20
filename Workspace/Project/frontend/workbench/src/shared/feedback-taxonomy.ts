import type { FeedbackReviewPriority, FeedbackVerdict } from "@/shared/api/schemas"

type UiTone = "default" | "success" | "warning"
type VerdictBucket = "supportive" | "dissenting" | "neutral"

type VerdictDisplay = {
  label: string
  tone: UiTone
  bucket: VerdictBucket
}

type PriorityDisplay = {
  label: string
  tone: UiTone
}

const VERDICT_DISPLAY: Record<FeedbackVerdict, VerdictDisplay> = {
  benign: { label: "Benign", tone: "success", bucket: "dissenting" },
  likely_benign: { label: "Likely Benign", tone: "success", bucket: "dissenting" },
  suspicious: { label: "Suspicious", tone: "warning", bucket: "supportive" },
  likely_malicious: { label: "Likely Malicious", tone: "warning", bucket: "supportive" },
  malicious: { label: "Malicious", tone: "warning", bucket: "supportive" },
  false_positive: { label: "False Positive", tone: "default", bucket: "dissenting" },
  insufficient_evidence: { label: "Insufficient Evidence", tone: "warning", bucket: "neutral" },
  stale_or_revoked: { label: "Stale or Revoked", tone: "default", bucket: "dissenting" },
}

const PRIORITY_DISPLAY: Record<FeedbackReviewPriority, PriorityDisplay> = {
  low: { label: "Low", tone: "default" },
  medium: { label: "Medium", tone: "default" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "warning" },
}

const VERDICT_ALIASES: Record<string, FeedbackVerdict> = {
  benign: "benign",
  likelybenign: "likely_benign",
  suspicious: "suspicious",
  likelymalicious: "likely_malicious",
  malicious: "malicious",
  falsepositive: "false_positive",
  insufficientevidence: "insufficient_evidence",
  staleorrevoked: "stale_or_revoked",
  confirmedthreat: "malicious",
  confirmedmalicious: "malicious",
  truepositive: "malicious",
  escalated: "malicious",
  needsmoreevidence: "insufficient_evidence",
}

function normalize(value: string) {
  return value.replace(/\s|_|-/g, "").toLowerCase()
}

export function normalizeFeedbackVerdict(verdict: string): FeedbackVerdict | null {
  return VERDICT_ALIASES[normalize(verdict)] ?? null
}

export function normalizeFeedbackReviewPriority(priority: string): FeedbackReviewPriority | null {
  const normalized = normalize(priority)
  if (normalized === "low") {
    return "low"
  }
  if (normalized === "medium") {
    return "medium"
  }
  if (normalized === "high") {
    return "high"
  }
  if (normalized === "critical") {
    return "critical"
  }

  return null
}

export function feedbackVerdictDisplay(verdict: string): VerdictDisplay {
  const normalized = normalizeFeedbackVerdict(verdict)
  if (!normalized) {
    return { label: verdict, tone: "default", bucket: "neutral" }
  }

  return VERDICT_DISPLAY[normalized]
}

export function feedbackReviewPriorityDisplay(priority: string): PriorityDisplay {
  const normalized = normalizeFeedbackReviewPriority(priority)
  if (!normalized) {
    return { label: priority, tone: "default" }
  }

  return PRIORITY_DISPLAY[normalized]
}

export function formatFeedbackAuxiliarySummary(input: {
  shouldPromoteToIndicator: boolean
  shouldSuppress: boolean
  shouldAllowlist: boolean
  shouldEscalate: boolean
}) {
  return [
    `Promote indicator: ${input.shouldPromoteToIndicator ? "yes" : "no"}`,
    `Suppress: ${input.shouldSuppress ? "yes" : "no"}`,
    `Allowlist: ${input.shouldAllowlist ? "yes" : "no"}`,
    `Escalate: ${input.shouldEscalate ? "yes" : "no"}`,
  ].join(" · ")
}
