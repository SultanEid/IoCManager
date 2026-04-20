import { describe, expect, it, vi } from "vitest"
import AdminCompatibilityPage from "@/app/(workbench)/admin/page"

const hoisted = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: hoisted.redirect,
}))

describe("AdminCompatibilityPage", () => {
  it("redirects the legacy admin route to canonical settings", () => {
    hoisted.redirect.mockReset()
    AdminCompatibilityPage()
    expect(hoisted.redirect).toHaveBeenCalledWith("/settings")
  })
})
