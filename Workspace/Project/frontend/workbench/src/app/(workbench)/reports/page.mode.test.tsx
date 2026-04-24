import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  generateReport: vi.fn(),
  deleteReport: vi.fn(),
}))
const mockedRequestBlob = vi.hoisted(() => vi.fn())

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

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      username: "lead",
    },
  }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/api/client", () => ({
  requestBlob: mockedRequestBlob,
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
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:report-preview"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    })
    mockedRequestBlob.mockResolvedValue({
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      fileName: "report.pdf",
    })
  })

  it("renders contract-backed empty state in normal mode", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Report workspace")).toBeInTheDocument()
    expect(screen.getByText("No saved reports")).toBeInTheDocument()
  })

  it("keeps the saved-library empty state in demo mode", () => {
    gatewayState.isMockMode = true
    gatewayState.isAspNetMode = false

    render(<ReportsPage />)

    expect(screen.getByText("No saved reports")).toBeInTheDocument()
  })

  it("clears the saved report preview when the review modal closes", async () => {
    const report = {
      id: "28a7a4d1-b7c3-4a89-af8e-b7da9ff760a6",
      title: "Executive Summary - 2026-04-24 08:32 UTC",
      reportType: "ExecutiveSummary",
      summaryJson: JSON.stringify({
        scope: "Global scope",
        filters: {},
        sections: [
          {
            title: "Executive Assessment",
            summary: "Decision-ready summary.",
            metrics: [],
            highlights: ["Critical posture."],
            narrative: null,
            tables: [],
          },
        ],
      }),
      generatedAtUtc: "2026-04-24T08:32:07Z",
      createdAtUtc: "2026-04-24T08:32:07Z",
      updatedAtUtc: "2026-04-24T08:32:07Z",
      alertIds: [],
    }

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
          items: [report],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      }
    })

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: /^Open$/ }))

    expect(await screen.findByRole("dialog", { name: "Report review" })).toBeInTheDocument()
    expect(screen.getAllByText("Executive Assessment").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Close report review" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Report review" })).not.toBeInTheDocument()
    })
    expect(screen.getByText("No preview yet")).toBeInTheDocument()
    expect(screen.queryByText("Critical posture.")).not.toBeInTheDocument()
  })
})
