import { describe, expect, it, vi } from "vitest"
import CaseDetailCompatibilityPage from "@/app/(workbench)/cases/[caseId]/page"

const mockedRedirect = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  redirect: mockedRedirect,
}))

describe("CaseDetailCompatibilityPage", () => {
  it("redirects legacy case detail routes to alert detail", () => {
    CaseDetailCompatibilityPage({ params: { caseId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69" } })
    expect(mockedRedirect).toHaveBeenCalledWith("/alerts/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
  })
})
