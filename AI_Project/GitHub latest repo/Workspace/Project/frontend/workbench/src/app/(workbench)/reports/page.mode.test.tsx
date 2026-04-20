import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ReportsPage from "@/app/(workbench)/reports/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => {
  const state = {
    pathname: "/reports",
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
    reset(nextPathname = "/reports") {
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
const gatewayState = vi.hoisted(() => ({
  isMockMode: false,
  isModeConfigured: true,
  isAspNetMode: true,
}))
const mockedGateway = vi.hoisted(() => ({
  listReports: vi.fn(),
  listTargetServers: vi.fn(),
}))

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

vi.mock("@/shared/gateway", () => ({
  gateway: mockedGateway,
  get isMockMode() {
    return gatewayState.isMockMode
  },
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
  get isAspNetMode() {
    return gatewayState.isAspNetMode
  },
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ReportsPage mode behavior", () => {
  beforeEach(() => {
    gatewayState.isMockMode = false
    gatewayState.isModeConfigured = true
    gatewayState.isAspNetMode = true
    navigation.reset("/reports")
    mockedGateway.listReports.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    })
    mockedGateway.listTargetServers.mockResolvedValue([])
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "servers") {
        return {
          isLoading: false,
          isError: false,
          data: [],
        }
      }

      return {
        isLoading: false,
        isError: false,
        data: {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
        },
      }
    })
  })

  it("renders contract-backed empty state in normal mode", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Search generated reporting artifacts without leaving the workbench")).toBeInTheDocument()
    expect(screen.getByText("No reports available")).toBeInTheDocument()
    expect(screen.queryByText("Design / Demo Mode")).not.toBeInTheDocument()
  })

  it("keeps demo path active when demo mode is enabled", () => {
    gatewayState.isMockMode = true
    gatewayState.isAspNetMode = false

    render(<ReportsPage />)

    expect(screen.getByText("No reports available")).toBeInTheDocument()
    expect(screen.getByText("Design / Demo Mode")).toBeInTheDocument()
  })
})
