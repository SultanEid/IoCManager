import { describe, expect, it } from "vitest"
import {
  feedbackReviewPriorityDisplay,
  feedbackVerdictDisplay,
  formatFeedbackAuxiliarySummary,
  normalizeFeedbackVerdict,
} from "@/shared/feedback-taxonomy"

describe("feedback taxonomy mapping", () => {
  it("covers all canonical verdict display mappings", () => {
    expect(feedbackVerdictDisplay("benign")).toMatchObject({ label: "Benign", tone: "success", bucket: "dissenting" })
    expect(feedbackVerdictDisplay("likely_benign")).toMatchObject({ label: "Likely Benign", tone: "success", bucket: "dissenting" })
    expect(feedbackVerdictDisplay("suspicious")).toMatchObject({ label: "Suspicious", tone: "warning", bucket: "supportive" })
    expect(feedbackVerdictDisplay("likely_malicious")).toMatchObject({ label: "Likely Malicious", tone: "warning", bucket: "supportive" })
    expect(feedbackVerdictDisplay("malicious")).toMatchObject({ label: "Malicious", tone: "warning", bucket: "supportive" })
    expect(feedbackVerdictDisplay("false_positive")).toMatchObject({ label: "False Positive", tone: "default", bucket: "dissenting" })
    expect(feedbackVerdictDisplay("insufficient_evidence")).toMatchObject({ label: "Insufficient Evidence", tone: "warning", bucket: "neutral" })
    expect(feedbackVerdictDisplay("stale_or_revoked")).toMatchObject({ label: "Stale or Revoked", tone: "default", bucket: "dissenting" })
  })

  it("normalizes legacy aliases into canonical verdicts", () => {
    expect(normalizeFeedbackVerdict("ConfirmedThreat")).toBe("malicious")
    expect(normalizeFeedbackVerdict("true_positive")).toBe("malicious")
    expect(normalizeFeedbackVerdict("NeedsMoreEvidence")).toBe("insufficient_evidence")
  })

  it("maps review priorities to display labels and tones", () => {
    expect(feedbackReviewPriorityDisplay("low")).toMatchObject({ label: "Low", tone: "default" })
    expect(feedbackReviewPriorityDisplay("medium")).toMatchObject({ label: "Medium", tone: "default" })
    expect(feedbackReviewPriorityDisplay("high")).toMatchObject({ label: "High", tone: "warning" })
    expect(feedbackReviewPriorityDisplay("critical")).toMatchObject({ label: "Critical", tone: "warning" })
  })

  it("formats auxiliary booleans consistently", () => {
    const summary = formatFeedbackAuxiliarySummary({
      shouldPromoteToIndicator: true,
      shouldSuppress: false,
      shouldAllowlist: false,
      shouldEscalate: true,
    })

    expect(summary).toContain("Promote indicator: yes")
    expect(summary).toContain("Suppress: no")
    expect(summary).toContain("Allowlist: no")
    expect(summary).toContain("Escalate: yes")
  })
})
