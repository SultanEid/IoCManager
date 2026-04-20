import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/shared/api/error"
import { ManagedServerInventoryPage } from "@/components/workbench/servers/managed-server-inventory-page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => {
  const state = {
    pathname: "/servers",
    searchParams: new URLSearchParams(),
    push: vi.fn<(url: string) => void>(),
    replace: vi.fn<(url: string) => void>(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
    redirect: vi.fn<(url: string) => void>(),
    setUrl(url: string) {
      const nextUrl = new URL(url, "https://workbench.test")
      state.pathname = nextUrl.pathname
      state.searchParams = new URLSearchParams(nextUrl.search)
    },
    reset(nextPathname = "/servers") {
      state.pathname = nextPathname
      state.searchParams = new URLSearchParams()
      state.push.mockClear()
      state.replace.mockClear()
      state.back.mockClear()
      state.forward.mockClear()
      state.refresh.mockClear()
      state.prefetch.mockClear()
      state.redirect.mockClear()
    },
  }

  state.push.mockImplementation((url) => state.setUrl(url))
  state.replace.mockImplementation((url) => state.setUrl(url))

  return state
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    back: navigation.back,
    forward: navigation.forward,
    refresh: navigation.refresh,
    prefetch: navigation.prefetch,
  }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
  redirect: navigation.redirect,
}))

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

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      username: "lead-1",
      roles: ["Lead"],
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

describe("ManagedServerInventoryPage states", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    navigation.reset("/servers")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: null,
      error: null,
    })

    render(<ManagedServerInventoryPage />)
    expect(screen.getByText(/Loading managed server inventory/)).toBeInTheDocument()
  })

  it("renders empty state without frontend-owned fleet cards", () => {
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

      if (key === "scanners") {
        return success([])
      }

      if (key === "managed-servers") {
        return success({
          servers: [],
          totalServers: 0,
          unhealthyServers: 0,
          unreachableServers: 0,
          staleContactServers: 0,
          page: 1,
          pageSize: 20,
        })
      }

      return success([])
    })

    render(<ManagedServerInventoryPage />)

    expect(screen.getByText("No managed servers")).toBeInTheDocument()
    expect(screen.queryByText("Coverage")).not.toBeInTheDocument()
  })

  it("updates table rows deterministically when status filter changes", () => {
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

      if (key === "scanners") {
        return success([])
      }

      if (key === "managed-servers") {
        const filters = Array.isArray(queryKey) ? (queryKey[2] as { status?: string }) : {}
        if (filters?.status === "Offline") {
          return success({
            servers: [
              {
                id: "38f5280d-43df-45cb-9657-8c31476f38af",
                subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
                hostname: "srv-offline-01",
                ipAddress: "10.10.1.41",
                operatingSystem: "Linux",
                environment: "prod",
                status: "Active",
                connectivityStatus: "Offline",
                lastHeartbeatUtc: null,
                lastContactUtc: null,
                connectionProtocol: null,
                connectionHost: null,
                connectionPort: null,
                connectionAuthMode: null,
                connectionUsername: null,
                hasConnectionSecret: false,
                connectionSecretUpdatedAtUtc: null,
                scannerAssignments: [],
                scannerCapabilities: [],
                createdAtUtc: "2026-04-10T08:00:00Z",
                updatedAtUtc: "2026-04-10T08:00:00Z",
              },
            ],
            totalServers: 1,
            unhealthyServers: 1,
            unreachableServers: 1,
            staleContactServers: 1,
            page: 1,
            pageSize: 20,
          })
        }

        return success({
          servers: [
            {
              id: "ab6c7ffd-df85-4f26-94dc-38fb8f95c51e",
              subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
              hostname: "srv-online-01",
              ipAddress: "10.10.1.40",
              operatingSystem: "Windows",
              environment: "prod",
              status: "Active",
              connectivityStatus: "Online",
              lastHeartbeatUtc: "2026-04-10T08:00:00Z",
              lastContactUtc: "2026-04-10T08:01:00Z",
              connectionProtocol: null,
              connectionHost: null,
              connectionPort: null,
              connectionAuthMode: null,
              connectionUsername: null,
              hasConnectionSecret: false,
              connectionSecretUpdatedAtUtc: null,
              scannerAssignments: [],
              scannerCapabilities: [],
              createdAtUtc: "2026-04-10T08:00:00Z",
              updatedAtUtc: "2026-04-10T08:00:00Z",
            },
          ],
          totalServers: 1,
          unhealthyServers: 0,
          unreachableServers: 0,
          staleContactServers: 0,
          page: 1,
          pageSize: 20,
        })
      }

      return success([])
    })

    const view = render(<ManagedServerInventoryPage />)
    expect(screen.getByText("srv-online-01")).toBeInTheDocument()
    expect(screen.queryByText("srv-offline-01")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Offline" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    view.rerender(<ManagedServerInventoryPage />)

    expect(screen.getByText("srv-offline-01")).toBeInTheDocument()
    expect(screen.queryByText("srv-online-01")).not.toBeInTheDocument()
  })

  it("renders dependency-down fallback from backend classification", () => {
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? String(queryKey[1]) : ""
      if (key === "subnets") {
        return success([])
      }
      if (key === "scanners") {
        return success([])
      }
      if (key === "managed-servers") {
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

    render(<ManagedServerInventoryPage />)
    expect(screen.getByText("Dependency down")).toBeInTheDocument()
  })
})
