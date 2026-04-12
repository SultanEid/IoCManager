import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CaseDecisionPanel } from "@/components/workbench/case-decision-panel"
import type { CaseDetailVM } from "@/shared/gateway/types"

const detail: CaseDetailVM = {
  caseItem: {
    id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
    title: "Case",
    summary: "Summary",
    priority: "High",
    status: "Open",
    ownerUserId: "u1",
    approvalTierRequired: "Lead",
    createdAtUtc: "2026-03-13T00:00:00Z",
    updatedAtUtc: "2026-03-13T00:00:00Z",
  },
  latestDecision: null,
  latestDeployment: null,
  scoreAxes: [],
  recommendedAction: "deploy_canary",
  decisionState: "Proposed",
  approvalTier: "Lead",
  rolloutPlan: "Shadow then canary",
  rollbackPlan: "Rollback if FP exceeds threshold",
  topEvidence: [
    {
      id: "e1",
      evidenceType: "dns",
      sourceSystem: "DNS",
      confidence: 0.92,
      collectedAtUtc: "2026-03-13T00:00:00Z",
      summary: "DNS report with high confidence",
    },
  ],
  graphNeighbors: [],
  similarHistoricalCases: [],
  nextBestEvidence: [],
  activityTimeline: [],
  linkedRules: [],
  linkedReports: [],
  policyGuardrails: [
    {
      id: "g1",
      label: "Human approval gate (Lead)",
      status: "enforced",
      rationale: "Lead approval required.",
      owner: "Policy engine",
    },
  ],
  isSimulated: true,
}

describe("CaseDecisionPanel", () => {
  it("shows recommended action, decision state, approval tier, and policy guardrails", () => {
    render(<CaseDecisionPanel detail={detail} />)

    expect(screen.getByTestId("recommended-action")).toHaveTextContent("deploy canary")
    expect(screen.getByTestId("decision-state")).toHaveTextContent("Proposed")
    expect(screen.getByTestId("approval-tier")).toHaveTextContent("Lead")
    expect(screen.getByTestId("policy-guardrails")).toHaveTextContent("Human approval gate (Lead)")
  })
})
