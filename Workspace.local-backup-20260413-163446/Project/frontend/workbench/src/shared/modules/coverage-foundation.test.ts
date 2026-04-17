import { describe, expect, it } from "vitest"
import {
  buildComparedTiers,
  buildPainGapRollup,
  createFreshnessMetric,
  freshnessStateFromMinutes,
  getCoverageVm,
} from "@/shared/modules/coverage-foundation"

describe("coverage foundation", () => {
  it("derives compare deltas for matched tiers across selected scopes", () => {
    const vm = getCoverageVm()
    const baseline = vm.profilesByTargetId["env-global-prod"]
    const comparison = vm.profilesByTargetId["env-corp-it"]
    const compared = buildComparedTiers(baseline.tiers, comparison.tiers, "readiness")
    const ttps = compared.find((entry) => entry.tier.id === "ttps")
    const baselineTier = baseline.tiers.find((tier) => tier.id === "ttps")
    const comparisonTier = comparison.tiers.find((tier) => tier.id === "ttps")

    expect(ttps).toBeDefined()
    expect(baselineTier).toBeDefined()
    expect(comparisonTier).toBeDefined()
    expect(ttps?.delta.score).toBe((baselineTier?.readiness.score ?? 0) - (comparisonTier?.readiness.score ?? 0))
    expect(ttps?.delta.count).toBe((baselineTier?.readiness.count ?? 0) - (comparisonTier?.readiness.count ?? 0))
  })

  it("maps freshness minutes into stable labels and states", () => {
    expect(freshnessStateFromMinutes(50)).toBe("Fresh")
    expect(freshnessStateFromMinutes(180)).toBe("Aging")
    expect(freshnessStateFromMinutes(400)).toBe("Stale")

    expect(createFreshnessMetric(45).label).toBe("45m")
    expect(createFreshnessMetric(120).label).toBe("2h")
    expect(createFreshnessMetric(181).label).toBe("3h 1m")
  })

  it("keeps weak coverage and missing data counts separated", () => {
    const vm = getCoverageVm()
    const baseline = vm.profilesByTargetId["env-global-prod"]
    const rollup = buildPainGapRollup(baseline.tiers, "active")
    const expectedWeak = baseline.tiers.reduce((sum, tier) => sum + tier.weakCoverageGaps.length, 0)
    const expectedMissing = baseline.tiers.reduce((sum, tier) => sum + tier.missingDataGaps.length, 0)

    expect(rollup.weakCoverageCount).toBe(expectedWeak)
    expect(rollup.missingDataCount).toBe(expectedMissing)
  })
})
