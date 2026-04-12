import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/shared/api/error"
import { ServerDiscoveryPage } from "@/components/workbench/servers/server-discovery-page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }),
    useMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
  }
})

vi.mock("@/shared/gateway", () => ({
  gateway: {
    queueDiscoveryRun: vi.fn(),
    promoteDiscoveredHost: vi.fn(),
  },
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "analyst-1",
      username: "analyst-1",
      roles: ["Analyst"],
    },
  }),
}))

function success(data: unknown) {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
  }
}

function failure(error: unknown) {
  return {
    isLoading: false,
    isError: true,
    data: null,
    error,
  }
}

describe("ServerDiscoveryPage states", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders empty-before-first-run state without synthetic discovery data", () => {
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? String(queryKey[1]) : ""
      if (key === "subnets") {
        return success([
          {
            id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
            networkId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
            name: "App Tier",
            cidrBlock: "10.10.1.0/24",
            gateway: "10.10.1.1",
            createdAtUtc: "2026-04-09T10:00:00Z",
            updatedAtUtc: "2026-04-09T10:00:00Z",
          },
        ])
      }

      if (key === "discovery-runs") {
        return success([])
      }

      if (key === "discovered-hosts") {
        return success([])
      }

      return success([])
    })

    render(<ServerDiscoveryPage surface="servers" />)

    expect(screen.getByText("No discovery runs yet")).toBeInTheDocument()
    expect(screen.getByText("No discovered hosts")).toBeInTheDocument()
  })

  it("renders dependency-down state when subnet contract fails", () => {
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? String(queryKey[1]) : ""
      if (key === "subnets") {
        return failure(
          new ApiError("Dependency Temporarily Unavailable", 503, null, {
            title: "Dependency Temporarily Unavailable",
            detail: "Database unavailable",
            dependency: "database",
            dependencyType: "required",
            condition: "temporarily_unavailable",
            retryable: true,
          }),
        )
      }

      return success([])
    })

    render(<ServerDiscoveryPage surface="subnets" />)

    expect(screen.getByText("Dependency down")).toBeInTheDocument()
  })
})
