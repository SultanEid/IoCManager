import { describe, expect, it, vi } from "vitest"
import SettingsAdminCompatibilityPage from "@/app/(workbench)/settings-admin/page"

const hoisted = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: hoisted.redirect,
}))

describe("SettingsAdminCompatibilityPage", () => {
  it("redirects legacy settings admin route to canonical admin", () => {
    hoisted.redirect.mockReset()
    SettingsAdminCompatibilityPage()
    expect(hoisted.redirect).toHaveBeenCalledWith("/settings")
  })
})
