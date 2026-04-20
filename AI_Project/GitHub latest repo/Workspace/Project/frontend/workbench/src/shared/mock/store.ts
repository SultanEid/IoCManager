import type { MockStoreState } from "@/shared/domain/cti"
import { createScenarioState } from "@/shared/mock/scenarios"

let state: MockStoreState = createScenarioState()

export function getMockState() {
  return state
}

export function resetMockState() {
  state = createScenarioState()
}

export function withMockState<T>(mutation: (current: MockStoreState) => T): T {
  return mutation(state)
}

export function nextMockTimestamp(current = state) {
  const next = new Date(Date.parse(current.meta.referenceUtc) + current.meta.sequence * current.meta.tickMinutes * 60 * 1000)
  current.meta.sequence += 1
  return next.toISOString()
}
