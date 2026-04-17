import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RouteGuard } from "@/components/workbench/route-guard"

const replace = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/queue",
  useRouter: () => ({ replace }),
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from "@/shared/auth/auth-provider"

describe("RouteGuard", () => {
  beforeEach(() => {
    replace.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("redirects when no session", async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
    )

    expect(screen.getByText("Checking session...")).toBeInTheDocument()
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/auth?next=%2Fqueue")
    })
  })

  it("renders children when session exists", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {
        token: "token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "u1",
        username: "analyst",
        roles: ["Analyst"],
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
    )

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })

  it("renders permission-restricted state when required role is missing", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {
        token: "token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "u1",
        username: "analyst",
        roles: ["Analyst"],
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <RouteGuard requiredRoles={["Admin"]}>
        <div>Protected Content</div>
      </RouteGuard>,
    )

    expect(screen.getByText("Permission restricted")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("renders children when required role is present", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {
        token: "token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "u1",
        username: "admin",
        roles: ["Admin"],
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <RouteGuard requiredRoles={["Admin"]}>
        <div>Protected Content</div>
      </RouteGuard>,
    )

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })
})
