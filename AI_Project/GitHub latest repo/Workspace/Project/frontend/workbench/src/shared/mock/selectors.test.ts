import { describe, expect, it } from "vitest"
import { createScenarioState } from "@/shared/mock/scenarios"
import { selectCaseDetail, selectProblematicQueue } from "@/shared/mock/selectors"

describe("mock selectors", () => {
  it("produces deterministic queue ordering and scores", () => {
    const stateA = createScenarioState()
    const stateB = createScenarioState()

    const queueA = selectProblematicQueue(stateA).queue
    const queueB = selectProblematicQueue(stateB).queue

    expect(queueA.map((item) => item.caseId)).toEqual(queueB.map((item) => item.caseId))
    expect(queueA.map((item) => item.triageScore)).toEqual(queueB.map((item) => item.triageScore))
  })

  it("builds case detail with guardrails and timeline", () => {
    const state = createScenarioState()
    const caseId = state.indices.caseIds[0]

    const detail = selectCaseDetail(state, caseId)
    expect(detail.caseItem.id).toBe(caseId)
    expect(detail.policyGuardrails.length).toBeGreaterThan(0)
    expect(detail.activityTimeline.length).toBeGreaterThan(0)
    expect(detail.nextBestEvidence.length).toBeGreaterThan(0)
  })
})
