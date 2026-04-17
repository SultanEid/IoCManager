import { describe, expect, it, vi } from "vitest"
import ProblematicQueueCompatibilityPage from "@/app/(workbench)/problematic-queue/page"

const hoisted = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: hoisted.redirect,
}))

describe("ProblematicQueueCompatibilityPage", () => {
  it("redirects legacy problematic queue route to canonical triage queue", () => {
    hoisted.redirect.mockReset()
    ProblematicQueueCompatibilityPage()
    expect(hoisted.redirect).toHaveBeenCalledWith("/queue")
  })
})
