import { describe, expect, it, vi } from "vitest"
import IoCRegistryPage from "@/app/(workbench)/ioc-registry/page"

const mockedRedirect = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  redirect: mockedRedirect,
}))

describe("IoCRegistryPage", () => {
  it("redirects legacy registry route to reporting", () => {
    IoCRegistryPage()
    expect(mockedRedirect).toHaveBeenCalledWith("/reporting")
  })
})
