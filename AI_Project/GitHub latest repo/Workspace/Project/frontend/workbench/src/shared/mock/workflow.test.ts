import { describe, expect, it } from "vitest"
import { createScenarioState } from "@/shared/mock/scenarios"
import {
  advanceRolloutStage,
  createRuleProposal,
  recordCanaryObservation,
  reviewRuleProposal,
  simulateRuleProposal,
  triggerRollback,
} from "@/shared/mock/workflow"

describe("mock workflow state machine", () => {
  it("appends audit events and updates workflow entities across transitions", () => {
    const state = createScenarioState()
    const caseId = state.indices.caseIds[0]
    const beforeEvents = state.events.length

    const proposal = createRuleProposal(state, {
      caseId,
      proposalName: "Credential replay hardening",
      ruleFamily: "sigma",
      ruleBody: "selection: credential replay chain",
      proposedVersion: "v2.0.0",
      proposedByUserId: "analyst-1",
      rationale: "Escalate containment readiness.",
      policyRiskScore: 0.44,
    })

    expect(proposal.caseId).toBe(caseId)
    expect(state.events.length).toBe(beforeEvents + 1)

    const reviewed = reviewRuleProposal(state, proposal.id, {
      decision: "accept",
      reviewerUserId: "lead-1",
      reviewReason: "Approved for simulation",
    })
    expect(reviewed.status).toBe("Accepted")
    expect(state.events.length).toBe(beforeEvents + 2)

    const simulation = simulateRuleProposal(state, proposal.id, {
      targetEnvironment: "production",
      actorUserId: "analyst-1",
      notes: "Simulate before canary promotion.",
    })
    expect(simulation.rolloutPlan.currentStage).toBe("shadow")
    expect(state.events.length).toBe(beforeEvents + 3)

    const canary = advanceRolloutStage(state, simulation.rolloutPlan.id, {
      stage: "canary",
      actorUserId: "lead-1",
      reason: "Manual promotion into canary",
    })
    expect(canary.currentStage).toBe("canary")
    expect(state.events.length).toBe(beforeEvents + 4)

    const observed = recordCanaryObservation(state, simulation.rolloutPlan.id, {
      observedNoise: simulation.rollbackPlan.predictedNoiseThreshold + 0.04,
      analystAcceptedCount: 7,
      analystReviewedCount: 10,
      actorUserId: "analyst-1",
    })
    expect(observed.observedNoise).not.toBeNull()
    expect(state.events.length).toBe(beforeEvents + 5)

    const rolledBack = triggerRollback(state, simulation.rollbackPlan.id, {
      actorUserId: "lead-1",
      reason: "Noise exceeded threshold",
      observedNoise: observed.observedNoise ?? undefined,
    })
    expect(rolledBack.isTriggered).toBe(true)
    expect(state.events.length).toBe(beforeEvents + 6)
    expect(state.entities.cases[caseId].status).toBe("Investigating")
  })
})
