import { describe, expect, it, vi } from "vitest"
import LegacyCaseRuleProposalsPage from "@/app/(workbench)/cases/[caseId]/rule-proposals/page"

const mockedRedirect = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  redirect: mockedRedirect,
}))

describe("LegacyCaseRuleProposalsPage", () => {
  it("redirects legacy rule-proposals paths to alert detail", () => {
    LegacyCaseRuleProposalsPage({ params: { caseId: "11111111-1111-4111-8111-111111111111" } })
    expect(mockedRedirect).toHaveBeenCalledWith("/alerts/11111111-1111-4111-8111-111111111111")
  })
})
