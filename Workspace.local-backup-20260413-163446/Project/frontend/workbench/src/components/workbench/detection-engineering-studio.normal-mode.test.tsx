import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DetectionEngineeringStudio } from "@/components/workbench/detection-engineering-studio"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {},
  isMockMode: false,
  isModeConfigured: true,
  isAspNetMode: true,
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      token: "token",
      expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "u1",
      username: "analyst",
      roles: ["Analyst"],
    },
    loading: false,
  }),
}))

describe("DetectionEngineeringStudio normal mode", () => {
  it("renders explicit read-only reasons for disabled controls", () => {
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? queryKey.join(":") : ""
      if (key.includes("alerts")) {
        return { isLoading: false, isError: false, data: [] }
      }
      return { isLoading: false, isError: false, data: [] }
    })

    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    expect(screen.getByText("Read-only in normal mode")).toBeInTheDocument()
    expect(screen.getByText("Create Proposal (disabled)")).toBeInTheDocument()
    expect(screen.getByText("Reason: missing backend support for this page-level action.")).toBeInTheDocument()
  })
})
